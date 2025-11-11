const util = require('util');
const moment = require('moment');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);
const dotenv = require('dotenv');
dotenv.config();

const FETCH_INTERVAL_MINUTES = 10;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const INTERVAL_MS = 5 * 60 * 1000; // toutes les 5 minutes
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // Exécution chaque jour à minuit (24h)

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

// Fonction pour récupérer les données depuis Falcon
const fetchFalconDevices = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "31.207.34.171",
      port: 80,
      path: `/api/get_devices?lang=fr&user_api_hash=${process.env.api_hash}`,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json[0].items);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.end();
  });
};

// Enregistrer l’historique toutes les 5 minutes
/* const recordLogSnapshot = async () => {
  try {
    const now = moment().format("YYYY-MM-DD HH:mm:ss");
    const devices = await fetchFalconDevices();

    for (const d of devices) {
      const status = d.online === "online" ? "connected" : "disconnected";
      const lastSeen = moment.unix(d.timestamp).format("YYYY-MM-DD HH:mm:ss");

      // 1️⃣ Insertion du statut toutes les 5 min
      await query(
        `INSERT INTO tracker_connectivity_log (device_id, device_name, status, last_connection, recorded_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d.id, d.name, status, lastSeen, now]
      );

      // 2️⃣ Vérification des changements de statut pour calculer la durée de déconnexion
      const lastTwo = await query(
        `SELECT id, status, recorded_at FROM tracker_connectivity_log
         WHERE device_id = ? ORDER BY id DESC LIMIT 2`,
        [d.id]
      );

      if (lastTwo.length === 2) {
        const [last, prev] = lastTwo;

        // Si le traceur vient de se reconnecter après une déconnexion
        if (prev.status === "disconnected" && last.status === "connected") {
          const startTime = moment(prev.recorded_at);
          const endTime = moment(last.recorded_at);
          const downtime = endTime.diff(startTime, "minutes");

          await query(
            `INSERT INTO tracker_disconnect_stats (device_id, device_name, start_time, end_time, downtime_minutes)
             VALUES (?, ?, ?, ?, ?)`,
            [d.id, d.name, startTime.format("YYYY-MM-DD HH:mm:ss"), endTime.format("YYYY-MM-DD HH:mm:ss"), downtime]
          );
        }
      }
    }

    console.log(`[${now}] ✅ ${devices.length} statuts enregistrés.`);
  } catch (err) {
    console.error("❌ Erreur snapshot Falcon:", err);
  }
}; */

// Générer snapshot 4x/jour à partir du log
/* const generateDailySnapshot = async () => {
  try {
    const now = moment();
    const sixHoursAgo = moment().subtract(6, 'hours');

    // Récupérer le dernier log de chaque device dans les 6h
    const logs = await query(`
      SELECT t1.device_id, t1.device_name, t1.last_connection, t1.status
      FROM tracker_connectivity_log t1
      INNER JOIN (
        SELECT device_id, MAX(recorded_at) AS max_time
        FROM tracker_connectivity_log
        WHERE recorded_at BETWEEN ? AND ?
        GROUP BY device_id
      ) t2 ON t1.device_id = t2.device_id AND t1.recorded_at = t2.max_time
    `, [sixHoursAgo.format('YYYY-MM-DD HH:mm:ss'), now.format('YYYY-MM-DD HH:mm:ss')]);

    for (const log of logs) {
      // Vérifier doublon
      const existing = await query(`
        SELECT id FROM tracker_connectivity
        WHERE device_id = ? AND check_time = ?
        LIMIT 1
      `, [log.device_id, now.format('YYYY-MM-DD HH:mm:ss')]);

      if (existing.length > 0) continue;

      await query(`
        INSERT INTO tracker_connectivity (device_id, device_name, last_connection, status, check_time)
        VALUES (?, ?, ?, ?, ?)
      `, [log.device_id, log.device_name, log.last_connection, log.status, now.format('YYYY-MM-DD HH:mm:ss')]);
    }

    console.log(`[${now.format('YYYY-MM-DD HH:mm:ss')}] ✅ Snapshot 4x/jour généré (${logs.length} devices)`);
  } catch (err) {
    console.error("❌ Erreur génération snapshot:", err.message);
  }
}; */

