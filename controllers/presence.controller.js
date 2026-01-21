const { db } = require("./../config/database");
const moment = require("moment");
const util = require("util");
const query = util.promisify(db.query).bind(db);

exports.getPresence = (req, res) => {

    const q = `SELECT * FROM presences`;
    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).json({
                message: 'Erreur lors de la récuperations des presences.',
                error
            })
        }
        return res.status(200).json(data);
    });
};

const jourSemaineFR = (date) => {
  const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const d = new Date(date);
  return jours[d.getDay()];
};

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* exports.getPresencePlanning = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "Paramètres month et year requis" });
    }

    const monthPadded = String(month).padStart(2, "0");
    const debut = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

    // 1️⃣ Utilisateurs
    const users = await query(`
      SELECT id_utilisateur, nom
      FROM utilisateur
      ORDER BY nom
    `);

    // 2️⃣ Générer toutes les dates du mois
    const datesRaw = await query(`
      SELECT DATE(?) + INTERVAL n DAY AS date
      FROM (
        SELECT a.a + b.a * 10 AS n
        FROM (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
        CROSS JOIN (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
      ) numbers
      WHERE DATE(?) + INTERVAL n DAY <= ?
      ORDER BY DATE(?) + INTERVAL n DAY
    `, [debut, debut, fin, debut]);

    // 3️⃣ Jours fériés et non travaillés
    const joursFeries = await query(`SELECT date_ferie FROM jours_feries`);
    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);

    // 4️⃣ Présences du mois avec heures
    const presences = await query(`
      SELECT id_utilisateur, date_presence, heure_entree, heure_sortie
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `, [debut, fin]);

    // 5️⃣ Congés validés
    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_debut <= ?
        AND date_fin >= ?
    `, [fin, debut]);

    // 6️⃣ Optimisation
    const presMapByUserDate = {};
    presences.forEach(p => {
      presMapByUserDate[`${p.id_utilisateur}_${formatDate(p.date_presence)}`] = {
        statut: "PRESENT",
        heure_entree: p.heure_entree,
        heure_sortie: p.heure_sortie
      };
    });

    const congesList = conges.map(c => ({
      id: c.id_utilisateur,
      debut: formatDate(c.date_debut),
      fin: formatDate(c.date_fin)
    }));

    // 7️⃣ Construction des dates (colonnes)
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);
      let statutJour = "TRAVAIL";

      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) statutJour = "FERIE";
      else if (joursNonTrav.some(j => j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase()))
        statutJour = "NON_TRAVAILLE";

      const label = `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`;

      return { date: dateKey, label, statutJour };
    });

    // 8️⃣ Construction planning utilisateurs
    const utilisateurs = users.map(u => {
      const presencesByDate = {};

      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin);

        if (cong) {
          presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
        } else if (presMapByUserDate[key]) {
          presencesByDate[d.date] = presMapByUserDate[key];
        } else if (d.statutJour === "FERIE") {
          presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        } else if (d.statutJour === "NON_TRAVAILLE") {
          presencesByDate[d.date] = { statut: "NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        } else {
          presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
        }
      });

      return { id_utilisateur: u.id_utilisateur, nom: u.nom, presences: presencesByDate };
    });

    // 9️⃣ Réponse finale
    res.json({ month: Number(month), year: Number(year), dates, utilisateurs });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({ message: "Erreur serveur planning" });
  }
}; */

/* exports.getPresencePlanning = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { role, scope_sites = [], scope_departments = [] } = req.query;

    // 🔹 Récupérer user_id depuis query si Owner
    let user_id = null;
    if (role === 'Owner') {
      if (!req.query.user_id) {
        return res.status(400).json({ message: "Owner doit fournir son user_id dans la query" });
      }
      user_id = parseInt(req.query.user_id, 10);
    }

    if (!month || !year) {
      return res.status(400).json({ message: "Paramètres month et year requis" });
    }

    const monthPadded = String(month).padStart(2, "0");
    const debut = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

    // 🔹 1️⃣ Récupération des utilisateurs selon rôle / ABAC
    let usersQuery = `SELECT id_utilisateur, nom, id_departement FROM utilisateur WHERE 1=1`;
    const usersValues = [];

    if (role === 'Owner') {
      usersQuery += ` AND id_utilisateur = ?`;
      usersValues.push(user_id);
    } else if (scope_departments.length > 0) {
      usersQuery += ` AND id_departement IN (${scope_departments.join(',')})`;
    }

    const users = await query(usersQuery, usersValues);

    // 🔹 2️⃣ Générer toutes les dates du mois
    const datesRaw = await query(`
      SELECT DATE(?) + INTERVAL n DAY AS date
      FROM (
        SELECT a.a + b.a * 10 AS n
        FROM (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
        CROSS JOIN (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
      ) numbers
      WHERE DATE(?) + INTERVAL n DAY <= ?
      ORDER BY DATE(?) + INTERVAL n DAY
    `, [debut, debut, fin, debut]);

    // 🔹 3️⃣ Jours fériés et non travaillés
    const joursFeries = await query(`SELECT date_ferie FROM jours_feries`);
    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);

    // 🔹 4️⃣ Présences du mois
    let presQuery = `
      SELECT id_utilisateur, date_presence, heure_entree, heure_sortie, site_id
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `;
    const presValues = [debut, fin];

    if (role !== 'Owner' && scope_sites.length > 0) {
      presQuery += ` AND site_id IN (${scope_sites.join(',')})`;
    }

    if (role === 'Owner') {
      presQuery += ` AND id_utilisateur = ?`;
      presValues.push(user_id);
    }

    const presences = await query(presQuery, presValues);

    // 🔹 5️⃣ Congés validés
    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_debut <= ?
        AND date_fin >= ?
    `, [fin, debut]);

    // 🔹 6️⃣ Mapping présences et congés
    const presMapByUserDate = {};
    presences.forEach(p => {
      presMapByUserDate[`${p.id_utilisateur}_${formatDate(p.date_presence)}`] = {
        statut: "PRESENT",
        heure_entree: p.heure_entree,
        heure_sortie: p.heure_sortie
      };
    });

    const congesList = conges.map(c => ({
      id: c.id_utilisateur,
      debut: formatDate(c.date_debut),
      fin: formatDate(c.date_fin)
    }));

    // 🔹 7️⃣ Dates du mois avec statut
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);
      let statutJour = "TRAVAIL";

      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) statutJour = "FERIE";
      else if (joursNonTrav.some(j => j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase()))
        statutJour = "NON_TRAVAILLE";

      const label = `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`;

      return { date: dateKey, label, statutJour };
    });

    // 🔹 8️⃣ Construction planning utilisateurs
    const utilisateurs = users.map(u => {
      const presencesByDate = {};

      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin);

        if (cong) {
          presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
        } else if (presMapByUserDate[key]) {
          presencesByDate[d.date] = presMapByUserDate[key];
        } else if (d.statutJour === "FERIE") {
          presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        } else if (d.statutJour === "NON_TRAVAILLE") {
          presencesByDate[d.date] = { statut: "NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        } else {
          presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
        }
      });

      return { id_utilisateur: u.id_utilisateur, nom: u.nom, presences: presencesByDate };
    });

    // 🔹 9️⃣ Réponse finale
    res.json({ month: Number(month), year: Number(year), dates, utilisateurs });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({ message: "Erreur serveur planning" });
  }
}; */

