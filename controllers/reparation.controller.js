const moment = require('moment');
const { queryAsync } = require('../config/database');

//Controle technique
exports.getControleTechnique = async (req, res) => {
    try {
        const { filtre } = req.query;
        let whereClause = '';

        switch (filtre) {
            case 'encours':
                whereClause = 'WHERE ct.date_validite >= CURDATE()';
                break;
            case '3mois':
                whereClause = `
                    WHERE ct.date_validite >= CURDATE() 
                    AND ct.date_validite <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
                `;
                break;
            case 'expire':
                whereClause = 'WHERE ct.date_validite < CURDATE()';
                break;
            default:
                whereClause = '';
        }

        const query = `
            SELECT ct.id_controle_tech, ct.date_controle, ct.date_validite, ct.kilometrage, 
                   ct.ref_controle, ct.resultat, ct.cout_device, ct.cout_ttc, ct.taxe, 
                   ct.commentaire, v.immatriculation, f.nom_fournisseur, 
                   c.nom AS nom_chauffeur, m.nom_marque, tr.type_rep, rct.description,
                    CASE
                        WHEN CURDATE() <= ct.date_validite THEN
                            CASE
                                WHEN ct.date_validite <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH) THEN 'Expire dans 3 mois'
                                ELSE 'En cours'
                            END
                        ELSE 'Expiré'
                    END AS statut
            FROM controle_technique ct
            INNER JOIN vehicules v ON ct.id_vehicule = v.id_vehicule
            INNER JOIN marque m ON v.id_marque = m.id_marque
            INNER JOIN fournisseur f ON ct.id_fournisseur = f.id_fournisseur
            INNER JOIN chauffeurs c ON ct.id_chauffeur = c.id_chauffeur
            INNER JOIN reparation_controle_tech rct ON ct.id_controle_tech = rct.id_controle_technique
            INNER JOIN type_reparations tr ON rct.id_type_reparation = tr.id_type_reparation
            ${whereClause} 
            ORDER BY ct.date_validite ASC
        `;

        const controle = await queryAsync(query);

        return res.status(200).json({
            message: 'Liste de controle de technique récupérées avec succès',
            data: controle,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des suivie :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des suivie.",
        });
    }
};

