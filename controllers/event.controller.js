const util = require('util');
const moment = require('moment');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

const FETCH_INTERVAL_MINUTES = 5; // Intervalle de récupération automatique

// Récupérer tous les événements depuis MySQL
exports.getEvent = (req, res) => {
    const q = `SELECT * FROM vehicle_events`;
    db.query(q, (error, data) => {
        if(error) return res.status(500).send(error);
        return res.status(200).json(data);
    });
};

// Créer une alerte dans MySQL
const createAlert = async ({ event_id, device_id, device_name, alert_type, alert_level, alert_message, alert_time }) => {
    // Vérifier si l'alerte existe déjà
    const exists = await query(
        `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? AND alert_time = ?`,
        [device_id, alert_type, alert_time]
    );
    if (exists.length) return; // Ne rien faire si existe déjà

    const sql = `
        INSERT INTO vehicle_alerts
            (event_id, device_id, device_name, alert_type, alert_level, alert_message, alert_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [event_id, device_id, device_name, alert_type, alert_level, alert_message, alert_time]);
};


// Vérifier si un device est déconnecté (>6h sans événement)
const checkDisconnectedDevices = async () => {
    try {
        const devices = await query(`
            SELECT device_id, MAX(event_time) AS last_event
            FROM vehicle_events
            GROUP BY device_id
        `);

        const now = moment();

        for (const device of devices) {
            const lastEventTime = moment(device.last_event);
            const diffHours = now.diff(lastEventTime, 'hours');
            const status = diffHours > 6 ? 'disconnected' : 'connected';

            // ✅ Vérifier si le dernier état est identique pour éviter doublons
            const lastRecord = await query(
                `SELECT status, last_connection 
                 FROM tracker_connectivity 
                 WHERE device_id = ? 
                 ORDER BY check_time DESC 
                 LIMIT 1`,
                [device.device_id]
            );

            if (!lastRecord.length || lastRecord[0].status !== status || lastRecord[0].last_connection !== lastEventTime.format('YYYY-MM-DD HH:mm:ss')) {
                // Stocker dans tracker_connectivity uniquement si l'état a changé
                await query(`
                    INSERT INTO tracker_connectivity (device_id, last_connection, status, check_time)
                    VALUES (?, ?, ?, ?)
                `, [device.device_id, lastEventTime.format('YYYY-MM-DD HH:mm:ss'), status, now.format('YYYY-MM-DD HH:mm:ss')]);
            }

            // Générer alerte si disconnected
            if (status === 'disconnected') {
                const lastEvent = await query(
                    "SELECT device_name FROM vehicle_events WHERE device_id = ? ORDER BY event_time DESC LIMIT 1",
                    [device.device_id]
                );
                const deviceNameSafe = lastEvent[0]?.device_name || `Device ${device.device_id}`;

                // ✅ Vérifier si l'alerte existe déjà pour éviter doublons
                const existingAlert = await query(
                    `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? AND alert_time = ?`,
                    [device.device_id, 'disconnected', now.format('YYYY-MM-DD HH:mm:ss')]
                );

                if (!existingAlert.length) {
                    await createAlert({
                        event_id: null,
                        device_id: device.device_id,
                        device_name: deviceNameSafe,
                        alert_type: 'disconnected',
                        alert_level: 'CRITICAL',
                        alert_message: 'Traceur déconnecté depuis plus de 6 heures',
                        alert_time: now.format('YYYY-MM-DD HH:mm:ss')
                    });
                }
            }
        }

        console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] Vérification connectivité terminée.`);
    } catch (err) {
        console.error('Erreur vérification connectivité:', err.message);
    }
};