// Lancer le log toutes les 5 minutes
/* setInterval(recordLogSnapshot, INTERVAL_MS);
setInterval(generateDailySnapshot, SIX_HOURS_MS); */

// 🔹 1. Enregistre l’état de tous les devices (toutes les 5 min)
/* const recordLogSnapshot = async () => {
  try {
    const now = moment();

    // Arrondir à l’intervalle de 5 min
    const roundedMinutes = Math.floor(now.minute() / 5) * 5;
    const recordedAt = now.clone().minute(roundedMinutes).second(0).format("YYYY-MM-DD HH:mm:ss");

    const devices = await fetchFalconDevices();

    await Promise.all(devices.map(async (d) => {
      const status = d.online === "online" ? "connected" : "disconnected";
      const eventTime = moment.unix(d.timestamp).format("YYYY-MM-DD HH:mm:ss");

      await query(
        `INSERT INTO tracker_connectivity_log
          (device_id, device_name, status, last_connection, recorded_at)
        VALUES (?, ?, ?, ?, ?)`,
        [d.id, d.name, status, eventTime, recordedAt]
      );
    }));

    console.log(`[${recordedAt}] ✅ Statuts enregistrés (${devices.length} devices)`);
  } catch (err) {
    console.error("❌ Erreur snapshot Falcon:", err);
  }
}; */


// 🔹 2. Calcule les durées et états (toutes les 6h) et enregistre le score
/* const generateDailySnapshot = async () => {
  try {
    const now = moment();
    const sixHoursAgo = now.clone().subtract(6, "hours");

    const devices = await query(`
      SELECT DISTINCT device_id, device_name
      FROM tracker_connectivity_log
    `);

    await Promise.all(devices.map(async (device) => {
      const logs = await query(`
        SELECT status, recorded_at, last_connection
        FROM tracker_connectivity_log
        WHERE device_id = ?
          AND recorded_at BETWEEN ? AND ?
        ORDER BY recorded_at ASC
      `, [
        device.device_id,
        sixHoursAgo.format("YYYY-MM-DD HH:mm:ss"),
        now.format("YYYY-MM-DD HH:mm:ss"),
      ]);

      if (logs.length === 0) return;

      const connectedLogs = logs.filter(l => l.status === "connected");
      const disconnectedLogs = logs.filter(l => l.status === "disconnected");

      const status = connectedLogs.length > 0 ? "connected" : "disconnected";
      const lastConnection = connectedLogs.length > 0
        ? connectedLogs[connectedLogs.length - 1].last_connection
        : logs[0].last_connection;

      const lastDisconnection = disconnectedLogs.length > 0
        ? disconnectedLogs[disconnectedLogs.length - 1].last_connection
        : logs[0].last_connection;

      // 🔸 Calculer la durée totale de déconnexion
      let downtimeMinutes = 0;
      let lastStatus = null;
      let lastTime = moment(logs[0].last_connection);

      logs.forEach((log) => {
        if (lastStatus === "connected" && log.status === "disconnected") {
          lastTime = moment(log.last_connection);
        } else if ((lastStatus === "disconnected" || lastStatus === null) && log.status === "connected") {
          downtimeMinutes += moment(log.last_connection).diff(lastTime, "minutes");
        }
        lastStatus = log.status;
      });

      if (lastStatus === "disconnected") {
        downtimeMinutes += now.diff(moment(lastDisconnection), "minutes");
      }

      // 🔸 Arrondir check_time toutes les 6h
      const roundedHour = Math.floor(now.hour() / 6) * 6;
      const checkTime = now.clone().hour(roundedHour).minute(0).second(0).format("YYYY-MM-DD HH:mm:ss");

      // 🔸 Vérifier doublons tracker_connectivity
      const existing = await query(`
        SELECT id FROM tracker_connectivity WHERE device_id = ? AND check_time = ? LIMIT 1
      `, [device.device_id, checkTime]);

      if (existing.length === 0) {
        await query(`
          INSERT INTO tracker_connectivity
            (device_id, device_name, status, last_connection, last_disconnection, downtime_minutes, check_time)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          device.device_id,
          device.device_name,
          status,
          lastConnection,
          lastDisconnection,
          downtimeMinutes,
          checkTime
        ]);
      }

      // 🔹 Calculer le score (max 100%)
      const scorePercent = Math.min((connectedLogs.length / 4) * 100, 100);

      // 🔸 Vérifier doublons score
      const existingScore = await query(`
        SELECT id_score FROM score WHERE device_id = ? AND DATE(date_jour) = DATE(?) LIMIT 1
      `, [device.device_id, now.format("YYYY-MM-DD HH:mm:ss")]);

      if (existingScore.length > 0) {
        await query(`
          UPDATE score 
          SET score_percent = ?, date_jour = ?
          WHERE id_score = ?
        `, [scorePercent, now.format("YYYY-MM-DD HH:mm:ss"), existingScore[0].id_score]);
      } else {
        await query(`
          INSERT INTO score (device_id, device_name, date_jour, score_percent)
          VALUES (?, ?, ?, ?)
        `, [device.device_id, device.device_name, now.format("YYYY-MM-DD HH:mm:ss"), scorePercent]);
      }

    }));

    console.log(`[${now.format("YYYY-MM-DD HH:mm:ss")}] ✅ Snapshot généré et score mis à jour pour tous les devices (${devices.length})`);
  } catch (err) {
    console.error("❌ Erreur génération snapshot:", err.message);
  }
};
 */

