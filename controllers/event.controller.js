const util = require('util');
const moment = require('moment');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

const FETCH_INTERVAL_MINUTES = 1;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const MAX_OFFLINE_MINUTES = 30;


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

//À chaque exécution (toutes les 6 heures)
/* const checkDisconnectedDevices = async () => {
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
}; */

const recordDeviceSnapshots = async () => {
  try {
    const now = moment();
    const sixHoursAgo = moment().subtract(6, 'hours');
    const start = sixHoursAgo.format('YYYY-MM-DD HH:mm:ss');
    const end = now.format('YYYY-MM-DD HH:mm:ss');

    // Étape 1 : Récupérer tous les devices ayant émis des events dans les 6 dernières heures
    const devices = await query(`
      SELECT
        ve.device_id,
        ve.device_name,
        MAX(ve.event_time) AS last_event,
        MAX(CASE WHEN ve.message = 'Moteur en marche' THEN 1 ELSE 0 END) AS was_connected
      FROM vehicle_events ve
      WHERE ve.event_time BETWEEN ? AND ?
      GROUP BY ve.device_id, ve.device_name
    `, [start, end]);

    for (const device of devices) {
      const { device_id, device_name, last_event, was_connected } = device;

      // Vérifier si un snapshot a déjà été enregistré pour ce device dans la période
      const existing = await query(`
        SELECT id
        FROM tracker_connectivity
        WHERE device_id = ?
        AND check_time BETWEEN ? AND ?
        LIMIT 1
      `, [device_id, start, end]);

      if (existing.length > 0) {
        continue; // Déjà un snapshot enregistré dans cette plage
      }

      // Déterminer le statut en fonction de l'activité observée
      const status = was_connected ? 'connected' : 'disconnected';

      // Insérer le snapshot
      await query(`
        INSERT INTO tracker_connectivity (device_id, device_name, last_connection, status, check_time)
        VALUES (?, ?, ?, ?, ?)
      `, [
        device_id,
        device_name || `Device ${device_id}`,
        moment(last_event).format('YYYY-MM-DD HH:mm:ss'),
        status,
        now.format('YYYY-MM-DD HH:mm:ss')
      ]);
    }

    console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ✅ ${devices.length} snapshots enregistrés.`);
  } catch (err) {
    console.error('❌ Erreur snapshot :', err.message);
  }
};

// Lancer immédiatement
recordDeviceSnapshots();

// Puis répéter toutes les 6 heures
setInterval(recordDeviceSnapshots, SIX_HOURS_MS);

// postEvent amélioré avec bande_sortie et alertes
exports.postEvent = async (req, res) => {
    let { external_id, device_id, device_name, type, message, speed = 0, latitude, longitude, event_time } = req.body;

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

//Fonction pour vérifier si un véhicule est autorisé ou non via device_name
/* const checkUnauthorizedMovementByDeviceName = async (device_name) => {
    try {
        const result = await query(
            `SELECT 
          v.name_capteur AS device_name, 
          bs.statut,
          bs.sortie_time
      FROM bande_sortie bs
      LEFT JOIN vehicules v 
          ON bs.id_vehicule = v.id_vehicule
      WHERE v.name_capteur = ? 
        AND bs.est_supprime = 0
        AND (
              NOW() BETWEEN bs.sortie_time AND COALESCE(bs.retour_time, NOW())
              OR (bs.statut = 4 AND DATE(bs.sortie_time) = CURDATE())
            )
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
}; */

const checkUnauthorizedMovementByDeviceName = async (device_name) => {
  try {
    const result = await query(
      `
      SELECT 
        v.name_capteur AS device_name, 
        bs.statut,
        bs.sortie_time,
        bs.retour_time
      FROM bande_sortie bs
      LEFT JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE 
        v.name_capteur = ? 
        AND bs.est_supprime = 0
      ORDER BY bs.sortie_time DESC
      LIMIT 1
      `,
      [device_name]
    );

    if (!result.length) {
      // Aucun bon trouvé => mouvement non autorisé
      return true;
    }

    const bon = result[0];
    const now = new Date();

    const sortie = new Date(bon.sortie_time);
    const retour = bon.retour_time ? new Date(bon.retour_time) : null;

    // Vérifie si on est encore dans la période de validité du bon
    const isValidPeriod =
      now >= sortie && (!retour || now <= retour);

    const isValidStatus = [4, 5].includes(bon.statut);

    // Si la période et le statut sont valides => autorisé
    if (isValidPeriod && isValidStatus) {
      return false; // pas d'alerte
    }

    return true; // sinon alerte
  } catch (err) {
    console.error('Erreur checkUnauthorizedMovementByDeviceName:', err.message);
    return false;
  }
};

/* //Récupération automatique depuis l’API Falcon
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
 */

const fetchEvents = (fromTime, toTime) => {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            date_from: fromTime.format('YYYY-MM-DD HH:mm:ss'),
            date_to: toTime.format('YYYY-MM-DD HH:mm:ss'),
            user_api_hash: '$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY.',
            limit: 50
        }).toString();

        const options = {
            hostname: "falconeyesolutions.com",
            port: 80,
            path: `/api/get_events?${params}`,
            method: "GET",
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(new Error(`Erreur JSON: ${err.message} - Data reçue: ${data}`));
                }
            });
        });

        req.on("error", reject);
        req.end();
    });
};

