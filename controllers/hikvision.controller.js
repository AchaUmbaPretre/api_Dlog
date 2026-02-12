const http = require("http");
const https = require("https");
const util = require("util");
const { db } = require('./../config/database');
const query = util.promisify(db.query).bind(db);
const { decrypt } = require("./../utils/encrypt");
const { URL } = require("url");
const moment = require("moment");
const { getDigestHeader } = require("../utils/hikvisionUtils");

const PULL_INTERVAL_MS = 60 * 1000;

// ===================== HANDLE HIKVISION PRESENCE =====================
/* async function handleHikvisionPresence(event) {
  const { employeeNoString, time, device_sn, serialNo, cardReaderNo } = event;
  if (!employeeNoString || !time || !device_sn || !serialNo) {
    console.log("[SKIP] Données manquantes :", event);
    return;
  }

  const heurePointage = moment.parseZone(time);
  const dateISO = heurePointage.format("YYYY-MM-DD");
  console.log(`[INFO] Événement reçu : user=${employeeNoString}, time=${time}, device=${device_sn}`);

  // 1️⃣ Anti-doublon
  try {
    await query(
      `INSERT INTO presence_logs (device_sn, serial_no, employee_no, event_time, reader_no)
       VALUES (?, ?, ?, ?, ?)`,
      [device_sn, serialNo, employeeNoString, time, cardReaderNo]
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      console.log("[DUPLICATE] Log déjà existant :", serialNo);
      return;
    }
    throw e;
  }

  // 2️⃣ Récupérer l'utilisateur
  const users = await query(`SELECT id_utilisateur FROM utilisateur WHERE matricule = ?`, [employeeNoString]);
  if (!users.length) {
    console.log("[SKIP] Utilisateur introuvable :", employeeNoString);
    return;
  }
  const id_utilisateur = users[0].id_utilisateur;

  const siteUser = await query(`SELECT site_id FROM user_sites WHERE user_id = ?`, [id_utilisateur]);
  const site_id = siteUser[0]?.site_id || null;

  // 3️⃣ Terminal
  const terminals = await query(
    `SELECT id_terminal, usage_mode, is_enabled, site_id, ip_address
     FROM terminals WHERE device_sn = ?`,
    [device_sn]
  );
  const terminal_id = terminals[0]?.id_terminal || null;

  // 4️⃣ Jour autorisé
  const jourSQL = jourSemaineSQL(dateISO);
  const horaireRows = await query(
    `SELECT ht.nom AS horaire_nom, ht.${jourSQL} AS jour_autorise
     FROM horaire_user hu
     JOIN horaire_travail ht ON ht.id_horaire = hu.horaire_id
     WHERE hu.user_id = ? AND hu.actif = 1
     LIMIT 1`,
    [id_utilisateur]
  );

  if (!horaireRows.length) {
    console.log(`[SKIP] Jour non autorisé ou pas d'horaire pour ${id_utilisateur} le ${dateISO}`);
    return;
  }

  // 5️⃣ Jour férié
  const ferieRows = await query(`SELECT 1 FROM jours_feries WHERE date_ferie = ?`, [dateISO]);
  if (ferieRows.length) {
    console.log(`[SKIP] Jour férié : ${dateISO}`);
    return;
  }

  // 6️⃣ Absence validée
  const absence = await query(
    `SELECT 1 FROM absences WHERE id_utilisateur = ? AND statut = 'VALIDEE'
     AND ? BETWEEN date_debut AND date_fin`,
    [id_utilisateur, dateISO]
  );
  if (absence.length) {
    console.log(`[SKIP] Absence validée pour ${employeeNoString} le ${dateISO}`);
    return;
  }

  // 7️⃣ Présence existante
  const presenceRows = await query(
    `SELECT id_presence, heure_entree, heure_sortie, statut_jour
     FROM presences WHERE id_utilisateur = ? AND DATE(date_presence) = ? LIMIT 1`,
    [id_utilisateur, dateISO]
  );
  const presence = presenceRows[0] || null;

  const tz = heurePointage.format("Z");
  const debutTravail = moment.parseZone(`${dateISO}T08:00:00${tz}`);

  const retard_minutes = heurePointage.isAfter(debutTravail)
    ? heurePointage.diff(debutTravail, "minutes")
    : 0;


    if (presence && presence.statut_jour === "ABSENT") {
      console.log(`[UPDATE] ABSENT → PRESENT ${employeeNoString}`);

      await query(
        `UPDATE presences
        SET heure_entree = ?,
            statut_jour = 'PRESENT',
            retard_minutes = ?,
            source = 'HIKVISION',
            terminal_id = ?,
            device_sn = ?
        WHERE id_presence = ?`,
        [
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          terminal_id,
          device_sn,
          presence.id_presence
        ]
      );
      return;
    }


    if (!presence) {
      console.log(`[INSERT] Nouvelle présence PRESENT pour ${employeeNoString}`);
      await query(
        `INSERT INTO presences (
          id_utilisateur, site_id, date_presence, heure_entree,
          retard_minutes, heures_supplementaires, source,
          terminal_id, device_sn, statut_jour
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PRESENT')`,
        [id_utilisateur, site_id, dateISO, heurePointage.format("YYYY-MM-DD HH:mm:ss"),
        retard_minutes, 0, 'HIKVISION', terminal_id, device_sn]
      );
      return;
    }

    if (presence && !presence.heure_sortie) {
      const autorisationRows = await query(
        `SELECT 1 FROM attendance_adjustments
        WHERE id_presence = ?
          AND type = 'AUTORISATION_SORTIE'
          AND statut = 'VALIDE'`,
        [presence.id_presence]
      );

      const autorisation = autorisationRows.length > 0;

      const tz = heurePointage.format("Z");
      const finTravail = moment.parseZone(`${dateISO}T16:00:00${tz}`);

      const sortieAutorisee =
        heurePointage.isSameOrAfter(finTravail) || autorisation;

      if (!sortieAutorisee) {
        console.log(`[SKIP] Sortie anticipée non autorisée pour ${id_utilisateur}`);
        return;
      }

      const heures_supplementaires = heurePointage.isAfter(finTravail)
        ? Number((heurePointage.diff(finTravail, "minutes") / 60).toFixed(2))
        : 0;

      await query(
        `UPDATE presences
        SET heure_sortie = ?, heures_supplementaires = ?
        WHERE id_presence = ?`,
        [
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          heures_supplementaires,
          presence.id_presence
        ]
      );

      console.log(`[UPDATE] Sortie enregistrée pour ${id_utilisateur}`);
      return;
    }
} */

  async function handleHikvisionPresence(event) {
  const { employeeNoString, time, device_sn, serialNo, cardReaderNo } = event;

  if (!employeeNoString || !time || !device_sn || !serialNo) {
    console.log("[SKIP] Données manquantes :", event);
    return;
  }

  const heurePointage = moment.parseZone(time);
  const dateISO = heurePointage.format("YYYY-MM-DD");

  console.log(`[INFO] Événement reçu : user=${employeeNoString}, time=${time}, device=${device_sn}`);

  // Anti-doublon dans logs
  try {
    await query(
      `INSERT INTO presence_logs (device_sn, serial_no, employee_no, event_time, reader_no)
       VALUES (?, ?, ?, ?, ?)`,
      [device_sn, serialNo, employeeNoString, time, cardReaderNo]
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      console.log("[DUPLICATE] Log déjà existant :", serialNo);
      return;
    }
    throw e;
  }

  // Récupérer l'utilisateur
  const users = await query(`SELECT id_utilisateur FROM utilisateur WHERE matricule = ?`, [employeeNoString]);
  if (!users.length) {
    console.log("[SKIP] Utilisateur introuvable :", employeeNoString);
    return;
  }
  const id_utilisateur = users[0].id_utilisateur;

  //Terminal
  const terminals = await query(
    `SELECT id_terminal, usage_mode, is_enabled, site_id, ip_address
     FROM terminals WHERE device_sn = ?`,
    [device_sn]
  );
  const terminal_id = terminals[0]?.id_terminal || null;
  const site_id = terminals[0]?.site_id || null;

  // Vérifier planning actif du jour
  const jourNom = moment(dateISO).locale("fr").format("dddd").toUpperCase(); // LUNDI, MARDI...
  const planningRows = await query(
    `SELECT p.id_planning, pd.jour_semaine, pd.heure_debut, pd.heure_fin
     FROM planning_employe p
     JOIN planning_detail pd ON pd.planning_id = p.id_planning
     WHERE p.user_id = ? AND p.actif = 1 AND pd.jour_semaine = ?`,
    [id_utilisateur, jourNom]
  );

  if (!planningRows.length) {
    console.log(`[SKIP] Aucun planning actif pour ${employeeNoString} le ${dateISO}`);
    return;
  }
  const pd = planningRows[0];
  const debutTravail = moment(`${dateISO} ${pd.heure_debut}`, "YYYY-MM-DD HH:mm:ss");
  const finTravail = moment(`${dateISO} ${pd.heure_fin}`, "YYYY-MM-DD HH:mm:ss");

  const ferieRows = await query(`SELECT 1 FROM jours_feries WHERE date_ferie = ?`, [dateISO]);
  if (ferieRows.length) {
    console.log(`[SKIP] Jour férié : ${dateISO}`);
    return;
  }

  const absenceRows = await query(
    `SELECT 1 FROM absences WHERE id_utilisateur = ? AND statut = 'VALIDEE' AND ? BETWEEN date_debut AND date_fin`,
    [id_utilisateur, dateISO]
  );
  if (absenceRows.length) {
    console.log(`[SKIP] Absence validée pour ${employeeNoString} le ${dateISO}`);
    return;
  }

  const presenceRows = await query(
    `SELECT id_presence, heure_entree, heure_sortie, statut_jour
     FROM presences WHERE id_utilisateur = ? AND DATE(date_presence) = ? LIMIT 1`,
    [id_utilisateur, dateISO]
  );
  const presence = presenceRows[0] || null;

  const retard_minutes = heurePointage.isAfter(debutTravail)
    ? heurePointage.diff(debutTravail, "minutes")
    : 0;

  if (presence && presence.statut_jour === "ABSENT") {
    console.log(`[UPDATE] ABSENT → PRESENT ${employeeNoString}`);
    await query(
      `UPDATE presences
       SET site_id = ?, heure_entree = ?, statut_jour = 'PRESENT', retard_minutes = ?, source = 'HIKVISION', terminal_id = ?, device_sn = ?
       WHERE id_presence = ?`,
      [
        site_id,
        heurePointage.format("YYYY-MM-DD HH:mm:ss"),
        retard_minutes,
        terminal_id,
        device_sn,
        presence.id_presence
      ]
    );
    return;
  }

  // 10️⃣ Nouvelle entrée
  if (!presence) {
    console.log(`[INSERT] Nouvelle présence PRESENT pour ${employeeNoString}`);
    await query(
      `INSERT INTO presences (
        id_utilisateur, site_id, date_presence, heure_entree,
        retard_minutes, heures_supplementaires, source,
        terminal_id, device_sn, statut_jour
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PRESENT')`,
      [
        id_utilisateur,
        site_id,
        dateISO,
        heurePointage.format("YYYY-MM-DD HH:mm:ss"),
        retard_minutes,
        0,
        'HIKVISION',
        terminal_id,
        device_sn
      ]
    );
    return;
  }

  // 11️⃣ Gestion sortie
  if (presence && !presence.heure_sortie) {
    const autorisationRows = await query(
      `SELECT 1 FROM attendance_adjustments
       WHERE id_presence = ? AND type = 'AUTORISATION_SORTIE' AND statut = 'VALIDE'`,
      [presence.id_presence]
    );
    const autorisation = autorisationRows.length > 0;

    const sortieAutorisee = heurePointage.isSameOrAfter(finTravail) || autorisation;

    if (!sortieAutorisee) {
      console.log(`[SKIP] Sortie anticipée non autorisée pour ${employeeNoString}`);
      return;
    }

    const heures_supplementaires = heurePointage.isAfter(finTravail)
      ? Number((heurePointage.diff(finTravail, "minutes") / 60).toFixed(2))
      : 0;

    await query(
      `UPDATE presences
       SET heure_sortie = ?, heures_supplementaires = ?
       WHERE id_presence = ?`,
      [
        heurePointage.format("YYYY-MM-DD HH:mm:ss"),
        heures_supplementaires,
        presence.id_presence
      ]
    );

    console.log(`[UPDATE] Sortie enregistrée pour ${employeeNoString}`);
    return;
  }

  console.log(`[INFO] Présence déjà complète pour ${employeeNoString} le ${dateISO}`);
}


