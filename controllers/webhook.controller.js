const util = require('util');
const moment = require('moment');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

exports.postWebhook = async (req, res) => {
    let { external_id, device_id, device_name, type, message, speed = 0, latitude, longitude, event_time } = req.body;

    const token = req.query.token;
    if(token !== 'SECRETFALCON2025') {
        return res.status(403).send("Accés refusé")
    }
    
    if (!external_id || !device_id || !type || !event_time) {
        if (res) return res.status(400).json({ error: 'external_id, device_id, type et event_time sont obligatoires.' });
        return;
    }

    try {
        const formattedEventTime = moment(event_time, "DD-MM-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss");

        // Vérifier si l'événement existe déjà
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
        if ((type === 'ignition_on' || speed > 7) && (!message || message?.toLowerCase().includes('moteur en marche'))) {
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

        // Moteur allumé hors horaire entre 22h et 05h
        if (type === 'ignition_on' || message?.toLowerCase().includes('moteur en marche')) {
            const eventHour = moment(formattedEventTime).hour();

            // Moteur allumé entre 22h et 05h
            const isNight = eventHour >= 22 || eventHour < 5;
            const isStationary = speed === 0;

            if (isNight && isStationary) {
                // Vérifier zone COBRA
                let inCobra = false;
                try {
                    const url = `http://falconeyesolutions.com/api/point_in_geofences?lat=${latitude}&lng=${longitude}&lang=fr&user_api_hash=$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY`;
                    const res = await fetch(url);
                    const geo = await res.json();
                    const zones = geo?.zones || [];
                    inCobra = zones.some(z => z.toLowerCase().includes('cobra'));
                } catch (e) {
                    console.error('Erreur API geofence COBRA:', e.message);
                }

                // Vérifier si le véhicule a un BS actif
                const hasBS = !(await checkUnauthorizedMovementByDeviceName(device_name)); // true si BS actif

                if (!hasBS) { // Déclenche l’alerte seulement si pas de BS
                    // Anti-spam : ne pas répéter une alerte identique dans les 15 dernières minutes
                    const recentAlert = await query(
                        `SELECT 1 FROM vehicle_alerts 
                        WHERE device_id = ? AND alert_type = 'engine_out_of_hours' 
                        AND alert_time >= (NOW() - INTERVAL 15 MINUTE)`,
                        [device_id]
                    );

                    if (!recentAlert.length) {
                        alerts.push({
                            event_id,
                            device_id,
                            device_name,
                            alert_type: 'engine_out_of_hours',
                            alert_level: 'MEDIUM',
                            alert_message: `🚨 Moteur allumé hors horaire (${eventHour}h) pour ${device_name}${inCobra ? ' (zone COBRA)' : ''}`,
                            alert_time: formattedEventTime
                        });
                    }
                }
            }
        }

        //Sortie nocturne non autorisée entre 22h et 05h
        if (type === 'ignition_on' || message?.toLowerCase().includes('moteur en marche')) {
            const eventHour = moment(formattedEventTime).hour();
            const isNight = eventHour >= 22 || eventHour < 5;

            if (isNight) {
                const noBS = await checkUnauthorizedMovementByDeviceName(device_name);

                const alertType = noBS ? 'night_exit_unauthorized' : 'night_exit_with_bs';
                const level = noBS ? 'CRITICAL' : 'MEDIUM';
                const messageAlert = noBS
                    ? `🚨 Sortie nocturne non autorisée (${eventHour}h) – ${device_name}`
                    : `ℹ️ Sortie nocturne avec BS pour ${device_name}`;

                const recentAlert = await query(
                    `SELECT 1 FROM vehicle_alerts 
                    WHERE device_id = ? AND alert_type = ? 
                    AND alert_time >= (NOW() - INTERVAL 15 MINUTE)`,
                    [device_id, alertType]
                );

                if (!recentAlert.length) {
                    alerts.push({
                        event_id,
                        device_id,
                        device_name,
                        alert_type: alertType,
                        alert_level: level,
                        alert_message: messageAlert,
                        alert_time: formattedEventTime
                    });
                }
            }
        }

        //Enregistrement des alertes sans doublons
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

        if (res) return res.status(201).json({ message: 'Événement ajouté et alertes générées si nécessaire.' });

    } catch (error) {
        console.error('Erreur ajout événement :', error.message);
        if (res) return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'événement.' });
    }
};