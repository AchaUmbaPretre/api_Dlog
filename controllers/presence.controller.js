const { db } = require("./../config/database");
const moment = require("moment");
require('moment/locale/fr');
const bcrypt = require('bcryptjs');
const util = require("util");
const query = util.promisify(db.query).bind(db);
const { jourSemaineFR, formatDate, mapJourSemaineFR } = require("../utils/dateUtils.js");
const { auditPresence } = require("../utils/audit.js");
const WORK_DAY_HOURS = 8;
const HALF_DAY_HOURS = 4;
const INTERVAL_MS = 12 * 60 * 60 * 1000; // toutes les 12 heures

exports.getPresence = (req, res) => {
  try {
    const { startDate, endDate, site } = req.query;

    let conditions = [];
    let values = [];

    // ✅ Filtre période
    if (startDate && endDate) {
      conditions.push("p.date_presence BETWEEN ? AND ?");
      values.push(startDate, endDate);
    }

    // ✅ Filtre site
    if (site) {
      conditions.push("p.site_id = ?");
      values.push(site);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const q = `
      SELECT 
        p.id_presence, 
        p.date_presence, 
        p.heure_entree, 
        p.heure_sortie, 
        p.statut_jour, 
        u.nom, 
        s.nom_site 
      FROM presences p
      LEFT JOIN utilisateur u ON p.id_utilisateur = u.id_utilisateur
      LEFT JOIN sites s ON p.site_id = s.id_site
      ${whereClause}
      ORDER BY p.date_presence DESC
    `;

    db.query(q, values, (error, data) => {
      if (error) {
        return res.status(500).json({
          message: "Erreur lors de la récupération des présences",
          error
        });
      }
      return res.status(200).json(data);
    });

  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", err });
  }
};

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

/* exports.getPresencePlanning = async (req, res) => {
  try {
    const { month, year } = req.query;
    let { role, scope_sites = [], scope_departments = [], user_id } = req.abac || {};

    if (role === "Owner" || role === "Employé") {
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

    let usersQuery = `
      SELECT id_utilisateur, nom, prenom, id_departement
      FROM utilisateur
      WHERE 1=1
    `;
    const usersValues = [];

    if (role === "Owner" || role === "Employé" ) {
      usersQuery += " AND id_utilisateur = ?";
      usersValues.push(user_id);
    } else if (scope_departments.length) {
      usersQuery += ` AND id_departement IN (${scope_departments.map(() => "?").join(",")})`;
      usersValues.push(...scope_departments);
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
}; */

exports.getPresencePlanning = async (req, res) => {
  try {
    const { month, year, user_id: queryUserId } = req.query;
    const { role, scope_sites = [], scope_departments = [], user_id: abacUserId } = req.abac || {};

    // 🔹 Validation paramètres
    if (!month || !year) {
      return res.status(400).json({ message: "Paramètres month et year requis" });
    }

    const monthPadded = String(month).padStart(2, "0");
    const debut = `${year}-${monthPadded}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

    // 🔹 Déterminer l'utilisateur ciblé
    let userId = abacUserId;
    if (role === "Owner" || role === "Employé") {
      if (!queryUserId) {
        return res.status(400).json({ message: `${role} doit fournir son user_id dans la query` });
      }
      userId = parseInt(queryUserId, 10);
    }

    let usersQuery = `SELECT DISTINCT u.id_utilisateur, u.nom, u.prenom, u.id_departement FROM utilisateur u`;
    const usersValues = [];
    const userWhere = [];

    if (role === "Owner" || role === "Employé") {
      userWhere.push("u.id_utilisateur = ?");
      usersValues.push(userId);
    } else if (role === "RH" || role === "RS") {
      if (!scope_departments?.length) {
        return res.status(403).json({ message: `${role} doit avoir au moins un département assigné` });
      }
      userWhere.push(`u.id_departement IN (${scope_departments.map(() => "?").join(",")})`);
      usersValues.push(...scope_departments);
    } else if (role === "Manager") {
      if (!scope_departments?.length && !scope_sites?.length) {
        return res.status(403).json({ message: "Manager doit avoir au moins un site ou département assigné" });
      }

      if (scope_departments?.length) {
        userWhere.push(`u.id_departement IN (${scope_departments.map(() => "?").join(",")})`);
        usersValues.push(...scope_departments);
      }

      if (scope_sites?.length) {
        usersQuery += ` JOIN user_sites us ON us.user_id = u.id_utilisateur`;
        userWhere.push(`us.site_id IN (${scope_sites.map(() => "?").join(",")})`);
        usersValues.push(...scope_sites);
      }
    }

    // Admin et Sécurité = pas de filtre
    if (userWhere.length) {
      usersQuery += " WHERE " + userWhere.join(" OR ");
    }

    const users = await query(usersQuery, usersValues);

    if (users.length === 0) {
      return res.json({ month: Number(month), year: Number(year), dates: [], utilisateurs: [] });
    }

    // 🔹 2️⃣ Génération dates du mois
    const datesRaw = await query(
      `SELECT DATE(?) + INTERVAL n DAY AS date
       FROM (
         SELECT a.a + b.a * 10 AS n
         FROM (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
               UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
         CROSS JOIN (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
       ) numbers
       WHERE DATE(?) + INTERVAL n DAY <= ?
       ORDER BY DATE(?) + INTERVAL n DAY`,
      [debut, debut, fin, debut]
    );

    // 🔹 3️⃣ Jours fériés et non travaillés
    const [joursFeries, joursNonTrav] = await Promise.all([
      query(`SELECT date_ferie FROM jours_feries`),
      query(`SELECT jour_semaine FROM jours_non_travailles`)
    ]);

    // 🔹 4️⃣ Présences
    let presQuery = `SELECT id_presence, id_utilisateur, date_presence, heure_entree, heure_sortie, site_id
                     FROM presences
                     WHERE date_presence BETWEEN ? AND ?`;
    const presValues = [debut, fin];

    if (role === "Owner" || role === "Employé") {
      presQuery += " AND id_utilisateur = ?";
      presValues.push(userId);
    } else {
      // Pour Manager/RH/RS/Admin: toutes les présences des utilisateurs filtrés
      const userIds = users.map(u => u.id_utilisateur);
      presQuery += ` AND id_utilisateur IN (${userIds.map(() => "?").join(",")})`;
      presValues.push(...userIds);
    }

    const presences = await query(presQuery, presValues);

    // 🔹 Ajustements
    const adjustments = await query(
      `SELECT a.id_presence, a.type, a.nouvelle_valeur, a.statut,
              p.id_utilisateur, p.date_presence
       FROM attendance_adjustments a
       JOIN presences p ON p.id_presence = a.id_presence
       WHERE p.date_presence BETWEEN ? AND ?`,
      [debut, fin]
    );

    const adjustmentsMap = {};
    adjustments.forEach(a => {
      adjustmentsMap[`${a.id_utilisateur}_${formatDate(a.date_presence)}`] = a;
    });

    // 🔹 Congés validés
    const conges = await query(
      `SELECT id_utilisateur, date_debut, date_fin
       FROM conges
       WHERE statut = 'VALIDE'
         AND date_debut <= ?
         AND date_fin >= ?`,
      [fin, debut]
    );

    const congesList = conges.map(c => ({
      id: c.id_utilisateur,
      debut: formatDate(c.date_debut),
      fin: formatDate(c.date_fin)
    }));

    // 🔹 Mapping présences par utilisateur/date
    const presMapByUserDate = {};
    presences.forEach(p => {
      const key = `${p.id_utilisateur}_${formatDate(p.date_presence)}`;
      const adj = adjustmentsMap[key];

      
      presMapByUserDate[key] = {
        statut: p.statut_jour || (p.heure_entree || p.heure_sortie ? "PRESENT" : "ABSENT"),
        heure_entree: p.heure_entree,
        heure_sortie: p.heure_sortie,
        id_presence: p.id_presence,
        adjustment_statut: adj?.statut || null,
        adjustment_type: adj?.type || null,
        auto_generated: p.statut_jour === "ABSENT" && !p.heure_entree
      };

    });

    // 🔹 Construction dates avec statut
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);
      let statutJour = "TRAVAIL";
      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) statutJour = "FERIE";
      else if (joursNonTrav.some(j => j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase()))
        statutJour = "NON_TRAVAILLE";

      return {
        date: dateKey,
        label: `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`,
        statutJour
      };
    });

    // 🔹 Construction planning final
    const utilisateurs = users.map(u => {
      const presencesByDate = {};
      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin);

        if (cong) presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
        else if (presMapByUserDate[key]) {
          const base = { ...presMapByUserDate[key] };
          const adj = adjustmentsMap[key];
          if (adj?.statut === "VALIDE") {
            if (adj.type === "RETARD_JUSTIFIE") base.retard_justifie = true;
            if (adj.type === "CORRECTION_HEURE") base.heure_entree = adj.nouvelle_valeur;
            if (adj.type === "AUTORISATION_SORTIE") base.autorisation_sortie = true;
          }
          presencesByDate[d.date] = base;
        } else if (d.statutJour === "FERIE") presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        else if (d.statutJour === "NON_TRAVAILLE") presencesByDate[d.date] = { statut: "NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        else presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
      });

      return { id_utilisateur: u.id_utilisateur, nom: u.nom, prenom: u.prenom, presences: presencesByDate };
    });

    res.json({ month: Number(month), year: Number(year), dates, utilisateurs });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({ message: "Erreur serveur planning" });
  }
};

/* exports.getMonthlyPresenceReport = async (req, res) => {
  try {
    const { month, year, site } = req.query || {};

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
}; */

exports.getMonthlyPresenceReport = async (req, res) => {
  try {
    const { month, year, site } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: "month et year requis" });
    }

    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);

    if (isNaN(monthInt) || isNaN(yearInt)) {
      return res.status(400).json({ message: "month ou year invalide" });
    }

    const startDate = moment(
      `${yearInt}-${monthInt.toString().padStart(2, "0")}-01`,
      "YYYY-MM-DD"
    ).startOf("month").format("YYYY-MM-DD");

    const endDate = moment(startDate).endOf("month").format("YYYY-MM-DD");

    let usersSql = `
      SELECT u.id_utilisateur, u.nom
      FROM utilisateur u
    `;
    const usersParams = [];

    if (site) {
      usersSql += `
        JOIN user_sites us ON us.user_id = u.id_utilisateur
        WHERE us.site_id = ?
      `;
      usersParams.push(site);
    }

    usersSql += ` ORDER BY u.nom`;

    const users = await query(usersSql, usersParams);

    if (users.length === 0) {
      return res.json({
        startDate,
        endDate,
        dates: [],
        report: []
      });
    }

    /* ======================================================
       2️⃣ PRÉSENCES (filtrées par site si fourni)
    ====================================================== */
    let presencesSql = `
      SELECT p.id_utilisateur, p.date_presence, p.heure_entree,
             p.heure_sortie, p.heures_supplementaires, p.retard_minutes
      FROM presences p
    `;
    const presParams = [];

    if (site) {
      presencesSql += `
        JOIN user_sites us ON us.user_id = p.id_utilisateur
        WHERE us.site_id = ?
          AND p.date_presence BETWEEN ? AND ?
      `;
      presParams.push(site, startDate, endDate);
    } else {
      presencesSql += `
        WHERE p.date_presence BETWEEN ? AND ?
      `;
      presParams.push(startDate, endDate);
    }

    const presences = await query(presencesSql, presParams);

    let congesSql = `
      SELECT c.id_utilisateur, c.date_debut, c.date_fin
      FROM conges c
    `;
    const congesParams = [];

    if (site) {
      congesSql += `
        JOIN user_sites us ON us.user_id = c.id_utilisateur
        WHERE us.site_id = ?
          AND c.statut = 'VALIDE'
          AND c.date_fin >= ?
          AND c.date_debut <= ?
      `;
      congesParams.push(site, startDate, endDate);
    } else {
      congesSql += `
        WHERE c.statut = 'VALIDE'
          AND c.date_fin >= ?
          AND c.date_debut <= ?
      `;
      congesParams.push(startDate, endDate);
    }

    const conges = await query(congesSql, congesParams);

    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);
    const joursNonTravSet = new Set(
      joursNonTrav.map(j => mapJourSemaineFR[j.jour_semaine.toLowerCase()])
    );

    const presencesMap = new Map();
    presences.forEach(p => {
      presencesMap.set(
        `${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`,
        p
      );
    });

    const congesMap = new Map();
    conges.forEach(c => {
      if (!congesMap.has(c.id_utilisateur)) congesMap.set(c.id_utilisateur, []);
      congesMap.get(c.id_utilisateur).push({
        debut: moment(c.date_debut),
        fin: moment(c.date_fin)
      });
    });

    const joursFeriesSet = new Set(
      joursFeries.map(j => moment(j.date_ferie).format("YYYY-MM-DD"))
    );

    /* ======================================================
       7️⃣ DATES DU MOIS
    ====================================================== */
    const dates = [];
    let d = moment(startDate);
    while (d.isSameOrBefore(endDate)) {
      dates.push(d.format("YYYY-MM-DD"));
      d.add(1, "day");
    }

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
        const dayOfWeek = moment(dateStr).day();
        const pKey = `${u.id_utilisateur}_${dateStr}`;

        const isFerie = joursFeriesSet.has(dateStr);
        const isNonTrav = joursNonTravSet.has(dayOfWeek);
        const isConge =
          congesMap.has(u.id_utilisateur) &&
          congesMap.get(u.id_utilisateur)
            .some(c => moment(dateStr).isBetween(c.debut, c.fin, null, "[]"));

        if (presencesMap.has(pKey)) {
          statut = "PRESENT";
          joursTravailles++;
          const p = presencesMap.get(pKey);
          heuresSupp += Number(p.heures_supplementaires || 0);
          retards += Number(p.retard_minutes || 0);
        } else if (isConge) {
          statut = "CONGE";
          congesPayes++;
        } else if (isFerie) {
          statut = "FERIE";
          joursFerie++;
        } else if (isNonTrav) {
          statut = "NON_TRAVAILLE";
          nonTravaille++;
        } else {
          absences++;
        }

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
    console.error("Erreur getMonthlyPresenceReport:", err);
    res.status(500).json({
      message: "Erreur serveur lors de la génération du rapport mensuel"
    });
  }
};

exports.getLateEarlyLeaveReport = async (req, res) => {
  try {
    let { startDate, endDate, site } = req.query;

    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    }

    let sql = `
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
           AND p.heure_sortie IS NOT NULL
           AND TIME(p.heure_sortie) < '16:00:00'
            THEN 'Retard + Départ anticipé'
          WHEN p.retard_minutes > 0
            THEN 'Retard'
          WHEN p.heure_sortie IS NOT NULL
           AND TIME(p.heure_sortie) < '16:00:00'
            THEN 'Départ anticipé'
          WHEN p.heures_supplementaires > 0
            THEN 'Heures supplémentaires'
          ELSE 'Ponctuel'
        END AS commentaire

      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
    `;

    const params = [];

    if (site) {
      sql += `
        JOIN user_sites us ON us.user_id = u.id_utilisateur
        WHERE us.site_id = ?
          AND p.date_presence BETWEEN ? AND ?
      `;
      params.push(site, startDate, endDate);
    } else {
      sql += `
        WHERE p.date_presence BETWEEN ? AND ?
      `;
      params.push(startDate, endDate);
    }

    sql += `
      ORDER BY p.date_presence, u.nom
    `;

    const data = await query(sql, params);

    res.json({
      startDate,
      endDate,
      site: site || null,
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
      datetime,
      source = "MANUEL",
      device_sn,
      terminal_id,
      permissions = [],
    } = req.body;

    // 🔹 Récupérer user_id pour audit de façon sécurisée
    const actingUserId = req.abac?.user_id || 0;

    // 0️⃣ Vérification RBAC
    if (!permissions.includes("attendance.events.approve")) {
      return res.status(403).json({ message: "Permission refusée" });
    }

    if (!id_utilisateur || !date_presence) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const dateISO = moment(date_presence).format("YYYY-MM-DD");
    const heurePointage = datetime
      ? moment(datetime)
      : moment(`${dateISO} ${moment().format("HH:mm:ss")}`, "YYYY-MM-DD HH:mm:ss");

    // 1️⃣ Vérification terminal (si fourni)
    let terminal = null;
    if (terminal_id) {
      const terminals = await query(
        `SELECT usage_mode, is_enabled, site_id, ip_address
         FROM terminals 
         WHERE id_terminal = ?`,
        [terminal_id]
      );

      if (!terminals?.length || !terminals[0].is_enabled) {
        return res.status(403).json({ message: "Terminal désactivé ou inconnu" });
      }

      terminal = terminals[0];

      if (!["ATTENDANCE", "BOTH"].includes(terminal.usage_mode)) {
        return res.status(403).json({ message: "Terminal non autorisé pour pointage RH" });
      }

      if (!req.abac?.scope_sites.includes(terminal.site_id)) {
        return res.status(403).json({ message: "Vous n'avez pas accès à ce site" });
      }
    }

    // 1️⃣a Déterminer site_id
    const siteUser = await query(
      `SELECT site_id FROM user_sites WHERE user_id = ?`,
      [id_utilisateur]
    );
    const site_id = siteUser[0]?.site_id || terminal?.site_id || null;

    // 2️⃣ Vérifier jours non travaillés / fériés
    const jourFR = jourSemaineFR(dateISO);

    const nonTravailleRows = await query(
      `SELECT 1 FROM jours_non_travailles WHERE jour_semaine = ?`,
      [jourFR]
    );
    if (nonTravailleRows?.length) {
      return res.status(403).json({ message: `Pointage interdit : ${jourFR} non travaillé` });
    }

    const ferieRows = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (ferieRows?.length) {
      return res.status(403).json({ message: "Pointage interdit : jour férié" });
    }

    const absenceRows = await query(
      `
      SELECT 
        a.id_absence,
        t.code,
        a.date_debut,
        a.date_fin,
        DATEDIFF(a.date_fin, a.date_debut) + 1 AS nb_jours
      FROM absences a
      JOIN absence_types t ON t.id_absence_type = a.id_absence_type
      WHERE a.id_utilisateur = ?
        AND a.statut = 'VALIDEE'
        AND ? BETWEEN a.date_debut AND a.date_fin
      `,
      [id_utilisateur, dateISO]
    );

    if (absenceRows?.length) {
      const absence = absenceRows[0];

      const dateDebut = moment(absence.date_debut).format('DD/MM/YYYY');
      const dateFin = moment(absence.date_fin).format('DD/MM/YYYY');

      return res.status(403).json({
        message: `Pointage interdit : absence validée (${absence.code}) pour ${absence.nb_jours} jour(s), du ${dateDebut} au ${dateFin}.`,
        code: 'ABSENCE_VALIDEE',
        details: {
          type: absence.code,
          date_debut: dateDebut,
          date_fin: dateFin,
          nb_jours: absence.nb_jours
        }
      });
    }

    // 3️⃣ Vérifier présence existante
    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked, statut_jour
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ? LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    let presence = presenceRows?.[0] || null;

    // 4️⃣ Blocage si NON_TRAVAILLE / FERIE
    if (presence?.statut_jour === "NON_TRAVAILLE" || presence?.statut_jour === "FERIE") {
      return res.status(403).json({ message: `Pointage impossible : jour ${presence.statut_jour}` });
    }

    const debutTravail = moment(`${dateISO} 08:00:00`);
    const finTravail = moment(`${dateISO} 16:00:00`);

    // 5️⃣ Corriger ABSENT → PRESENT
    if (presence?.statut_jour === "ABSENT") {
      let retard_minutes = 0;
      if (heurePointage.isAfter(debutTravail)) {
        retard_minutes = heurePointage.diff(debutTravail, "minutes");
      }

      await query(
        `UPDATE presences 
         SET heure_entree = ?, statut_jour = 'PRESENT', retard_minutes = ?, source = ?, terminal_id = ?, device_sn = ?
         WHERE id_presence = ?`,
        [
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          source,
          terminal_id || null,
          device_sn || null,
          presence.id_presence,
        ]
      );

      await auditPresence({
        user_id: actingUserId,
        action: "UPDATE_ENTRY_FROM_ABSENT",
        entity: "presences",
        entity_id: presence.id_presence,
        old_value: presence,
        new_value: {
          id_utilisateur,
          date_presence: dateISO,
          heure_entree: heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          statut_jour: "PRESENT",
          retard_minutes,
        },
        ip_address: terminal?.ip_address || null,
      });

      return res.status(200).json({ message: "ABSENT corrigé en PRESENT", retard_minutes });
    }

    // 6️⃣ Créer entrée si pas encore pointé
    if (!presence) {
      let retard_minutes = 0;
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
          site_id,
          dateISO,
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          0,
          source,
          terminal_id || null,
          device_sn || null,
        ]
      );

      await auditPresence({
        user_id: actingUserId,
        action: "CREATE_ENTRY",
        entity: "presences",
        entity_id: result.insertId,
        old_value: null,
        new_value: {
          id_utilisateur,
          date_presence: dateISO,
          heure_entree: heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          terminal_id: terminal_id || null,
          device_sn,
        },
        ip_address: terminal?.ip_address || null,
      });

      return res.status(201).json({ message: "Entrée enregistrée", retard_minutes });
    }

    // 7️⃣ Gestion sortie
    if (!presence.heure_sortie) {
      const autorisationRows = await query(
        `SELECT 1 FROM attendance_adjustments
         WHERE id_presence = ? AND type = 'AUTORISATION_SORTIE' AND statut = 'VALIDE'`,
        [presence.id_presence]
      );
      const autorisation = autorisationRows?.length > 0;

      if (heurePointage.isBefore(finTravail) && !autorisation) {
        return res.status(403).json({ message: "Sortie anticipée non autorisée" });
      }

      let heures_supplementaires = 0;
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

    return res.status(409).json({ message: "Présence déjà complète pour cette date" });
  } catch (error) {
    console.error("Erreur postPresence :", error);
    return res.status(500).json({ message: "Erreur interne du serveur" });
  }
};

/* exports.postPresenceBiometrique = async (req, res) => {
  try {
    const { id_utilisateur, datetime, device_sn } = req.body;

    const date = datetime.split(" ")[0];
    const heure = datetime;

    const exist = await query(`
      SELECT id_presence, heure_entree
      FROM presences
      WHERE id_utilisateur = ? AND date_presence = ?
      LIMIT 1
    `, [id_utilisateur, date]);

    if (exist.length === 0) {
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
}; */

exports.postPresenceFromHikvision = async (req, res) => {
  try {
    const { device_sn, user_code, datetime, terminal_id } = req.body;
    const terminal = terminal_id; // injecté par middleware

    if (!device_sn || !user_code || !datetime) {
      return res.status(400).json({
        message: "device_sn, user_code et datetime requis"
      });
    }

    const users = await query(
      `SELECT id_utilisateur
       FROM utilisateur
       WHERE matricule = ?`,
      [user_code]
    );

    if (!users.length) {
      return res.status(404).json({
        message: "Utilisateur inconnu"
      });
    }

    const id_utilisateur = users[0].id_utilisateur;
    const dateISO = moment(datetime).format("YYYY-MM-DD");
    const heurePointage = moment(datetime);

    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    const presence = presenceRows.length ? presenceRows[0] : null;

    if (presence?.is_locked) {
      return res.status(403).json({
        message: "Présence verrouillée"
      });
    }

    const debutTravail = moment(`${dateISO} 08:00:00`);
    const finTravail   = moment(`${dateISO} 16:00:00`);

    if (!presence) {
      const retard_minutes = heurePointage.isAfter(debutTravail)
        ? heurePointage.diff(debutTravail, "minutes")
        : 0;

      await query(
        `INSERT INTO presences (
          id_utilisateur, site_id, date_presence,
          heure_entree, retard_minutes,
          source, terminal_id, device_sn
        ) VALUES (?, ?, ?, ?, ?, 'API', ?, ?)`,
        [
          id_utilisateur,
          terminal.site_id,
          dateISO,
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          terminal.id_terminal,
          device_sn
        ]
      );

      return res.status(201).json({
        message: "Entrée enregistrée",
        retard_minutes
      });
    }

    /* ===============================
       4️⃣ SORTIE
    =============================== */
    if (!presence.heure_sortie) {
      let heures_supplementaires = 0;

      if (heurePointage.isAfter(finTravail)) {
        heures_supplementaires =
          heurePointage.diff(finTravail, "minutes") / 60;
      }

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

      return res.status(200).json({
        message: "Sortie enregistrée",
        heures_supplementaires
      });
    }

    /* ===============================
       5️⃣ DÉJÀ COMPLET
    =============================== */
    return res.status(409).json({
      message: "Présence déjà complète"
    });

  } catch (error) {
    console.error("postPresenceFromHikvision:", error);
    return res.status(500).json({
      message: "Erreur interne serveur"
    });
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

/* exports.getPresenceDashboard = async (req, res) => {
  try {
    // Requête KPI
    const kpiPromise = query(`
      SELECT
        COUNT(*) AS total,
        SUM(statut_jour = 'PRESENT') AS presents,
        SUM(statut_jour = 'ABSENT') AS absents,
        SUM(retard_minutes > 0) AS retards
      FROM presences
      WHERE date_presence = CURDATE()
    `);

    // Répartition par statut (Pie Chart)
    const statutsPromise = query(`
      SELECT statut_jour AS label, COUNT(*) AS value
      FROM presences
      WHERE date_presence = CURDATE()
      GROUP BY statut_jour
    `);

    // Présence sur 7 jours (Line Chart)
    const evolutionPromise = query(`
      SELECT 
        date_presence AS date,
        SUM(statut_jour = 'PRESENT') AS presents,
        SUM(statut_jour = 'ABSENT') AS absents
      FROM presences
      WHERE date_presence >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY date_presence
      ORDER BY date_presence
    `);

    // Liste des employés aujourd'hui
    const employesPromise = query(`
      SELECT 
        u.nom,
        p.statut_jour,
        p.heure_entree,
        p.heure_sortie,
        CASE
          WHEN p.retard_minutes > 0 THEN 'RETARD'
          WHEN p.statut_jour = 'PRESENT' THEN 'A L_HEURE'
          ELSE p.statut_jour
        END AS statut_affiche
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence = CURDATE()
      ORDER BY p.heure_entree ASC
    `);

    // Top absences (30 derniers jours)
    const topAbsencesPromise = query(`
      SELECT 
        u.nom,
        COUNT(*) AS total_absences
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')
        AND p.date_presence >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY p.id_utilisateur
      ORDER BY total_absences DESC
      LIMIT 5
    `);

    // Exécution parallèle
    const [
      kpiRows,
      statutsRows,
      evolutionRows,
      employesRows,
      topAbsencesRows
    ] = await Promise.all([
      kpiPromise,
      statutsPromise,
      evolutionPromise,
      employesPromise,
      topAbsencesPromise
    ]);

    res.json({
      success: true,
      data: {
        kpi: kpiRows[0],
        statuts: statutsRows,
        evolution: evolutionRows,
        employes: employesRows,
        topAbsences: topAbsencesRows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur chargement dashboard présence'
    });
  }
}; */

exports.getPresenceDashboard = async (req, res) => {
  try {
    // KPI + métriques avancées
    const kpiPromise = query(`
      SELECT
        COUNT(*) AS total,
        SUM(statut_jour = 'PRESENT') AS presents,
        SUM(statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')) AS absences_totales,
        SUM(retard_minutes > 0) AS retards,
        ROUND(
          (SUM(statut_jour = 'PRESENT') / NULLIF(COUNT(*), 0)) * 100,
          2
        ) AS taux_presence,
        ROUND(
          AVG(CASE WHEN retard_minutes > 0 THEN retard_minutes END),
          2
        ) AS retard_moyen
      FROM presences
      WHERE date_presence = CURDATE()
    `);

    // Répartition par statut (Pie Chart)
    const statutsPromise = query(`
      SELECT statut_jour AS label, COUNT(*) AS value
      FROM presences
      WHERE date_presence = CURDATE()
      GROUP BY statut_jour
    `);

    // Évolution sur 7 jours (Line Chart)
    const evolutionPromise = query(`
      SELECT 
        date_presence AS date,
        SUM(statut_jour = 'PRESENT') AS presents,
        SUM(statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')) AS absents
      FROM presences
      WHERE date_presence >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY date_presence
      ORDER BY date_presence
    `);

    // Liste des employés du jour
    const employesPromise = query(`
      SELECT 
        u.nom,
        p.statut_jour,
        p.heure_entree,
        p.heure_sortie,
        p.retard_minutes,
        CASE
          WHEN p.retard_minutes > 0 THEN 'RETARD'
          WHEN p.statut_jour = 'PRESENT' THEN 'A_L_HEURE'
          ELSE p.statut_jour
        END AS statut_affiche
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence = CURDATE()
      ORDER BY p.heure_entree ASC
    `);

    // Top absences (30 derniers jours)
    const topAbsencesPromise = query(`
      SELECT 
        u.nom,
        COUNT(*) AS total_absences
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')
        AND p.date_presence >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY p.id_utilisateur
      ORDER BY total_absences DESC
      LIMIT 5
    `);

    const [
      kpiRows,
      statutsRows,
      evolutionRows,
      employesRows,
      topAbsencesRows
    ] = await Promise.all([
      kpiPromise,
      statutsPromise,
      evolutionPromise,
      employesPromise,
      topAbsencesPromise
    ]);

    res.json({
      success: true,
      data: {
        kpi: {
          total: kpiRows[0].total,
          presents: kpiRows[0].presents,
          absencesTotales: kpiRows[0].absences_totales,
          retards: kpiRows[0].retards,
          tauxPresence: kpiRows[0].taux_presence,      // %
          retardMoyen: kpiRows[0].retard_moyen          // minutes
        },
        statuts: statutsRows,
        evolution: evolutionRows,
        employes: employesRows,
        topAbsences: topAbsencesRows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur chargement dashboard présence'
    });
  }
};


//Congé
exports.getConge = async (req, res) => {
  try {
    const { role, scope_departments = [], user_id } = req.abac || {};

    let queryStr = `
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
      WHERE 1=1
    `;

    const queryValues = [];

    // 🔹 Owner : ne voir que ses congés
    if (role === "Owner") {
      queryStr += " AND c.id_utilisateur = ?";
      queryValues.push(user_id);
    } else if (scope_departments.length) {
      // 🔹 Manager/HR : filtrer par département
      queryStr += ` AND u.id_departement IN (${scope_departments.map(() => "?").join(",")})`;
      queryValues.push(...scope_departments);
    }

    const data = await query(queryStr, queryValues);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Erreur getConge :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des congés.",
      error
    });
  }
};

exports.postConge = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_debut,
      date_fin,
      type_conge,
      statut = 'EN_ATTENTE',
      commentaire,
      permissions = [],
      scope_sites = []
    } = req.body;

    // ===============================
    // 0️⃣ RBAC – vérification des permissions depuis JWT
    // ===============================
    if (!permissions.includes('attendance.events.read')) {
      return res.status(403).json({ message: "Permission refusée" });
    }

    // ===============================
    // 1️⃣ Validation des champs obligatoires
    // ===============================
    if (!id_utilisateur || !date_debut || !date_fin || !type_conge) {
      return res.status(400).json({
        message: "Champs obligatoires manquants"
      });
    }

    // ===============================
    // 2️⃣ Vérification du scope site
    // ===============================
    const siteUser = await query(
      `SELECT site_id FROM user_sites WHERE user_id = ?`,
      [id_utilisateur]
    );

    const site_id = siteUser[0]?.site_id;
    if (scope_sites?.length && !scope_sites.includes(site_id)) {
      return res.status(403).json({ message: "Accès refusé (scope site)" });
    }

    // ===============================
    // 3️⃣ Insertion du congé
    // ===============================
    const result = await query(
      `INSERT INTO conges (
        id_utilisateur,
        date_debut,
        date_fin,
        type_conge,
        statut,
        commentaire,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_utilisateur,
        date_debut,
        date_fin,
        type_conge,
        statut,
        commentaire,
        req.abac?.user_id || null
      ]
    );

    const insertedId = result.insertId;

    // ===============================
    // 4️⃣ Audit log
    // ===============================
    await query(
      `INSERT INTO audit_logs_presence
       (user_id, action, entity, entity_id, new_value)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.abac?.user_id || id_utilisateur,
        'CREATE_CONGE',
        'conges',
        insertedId,
        JSON.stringify(req.body)
      ]
    );

    // ===============================
    // 5️⃣ Réponse
    // ===============================
    return res.status(201).json({
      success: true,
      message: "Congé ajouté avec succès",
      id_conge: insertedId
    });

  } catch (error) {
    console.error("Erreur postConge :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message
    });
  }
};

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
/* exports.getAbsence = async (req, res) => {
  try {
    const { role, scope_departments = [], user_id } = req.abac || {};

    let queryStr = `
      SELECT 
          a.id_absence,
          a.id_utilisateur,
          a.date_debut,
          a.date_fin,
          a.commentaire,
          a.statut,
          a.created_at,
          u.nom AS utilisateur,
          u.prenom AS utilisateur_lastname,
          u2.nom AS created_name,
          u2.prenom AS created_lastname,
          u3.nom AS validated_name,
          t.libelle AS type_absence
      FROM absences a
      JOIN utilisateur u ON u.id_utilisateur = a.id_utilisateur
      JOIN utilisateur u2 ON u2.id_utilisateur = a.created_by
      LEFT JOIN utilisateur u3 ON u3.id_utilisateur = a.validated_by
      JOIN absence_types t ON t.id_absence_type = a.id_absence_type
      WHERE 1=1
    `;

    const queryValues = [];

    if (role === "Owner") {
      queryStr += " AND a.id_utilisateur = ?";
      queryValues.push(user_id);
    } else if (scope_departments.length) {
      queryStr += ` AND u.id_departement IN (${scope_departments.map(() => "?").join(",")})`;
      queryValues.push(...scope_departments);
    }

    queryStr += " ORDER BY a.created_at DESC";

    const data = await query(queryStr, queryValues);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Erreur getAbsence :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des absences.",
      error
    });
  }
}; */

/* exports.getAbsence = async (req, res) => {
  try {
    const { role, scope_departments = [], user_id } = req.abac || {};

    let queryStr = `
      SELECT 
        a.id_absence,
        a.id_utilisateur,
        a.date_debut,
        a.date_fin,
        a.commentaire,
        a.statut,
        a.created_at,

        u.nom AS utilisateur,
        u.prenom AS utilisateur_lastname,

        u2.nom AS created_name,
        u2.prenom AS created_lastname,

        u3.nom AS validated_name,

        t.libelle AS type_absence,

        -- 📊 KPI calculés
        DATEDIFF(a.date_fin, a.date_debut) + 1 AS nb_jours_total,

        (
          SELECT COUNT(*)
          FROM jours_feries jf
          WHERE jf.date_ferie BETWEEN a.date_debut AND a.date_fin
        ) AS nb_jours_feries,

        (
          SELECT COUNT(*)
          FROM jours_non_travailles jnt
          WHERE jnt.jour_semaine IN (
            SELECT DAYNAME(DATE_ADD(a.date_debut, INTERVAL n DAY))
            FROM (
              SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
              UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
              UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
              UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
              UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
            ) numbers
            WHERE DATE_ADD(a.date_debut, INTERVAL n DAY) <= a.date_fin
          )
        ) AS nb_jours_non_travailles,

        (
          (DATEDIFF(a.date_fin, a.date_debut) + 1)
          -
          (
            SELECT COUNT(*)
            FROM jours_feries jf
            WHERE jf.date_ferie BETWEEN a.date_debut AND a.date_fin
          )
          -
          (
            SELECT COUNT(*)
            FROM jours_non_travailles jnt
            WHERE jnt.jour_semaine IN (
              SELECT DAYNAME(DATE_ADD(a.date_debut, INTERVAL n DAY))
              FROM (
                SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
                UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
                UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
                UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
                UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
              ) numbers
              WHERE DATE_ADD(a.date_debut, INTERVAL n DAY) <= a.date_fin
            )
          )
        ) AS nb_jours_absence_effective

      FROM absences a
      JOIN utilisateur u  ON u.id_utilisateur = a.id_utilisateur
      JOIN utilisateur u2 ON u2.id_utilisateur = a.created_by
      LEFT JOIN utilisateur u3 ON u3.id_utilisateur = a.validated_by
      JOIN absence_types t ON t.id_absence_type = a.id_absence_type
      WHERE 1=1
    `;

    const queryValues = [];

    if (role === "Owner") {
      queryStr += " AND a.id_utilisateur = ?";
      queryValues.push(user_id);
    } else if (scope_departments.length) {
      queryStr += ` AND u.id_departement IN (${scope_departments.map(() => "?").join(",")})`;
      queryValues.push(...scope_departments);
    }

    queryStr += " ORDER BY a.created_at DESC";

    const data = await query(queryStr, queryValues);

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error("Erreur getAbsence :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des absences."
    });
  }
}; */

exports.getAbsence = async (req, res) => {
  try {
    const { role, scope_departments = [], user_id } = req.abac || {};

    let queryStr = `
      SELECT 
        a.id_absence,
        a.id_utilisateur,
        a.date_debut,
        a.date_fin,
        a.commentaire,
        a.statut,
        a.created_at,

        u.nom AS utilisateur,
        u.prenom AS utilisateur_lastname,

        u2.nom AS created_name,
        u2.prenom AS created_lastname,

        u3.nom AS validated_name,
        t.libelle AS type_absence,

        -- KPI simples calculables directement
        DATEDIFF(a.date_fin, a.date_debut) + 1 AS nb_jours_total,

        (
          SELECT COUNT(*)
          FROM jours_feries jf
          WHERE jf.date_ferie BETWEEN a.date_debut AND a.date_fin
        ) AS nb_jours_feries

      FROM absences a
      JOIN utilisateur u  ON u.id_utilisateur = a.id_utilisateur
      JOIN utilisateur u2 ON u2.id_utilisateur = a.created_by
      LEFT JOIN utilisateur u3 ON u3.id_utilisateur = a.validated_by
      JOIN absence_types t ON t.id_absence_type = a.id_absence_type
      WHERE 1=1
    `;

    const queryValues = [];

    if (role === "Owner" || role === 'Employé') {
      queryStr += " AND a.id_utilisateur = ?";
      queryValues.push(user_id);
    } else if (scope_departments.length) {
      queryStr += ` AND u.id_departement IN (${scope_departments.map(() => "?").join(",")})`;
      queryValues.push(...scope_departments);
    }

    queryStr += " ORDER BY a.created_at DESC";

    const data = await query(queryStr, queryValues);

    // Calcul des jours non travaillés côté Node.js pour éviter l'erreur SQL
    const joursNonTravailles = await query("SELECT jour_semaine FROM jours_non_travailles");
    const joursNonTravaillesSet = new Set(joursNonTravailles.map(j => j.jour_semaine));

    const result = data.map(abs => {
      const start = new Date(abs.date_debut);
      const end = new Date(abs.date_fin);
      let nbJoursNonTravailles = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // DAYOFWEEK: 1 = dimanche, 2 = lundi, ..., 7 = samedi
        if (joursNonTravaillesSet.has(d.getDay() + 1)) {
          nbJoursNonTravailles++;
        }
      }

      abs.nb_jours_non_travailles = nbJoursNonTravailles;
      abs.nb_jours_absence_effective = abs.nb_jours_total - abs.nb_jours_feries - nbJoursNonTravailles;

      return abs;
    });

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error("Erreur getAbsence :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des absences.",
      error: error.message
    });
  }
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
        message: "Champs obligatoires manquants"
      });
    }

    await query('START TRANSACTION');

    // 1️⃣ Lock absence
    const [absence] = await query(
      `SELECT * FROM absences WHERE id_absence = ? FOR UPDATE`,
      [id_absence]
    );

    if (!absence) {
      await query('ROLLBACK');
      return res.status(404).json({ message: "Absence introuvable" });
    }

    if (absence.statut !== 'PROPOSEE') {
      await query('ROLLBACK');
      return res.status(409).json({ message: "Absence déjà traitée" });
    }

    // 2️⃣ Update absence
    await query(
      `UPDATE absences
       SET statut = ?, validated_by = ?, validated_at = NOW()
       WHERE id_absence = ?`,
      [decision, validated_by, id_absence]
    );

    // 3️⃣ Sync presences
    if (decision === 'VALIDEE') {
      await query(
        `
        INSERT INTO presences (
          id_utilisateur,
          date_presence,
          statut_jour,
          source,
          is_locked
        )
        SELECT 
          ?, d.date,
          'ABSENCE_JUSTIFIEE',
          'MANUEL',
          1
        FROM (
          SELECT DATE_ADD(?, INTERVAL n DAY) AS date
          FROM (
            SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
            UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
            UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
          ) numbers
          WHERE DATE_ADD(?, INTERVAL n DAY) <= ?
        ) d
        ON DUPLICATE KEY UPDATE
          statut_jour = 'ABSENCE_JUSTIFIEE',
          heure_entree = NULL,
          heure_sortie = NULL,
          retard_minutes = 0,
          heures_supplementaires = 0,
          source = 'MANUEL',
          is_locked = 1
        `,
        [
          absence.id_utilisateur,
          absence.date_debut,
          absence.date_debut,
          absence.date_fin
        ]
      );
    }

    await query('COMMIT');

    return res.status(200).json({
      message: `Absence ${decision === 'VALIDEE' ? 'validée' : 'rejetée'} avec succès`
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error("Erreur validation absence :", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la validation"
    });
  }
};

//Ferié
exports.getJourFerie = (req, res) => {
  const q = `
    SELECT 
      *
    FROM jours_feries
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

exports.postJourFerie = async (req, res) => {
  const { date_ferie, libelle, est_paye } = req.body;

  if (!date_ferie || !libelle) {
    return res.status(400).json({
      message: 'Date et libellé sont obligatoires',
    });
  }

  try {
    const [exists] = await query(
      'SELECT id_ferie FROM jours_feries WHERE date_ferie = ?',
      [date_ferie]
    );

    if (exists.length > 0) {
      return res.status(409).json({
        message: 'Un jour férié existe déjà pour cette date',
      });
    }

    await query(
      `INSERT INTO jours_feries (date_ferie, libelle, est_paye)
       VALUES (?, ?, ?)`,
      [date_ferie, libelle, est_paye ?? 1]
    );

    res.status(201).json({
      message: 'Jour férié créé avec succès',
    });

  } catch (error) {
    console.error('createJourFerie:', error);
    res.status(500).json({
      message: 'Erreur serveur',
    });
  }
};

//Horaire 
exports.getHoraire = (req, res) => {
  const q = `
    SELECT 
      *
    FROM horaire_travail
  `;

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des horaires."
      });
    }
    return res.status(200).json(data);
  });
};

exports.postHoraireUser = async (req, res) => {
  const { user_id, horaire_id, date_debut } = req.body;

  if (!user_id || !horaire_id || !date_debut) {
    return res.status(400).json({
      message: "Utilisateur, horaire et date de début sont obligatoires",
    });
  }

  try {
    // 1️⃣ Désactiver l’horaire actif existant
    await query(
      `
      UPDATE horaire_user
      SET actif = 0, date_fin = ?
      WHERE user_id = ? AND actif = 1
      `,
      [date_debut, user_id]
    );

    // 2️⃣ Insérer le nouvel horaire
    await query(
      `
      INSERT INTO horaire_user (user_id, horaire_id, date_debut, actif)
      VALUES (?, ?, ?, 1)
      `,
      [user_id, horaire_id, date_debut]
    );

    return res.status(201).json({
      message: "Horaire affecté à l’utilisateur avec succès",
    });

  } catch (error) {
    console.error("postHoraireUser:", error);
    return res.status(500).json({
      message: "Erreur serveur",
    });
  }
};


//Terminal
exports.getTerminal = (req, res) => {
  const q = `
    SELECT 
      t.*, s.nom_site
    FROM terminals t
    LEFT JOIN sites s ON t.site_id = s.id_site
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

exports.postTerminal = async (req, res) => {
  try {
    const {
      site_id,
      name,
      location_zone,
      device_model,
      device_sn,
      ip_address,
      port = 80,
      usage_mode = "ATTENDANCE",
      credentials
    } = req.body;

    if (!site_id || !name || !device_sn || !credentials) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    if (!["ATTENDANCE", "ACCESS_CONTROL", "BOTH"].includes(usage_mode)) {
      return res.status(400).json({ message: "usage_mode invalide" });
    }

    const existing = await query(
        "SELECT id_terminal FROM terminals WHERE device_sn = ?",
        [device_sn]
    );

    if (Array.isArray(existing) && existing.length > 0) {
    return res.status(409).json({ message: "Un terminal avec ce numéro de série existe déjà" });
    }

    const credentials_string = JSON.stringify(credentials);
    const credentials_encrypted = await bcrypt.hash(credentials_string, 10);

    const result = await query(
      `INSERT INTO terminals (
        site_id,
        name,
        location_zone,
        device_model,
        device_sn,
        ip_address,
        port,
        usage_mode,
        credentials_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        site_id,
        name,
        location_zone || null,
        device_model || null,
        device_sn,
        ip_address || null,
        port,
        usage_mode,
        credentials_encrypted
      ]
    );

    return res.status(201).json({
      message: "Terminal enregistré avec succès",
      terminal_id: result.insertId
    });

  } catch (error) {
    console.error("postTerminal error:", error);
    return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement du terminal" });
  }
};

//User Terminal
exports.getUserTerminal = (req, res) => {
  const q = `
    SELECT 
      ut.id, ut.user_id, ut.terminal_id, ut.can_read, ut.can_edit, ut.created_at, ut.updated_at,
      u.nom AS user_name,
      t.name AS terminal_name
    FROM user_terminals ut
    JOIN utilisateur u ON ut.user_id = u.id_utilisateur
    JOIN terminals t ON ut.terminal_id = t.id_terminal
  `;

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des associations utilisateur-terminal"
      });
    }
    return res.status(200).json(data);
  });
};