exports.postControlTechnique = async (req, res) => {
    try {
        const date_controle = moment(req.body.date_controle).format('YYYY-MM-DD');
        const date_validite = moment(req.body.date_validite).format('YYYY-MM-DD');

        const {
            id_vehicule,
            kilometrage,
            ref_controle,
            id_agent,
            resultat,
            cout_device,
            cout_ttc,
            taxe,
            id_fournisseur,
            id_chauffeur,
            commentaire,
            reparations,
            user_cr
        } = req.body;

        const insertQuery = `
            INSERT INTO controle_technique (
                id_vehicule, date_controle, date_validite, kilometrage, ref_controle, id_agent,
                 resultat, cout_device, cout_ttc, taxe, id_fournisseur, id_chauffeur, commentaire, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const controleValues = [
            id_vehicule,
            date_controle,
            date_validite,
            kilometrage,
            ref_controle,
            id_agent,
            resultat,
            cout_device,
            cout_ttc,
            taxe,
            id_fournisseur,
            id_chauffeur,
            commentaire,
            user_cr
        ];

        const result = await queryAsync(insertQuery, controleValues);
        const insertId = result.insertId;

        if (!Array.isArray(reparations)) {
            return res.status(400).json({
                error: "Le champ `réparations` doit être un tableau."
            });
        }

        const insertSudReparationQuery = `
            INSERT INTO reparation_controle_tech (
                id_controle_technique, id_type_reparation, visite, description
            ) VALUES (?, ?, ?, ?)
        `;

        const sudReparationPromises = reparations.map((sud) => {
            const sudValues = [insertId, sud.id_type_reparation, sud.visite, sud.description];
            return queryAsync(insertSudReparationQuery, sudValues);
        });

        await Promise.all(sudReparationPromises);

        return res.status(201).json({
            message: 'Le controle technique a été ajouté avec succès',
            data: { id: insertId },
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout de maintenance :', error);

        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage =
            error.code === 'ER_DUP_ENTRY'
                ? "Une réparation avec ces informations existe déjà."
                : "Une erreur s'est produite lors de l'ajout de la réparation.";

        return res.status(statusCode).json({ error: errorMessage });
    }
};

//Reparation
exports.getReparation = async (req, res) => {

    try {
        const query = `SELECT 
                            r.id_reparation, 
                            sr.date_reparation, 
                            sr.date_sortie, 
                            sr.id_sud_reparation,
                            sr.montant,
                            sr.description,
                            r.date_prevu, 
                            r.date_entree,
                            r.cout, 
                            r.commentaire, 
                            r.code_rep, 
                            v.immatriculation, 
                            m.nom_marque, 
                            f.nom_fournisseur, 
                            tss.nom_type_statut,
                            DATEDIFF(r.date_entree,sr.date_reparation) AS nb_jours_au_garage,
                            sr.id_type_reparation,
                            tr.type_rep,
                            sv.nom_statut_vehicule
                        FROM 
                            reparations r
                        INNER JOIN 
                            vehicules v ON r.id_vehicule = v.id_vehicule
                        INNER JOIN 
                            marque m ON v.id_marque = m.id_marque
                        INNER JOIN 
                            fournisseur f ON r.id_fournisseur = f.id_fournisseur
                        INNER JOIN 
                        	sud_reparation sr ON r.id_reparation = sr.id_reparation
                        INNER JOIN 
                        	type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
                        LEFT JOIN 
                            type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
                        LEFT JOIN 
                        	statut_vehicule sv ON r.id_statut_vehicule = sv.id_statut_vehicule
                         WHERE sr.est_supprime = 0
                        ORDER BY sr.created_at DESC
                       `;
    
        const typeFonction = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste des réparations récupérées avec succès',
            data: typeFonction,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des réparations:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des réparations.",
        });
    }
};

exports.getReparationOneV = async (req, res) => {
  const { id_sud_reparation } = req.query;

  if (!id_sud_reparation ) {
    return res.status(400).json({ error: "L'identifiant de la réparation est requis." });
  }

  const q = `SELECT r.*, sud.*, v.immatriculation, m.nom_marque, tr.type_rep, ev.nom_evaluation FROM reparations r
            INNER JOIN sud_reparation sud ON r.id_reparation = sud.id_reparation
            INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
            INNER JOIN marque m ON v.id_marque = m.id_marque
            LEFT JOIN type_reparations tr ON sud.id_type_reparation = tr.id_type_reparation
            LEFT JOIN evaluation ev ON sud.id_evaluation = ev.id_evaluation
            WHERE sud.id_sud_reparation = ?`;

  db.query(q, [id_sud_reparation], (err, results) => {
    if(err) {
      console.error("Erreur lors de la récupération des sous-inspections :", err);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
    }

    return res.status(200).json(results);
  })
};

exports.getReparationOne = async (req, res) => {
      const { id_sud_reparation, id_inspection_gen } = req.query;
    
      try {
        let id_sub_inspection_gen = null;
    
        if (id_inspection_gen) {
          const qI = `SELECT id_sub_inspection_gen FROM sub_inspection_gen WHERE id_inspection_gen = ?`;
          const result = await queryAsync(qI, [id_inspection_gen]);
    
          if (result && result.length > 0) {
            id_sub_inspection_gen = result[0].id_sub_inspection_gen;
          }
        }
    
        const query = `
          SELECT 
            r.id_reparation, 
            sr.date_reparation, 
            sr.date_sortie, 
            sr.id_sud_reparation,
            r.date_prevu, 
            r.date_entree,
            r.cout, 
            r.commentaire, 
            r.code_rep, 
            v.immatriculation, 
            m.nom_marque, 
            f.nom_fournisseur, 
            tss.nom_type_statut,
            DATEDIFF(r.date_entree, sr.date_reparation) AS nb_jours_au_garage,
            sr.id_type_reparation,
            sr.description,
            tr.type_rep,
            e.nom_evaluation
          FROM 
            reparations r
          INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
          INNER JOIN marque m ON v.id_marque = m.id_marque
          INNER JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
          LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
          INNER JOIN type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
          INNER JOIN type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
          LEFT JOIN evaluation e ON sr.id_evaluation = e.id_evaluation
          WHERE r.id_reparation = ? OR sr.id_sub_inspection_gen = ?
        `;
    
        const typeFonction = await queryAsync(query, [id_sud_reparation, id_sub_inspection_gen]);
    
        const q = `
          SELECT 
            r.id_reparation, 
            r.date_entree, 
            r.date_prevu, 
            r.cout, 
            r.commentaire, 
            f.nom_fournisseur, 
            v.immatriculation, 
            m.nom_marque 
          FROM 
            reparations r
          LEFT JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
          INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
          LEFT JOIN marque m ON v.id_marque = m.id_marque
          LEFT JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
          WHERE r.id_reparation = ? OR sr.id_sub_inspection_gen = ?
        `;
    
        const type = await queryAsync(q, [id_sud_reparation, id_sub_inspection_gen]);
    
        return res.status(200).json({
          message: 'Liste des réparations récupérées avec succès',
          data: typeFonction,
          dataGen: type
        });
    
      } catch (error) {
        console.error('Erreur lors de la récupération des réparations :', error);
        return res.status(500).json({
          error: "Une erreur s'est produite lors de la récupération des réparations.",
        });
      }
};

exports.postReparation = (req, res) => {
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Erreur connexion DB :", connErr);
        return res.status(500).json({ error: "Connexion à la base de données échouée." });
      }
  
      connection.beginTransaction(async (trxErr) => {
        if (trxErr) {
          connection.release();
          console.error("Erreur transaction :", trxErr);
          return res.status(500).json({ error: "Impossible de démarrer la transaction." });
        }
  
        try {
          const date_entree = moment(req.body.date_entree).format('YYYY-MM-DD');
          const date_prevu = moment(req.body.date_prevu).format('YYYY-MM-DD');
  
          const {
            id_vehicule,
            cout,
            id_fournisseur,
            commentaire,
            reparations,
            code_rep,
            kilometrage,
            id_statut_vehicule,
            user_cr, 
            id_sub_inspection_gen
          } = req.body;
  
          if (!id_vehicule || cout === null || cout === undefined || !Array.isArray(reparations)) {
            throw new Error("Certains champs obligatoires sont manquants ou invalides.");
          }        
  
          const insertMainQuery = `
            INSERT INTO reparations (
              id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
              commentaire, code_rep, kilometrage, id_statut_vehicule, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
  
          const mainValues = [
            id_vehicule,
            date_entree,
            date_prevu,
            cout,
            id_fournisseur,
            commentaire,
            code_rep,
            kilometrage,
            id_statut_vehicule,
            user_cr
          ];
  
          const [mainResult] = await queryPromise(connection, insertMainQuery, mainValues);
          const insertedRepairId = mainResult.insertId;

          const insertSubQuery = `
            INSERT INTO sud_reparation (
              id_reparation, id_type_reparation, id_sub_inspection_gen, montant, description, id_statut
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          let sudReparationIds = []; 
  
          // Gérer les réparations
          for (const sud of reparations) {
            const subValues = [
              insertedRepairId,
              sud.id_type_reparation,
              id_sub_inspection_gen ?? null,
              sud.montant,
              sud.description,
              2
            ];
  
            const [subResult] = await queryPromise(connection, insertSubQuery, subValues);
            const insertedSudReparationId = subResult.insertId;

          // Insertion dans l'historique_vehicule
          const historiqueSQL = `
          INSERT INTO historique_vehicule (
            id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const historiqueValues = [
          id_vehicule,
          null,
          id_statut_vehicule, 
          2,
          insertedSudReparationId,
          "Nouvelle réparation ajoutée",
          `Réparation ajoutée avec succès pour le véhicule ${id_vehicule}`,
          user_cr
        ];

        await queryPromise(connection, historiqueSQL, historiqueValues);
  
            sudReparationIds.push(insertedSudReparationId);  // Ajouter l'ID `id_sud_reparation` pour log
            // Si la réparation est liée à une inspection, on met à jour la sous-inspection
            if (id_sub_inspection_gen) {
              const updateQuery = `
                UPDATE sub_inspection_gen 
                SET date_reparation = ?, statut = ?
                WHERE id_sub_inspection_gen = ?
              `;
              const updateValues = [moment().format('YYYY-MM-DD'), 2, id_sub_inspection_gen];
              await queryPromise(connection, updateQuery, updateValues);
  
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'sub_inspection_gen',
                'Modification',
                id_sub_inspection_gen,
                user_cr || null,
                `Statut sous-inspection mis à jour à 2 (réparée), liée à réparation #${insertedRepairId}`
              ]);
            } else {
              // 🔥 Journalisation dans log_actions pour la création d'une réparation non liée à une inspection
              const logSQL = `
                INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
                VALUES (?, ?, ?, ?, ?)
              `;
              await queryPromise(connection, logSQL, [
                'reparations',
                'Création',
                insertedRepairId,
                user_cr || null,
                `Réparation créée sans lien avec une inspection, réparation #${insertedRepairId}`
              ]);
            }
  
            // Journaliser chaque entrée dans sud_reparation avec id_sud_reparation
            const logSudSQL = `
              INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
              VALUES (?, ?, ?, ?, ?)
            `;
            await queryPromise(connection, logSudSQL, [
              'sud_reparation',
              'Création',
              insertedSudReparationId,
              user_cr || null,
              `Réparation ajoutée à reparation, ID #${insertedSudReparationId}`
            ]);

            const getVehiculeSQL = `
            SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
              INNER JOIN marque m ON v.id_marque = m.id_marque
              WHERE v.id_vehicule = ?
            `;
          const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
            
          const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
          const [getTypeResult] = await queryPromise(connection, getType, sud.id_type_reparation);

          // 🔔 Ajout de la notification
          const notifQuery = `
          INSERT INTO notifications (user_id, message, target_type, target_id)
          VALUES (?, ?, ?, ?)
          `;

          const notifMessage = `Une nouvelle réparation a été enregistrée pour le véhicule ${getVehiculeResult?.[0].nom_marque}, immatriculé ${getVehiculeResult?.[0].immatriculation}, de type ${getTypeResult?.[0].type_rep}.`;

          await queryPromise(connection, notifQuery, [user_cr, notifMessage, 'Reparation', insertedRepairId]);

          //Utilisateur
          const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
          const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
          const userEmail = userResult?.[0]?.email;

          // Envoi d'emails aux utilisateurs autorisés
          const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

            const [perResult] = await queryPromise(connection, permissionSQL);
            const message = 
            `
            Bonjour,

            Une nouvelle réparation a été enregistrée pour le véhicule suivant :

            - Marque : ${getVehiculeResult?.[0].nom_marque}
            - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
            - Type de réparation : ${getTypeResult?.[0].type_rep}

            Merci de prendre les dispositions nécessaires si besoin.

            Cordialement,  
            L'équipe Maintenance GTM
            `;

            perResult
              .filter(({ email }) => email !== userEmail)
              .forEach(({ email }) => {
                sendEmail({
                  email,
                  subject: '📌 Nouvelle réparation enregistrée',
                  message
                });
              });
          }

          // Commit si tout est OK
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) {
              console.error("Erreur commit :", commitErr);
              return res.status(500).json({ error: "Erreur lors de la validation des données." });
            }
  
            return res.status(201).json({
              message: "Réparation enregistrée avec succès.",
              data: { id: insertedRepairId, sud_reparation_ids: sudReparationIds }
            });
          });
  
        } catch (error) {
          console.error("Erreur transactionnelle :", error);
          connection.rollback(() => {
            connection.release();
            const msg = error.message || "Erreur inattendue lors du traitement.";
            return res.status(500).json({ error: msg });
          });
        }
      });
    });
};
  