// Fonction principale pour fetch et stocker les events
const fetchAndStoreEvents = async () => {
    try {
        // Déterminer le dernier event_time pour fetch uniquement les nouveaux
        const [lastEventRow] = await query(`SELECT MAX(event_time) AS last_time FROM vehicle_events`);
        const fromTime = lastEventRow?.last_time
            ? moment.utc(lastEventRow.last_time)
            : moment.utc().subtract(FETCH_INTERVAL_MINUTES, 'minutes');
        const toTime = moment.utc();

        const response = await fetchEvents(fromTime, toTime);

        if (!response?.items?.data?.length) {
            console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Aucun nouvel événement à stocker.`);
            return;
        }

        const events = response.items.data;
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${events.length} événements reçus.`);

        // Traiter les événements séquentiellement
        for (const e of events) {
            try {
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
            } catch (err) {
                console.error(`Erreur postEvent pour device ${e.device_id}:`, err.message);
            }
        }

        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Tous les événements ont été traités.`);
    } catch (err) {
        console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Erreur fetchAndStoreEvents:`, err.message);
    }
};

// Lancer la récupération automatique toutes les 5 minutes
setInterval(fetchAndStoreEvents, FETCH_INTERVAL_MINUTES * 60 * 1000);

// Lancer immédiatement au démarrage
fetchAndStoreEvents();

// Logs pour capturer les erreurs non catchées
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught Exception:', err));