exports.getPresencePlanning = async (req, res) => {
  try {
    const { month, year } = req.query;
    const { role, scope_sites = [], scope_departments = [] } = req.query;

    // 🔹 Owner
    let user_id = null;
    if (role === "Owner") {
      if (!req.query.user_id) {
        return res.status(400).json({
          message: "Owner doit fournir son user_id dans la query"
        });
      }
      user_id = parseInt(req.query.user_id, 10);
    }

    if (!month || !year) {
      return res.status(400).json({ message: "Paramètres month et year requis" });
    }

    const monthPadded = String(month).padStart(2, "0");
    const debut = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

    // 🔹 1️⃣ Utilisateurs
    let usersQuery = `
      SELECT id_utilisateur, nom, prenom, id_departement
      FROM utilisateur
      WHERE 1=1
    `;
    const usersValues = [];

    if (role === "Owner") {
      usersQuery += " AND id_utilisateur = ?";
      usersValues.push(user_id);
    } else if (scope_departments.length > 0) {
      usersQuery += ` AND id_departement IN (${scope_departments.join(",")})`;
    }

    const users = await query(usersQuery, usersValues);

    // 🔹 2️⃣ Dates du mois
    const datesRaw = await query(
      `
      SELECT DATE(?) + INTERVAL n DAY AS date
      FROM (
        SELECT a.a + b.a * 10 AS n
        FROM (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
              UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
        CROSS JOIN (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
      ) numbers
      WHERE DATE(?) + INTERVAL n DAY <= ?
      ORDER BY DATE(?) + INTERVAL n DAY
    `,
      [debut, debut, fin, debut]
    );

    // 🔹 3️⃣ Jours fériés / non travaillés
    const joursFeries = await query(`SELECT date_ferie FROM jours_feries`);
    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);

    // 🔹 4️⃣ Présences
    let presQuery = `
      SELECT 
        id_presence,
        id_utilisateur,
        date_presence,
        heure_entree,
        heure_sortie,
        site_id
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `;
    const presValues = [debut, fin];

    if (role !== "Owner" && scope_sites.length > 0) {
      presQuery += ` AND site_id IN (${scope_sites.join(",")})`;
    }

    if (role === "Owner") {
      presQuery += ` AND id_utilisateur = ?`;
      presValues.push(user_id);
    }

    const presences = await query(presQuery, presValues);

    // 🔹 4️⃣ bis — Ajustements
    const adjustments = await query(
      `
      SELECT 
        a.id_presence,
        a.type,
        a.nouvelle_valeur,
        a.statut,
        p.id_utilisateur,
        p.date_presence
      FROM attendance_adjustments a
      JOIN presences p ON p.id_presence = a.id_presence
      WHERE p.date_presence BETWEEN ? AND ?
    `,
      [debut, fin]
    );

    const adjustmentsMap = {};
    adjustments.forEach(a => {
      const key = `${a.id_utilisateur}_${formatDate(a.date_presence)}`;
      adjustmentsMap[key] = a;
    });

    // 🔹 5️⃣ Congés validés
    const conges = await query(
      `
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_debut <= ?
        AND date_fin >= ?
    `,
      [fin, debut]
    );

    const congesList = conges.map(c => ({
      id: c.id_utilisateur,
      debut: formatDate(c.date_debut),
      fin: formatDate(c.date_fin)
    }));

    // 🔹 6️⃣ Mapping présences
    const presMapByUserDate = {};
    presences.forEach(p => {
      const key = `${p.id_utilisateur}_${formatDate(p.date_presence)}`;
      const adj = adjustmentsMap[key];

      presMapByUserDate[key] = {
        statut: "PRESENT",
        heure_entree: p.heure_entree,
        heure_sortie: p.heure_sortie,
        id_presence: p.id_presence,
        adjustment_statut: adj?.statut || null,
        adjustment_type: adj?.type || null
      };
    });

    // 🔹 7️⃣ Dates avec statut
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);
      let statutJour = "TRAVAIL";

      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) {
        statutJour = "FERIE";
      } else if (
        joursNonTrav.some(
          j => j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase()
        )
      ) {
        statutJour = "NON_TRAVAILLE";
      }

      return {
        date: dateKey,
        label: `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`,
        statutJour
      };
    });

    // 🔹 8️⃣ Construction planning
    const utilisateurs = users.map(u => {
      const presencesByDate = {};

      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(
          c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin
        );

        if (cong) {
          presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
          return;
        }

        if (presMapByUserDate[key]) {
          const base = { ...presMapByUserDate[key] };
          const adj = adjustmentsMap[key];

          if (adj?.statut === "VALIDE") {
            if (adj.type === "RETARD_JUSTIFIE") base.retard_justifie = true;
            if (adj.type === "CORRECTION_HEURE") base.heure_entree = adj.nouvelle_valeur;
            if (adj.type === "AUTORISATION_SORTIE") base.autorisation_sortie = true;
          }

          presencesByDate[d.date] = base;
          return;
        }

        if (d.statutJour === "FERIE") {
          presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        } else if (d.statutJour === "NON_TRAVAILLE") {
          presencesByDate[d.date] = { statut: "NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        } else {
          presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
        }
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        prenom :u.prenom,
        presences: presencesByDate
      };
    });

    // 🔹 9️⃣ Réponse
    res.json({
      month: Number(month),
      year: Number(year),
      dates,
      utilisateurs
    });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({ message: "Erreur serveur planning" });
  }
};

