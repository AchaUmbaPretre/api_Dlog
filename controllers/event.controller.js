const util = require('util');
const moment = require('moment');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

// Récupérer tous les événements
exports.getEvent = (req, res) => {
    const q = `SELECT * FROM vehicle_events`;
    db.query(q, (error, data) => {
        if(error) return res.status(500).send(error);
        return res.status(200).json(data);
    });
};

// Créer une alerte dans MySQL
const createAlert = async ({ event_id, device_id, device_name, alert_type, alert_level, alert_message, alert_time }) => {
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
            const lastEvent = moment(device.last_event);
            const diffHours = now.diff(lastEvent, 'hours');
            const status = diffHours > 6 ? 'disconnected' : 'connected';

            // Stocker dans tracker_connectivity
            await query(`
                INSERT INTO tracker_connectivity (device_id, last_connection, status, check_time)
                VALUES (?, ?, ?, ?)
            `, [device.device_id, lastEvent.format('YYYY-MM-DD HH:mm:ss'), status, now.format('YYYY-MM-DD HH:mm:ss')]);

            // Générer alerte si disconnected
            if (status === 'disconnected') {
                await createAlert({
                    event_id: null,
                    device_id: device.device_id,
                    device_name: null,
                    alert_type: 'disconnected',
                    alert_level: 'CRITICAL',
                    alert_message: 'Traceur déconnecté depuis plus de 6 heures',
                    alert_time: now.format('YYYY-MM-DD HH:mm:ss')
                });
            }
        }

        console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] Vérification connectivité terminée.`);
    } catch (err) {
        console.error('Erreur vérification connectivité:', err.message);
    }
};

// Ajouter un événement + vérifier alertes
exports.postEvent = async (req, res) => {
    const { external_id, device_id, device_name, type, message, speed = 0, event_time } = req.body;

    if (!external_id || !device_id || !type || !event_time) {
        return res.status(400).json({ error: 'external_id, device_id, type et event_time sont obligatoires.' });
    }

    try {
        // 1️⃣ Insérer l'événement
        const sqlInsertEvent = `
            INSERT INTO vehicle_events
                (external_id, device_id, device_name, type, message, speed, event_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const result = await query(sqlInsertEvent, [external_id, device_id, device_name, type, message, speed, event_time]);
        const event_id = result.insertId;

        // 2️⃣ Générer alertes basiques
        const alerts = [];

        // Dépassement vitesse
        if (type === 'overspeed' || speed > 80) {
            alerts.push({
                event_id, device_id, device_name,
                alert_type: 'overspeed',
                alert_level: 'HIGH',
                alert_message: `Dépassement vitesse : ${speed} km/h`,
                alert_time: event_time
            });
        }

        // Véhicule en mouvement sans mission
        if ((type === 'ignition_on' || speed > 0) && (!message || !message.includes('course_active'))) {
            alerts.push({
                event_id, device_id, device_name,
                alert_type: 'not_in_course',
                alert_level: 'HIGH',
                alert_message: 'Véhicule en mouvement sans mission assignée',
                alert_time: event_time
            });
        }

        // Ajout alertes
        for (const alert of alerts) {
            await createAlert(alert);
        }

        // 3️⃣ Vérifier si des devices sont déconnectés (>6h)
        await checkDisconnectedDevices();

        return res.status(201).json({ message: 'Événement ajouté et alertes générées si nécessaire.' });

    } catch (error) {
        console.error('Erreur ajout événement :', error.message);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'événement.' });
    }
};