// Générer rapport raw
/* exports.getRawReport = (req, res) => {
  const { startDate, endDate } = req.query;

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) {
    return res.status(400).json({ error: "Dates invalides fournies pour le rapport" });
  }

  const startSQL = start.format("YYYY-MM-DD HH:mm:ss");
  const endSQL = end.format("YYYY-MM-DD HH:mm:ss");

  const q = `
    WITH etats AS (
      SELECT 
        t.device_id,
        t.device_name,
        t.check_time,
        t.status,
        DATE_FORMAT(t.check_time, '%Y-%m') AS month,
        LEAD(t.check_time) OVER (PARTITION BY t.device_id ORDER BY t.check_time) AS next_check_time
      FROM tracker_connectivity t
      WHERE t.check_time BETWEEN ? AND ?
    ),

    deconnexions AS (
      SELECT
        device_id,
        device_name,
        month,
        TIMESTAMPDIFF(MINUTE, check_time, next_check_time) AS duree_minutes
      FROM etats
      WHERE status = 'disconnected' AND next_check_time IS NOT NULL
    ),

    stats_connexions AS (
      SELECT
        device_id,
        device_name,
        DATE_FORMAT(check_time, '%Y-%m') AS month,
        SUM(status = 'connected') AS fois_connecte,
        SUM(status = 'disconnected') AS fois_deconnecte
      FROM tracker_connectivity
      WHERE check_time BETWEEN ? AND ?
      GROUP BY device_id, device_name, month
    ),

    stats_depassements AS (
      SELECT
        ve.device_id,
        DATE_FORMAT(ve.event_time, '%Y-%m') AS month,
        COUNT(*) AS depassements
      FROM vehicle_events ve
      WHERE ve.event_time BETWEEN ? AND ?
        AND ve.speed > 80
      GROUP BY ve.device_id, month
    )

    SELECT
      sc.device_id,
      sc.device_name,
      sc.month,
      sc.fois_connecte,
      sc.fois_deconnecte AS nombre_deconnexions,
      COALESCE(SUM(d.duree_minutes), 0) AS total_minutes_deconnecte,
      COALESCE(MAX(d.duree_minutes), 0) AS max_duree_deconnexion,
      COALESCE(sd.depassements, 0) AS depassements
    FROM stats_connexions sc
    LEFT JOIN deconnexions d
      ON sc.device_id = d.device_id AND sc.month = d.month
    LEFT JOIN stats_depassements sd
      ON sc.device_id = sd.device_id AND sc.month = sd.month
    GROUP BY
      sc.device_id,
      sc.device_name,
      sc.month,
      sc.fois_connecte,
      sc.fois_deconnecte,
      sd.depassements
    ORDER BY sc.device_name ASC, sc.month ASC;
  `;

  db.query(q, [startSQL, endSQL, startSQL, endSQL, startSQL, endSQL], (err, rows) => {
    if (err) {
      console.error("Erreur génération rapport:", err.message);
      return res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }

    // Reformater les données pour le frontend
    const report = {};
    rows.forEach(row => {
      if (!report[row.device_id]) {
        report[row.device_id] = {
          device_id: row.device_id,
          device_name: row.device_name,
          months: {}
        };
      }

      report[row.device_id].months[row.month] = {
        connexions: row.fois_connecte,
        deconnexions: row.nombre_deconnexions,
        total_minutes_deconnecte: row.total_minutes_deconnecte,
        max_duree_deconnexion: row.max_duree_deconnexion,
        depassements: row.depassements
      };
    });

    res.status(200).json(Object.values(report));
  });
}; */

