const util = require('util');
const moment = require('moment');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

const FETCH_INTERVAL_MINUTES = 3;

//Récupérer toutes les alertes
exports.getAlertVehicule = (req, res) => {
    const q = `SELECT va.* FROM vehicle_alerts va WHERE va.resolved = 0 ORDER BY created_at DESC`;
    db.query(q, (error, data) => {
        if (error) {
            console.error("Erreur getAlertVehicule:", error);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }
        return res.status(200).json(data);
    });
};

//Marquer une alerte comme lue
exports.markAlertAsRead = (req, res) => {
    const { id } = req.query;

    if (!id || isNaN(id)) {
        return res.status(400).json({ error: "ID d'alerte non valide" });
    }

    const q = `UPDATE vehicle_alerts SET resolved = 1 WHERE id = ?`;
    db.query(q, [id], (error, data) => {
        if (error) {
            console.error("Erreur markAlertAsRead:", error);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }

        if (data.affectedRows === 0) {
            return res.status(404).json({ error: "Alerte non trouvée" });
        }

        return res.status(200).json({ message: "Alerte marquée comme lue ✅", id });
    });
};

// Récupérer tous les événements
exports.getEvent = (req, res) => {
    const q = `SELECT * FROM vehicle_events`;
    db.query(q, (error, data) => {
        if(error) return res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getRapportDay = (req, res) => {
    const q = `
        SELECT device_name, device_id, last_connection, status
            FROM tracker_connectivity
            WHERE DATE(check_time) = CURDATE()
            GROUP BY device_name
            ORDER BY status DESC, last_connection DESC
        `;
    db.query(q, (error, data) => {
        if(error) return res.status(500).send(error);
        return res.status(200).json(data);
    });
}
// Créer une alerte dans MySQL
const createAlert = async ({
  event_id,
  device_id,
  device_name,
  alert_type,
  alert_level,
  alert_message,
  alert_time
}) => {
  // Vérifier si une alerte similaire non résolue existe déjà
  const existing = await query(
    `SELECT id FROM vehicle_alerts 
     WHERE device_id = ? AND alert_type = ? AND resolved = 0 
     ORDER BY created_at DESC LIMIT 1`,
    [device_id, alert_type]
  );

  if (existing.length > 0) {
    // ⚠️ Mettre à jour l’alerte existante au lieu de dupliquer
    await query(
      `UPDATE vehicle_alerts 
       SET alert_time = ?, alert_message = ?, alert_level = ? 
       WHERE id = ?`,
      [alert_time, alert_message, alert_level, existing[0].id]
    );
    console.log(`⚠️ Alerte mise à jour pour ${device_name} (${alert_type})`);
    return { updated: true, alertId: existing[0].id };
  }

  // 🚨 Sinon insérer une nouvelle alerte
  const sql = `
    INSERT INTO vehicle_alerts
      (event_id, device_id, device_name, alert_type, alert_level, alert_message, alert_time, resolved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
  `;
  const result = await query(sql, [
    event_id,
    device_id,
    device_name,
    alert_type,
    alert_level,
    alert_message,
    alert_time
  ]);

  console.log(`🚨 Nouvelle alerte créée pour ${device_name} (${alert_type})`);
  return { created: true, alertId: result.insertId };
};

// Vérifier si un device est déconnecté (>6h sans événement)
const checkDisconnectedDevices = async () => {
    try {
        // Récupérer tous les devices et leur dernier événement
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

            // Vérifier si une ligne existe déjà pour le device aujourd'hui
            const existing = await query(`
                SELECT id, status, last_connection 
                FROM tracker_connectivity
                WHERE device_id = ? AND DATE(check_time) = CURDATE()
                LIMIT 1
            `, [device.device_id]);

            // Récupérer le device_name depuis vehicle_events
            const lastEvent = await query(
                "SELECT device_name FROM vehicle_events WHERE device_id = ? ORDER BY event_time DESC LIMIT 1",
                [device.device_id]
            );
            const deviceNameSafe = lastEvent[0]?.device_name || `Device ${device.device_id}`;

            if (existing.length) {
                // Mise à jour si l'état ou la dernière connexion a changé
                if (existing[0].status !== status || existing[0].last_connection !== lastEventTime.format('YYYY-MM-DD HH:mm:ss')) {
                    await query(`
                        UPDATE tracker_connectivity
                        SET device_name = ?, last_connection = ?, status = ?, check_time = ?
                        WHERE id = ?
                    `, [
                        deviceNameSafe,
                        lastEventTime.format('YYYY-MM-DD HH:mm:ss'),
                        status,
                        now.format('YYYY-MM-DD HH:mm:ss'),
                        existing[0].id
                    ]);
                }
            } else {
                // Sinon insertion
                await query(`
                    INSERT INTO tracker_connectivity (device_id, device_name, last_connection, status, check_time)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    device.device_id,
                    deviceNameSafe,
                    lastEventTime.format('YYYY-MM-DD HH:mm:ss'),
                    status,
                    now.format('YYYY-MM-DD HH:mm:ss')
                ]);
            }

            // Générer alerte si disconnected
            if (status === 'disconnected') {
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

// postEvent amélioré avec bande_sortie et alertes
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

        // Récupérer tous les événements pour la période
        const sql = `
            SELECT device_name AS vehicle, type, event_time, latitude, longitude
            FROM vehicle_events
            WHERE event_time BETWEEN ? AND ?
            ORDER BY device_name, event_time
        `;
        const events = await query(sql, [startSQL, endSQL]);

        // Filtrer les événements avec coordonnées valides
        const validEvents = events.filter(e =>
            e.latitude !== null && e.longitude !== null &&
            !isNaN(e.latitude) && !isNaN(e.longitude)
        );

        // Regrouper les données par véhicule
        const vehicles = {};
        validEvents.forEach(e => {
            if (!vehicles[e.vehicle]) {
                vehicles[e.vehicle] = {
                    ignitionOn: 0,
                    ignitionOff: 0,
                    overspeedCount: 0,
                    disconnectPeriods: [],
                    lastEventTime: null,
                    seenTimes: new Set(),
                    details: []
                };
            }

            const v = vehicles[e.vehicle];
            if (v.seenTimes.has(e.event_time)) return;
            v.seenTimes.add(e.event_time);

            // Comptabiliser les événements
            if (e.type === 'ignition_on') v.ignitionOn += 1;
            if (e.type === 'ignition_off') v.ignitionOff += 1;
            if (e.type === 'overspeed') v.overspeedCount += 1;

            // Calcul des périodes de déconnexion (>6h)
            if (v.lastEventTime) {
                const diffMinutes = moment(e.event_time).diff(moment(v.lastEventTime), 'minutes', true);
                if (diffMinutes > 360) v.disconnectPeriods.push(diffMinutes);
            }

            v.lastEventTime = e.event_time;
            v.details.push({
                time: e.event_time,
                type: e.type,
                latitude: e.latitude,
                longitude: e.longitude
            });
        });

        // Générer le rapport structuré
        const report = Object.keys(vehicles).map(vehicleName => {
            const v = vehicles[vehicleName];
            const totalDisconnectMinutes = Math.round(v.disconnectPeriods.reduce((sum, m) => sum + m, 0));
            const status = v.lastEventTime && (moment().diff(moment(v.lastEventTime), 'hours') > 6 ? 'disconnected' : 'connected');

            return {
                vehicle: vehicleName,
                summary: {
                    totalIgnitionsOn: v.ignitionOn,
                    totalIgnitionsOff: v.ignitionOff,
                    totalOverspeed: v.overspeedCount,
                    totalDisconnects: v.disconnectPeriods.length,
                    totalDisconnectMinutes
                },
                summaryText: `Véhicule ${vehicleName} → ${v.ignitionOn} démarrages, ${v.ignitionOff} arrêts, ${v.overspeedCount} dépassements vitesse, ${v.disconnectPeriods.length} déconnexions (${totalDisconnectMinutes} min)`,
                disconnects: v.disconnectPeriods.map((duration, idx) => ({
                    number: idx + 1,
                    durationMinutes: Math.round(duration)
                })),
                events: v.details,
                status
            };
        });

        // Réponse finale
        res.json({
            period: {
                start: startSQL,
                end: endSQL
            },
            report
        });

    } catch (err) {
        console.error('Erreur génération rapport pro:', err.message);
        res.status(500).json({ error: 'Erreur lors de la génération du rapport professionnel' });
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


//GET DEVICE
exports.getDevice = (req, res) => {
    const { startDate, endDate, status } = req.query;
    const params = [];

    let q = `
        SELECT ds.device_id, ds.name, ds.latitude, ds.longitude, ds.online_status, ds.timestamp AS last_seen
        FROM device_status ds
        INNER JOIN (
            SELECT device_id, MAX(timestamp) AS max_ts
            FROM device_status
            WHERE 1=1
            ${startDate ? "AND timestamp >= ?" : ""}
            ${endDate ? "AND timestamp <= ?" : ""}
            GROUP BY device_id
        ) last_ds ON ds.device_id = last_ds.device_id AND ds.timestamp = last_ds.max_ts
        WHERE 1=1
    `;

    if (startDate) params.push(startDate + " 00:00:00");
    if (endDate) params.push(endDate + " 23:59:59");
    if (status && (status === "connected" || status === "disconnected")) {
        q += " AND ds.online_status = ?";
        params.push(status);
    }

    q += " ORDER BY ds.timestamp DESC";

    db.query(q, params, (err, data) => {
        if (err) {
            console.error("Erreur:", err);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }
        return res.status(200).json(data);
    });
};

// Stocke le statut du device uniquement si le statut a changé
const storeDeviceStatus = async (device) => {
    try {
        const now = moment();

        // Formater le timestamp du device
        let lastEventTime;
        if (device.time) {
            lastEventTime = moment(device.time, "DD-MM-YYYY HH:mm:ss", true);
            if (!lastEventTime.isValid()) {
                console.warn(`Timestamp invalide pour ${device.name}, utilisation de maintenant`);
                lastEventTime = now;
            }
        } else {
            lastEventTime = now;
        }

        const status = (
            device.online === 'ack' ||
            device.online === 'online' ||
            device.online === 'ENGINE'
            )
            ? 'connected'
            : 'disconnected';


        // Récupérer le dernier status enregistré pour ce device
        const [lastRecord] = await query(`
            SELECT online_status 
            FROM device_status
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        `, [device.id]);

        // N’insérer que si le statut a changé
        if (!lastRecord || lastRecord.online_status !== status) {
            await query(`
                INSERT INTO device_status (device_id, name, timestamp, online_status, latitude, longitude)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                device.id,
                device.name,
                lastEventTime.format('YYYY-MM-DD HH:mm:ss'),
                status,
                device.lat || null,
                device.lng || null
            ]);
            console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Statut enregistré pour ${device.name} : ${status}`);
        } else {
            console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Aucun changement pour ${device.name} (${status})`);
        }

    } catch (err) {
        console.error(`Erreur insertion device_status pour ${device.name}:`, err.message);
    }
};

// Fetch devices depuis l'API Falcon
const fetchDevices = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "31.207.34.171",
            port: 80,
            path: "/api/get_devices?&lang=fr&user_api_hash=$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY.",
            method: "GET"
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });

        req.on("error", err => reject(err));
        req.end();
    });
};

// Fonction principale pour fetch et stocker
const fetchStatusAndStore = async () => {
    try {
        const data = await fetchDevices();
        const devices = JSON.parse(data)[0]?.items || []; // sécurité si pas de [0]

        for (const device of devices) {
            await storeDeviceStatus({
                id: device.id,
                name: device.name,
                time: device.time,
                online: device.online,
                lat: device.lat,
                lng: device.lng
            });
        }

        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Statut device_status mis à jour pour ${devices.length} traceurs.`);
    } catch (err) {
        console.error("Erreur fetchStatusAndStore:", err.message);
    }
};

// Lancer toutes les 3 minutes
setInterval(fetchStatusAndStore, FETCH_INTERVAL_MINUTES * 60 * 1000);

// Lancer immédiatement au démarrage
fetchStatusAndStore();
