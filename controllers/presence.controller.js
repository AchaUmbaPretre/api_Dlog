const { db } = require("./../config/database");
const moment = require("moment");

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
      heure_entree,
      heure_sortie,
      source,
      device_sn
    } = req.body;

    if (!id_utilisateur || !date_presence || !heure_entree || !source) {
      return res.status(400).json({
        message: "Champs obligatoires manquants"
      });
    }

    const jour = jourSemaineFR(date_presence);

    /* 1. Vérifier jour non travaillé */
    const checkJourNonTravaille = `
      SELECT 1 FROM jours_non_travailles
      WHERE jour_semaine = ?
    `;

    db.query(checkJourNonTravaille, [jour], (err, rows) => {
      if (rows.length > 0) {
        return res.status(403).json({
          message: `Pointage interdit : ${jour} est un jour non travaillé`
        });
      }

      /* 2. Vérifier jour férié */
      const checkFerie = `
        SELECT 1 FROM jours_feries
        WHERE date_ferie = ?
      `;

      db.query(checkFerie, [date_presence], (err, ferie) => {
        if (ferie.length > 0) {
          return res.status(403).json({
            message: "Pointage interdit : jour férié"
          });
        }

        /* 3. Vérifier présence existante */
        const checkPresence = `
          SELECT 1 FROM presences
          WHERE id_utilisateur = ?
          AND date_presence = ?
        `;

        db.query(checkPresence, [id_utilisateur, date_presence], (err, exist) => {
          if (exist.length > 0) {
            return res.status(409).json({
              message: "Présence déjà enregistrée pour cette date"
            });
          }

          /* 4. Insertion */
          const insert = `
            INSERT INTO presences (
              id_utilisateur,
              date_presence,
              heure_entree,
              heure_sortie,
              source,
              device_sn
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;

          db.query(insert, [
            id_utilisateur,
            date_presence,
            heure_entree,
            heure_sortie || null,
            source,
            device_sn || null
          ], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                message: "Erreur serveur"
              });
            }

            res.status(201).json({
              message: "Présence enregistrée avec succès"
            });
          });
        });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur interne"
    });
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