const { db } = require("./../config/database");
const moment = require("moment");
require('moment/locale/fr');
const util = require("util");
const query = util.promisify(db.query).bind(db);
const { jourSemaineFR, formatDate, } = require("../utils/dateUtils.js");
const { auditPresence } = require("../utils/audit.js");
const { encrypt } = require("../utils/encrypt.js");
const { getSiteColor } = require("../utils/getSiteColor.js");
const WORK_DAY_HOURS = 8;
const HALF_DAY_HOURS = 4;
const INTERVAL_MS = 12 * 60 * 60 * 1000; // toutes les 12 heures

exports.getPresence = (req, res) => {
  try {
    const { startDate, endDate, site } = req.query;

    let conditions = [];
    let values = [];

    conditions.push("u.show_in_presence = 1");

    if (startDate && endDate) {
      conditions.push("p.date_presence BETWEEN ? AND ?");
      values.push(startDate, endDate);
    }

    if (site) {
      conditions.push("p.site_id = ?");
      values.push(site);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const q = `
      SELECT 
        p.id_presence, 
        p.date_presence, 
        p.heure_entree, 
        p.heure_sortie, 
        p.statut_jour, 
        u.nom, 
        u.prenom,
        u.email,
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

      // ✅ Transformer après récupération
      const presenceFixed = data.map(p => ({
        ...p,
        heure_entree: p.heure_entree
          ? moment(p.heure_entree).format("YYYY-MM-DD HH:mm:ss")
          : null,
        heure_sortie: p.heure_sortie
          ? moment(p.heure_sortie).format("YYYY-MM-DD HH:mm:ss")
          : null
      }));

      return res.status(200).json(presenceFixed);
    });

  } catch (err) {
    return res.status(500).json({ message: "Erreur serveur", err });
  }
};

/* exports.getPresencePlanning = async (req, res) => {
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
}; */

/* exports.getPresencePlanning = async (req, res) => {
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

    // 🔹 Charger utilisateurs selon rôle
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

    if (userWhere.length) {
      usersQuery += " WHERE " + userWhere.join(" OR ");
    }

    const users = await query(usersQuery, usersValues);

    if (!users.length) {
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

    // 🔹 3️⃣ Jours fériés et horaires utilisateurs
    const [joursFeries, horairesUsers, horairesDetails] = await Promise.all([
      query(`SELECT date_ferie FROM jours_feries`),
      query(
        `SELECT hu.user_id, hu.horaire_id, hu.date_debut, hu.date_fin 
         FROM horaire_user hu
         WHERE (hu.date_fin IS NULL OR hu.date_fin >= ?) AND hu.date_debut <= ?`,
        [debut, fin]
      ),
      query(`SELECT id_detail, horaire_id, jour_semaine, heure_debut, heure_fin, tolerance_retard FROM horaire_detail`)
    ]);

    // 🔹 Créer mapping jours travaillés par utilisateur
    const userHorairesMap = {};
    horairesUsers.forEach(hu => {
      const userId = hu.user_id;
      if (!userHorairesMap[userId]) userHorairesMap[userId] = [];
      const details = horairesDetails.filter(d => d.horaire_id === hu.horaire_id);
      details.forEach(d => {
        const jour = d.jour_semaine.toLowerCase();
        if (!userHorairesMap[userId].includes(jour)) userHorairesMap[userId].push(jour);
      });
    });

    // 🔹 4️⃣ Présences
    let presQuery = `SELECT id_presence, id_utilisateur, date_presence, heure_entree, heure_sortie, site_id, statut_jour
                     FROM presences
                     WHERE date_presence BETWEEN ? AND ?`;
    const presValues = [debut, fin];

    if (role === "Owner" || role === "Employé") {
      presQuery += " AND id_utilisateur = ?";
      presValues.push(userId);
    } else {
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
      return {
        date: dateKey,
        label: `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`
      };
    });

    // 🔹 Construction planning final
    const utilisateurs = users.map(u => {
      const presencesByDate = {};
      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin);
        const jourSemaine = jourSemaineFR(new Date(d.date)).toLowerCase();
        const userHoraires = userHorairesMap[u.id_utilisateur] || [];

        if (cong) {
          presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
        } else if (presMapByUserDate[key]) {
          const base = { ...presMapByUserDate[key] };
          const adj = adjustmentsMap[key];
          if (adj?.statut === "VALIDE") {
            if (adj.type === "RETARD_JUSTIFIE") base.retard_justifie = true;
            if (adj.type === "CORRECTION_HEURE") base.heure_entree = adj.nouvelle_valeur;
            if (adj.type === "AUTORISATION_SORTIE") base.autorisation_sortie = true;
          }
          presencesByDate[d.date] = base;
        } else if (joursFeries.some(j => formatDate(j.date_ferie) === d.date)) {
          presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        } else if (!userHoraires.includes(jourSemaine)) {
          presencesByDate[d.date] = { statut: "JOUR_NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        } else {
          presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
        }
      });

      return { id_utilisateur: u.id_utilisateur, nom: u.nom, prenom: u.prenom, presences: presencesByDate };
    });

    res.json({ month: Number(month), year: Number(year), dates, utilisateurs });

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

    // 🔹 Charger utilisateurs selon rôle
        let usersQuery = `SELECT DISTINCT u.id_utilisateur, u.nom, u.prenom, u.id_departement
                          FROM utilisateur u`;
        const usersValues = [];
        const userWhere = [];

        // Filtrer uniquement les utilisateurs activés pour la présence
        userWhere.push("u.show_in_presence = 1");
        
        if (role === "Owner" || role === "Employé") {
          if (!queryUserId) {
            return res.status(400).json({ message: `${role} doit fournir son user_id dans la query` });
          }
          userWhere.push("u.id_utilisateur = ?");
          usersValues.push(parseInt(queryUserId, 10));
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
        
        if (userWhere.length) {
          usersQuery += " WHERE " + userWhere.join(" AND "); // ✅ utiliser AND pour combiner
        }


    const users = await query(usersQuery, usersValues);
    if (!users.length) {
      return res.json({ month: Number(month), year: Number(year), dates: [], utilisateurs: [] });
    }

    // 🔹 Génération dates du mois
    const datesRaw = await query(
      `SELECT DATE(?) + INTERVAL n DAY AS date
       FROM (
         SELECT a.a + b.a * 10 AS n
         FROM (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
               UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a
         CROSS JOIN (SELECT 0 a UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) b
       ) numbers
       WHERE DATE(?) + INTERVAL n DAY <= ?`,
      [debut, debut, fin]
    );

    // 🔹 Jours fériés et horaires utilisateurs
    const [joursFeries, horairesUsers, horairesDetails] = await Promise.all([
      query(`SELECT date_ferie FROM jours_feries`),
      query(
        `SELECT hu.user_id, hu.horaire_id, hu.date_debut, hu.date_fin 
         FROM horaire_user hu
         WHERE (hu.date_fin IS NULL OR hu.date_fin >= ?) AND hu.date_debut <= ?`,
        [debut, fin]
      ),
      query(`SELECT id_detail, horaire_id, jour_semaine, heure_debut, heure_fin, tolerance_retard FROM horaire_detail`)
    ]);

    // 🔹 Mapping jours travaillés par utilisateur
    const userHorairesMap = {};
    horairesUsers.forEach(hu => {
      const userId = hu.user_id;
      if (!userHorairesMap[userId]) userHorairesMap[userId] = [];
      const details = horairesDetails.filter(d => d.horaire_id === hu.horaire_id);
      details.forEach(d => {
        const jour = d.jour_semaine.toLowerCase();
        if (!userHorairesMap[userId].includes(jour)) userHorairesMap[userId].push(jour);
      });
    });

    // 🔹 Présences
    let presQuery = `SELECT id_presence, id_utilisateur, date_presence, heure_entree, heure_sortie, site_id, statut_jour
                     FROM presences
                     WHERE date_presence BETWEEN ? AND ?`;
    const presValues = [debut, fin];

    if (role === "Owner" || role === "Employé") {
      presQuery += " AND id_utilisateur = ?";
      presValues.push(userId);
    } else {
      const userIds = users.map(u => u.id_utilisateur);
      presQuery += ` AND id_utilisateur IN (${userIds.map(() => "?").join(",")})`;
      presValues.push(...userIds);
    }

    const presences = await query(presQuery, presValues);

    // 🔹 Correction heure locale avant JSON
    const presencesFixed = presences.map(p => ({
      ...p,
      heure_entree: p.heure_entree ? moment(p.heure_entree).format("YYYY-MM-DD HH:mm:ss") : null,
      heure_sortie: p.heure_sortie ? moment(p.heure_sortie).format("YYYY-MM-DD HH:mm:ss") : null
    }));

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
      const key = `${a.id_utilisateur}_${moment(a.date_presence).format("YYYY-MM-DD")}`;
      adjustmentsMap[key] = a;
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
      debut: moment(c.date_debut).format("YYYY-MM-DD"),
      fin: moment(c.date_fin).format("YYYY-MM-DD")
    }));

    // 🔹 Mapping présences par utilisateur/date
    const presMapByUserDate = {};
    presencesFixed.forEach(p => {
      const key = `${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`;
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

    // 🔹 Construction dates
       const dates = datesRaw
      .map(d => {
        const dateKey = moment(d.date).format("YYYY-MM-DD");
        return {
          date: dateKey,
          label: `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // tri par date croissante


    // 🔹 Construction planning final
    const utilisateurs = users.map(u => {
      const presencesByDate = {};
      dates.forEach(d => {
        const key = `${u.id_utilisateur}_${d.date}`;
        const cong = congesList.find(c => c.id === u.id_utilisateur && d.date >= c.debut && d.date <= c.fin);
        const jourSemaine = moment(d.date).format('dddd').toLowerCase();
        const userHoraires = userHorairesMap[u.id_utilisateur] || [];

        if (cong) {
          presencesByDate[d.date] = { statut: "CONGE", heure_entree: null, heure_sortie: null };
        } else if (presMapByUserDate[key]) {
          const base = { ...presMapByUserDate[key] };
          const adj = adjustmentsMap[key];
          if (adj?.statut === "VALIDE") {
            if (adj.type === "RETARD_JUSTIFIE") base.retard_justifie = true;
            if (adj.type === "CORRECTION_HEURE") base.heure_entree = adj.nouvelle_valeur;
            if (adj.type === "AUTORISATION_SORTIE") base.autorisation_sortie = true;
          }
          presencesByDate[d.date] = base;
        } else if (joursFeries.some(j => moment(j.date_ferie).format("YYYY-MM-DD") === d.date)) {
          presencesByDate[d.date] = { statut: "FERIE", heure_entree: null, heure_sortie: null };
        } else if (!userHoraires.includes(jourSemaine)) {
          presencesByDate[d.date] = { statut: "JOUR_NON_TRAVAILLE", heure_entree: null, heure_sortie: null };
        } else {
          presencesByDate[d.date] = { statut: "ABSENT", heure_entree: null, heure_sortie: null };
        }
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
      SELECT u.id_utilisateur, u.nom, u.prenom
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
      return res.json({ startDate, endDate, dates: [], report: [] });
    }

    const horaires = await query(`
      SELECT 
        hu.user_id,
        hd.jour_semaine,
        hd.heure_debut,
        hd.heure_fin,
        hd.tolerance_retard
      FROM horaire_user hu
      JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
      WHERE hu.date_debut <= ?
        AND (hu.date_fin IS NULL OR hu.date_fin >= ?)
    `, [endDate, startDate]);

    const horairesMap = new Map();
    horaires.forEach(h => {
      if (!horairesMap.has(h.user_id)) {
        horairesMap.set(h.user_id, []);
      }
      horairesMap.get(h.user_id).push(h);
    });

    let presencesSql = `
      SELECT p.id_utilisateur, p.date_presence, p.heure_entree,
             p.heure_sortie, p.heures_supplementaires
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

    const presencesMap = new Map();
    presences.forEach(p => {
      presencesMap.set(
        `${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`,
        p
      );
    });

    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_fin >= ?
        AND date_debut <= ?
    `, [startDate, endDate]);

    const congesMap = new Map();
    conges.forEach(c => {
      if (!congesMap.has(c.id_utilisateur)) {
        congesMap.set(c.id_utilisateur, []);
      }
      congesMap.get(c.id_utilisateur).push({
        debut: moment(c.date_debut),
        fin: moment(c.date_fin)
      });
    });

    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const joursFeriesSet = new Set(
      joursFeries.map(j => moment(j.date_ferie).format("YYYY-MM-DD"))
    );

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
        const pKey = `${u.id_utilisateur}_${dateStr}`;

        const horairesUser = horairesMap.get(u.id_utilisateur) || [];

        const jourFR = moment(dateStr).format("dddd").toUpperCase();

        const horaireJour = horairesUser.find(h => h.jour_semaine === jourFR);
        const isJourTravail = !!horaireJour;

        const isFerie = joursFeriesSet.has(dateStr);

        const isConge =
          congesMap.has(u.id_utilisateur) &&
          congesMap.get(u.id_utilisateur)
            .some(c => moment(dateStr).isBetween(c.debut, c.fin, null, "[]"));

        if (!isJourTravail) {
          statut = "NON_PREVU";
          nonTravaille++;
        }
        else if (presencesMap.has(pKey)) {

          const p = presencesMap.get(pKey);
          statut = "PRESENT";
          joursTravailles++;

          heuresSupp += Number(p.heures_supplementaires || 0);

          if (p.heure_entree && horaireJour) {
            const heureEntree = moment(`${dateStr} ${p.heure_entree}`);
            const heureDebut = moment(`${dateStr} ${horaireJour.heure_debut}`)
              .add(horaireJour.tolerance_retard || 0, "minutes");

            if (heureEntree.isAfter(heureDebut)) {
              const retard = heureEntree.diff(heureDebut, "minutes");
              retards += retard;
            }
          }

        }
        else if (isConge) {
          statut = "CONGE";
          congesPayes++;
        }
        else if (isFerie) {
          statut = "FERIE";
          joursFerie++;
        }
        else {
          absences++;
        }

        presMap[dateStr] = presencesMap.get(pKey) || { statut };
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        prenom: u.prenom,
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
}; */

/* exports.getMonthlyPresenceReport = async (req, res) => {
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
      SELECT u.id_utilisateur, u.nom, u.prenom
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
      return res.json({ startDate, endDate, dates: [], report: [] });
    }

    const horaires = await query(`
      SELECT 
        hu.user_id,
        hd.jour_semaine,
        hd.heure_debut,
        hd.heure_fin,
        hd.tolerance_retard
      FROM horaire_user hu
      JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
      WHERE hu.date_debut <= ?
        AND (hu.date_fin IS NULL OR hu.date_fin >= ?)
    `, [endDate, startDate]);

    const horairesMap = new Map();
    horaires.forEach(h => {
      if (!horairesMap.has(h.user_id)) {
        horairesMap.set(h.user_id, []);
      }
      horairesMap.get(h.user_id).push(h);
    });

    let presencesSql = `
      SELECT p.id_utilisateur, p.date_presence, p.heure_entree,
             p.heure_sortie, p.heures_supplementaires
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

    const presencesMap = new Map();
    presences.forEach(p => {
      presencesMap.set(
        `${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`,
        p
      );
    });

    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_fin >= ?
        AND date_debut <= ?
    `, [startDate, endDate]);

    const congesMap = new Map();
    conges.forEach(c => {
      if (!congesMap.has(c.id_utilisateur)) {
        congesMap.set(c.id_utilisateur, []);
      }
      congesMap.get(c.id_utilisateur).push({
        debut: moment(c.date_debut),
        fin: moment(c.date_fin)
      });
    });

    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const joursFeriesSet = new Set(
      joursFeries.map(j => moment(j.date_ferie).format("YYYY-MM-DD"))
    );

    const dates = [];
    let d = moment(startDate);
    while (d.isSameOrBefore(endDate)) {
      dates.push(d.format("YYYY-MM-DD"));
      d.add(1, "day");
    }

    const report = users.map(u => {

      let joursPrestation = 0,
          joursTravailles = 0,
          absences = 0,
          retards = 0,
          heuresSupp = 0,
          congesPayes = 0,
          joursFerie = 0,
          nonTravaille = 0;

      const presMap = {};

      dates.forEach(dateStr => {

        let statut = "ABSENT";
        const pKey = `${u.id_utilisateur}_${dateStr}`;

        const horairesUser = horairesMap.get(u.id_utilisateur) || [];

        const jourFR = moment(dateStr).format("dddd").toUpperCase();
        const horaireJour = horairesUser.find(h => h.jour_semaine === jourFR);
        const isJourTravail = !!horaireJour;

        const isFerie = joursFeriesSet.has(dateStr);

        const isConge =
          congesMap.has(u.id_utilisateur) &&
          congesMap.get(u.id_utilisateur)
            .some(c => moment(dateStr).isBetween(c.debut, c.fin, null, "[]"));

        // 🔥 JOURS PRESTATION = jour prévu au planning
        if (isJourTravail) {
          joursPrestation++;
        }

        if (!isJourTravail) {
          statut = "NON_PREVU";
          nonTravaille++;
        }
        else if (presencesMap.has(pKey)) {

          const p = presencesMap.get(pKey);
          statut = "PRESENT";
          joursTravailles++;

          heuresSupp += Number(p.heures_supplementaires || 0);

          if (p.heure_entree && horaireJour) {
            const heureEntree = moment(`${dateStr} ${p.heure_entree}`);
            const heureDebut = moment(`${dateStr} ${horaireJour.heure_debut}`)
              .add(horaireJour.tolerance_retard || 0, "minutes");

            if (heureEntree.isAfter(heureDebut)) {
              const retard = heureEntree.diff(heureDebut, "minutes");
              retards += retard;
            }
          }

        }
        else if (isConge) {
          statut = "CONGE";
          congesPayes++;
        }
        else if (isFerie) {
          statut = "FERIE";
          joursFerie++;
        }
        else {
          absences++;
        }

        presMap[dateStr] = presencesMap.get(pKey) || { statut };
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        prenom: u.prenom,
        joursPrestation,
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

    const startDate = moment(`${yearInt}-${monthInt.toString().padStart(2, "0")}-01`, "YYYY-MM-DD")
      .startOf("month")
      .format("YYYY-MM-DD");

    const endDate = moment(startDate).endOf("month").format("YYYY-MM-DD");

    /* ===================== 1️⃣ UTILISATEURS ===================== */
    let usersSql = `SELECT u.id_utilisateur, u.nom, u.prenom 
                    FROM utilisateur u 
                    WHERE u.show_in_presence = 1`; // 🔹 uniquement visibles en présence
    const usersParams = [];

    if (site) {
      usersSql += ` 
        JOIN user_sites us ON us.user_id = u.id_utilisateur 
        WHERE u.show_in_presence = 1 AND us.site_id = ?`; 
      usersParams.push(site);
    }

    usersSql += ` ORDER BY u.nom`;

    const users = await query(usersSql, usersParams);
    if (!users.length) return res.json({ startDate, endDate, dates: [], report: [] });

    /* ===================== 2️⃣ HORAIRES ===================== */
    const horaires = await query(`
      SELECT 
        hu.user_id,
        hd.jour_semaine,
        hd.heure_debut,
        hd.heure_fin,
        hd.tolerance_retard
      FROM horaire_user hu
      JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
      WHERE hu.date_debut <= ? AND (hu.date_fin IS NULL OR hu.date_fin >= ?)
    `, [endDate, startDate]);

    const horairesMap = new Map();
    horaires.forEach(h => {
      if (!horairesMap.has(h.user_id)) horairesMap.set(h.user_id, []);
      horairesMap.get(h.user_id).push(h);
    });

    /* ===================== 3️⃣ PRÉSENCES ===================== */
    let presencesSql = `SELECT p.id_utilisateur, p.date_presence, p.heure_entree,
                             p.heure_sortie, p.heures_supplementaires, p.statut_jour
                        FROM presences p`;

    const presParams = [];
    if (site) {
      presencesSql += `
        JOIN user_sites us ON us.user_id = p.id_utilisateur
        WHERE us.site_id = ? AND p.date_presence BETWEEN ? AND ?`;
      presParams.push(site, startDate, endDate);
    } else {
      presencesSql += ` WHERE p.date_presence BETWEEN ? AND ?`;
      presParams.push(startDate, endDate);
    }

    const presences = await query(presencesSql, presParams);
    const presencesMap = new Map();
    presences.forEach(p => {
      presencesMap.set(`${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`, p);
    });

    /* ===================== 4️⃣ CONGÉS ===================== */
    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE' AND date_fin >= ? AND date_debut <= ?
    `, [startDate, endDate]);

    const congesMap = new Map();
    conges.forEach(c => {
      if (!congesMap.has(c.id_utilisateur)) congesMap.set(c.id_utilisateur, []);
      congesMap.get(c.id_utilisateur).push({
        debut: moment(c.date_debut),
        fin: moment(c.date_fin)
      });
    });

    /* ===================== 5️⃣ JOURS FÉRIÉS ===================== */
    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const joursFeriesSet = new Set(
      joursFeries.map(j => moment(j.date_ferie).format("YYYY-MM-DD"))
    );

    /* ===================== 6️⃣ DATES DU MOIS ===================== */
    const dates = [];
    let d = moment(startDate);
    while (d.isSameOrBefore(endDate)) {
      dates.push(d.format("YYYY-MM-DD"));
      d.add(1, "day");
    }

    /* ===================== 7️⃣ RAPPORT FINAL ===================== */
    const report = users.map(u => {
      let joursPrestation = 0,
          joursTravailles = 0,
          absences = 0,
          retards = 0,
          heuresSupp = 0,
          congesPayes = 0,
          joursFerie = 0,
          nonTravaille = 0;

      const presMap = {};

      dates.forEach(dateStr => {
        let statut = "ABSENT";
        const pKey = `${u.id_utilisateur}_${dateStr}`;

        const horairesUser = horairesMap.get(u.id_utilisateur) || [];
        const jourFR = moment(dateStr).format("dddd").toUpperCase();
        const horaireJour = horairesUser.find(h => h.jour_semaine === jourFR);
        const isJourTravail = !!horaireJour;

        const isFerie = joursFeriesSet.has(dateStr);
        const isConge =
          congesMap.has(u.id_utilisateur) &&
          congesMap.get(u.id_utilisateur)
            .some(c => moment(dateStr).isBetween(c.debut, c.fin, null, "[]"));

        if (isJourTravail) joursPrestation++;
        if (!isJourTravail) {
          statut = "JOUR_NON_TRAVAILLE";
          nonTravaille++;
        } else if (presencesMap.has(pKey)) {
          const p = presencesMap.get(pKey);
          statut = p.statut || "PRESENT";
          if (statut === "PRESENT") joursTravailles++;
          if (statut === "SUPPLEMENTAIRE") heuresSupp += Number(p.heures_supplementaires || 0);
          // Calcul retard
          if (p.heure_entree && horaireJour) {
            const heureEntree = moment(`${dateStr} ${p.heure_entree}`);
            const heureDebut = moment(`${dateStr} ${horaireJour.heure_debut}`)
                                .add(horaireJour.tolerance_retard || 0, "minutes");
            if (heureEntree.isAfter(heureDebut)) {
              retards += heureEntree.diff(heureDebut, "minutes");
            }
          }
        } else if (isConge) {
          statut = "ABSENCE_JUSTIFIEE";
          congesPayes++;
        } else if (isFerie) {
          statut = "JOUR_FERIE";
          joursFerie++;
        } else {
          statut = "ABSENT";
          absences++;
        }

        presMap[dateStr] = presencesMap.get(pKey) || { statut };
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        prenom: u.prenom,
        joursPrestation,
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

    res.json({ startDate, endDate, dates, report });
  } catch (err) {
    console.error("Erreur getMonthlyPresenceReport:", err);
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport mensuel" });
  }
};


/* exports.getLateEarlyLeaveReport = async (req, res) => {
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
}; */

/* exports.getLateEarlyLeaveReport = async (req, res) => {
  try {
    let { startDate, endDate, site } = req.query;

    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    }

    // 🔹 Récupérer les utilisateurs
    let usersQuery = `SELECT id_utilisateur, nom FROM utilisateur`;
    const params = [];

    if (site) {
      usersQuery += `
        JOIN user_sites us ON us.user_id = utilisateur.id_utilisateur
        WHERE us.site_id = ?
      `;
      params.push(site);
    }

    const users = await query(usersQuery, params);
    if (!users.length) return res.json({ startDate, endDate, site: site || null, total: 0, data: [] });

    const userIds = users.map(u => u.id_utilisateur);

    // 🔹 Récupérer les présences
    const presences = await query(
      `SELECT *
       FROM presences
       WHERE date_presence BETWEEN ? AND ?
         AND id_utilisateur IN (${userIds.map(() => "?").join(",")})`,
      [startDate, endDate, ...userIds]
    );

    // 🔹 Récupérer les horaires utilisateurs + détails
    const horairesUsers = await query(
      `SELECT hu.user_id, hu.horaire_id, hu.date_debut, hu.date_fin
       FROM horaire_user hu
       WHERE hu.user_id IN (${userIds.map(() => "?").join(",")})
         AND (hu.date_fin IS NULL OR hu.date_fin >= ?) AND hu.date_debut <= ?`,
      [...userIds, endDate, startDate]
    );

    const horairesDetails = await query(
      `SELECT horaire_id, jour_semaine, heure_debut, heure_fin, tolerance_retard
       FROM horaire_detail`
    );

    // 🔹 Créer mapping horaire par utilisateur/jour
    const userHorairesMap = {};
    horairesUsers.forEach(hu => {
      const userId = hu.user_id;
      if (!userHorairesMap[userId]) userHorairesMap[userId] = [];
      const details = horairesDetails.filter(d => d.horaire_id === hu.horaire_id);
      details.forEach(d => {
        const jour = d.jour_semaine.toLowerCase();
        userHorairesMap[userId][jour] = {
          heure_debut: d.heure_debut,
          heure_fin: d.heure_fin,
          tolerance_retard: d.tolerance_retard || 0
        };
      });
    });

    // 🔹 Générer le rapport
    const data = [];

    presences.forEach(p => {
      const user = users.find(u => u.id_utilisateur === p.id_utilisateur);
      const jourSemaine = moment(p.date_presence).locale("fr").format("dddd").toLowerCase();

      const horaire = userHorairesMap[p.id_utilisateur]?.[jourSemaine];

      const heure_entree_prevue = horaire?.heure_debut || "08:00:00";
      const heure_sortie_prevue = horaire?.heure_fin || "16:00:00";

      const heure_entree_reelle = p.heure_entree ? moment(p.heure_entree).format("HH:mm:ss") : "-";
      const heure_sortie_reelle = p.heure_sortie ? moment(p.heure_sortie).format("HH:mm:ss") : "-";

      const retard_minutes = p.retard_minutes || 0;

      const depart_anticipe_minutes =
        p.heure_sortie && moment(p.heure_sortie).isBefore(moment(`${p.date_presence} ${heure_sortie_prevue}`))
          ? moment(`${p.date_presence} ${heure_sortie_prevue}`).diff(moment(p.heure_sortie), "minutes")
          : 0;

      let commentaire = "Ponctuel";
      if (retard_minutes > 0 && depart_anticipe_minutes > 0) commentaire = "Retard + Départ anticipé";
      else if (retard_minutes > 0) commentaire = "Retard";
      else if (depart_anticipe_minutes > 0) commentaire = "Départ anticipé";
      else if (p.heures_supplementaires > 0) commentaire = "Heures supplémentaires";

      data.push({
        nom: user.nom,
        date_presence: p.date_presence,
        heure_entree_prevue,
        heure_entree_reelle,
        retard_minutes,
        heure_sortie_prevue,
        heure_sortie_reelle,
        depart_anticipe_minutes,
        heures_supplementaires: p.heures_supplementaires || 0,
        commentaire
      });
    });

    res.json({
      startDate,
      endDate,
      site: site || null,
      total: data.length,
      data
    });

  } catch (err) {
    console.error("Erreur getLateEarlyLeaveReport :", err);
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport" });
  }
}; */

exports.getLateEarlyLeaveReport = async (req, res) => {
  try {
    let { startDate, endDate, site } = req.query;

    // 🔹 Dates par défaut (mois courant)
    if (!startDate || !endDate) {
      startDate = moment().startOf("month").format("YYYY-MM-DD");
      endDate = moment().endOf("month").format("YYYY-MM-DD");
    }

    // 🔹 Récupérer utilisateurs activés pour la présence
    let usersQuery = `SELECT u.id_utilisateur, u.nom
                      FROM utilisateur u
                      WHERE u.show_in_presence = 1`;
    const params = [];

    if (site) {
      usersQuery += `
        JOIN user_sites us ON us.user_id = u.id_utilisateur
        WHERE u.show_in_presence = 1 AND us.site_id = ?
      `;
      params.push(site);
    }

    const users = await query(usersQuery, params);
    if (!users.length)
      return res.json({ startDate, endDate, site: site || null, total: 0, data: [] });

    const userIds = users.map(u => u.id_utilisateur);

    // 🔹 Récupérer présences pour ces utilisateurs
    const presences = await query(
      `SELECT *
       FROM presences
       WHERE date_presence BETWEEN ? AND ?
         AND id_utilisateur IN (${userIds.map(() => "?").join(",")})`,
      [startDate, endDate, ...userIds]
    );

    // 🔹 Récupérer horaires utilisateurs + détails
    const horairesUsers = await query(
      `SELECT hu.user_id, hu.horaire_id, hu.date_debut, hu.date_fin
       FROM horaire_user hu
       WHERE hu.user_id IN (${userIds.map(() => "?").join(",")})
         AND (hu.date_fin IS NULL OR hu.date_fin >= ?) AND hu.date_debut <= ?`,
      [...userIds, endDate, startDate]
    );

    const horairesDetails = await query(
      `SELECT horaire_id, jour_semaine, heure_debut, heure_fin, tolerance_retard
       FROM horaire_detail`
    );

    // 🔹 Mapping horaire par utilisateur/jour
    const userHorairesMap = {};
    horairesUsers.forEach(hu => {
      const userId = hu.user_id;
      if (!userHorairesMap[userId]) userHorairesMap[userId] = {};
      const details = horairesDetails.filter(d => d.horaire_id === hu.horaire_id);
      details.forEach(d => {
        const jour = d.jour_semaine.toLowerCase();
        userHorairesMap[userId][jour] = {
          heure_debut: d.heure_debut,
          heure_fin: d.heure_fin,
          tolerance_retard: d.tolerance_retard || 0
        };
      });
    });

    // 🔹 Générer le rapport
    const data = presences.map(p => {
      const user = users.find(u => u.id_utilisateur === p.id_utilisateur);
      const jourSemaine = moment(p.date_presence).locale("fr").format("dddd").toLowerCase();

      const horaire = userHorairesMap[p.id_utilisateur]?.[jourSemaine];

      const heure_entree_prevue = horaire?.heure_debut || "08:00:00";
      const heure_sortie_prevue = horaire?.heure_fin || "16:00:00";
      const tolerance_retard = horaire?.tolerance_retard || 0;

      const heure_entree_reelle = p.heure_entree
        ? moment(p.heure_entree).format("HH:mm:ss")
        : "-";
      const heure_sortie_reelle = p.heure_sortie
        ? moment(p.heure_sortie).format("HH:mm:ss")
        : "-";

      // 🔹 Calcul retard minutes
      const retard_minutes_raw = p.retard_minutes || 0;
      const retard_minutes = Math.max(0, retard_minutes_raw - tolerance_retard);

      // 🔹 Calcul départ anticipé
      let depart_anticipe_minutes = 0;
      if (p.heure_sortie) {
        const sortieReelle = moment(`${p.date_presence} ${p.heure_sortie}`);
        const sortiePrevue = moment(`${p.date_presence} ${heure_sortie_prevue}`);
        if (sortieReelle.isBefore(sortiePrevue)) {
          depart_anticipe_minutes = sortiePrevue.diff(sortieReelle, "minutes");
        }
      }

      // 🔹 Commentaire
      const commentaireArr = [];
      if (retard_minutes > 0) commentaireArr.push("Retard");
      if (depart_anticipe_minutes > 0) commentaireArr.push("Départ anticipé");
      if ((p.heures_supplementaires || 0) > 0) commentaireArr.push("Heures supplémentaires");
      if (commentaireArr.length === 0) commentaireArr.push("Ponctuel");
      const commentaire = commentaireArr.join(" + ");

      return {
        nom: user.nom,
        date_presence: p.date_presence,
        heure_entree_prevue,
        heure_entree_reelle,
        retard_minutes,
        heure_sortie_prevue,
        heure_sortie_reelle,
        depart_anticipe_minutes,
        heures_supplementaires: p.heures_supplementaires || 0,
        commentaire
      };
    });

    // 🔹 Retour final
    res.json({
      startDate,
      endDate,
      site: site || null,
      total: data.length,
      data
    });

  } catch (err) {
    console.error("Erreur getLateEarlyLeaveReport :", err);
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport" });
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

   // 2️⃣ Vérifier jour travaillé selon l’horaire utilisateur
    const jourSQL = jourSemaineSQL(dateISO);

    const horaireRows = await query(
      `
      SELECT 
        ht.nom AS horaire_nom,
        ht.${jourSQL} AS jour_autorise
      FROM horaire_user hu
      JOIN horaire_travail ht ON ht.id_horaire = hu.horaire_id
      WHERE hu.user_id = ?
        AND hu.actif = 1
      LIMIT 1
      `,
      [id_utilisateur, dateISO]
    );

    if (!horaireRows.length) {
      return res.status(403).json({
        message: "Pointage interdit : aucun horaire actif pour cet utilisateur"
      });
    }

    if (horaireRows[0].jour_autorise === 0) {
      return res.status(403).json({
        message: `Pointage interdit : jour non travaillé selon l’horaire (${horaireRows[0].horaire_nom})`
      });
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
}; */

/* exports.postPresence = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_presence,
      datetime,
      source = 'MANUEL',
      device_sn,
      terminal_id,
      permissions = [],
    } = req.body;

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

    // 2️⃣ Vérifier jour travaillé selon planning
    const jourNom = moment(dateISO).locale("fr").format("dddd").toUpperCase();

    const planningRows = await query(
      `SELECT 
          hu.id_horaire_user,
          hd.jour_semaine,
          hd.heure_debut,
          hd.heure_fin,
          hd.tolerance_retard
      FROM horaire_user hu
      JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
      WHERE hu.user_id = ?
        AND hd.jour_semaine = ?
        AND hu.date_debut <= ?
        AND (hu.date_fin IS NULL OR hu.date_fin >= ?)`,
      [id_utilisateur, jourNom, dateISO, dateISO]
    );

    if (!planningRows?.length) {
      return res.status(403).json({
        message: "Pointage interdit : aucun horaire actif pour cet utilisateur ce jour"
      });
    }

    const hd = planningRows[0];

    const debutTravail = moment(
      `${dateISO} ${hd.heure_debut}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    const finTravail = moment(
      `${dateISO} ${hd.heure_fin}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    // 2️⃣a Vérifier jour férié
    const ferieRows = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (ferieRows?.length) {
      return res.status(403).json({ message: "Pointage interdit : jour férié" });
    }

    // 2️⃣b Vérifier absence validée
    const absenceRows = await query(
      `SELECT a.id_absence, t.code, a.date_debut, a.date_fin, DATEDIFF(a.date_fin, a.date_debut) + 1 AS nb_jours
       FROM absences a
       JOIN absence_types t ON t.id_absence_type = a.id_absence_type
       WHERE a.id_utilisateur = ? AND a.statut = 'VALIDEE' AND ? BETWEEN a.date_debut AND a.date_fin`,
      [id_utilisateur, dateISO]
    );

    if (absenceRows?.length) {
      const absence = absenceRows[0];
      return res.status(403).json({
        message: `Pointage interdit : absence validée (${absence.code}) pour ${absence.nb_jours} jour(s), du ${moment(absence.date_debut).format('DD/MM/YYYY')} au ${moment(absence.date_fin).format('DD/MM/YYYY')}.`,
        code: 'ABSENCE_VALIDEE',
        details: absence
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

    // 4️⃣ ABSENT → PRESENT ou nouvelle entrée
    let retard_minutes = heurePointage.isAfter(debutTravail)
      ? heurePointage.diff(debutTravail, "minutes")
      : 0;

    if (
      presence &&
      ["ABSENT", "JOUR_NON_TRAVAILLE"].includes(presence.statut_jour)
    ) {
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

    if (!presence) {
      const result = await query(
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
        },
        ip_address: terminal?.ip_address || null,
      });

      return res.status(201).json({ message: "Entrée enregistrée", retard_minutes });
    }

    // 5️⃣ Gestion sortie
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
}; */

exports.postPresence = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_presence,
      datetime,
      source = 'MANUEL',
      device_sn,
      terminal_id,
      permissions = [],
    } = req.body;

    const actingUserId = req.abac?.user_id || 0;

    // 0️⃣ Vérification RBAC
    if (!permissions.includes("attendance.events.approve")) {
      return res.status(403).json({ message: "Permission refusée" });
    }

    if (!id_utilisateur || !date_presence) {
      return res.status(400).json({ message: "Champs obligatoires manquants" });
    }

    const dateISO = moment(date_presence).format("YYYY-MM-DD");

    // utiliser l'heure locale du serveur ou ajouter l'offset
    let heurePointage = datetime
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

    // 2️⃣ Vérifier jour travaillé selon planning
    const jourNom = moment(dateISO).locale("fr").format("dddd").toUpperCase();

    const planningRows = await query(
      `SELECT 
          hu.id_horaire_user,
          hd.jour_semaine,
          hd.heure_debut,
          hd.heure_fin,
          hd.tolerance_retard
      FROM horaire_user hu
      JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
      WHERE hu.user_id = ?
        AND hd.jour_semaine = ?
        AND hu.date_debut <= ?
        AND (hu.date_fin IS NULL OR hu.date_fin >= ?)`,
      [id_utilisateur, jourNom, dateISO, dateISO]
    );

    if (!planningRows?.length) {
      return res.status(403).json({
        message: "Pointage interdit : aucun horaire actif pour cet utilisateur ce jour"
      });
    }

    const hd = planningRows[0];

    const debutTravail = moment(
      `${dateISO} ${hd.heure_debut}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    const finTravail = moment(
      `${dateISO} ${hd.heure_fin}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    // 2️⃣a Vérifier jour férié
    const ferieRows = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (ferieRows?.length) {
      return res.status(403).json({ message: "Pointage interdit : jour férié" });
    }

    // 2️⃣b Vérifier absence validée
    const absenceRows = await query(
      `SELECT a.id_absence, t.code, a.date_debut, a.date_fin, DATEDIFF(a.date_fin, a.date_debut) + 1 AS nb_jours
       FROM absences a
       JOIN absence_types t ON t.id_absence_type = a.id_absence_type
       WHERE a.id_utilisateur = ? AND a.statut = 'VALIDEE' AND ? BETWEEN a.date_debut AND a.date_fin`,
      [id_utilisateur, dateISO]
    );

    if (absenceRows?.length) {
      const absence = absenceRows[0];
      return res.status(403).json({
        message: `Pointage interdit : absence validée (${absence.code}) pour ${absence.nb_jours} jour(s), du ${moment(absence.date_debut).format('DD/MM/YYYY')} au ${moment(absence.date_fin).format('DD/MM/YYYY')}.`,
        code: 'ABSENCE_VALIDEE',
        details: absence
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

    // 4️⃣ ABSENT → PRESENT ou nouvelle entrée
    let retard_minutes = heurePointage.isAfter(debutTravail)
      ? heurePointage.diff(debutTravail, "minutes")
      : 0;

    if (
      presence &&
      ["ABSENT", "JOUR_NON_TRAVAILLE"].includes(presence.statut_jour)
    ) {
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

    if (!presence) {
      const result = await query(
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
        },
        ip_address: terminal?.ip_address || null,
      });

      return res.status(201).json({ message: "Entrée enregistrée", retard_minutes });
    }

    // 5️⃣ Gestion sortie
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

/* exports.postPresenceFromHikvision = async (req, res) => {
  try {
    const payload = req.body;
    const user_code =
      payload.employeeNoString ||
      payload?.AcsEvent?.employeeNoString ||
      payload?.AcsEvent?.info?.[0]?.employeeNoString;

    const datetime =
      payload.time ||
      payload?.AcsEvent?.time ||
      payload?.AcsEvent?.info?.[0]?.time;

    const device_sn =
      payload.device_sn ||
      payload.deviceSerialNo ||
      payload?.AcsEvent?.deviceSerialNo ||
      payload?.AcsEvent?.info?.[0]?.deviceSerialNo;


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

    const terminals = await query(
      `SELECT t.id_terminal, t.site_id, t.device_sn
       FROM user_terminals ut
       JOIN terminals t ON ut.terminal_id = t.id_terminal
       JOIN utilisateur u ON ut.user_id = u.id_utilisateur
       WHERE u.matricule = ?`,
      [user_code]
    );

    if (!terminals.length) {
      return res.status(403).json({
        message: "Aucun terminal autorisé pour cet utilisateur"
      });
    }

    const terminalAutorise = terminals.find(
      t => t.device_sn === device_sn
    );

    if (!terminalAutorise) {
      return res.status(403).json({
        message: "Terminal non autorisé pour cet utilisateur"
      });
    }

    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked
       FROM presences
       WHERE id_utilisateur = ?
         AND date_presence = ?
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
          id_utilisateur,
          site_id,
          date_presence,
          heure_entree,
          retard_minutes,
          source,
          terminal_id,
          device_sn
        ) VALUES (?, ?, ?, ?, ?, 'HIKVISION', ?, ?)`,
        [
          id_utilisateur,
          terminalAutorise.site_id,
          dateISO,
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          terminalAutorise.id_terminal,
          device_sn
        ]
      );

      return res.status(201).json({
        message: "Entrée enregistrée",
        retard_minutes
      });
    }

    if (
      presence.heure_entree &&
      !presence.heure_sortie &&
      moment(presence.heure_entree).isSame(heurePointage, "minute")
    ) {
      return res.status(200).json({
        message: "Scan déjà pris en compte"
      });
    }

    if (!presence.heure_sortie) {
      let heures_supplementaires = 0;

      if (heurePointage.isAfter(finTravail)) {
        heures_supplementaires = Number(
          (heurePointage.diff(finTravail, "minutes") / 60).toFixed(2)
        );
      }

      await query(
        `UPDATE presences
         SET heure_sortie = ?,
             heures_supplementaires = ?
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

    return res.status(409).json({
      message: "Présence déjà complète"
    });

  } catch (error) {
    console.error("postPresenceFromHikvision:", error);
    return res.status(500).json({
      message: "Erreur interne serveur"
    });
  }
}; */

/* exports.postPresenceFromHikvision = async (req, res) => {
  try {
    const payload = req.body;

    const user_code =
      payload.employeeNoString ||
      payload?.AcsEvent?.employeeNoString ||
      payload?.AcsEvent?.info?.[0]?.employeeNoString;

    const datetime =
      payload.time ||
      payload?.AcsEvent?.time ||
      payload?.AcsEvent?.info?.[0]?.time;

    const device_sn =
      payload.device_sn ||
      payload.deviceSerialNo ||
      payload?.AcsEvent?.deviceSerialNo ||
      payload?.AcsEvent?.info?.[0]?.deviceSerialNo;

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

    const heurePointage = moment.parseZone(datetime);
    const dateISO = heurePointage.format("YYYY-MM-DD");

    // 🔎 Vérification terminal autorisé
    const terminals = await query(
      `SELECT t.id_terminal, t.site_id, t.device_sn
       FROM user_terminals ut
       JOIN terminals t ON ut.terminal_id = t.id_terminal
       JOIN utilisateur u ON ut.user_id = u.id_utilisateur
       WHERE u.matricule = ?`,
      [user_code]
    );

    if (!terminals.length) {
      return res.status(403).json({
        message: "Aucun terminal autorisé pour cet utilisateur"
      });
    }

    const terminalAutorise = terminals.find(
      t => t.device_sn === device_sn
    );

    if (!terminalAutorise) {
      return res.status(403).json({
        message: "Terminal non autorisé pour cet utilisateur"
      });
    }

    // 🔎 Vérifier planning actif
    const jourNom = heurePointage.locale("fr").format("dddd").toUpperCase();

    const planningRows = await query(
      `SELECT 
          hu.id_horaire_user,
          hd.jour_semaine,
          hd.heure_debut,
          hd.heure_fin,
          hd.tolerance_retard
       FROM horaire_user hu
       JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
       WHERE hu.user_id = ?
         AND hd.jour_semaine = ?
         AND hu.date_debut <= ?
         AND (hu.date_fin IS NULL OR hu.date_fin >= ?)`,
      [id_utilisateur, jourNom, dateISO, dateISO]
    );

    if (!planningRows.length) {
      return res.status(403).json({
        message: "Pointage interdit : aucun horaire actif"
      });
    }

    const hd = planningRows[0];

    const debutTravail = moment(
      `${dateISO} ${hd.heure_debut}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    const finTravail = moment(
      `${dateISO} ${hd.heure_fin}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    // 🔎 Vérifier jour férié
    const ferieRows = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );

    if (ferieRows.length) {
      return res.status(403).json({
        message: "Pointage interdit : jour férié"
      });
    }

    // 🔎 Vérifier absence validée
    const absenceRows = await query(
      `SELECT 1
       FROM absences
       WHERE id_utilisateur = ?
         AND statut = 'VALIDEE'
         AND ? BETWEEN date_debut AND date_fin`,
      [id_utilisateur, dateISO]
    );

    if (absenceRows.length) {
      return res.status(403).json({
        message: "Pointage interdit : absence validée"
      });
    }

    // 🔎 Vérifier présence existante
    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked, statut_jour
       FROM presences
       WHERE id_utilisateur = ?
         AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    const presence = presenceRows.length ? presenceRows[0] : null;

    if (presence?.is_locked) {
      return res.status(403).json({
        message: "Présence verrouillée"
      });
    }

    // 🔎 Calcul retard avec tolérance
    const retardBrut = heurePointage.diff(debutTravail, "minutes");
    const retard_minutes =
      retardBrut > (hd.tolerance_retard || 0)
        ? retardBrut
        : 0;

    // 🔄 ABSENT → PRESENT
    if (
      presence &&
      ["ABSENT", "JOUR_NON_TRAVAILLE"].includes(presence.statut_jour)
    ) {
      await query(
        `UPDATE presences
         SET heure_entree = ?,
             statut_jour = 'PRESENT',
             retard_minutes = ?
         WHERE id_presence = ?`,
        [
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          presence.id_presence
        ]
      );

      return res.status(200).json({
        message: "ABSENT corrigé en PRESENT",
        retard_minutes
      });
    }

    // 🟢 Nouvelle entrée
    if (!presence) {
      await query(
        `INSERT INTO presences (
          id_utilisateur,
          site_id,
          date_presence,
          heure_entree,
          retard_minutes,
          heures_supplementaires,
          source,
          terminal_id,
          device_sn,
          statut_jour
        ) VALUES (?, ?, ?, ?, ?, 0, 'HIKVISION', ?, ?, 'PRESENT')`,
        [
          id_utilisateur,
          terminalAutorise.site_id,
          dateISO,
          heurePointage.format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          terminalAutorise.id_terminal,
          device_sn
        ]
      );

      return res.status(201).json({
        message: "Entrée enregistrée",
        retard_minutes
      });
    }

    // 🔁 Protection doublon (même minute)
    if (
      presence.heure_entree &&
      !presence.heure_sortie &&
      moment(presence.heure_entree).isSame(heurePointage, "minute")
    ) {
      return res.status(200).json({
        message: "Scan déjà pris en compte"
      });
    }

    // 🔵 Gestion sortie
    if (!presence.heure_sortie) {
      const autorisationRows = await query(
        `SELECT 1 FROM attendance_adjustments
         WHERE id_presence = ? AND type = 'AUTORISATION_SORTIE' AND statut = 'VALIDE'`,
        [presence.id_presence]
      );
      const autorisation = autorisationRows?.length > 0;
      if (heurePointage.isBefore(finTravail) && !autorisation) {
        return res.status(403).json({
          message: "Sortie anticipée non autorisée"
        });
      }

      let heures_supplementaires = 0;

      if (heurePointage.isAfter(finTravail)) {
        heures_supplementaires = Number(
          (heurePointage.diff(finTravail, "minutes") / 60).toFixed(2)
        );
      }

      await query(
        `UPDATE presences
         SET heure_sortie = ?,
             heures_supplementaires = ?
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

    return res.status(409).json({
      message: "Présence déjà complète"
    });

  } catch (error) {
    console.error("postPresenceFromHikvision:", error);
    return res.status(500).json({
      message: "Erreur interne serveur"
    });
  }
}; */

exports.postPresenceFromHikvision = async (req, res) => {
  try {
    const payload = req.body;

    const user_code =
      payload.employeeNoString ||
      payload?.AcsEvent?.employeeNoString ||
      payload?.AcsEvent?.info?.[0]?.employeeNoString;

    const datetime =
      payload.time ||
      payload?.AcsEvent?.time ||
      payload?.AcsEvent?.info?.[0]?.time;

    const device_sn =
      payload.device_sn ||
      payload.deviceSerialNo ||
      payload?.AcsEvent?.deviceSerialNo ||
      payload?.AcsEvent?.info?.[0]?.deviceSerialNo;

    if (!device_sn || !user_code || !datetime) {
      return res.status(400).json({
        message: "device_sn, user_code et datetime requis"
      });
    }

    // Récupération de l'utilisateur
    const users = await query(
      `SELECT id_utilisateur FROM utilisateur WHERE matricule = ?`,
      [user_code]
    );

    if (!users.length) {
      return res.status(404).json({ message: "Utilisateur inconnu" });
    }

    const id_utilisateur = users[0].id_utilisateur;

    // parseZone conserve le fuseau reçu
    const heurePointage = moment.parseZone(datetime);
    const dateISO = heurePointage.format("YYYY-MM-DD"); // pour DB et planning

    // Vérification terminal autorisé
    const terminals = await query(
      `SELECT t.id_terminal, t.site_id, t.device_sn
       FROM user_terminals ut
       JOIN terminals t ON ut.terminal_id = t.id_terminal
       JOIN utilisateur u ON ut.user_id = u.id_utilisateur
       WHERE u.matricule = ?`,
      [user_code]
    );

    if (!terminals.length)
      return res.status(403).json({ message: "Aucun terminal autorisé" });

    const terminalAutorise = terminals.find(t => t.device_sn === device_sn);

    if (!terminalAutorise)
      return res.status(403).json({ message: "Terminal non autorisé" });

    // Vérification planning
    const jourNom = heurePointage.locale("fr").format("dddd").toUpperCase();
    const planningRows = await query(
      `SELECT hu.id_horaire_user, hd.jour_semaine, hd.heure_debut, hd.heure_fin, hd.tolerance_retard
       FROM horaire_user hu
       JOIN horaire_detail hd ON hd.horaire_id = hu.horaire_id
       WHERE hu.user_id = ? AND hd.jour_semaine = ? AND hu.date_debut <= ? AND (hu.date_fin IS NULL OR hu.date_fin >= ?)`,
      [id_utilisateur, jourNom, dateISO, dateISO]
    );

    const jourNonTravaille = planningRows.length === 0;
    const hd = planningRows[0]; // undefined si jour non travaillé

    const debutTravail = hd
      ? moment(`${dateISO} ${hd.heure_debut}`, "YYYY-MM-DD HH:mm:ss")
      : null;
    const finTravail = hd
      ? moment(`${dateISO} ${hd.heure_fin}`, "YYYY-MM-DD HH:mm:ss")
      : null;

    // Vérification jours fériés
    const ferieRows = await query(`SELECT 1 FROM jours_feries WHERE date_ferie = ?`, [dateISO]);
    if (ferieRows.length)
      return res.status(403).json({ message: "Pointage interdit : jour férié" });

    // Vérification absence validée
    const absenceRows = await query(
      `SELECT 1 FROM absences WHERE id_utilisateur = ? AND statut = 'VALIDEE' AND ? BETWEEN date_debut AND date_fin`,
      [id_utilisateur, dateISO]
    );
    if (absenceRows.length)
      return res.status(403).json({ message: "Pointage interdit : absence validée" });

    // Vérifier présence existante
    const presenceRows = await query(
      `SELECT id_presence, heure_entree, heure_sortie, is_locked, statut_jour
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    const presence = presenceRows[0] || null;
    if (presence?.is_locked)
      return res.status(403).json({ message: "Présence verrouillée" });

    // Calcul retard si jour travaillé
    let retard_minutes = 0;
    if (!jourNonTravaille && hd) {
      const diff = heurePointage.diff(debutTravail, "minutes");
      retard_minutes = diff > (hd.tolerance_retard || 0) ? diff : 0;
    }

    // --- Gestion ABSENT → PRESENT ou nouveau pointage ---
    const statutJour = jourNonTravaille ? 'SUPPLEMENTAIRE' : 'PRESENT';
    let heures_supplementaires = 0;

    // Si ABSENT → PRESENT
    if (
      presence &&
      (presence.statut_jour === "ABSENT" || presence.statut_jour === "JOUR_NON_TRAVAILLE")
    ) {
      await query(
        `UPDATE presences SET heure_entree = ?, statut_jour = ?, retard_minutes = ? WHERE id_presence = ?`,
        [
          heurePointage.utc().format("YYYY-MM-DD HH:mm:ss"),
          statutJour,
          retard_minutes,
          presence.id_presence
        ]
      );
      return res.status(200).json({ message: "ABSENT corrigé", retard_minutes });
    }

    // Nouvelle entrée
    if (!presence) {
      await query(
        `INSERT INTO presences (
          id_utilisateur, site_id, date_presence, heure_entree,
          retard_minutes, heures_supplementaires, source, terminal_id, device_sn, statut_jour
        ) VALUES (?, ?, ?, ?, ?, ?, 'HIKVISION', ?, ?, ?)`,
        [
          id_utilisateur,
          terminalAutorise.site_id,
          dateISO,
          heurePointage.utc().format("YYYY-MM-DD HH:mm:ss"),
          retard_minutes,
          heures_supplementaires,
          terminalAutorise.id_terminal,
          device_sn,
          statutJour
        ]
      );

      return res.status(201).json({ message: "Entrée enregistrée", retard_minutes });
    }

    // Protection doublon
    if (presence.heure_entree && !presence.heure_sortie && moment(presence.heure_entree).isSame(heurePointage, "minute")) {
      return res.status(200).json({ message: "Scan déjà pris en compte" });
    }

    // Gestion sortie
    if (!presence.heure_sortie) {
      let heures_sup = 0;
      if (jourNonTravaille) {
        heures_sup = Number(heurePointage.diff(moment(presence.heure_entree), "hours", true).toFixed(2));
      } else if (hd && heurePointage.isAfter(finTravail)) {
        heures_sup = Number((heurePointage.diff(finTravail, "minutes") / 60).toFixed(2));
      }

      await query(
        `UPDATE presences SET heure_sortie = ?, heures_supplementaires = ? WHERE id_presence = ?`,
        [
          heurePointage.utc().format("YYYY-MM-DD HH:mm:ss"),
          heures_sup,
          presence.id_presence
        ]
      );

      return res.status(200).json({ message: "Sortie enregistrée", heures_supplementaires: heures_sup });
    }

    return res.status(409).json({ message: "Présence déjà complète" });

  } catch (error) {
    console.error("postPresenceFromHikvision:", error);
    return res.status(500).json({ message: "Erreur interne serveur" });
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

//DASHBOARD PRESENCE
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

    const kpiPromise = query(`
      SELECT
        COUNT(*) AS total,
        SUM(p.statut_jour = 'PRESENT') AS presents,
        SUM(p.statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')) AS absences_totales,

        SUM(p.retard_minutes > 0) AS retards,
        ROUND(
          (SUM(p.statut_jour = 'PRESENT') / NULLIF(COUNT(*), 0)) * 100,
          2
        ) AS taux_presence,
        ROUND(
          AVG(CASE WHEN p.retard_minutes > 0 THEN p.retard_minutes END),
          2
        ) AS retard_moyen
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence = CURDATE()
        AND u.show_in_presence = 1
    `);

    /* ================= RÉPARTITION PAR STATUT ================= */
    const statutsPromise = query(`
      SELECT 
        p.statut_jour AS label, 
        COUNT(*) AS value
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence = CURDATE()
        AND u.show_in_presence = 1
      GROUP BY p.statut_jour
    `);

    /* ================= ÉVOLUTION 7 DERNIERS JOURS ================= */
    const evolutionPromise = query(`
      SELECT 
        p.date_presence AS date,
        SUM(p.statut_jour = 'PRESENT') AS presents,
        SUM(p.statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')) AS absents
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND u.show_in_presence = 1
      GROUP BY p.date_presence
      ORDER BY p.date_presence
    `);

    /* ================= EMPLOYÉS DU JOUR ================= */
    const employesPromise = query(`
      SELECT 
          u.nom,
          u.prenom,
          u.email,
          p.statut_jour,
          p.heure_entree,
          p.heure_sortie,
          p.retard_minutes,
          CASE
              WHEN p.statut_jour = 'PRESENT' AND p.retard_minutes > 0 THEN 'RETARD'
              WHEN p.statut_jour = 'PRESENT' AND p.retard_minutes = 0 THEN 'A_L_HEURE'
              WHEN p.statut_jour = 'SUPPLEMENTAIRE' THEN 'SUPPLEMENTAIRE'
              ELSE p.statut_jour
          END AS statut_affiche
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.date_presence = CURDATE()
        AND u.show_in_presence = 1
      ORDER BY 
          CASE WHEN p.heure_entree IS NULL THEN 1 ELSE 0 END,
          p.heure_entree ASC
    `);

    /* ================= TOP ABSENCES (30 JOURS) ================= */
    const topAbsencesPromise = query(`
      SELECT 
        u.nom,
        u.prenom,
        u.email,
        COUNT(*) AS total_absences
      FROM presences p
      JOIN utilisateur u ON u.id_utilisateur = p.id_utilisateur
      WHERE p.statut_jour IN ('ABSENT', 'ABSENCE_JUSTIFIEE')
        AND p.date_presence >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        AND u.show_in_presence = 1
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
          total: kpiRows[0]?.total || 0,
          presents: kpiRows[0]?.presents || 0,
          absencesTotales: kpiRows[0]?.absences_totales || 0,
          retards: kpiRows[0]?.retards || 0,
          tauxPresence: kpiRows[0]?.taux_presence || 0,
          retardMoyen: kpiRows[0]?.retard_moyen || 0
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

exports.getPresentDashboardSiteDetail = async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');

    // 1️⃣ Récupérer tous les sites avec leurs utilisateurs
    const sitesWithUsers = await query(`
      SELECT s.id_site, s.nom_site, us.user_id
      FROM sites s
      LEFT JOIN user_sites us ON s.id_site = us.site_id
    `);

    // Grouper utilisateurs par site
    const siteMap = {};
    sitesWithUsers.forEach(row => {
      if (!siteMap[row.id_site]) {
        siteMap[row.id_site] = {
          site_id: row.id_site,
          site_name: row.nom_site,
          users: []
        };
      }
      if (row.user_id) siteMap[row.id_site].users.push(row.user_id);
    });

    const allUserIds = sitesWithUsers.map(u => u.user_id).filter(Boolean);

    // 2️⃣ Récupérer toutes les présences du jour pour tous les utilisateurs d'un coup
    const presences = allUserIds.length
      ? await query(`
          SELECT id_utilisateur, site_id, statut_jour, retard_minutes
          FROM presences
          WHERE date_presence = ?
        `, [today])
      : [];

    // 3️⃣ Construire résultat
    const result = Object.values(siteMap).map(site => {
      const totalUsers = site.users.length;
      const sitePresences = presences.filter(p => p.site_id === site.site_id);

      let presentCount = 0, retardCount = 0, absentCount = 0, justifieCount = 0;

      sitePresences.forEach(p => {
        if (p.statut_jour === 'PRESENT') {
          presentCount++;
          if (p.retard_minutes > 0) retardCount++;
        } else if (p.statut_jour === 'ABSENT') {
          absentCount++;
        } else if (p.statut_jour === 'ABSENCE_JUSTIFIEE') {
          justifieCount++;
        }
      });

      const presentPct = totalUsers ? ((presentCount / totalUsers) * 100).toFixed(2) : 0;
      const retardPct = presentCount ? ((retardCount / presentCount) * 100).toFixed(2) : 0;
      const absencePct = totalUsers ? (((absentCount + justifieCount) / totalUsers) * 100).toFixed(2) : 0;

      return {
        site_id: site.site_id,
        site_name: site.site_name,
        total_users: totalUsers,
        present: { count: presentCount, pct: Number(presentPct) },
        retard: { count: retardCount, pct: Number(retardPct) },
        absence: { absent: absentCount, justifie: justifieCount, pct: Number(absencePct) }
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[DASHBOARD] ERROR', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

exports.getPresentDashboardSiteDetailBySite = async (req, res) => {
  try {
    const { siteId } = req.query;
    const today = moment().format('YYYY-MM-DD');

    // 1️⃣ Récupérer tous les utilisateurs du site
    const users = await query(
      `SELECT u.id_utilisateur, u.nom, u.prenom
       FROM utilisateur u
       INNER JOIN user_sites us ON u.id_utilisateur = us.user_id
       WHERE us.site_id = ?`,
      [siteId]
    );

    const userIds = users.map(u => u.id_utilisateur);
    if (!userIds.length) return res.json({ success: true, data: [] });

    // 2️⃣ Récupérer leurs présences
    const presences = await query(
      `SELECT id_utilisateur, statut_jour, retard_minutes, heure_entree, heure_sortie
       FROM presences
       WHERE id_utilisateur IN (?) AND date_presence = ?`,
      [userIds, today]
    );

    // 3️⃣ Construire le JSON détaillé avec heures en GMT
    const details = users.map(u => {
      const p = presences.find(p => p.id_utilisateur === u.id_utilisateur);

      let heureEntreeGMT = null;
      let heureSortieGMT = null;

      if (p?.heure_entree) {
        heureEntreeGMT = moment.utc(p.heure_entree).format('HH:mm:ss [GMT]');
      }
      if (p?.heure_sortie) {
        heureSortieGMT = moment.utc(p.heure_sortie).format('HH:mm:ss [GMT]');
      }

      return {
        id_utilisateur: u.id_utilisateur,
        nom_complet: `${u.nom} ${u.prenom}`,
        statut: p ? p.statut_jour : 'ABSENT',
        retard_minutes: p ? p.retard_minutes : 0,
        heure_entree_gmt: heureEntreeGMT,
        heure_sortie_gmt: heureSortieGMT,
        is_present: p && p.statut_jour === 'PRESENT'
      };
    });

    return res.json({ success: true, data: details });

  } catch (error) {
    console.error('[DETAIL SITE] ERROR', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// controllers/dashboardController.js
exports.getDashboardStastique = async (req, res) => {
  try {
    const siteId = req.query.site_id || null; // filtrage optionnel par site

    const siteFilter = siteId ? `AND p.site_id = ${siteId}` : '';

    // 1️⃣ Entrées / Sorties par heure
    const entreeSortie = await query(`
      SELECT 
        HOUR(p.heure_entree) AS heure,
        SUM(CASE WHEN p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS entrees,
        SUM(CASE WHEN p.heure_sortie IS NOT NULL AND p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS sorties
      FROM presences p
      WHERE p.date_presence = CURDATE()
        ${siteFilter}
        AND p.heure_entree IS NOT NULL
      GROUP BY HOUR(p.heure_entree)
      ORDER BY heure
    `);

    const alertes = await query(`
      SELECT 
        'Pointage hors géofence' as titre,
        s.nom_site as location,
        DATE_FORMAT(p.heure_entree, '%H:%i') as heure,
        'GPS hors zone' as description,
        'Ouvrir' as action,
        CASE 
          WHEN p.retard_minutes > 30 THEN 'critical'
          WHEN p.retard_minutes > 15 THEN 'warning'
          ELSE 'info'
        END as type
      FROM presences p
      LEFT JOIN sites s ON p.site_id = s.id_site
      WHERE p.date_presence = CURDATE()
        AND p.retard_minutes > 15
        AND p.statut_jour = 'PRESENT'

      UNION ALL
      
      SELECT 
        'Absence non signalée' as titre,
        s.nom_site as location,
        '08:20' as heure,
        'Non notifié' as description,
        'Examiner' as action,
        'warning' as type
      FROM presences p
      LEFT JOIN sites s ON p.site_id = s.id_site
      WHERE p.date_presence = CURDATE()
        AND p.statut_jour = 'ABSENT'
      
      UNION ALL
      
      SELECT 
        'Queue offline détectée' as titre,
        COALESCE(s.nom_site, CONCAT('Terminal ', p.terminal_id)) as location,
        DATE_FORMAT(p.created_at, '%H:%i') as heure,
        CONCAT(p.retard_minutes, ' événements en attente') as description,
        'Voir' as action,
        'info' as type
      FROM presences p
      LEFT JOIN sites s ON p.site_id = s.id_site
      WHERE p.date_presence = CURDATE()
        AND p.updated_at > DATE_ADD(p.created_at, INTERVAL 1 HOUR)
      LIMIT 3
    `);

    // 3️⃣ Présence par site
    const presenceSite = await query(`
      SELECT 
        s.id_site,
        s.nom_site,
        s.CodeSite,
        s.IdVille,
        COUNT(p.id_presence) AS total_presences,
        ROUND(COUNT(p.id_presence) * 100.0 / (
          SELECT COUNT(*) FROM presences 
          WHERE date_presence = CURDATE()
            AND statut_jour = 'PRESENT'
            ${siteFilter}
        ), 2) AS pourcentage
      FROM sites s
      LEFT JOIN presences p 
        ON s.id_site = p.site_id 
        AND p.date_presence = CURDATE()
        AND p.statut_jour = 'PRESENT'
        ${siteFilter}
      GROUP BY s.id_site, s.nom_site, s.CodeSite, s.IdVille
      ORDER BY total_presences DESC
    `);

    // 4️⃣ Statistiques globales
    const [globalStats] = await query(`
      SELECT 
        COUNT(*) AS total_presences_jour,
        SUM(CASE WHEN statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS presents,
        SUM(CASE WHEN retard_minutes > 0 AND statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS retards,
        SUM(CASE WHEN statut_jour = 'ABSENT' THEN 1 ELSE 0 END) AS absents,
        (SELECT COUNT(*) FROM sites) AS total_sites
      FROM presences p
      WHERE p.date_presence = CURDATE()
        ${siteFilter}
    `);

    // 5️⃣ Stats par ville
    const statsParVille = await query(`
      SELECT 
        s.IdVille,
        COUNT(p.id_presence) AS total_presences,
        SUM(CASE WHEN p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS presents,
        SUM(CASE WHEN p.retard_minutes > 0 THEN 1 ELSE 0 END) AS retards,
        SUM(CASE WHEN p.statut_jour = 'ABSENT' THEN 1 ELSE 0 END) AS absents
      FROM sites s
      LEFT JOIN presences p 
        ON s.id_site = p.site_id 
        AND p.date_presence = CURDATE()
        ${siteFilter}
      GROUP BY s.IdVille
    `);

    // 6️⃣ Événements par heure
    const evenements = await query(`
      SELECT 
        HOUR(p.created_at) AS heure,
        SUM(CASE WHEN p.retard_minutes > 0 AND p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS retards,
        SUM(CASE WHEN p.statut_jour = 'ABSENT' THEN 1 ELSE 0 END) AS absents
      FROM presences p
      WHERE p.date_presence = CURDATE()
        ${siteFilter}
      GROUP BY HOUR(p.created_at)
      ORDER BY heure
    `);

    // 7️⃣ Présents maintenant
    const presentsNow = await query(`
      SELECT 
        s.id_site,
        s.nom_site,
        s.CodeSite,
        COUNT(p.id_presence) AS presents_par_site
      FROM presences p
      LEFT JOIN sites s ON p.site_id = s.id_site
      WHERE p.date_presence = CURDATE()
        AND p.heure_entree IS NOT NULL
        AND p.heure_sortie IS NULL
        AND p.statut_jour = 'PRESENT'
        ${siteFilter}
      GROUP BY s.id_site, s.nom_site, s.CodeSite
    `);

    // 8️⃣ Attendus par site
    const attendus = await query(`
      SELECT 
        s.id_site,
        s.nom_site,
        COUNT(p.id_presence) AS attendus_par_site
      FROM presences p
      LEFT JOIN sites s ON p.site_id = s.id_site
      WHERE p.date_presence = CURDATE()
        ${siteFilter}
      GROUP BY s.id_site, s.nom_site
    `);

    // 9️⃣ Top sites par présence
    const topSites = await query(`
      SELECT 
        s.nom_site,
        s.CodeSite,
        s.adress,
        COUNT(p.id_presence) AS total_presences,
        ROUND(AVG(CASE WHEN p.retard_minutes > 0 THEN p.retard_minutes ELSE 0 END), 2) AS moyenne_retard
      FROM sites s
      LEFT JOIN presences p 
        ON s.id_site = p.site_id 
        AND p.date_presence = CURDATE()
        AND p.statut_jour = 'PRESENT'
        ${siteFilter}
      GROUP BY s.id_site, s.nom_site, s.CodeSite, s.adress
      HAVING total_presences > 0
      ORDER BY total_presences DESC
      LIMIT 5
    `);

    // 🔹 Formatage pour le front
    const dashboardData = {
      live: {
        presentsNow: {
          total: presentsNow.reduce((acc, curr) => acc + parseInt(curr.presents_par_site || 0, 10), 0),
          parSite: presentsNow.map(item => ({
            site: item.nom_site,
            code: item.CodeSite,
            count: parseInt(item.presents_par_site || 0, 10)
          }))
        },
        attendus: {
          total: attendus.reduce((acc, curr) => acc + parseInt(curr.attendus_par_site || 0, 10), 0),
          parSite: attendus.map(item => ({
            site: item.nom_site,
            count: parseInt(item.attendus_par_site || 0, 10)
          }))
        }
      },
      entreeSortie: entreeSortie.map(item => ({
        heure: `${item.heure.toString().padStart(2, '0')}:00`,
        entrees: parseInt(item.entrees || 0, 10),
        sorties: parseInt(item.sorties || 0, 10)
      })),
      alertes: alertes.map(a => ({
        ...a,
        location: a.location || 'Site inconnu'
      })),
      presenceSite: presenceSite.map(item => ({
        id_site: item.id_site,
        site: item.nom_site,
        codeSite: item.CodeSite,
        ville: item.IdVille,
        value: parseInt(item.total_presences || 0, 10),
        percentage: parseFloat(item.pourcentage || 0),
        color: getSiteColor(item.id_site)
      })),
      globalStats: {
        presents: parseInt(globalStats.presents || 0, 10),
        retards: parseInt(globalStats.retards || 0, 10),
        absents: parseInt(globalStats.absents || 0, 10),
        totalPresences: parseInt(globalStats.total_presences_jour || 0, 10),
        totalSites: parseInt(globalStats.total_sites || 0, 10)
      },
      statsParVille: statsParVille.map(item => ({
        ville: item.IdVille || 'Non définie',
        presents: parseInt(item.presents || 0, 10),
        retards: parseInt(item.retards || 0, 10),
        absents: parseInt(item.absents || 0, 10),
        total: parseInt(item.total_presences || 0, 10)
      })),
      evenements: evenements.map(item => ({
        heure: `${item.heure.toString().padStart(2, '0')}h`,
        retards: parseInt(item.retards || 0, 10),
        absents: parseInt(item.absents || 0, 10)
      })),
      topSites: topSites.map(item => ({
        nom_site: item.nom_site,
        codeSite: item.CodeSite,
        adress: item.adress,
        totalPresences: parseInt(item.total_presences || 0, 10),
        moyenneRetard: parseFloat(item.moyenne_retard || 0)
      }))
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Erreur dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données du dashboard',
      error: error.message
    });
  }
};

exports.getDashboardPerformance = async (req, res) => {
  try {
    const { site_id, date_debut, date_fin } = req.query;
    
    // Définir la période d'analyse - CORRECTION: utiliser des formats ISO valides
    const aujourdhui = new Date();
    
    // Formatage des dates en YYYY-MM-DD (format ISO valide)
    const formatDateISO = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const debutMois = date_debut || formatDateISO(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1));
    const finMois = date_fin || formatDateISO(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0));
    
    // Calculer le nombre de jours dans la période
    const joursOuvrables = Math.ceil((new Date(finMois) - new Date(debutMois)) / (1000 * 60 * 60 * 24)) + 1;
    
    // Construire la condition site_id si fourni
    const siteCondition = site_id ? `AND us.site_id = ${parseInt(site_id)}` : '';
    
    // 1. KPIs Globaux avec calcul des retards basé sur les horaires individuels
    const kpiQuery = `
      SELECT 
        COUNT(DISTINCT u.id_utilisateur) as total_employes,
        SUM(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 ELSE 0 END) as presences_reelles,
        SUM(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN 1 ELSE 0 END) as presences_avec_retard,
        SUM(p.retard_minutes) as total_retards,
        AVG(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN p.retard_minutes END) as retard_moyen,
        SUM(p.heures_supplementaires) as total_heures_sup,
        SUM(TIMESTAMPDIFF(HOUR, p.heure_entree, p.heure_sortie)) as total_heures_travaillees
      FROM utilisateur u
      LEFT JOIN user_sites us ON u.id_utilisateur = us.user_id
      LEFT JOIN presences p ON u.id_utilisateur = p.id_utilisateur 
        AND p.date_presence BETWEEN ? AND ?
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      WHERE u.show_in_presence = 1
      ${siteCondition}
    `;
    
    const kpiResults = await query(kpiQuery, [debutMois, finMois]);
    const kpi = kpiResults[0] || {};
    
    // 2. KPIs mois précédent pour évolution
    const dateDebutMois = new Date(debutMois + 'T00:00:00'); // Ajout du T pour format ISO
    const moisPrecedent = new Date(dateDebutMois.getFullYear(), dateDebutMois.getMonth() - 1, 1);
    const finMoisPrecedent = new Date(dateDebutMois.getFullYear(), dateDebutMois.getMonth(), 0);
    
    const debutMoisPrecedent = formatDateISO(moisPrecedent);
    const finMoisPrecedentFormatted = formatDateISO(finMoisPrecedent);
    
    const evolutionQuery = `
      SELECT 
        COUNT(DISTINCT u.id_utilisateur) as total_employes_prec,
        SUM(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 ELSE 0 END) as presences_reelles_prec,
        SUM(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN 1 ELSE 0 END) as presences_avec_retard_prec,
        SUM(p.retard_minutes) as total_retards_prec,
        SUM(TIMESTAMPDIFF(HOUR, p.heure_entree, p.heure_sortie)) as total_heures_travaillees_prec
      FROM presences p
      JOIN utilisateur u ON p.id_utilisateur = u.id_utilisateur
      LEFT JOIN user_sites us ON u.id_utilisateur = us.user_id
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      WHERE p.date_presence BETWEEN ? AND ?
      AND u.show_in_presence = 1
      ${siteCondition}
    `;
    
    const evolutionResults = await query(evolutionQuery, [debutMoisPrecedent, finMoisPrecedentFormatted]);
    const evolution = evolutionResults[0] || {};
    
    // Calcul des taux pour la période actuelle
    const tauxPresence = kpi.total_employes ? 
      (kpi.presences_reelles / (kpi.total_employes * joursOuvrables) * 100) : 0;
    
    const tauxPonctualite = kpi.presences_reelles ? 
      ((kpi.presences_reelles - kpi.presences_avec_retard) / kpi.presences_reelles * 100) : 0;
    
    const tauxActivite = kpi.total_employes ? 
      (kpi.total_heures_travaillees / (kpi.total_employes * joursOuvrables * 8) * 100) : 0;
    
    // Calcul des taux pour la période précédente
    const tauxPresencePrec = evolution.total_employes_prec ? 
      (evolution.presences_reelles_prec / (evolution.total_employes_prec * joursOuvrables) * 100) : 0;
    
    const tauxPonctualitePrec = evolution.presences_reelles_prec ? 
      ((evolution.presences_reelles_prec - evolution.presences_avec_retard_prec) / evolution.presences_reelles_prec * 100) : 0;
    
    const tauxActivitePrec = evolution.total_employes_prec ? 
      (evolution.total_heures_travaillees_prec / (evolution.total_employes_prec * joursOuvrables * 8) * 100) : 0;
    
    // 3. Performances par site
    const sitesQuery = `
      SELECT 
        s.id_site as site_id,
        s.nom_site as site_nom,
        COUNT(DISTINCT u.id_utilisateur) as employes_total,
        COUNT(DISTINCT CASE WHEN p.date_presence = CURRENT_DATE() THEN u.id_utilisateur END) as employes_presents,
        ROUND(
          COALESCE(SUM(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 ELSE 0 END), 0) / 
          NULLIF(COUNT(DISTINCT u.id_utilisateur) * ?, 0) * 100, 
        1) as taux_presence,
        COALESCE(SUM(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN 1 ELSE 0 END), 0) as total_retards,
        ROUND(COALESCE(AVG(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN p.retard_minutes END), 0), 1) as retard_moyen,
        ROUND(
          (COALESCE(SUM(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 ELSE 0 END), 0) / 
           NULLIF(COUNT(DISTINCT u.id_utilisateur) * ?, 0) * 100 * 0.6) +
          ((100 - (COALESCE(AVG(CASE 
            WHEN p.retard_minutes > 0 
            OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
            THEN p.retard_minutes END), 0) / 60 * 100)) * 0.4), 
        1) as performance
      FROM sites s
      LEFT JOIN user_sites us ON s.id_site = us.site_id
      LEFT JOIN utilisateur u ON us.user_id = u.id_utilisateur AND u.show_in_presence = 1
      LEFT JOIN presences p ON u.id_utilisateur = p.id_utilisateur 
        AND p.date_presence BETWEEN ? AND ?
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      GROUP BY s.id_site, s.nom_site
      HAVING employes_total > 0
      ORDER BY performance DESC
    `;
    
    const sitesResults = await query(sitesQuery, [joursOuvrables, joursOuvrables, debutMois, finMois]);
    
    // 4. Top performeurs
    const topQuery = `
      SELECT 
        u.id_utilisateur as id,
        u.nom,
        u.prenom,
        COALESCE(s.nom_site, 'Non assigné') as site,
        ROUND(COALESCE(COUNT(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 END), 0) / ? * 100, 1) as taux_presence,
        COALESCE(COUNT(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN 1 END), 0) as jours_retard,
        ROUND(COALESCE(AVG(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN p.retard_minutes END), 0), 1) as retard_moyen,
        ROUND(COALESCE(SUM(p.heures_supplementaires), 0), 1) as heures_sup
      FROM utilisateur u
      LEFT JOIN user_sites us ON u.id_utilisateur = us.user_id
      LEFT JOIN sites s ON us.site_id = s.id_site
      LEFT JOIN presences p ON u.id_utilisateur = p.id_utilisateur 
        AND p.date_presence BETWEEN ? AND ?
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      WHERE u.show_in_presence = 1
      ${siteCondition}
      GROUP BY u.id_utilisateur, u.nom, u.prenom, s.nom_site
      HAVING taux_presence >= 98 AND (retard_moyen <= 5 OR retard_moyen = 0)
      ORDER BY taux_presence DESC, retard_moyen ASC
      LIMIT 5
    `;
    
    const topResults = await query(topQuery, [joursOuvrables, debutMois, finMois]);
    
    // 5. Agents à problème
    const problemeQuery = `
      SELECT 
        u.id_utilisateur as id,
        u.nom,
        u.prenom,
        COALESCE(s.nom_site, 'Non assigné') as site,
        ROUND(COALESCE(COUNT(CASE WHEN p.statut_jour IN ('PRESENT', 'SUPPLEMENTAIRE') THEN 1 END), 0) / ? * 100, 1) as taux_presence,
        COALESCE(COUNT(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN 1 END), 0) as jours_retard,
        COALESCE(SUM(p.retard_minutes), 0) as total_minutes_retard,
        ROUND(COALESCE(AVG(CASE 
          WHEN p.retard_minutes > 0 
          OR (p.heure_entree > CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')))
          THEN p.retard_minutes END), 0), 1) as retard_moyen,
        COALESCE(COUNT(CASE WHEN p.statut_jour = 'ABSENT' THEN 1 END), 0) as jours_absence
      FROM utilisateur u
      LEFT JOIN user_sites us ON u.id_utilisateur = us.user_id
      LEFT JOIN sites s ON us.site_id = s.id_site
      LEFT JOIN presences p ON u.id_utilisateur = p.id_utilisateur 
        AND p.date_presence BETWEEN ? AND ?
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      WHERE u.show_in_presence = 1
      ${siteCondition}
      GROUP BY u.id_utilisateur, u.nom, u.prenom, s.nom_site
      HAVING taux_presence < 80 OR retard_moyen > 30
      ORDER BY taux_presence ASC, retard_moyen DESC
      LIMIT 5
    `;
    
    const problemeResults = await query(problemeQuery, [joursOuvrables, debutMois, finMois]);
    
    // 6. Statistiques supplémentaires
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN p.statut_jour = 'ABSENT' THEN p.id_utilisateur END) as employes_absents,
        COUNT(DISTINCT CASE 
          WHEN p.retard_minutes > 30 
          OR TIMESTAMPDIFF(MINUTE, CONCAT(p.date_presence, ' ', COALESCE(hd.heure_debut, '08:00:00')), p.heure_entree) > 30
          THEN p.id_utilisateur END) as employes_gros_retard,
        SUM(CASE WHEN p.statut_jour = 'ABSENCE_JUSTIFIEE' THEN 1 ELSE 0 END) as absences_justifiees,
        SUM(p.heures_supplementaires) as total_heures_sup_periode
      FROM presences p
      JOIN utilisateur u ON p.id_utilisateur = u.id_utilisateur
      LEFT JOIN user_sites us ON u.id_utilisateur = us.user_id
      LEFT JOIN horaire_user hu ON u.id_utilisateur = hu.user_id 
        AND hu.date_debut <= p.date_presence 
        AND (hu.date_fin IS NULL OR hu.date_fin >= p.date_presence)
      LEFT JOIN horaire_detail hd ON hu.horaire_id = hd.horaire_id 
        AND DAYNAME(p.date_presence) = hd.jour_semaine
      WHERE p.date_presence BETWEEN ? AND ?
      AND u.show_in_presence = 1
      ${siteCondition}
    `;
    
    const statsResults = await query(statsQuery, [debutMois, finMois]);
    const stats = statsResults[0] || {};

    // 7. Utilisateur
    const userQuery = `SELECT u.id_utilisateur, u.nom, u.prenom
                          FROM utilisateur u WHERE u.show_in_presence = 1`;

    const userResults = await query(userQuery);

    // Construire la réponse
    const response = {
      success: true,
      data: {
        metadata: {
          periode: {
            debut: debutMois,
            fin: finMois,
            jours_ouvrables: joursOuvrables
          },
          date_generation: new Date().toISOString()
        },
        kpi_globaux: {
          taux_presence: Math.round(tauxPresence * 10) / 10,
          taux_ponctualite: Math.round(tauxPonctualite * 10) / 10,
          taux_activite: Math.round(tauxActivite * 10) / 10,
          total_retards: kpi.total_retards || 0,
          retard_moyen: Math.round(kpi.retard_moyen || 0),
          evolution_presence: Math.round((tauxPresence - tauxPresencePrec) * 10) / 10,
          evolution_ponctualite: Math.round((tauxPonctualite - tauxPonctualitePrec) * 10) / 10,
          evolution_activite: Math.round((tauxActivite - tauxActivitePrec) * 10) / 10,
          total_heures_sup: stats.total_heures_sup_periode || 0,
          employes_absents: stats.employes_absents || 0,
          absences_justifiees: stats.absences_justifiees || 0
        },
        performances_sites: sitesResults.map(site => ({
          ...site,
          key: site.site_id
        })),
        top_performeurs: topResults.map(emp => ({
          ...emp,
          key: emp.id
        })),
        agents_probleme: problemeResults.map(emp => ({
          ...emp,
          key: emp.id
        })),
        userResults
      }
    };
    
    res.status(200).json(response);

  } catch (error) {
    console.error('Erreur dans getDashboardPerformance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données de performance',
      error: error.message
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
      h.id_horaire,
      h.nom,
      h.description,
      h.created_at,
      hd.id_detail,
      hd.jour_semaine,
      hd.heure_debut,
      hd.heure_fin,
      hd.tolerance_retard
    FROM horaire h
    LEFT JOIN horaire_detail hd 
      ON hd.horaire_id = h.id_horaire
    ORDER BY h.id_horaire,
             FIELD(hd.jour_semaine, 
               'LUNDI','MARDI','MERCREDI',
               'JEUDI','VENDREDI','SAMEDI','DIMANCHE'
             )
  `;

  db.query(q, (error, rows) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des horaires."
      });
    }

    // 🔹 Regroupement des détails par horaire
    const horaires = [];
    const map = {};

    rows.forEach(row => {
      if (!map[row.id_horaire]) {
        map[row.id_horaire] = {
          id_horaire: row.id_horaire,
          nom: row.nom,
          description: row.description,
          created_at: row.created_at,
          details: []
        };
        horaires.push(map[row.id_horaire]);
      }

      if (row.id_detail) {
        map[row.id_horaire].details.push({
          id_detail: row.id_detail,
          jour_semaine: row.jour_semaine,
          heure_debut: row.heure_debut,
          heure_fin: row.heure_fin,
          tolerance_retard: row.tolerance_retard
        });
      }
    });

    return res.status(200).json(horaires);
  });
};

exports.getHoraireUser = (req, res) => {
  const q = `
    SELECT 
      hu.id_horaire_user AS id_planning,
      u.nom AS utilisateur_nom,
      u.prenom AS utilisateur_prenom,
      hu.date_debut,
      hu.date_fin,
      h.nom AS horaire_nom,
      hd.jour_semaine,
      hd.heure_debut,
      hd.heure_fin
    FROM horaire_user hu
    JOIN utilisateur u ON u.id_utilisateur = hu.user_id
    JOIN horaire h ON h.id_horaire = hu.horaire_id
    LEFT JOIN horaire_detail hd ON hd.horaire_id = h.id_horaire
    ORDER BY u.nom, u.prenom, 
             FIELD(hd.jour_semaine, 'LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI','DIMANCHE')
  `;

  db.query(q, (error, data) => {
    if (error) {
      console.error(error);
      return res.status(500).json({
        message: "Erreur lors de la récupération des horaires."
      });
    }

    // 🔹 Regrouper les horaires par utilisateur et planning
    const formattedData = [];
    const map = {};

    data.forEach(row => {
      const key = row.id_planning;
      if (!map[key]) {
        map[key] = {
          id_planning: row.id_planning,
          utilisateur_nom: row.utilisateur_nom,
          utilisateur_prenom: row.utilisateur_prenom,
          date_debut: row.date_debut,
          date_fin: row.date_fin,
          horaire_nom: row.horaire_nom,
          jours: [],
        };
        formattedData.push(map[key]);
      }

      if (row.jour_semaine) {
        map[key].jours.push({
          jour: row.jour_semaine,
          heure_debut: row.heure_debut,
          heure_fin: row.heure_fin,
        });
      }
    });

    return res.status(200).json(formattedData);
  });
};

exports.createHoraire = async (req, res) => {
  const { nom, description, jours } = req.body;

  if (!jours || !Array.isArray(jours) || !jours.length) {
    return res.status(400).json({ message: "Jours avec heures sont obligatoires" });
  }

  try {
    const resultHoraire = await query(
      `INSERT INTO horaire (nom, description)
       VALUES (?, ?)`,
      [nom || `Horaire ${Date.now()}`, description || null]
    );

    const horaire_id = resultHoraire.insertId;

    for (const jour of jours) {
      if (!jour.jour_semaine || !jour.heure_debut || !jour.heure_fin) continue;

      await query(
        `INSERT INTO horaire_detail (horaire_id, jour_semaine, heure_debut, heure_fin, tolerance_retard)
         VALUES (?, ?, ?, ?, ?)`,
        [horaire_id, jour.jour_semaine, jour.heure_debut, jour.heure_fin, jour.tolerance_retard || 0]
      );
    }

    return res.status(201).json({ message: "Horaire créé avec succès", horaire_id });

  } catch (error) {
    console.error("createHoraire:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

// POST /horaire_user
exports.postHoraireUser = async (req, res) => {
  const { user_ids, horaire_id } = req.body;

  if (!user_ids || !horaire_id || !Array.isArray(user_ids) || !user_ids.length) {
    return res.status(400).json({
      success: false,
      message: "user_ids (tableau) et horaire_id sont obligatoires"
    });
  }

  try {
    // Créer les placeholders pour MySQL
    const placeholders = user_ids.map(() => "(?, ?)").join(", ");
    const values = [];
    user_ids.forEach(id => {
      values.push(id, horaire_id);
    });

    await query(
      `INSERT INTO horaire_user (user_id, horaire_id) VALUES ${placeholders}`,
      values
    );

    return res.status(201).json({
      success: true,
      message: "Horaire attribué à tous les utilisateurs avec succès"
    });
  } catch (error) {
    console.error("postHoraireUser error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur"
    });
  }
};

//Rapport par site 
exports.getRapportPresenceParSite = (req, res) => {
  const { date_debut, date_fin } = req.query;

  if (!date_debut || !date_fin) {
    return res.status(400).json({
      message: "date_debut et date_fin sont obligatoires"
    });
  }

  const q = `
    SELECT 
        s.id_site,
        s.nom_site,
        
        COUNT(p.id_presence) AS total_enregistrements,
        
        SUM(CASE WHEN p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS total_presents,
        SUM(CASE WHEN p.statut_jour = 'ABSENT' THEN 1 ELSE 0 END) AS total_absents,
        SUM(CASE WHEN p.statut_jour = 'ABSENCE_JUSTIFIEE' THEN 1 ELSE 0 END) AS total_absences_justifiees,
        SUM(CASE WHEN p.statut_jour = 'JOUR_FERIE' THEN 1 ELSE 0 END) AS total_jours_feries,
        SUM(CASE WHEN p.statut_jour = 'JOUR_NON_TRAVAILLE' THEN 1 ELSE 0 END) AS total_jours_non_travailles,
        
        SUM(p.retard_minutes) AS total_retard_minutes,
        SUM(p.heures_supplementaires) AS total_heures_supplementaires,
        
        COUNT(DISTINCT p.id_utilisateur) AS total_employes_distincts

    FROM presences p
    JOIN sites s ON s.id_site = p.site_id

    WHERE p.date_presence BETWEEN ? AND ?

    GROUP BY s.id_site, s.nom_site
    ORDER BY s.nom_site ASC
  `;

  db.query(q, [date_debut, date_fin], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: "Erreur lors de la génération du rapport"
      });
    }

    return res.status(200).json(data);
  });
};

//Rapport par departement
exports.getRapportPresenceByDepartement = async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;

    if (!date_debut || !date_fin) {
      return res.status(400).json({
        success: false,
        message: "date_debut et date_fin sont obligatoires"
      });
    }

    const departements = await query(`
      SELECT 
        u.id_departement,
        d.nom_departement,
        COUNT(DISTINCT u.id_utilisateur) AS total_users,

        SUM(CASE WHEN p.statut_jour = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN p.statut_jour = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN p.statut_jour = 'ABSENCE_JUSTIFIEE' THEN 1 ELSE 0 END) AS justifie_count,
        SUM(CASE WHEN p.retard_minutes > 0 THEN 1 ELSE 0 END) AS retard_count

      FROM utilisateur u

      LEFT JOIN presences p
        ON u.id_utilisateur = p.id_utilisateur
        AND p.date_presence BETWEEN ? AND ?

      LEFT JOIN departement d
        ON u.id_departement = d.id_departement

      GROUP BY u.id_departement, d.nom_departement
      ORDER BY d.nom_departement ASC
    `, [date_debut, date_fin]);

    const result = departements.map(dep => ({
      departement_id: dep.id_departement,
      departement_name: dep.nom_departement || 'Non défini',
      total_users: dep.total_users,

      present: {
        count: dep.present_count || 0,
        pct: dep.total_users
          ? ((dep.present_count / dep.total_users) * 100).toFixed(2)
          : 0
      },

      retard: {
        count: dep.retard_count || 0,
        pct: dep.present_count
          ? ((dep.retard_count / dep.present_count) * 100).toFixed(2)
          : 0
      },

      absence: {
        absent: dep.absent_count || 0,
        justifie: dep.justifie_count || 0,
        pct: dep.total_users
          ? (((dep.absent_count + dep.justifie_count) / dep.total_users) * 100).toFixed(2)
          : 0
      }
    }));

    return res.json({ success: true, data: result });

  } catch (error) {
    console.error('[DASHBOARD DEPARTEMENT] ERROR', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
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

    if (!site_id || !name || !device_sn || !credentials?.username || !credentials?.password) {
      return res.status(400).json({
        message: "site_id, name, device_sn et credentials requis"
      });
    }

    if (!["ATTENDANCE", "ACCESS_CONTROL", "BOTH"].includes(usage_mode)) {
      return res.status(400).json({ message: "usage_mode invalide" });
    }

    if (ip_address && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip_address)) {
      return res.status(400).json({ message: "Adresse IP invalide" });
    }

    const existing = await query(
      `SELECT id_terminal
       FROM terminals
       WHERE device_sn = ?`,
      [device_sn]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "Un terminal avec ce numéro de série existe déjà"
      });
    }

    const credentials_encrypted = encrypt(JSON.stringify(credentials));

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
        device_model || "DS-K1T804AMF",
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
    console.error("postTerminal:", error);
    return res.status(500).json({
      message: "Erreur serveur lors de l'enregistrement du terminal"
    });
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

  const today = moment().format('YYYY-MM-DD');
  const jourNom = moment().locale("fr").format("dddd").toUpperCase();
  const now = moment();

  try {

    const ferie = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ? LIMIT 1`,
      [today]
    );

    const isFerie = ferie.length > 0;

    const users = await query(`
      SELECT id_utilisateur
      FROM utilisateur
      WHERE show_in_presence = 1
    `);

    for (const user of users) {

      const { id_utilisateur } = user;

      /* =====================================================
         🔹 Récupérer site depuis user_sites
      ===================================================== */
      const siteUser = await query(
        `SELECT site_id FROM user_sites WHERE user_id = ? LIMIT 1`,
        [id_utilisateur]
      );

      const site_id = siteUser.length ? siteUser[0].site_id : null;

      /* =====================================================
         Vérifier si présence déjà créée
      ===================================================== */
      const existing = await query(`
        SELECT 1
        FROM presences
        WHERE id_utilisateur = ?
          AND date_presence = ?
        LIMIT 1
      `, [id_utilisateur, today]);

      if (existing.length) continue;

      if (isFerie) {

        await insertPresence(id_utilisateur, site_id, today, 'JOUR_FERIE');
        continue;
      }

      // 🔹 Vérifier s'il a AU MOINS un horaire dans l'historique
      const hasAnyHoraire = await query(`
        SELECT 1
        FROM horaire_user
        WHERE user_id = ?
        LIMIT 1
      `, [id_utilisateur]);

      // ❌ Aucun horaire du tout → ABSENT
      if (!hasAnyHoraire.length) {
        await insertPresence(id_utilisateur, site_id, today, 'ABSENT');
        continue;
      }

      // 🔹 Vérifier horaire actif aujourd'hui
      const horaireUser = await query(`
        SELECT hu.horaire_id
        FROM horaire_user hu
        WHERE hu.user_id = ?
          AND hu.date_debut <= ?
          AND (hu.date_fin IS NULL OR hu.date_fin >= ?)
        LIMIT 1
      `, [id_utilisateur, today, today]);

      // ✔ Il a des horaires mais pas actif aujourd’hui
      if (!horaireUser.length) {
        await insertPresence(id_utilisateur, site_id, today, 'JOUR_NON_TRAVAILLE');
        continue;
      }

      const horaire_id = horaireUser[0].horaire_id;

      /* =====================================================
         6️⃣ Vérifier si jour travaillé
      ===================================================== */
      const horaireDetail = await query(`
        SELECT heure_debut, heure_fin
        FROM horaire_detail
        WHERE horaire_id = ?
          AND jour_semaine = ?
        LIMIT 1
      `, [horaire_id, jourNom]);

      if (!horaireDetail.length) {

        await insertPresence(id_utilisateur, site_id, today, 'JOUR_NON_TRAVAILLE');
        continue;
      }

      const { heure_debut, heure_fin } = horaireDetail[0];

      /* =====================================================
         🌙 Gestion horaire de nuit
      ===================================================== */
      let debutTravail = moment(`${today} ${heure_debut}`, "YYYY-MM-DD HH:mm:ss");
      let finTravail   = moment(`${today} ${heure_fin}`, "YYYY-MM-DD HH:mm:ss");

      const isNightShift = heure_fin < heure_debut;

      if (isNightShift) {
        finTravail.add(1, 'day');
      }

      // 🔥 Si shift de nuit ET qu'il n'est pas terminé → ne pas marquer ABSENT
      if (isNightShift && now.isBefore(finTravail)) {
        continue;
      }

      /* =====================================================
         7️⃣ Vérifier absence validée
      ===================================================== */
      const absence = await query(`
        SELECT 1
        FROM absences
        WHERE id_utilisateur = ?
          AND statut = 'VALIDEE'
          AND ? BETWEEN date_debut AND date_fin
        LIMIT 1
      `, [id_utilisateur, today]);

      if (absence.length) {

        await insertPresence(id_utilisateur, site_id, today, 'ABSENCE_JUSTIFIEE');
        continue;
      }

      /* =====================================================
         8️⃣ Si toujours aucune présence → ABSENT
      ===================================================== */
      await insertPresence(id_utilisateur, site_id, today, 'ABSENT');

    }

    console.log('[CRON] Daily attendance finished');

  } catch (error) {
    console.error('[CRON] ERROR', error);
  }
};


const insertPresence = async (id_utilisateur, site_id, date, statut) => {

  await query(`
    INSERT INTO presences (
      id_utilisateur,
      site_id,
      date_presence,
      statut_jour,
      source,
      created_at
    )
    VALUES (?, ?, ?, ?, 'API', NOW())
  `, [id_utilisateur, site_id, date, statut]);

};

exports.cronDailyAttendance = cronDailyAttendance;

setInterval(async () => {
  try {
    await cronDailyAttendance();
    console.log('[AutoSync] SUCCESS');
  } catch (err) {
    console.error('[AutoSync] ERROR:', err.message);
  }
}, INTERVAL_MS);