exports.getUserTerminal = (req, res) => {
  const q = `
    SELECT 
      ut.id, ut.user_id, ut.terminal_id, ut.can_read, ut.can_edit, ut.created_at, ut.updated_at,
      u.nom AS user_name,
      t.name AS terminal_name
    FROM user_terminals ut
    JOIN utilisateur u ON ut.user_id = u.id_utilisateur
    JOIN terminals t ON ut.terminal_id = t.id_terminal
  `;

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des associations utilisateur-terminal"
      });
    }
    return res.status(200).json(data);
  });
};

exports.getUserTerminalById = async (req, res) => {
  try {
    const { id_terminal } = req.query;

    if (!id_terminal) {
      return res.status(400).json({ message: "id_terminal est requis" });
    }

    const q = `
      SELECT ut.user_id, u.nom, u.email, u.role
      FROM user_terminals ut
      JOIN utilisateur u ON ut.user_id = u.id_utilisateur
      WHERE ut.terminal_id = ?
    `;

    db.query(q, [id_terminal], (error, data) => {
        if(error) {
          console.log(error)
        }
        return res.status(200).json(data );
    })
  } catch (error) {
    console.error("getUserTerminalById error:", error);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération des utilisateurs du terminal" });
  }
};

exports.postUserTerminal = async (req, res) => {
  try {
    const { user_id, terminal_id } = req.body;

    if (!user_id || !terminal_id) {
      return res.status(400).json({
        success: false,
        message: "user_id et terminal_id sont requis"
      });
    }

    const sql = `
      INSERT INTO user_terminals (user_id, terminal_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        user_id = user_id
    `;

    await query(sql, [user_id, terminal_id]);

    return res.status(201).json({
      success: true,
      message: "Accès au terminal accordé à l'utilisateur"
    });

  } catch (error) {
    console.error('[postUserTerminal]', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'association utilisateur-terminal"
    });
  }
};