//postEvent amélioré avec bande_sortie et alertes
exports.postEvent = async (req, res) => {
    let { external_id, device_id, device_name, type, message, speed = 0, latitude, longitude, event_time } = req.body;

    if (!external_id || !device_id || !type || !event_time) {
        if (res) return res.status(400).json({ error: 'external_id, device_id, type et event_time sont obligatoires.' });
        return;
    }

    try {
        const formattedEventTime = moment(event_time, "DD-MM-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss");

        // ✅ Vérifier si l'événement existe déjà
        const existsEvent = await query(
            `SELECT 1 FROM vehicle_events WHERE external_id = ? AND device_id = ? AND event_time = ?`,
            [external_id, device_id, formattedEventTime]
        );

        if (existsEvent.length) {
            console.log(`Événement déjà présent pour device ${device_id} à ${formattedEventTime}, insertion ignorée.`);
            return res ? res.status(200).json({ message: 'Événement déjà existant, ignoré.' }) : null;
        }

        // Insertion dans vehicle_events
        const sqlInsertEvent = `
            INSERT INTO vehicle_events
                (external_id, device_id, device_name, type, message, speed, latitude, longitude, event_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await query(sqlInsertEvent, [
            external_id, device_id, device_name, type, message, speed, latitude, longitude, formattedEventTime
        ]);

        const event_id = result.insertId;

        const alerts = [];

        // Dépassement vitesse
        if (type === 'overspeed' || speed > 80) {
            alerts.push({
                event_id,
                device_id,
                device_name,
                alert_type: 'overspeed',
                alert_level: 'HIGH',
                alert_message: `Dépassement vitesse : ${speed} km/h`,
                alert_time: formattedEventTime
            });
        }

        // Véhicule en mouvement sans mission assignée
        if ((type === 'ignition_on' || speed > 0) && (!message || !message.includes('course_active'))) {
            const unauthorized = await checkUnauthorizedMovementByDeviceName(device_name);
            if (unauthorized) {
                alerts.push({
                    event_id,
                    device_id,
                    device_name,
                    alert_type: 'not_in_course',
                    alert_level: 'HIGH',
                    alert_message: 'Véhicule en mouvement sans mission assignée',
                    alert_time: formattedEventTime
                });
            }
        }

        // ✅ Enregistrement des alertes sans doublons
        for (const alert of alerts) {
            const existsAlert = await query(
                `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? AND alert_time = ?`,
                [alert.device_id, alert.alert_type, alert.alert_time]
            );
            if (!existsAlert.length) {
                await createAlert(alert);
            } else {
                console.log(`Alerte déjà existante pour device ${alert.device_id} à ${alert.alert_time}, ignorée.`);
            }
        }

        // Vérification connectivité des devices
        await checkDisconnectedDevices();

        if (res) return res.status(201).json({ message: 'Événement ajouté et alertes générées si nécessaire.' });

    } catch (error) {
        console.error('Erreur ajout événement :', error.message);
        if (res) return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'événement.' });
    }
};

//Fonction pour vérifier si un véhicule est autorisé ou non via device_name
const checkUnauthorizedMovementByDeviceName = async (device_name) => {
    try {
        const result = await query(
            `SELECT v.name_capteur AS device_name, bs.statut 
             FROM bande_sortie bs
             LEFT JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
             WHERE v.name_capteur = ? 
               AND bs.est_supprime = 0
               AND NOW() BETWEEN bs.sortie_time AND COALESCE(bs.retour_time, NOW())
             ORDER BY bs.sortie_time DESC
             LIMIT 1`,
            [device_name]
        );

        if (!result.length || result[0].statut !== 4) return true; // non autorisé
        return false; // autorisé
    } catch (err) {
        console.error('Erreur vérification bande sortie par device_name:', err.message);
        return false;
    }
};


// Générer rapport raw
exports.getRawReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const start = moment(startDate);
        const end = moment(endDate);

        if (!start.isValid() || !end.isValid()) {
            return res.status(400).json({ error: 'Dates invalides fournies pour le rapport' });
        }

        const startSQL = start.format('YYYY-MM-DD HH:mm:ss');
        const endSQL = end.format('YYYY-MM-DD HH:mm:ss');

        const sql = `
            SELECT device_name AS vehicle, type, event_time, latitude, longitude
            FROM vehicle_events
            WHERE event_time BETWEEN ? AND ?
            ORDER BY device_name, event_time
        `;
        const events = await query(sql, [startSQL, endSQL]);

        const validEvents = events.filter(e =>
            e.latitude !== null && e.longitude !== null &&
            !isNaN(e.latitude) && !isNaN(e.longitude)
        );

        const vehicles = {};
        validEvents.forEach(e => {
            if (!vehicles[e.vehicle]) vehicles[e.vehicle] = { ignition:0, overspeed:0, disconnectPeriods:[], lastEventTime:null, seenTimes:new Set(), details:[] };
            const v = vehicles[e.vehicle];
            if (v.seenTimes.has(e.event_time)) return;
            v.seenTimes.add(e.event_time);
            if (e.type === 'ignition_on') v.ignition += 1;
            if (e.type === 'overspeed') v.overspeed += 1;
            if (v.lastEventTime) {
                const diffMinutes = moment(e.event_time).diff(moment(v.lastEventTime), 'minutes', true);
                if (diffMinutes > 360) v.disconnectPeriods.push(diffMinutes);
            }
            v.lastEventTime = e.event_time;
            v.details.push({ time: e.event_time, type: e.type, latitude: e.latitude, longitude: e.longitude });
        });

        const report = Object.keys(vehicles).map(vehicleName => {
            const v = vehicles[vehicleName];
            const totalDisconnectMinutes = Math.round(v.disconnectPeriods.reduce((sum,m)=>sum+m,0));
            return {
                vehicle: vehicleName,
                ignitionCount: v.ignition,
                overspeedCount: v.overspeed,
                disconnects: v.disconnectPeriods.map(min=>({ durationMinutes: Math.round(min) })),
                details: v.details,
                summary: `Véhicule ${vehicleName} → ${v.ignition} événements d’allumage, ${v.overspeed} dépassements vitesse, ${v.disconnectPeriods.length} déconnexions (${totalDisconnectMinutes} min)`
            };
        });

        res.json(report);

    } catch(err) {
        console.error('Erreur génération rapport:', err.message);
        res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
    }
};

//Récupération automatique depuis l’API Falcon
const fetchAndStoreEvents = async () => {
    try {
        const [lastEventRow] = await query(`SELECT MAX(event_time) AS last_time FROM vehicle_events`);
        const fromTime = lastEventRow?.last_time 
            ? moment(lastEventRow.last_time) 
            : moment().subtract(FETCH_INTERVAL_MINUTES, 'minutes');
        const toTime = moment();

        const queryStr = new URLSearchParams({
            date_from: fromTime.format('YYYY-MM-DD HH:mm:ss'),
            date_to: toTime.format('YYYY-MM-DD HH:mm:ss'),
            user_api_hash : '$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY.',
            limit : 10
        }).toString();

        const options = {
            hostname: "falconeyesolutions.com",
            port: 80,
            path: `/api/get_events?${queryStr}`,
            method: "GET",
        };

        const proxyReq = http.request(options, (proxyRes) => {
            let data = "";
            proxyRes.on("data", chunk => data += chunk);

            proxyRes.on("end", async () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status !== 1 || !response.items?.data) return;

                    const events = response.items.data;
                    for (const e of events) {
                        await exports.postEvent({
                            body: {
                                external_id: e.id,
                                device_id: e.device_id,
                                device_name: e.device_name,
                                type: e.type,
                                message: e.message || e.name,
                                speed: e.speed || 0,
                                latitude: e.latitude,
                                longitude: e.longitude,
                                event_time: e.time
                            }
                        }, null);
                    }

                    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${events.length} événements stockés.`);
                } catch (err) {
                    console.error("Erreur parsing API ou insertion :", err.message);
                }
            });
        });

        proxyReq.on("error", (err) => console.error("Erreur proxy falcon:", err.message));
        proxyReq.end();

    } catch (err) {
        console.error("Erreur récupération dernier event_time :", err.message);
    }
};

//Lancer la récupération automatique toutes les 5 minutes
setInterval(fetchAndStoreEvents, FETCH_INTERVAL_MINUTES * 60 * 1000);

// Optionnel : lancer immédiatement au démarrage
fetchAndStoreEvents();