exports.getMonthlyPresenceReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "month et year requis" });
    }

    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);

    const startDate = moment(`${yearInt}-${monthInt.toString().padStart(2, "0")}-01`, "YYYY-MM-DD")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endDate = moment(startDate).endOf("month").format("YYYY-MM-DD");

    // 1️⃣ Récupérer les utilisateurs
    const users = await query(`
      SELECT id_utilisateur, nom
      FROM utilisateur
      ORDER BY nom
    `);

    // 2️⃣ Récupérer les présences du mois
    const presences = await query(
      `SELECT id_utilisateur, date_presence, heure_entree, heure_sortie, heures_supplementaires, retard_minutes
       FROM presences
       WHERE date_presence BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // 3️⃣ Récupérer les congés validés
    const conges = await query(
      `SELECT id_utilisateur, date_debut, date_fin
       FROM conges
       WHERE statut = 'VALIDE'
         AND date_fin >= ?
         AND date_debut <= ?`,
      [startDate, endDate]
    );

    // 4️⃣ Récupérer les jours fériés
    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // 5️⃣ Récupérer les jours non travaillés
    // Ici on considère que les jours sont en français dans la table
    const mapJourSemaineFR = {
      dimanche: 0,
      lundi: 1,
      mardi: 2,
      mercredi: 3,
      jeudi: 4,
      vendredi: 5,
      samedi: 6
    };
    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);
    const joursNonTravSet = new Set(
      joursNonTrav.map(j => mapJourSemaineFR[j.jour_semaine.toLowerCase()])
    );

    // 6️⃣ Préparer les maps pour performance
    const presencesMap = new Map();
    presences.forEach(p => {
      presencesMap.set(`${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`, p);
    });

    const congesMap = new Map();
    conges.forEach(c => {
      if (!congesMap.has(c.id_utilisateur)) congesMap.set(c.id_utilisateur, []);
      congesMap.get(c.id_utilisateur).push({
        debut: moment(c.date_debut),
        fin: moment(c.date_fin)
      });
    });

    const joursFeriesSet = new Set(joursFeries.map(j => moment(j.date_ferie).format("YYYY-MM-DD")));

    // 7️⃣ Générer toutes les dates du mois
    const dates = [];
    let d = moment(startDate);
    while (d.isSameOrBefore(endDate)) {
      dates.push(d.format("YYYY-MM-DD"));
      d.add(1, "day");
    }

    // 8️⃣ Construire le rapport par utilisateur
    const report = users.map(u => {
      let joursTravailles = 0,
          absences = 0,
          retards = 0,
          heuresSupp = 0,
          congesPayes = 0,
          joursFerie = 0,
          nonTravaille = 0;

      const presMap = {};

      dates.forEach(dateStr => {
        let statut = "ABSENT";
        const dayOfWeek = moment(dateStr).day(); // 0 = dimanche, 1 = lundi ...

        // Jour férié
        if (joursFeriesSet.has(dateStr)) {
          statut = "FERIE";
          joursFerie++;
        }
        // Jour non travaillé
        else if (joursNonTravSet.has(dayOfWeek)) {
          statut = "NON_TRAVAILLE";
          nonTravaille++;
        }
        // Congé
        else if (congesMap.has(u.id_utilisateur)) {
          const cong = congesMap.get(u.id_utilisateur).find(c => moment(dateStr).isBetween(c.debut, c.fin, null, "[]"));
          if (cong) {
            statut = "CONGE";
            congesPayes++;
          }
        }

        // Présence
        const pKey = `${u.id_utilisateur}_${dateStr}`;
        if (presencesMap.has(pKey)) {
          statut = "PRESENT";
          joursTravailles++;
          const p = presencesMap.get(pKey);
          heuresSupp += Number(p.heures_supplementaires || 0);
          retards += Number(p.retard_minutes || 0);
        }

        if (statut === "ABSENT") absences++;

        presMap[dateStr] = presencesMap.get(pKey) || { statut };
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        joursTravailles,
        absences,
        retards,
        heuresSupp,
        congesPayes,
        joursFerie,
        nonTravaille,
        presences: presMap
      };
    });

    res.json({
      startDate,
      endDate,
      dates,
      report
    });

  } catch (err) {
    console.error("Erreur getMonthlyAttendanceReport:", err);
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport mensuel" });
  }
};

exports.getLateEarlyLeaveReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // ✅ Fallback : mois courant
    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    }

    const data = await query(`
      SELECT
        u.nom,
        p.date_presence,
        '08:00:00' AS heure_entree_prevue,
        TIME(p.heure_entree) AS heure_entree_reelle,
        p.retard_minutes,
        '16:00:00' AS heure_sortie_prevue,
        IFNULL(TIME(p.heure_sortie), '-') AS heure_sortie_reelle,

        CASE
          WHEN p.heure_sortie IS NOT NULL
           AND TIME(p.heure_sortie) < '16:00:00'
          THEN TIMESTAMPDIFF(
            MINUTE,
            p.heure_sortie,
            CONCAT(p.date_presence, ' 16:00:00')
          )
          ELSE 0
        END AS depart_anticipe_minutes,

        p.heures_supplementaires,

        CASE
          WHEN p.retard_minutes > 0
           AND TIME(p.heure_sortie) < '16:00:00'
            THEN 'Retard + Départ anticipé'
          WHEN p.retard_minutes > 0
            THEN 'Retard'
          WHEN TIME(p.heure_sortie) < '16:00:00'
            THEN 'Départ anticipé'
          WHEN p.heures_supplementaires > 0
            THEN 'Heures supplémentaires'
          ELSE 'Ponctuel'
        END AS commentaire

      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence BETWEEN ? AND ?
      ORDER BY p.date_presence, u.nom
    `, [startDate, endDate]);

    res.json({
      startDate,
      endDate,
      total: data.length,
      data
    });

  } catch (err) {
    console.error("Erreur getLateEarlyLeaveReport :", err);
    res.status(500).json({
      message: "Erreur serveur lors de la génération du rapport"
    });
  }
};

exports.getHRGlobalReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // 🔹 Fallback mois courant
    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    }

    // 1️⃣ Total employés
    const [emp] = await query(`
      SELECT COUNT(*) AS total_employes FROM utilisateur
    `);

    // 2️⃣ Total jours travaillés
    const [worked] = await query(`
      SELECT COUNT(*) AS total_jours_travailles
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `, [startDate, endDate]);

    // 3️⃣ Total retards
    const [late] = await query(`
      SELECT COUNT(*) AS total_retards
      FROM presences
      WHERE retard_minutes > 0
        AND date_presence BETWEEN ? AND ?
    `, [startDate, endDate]);

    // 4️⃣ Total absences
    const [abs] = await query(`
      SELECT COUNT(*) AS total_absences
      FROM utilisateur u
      WHERE NOT EXISTS (
        SELECT 1 FROM presences p
        WHERE p.id_utilisateur = u.id_utilisateur
          AND p.date_presence BETWEEN ? AND ?
      )
    `, [startDate, endDate]);

    // 5️⃣ Absences par département
    const absByDept = await query(`
      SELECT
        d.nom AS departement,
        COUNT(*) AS absences
      FROM utilisateur u
      JOIN departement d ON d.id_departement = u.id_departement
      WHERE NOT EXISTS (
        SELECT 1 FROM presences p
        WHERE p.id_utilisateur = u.id_utilisateur
          AND p.date_presence BETWEEN ? AND ?
      )
      GROUP BY d.id_departement
      ORDER BY absences DESC
    `, [startDate, endDate]);

    // 6️⃣ Calcul taux de présence global
    const joursOuvres = moment(endDate).diff(moment(startDate), "days") + 1;
    const totalTheorique = joursOuvres * emp.total_employes;
    const tauxPresence = totalTheorique > 0
      ? ((worked.total_jours_travailles / totalTheorique) * 100).toFixed(2)
      : 0;

    res.json({
      periode: { startDate, endDate },
      indicateurs: {
        totalEmployes: emp.total_employes,
        totalJoursTravailles: worked.total_jours_travailles,
        totalAbsences: abs.total_absences,
        totalRetards: late.total_retards,
        tauxPresenceGlobal: `${tauxPresence}%`
      },
      absencesParDepartement: absByDept
    });

  } catch (err) {
    console.error("Erreur rapport RH global :", err);
    res.status(500).json({
      message: "Erreur serveur rapport RH"
    });
  }
};

exports.getPresenceById = (req, res) => {
    const { id_utilisateur } = req.query;

    if(id_utilisateur) {
        return res.status(400).json({
            error: 'ID presence est requis.'
        })
    }

    const q = `SELECT * FROM presences WHERE id_utilisateur = ?`;
    db.query(q, [id_utilisateur], (error, data) => {
        if(error) {
            return res.status(500).json({
                message: 'Erreur lors de la récuperations des presences.',
                error
            })
        }
        return res.status(200).json(data);
    });
};

/* exports.postPresence = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_presence,
      datetime, 
      source,
      device_sn
    } = req.body;

    if (!id_utilisateur || !date_presence) {
      return res.status(400).json({
        message: "Champs obligatoires manquants"
      });
    }

    // Utilisation de moment pour normaliser
    const dateISO = moment(date_presence).format("YYYY-MM-DD");
    const heurePointage = datetime
      ? moment(datetime).format("YYYY-MM-DD HH:mm:ss")
      : moment().format("YYYY-MM-DD HH:mm:ss");

    const jour = moment(date_presence).format("dddd"); // Nom du jour en anglais
    const jourFR = jourSemaineFR(date_presence); // si tu as une fonction de conversion en FR

    const nonTravaille = await query(
      `SELECT 1 FROM jours_non_travailles WHERE jour_semaine = ?`,
      [jourFR]
    );
    if (nonTravaille.length > 0) {
      return res.status(403).json({
        message: `Pointage interdit : ${jourFR} est un jour non travaillé`
      });
    }

    const ferie = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (ferie.length > 0) {
      return res.status(403).json({
        message: "Pointage interdit : jour férié"
      });
    }

    const presence = await query(
      `SELECT id_presence, heure_entree, heure_sortie
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    if (presence.length === 0) {
      await query(
        `INSERT INTO presences (
          id_utilisateur,
          date_presence,
          heure_entree,
          source,
          device_sn
        ) VALUES (?, ?, ?, ?, ?)`,
        [id_utilisateur, dateISO, heurePointage, source, device_sn || null]
      );

      return res.status(201).json({
        message: "Entrée enregistrée"
      });
    }

    if (presence[0].heure_sortie === null) {
      await query(
        `UPDATE presences
         SET heure_sortie = ?
         WHERE id_presence = ?`,
        [heurePointage, presence[0].id_presence]
      );

      return res.status(200).json({
        message: "Sortie enregistrée"
      });
    }

    return res.status(409).json({
      message: "Présence déjà complète pour cette date"
    });

  } catch (error) {
    console.error("Erreur postPresence :", error);
    res.status(500).json({
      message: "Erreur interne du serveur"
    });
  }
}; */

