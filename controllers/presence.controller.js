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
    const mois = req.query.mois; // ex: "2026-01"
    if (!mois) return res.status(400).json({ message: "Paramètre mois requis" });

    console.log(req.query)
    const debut = `${mois}-01`;
    const fin = `${mois}-31`;

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

    // 4️⃣ Présences
    const presences = await query(`
      SELECT id_utilisateur, date_presence
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `, [debut, fin]);

    // 5️⃣ Congés validés
    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND (date_debut <= ? AND date_fin >= ?)
    `, [fin, debut]);

    // 6️⃣ Construction planning
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);

      // Déterminer le statut du jour
      let statutJour = 'TRAVAIL';
      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) statutJour = 'FERIE';
      else if (joursNonTrav.some(j => j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase())) statutJour = 'NON_TRAVAILLE';

      // Label lisible (ex: "01 janv.")
      const label = `${String(d.date.getDate()).padStart(2, '0')} ${d.date.toLocaleString('fr-FR', { month: 'short' })}`;

      return { date: dateKey, label, statutJour };
    });

    // 7️⃣ Construire les présences par utilisateur
    const utilisateurs = users.map(u => {
      const presMap = {};
      dates.forEach(d => {
        let statut = 'ABSENT';
        if (d.statutJour === 'FERIE') statut = 'FERIE';
        else if (d.statutJour === 'NON_TRAVAILLE') statut = 'NON_TRAVAILLE';

        if (presences.some(p => p.id_utilisateur === u.id_utilisateur && formatDate(p.date_presence) === d.date)) statut = 'PRESENT';
        if (conges.some(c => c.id_utilisateur === u.id_utilisateur && d.date >= formatDate(c.date_debut) && d.date <= formatDate(c.date_fin))) statut = 'CONGE';

        presMap[d.date] = statut;
      });

      return { id_utilisateur: u.id_utilisateur, nom: u.nom, presences: presMap };
    });

    res.json({ dates, utilisateurs });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({ message: "Erreur serveur planning" });
  }
}; */

exports.getPresencePlanning = async (req, res) => {
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
};

const mapJourSemaine = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6
};

exports.getPresenceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(req.query)

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate et endDate requis (YYYY-MM-DD)" });
    }

    // ==========================
    // 2️⃣ Récupérer les utilisateurs
    // ==========================
    const users = await query(`
      SELECT id_utilisateur, nom
      FROM utilisateur
      ORDER BY nom
    `);

    // ==========================
    // 3️⃣ Récupérer les présences
    // ==========================
    const presences = await query(
      `SELECT id_utilisateur, date_presence, heure_entree, heure_sortie
       FROM presences
       WHERE date_presence BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // ==========================
    // 4️⃣ Récupérer les congés validés
    // ==========================
    const conges = await query(
      `SELECT id_utilisateur, date_debut, date_fin
       FROM conges
       WHERE statut = 'VALIDE'
         AND date_fin >= ?
         AND date_debut <= ?`,
      [startDate, endDate]
    );

    // ==========================
    // 5️⃣ Récupérer les jours fériés
    // ==========================
    const joursFeries = await query(
      `SELECT date_ferie FROM jours_feries WHERE date_ferie BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // ==========================
    // 6️⃣ Récupérer les jours non travaillés
    // ==========================
    const joursNonTrav = await query(`SELECT jour_semaine FROM jours_non_travailles`);

    // ==========================
    // 7️⃣ Préparer les maps pour performance
    // ==========================
    const presencesMap = new Map();
    presences.forEach(p => {
      const key = `${p.id_utilisateur}_${moment(p.date_presence).format("YYYY-MM-DD")}`;
      presencesMap.set(key, p);
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
    const joursNonTravSet = new Set(joursNonTrav.map(j => mapJourSemaine[j.jour_semaine.toLowerCase()]));

    // ==========================
    // 8️⃣ Générer toutes les dates de la période
    // ==========================
    const start = moment(startDate);
    const end = moment(endDate);
    const dates = [];
    for (let d = moment(start); d.isSameOrBefore(end); d.add(1, 'day')) {
      dates.push(moment(d)); // clone pour éviter mutation
    }

    // ==========================
    // 9️⃣ Construire le rapport utilisateur par utilisateur
    // ==========================
    const report = users.map(u => {
      let countPresent = 0,
          countAbsent = 0,
          countConge = 0,
          countFerie = 0,
          countNonTravaille = 0;

      const presMap = {};

      dates.forEach(date => {
        const dateStr = date.format("YYYY-MM-DD");
        let statut = "ABSENT";

        // Jour férié
        if (joursFeriesSet.has(dateStr)) {
          statut = "FERIE";
          countFerie++;
        }
        // Jour non travaillé
        else if (joursNonTravSet.has(date.day())) {
          statut = "NON_TRAVAILLE";
          countNonTravaille++;
        }
        // Congé
        else if (congesMap.has(u.id_utilisateur)) {
          const cong = congesMap.get(u.id_utilisateur).find(c => date.isBetween(c.debut, c.fin, null, '[]'));
          if (cong) {
            statut = "CONGE";
            countConge++;
          }
        }

        // Présence
        const pKey = `${u.id_utilisateur}_${dateStr}`;
        if (presencesMap.has(pKey)) {
          statut = "PRESENT";
          countPresent++;
        }

        // Si pas férié, congé, ou présence => absent
        if (statut === "ABSENT") countAbsent++;

        presMap[dateStr] = presencesMap.get(pKey) || { statut };
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        countPresent,
        countAbsent,
        countConge,
        countFerie,
        countNonTravaille,
        presences: presMap
      };
    });

    res.json({
      startDate,
      endDate,
      dates: dates.map(d => d.format("YYYY-MM-DD")),
      report
    });
  } catch (error) {
    console.error("Erreur getPresenceReport:", error);
    res.status(500).json({ message: "Erreur serveur lors de la génération du rapport" });
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

exports.postPresence = async (req, res) => {
  try {
    const {
      id_utilisateur,
      date_presence,
      datetime, // Recommandé pour biométrie
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

    /* 1️⃣ Vérifier jour non travaillé */
    const nonTravaille = await query(
      `SELECT 1 FROM jours_non_travailles WHERE jour_semaine = ?`,
      [jourFR]
    );
    if (nonTravaille.length > 0) {
      return res.status(403).json({
        message: `Pointage interdit : ${jourFR} est un jour non travaillé`
      });
    }

    /* 2️⃣ Vérifier jour férié */
    const ferie = await query(
      `SELECT 1 FROM jours_feries WHERE date_ferie = ?`,
      [dateISO]
    );
    if (ferie.length > 0) {
      return res.status(403).json({
        message: "Pointage interdit : jour férié"
      });
    }

    /* 3️⃣ Vérifier présence existante */
    const presence = await query(
      `SELECT id_presence, heure_entree, heure_sortie
       FROM presences
       WHERE id_utilisateur = ? AND date_presence = ?
       LIMIT 1`,
      [id_utilisateur, dateISO]
    );

    /* 4️⃣ Aucune présence → ENTRÉE */
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

    /* 5️⃣ Présence existe + sortie vide → SORTIE */
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

    /* 6️⃣ Déjà pointé entrée & sortie */
    return res.status(409).json({
      message: "Présence déjà complète pour cette date"
    });

  } catch (error) {
    console.error("Erreur postPresence :", error);
    res.status(500).json({
      message: "Erreur interne du serveur"
    });
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

//Congé
exports.getConge = (req, res) => {

    const q = `SELECT * FROM conges`;
    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).json({
                message: 'Erreur lors de la récuperations des conges.',
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