// ===================== HIKVISION REQUEST =====================
async function hikvisionRequest(terminal, credentials, payload) { 
  const protocol = terminal.port === 443 ? https : http;
  const uri = "/ISAPI/AccessControl/AcsEvent";
  const path = `${uri}?format=json`;
  const jsonBody = JSON.stringify(payload);

  const makeRequest = (auth = null) => new Promise((resolve, reject) => {
    const req = protocol.request({
      hostname: terminal.ip_address,
      port: terminal.port,
      path,
      method: "POST",
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(jsonBody),
        ...(auth && { Authorization: auth })
      }
    }, res => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.write(jsonBody);
    req.end();
  });

  let res = await makeRequest();
  if (res.status === 401) {
    const auth = getDigestHeader("POST", uri, res.headers["www-authenticate"], credentials.username, credentials.password);
    res = await makeRequest(auth);
  }

  try { return JSON.parse(res.body); } 
  catch (e) { throw new Error(`Réponse non JSON : ${res.body}`); }
}

// ===================== PULL SINGLE TERMINAL =====================
async function pullSingleTerminal(terminal) {
  try {
    const credentials = JSON.parse(decrypt(terminal.credentials_encrypted));
    let searchResultPosition = 0;
    const maxResults = 40;
    let hasMore = true;

    const startOfDay = moment().startOf("day").format("YYYY-MM-DDTHH:mm:ssZ");
    const endOfDay = moment().endOf("day").format("YYYY-MM-DDTHH:mm:ssZ");


    while (hasMore) {
      const payload = {
        AcsEventCond: {
          searchID: Date.now().toString(),
          searchResultPosition,
          maxResults,
          major: 5,
          minor: 0,
          startTime: startOfDay,
          endTime: endOfDay
        }
      };

      const json = await hikvisionRequest(terminal, credentials, payload);
      const acs = json?.AcsEvent;
      const events = acs?.InfoList || [];
      if (!events.length) break;

      for (const event of events) {
        if (!event.employeeNoString) continue;

        await handleHikvisionPresence({
          employeeNoString: event.employeeNoString,
          time: event.time,
          serialNo: event.serialNo,
          cardReaderNo: event.cardReaderNo,
          device_sn: terminal.device_sn
        });

        console.log(`✅ ${event.employeeNoString} | ${event.time} | ${terminal.device_sn}`);
      }

      hasMore = acs?.responseStatusStrg === "MORE";
      searchResultPosition += maxResults;
    }

    await query(
      `UPDATE terminals SET last_sync_at = NOW(), last_seen_at = NOW() WHERE id_terminal = ?`,
      [terminal.id_terminal]
    );

    console.log(`✅ Terminal ${terminal.device_sn} synchronisé`);
  } catch (err) {
    console.error(`❌ Terminal ${terminal.device_sn} :`, err.message);
  }
}

// ===================== PULL ALL TERMINALS =====================
async function pullAllHikvisionTerminals() {
  const terminals = await query(
    `SELECT id_terminal, device_sn, ip_address, port, credentials_encrypted
     FROM terminals
     WHERE is_enabled = 1 AND usage_mode IN ('ATTENDANCE','BOTH')`
  );
  if (!terminals.length) return console.log("Aucun terminal actif");

  for (const terminal of terminals) await pullSingleTerminal(terminal);
}

// ===================== AUTO-SYNC =====================
setInterval(() => {
  pullAllHikvisionTerminals()
    .then(() => console.log("[AutoSync] Terminaux pullés"))
    .catch(err => console.error("[AutoSync] Erreur:", err.message));
}, PULL_INTERVAL_MS);

// ===================== EXPORT =====================
module.exports = { startPullScheduler: pullAllHikvisionTerminals };