exports.postPresence = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_presence,
      datetime,          // biométrie
      source = 'TERMINAL',
      device_sn,
      terminal_id,
      permissions = []
    } = req.body;

    // 0️⃣ Vérification RBAC
    if (!permissions.includes("attendance.events.correct")) {
      return res.status(403).json({ message: "Permission refusée" });
    }

    if (!id_utilisateur || !date_presence) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const dateISO = moment(date_presence).format("YYYY-MM-DD");
    const heurePointage = datetime
      ? moment(datetime)
      : moment(`${dateISO} ${moment().format("HH:mm:ss")}`, "YYYY-MM-DD HH:mm:ss");

    /* =========================================================
       1️⃣ Vérifier terminal (ATTENDANCE seulement) + ABAC
    ========================================================= */
    let terminal = null;
    if (terminal_id) {
      const terminals = await query(
        `SELECT usage_mode, is_enabled, site_id
         FROM terminals 
         WHERE id_terminal = ?`,
        [terminal_id]
      );

      if (!Array.isArray(terminals) || terminals.length === 0 || !terminals[0].is_enabled) {
        return res.status(403).json({ message: "Terminal désactivé ou inconnu" });
      }

      terminal = terminals[0];

      if (!['ATTENDANCE', 'BOTH'].includes(terminal.usage_mode)) {
        return res.status(403).json({ message: "Terminal non autorisé pour pointage RH" });
      }

      if (!req.abac.scope_sites.includes(terminal.site_id)) {
        return res.status(403).json({ message: "Vous n'avez pas accès à ce site" });
      }
    }

    /* =========================================================
       2️⃣ Vérifier jour férié ou non travaillé
    ========================================================= */
    const jourFR = jourSemaineFR(date_presence);

    const nonTravailleRows = await query(
      `SELECT 1 FROM jours_non_travailles WHERE jour_semaine = ?`,
      [jourFR]
    );
    if (Array.isArray(nonTravailleRows) && nonTravailleRows.length > 0) {
      return res.status(403).json({ message: `Pointage interdit : ${jourFR} non travaillé` });
    }

    const ferieRows = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (Array.isArray(ferieRows) && ferieRows.length > 0) {
      return res.status(403).json({ message: "Pointage interdit : jour férié" });
    }

    const absenceRows = await query(
      `SELECT a.id_absence, t.code
       FROM absences a
       JOIN absence_types t ON t.id_absence_type = a.id_absence_type
       WHERE a.id_utilisateur = ?
         AND a.statut = 'VALIDEE'
         AND ? BETWEEN a.date_debut AND a.date_fin`,
      [id_utilisateur, dateISO]
    );
    if (Array.isArray(absenceRows) && absenceRows.length > 0) {
      return res.status(403).json({
        message: `Pointage interdit : absence validée (${absenceRows[0].code})`
      });
    }

    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    const presence = Array.isArray(presenceRows) && presenceRows.length > 0 ? presenceRows[0] : null;

    if (presence?.is_locked) {
      return res.status(403).json({ message: "Présence verrouillée" });
    }

    const debutTravail = moment(`${dateISO} 08:00:00`);
    const finTravail   = moment(`${dateISO} 16:00:00`);
    let retard_minutes = 0;
    let heures_supplementaires = 0;

    /* =========================================================
       3️⃣ Entrée
    ========================================================= */
    if (!presence) {
      if (heurePointage.isAfter(debutTravail)) {
        retard_minutes = heurePointage.diff(debutTravail, "minutes");
      }

      const result = await query(
        `INSERT INTO presences (
          id_utilisateur, site_id, date_presence, heure_entree,
          retard_minutes, heures_supplementaires, source,
          terminal_id, device_sn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_utilisateur,
          terminal?.site_id || null,
          dateISO,
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          0,
          source,
          terminal_id || null,
          device_sn || null
        ]
      );

      return res.status(201).json({ message: "Entrée enregistrée", retard_minutes });
    }

    /* =========================================================
       4️⃣ Sortie
    ========================================================= */
    if (!presence.heure_sortie) {
      const autorisationRows = await query(
        `SELECT 1 FROM attendance_adjustments
         WHERE id_presence = ? AND type = 'AUTORISATION_SORTIE' AND statut = 'VALIDE'`,
        [presence.id_presence]
      );

      const autorisation = Array.isArray(autorisationRows) && autorisationRows.length > 0;

      if (heurePointage.isBefore(finTravail) && !autorisation) {
        return res.status(403).json({ message: "Sortie anticipée non autorisée" });
      }

      if (heurePointage.isAfter(finTravail)) {
        heures_supplementaires = heurePointage.diff(finTravail, "minutes") / 60;
      }

      await query(
        `UPDATE presences
         SET heure_sortie = ?, heures_supplementaires = ?
         WHERE id_presence = ?`,
        [heurePointage.format("YYYY-MM-DD HH:mm:ss"), heures_supplementaires, presence.id_presence]
      );

      return res.status(200).json({ message: "Sortie enregistrée", heures_supplementaires });
    }

    /* =========================================================
       5️⃣ Déjà complet
    ========================================================= */
    return res.status(409).json({ message: "Présence déjà complète pour cette date" });

  } catch (error) {
    console.error("Erreur postPresence :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

exports.postPresenceBiometrique = async (req, res) => {
  try {
    const { id_utilisateur, datetime, device_sn } = req.body;

    const date = datetime.split(" ")[0];
    const heure = datetime;

    /* vérifier présence existante */
    const exist = await query(`
      SELECT id_presence, heure_entree
      FROM presences
      WHERE id_utilisateur = ? AND date_presence = ?
      LIMIT 1
    `, [id_utilisateur, date]);

    if (exist.length === 0) {
      /* ENTRÉE */
      await query(`
        INSERT INTO presences (
          id_utilisateur,
          date_presence,
          heure_entree,
          source,
          device_sn
        ) VALUES (?, ?, ?, 'BIOMETRIQUE', ?)
      `, [id_utilisateur, date, heure, device_sn]);

      return res.json({ message: "Entrée enregistrée" });
    }

    /* SORTIE */
    await query(`
      UPDATE presences
      SET heure_sortie = ?
      WHERE id_presence = ?
    `, [heure, exist[0].id_presence]);

    res.json({ message: "Sortie enregistrée" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur biométrique" });
  }
};

exports.getAttendanceAdjustment = async (req, res) => {
  try {
    const {
      statut,
      month,
      year,
      id_utilisateur
    } = req.query;

    let where = "WHERE 1=1";
    const values = [];

    // 🔹 Filtre statut (PROPOSE | VALIDE | REJETE)
    if (statut) {
      where += " AND aa.statut = ?";
      values.push(statut);
    }

    // 🔹 Filtre utilisateur
    if (id_utilisateur) {
      where += " AND p.id_utilisateur = ?";
      values.push(id_utilisateur);
    }

    // 🔹 Filtre mois / année
    if (month && year) {
      where += " AND MONTH(p.date_presence) = ? AND YEAR(p.date_presence) = ?";
      values.push(month, year);
    }

    const querySql = `
      SELECT
        aa.id_adjustment,
        aa.type,
        aa.ancienne_valeur,
        aa.nouvelle_valeur,
        aa.motif,
        aa.statut,
        aa.created_at,
        aa.validated_at,

        -- Présence
        p.id_presence,
        p.date_presence,
        p.heure_entree,
        p.heure_sortie,
        p.statut_jour,
        p.is_locked,

        -- Employé
        u.id_utilisateur,
        u.nom AS utilisateur_nom,

        -- Validateur RH
        v.id_utilisateur AS validated_by_id,
        v.nom AS validated_by_nom

      FROM attendance_adjustments aa
      INNER JOIN presences p ON p.id_presence = aa.id_presence
      INNER JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      LEFT JOIN utilisateur v ON v.id_utilisateur = aa.validated_by

      ${where}
      ORDER BY aa.created_at DESC
    `;

    db.query(querySql, values, (error, rows) => {
      if (error) {
        console.error("getAttendanceAdjustments error:", error);
        return res.status(500).json({
          message: "Erreur lors de la récupération des ajustements",
        });
      }

      return res.status(200).json(rows);
    });

  } catch (error) {
    console.error("getAttendanceAdjustments exception:", error);
    return res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

exports.postAttendanceAdjustment = async (req, res) => {
  try {
    const { id_presence, type, nouvelle_valeur, motif, created_by } = req.body;

    if (!id_presence || !type || !motif) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    // 1️⃣ Vérifier existence présence
    const [presence] = await query(
      `SELECT id_presence, heure_entree, heure_sortie FROM presences WHERE id_presence = ?`,
      [id_presence]
    );

    if (!presence) {
      return res.status(404).json({ message: "Présence introuvable" });
    }

    // 2️⃣ Bloquer doublon actif
    const [existing] = await query(
      `SELECT id_adjustment FROM attendance_adjustments
       WHERE id_presence = ? AND statut IN ('PROPOSE','VALIDE')`,
      [id_presence]
    );

    if (existing) {
      return res.status(409).json({
        message: "Un ajustement est déjà en cours pour cette présence"
      });
    }

    // 3️⃣ Déterminer ancienne valeur
    let ancienne_valeur = null;
    let newVal = nouvelle_valeur || null;

    if (type === "CORRECTION_HEURE") {
      ancienne_valeur = presence.heure_entree ? presence.heure_entree.toISOString() : null;

      if (!nouvelle_valeur) {
        return res.status(400).json({ message: "Nouvelle valeur obligatoire pour CORRECTION_HEURE" });
      }

      // S'assurer que nouvelle_valeur est bien une string
      if (nouvelle_valeur instanceof Date) {
        newVal = nouvelle_valeur.toISOString();
      } else {
        newVal = String(nouvelle_valeur);
      }
    } else if (type === "RETARD_JUSTIFIE" || type === "AUTORISATION_SORTIE") {
      // Pour ces types, nouvelle_valeur est optionnelle, mais on stocke string
      newVal = nouvelle_valeur ? String(nouvelle_valeur) : null;
    }

    // 4️⃣ Insertion ajustement
    await query(
      `INSERT INTO attendance_adjustments
        (id_presence, type, ancienne_valeur, nouvelle_valeur, motif, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_presence, type, ancienne_valeur, newVal, motif, created_by]
    );

    return res.status(201).json({
      message: "Demande d’ajustement soumise avec succès"
    });

  } catch (error) {
    console.error("postAttendanceAdjustment error:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.validateAttendanceAdjustment = async (req, res) => {

  try {
    const { id_adjustment, validated_by, decision } = req.body;

    // 1️⃣ Récupération + verrouillage
    const [adjustment] = await query(
      `SELECT *
       FROM attendance_adjustments
       WHERE id_adjustment = ?
       FOR UPDATE`,
      [id_adjustment]
    );

    if (!adjustment) {
      return res.status(404).json({ message: "Demande introuvable" });
    }

    if (adjustment.statut !== "PROPOSE") {
      return res.status(409).json({
        message: "Cette demande a déjà été traitée",
      });
    }

    // 2️⃣ Mise à jour adjustment (AUDIT)
    await query(
      `UPDATE attendance_adjustments
       SET statut = ?,
           validated_by = ?,
           validated_at = NOW()
       WHERE id_adjustment = ?`,
      [decision, validated_by, id_adjustment]
    );

    // 3️⃣ Appliquer l'ajustement si validé
    if (decision === "VALIDE") {
      // Verrouiller la présence
      await query(
        `UPDATE presences
         SET is_locked = 1,
             updated_at = NOW()
         WHERE id_presence = ?`,
        [adjustment.id_presence]
      );

      // Ajustement métier selon le type
      if (adjustment.type === "RETARD_JUSTIFIE") {
        await query(
          `UPDATE presences
           SET retard_minutes = 0,
               statut_jour = 'ABSENCE_JUSTIFIEE'
           WHERE id_presence = ?`,
          [adjustment.id_presence]
        );
      }

      if (adjustment.type === "CORRECTION_HEURE") {
        await query(
          `UPDATE presences
           SET heure_entree = ?,
               heure_sortie = ?
           WHERE id_presence = ?`,
          [
            adjustment.nouvelle_valeur?.split("|")[0] || null,
            adjustment.nouvelle_valeur?.split("|")[1] || null,
            adjustment.id_presence,
          ]
        );
      }
    }

    return res.status(200).json({
      message: `Demande ${decision === "VALIDE" ? "validée" : "rejetée"} avec succès`,
    });
  } catch (error) {
    console.error("Validation adjustment error:", error);

    return res.status(500).json({
      message: "Erreur serveur lors de la validation",
    });
  }
};

//Congé
exports.getConge = (req, res) => {
    const q = `
    SELECT 
        c.id_conge,
        c.id_utilisateur,
        c.date_debut,
        c.date_fin,
        c.type_conge,
        c.statut,
        c.commentaire,
        u.nom AS agent_name,
        u.prenom AS agent_lastname,
        u2.nom AS created_name,
        u2.prenom AS created_lastname,
        u3.nom AS validated_name,
        u3.prenom AS validated_lastname
    FROM conges c
    JOIN utilisateur u ON c.id_utilisateur = u.id_utilisateur
    LEFT JOIN utilisateur u2 ON c.created_by = u2.id_utilisateur
    LEFT JOIN utilisateur u3 ON c.validated_by = u3.id_utilisateur
    `;
    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).json({
                message: 'Erreur lors de la récupération des congés.',
                error
            })
        }
        return res.status(200).json(data);
    });
};