exports.deleteReparation = (req, res) => {
  const { id_sud_reparation, user_id } = req.body;

  if (!id_sud_reparation) {
    return res.status(400).json({ error: "L'ID de la réparation est requis." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        // Suppression logique
        await queryPromise(connection, `
          UPDATE sud_reparation SET est_supprime = 1 WHERE id_sud_reparation = ?
        `, [id_sud_reparation]);

        // Journalisation
        await queryPromise(connection, `
          INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
          VALUES (?, ?, ?, ?, ?)
        `, [
          'sud_reparation_gen',
          'Suppression',
          id_sud_reparation,
          user_id || null,
          `Suppression logique de la réparation #${id_sud_reparation}`
        ]);

        // 🔔 Notification
        const notifMessage = `La sous-réparation #${id_sud_reparation} a été supprimée par l'utilisateur ${user_id}.`;
        await queryPromise(connection, `
          INSERT INTO notifications (user_id, message)
          VALUES (?, ?)
        `, [user_id, notifMessage]);

        // Commit
        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            return res.status(500).json({ error: "Erreur lors du commit." });
          }

          return res.status(200).json({ message: "Réparation a été supprimée avec succès." });
        });

      } catch (err) {
        console.error("Erreur pendant suppression :", err);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({ error: err.message || "Erreur inattendue." });
        });
      }
    });
  });
}; 

