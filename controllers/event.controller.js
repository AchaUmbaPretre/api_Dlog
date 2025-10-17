const util = require('util');
const moment = require('moment');
const http = require('http');
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);

const FETCH_INTERVAL_MINUTES = 1;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
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

// Fonction pour récupérer les données depuis Falcon
const fetchFalconDevices = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "31.207.34.171",
      port: 80,
      path: "/api/get_devices?&lang=fr&user_api_hash=$2y$10$FbpbQMzKNaJVnv0H2RbAfel1NMjXRUoCy8pZUogiA/bvNNj1kdcY.",
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
const recordLogSnapshot = async () => {
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
};

// 🔹 2. Calcule les durées et états (toutes les 6h)
/* const generateDailySnapshot = async () => {
  try {
    const now = moment();
    const sixHoursAgo = now.clone().subtract(6, "hours");

    const devices = await query(`SELECT DISTINCT device_id, device_name FROM tracker_connectivity_log`);

    await Promise.all(devices.map(async (device) => {
      const logs = await query(
        `SELECT status, recorded_at, last_connection
         FROM tracker_connectivity_log
         WHERE device_id = ?
           AND recorded_at BETWEEN ? AND ?
         ORDER BY recorded_at ASC`,
        [device.device_id, sixHoursAgo.format("YYYY-MM-DD HH:mm:ss"), now.format("YYYY-MM-DD HH:mm:ss")]
      );

      if (logs.length === 0) return;

      const connectedLogs = logs.filter(l => l.status === "connected");
      const disconnectedLogs = logs.filter(l => l.status === "disconnected");

      const status = connectedLogs.length > 0 ? "connected" : "disconnected";
      const lastConnection = connectedLogs.length > 0
        ? connectedLogs[connectedLogs.length - 1].last_connection
        : logs[0].last_connection; // première connexion ou début logs

      const lastDisconnection = disconnectedLogs.length > 0
        ? disconnectedLogs[disconnectedLogs.length - 1].last_connection
        : logs[0].last_connection; // première déconnexion ou début logs

      // 🔸 Calculer le downtime total
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

      // 🔸 Vérifier doublons pour check_time arrondi toutes les 6h
      const roundedHour = Math.floor(now.hour() / 6) * 6;
      const checkTime = now.clone().hour(roundedHour).minute(0).second(0).format("YYYY-MM-DD HH:mm:ss");

      const existing = await query(
        `SELECT id FROM tracker_connectivity WHERE device_id = ? AND check_time = ? LIMIT 1`,
        [device.device_id, checkTime]
      );
      if (existing.length > 0) return;

      // 🔹 Insertion snapshot consolidé
      await query(
        `INSERT INTO tracker_connectivity
          (device_id, device_name, status, last_connection, last_disconnection, downtime_minutes, check_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [device.device_id, device.device_name, status, lastConnection, lastDisconnection, downtimeMinutes, checkTime]
      );
    }));

    console.log(`[${now.format("YYYY-MM-DD HH:mm:ss")}] ✅ Snapshot généré pour tous les devices (${devices.length})`);
  } catch (err) {
    console.error("❌ Erreur génération snapshot:", err.message);
  }
}; */