exports.postConge = (req, res) => {
    try {
        const {
            id_utilisateur,
            date_debut,
            date_fin,
            type_conge,
            statut,
            commentaire
        } = req.body;

        if(!id_utilisateur || !date_debut || !date_fin ) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires"
            })
        }

        const values = [
            id_utilisateur,
            date_debut,
            date_fin,
            type_conge,
            statut,
            commentaire
        ];

        const q = `INSERT INTO conges (
                        id_utilisateur, date_debut, 
                        date_fin, type_conge, statut, 
                        commentaire
                    )
                    VALUES (?,?,?,?,?,?)`;

                db.query(q, values, (error) => {
                    if(error) {
                        console.error(error)
                        return res.status(500).json({ message: "Erreur serveur lors de l'ajout de congé"})
                    }

                    res.status(201).json({
                        message: "Congé a été ajoutée avec succès."
                    });
                })

    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
}

exports.validateConge = async (req, res) => {
  try {
    const { id_conge, statut, validated_by } = req.body;

    if (!id_conge || !statut) {
      return res.status(400).json({ message: 'ID du congé et statut obligatoires.' });
    }

    if (!['VALIDE', 'REFUSE'].includes(statut)) {
      return res.status(400).json({ message: 'Statut invalide.' });
    }

    const validated_at = new Date();

    const sql = `
      UPDATE conges
      SET statut = ?, validated_by = ?, validated_at = ?
      WHERE id_conge = ?
    `;

    await query(sql, [statut, validated_by, validated_at, id_conge]);

    return res.status(200).json({ message: `Congé ${statut === 'VALIDE' ? 'validé' : 'refusé'} avec succès.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erreur serveur lors de la validation du congé.' });
  }
};

//Absence
exports.getAbsence = (req, res) => {
  const q = `
    SELECT 
        a.id_absence,
        a.date_debut,
        a.date_fin,
        a.commentaire,
        a.statut,
        a.created_at,
        u.nom AS utilisateur,
        u.prenom AS utilisateur_lastname,
        u2.nom AS created_name,
        u2.prenom AS created_lastname,
        t.libelle AS type_absence
    FROM absences a
    JOIN utilisateur u 
        ON u.id_utilisateur = a.id_utilisateur
    JOIN utilisateur u2 
        ON u2.id_utilisateur = a.created_by
    JOIN absence_types t 
        ON t.id_absence_type = a.id_absence_type
    ORDER BY a.created_at DESC;
  `;  

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des absences"
      });
    }
    return res.status(200).json(data);
  });
};

exports.getAbsenceType = (req, res) => {
  const q = `
    SELECT 
      *
    FROM absence_types
  `;

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des absences"
      });
    }
    return res.status(200).json(data);
  });
};

exports.postAbsence = (req, res) => {
  try {
    const {
      id_utilisateur,
      id_absence_type,
      date_debut,
      date_fin,
      commentaire,
      created_by
    } = req.body;

    if (
      !id_utilisateur ||
      !id_absence_type ||
      !date_debut ||
      !date_fin ||
      !created_by
    ) {
      return res.status(400).json({
        message: "Champs obligatoires manquants"
      });
    }

    if (new Date(date_fin) < new Date(date_debut)) {
      return res.status(400).json({
        message: "La date de fin doit être supérieure à la date de début"
      });
    }

    const q = `
      INSERT INTO absences (
        id_utilisateur,
        id_absence_type,
        date_debut,
        date_fin,
        commentaire,
        statut,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, 'PROPOSEE', ?)
    `;

    const values = [
      id_utilisateur,
      id_absence_type,
      date_debut,
      date_fin,
      commentaire || null,
      created_by
    ];

    db.query(q, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          message: "Erreur serveur lors de l'ajout de l'absence"
        });
      }

      return res.status(201).json({
        message: "Absence créée avec succès",
        id_absence: result.insertId
      });
    });

  } catch (error) {
    console.error("Erreur interne :", error);
    return res.status(500).json({
      message: "Erreur interne du serveur"
    });
  }
};

exports.putAbsenceValidation = async (req, res) => {
  try {
    const { id_absence, validated_by, decision } = req.body;

    if (!id_absence || !validated_by || !decision) {
      return res.status(400).json({
        message: "Champs obligatoires manquants (id_absence, validated_by, decision)"
      });
    }

    // 1️⃣ Récupération + verrouillage de l'absence
    const [absence] = await query(
      `SELECT * FROM absences WHERE id_absence = ? FOR UPDATE`,
      [id_absence]
    );

    if (!absence) {
      return res.status(404).json({ message: "Absence introuvable" });
    }

    if (absence.statut !== 'PROPOSEE') {
      return res.status(409).json({ message: "Cette absence a déjà été traitée" });
    }

    // 2️⃣ Mise à jour
    await query(
      `UPDATE absences
       SET statut = ?, 
           validated_by = ?, 
           validated_at = NOW()
       WHERE id_absence = ?`,
      [decision, validated_by, id_absence]
    );

    return res.status(200).json({
      message: `Absence ${decision === 'VALIDEE' ? 'validée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    console.error("Erreur validation absence :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la validation" });
  }
};