exports.getRawReport = (req, res) => {
  const { startDate, endDate } = req.query;

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) {
    return res.status(400).json({ error: "Dates invalides fournies pour le rapport" });
  }

  const startSQL = start.format("YYYY-MM-DD HH:mm:ss");
  const endSQL = end.format("YYYY-MM-DD HH:mm:ss");

  const q = `
    WITH etats AS (
      SELECT 
        t.device_id,
        t.device_name,
        DATE(t.check_time) AS jour,
        t.check_time,
        t.status,
        LEAD(t.check_time) OVER (PARTITION BY t.device_id ORDER BY t.check_time) AS next_check_time
      FROM tracker_connectivity t
      WHERE t.check_time BETWEEN ? AND ?
    ),

    deconnexions AS (
      SELECT
        device_id,
        device_name,
        jour,
        TIMESTAMPDIFF(MINUTE, check_time, next_check_time) AS duree_minutes
      FROM etats
      WHERE status = 'disconnected' AND next_check_time IS NOT NULL
    ),

    stats_connexions AS (
      SELECT
        device_id,
        device_name,
        DATE(check_time) AS jour,
        SUM(status = 'connected') AS fois_connecte,
        SUM(status = 'disconnected') AS fois_deconnecte
      FROM tracker_connectivity
      WHERE check_time BETWEEN ? AND ?
      GROUP BY device_id, device_name, jour
    ),

    stats_depassements AS (
      SELECT
        ve.device_id,
        DATE(ve.event_time) AS jour,
        COUNT(*) AS depassements
      FROM vehicle_events ve
      WHERE ve.event_time BETWEEN ? AND ?
        AND ve.speed > 80
      GROUP BY ve.device_id, jour
    )

    SELECT
      sc.device_id,
      sc.device_name,
      sc.jour,
      sc.fois_connecte,
      sc.fois_deconnecte AS nombre_deconnexions,
      COALESCE(SUM(d.duree_minutes), 0) AS total_minutes_deconnecte,
      COALESCE(MAX(d.duree_minutes), 0) AS max_duree_deconnexion,
      COALESCE(sd.depassements, 0) AS depassements
    FROM stats_connexions sc
    LEFT JOIN deconnexions d ON sc.device_id = d.device_id AND sc.jour = d.jour
    LEFT JOIN stats_depassements sd ON sc.device_id = sd.device_id AND sc.jour = sd.jour
    GROUP BY
      sc.device_id,
      sc.device_name,
      sc.jour,
      sc.fois_connecte,
      sc.fois_deconnecte
    ORDER BY sc.device_name ASC, sc.jour ASC;
  `;

  db.query(q, [startSQL, endSQL, startSQL, endSQL, startSQL, endSQL], (err, rows) => {
    if (err) {
      console.error("Erreur génération rapport:", err.message);
      return res.status(500).json({ error: "Erreur lors de la génération du rapport" });
    }

// Au lieu de renvoyer juste les phrases, renvoie aussi le device_id
    const result = rows.map((row, index) => {
    const dateFormatted = moment(row.jour).format("DD/MM/YYYY");

    const parts = [`${index + 1}. 🚗 ${row.device_name} (${dateFormatted}) →`];

    if (row.fois_connecte > 0) {
        parts.push(`${row.fois_connecte} connexion${row.fois_connecte > 1 ? 's' : ''}`);
    }

    if (row.depassements > 0) {
        parts.push(`${row.depassements} dépassement${row.depassements > 1 ? 's' : ''} de vitesse`);
    }

    if (row.nombre_deconnexions > 0) {
        parts.push(`${row.nombre_deconnexions} déconnexion${row.nombre_deconnexions > 1 ? 's' : ''} (max: ${row.max_duree_deconnexion} min)`);
    }

    return {
        device_id: row.device_id,
        device_name: row.device_name,
        phrase: parts.join(' ')
    };
    });

    res.status(200).json(result);

  });
};

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
/* const storeDeviceStatus = async (device) => {
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
}; */

// Fetch devices depuis l'API Falcon
/* const fetchDevices = () => {
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
 */
// Fonction principale pour fetch et stocker
/* const fetchStatusAndStore = async () => {
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
}; */

/* const storeDeviceStatusPeriodic = async (device) => {
  try {
    const now = moment();

    const status = (device.online === 'ack' || device.online === 'online' || device.online === 'ENGINE')
      ? 'connected'
      : 'disconnected';

    await query(`
      INSERT INTO device_status (device_id, name, timestamp, online_status, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      device.id,
      device.name,
      now.format('YYYY-MM-DD HH:mm:ss'),
      status,
      device.lat || null,
      device.lng || null
    ]);

    console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] Statut périodique enregistré pour ${device.name} : ${status}`);

  } catch (err) {
    console.error(`Erreur insertion device_status pour ${device.name}:`, err.message);
  }
}; */

// Fetch devices depuis l'API
/* const fetchDevices = () => {
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
}; */

// Fonction principale pour fetch et stocker toutes les 6h
/* const fetchAndStorePeriodic = async () => {
  try {
    const data = await fetchDevices();
    const devices = JSON.parse(data)[0]?.items || [];

    for (const device of devices) {
      await storeDeviceStatusPeriodic({
        id: device.id,
        name: device.name,
        online: device.online,
        lat: device.lat,
        lng: device.lng
      });
    }

    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Statut périodique mis à jour pour ${devices.length} véhicules.`);

  } catch (err) {
    console.error("Erreur fetchAndStorePeriodic:", err.message);
  }
}; */

// Lancer immédiatement
/* fetchAndStorePeriodic();
 */
// Puis toutes les 6 heures
/* setInterval(fetchAndStorePeriodic, SIX_HOURS_MS); */