// 🔹 2. Calcule les durées et états (toutes les 6h) et enregistre le score
const generateDailySnapshot = async () => {
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
        : sixHoursAgo.format("YYYY-MM-DD HH:mm:ss");

      const lastDisconnection = disconnectedLogs.length > 0
        ? disconnectedLogs[disconnectedLogs.length - 1].last_connection
        : sixHoursAgo.format("YYYY-MM-DD HH:mm:ss");

      // 🔸 Calculer la durée totale de déconnexion
      let downtimeMinutes = 0;
      let lastStatus = null;
      let lastTime = moment(sixHoursAgo);

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

      // 🔸 Empêcher doublons pour tracker_connectivity
      const existing = await query(`
        SELECT id FROM tracker_connectivity
        WHERE device_id = ? AND check_time = ?
        LIMIT 1
      `, [device.device_id, now.format("YYYY-MM-DD HH:mm:ss")]);

      if (existing.length === 0) {
        // 🔹 Insertion snapshot consolidé
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
          now.format("YYYY-MM-DD HH:mm:ss"),
        ]);
      }

      // 🔹 Calculer le score pour ce device (taux de connectivité en %)
      const scorePercent = (connectedLogs.length / 4) * 100;

      // 🔹 Empêcher doublons pour score (unique par device et date_jour)
      const existingScore = await query(`
        SELECT id_score FROM score
        WHERE device_id = ? AND DATE(date_jour) = DATE(?)
        LIMIT 1
      `, [device.device_id, now.format("YYYY-MM-DD HH:mm:ss")]);

      if (existingScore.length > 0) {
        // 🔹 Mise à jour du score existant
        await query(`
          UPDATE score 
          SET score_percent = ?, date_jour = ?
          WHERE id_score = ?
        `, [scorePercent, now.format("YYYY-MM-DD HH:mm:ss"), existingScore[0].id_score]);
      } else {
        // 🔹 Insertion nouveau score
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

// 🔹 3. Lancer en continu
setInterval(recordLogSnapshot, INTERVAL_MS);
setInterval(generateDailySnapshot, SIX_HOURS_MS);

recordLogSnapshot();
generateDailySnapshot();

// 🔹 4. Backfill downtime_minutes pour snapshots existants
const backfillDowntime = async () => {
  try {
    // 1️⃣ Récupérer tous les snapshots existants
    const snapshots = await query(`
      SELECT id, device_id, check_time
      FROM tracker_connectivity
      WHERE downtime_minutes IS NULL OR downtime_minutes = 0
    `);

    for (const s of snapshots) {
      const checkTime = moment(s.check_time);
      const sixHoursAgo = checkTime.clone().subtract(6, "hours");

      // 2️⃣ Récupérer les logs du device dans les 6h avant le snapshot
      const logs = await query(`
        SELECT status, last_connection, recorded_at
        FROM tracker_connectivity_log
        WHERE device_id = ?
          AND recorded_at BETWEEN ? AND ?
        ORDER BY recorded_at ASC
      `, [
        s.device_id,
        sixHoursAgo.format("YYYY-MM-DD HH:mm:ss"),
        checkTime.format("YYYY-MM-DD HH:mm:ss"),
      ]);

      if (!logs || logs.length === 0) continue;

      // 3️⃣ Calculer downtimeMinutes exactement comme dans generateDailySnapshot
      let downtimeMinutes = 0;
      let lastStatus = null;
      let lastTime = sixHoursAgo;

      logs.forEach((log) => {
        const logTime = moment(log.last_connection || log.recorded_at);
        if (lastStatus === "connected" && log.status === "disconnected") {
          lastTime = logTime;
        } else if ((lastStatus === "disconnected" || lastStatus === null) && log.status === "connected") {
          downtimeMinutes += logTime.diff(lastTime, "minutes");
        }
        lastStatus = log.status;
      });

      if (lastStatus === "disconnected") {
        const lastDisconnection = [...logs].reverse().find(l => l.status === 'disconnected');
        const lastDisTime = lastDisconnection ? moment(lastDisconnection.last_connection) : sixHoursAgo;
        downtimeMinutes += checkTime.diff(lastDisTime, "minutes");
      }

      // 4️⃣ Mettre à jour la snapshot existante
      await query(`
        UPDATE tracker_connectivity
        SET downtime_minutes = ?
        WHERE id = ?
      `, [downtimeMinutes, s.id]);
    }

    console.log("✅ Backfill downtime terminé pour tous les snapshots existants");
  } catch (err) {
    console.error("❌ Erreur backfill downtime:", err);
  }
};

// 🔹 Exécuter le backfill une seule fois si nécessaire
backfillDowntime();


const cleanOldLogs = async () => {
  try {
    const yesterday = moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss");
    const result = await query(`
      DELETE FROM tracker_connectivity_log 
      WHERE recorded_at < ?
    `, [yesterday]);

    console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] 🧹 ${result.affectedRows} anciens logs supprimés.`);
  } catch (err) {
    console.error("❌ Erreur lors du nettoyage des logs:", err.message);
  }
};

setInterval(cleanOldLogs, ONE_DAY_MS);

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
/*             console.log(`Événement déjà présent pour device ${device_id} à ${formattedEventTime}, insertion ignorée.`);
 */            return res ? res.status(200).json({ message: 'Événement déjà existant, ignoré.' }) : null;
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
/*         console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${events.length} événements reçus.`);
 */
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

/*         console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Tous les événements ont été traités.`);
 */    } catch (err) {
        console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Erreur fetchAndStoreEvents:`, err.message);
    }
};

// Lancer la récupération automatique toutes les 5 minutes
setInterval(fetchAndStoreEvents, FETCH_INTERVAL_MINUTES * 60 * 1000);

// Lancer immédiatement au démarrage
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

/* exports.getConnectivity = (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? `'${startDate} 00:00:00'` : 'CURDATE()';
    const end = endDate ? `'${endDate} 23:59:59'` : `CONCAT(CURDATE(), ' 23:59:59')`;

    const q = `
        SELECT 
            d.device_id,
            d.device_name,
            DATE(${start}) AS jour,
            COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0) AS snapshots_connected,
            ROUND((COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0)/4)*100,2) AS taux_connectivite_pourcent,
            COALESCE(
                TIMESTAMPDIFF(
                    MINUTE,
                    (
                        SELECT MAX(log.last_connection)
                        FROM tracker_connectivity_log log
                        WHERE log.device_id = d.device_id
                          AND log.status = 'disconnected'
                          AND log.recorded_at BETWEEN ${start} AND ${end}
                    ),
                    NOW()
                ),
                0
            ) AS duree_derniere_deconnexion_minutes,
            (
                SELECT log2.status
                FROM tracker_connectivity_log log2
                WHERE log2.device_id = d.device_id
                ORDER BY log2.id DESC
                LIMIT 1
            ) AS statut_actuel
        FROM (
            SELECT DISTINCT device_id, device_name
            FROM tracker_connectivity
        ) d
        LEFT JOIN tracker_connectivity t
          ON t.device_id = d.device_id
          AND t.check_time BETWEEN ${start} AND ${end}
        GROUP BY d.device_id, d.device_name
        ORDER BY taux_connectivite_pourcent DESC;
    `;

    db.query(q, (err, data) => {
        if (err) {
            console.error("Erreur:", err);
            return res.status(500).json({ error: "Erreur interne du serveur" });
        }
        return res.status(200).json(data);
    });
}; */
exports.getConnectivity = (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? `'${startDate} 00:00:00'` : 'CURDATE()';
  const end = endDate ? `'${endDate} 23:59:59'` : `CONCAT(CURDATE(), ' 23:59:59')`;

  const q = `
    SELECT 
        d.device_id,
        d.device_name,
        DATE(${start}) AS jour,

        -- 🔹 Nombre de snapshots connectés
        COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0) AS snapshots_connected,

        -- 🔹 Taux de connectivité sur 4 snapshots
        ROUND((COALESCE(SUM(CASE WHEN t.status = 'connected' THEN 1 ELSE 0 END), 0)/4)*100,2) AS taux_connectivite_pourcent,

        -- 🔹 Durée réelle depuis la dernière déconnexion (en minutes)
        COALESCE(
            TIMESTAMPDIFF(
                MINUTE,
                COALESCE(
                    -- dernier moment où il était connecté
                    (SELECT MAX(log.last_connection)
                     FROM tracker_connectivity_log log
                     WHERE log.device_id = d.device_id
                       AND log.status = 'connected'),
                    -- si jamais connecté, prendre le premier moment où il a été disconnected
                    (SELECT MIN(log2.last_connection)
                     FROM tracker_connectivity_log log2
                     WHERE log2.device_id = d.device_id
                       AND log2.status = 'disconnected')
                ),
                NOW()
            ),
            0
        ) AS duree_derniere_deconnexion_minutes,

        -- 🔹 Downtime total sur la période (en minutes)
        COALESCE((
            SELECT SUM(TIMESTAMPDIFF(MINUTE,
                    log_dis.last_connection,
                    IFNULL(
                      (SELECT MIN(log_con.last_connection)
                       FROM tracker_connectivity_log log_con
                       WHERE log_con.device_id = log_dis.device_id
                         AND log_con.status = 'connected'
                         AND log_con.last_connection > log_dis.last_connection),
                      NOW()
                    )
                  ))
            FROM tracker_connectivity_log log_dis
            WHERE log_dis.device_id = d.device_id
              AND log_dis.status = 'disconnected'
              AND log_dis.last_connection BETWEEN ${start} AND ${end}
        ),0) AS downtime_minutes,

        -- 🔹 Statut actuel du traceur
        (
            SELECT log2.status
            FROM tracker_connectivity_log log2
            WHERE log2.device_id = d.device_id
            ORDER BY log2.id DESC
            LIMIT 1
        ) AS statut_actuel

    FROM (
        SELECT DISTINCT device_id, device_name
        FROM tracker_connectivity
    ) d
    LEFT JOIN tracker_connectivity t
      ON t.device_id = d.device_id
      AND t.check_time BETWEEN ${start} AND ${end}
    GROUP BY d.device_id, d.device_name
    ORDER BY taux_connectivite_pourcent DESC;
  `;

  db.query(q, (err, data) => {
    if (err) {
      console.error("Erreur:", err);
      return res.status(500).json({ error: "Erreur interne du serveur" });
    }
    return res.status(200).json(data);
  });
};







