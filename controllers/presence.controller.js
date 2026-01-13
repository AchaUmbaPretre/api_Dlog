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
    // ==============================
    // 1️⃣ Paramètres
    // ==============================
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Paramètres month et year requis"
      });
    }

    const monthPadded = String(month).padStart(2, "0");
    const debut = `${year}-${monthPadded}-01`;

    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${monthPadded}-${String(lastDay).padStart(2, "0")}`;

    // ==============================
    // 2️⃣ Utilisateurs
    // ==============================
    const users = await query(`
      SELECT id_utilisateur, nom
      FROM utilisateur
      ORDER BY nom
    `);

    // ==============================
    // 3️⃣ Générer toutes les dates du mois
    // ==============================
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

    // ==============================
    // 4️⃣ Jours fériés et non travaillés
    // ==============================
    const joursFeries = await query(`
      SELECT date_ferie
      FROM jours_feries
    `);

    const joursNonTrav = await query(`
      SELECT jour_semaine
      FROM jours_non_travailles
    `);

    // ==============================
    // 5️⃣ Présences du mois
    // ==============================
    const presences = await query(`
      SELECT id_utilisateur, date_presence
      FROM presences
      WHERE date_presence BETWEEN ? AND ?
    `, [debut, fin]);

    // ==============================
    // 6️⃣ Congés validés
    // ==============================
    const conges = await query(`
      SELECT id_utilisateur, date_debut, date_fin
      FROM conges
      WHERE statut = 'VALIDE'
        AND date_debut <= ?
        AND date_fin >= ?
    `, [fin, debut]);

    // ==============================
    // 7️⃣ Optimisation (maps)
    // ==============================
    const presencesSet = new Set(
      presences.map(p => `${p.id_utilisateur}_${formatDate(p.date_presence)}`)
    );

    const congesList = conges.map(c => ({
      id: c.id_utilisateur,
      debut: formatDate(c.date_debut),
      fin: formatDate(c.date_fin)
    }));

    // ==============================
    // 8️⃣ Construction des dates (colonnes)
    // ==============================
    const dates = datesRaw.map(d => {
      const dateKey = formatDate(d.date);

      let statutJour = "TRAVAIL";

      if (joursFeries.some(j => formatDate(j.date_ferie) === dateKey)) {
        statutJour = "FERIE";
      } else if (
        joursNonTrav.some(j =>
          j.jour_semaine.toLowerCase() === jourSemaineFR(d.date).toLowerCase()
        )
      ) {
        statutJour = "NON_TRAVAILLE";
      }

      const label = `${String(d.date.getDate()).padStart(2, "0")} ${d.date.toLocaleString("fr-FR", { month: "short" })}`;

      return {
        date: dateKey,
        label,
        statutJour
      };
    });

    // ==============================
    // 9️⃣ Construction planning utilisateurs
    // ==============================
    const utilisateurs = users.map(u => {
      const presMap = {};

      dates.forEach(d => {
        let statut = "ABSENT";

        if (d.statutJour === "FERIE") statut = "FERIE";
        else if (d.statutJour === "NON_TRAVAILLE") statut = "NON_TRAVAILLE";

        if (presencesSet.has(`${u.id_utilisateur}_${d.date}`)) {
          statut = "PRESENT";
        }

        if (
          congesList.some(c =>
            c.id === u.id_utilisateur &&
            d.date >= c.debut &&
            d.date <= c.fin
          )
        ) {
          statut = "CONGE";
        }

        presMap[d.date] = statut;
      });

      return {
        id_utilisateur: u.id_utilisateur,
        nom: u.nom,
        presences: presMap
      };
    });

    // ==============================
    // 🔟 Réponse finale
    // ==============================
    res.json({
      month: Number(month),
      year: Number(year),
      dates,
      utilisateurs
    });

  } catch (error) {
    console.error("Erreur getPresencePlanning :", error);
    res.status(500).json({
      message: "Erreur serveur planning"
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