const { db } = require("./../config/database");
const moment = require("moment");
require('moment/locale/fr');
const util = require("util");
const query = util.promisify(db.query).bind(db);


async function handlePresenceLogic(presenceData, qrData, type_scan) {
  const { id_utilisateur, date_presence, datetime, source, device_sn, site_id } = presenceData;
  const dateISO = moment(date_presence).format("YYYY-MM-DD");
  const heurePointage = datetime
    ? moment(`${dateISO} ${datetime}`, "YYYY-MM-DD HH:mm:ss")
    : moment();
  const heureStock = heurePointage.format("YYYY-MM-DD HH:mm:ss");

  // 1️⃣ Vérifier jour travaillé selon planning
  const jourNom = moment(dateISO).locale('fr').format('dddd').toUpperCase();
  
  const planningRows = await query(
    `SELECT 
        hu.id_horaire_user,
        hd.jour_semaine,
        hd.heure_debut,
        hd.heure_fin,
        hd.tolerance_retard
    FROM horaire_user hu
    JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
    WHERE hu.user_id = ? AND hd.jour_semaine = ? 
      AND hu.date_debut <= ? AND (hu.date_fin IS NULL OR hu.date_fin >= ?)`,
    [id_utilisateur, jourNom, dateISO, dateISO]
  );

  const jourNonTravaille = planningRows.length === 0;
  const hd = planningRows[0];

  const debutTravail = hd ? moment(`${dateISO} ${hd.heure_debut}`, "YYYY-MM-DD HH:mm:ss") : null;
  const finTravail = hd ? moment(`${dateISO} ${hd.heure_fin}`, "YYYY-MM-DD HH:mm:ss") : null;

  // 2️⃣ Vérifier jour férié
  const ferieRows = await query(`SELECT 1 FROM jours_feries WHERE date_ferie = ?`, [dateISO]);
  if (ferieRows?.length) {
    throw new Error("Pointage interdit : jour férié");
  }

  // 3️⃣ Vérifier absence validée
  const absenceRows = await query(
    `SELECT a.id_absence, t.code, a.date_debut, a.date_fin
     FROM absences a
     JOIN absence_types t ON t.id_absence_type = a.id_absence_type
     WHERE a.id_utilisateur = ? AND a.statut = 'VALIDEE' 
       AND ? BETWEEN a.date_debut AND a.date_fin`,
    [id_utilisateur, dateISO]
  );
  
  if (absenceRows?.length) {
    const absence = absenceRows[0];
    throw new Error(`Pointage interdit : absence validée (${absence.code})`);
  }

  // 4️⃣ Vérifier présence existante
  const presenceRows = await query(
    `SELECT id_presence, heure_entree, heure_sortie, is_locked, statut_jour
     FROM presences
     WHERE id_utilisateur = ? AND date_presence = ? LIMIT 1`,
    [id_utilisateur, dateISO]
  );

  let presence = presenceRows?.[0] || null;

  // 5️⃣ Calcul retard et statut
  let retard_minutes = 0;
  let heures_supplementaires = 0;
  const statutJour = jourNonTravaille ? 'SUPPLEMENTAIRE' : 'PRESENT';

  if (type_scan === 'ENTREE') {
    if (!jourNonTravaille && hd && heurePointage.isAfter(debutTravail)) {
      const diff = heurePointage.diff(debutTravail, "minutes");
      retard_minutes = diff > (hd.tolerance_retard || 0) ? diff : 0;
    }

    // Cas: ABSENT → PRESENT (correction)
    if (presence && ["ABSENT", "JOUR_NON_TRAVAILLE"].includes(presence.statut_jour)) {
      await query(
        `UPDATE presences
         SET heure_entree = ?, statut_jour = ?, retard_minutes = ?, 
             source = ?, device_sn = ?, site_id = ?
         WHERE id_presence = ?`,
        [heureStock, statutJour, retard_minutes, source, device_sn, site_id, presence.id_presence]
      );
      
      return { action: 'CORRECTED_ABSENT', retard_minutes };
    }

    // Nouvelle présence
    if (!presence) {
      const result = await query(
        `INSERT INTO presences (
          id_utilisateur, site_id, date_presence, heure_entree,
          retard_minutes, heures_supplementaires, source,
          device_sn, statut_jour
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_utilisateur, site_id, dateISO, heureStock, retard_minutes, 0, source, device_sn, statutJour]
      );
      
      return { action: 'ENTRY_CREATED', retard_minutes, id_presence: result.insertId };
    }

    // Protection doublon
    if (presence.heure_entree) {
      return { action: 'ALREADY_CHECKED_IN', message: 'Entrée déjà enregistrée' };
    }
    
    // Mise à jour entrée manquante
    await query(
      `UPDATE presences
       SET heure_entree = ?, retard_minutes = ?, source = ?, device_sn = ?
       WHERE id_presence = ?`,
      [heureStock, retard_minutes, source, device_sn, presence.id_presence]
    );
    
    return { action: 'ENTRY_UPDATED', retard_minutes };
    
  } else if (type_scan === 'SORTIE') {
    if (!presence || !presence.heure_entree) {
      throw new Error("Aucune entrée enregistrée pour aujourd'hui");
    }

    // Calcul heures supplémentaires
    if (jourNonTravaille) {
      heures_supplementaires = Number(
        heurePointage.diff(moment(presence.heure_entree), "hours", true).toFixed(2)
      );
    } else if (hd && heurePointage.isAfter(finTravail)) {
      heures_supplementaires = Number(
        (heurePointage.diff(finTravail, "minutes") / 60).toFixed(2)
      );
    }

    await query(
      `UPDATE presences
       SET heure_sortie = ?, heures_supplementaires = ?
       WHERE id_presence = ?`,
      [heureStock, heures_supplementaires, presence.id_presence]
    );
    
    return { action: 'EXIT_RECORDED', heures_supplementaires };
  }
}

module.exports = { handlePresenceLogic };