exports.deleteUserTerminal = async (req, res) => {
  try {
    const { user_id, terminal_id } = req.query;

    if (!user_id || !terminal_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id et terminal_id sont requis'
      });
    }

    await query(
      'DELETE FROM user_terminals WHERE user_id = ? AND terminal_id = ?',
      [user_id, terminal_id]
    );

    return res.status(200).json({
      success: true,
      message: "Accès au terminal supprimé"
    });

  } catch (error) {
    console.error('[deleteUserTerminal]', error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la suppression"
    });
  }
};

const cronDailyAttendance = async () => {
  console.log('[CRON] Daily attendance started');

  const today = moment().format('YYYY-MM-DD');
  const todayFR = moment().locale('fr').format('dddd');

  try {
    /* =====================================================
       1️⃣ Ignorer jours fériés
    ===================================================== */
    const ferie = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ? LIMIT 1`,
      [today]
    );
    if (ferie.length) {
      console.log('[CRON] Jour férié – aucun traitement');
      return;
    }

    /* =====================================================
       2️⃣ Ignorer jours non travaillés
    ===================================================== */
    const nonTravaille = await query(
      `SELECT 1 FROM jours_non_travailles WHERE jour_semaine = ? LIMIT 1`,
      [todayFR]
    );
    if (nonTravaille.length) {
      console.log('[CRON] Jour non travaillé – aucun traitement');
      return;
    }

    /* =====================================================
       3️⃣ Mettre à jour présences incomplètes ou absentes
       ✅ Ne jamais écraser les vrais PRESENT complets
    ===================================================== */
    await query(
      `
      UPDATE presences
      SET
        statut_jour = CASE
          WHEN heure_entree IS NULL THEN 'ABSENT'
          WHEN heure_sortie IS NULL THEN 'ABSENT'
          WHEN TIMESTAMPDIFF(MINUTE, heure_entree, heure_sortie) >= ? THEN 'PRESENT'
          WHEN TIMESTAMPDIFF(MINUTE, heure_entree, heure_sortie) >= ? THEN 'ABSENCE_JUSTIFIEE'
          ELSE 'ABSENT'
        END
      WHERE date_presence = ?
        AND statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')
    `,
      [WORK_DAY_HOURS * 60, HALF_DAY_HOURS * 60, today]
    );

    /* =====================================================
       4️⃣ Créer absents pour utilisateurs non pointés
    ===================================================== */
    /* =====================================================
   4️⃣ Créer absents pour utilisateurs non pointés
===================================================== */
    const result = await query(
      `
      INSERT INTO presences (
        id_utilisateur,
        site_id,
        date_presence,
        statut_jour,
        source,
        created_at
      )
      SELECT
        u.id_utilisateur,
        us.site_id,
        ?,
        'ABSENT',
        'SYSTEM',
        NOW()
      FROM utilisateur u
      LEFT JOIN user_sites us ON us.user_id = u.id_utilisateur

      -- pas déjà présent pour cette date (quelle que soit la valeur)
      WHERE NOT EXISTS (
        SELECT 1 FROM presences p
        WHERE p.id_utilisateur = u.id_utilisateur
          AND p.date_presence = ?
      )

      -- pas en absence validée
      AND NOT EXISTS (
        SELECT 1 FROM absences a
        WHERE a.id_utilisateur = u.id_utilisateur
          AND a.statut = 'VALIDEE'
          AND ? BETWEEN a.date_debut AND a.date_fin
      )
    `,
      [today, today, today]
    );

    console.log(`[CRON] Absents créés : ${result.affectedRows}`);
    console.log('[CRON] Daily attendance finished');

  } catch (error) {
    console.error('[CRON] ERROR', error);
  }
};

exports.cronDailyAttendance = cronDailyAttendance;

setInterval(() => {
  cronDailyAttendance()
    .then((msg) => console.log("[AutoSync]", msg))
    .catch((err) => console.error("[AutoSync] Erreur:", err.message));
}, INTERVAL_MS);