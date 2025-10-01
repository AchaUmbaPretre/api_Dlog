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
    let { external_id, device_id, device_name, type, message, speed = 0, latitude, longitude, event_time } = req.body;

    if (!external_id || !device_id || !type || !event_time) {
        return res.status(400).json({ error: 'external_id, device_id, type et event_time sont obligatoires.' });
    }

    try {
        // ✅ Conversion de la date en format MySQL
        const formattedEventTime = moment(event_time, "DD-MM-YYYY HH:mm:ss").format("YYYY-MM-DD HH:mm:ss");

        // 1️⃣ Insérer l'événement
        const sqlInsertEvent = `
            INSERT INTO vehicle_events
                (external_id, device_id, device_name, type, message, speed, latitude, longitude, event_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await query(sqlInsertEvent, [
            external_id, device_id, device_name, type, message, speed, latitude, longitude, formattedEventTime
        ]);

        const event_id = result.insertId;

        // 2️⃣ Générer alertes basiques
        const alerts = [];

        if (type === 'overspeed' || speed > 80) {
            alerts.push({
                event_id, device_id, device_name,
                alert_type: 'overspeed',
                alert_level: 'HIGH',
                alert_message: `Dépassement vitesse : ${speed} km/h`,
                alert_time: formattedEventTime
            });
        }

        if ((type === 'ignition_on' || speed > 0) && (!message || !message.includes('course_active'))) {
            alerts.push({
                event_id, device_id, device_name,
                alert_type: 'not_in_course',
                alert_level: 'HIGH',
                alert_message: 'Véhicule en mouvement sans mission assignée',
                alert_time: formattedEventTime
            });
        }

        for (const alert of alerts) {
            await createAlert(alert);
        }

        await checkDisconnectedDevices();

        return res.status(201).json({ message: 'Événement ajouté et alertes générées si nécessaire.' });

    } catch (error) {
        console.error('Erreur ajout événement :', error.message);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout de l\'événement.' });
    }
};


/* exports.getRawReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate et endDate sont obligatoires' });
    }

    try {
        const events = await query(
            `SELECT device_name, type, time 
             FROM vehicle_events
             WHERE time BETWEEN ? AND ?
             ORDER BY device_name, time`,
            [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );

        const vehicles = {};

        // Grouper les événements par véhicule
        events.forEach(ev => {
            if (!vehicles[ev.device_name]) vehicles[ev.device_name] = [];
            vehicles[ev.device_name].push(ev);
        });

        const report = Object.entries(vehicles).map(([vehicle, evs]) => {
            let ignitionCount = 0;
            let overspeedCount = 0;
            let totalIgnitionMinutes = 0;
            let totalDisconnectedMinutes = 0;

            let lastEventTime = null;
            let ignitionOnTime = null;

            evs.forEach(e => {
                const eventTime = moment(e.time, "DD-MM-YYYY HH:mm:ss");

                // Compter overspeed
                if (e.type === 'overspeed') overspeedCount++;

                // Compter ignition
                if (e.type === 'ignition_on') {
                    ignitionCount++;
                    ignitionOnTime = eventTime;
                }

                if (e.type === 'ignition_off' && ignitionOnTime) {
                    const diffMinutes = eventTime.diff(ignitionOnTime, 'minutes');
                    totalIgnitionMinutes += diffMinutes;
                    ignitionOnTime = null;
                }

                // Calculer déconnexion (>6h)
                if (lastEventTime) {
                    const diffHours = eventTime.diff(lastEventTime, 'hours');
                    if (diffHours > 6) totalDisconnectedMinutes += diffHours * 60;
                }
                lastEventTime = eventTime;
            });

            return {
                vehicle,
                summary: `${vehicle} → ${ignitionCount} événements d’allumage, ${overspeedCount} dépassements vitesse, ${totalDisconnectedMinutes} min de déconnexion, ${totalIgnitionMinutes} min allumé`,
                first_event: evs[0].time,
                last_event: evs[evs.length - 1].time
            };
        });

        return res.status(200).json(report);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la génération du rapport brut' });
    }
}; */

/* exports.getRawReport = async (startDate, endDate) => {
  try {
    // 1️⃣ Récupérer tous les événements pour la période, par véhicule, en ignorant les doublons event_time
    const sql = `
      SELECT 
        ve.device_name AS vehicle,
        ve.type,
        ve.event_time,
        ve.latitude,
        ve.longitude
      FROM vehicle_events ve
      WHERE ve.event_time BETWEEN ? AND ?
      GROUP BY ve.device_name, ve.type, ve.event_time
      ORDER BY ve.device_name, ve.event_time
    `;

    const events = await query(sql, [startDate, endDate]);

    // 2️⃣ Regrouper par véhicule
    const vehicles = {};

    events.forEach(e => {
      if (!vehicles[e.vehicle]) vehicles[e.vehicle] = { ignition: 0, overspeed: 0, disconnectPeriods: [], lastEventTime: null, details: [] };

      const v = vehicles[e.vehicle];

      // Compter les types
      if (e.type === 'ignition_on') v.ignition += 1;
      if (e.type === 'overspeed') v.overspeed += 1;

      // Déconnexion : si écart > 6h avec le dernier événement
      if (v.lastEventTime) {
        const diffHours = moment(e.event_time).diff(moment(v.lastEventTime), 'hours', true);
        if (diffHours > 6) {
          v.disconnectPeriods.push(diffHours); // durée en heures
        }
      }
      v.lastEventTime = e.event_time;

      // Ajouter les détails pour le rapport
      v.details.push(`${e.event_time} | ${e.type} | lat:${e.latitude} lon:${e.longitude}`);
    });

    // 3️⃣ Générer le rapport
    const report = Object.keys(vehicles).map(vehicleName => {
      const v = vehicles[vehicleName];
      const totalDisconnect = v.disconnectPeriods.reduce((sum, h) => sum + h, 0); // total en heures
      const disconnectMinutes = Math.round(totalDisconnect * 60); // convertir en minutes

      return {
        vehicle: vehicleName,
        summary: `Véhicule ${vehicleName} → ${v.ignition} événements d’allumage, ${v.overspeed} dépassements vitesse, ${v.disconnectPeriods.length} déconnexions (${disconnectMinutes} min)`,
        details: v.details.join('\n')
      };
    });

    return report;

  } catch (err) {
    console.error('Erreur génération rapport:', err.message);
    throw err;
  }
}; */

exports.getRawReport = async (startDate, endDate) => {
    
  try {
    // 1️⃣ Récupérer tous les événements pour la période, par véhicule
    const sql = `
      SELECT device_name AS vehicle, type, event_time, latitude, longitude
      FROM vehicle_events
      WHERE event_time BETWEEN ? AND ?
      ORDER BY device_name, event_time
    `;
    const events = await query(sql, [startDate, endDate]);

    // 2️⃣ Regrouper par véhicule en filtrant les doublons event_time
    const vehicles = {};

    events.forEach(e => {
      if (!vehicles[e.vehicle]) vehicles[e.vehicle] = { ignition: 0, overspeed: 0, disconnectPeriods: [], lastEventTime: null, seenTimes: new Set(), details: [] };

      const v = vehicles[e.vehicle];

      // Ignorer si on a déjà vu ce event_time pour ce véhicule
      if (v.seenTimes.has(e.event_time)) return;
      v.seenTimes.add(e.event_time);

      // Compter les types
      if (e.type === 'ignition_on') v.ignition += 1;
      if (e.type === 'overspeed') v.overspeed += 1;

      // Déconnexion : si écart > 6h avec le dernier événement
      if (v.lastEventTime) {
        const diffHours = moment(e.event_time).diff(moment(v.lastEventTime), 'hours', true);
        if (diffHours > 6) {
          v.disconnectPeriods.push(diffHours); // durée en heures
        }
      }
      v.lastEventTime = e.event_time;

      // Ajouter les détails pour le rapport
      v.details.push(`${e.event_time} | ${e.type} | lat:${e.latitude} lon:${e.longitude}`);
    });

    // 3️⃣ Générer le rapport
    const report = Object.keys(vehicles).map(vehicleName => {
      const v = vehicles[vehicleName];
      const totalDisconnect = v.disconnectPeriods.reduce((sum, h) => sum + h, 0);
      const disconnectMinutes = Math.round(totalDisconnect * 60);

      return {
        vehicle: vehicleName,
        summary: `Véhicule ${vehicleName} → ${v.ignition} événements d’allumage, ${v.overspeed} dépassements vitesse, ${v.disconnectPeriods.length} déconnexions (${disconnectMinutes} min)`,
        details: v.details.join('\n')
      };
    });

    return report;

  } catch (err) {
    console.error('Erreur génération rapport:', err.message);
    throw err;
  }
};