/* const generateDailySnapshot = async () => {
  try {
    const now = moment();
    const twoHoursAgo = now.clone().subtract(2, "hours");
    const today = now.format("YYYY-MM-DD");

    // Récupérer les devices depuis Falcon
    const devices = await fetchFalconDevices();

    for (const d of devices) {
      const lastConnection = moment.unix(d.timestamp);
      const wasConnected = lastConnection.isAfter(twoHoursAgo);

      // 🔹 Arrondir check_time toutes les 6h
      const roundedHour = Math.floor(now.hour() / 6) * 6;
      const checkTime = now.clone().hour(roundedHour).minute(0).second(0).format("YYYY-MM-DD HH:mm:ss");

      // 🔹 Vérifier si ce créneau a déjà été traité
      const existingSnapshot = await query(
        `SELECT id FROM tracker_connectivity WHERE device_id = ? AND check_time = ? LIMIT 1`,
        [d.id, checkTime]
      );

      if (existingSnapshot.length > 0) {
        console.log(`⏩ ${d.name}: snapshot déjà enregistré pour ${checkTime}`);
        continue; // ne rien recalculer pour le même créneau
      }

      // 🔹 Enregistrer snapshot (historique)
      await query(
        `INSERT INTO tracker_connectivity (device_id, device_name, status, latitude, longitude,	alert_type, last_connection, check_time, downtime_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.name, wasConnected ? 'connected' : 'disconnected', lastConnection.format("YYYY-MM-DD HH:mm:ss"), checkTime, 0]
      );

      // 🔹 Vérifier si un score existe pour aujourd’hui
      const [existingScore] = await query(
        `SELECT id_score, score_percent FROM score WHERE device_id = ? AND DATE(date_jour) = ? LIMIT 1`,
        [d.id, today]
      );

      let newScore = 0;
      if (existingScore) {
        newScore = wasConnected
          ? Math.min(existingScore.score_percent + 25, 100)
          : existingScore.score_percent;

        await query(
          `UPDATE score SET score_percent = ?, date_jour = ? WHERE id_score = ?`,
          [newScore, today, existingScore.id_score]
        );
      } else {
        newScore = wasConnected ? 25 : 0;
        await query(
          `INSERT INTO score (device_id, device_name, date_jour, score_percent)
           VALUES (?, ?, ?, ?)`,
          [d.id, d.name, today, newScore]
        );
      }

      console.log(`✅ ${d.name}: connecté=${wasConnected} → score du jour = ${newScore}%`);
    }

    console.log(`[${now.format("YYYY-MM-DD HH:mm:ss")}] ✅ Snapshot généré avec succès (${devices.length} traceurs)`);
  } catch (err) {
    console.error("❌ Erreur génération snapshot:", err.message);
  }
}; */