exports.putReparation = (req, res) => {
  const idSud = req.query.id_sud_reparation;
  const idReparation = req.query.id_reparation;

  if (!idSud || !idReparation) {
    return res.status(400).json({ error: "ID de réparation ou ID de sous-réparation manquant." });
  }

  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const {
          id_vehicule,
          cout,
          date_entree,
          date_prevu,
          commentaire,
          code_rep,
          kilometrage,
          id_statut_vehicule,
          id_fournisseur,
          reparations,
          user_cr
        } = req.body;

        // 1. Mise à jour de la table `reparations`
        const updateMainSQL = `
          UPDATE reparations
          SET id_vehicule = ?, cout = ?, date_entree = ?, date_prevu = ?, commentaire = ?, code_rep = ?, 
              kilometrage = ?, id_statut_vehicule = ?, id_fournisseur = ?
          WHERE id_reparation = ?
        `;
        await queryPromise(connection, updateMainSQL, [
          id_vehicule,
          cout,
          moment(date_entree).format('YYYY-MM-DD'),
          moment(date_prevu).format('YYYY-MM-DD'),
          commentaire,
          code_rep,
          kilometrage,
          id_statut_vehicule,
          id_fournisseur,
          idReparation
        ]);

        // 2. Mise à jour de la sous-réparation correspondante
        if (Array.isArray(reparations)) {
          for (const r of reparations) {
            const updateSubSQL = `
              UPDATE sud_reparation
              SET id_type_reparation = ?, montant = ?, description = ?, id_statut = ?
              WHERE id_sud_reparation = ? AND id_reparation = ?
            `;
            await queryPromise(connection, updateSubSQL, [
              r.id_type_reparation,
              r.montant,
              r.description,
              r.id_statut || 2,
              idSud,
              idReparation
            ]);

            // 3. Journalisation de la modification
            const logSQL = `
              INSERT INTO log_inspection (table_name, action, record_id, user_id, description)
              VALUES (?, ?, ?, ?, ?)
            `;
            await queryPromise(connection, logSQL, [
              'sud_reparation',
              'Modification',
              idSud,
              user_cr || null,
              `Sous-réparation mise à jour pour la réparation #${idReparation}`
            ]);

            
        const getVehiculeSQL = `
        SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
          INNER JOIN marque m ON v.id_marque = m.id_marque
          WHERE v.id_vehicule = ?
        `;
        
        const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);
        const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
        const [getTypeResult] = await queryPromise(connection, getType, r.id_type_reparation);

        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
        const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
        const userEmail = userResult?.[0]?.email;

        // Envoi d'emails aux utilisateurs autorisés
        const permissionSQL = `
            SELECT u.email FROM permission p 
              INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
              WHERE p.menus_id = 14 AND p.can_read = 1
              GROUP BY p.user_id
            `;

        const [perResult] = await queryPromise(connection, permissionSQL);
        const message = 
        `
        Bonjour,

        La réparation n°${idReparation} concernant le véhicule suivant a été mise à jour :

        - Marque : ${getVehiculeResult?.[0].nom_marque}
        - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
        - Type de réparation : ${getTypeResult?.[0].type_rep}

        Nous vous invitons à consulter les détails dans le système si nécessaire.

        Cordialement,  
        L'équipe Maintenance GTM
        `;

        perResult
        .filter(({ email }) => email !== userEmail)
        .forEach(({ email }) => {
          sendEmail({
            email,
            subject: `📌 Mise à jour de la réparation n°${idReparation}`,
            message
          });
        });
          }
        }

        // 4. Mise à jour du statut véhicule dans historique
        const histoSQL = `
          INSERT INTO historique_vehicule (
            id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await queryPromise(connection, histoSQL, [
          id_vehicule,
          null,
          id_statut_vehicule,
          2,
          idSud,
          "Mise à jour réparation",
          `Mise à jour de la réparation ${idReparation}`,
          user_cr
        ]);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation des données." });
          }

          return res.status(200).json({ message: "Réparation mise à jour avec succès." });
        });

      } catch (error) {
        console.error("Erreur durant la mise à jour :", error);
        connection.rollback(() => {
          connection.release();
          return res.status(500).json({ error: error.message || "Erreur inattendue." });
        });
      }
    });
  });
};

exports.getReparationImage = (req, res) => {
  const { id_reparation, id_inspection_gen } = req.query;

  const query = `
                  SELECT ir.id_image_reparation, ir.commentaire, ir.image, tp.nom_type_photo, ir.created_at FROM image_reparation ir
                    INNER JOIN type_photo tp ON ir.id_type_photo = tp.id_type_photo
                    INNER JOIN reparations r ON ir.id_reparation = r.id_reparation
                    INNER JOIN sud_reparation sud ON r.id_reparation = sud.id_reparation
                    WHERE ir.id_reparation = ? OR sud.id_sub_inspection_gen = ?
                  `;

  db.query(query, [id_reparation, id_inspection_gen ], (err, results) => {
      if (err) {
        console.error("Erreur lors de la récupération des sous-inspections :", err);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
      }
      return res.status(200).json(results);
  });
};

exports.postReparationImage = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("Erreur de connexion DB :", connErr);
      return res.status(500).json({ error: "Connexion à la base de données échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        console.error("Erreur transaction :", trxErr);
        return res.status(500).json({ error: "Impossible de démarrer la transaction." });
      }

      try {
        const { id_reparation, commentaire, id_type_photo } = req.body;

        if (!id_reparation || !req.files || !req.files[0]) {
          throw new Error("Champs obligatoires manquants ou fichier non fourni.");
        }

        const file = req.files[0];
        const imagePath = file.path.replace(/\\/g, '/');

        const q = `INSERT INTO image_reparation (id_reparation, commentaire, id_type_photo, image) VALUES (?, ?, ?, ?)`;
        const values = [id_reparation, commentaire, id_type_photo, imagePath];

        const result = await queryPromise(connection, q, values);

        connection.commit((commitErr) => {
          connection.release();
          if (commitErr) {
            console.error("Erreur commit :", commitErr);
            return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
          }

          return res.status(201).json({
            message: "Image enregistrée avec succès.",
            data: { id: result.insertId }
          });
        });

      } catch (error) {
        connection.rollback(() => {
          connection.release();
          console.error("Erreur pendant la transaction :", error);
          return res.status(400).json({ error: error.message });
        });
      }
    });
  });
};