const generateDailySnapshot = async () => {
  try {
    const now = moment();
    const sixHoursAgo = now.clone().subtract(6, "hours");
    const today = now.format("YYYY-MM-DD");

    const devices = await fetchFalconDevices();

    for (const d of devices) {
      const lastConnection = moment.unix(d.timestamp);
      const wasConnected = lastConnection.isAfter(sixHoursAgo);
      const status = wasConnected ? "connected" : "disconnected";

      // Détection du type d'alerte
      let alertType = "OK";
      const alertSensor = d.sensors.find(s => s.type === "textual" && s.val);

      // Heure arrondie à 6 h
      const roundedHour = Math.floor(now.hour() / 6) * 6;
      const checkTime = now.clone().hour(roundedHour).minute(0).second(0).format("YYYY-MM-DD HH:mm:ss");

      // Vérifie si le snapshot existe déjà
      const existingSnapshot = await query(
        `SELECT id FROM tracker_connectivity WHERE device_id = ? AND check_time = ? LIMIT 1`,
        [d.id, checkTime]
      );

      if (existingSnapshot.length > 0) {
/*         console.log(`⏩ ${d.name}: snapshot déjà enregistré pour ${checkTime}`);
 */        continue;
      }

      // Insertion de la ligne historique
      await query(
        `INSERT INTO tracker_connectivity 
        (device_id, device_name, status, latitude, longitude, alert_type, last_connection, check_time, downtime_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.name,
          wasConnected ? 'connected' : 'disconnected',
          d.lat,
          d.lng,
          d.sensors?.find(s => s.type === 'textual' && s.name === '#MSG')?.val || 'OK', // 🔹 alert_type
          lastConnection.format("YYYY-MM-DD HH:mm:ss"),
          checkTime,
          0
        ]
      );

      // Gestion du score journalier
      const [existingScore] = await query(
        `SELECT id_score, score_percent FROM score WHERE device_id = ? AND DATE(date_jour) = ? LIMIT 1`,
        [d.id, today]
      );

      let newScore = 0;
      if (existingScore) {
        newScore = wasConnected
          ? Math.min(existingScore.score_percent + 25, 100)
          : existingScore.score_percent;
        await query(
          `UPDATE score SET score_percent = ?, date_jour = ? WHERE id_score = ?`,
          [newScore, today, existingScore.id_score]
        );
      } else {
        newScore = wasConnected ? 25 : 0;
        await query(
          `INSERT INTO score (device_id, device_name, date_jour, score_percent)
           VALUES (?, ?, ?, ?)`,
          [d.id, d.name, today, newScore]
        );
      }

 /*      console.log(
        `✅ ${d.name}: ${status} (${alertType}) → score du jour = ${newScore}%`
      ); */
    }

/*     console.log(
      `[${now.format("YYYY-MM-DD HH:mm:ss")}] ✅ Snapshot généré avec succès (${devices.length} traceurs)`
    ); */
  } catch (err) {
    console.error("❌ Erreur génération snapshot:", err.message);
  }
};

// 🔹 3. Lancer en continu
/* setInterval(recordLogSnapshot, INTERVAL_MS); */
setInterval(generateDailySnapshot, SIX_HOURS_MS);

/* recordLogSnapshot();
 */
generateDailySnapshot();

// postEvent avec bande_sortie et alertes
/* exports.postEvents = async (req, res) => {
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

        // Dépassement vitesse && // Véhicule en mouvement sans mission assignée
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
        if ((type === 'ignition_on' || speed > 7) && (!message || message?.toLowerCase().includes('Moteur en marche'))) {
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

        // Durée hors ligne plus longue que (360 Minutes)
        if (type === 'offline_duration') {
          alerts.push({
          event_id,
          device_id,
          device_name,
          alert_type: 'offline_duration',
          alert_level: 'HIGH',
          alert_message: 'Durée hors ligne plus longue que (360 Minutes)',
          alert_time: formattedEventTime
          });
        }

        // Moteur allumé hors horaire entre 22h et 05h
        if (type === 'ignition_on' || message?.toLowerCase().includes('Moteur en marche')) {
          const eventTimeUTC = new Date(req.body.event_time + " UTC"); // corrige le fuseau
          const eventHour = eventTimeUTC.getHours();  

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
        if (type === 'ignition_on' || message?.toLowerCase().includes('Moteur en marche')) {
            const eventHour = moment(formattedEventTime).hour();
            const isNight = eventHour >= 22 || eventHour < 5;

            if (isNight) {
                const noBS = await checkUnauthorizedMovementByDeviceName(device_name);

                const alertType = noBS ? 'night_exit_unauthorized' : 'night_exit_with_bs';
                const level = noBS ? 'CRITICAL' : 'MEDIUM';
                const messageAlert = noBS
                    ? `ℹ️Sortie nocturne non autorisée (${eventHour}h) – ${device_name}`
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
}; */

exports.postEvent = async (req, res) => {
  let {
    external_id,
    device_id,
    device_name,
    type,
    message,
    speed = 0,
    latitude,
    longitude,
    event_time,
  } = req.body;

  if (!external_id || !device_id || !type || !event_time) {
    if (res)
      return res
        .status(400)
        .json({ error: "external_id, device_id, type et event_time sont obligatoires." });
    return;
  }

  try {
    // 🔄 Correction fuseau horaire (Kinshasa = UTC+1)
    const eventMoment = moment(event_time, "DD-MM-YYYY HH:mm:ss").utcOffset(+60);
    const formattedEventTime = eventMoment.format("YYYY-MM-DD HH:mm:ss");
    const eventHour = eventMoment.hour();
    const isNight = eventHour >= 22 || eventHour < 5;

    // 🔍 Vérifier si l'événement existe déjà
    const existsEvent = await query(
      `SELECT 1 FROM vehicle_events WHERE external_id = ? AND device_id = ? AND event_time = ?`,
      [external_id, device_id, formattedEventTime]
    );
    if (existsEvent.length) {
/*       console.log(`⏩ Événement déjà présent pour ${device_id} à ${formattedEventTime}, ignoré.`);
 */      return res ? res.status(200).json({ message: "Événement déjà existant, ignoré." }) : null;
    }

    // 💾 Insertion dans vehicle_events
    const result = await query(
      `INSERT INTO vehicle_events (external_id, device_id, device_name, type, message, speed, latitude, longitude, event_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [external_id, device_id, device_name, type, message, speed, latitude, longitude, formattedEventTime]
    );

    const event_id = result.insertId;
    const alerts = [];

    // === 1️⃣ Alerte de dépassement de vitesse ===
    if (type === "overspeed" || speed > 80) {
      const recent = await query(
        `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = 'overspeed' 
         AND alert_time >= (NOW() - INTERVAL 5 MINUTE)`,
        [device_id]
      );
      if (!recent.length) {
        alerts.push({
          event_id,
          device_id,
          device_name,
          alert_type: "overspeed",
          alert_level: "HIGH",
          alert_message: `Excès de vitesse : ${speed} km/h`,
          alert_time: formattedEventTime,
        });
      }
    }

    // === 2️⃣ Mouvement sans mission (non autorisé) ===
    if ((["ignition_on", "movement", "zone_out"].includes(type) || speed > 7) && (!message || message?.toLowerCase().includes('moteur en marche'))) {
      const unauthorized = await checkUnauthorizedMovementByDeviceName(device_name);
      if (unauthorized) {
        const recent = await query(
          `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = 'not_in_course' 
           AND alert_time >= (NOW() - INTERVAL 15 MINUTE)`,
          [device_id]
        );
        if (!recent.length) {
          alerts.push({
            event_id,
            device_id,
            device_name,
            alert_type: "not_in_course",
            alert_level: "HIGH",
            alert_message: "Mouvement sans mission assignée",
            alert_time: formattedEventTime,
          });
        }
      }
    }

    // === 3️⃣ Durée hors ligne prolongée ===
    if (type === 'offline_duration') {
      alerts.push({
        event_id,
        device_id,
        device_name,
        alert_type: 'offline_duration',
        alert_level: 'HIGH',
        alert_message: 'Durée hors ligne plus longue que (360 Minutes)',
        alert_time: formattedEventTime,
      });
    }

    // === 4️⃣ Moteur allumé hors horaire (22h–05h) ===
    if (type === 'ignition_on' || message?.toLowerCase().includes('Moteur en marche')) {
      const eventTimeUTC = new Date(event_time + " UTC");
      const eventHourReal = eventTimeUTC.getUTCHours() + 1; // UTC+1 pour Kinshasa
      const isNightHour = eventHourReal >= 22 || eventHourReal < 5;
      const isStationary = speed === 0;

      if (isNightHour && isStationary) {
        // Vérifier zone COBRA
        let inCobra = false;
        try {
          const url = `http://falconeyesolutions.com/api/point_in_geofences?lat=${latitude}&lng=${longitude}&lang=fr&user_api_hash=$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY.`;
          const resGeo = await fetch(url);
          const geo = await resGeo.json();
          const zones = geo?.zones || [];
          inCobra = zones.some(z => z.toLowerCase().includes('cobra'));
        } catch (e) {
          console.error('Erreur API geofence COBRA:', e.message);
        }

        const hasBS = !(await checkUnauthorizedMovementByDeviceName(device_name));
        if (!hasBS) {
          const recentAlert = await query(
            `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = 'engine_out_of_hours' 
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
              alert_message: `Moteur allumé hors horaire (${eventHourReal}h) pour ${device_name}${inCobra ? ' (zone COBRA)' : ''}`,
              alert_time: formattedEventTime,
            });
          }
        }
      }
    }

    // === 5️⃣ Sortie nocturne (avec ou sans BS) ===
    if ((type === 'ignition_on' || type === 'movement' || type === 'zone_out') && isNight) {
      const noBS = await checkUnauthorizedMovementByDeviceName(device_name);
      const alertType = noBS ? 'night_exit_unauthorized' : 'night_exit_with_bs';
      const level = noBS ? 'CRITICAL' : 'MEDIUM';
      const messageAlert = noBS
        ? `Sortie nocturne non autorisée (${eventHour}h) – ${device_name}`
        : `ℹ️ Sortie nocturne autorisée (${eventHour}h) – ${device_name}`;

      const recentAlert = await query(
        `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? 
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
          alert_time: formattedEventTime,
        });
      }
    }

    // === 6️⃣ Entrée / sortie de zone ===
    if (type === "zone_in" || type === "zone_out") {
      const alertType = type === "zone_out" ? "zone_exit" : "zone_entry";
      const level = type === "zone_out" ? "MEDIUM" : "LOW";
      const msg = type === "zone_out"
        ? `${device_name} est sorti de la zone ${message || ""}`
        : `${device_name} est entré dans la zone ${message || ""}`;

      const recent = await query(
        `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? 
         AND alert_time >= (NOW() - INTERVAL 10 MINUTE)`,
        [device_id, alertType]
      );
      if (!recent.length) {
        alerts.push({
          event_id,
          device_id,
          device_name,
          alert_type: alertType,
          alert_level: level,
          alert_message: msg,
          alert_time: formattedEventTime,
        });
      }
    }

    // === 7️⃣ Enregistrement final des alertes (sans doublons exacts) ===
    for (const alert of alerts) {
      const existsAlert = await query(
        `SELECT 1 FROM vehicle_alerts WHERE device_id = ? AND alert_type = ? AND alert_time = ?`,
        [alert.device_id, alert.alert_type, alert.alert_time]
      );
      if (!existsAlert.length) {
        await createAlert(alert);
        console.log(`✅ Nouvelle alerte : ${alert.alert_type} → ${alert.alert_message}`);
      } else {
        console.log(`⚠️ Alerte déjà existante (${alert.alert_type}) ignorée.`);
      }
    }

    if (res) return res.status(201).json({ message: "Événement ajouté et alertes générées." });
  } catch (error) {
    console.error("❌ Erreur ajout événement :", error.message);
    if (res)
      return res.status(500).json({ error: "Erreur lors de l'ajout de l'événement." });
  }
};

/* exports.postEvent = async (req, res) => {
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

        // Dépassement vitesse && Véhicule en mouvement sans mission assignée
        if (speed > 7) {
          const unauthorized = await checkUnauthorizedMovementByDeviceName(device_name);
          if (unauthorized) {
            const alertMsg = speed > 80
              ? `ℹ️ Dépassement vitesse (${speed} km/h) sans BS valide`
              : `ℹ️ Véhicule en mouvement sans BS valide`;
              
            alerts.push({
              event_id,
              device_id,
              device_name,
              alert_type: 'not_in_course',
              alert_level: 'CRITICAL',
              alert_message: alertMsg,
              alert_time: formattedEventTime
            });
          }
        }

        // Moteur allumé hors horaire entre 22h et 05h
        if (type === 'ignition_on' || message?.toLowerCase().includes('Moteur en marche')) {
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
        if (type === 'ignition_on' || message?.toLowerCase().includes('Moteur en marche')) {
            const eventHour = moment(formattedEventTime).hour();
            const isNight = eventHour >= 22 || eventHour < 5;

            if (isNight) {
                const noBS = await checkUnauthorizedMovementByDeviceName(device_name);

                const alertType = noBS ? 'night_exit_unauthorized' : 'night_exit_with_bs';
                const level = noBS ? 'CRITICAL' : 'MEDIUM';
                const messageAlert = noBS
                    ? `ℹ️ Sortie nocturne non autorisée (${eventHour}h) – ${device_name}`
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
}; */


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

//Fonction pour vérifier si un véhicule est autorisé ou non via device_name
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

//Récupération automatique depuis l’API Falcon
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
/* const fetchAndStoreEvents = async () => {
    try {
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
  } catch (err) {
        console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Erreur fetchAndStoreEvents:`, err.message);
    }
}; */

let isFetching = false;

const fetchAndStoreEvents = async () => {
  if (isFetching) {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ⚠️ fetchAndStoreEvents déjà en cours, ignoré.`);
    return;
  }

  isFetching = true;
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🔄 Début de fetchAndStoreEvents`);

  try {
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

    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ✅ Tous les événements ont été traités.`);
  } catch (err) {
    console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ❌ Erreur fetchAndStoreEvents:`, err.message);
  } finally {
    isFetching = false;
  }
};

// 🔁 Lancer la récupération automatique toutes les 10 minutes
setInterval(fetchAndStoreEvents, FETCH_INTERVAL_MINUTES * 60 * 1000);

// 🚀 Exécuter une fois au démarrage
fetchAndStoreEvents();

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

exports.getConnectivity = (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? `'${startDate} 00:00:00'` : 'CURDATE()';
  const end = endDate ? `'${endDate} 23:59:59'` : `CONCAT(CURDATE(), ' 23:59:59')`;

  const q = `
    SELECT 
      d.device_id,
      d.device_name,
      DATE(t.check_time) AS jour,

      -- 🔹 Nombre de snapshots "connected" sur la période
      COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0) AS snapshots_connected,

      -- 🔹 Nombre total de snapshots (devrait être 4/jour en théorie)
      COALESCE(COUNT(t.id), 0) AS total_snapshots,

      -- 🔹 Taux de connectivité (%) basé sur les snapshots
      ROUND(
        (COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0) / 
         NULLIF(COUNT(t.id), 0)) * 100,
        2
      ) AS taux_connectivite_pourcent,

      -- 🔹 Score journalier (issu de la table score)
      COALESCE(
        (
          SELECT s.score_percent
          FROM score s
          WHERE s.device_id = d.device_id
            AND DATE(s.date_jour) = DATE(t.check_time)
          LIMIT 1
        ), 0
      ) AS score_journalier,

      -- 🔹 Dernier statut connu du traceur
      (
        SELECT t2.status
        FROM tracker_connectivity t2
        WHERE t2.device_id = d.device_id
        ORDER BY t2.check_time DESC
        LIMIT 1
      ) AS statut_actuel,

      -- 🔹 Dernière heure de connexion connue
      (
        SELECT t3.last_connection
        FROM tracker_connectivity t3
        WHERE t3.device_id = d.device_id
        ORDER BY t3.check_time DESC
        LIMIT 1
      ) AS derniere_connexion

    FROM (
      SELECT DISTINCT device_id, device_name
      FROM tracker_connectivity
    ) d
    LEFT JOIN tracker_connectivity t
      ON t.device_id = d.device_id
      AND t.check_time BETWEEN ${start} AND ${end}

    GROUP BY d.device_id, d.device_name, DATE(t.check_time)
    ORDER BY jour DESC, taux_connectivite_pourcent DESC;
  `;

  db.query(q, (err, data) => {
    if (err) {
      console.error("❌ Erreur SQL:", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }
    res.status(200).json(data);
  });
};

// Récupérer le détail d'un device
exports.getDeviceDetails = (req, res) => {
  const { deviceId, startDate, endDate } = req.query;
  if (!deviceId) return res.status(400).json({ error: "deviceId requis" });

  const start = startDate ? `'${startDate} 00:00:00'` : `'1970-01-01 00:00:00'`;
  const end = endDate ? `'${endDate} 23:59:59'` : `'${new Date().toISOString().slice(0, 19).replace("T", " ")}'`;

  const q = `
    SELECT 
      device_id,
      device_name,
      status,
      last_connection,
      downtime_minutes,
      CONVERT_TZ(check_time, '+00:00', '+02:00') AS check_time,
      CONVERT_TZ(created_at, '+00:00', '+02:00') AS created_at
    FROM tracker_connectivity
    WHERE device_id = ?
      AND check_time BETWEEN ${start} AND ${end}
    ORDER BY check_time ASC
  `;

  db.query(q, [deviceId], (err, data) => {
    if (err) {
      console.error("❌ Erreur SQL:", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }

    if (!data.length) return res.status(200).json([]);

    // Calcul des snapshots connectés
    const totalSnapshots = data.length;
    const connectedSnapshots = data.filter(d => d.status === "connected").length;
    const taux_connectivite_pourcent = ((connectedSnapshots / totalSnapshots) * 100).toFixed(2);

    // Score journalier (par palier de 25%)
    let score_percent = 0;
    if (taux_connectivite_pourcent >= 100) score_percent = 100;
    else if (taux_connectivite_pourcent >= 75) score_percent = 75;
    else if (taux_connectivite_pourcent >= 50) score_percent = 50;
    else if (taux_connectivite_pourcent >= 25) score_percent = 25;
    else score_percent = 0;

    const result = {
      device_id: data[0].device_id,
      device_name: data[0].device_name,
      taux_connectivite_pourcent,
      score_percent,
      total_snapshots: totalSnapshots,
      connected_snapshots: connectedSnapshots,
      details: data
    };

    res.status(200).json(result);
  });
};

// controllers/connectivityController.js
exports.getConnectivityMonth = (req, res) => {
  const { month } = req.query; // ex: "2025-10"

  if (!month) {
    return res.status(400).json({
      message: "Le paramètre 'month' est requis au format YYYY-MM"
    });
  }

  const q = `
    SELECT 
      s.device_id,
      s.device_name,
      DATE_FORMAT(s.date_jour, '%d') AS jour,
      s.score_percent
    FROM score s
    WHERE DATE_FORMAT(s.date_jour, '%Y-%m') = ?
    ORDER BY s.device_name, jour
  `;

  db.query(q, [month], (error, data) => {
    if (error) {
      console.error("Erreur SQL (getConnectivityMonth):", error.sqlMessage);
      return res.status(500).json({
        message: "Erreur lors de la récupération des scores de connectivité",
        error: error.sqlMessage
      });
    }

    // Si aucune donnée trouvée
    if (!data.length) {
      return res.status(404).json({
        message: `Aucune donnée trouvée pour le mois ${month}`
      });
    }

    return res.status(200).json(data);
  });
};

exports.getDetailAlerteType = (req, res) => {
  const { idVehicule } = req.query;

  const q = `
    SELECT 
      tc.device_id,
      tc.device_name,
      DATE_FORMAT(tc.last_connection, '%Y-%m-%d %H:%i:%s') AS last_connection,
      tc.status,
      tc.latitude,
      tc.longitude,
      tc.alert_type
    FROM tracker_connectivity tc
    LEFT JOIN vehicules v ON tc.device_id = v.id_capteur
    WHERE v.id_vehicule = ?
    ORDER BY last_connection DESC
    LIMIT 4
  `;

  db.query(q, [idVehicule], (err, data) => {
    if (err) {
      console.error("❌ Erreur SQL:", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: "Aucune donnée trouvée pour ce véhicule." });
    }

    // ✅ Optionnel : formater proprement la réponse
    const result = data.map((row) => ({
      device_id: row.device_id,
      device_name: row.device_name,
      date_heure: row.last_connection,
      statut: row.status === "connected" ? "Connecté" : "Déconnecté",
      position: row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : "N/A",
      alerte: row.alert_type || "OK",
    }));

    res.status(200).json(result);
  });
};