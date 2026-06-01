const moment = require('moment');
const { queryAsync } = require('../config/database');

//Type de reparation
exports.getTypeReparation = async (req, res) => {

    try {
        const query = `SELECT * FROM type_reparations`;
    
        const typeFonction = await queryAsync(query);
        
        return res.status(200).json({
            message: 'Liste de type des réparations récupérées avec succès',
            data: typeFonction,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des dispositions:', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des dispositions.",
        });
    }
};

exports.postTypeReparation = async (req, res) => {
    try {
        const q = 'INSERT INTO type_reparations(`type_rep`) VALUES(?)';

        const values = [
            req.body.type_rep
        ];

        await db.query(q, values, (error, data) => {

            if(error) {
                console.log(error)
            }
            return res.json('Processus réussi');
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du type." });
    }
};

//Controle technique
exports.getControleTechnique = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { filtre } = req.query;

    try {
        let whereClause = '';

        // Filtre par statut
        switch (filtre) {
            case 'encours':
                whereClause = 'AND ct.date_validite >= CURDATE()';
                break;
            case '3mois':
                whereClause = `
                    AND ct.date_validite >= CURDATE() 
                    AND ct.date_validite <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
                `;
                break;
            case 'expire':
                whereClause = 'AND ct.date_validite < CURDATE()';
                break;
            default:
                whereClause = '';
        }

        // 🔥 Condition tenant
        let tenantCondition = '';
        if (!isSuperAdmin && tenantId) {
            tenantCondition = 'AND v.tenant_id = ?';
        }

        const query = `
            SELECT 
                ct.id_controle_tech, 
                ct.date_controle, 
                ct.date_validite, 
                ct.kilometrage, 
                ct.ref_controle, 
                ct.resultat, 
                ct.cout_device, 
                ct.cout_ttc, 
                ct.taxe, 
                ct.commentaire, 
                v.immatriculation, 
                f.nom_fournisseur, 
                c.nom AS nom_chauffeur, 
                c.prenom AS prenom_chauffeur,
                m.nom_marque, 
                tr.type_rep, 
                rct.description,
                v.tenant_id,
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
            WHERE 1=1
            ${whereClause}
            ${tenantCondition}
            ORDER BY ct.date_validite ASC
        `;

        const params = [];
        if (!isSuperAdmin && tenantId) {
            params.push(tenantId);
        }

        const controle = await queryAsync(query, params);

        return res.status(200).json({
            message: 'Liste de contrôle technique récupérée avec succès',
            data: controle,
            meta: {
                tenant_id: !isSuperAdmin ? tenantId : null,
                is_super_admin: isSuperAdmin,
                filtre: filtre || 'tous'
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des contrôles techniques :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des contrôles techniques.",
        });
    }
};

exports.postControlTechnique = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id;

    try {
        // Vérification des droits
        if (!isSuperAdmin && !tenantId) {
            return res.status(403).json({ error: 'Non autorisé à ajouter un contrôle technique' });
        }

        // 🔥 Vérifier que le véhicule appartient au tenant
        if (!isSuperAdmin && tenantId) {
            const checkVehiculeQuery = 'SELECT id_vehicule FROM vehicules WHERE id_vehicule = ? AND tenant_id = ?';
            const vehicule = await queryAsync(checkVehiculeQuery, [req.body.id_vehicule, tenantId]);
            
            if (vehicule.length === 0) {
                return res.status(404).json({ error: 'Véhicule non trouvé ou n\'appartient pas à votre société' });
            }
        }

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
            reparations
        } = req.body;

        // 🔥 Insertion avec tenant_id
        const insertQuery = `
            INSERT INTO controle_technique (
                id_vehicule, date_controle, date_validite, kilometrage, ref_controle, id_agent,
                resultat, cout_device, cout_ttc, taxe, id_fournisseur, id_chauffeur, 
                commentaire, user_cr, tenant_id, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const controleValues = [
            id_vehicule,
            date_controle,
            date_validite,
            kilometrage,
            ref_controle,
            id_agent || null,
            resultat,
            cout_device || 0,
            cout_ttc || 0,
            taxe || 0,
            id_fournisseur || null,
            id_chauffeur || null,
            commentaire || null,
            req.body.user_cr || currentUserId,
            tenantId,           // 🔥 tenant_id automatique
            currentUserId       // 🔥 created_by
        ];

        const result = await queryAsync(insertQuery, controleValues);
        const insertId = result.insertId;

        // Insertion des réparations
        if (reparations && Array.isArray(reparations) && reparations.length > 0) {
            const insertSudReparationQuery = `
                INSERT INTO reparation_controle_tech (
                    id_controle_technique, id_type_reparation, visite, description, tenant_id, created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())
            `;

            const sudReparationPromises = reparations.map((sud) => {
                const sudValues = [
                    insertId, 
                    sud.id_type_reparation, 
                    sud.visite || null, 
                    sud.description || null,
                    tenantId
                ];
                return queryAsync(insertSudReparationQuery, sudValues);
            });

            await Promise.all(sudReparationPromises);
        }

        return res.status(201).json({
            success: true,
            message: 'Le contrôle technique a été ajouté avec succès',
            data: { 
                id: insertId,
                tenant_id: tenantId
            },
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du contrôle technique :', error);

        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage = error.code === 'ER_DUP_ENTRY'
            ? "Un contrôle technique avec ces informations existe déjà."
            : "Une erreur s'est produite lors de l'ajout du contrôle technique.";

        return res.status(statusCode).json({ 
            success: false,
            error: errorMessage 
        });
    }
};

//Reparation
exports.getReparation = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;

    try {
        let whereClause = "WHERE sr.est_supprime = 0";
        const params = [];

        if (!isSuperAdmin && tenantId) {
            whereClause += " AND v.tenant_id = ?";
            params.push(tenantId);
        }

        const query = `
            SELECT 
                r.id_reparation, 
                sr.date_reparation, 
                sr.date_sortie, 
                sr.id_sud_reparation,
                sr.montant,
                sr.description AS sud_description,
                r.date_prevu, 
                r.date_entree,
                r.cout, 
                r.commentaire, 
                r.code_rep, 
                v.immatriculation, 
                v.tenant_id,
                m.nom_marque, 
                f.nom_fournisseur, 
                tss.nom_type_statut,
                DATEDIFF(r.date_entree, sr.date_reparation) AS nb_jours_au_garage,
                sr.id_type_reparation,
                tr.type_rep,
                sv.nom_statut_vehicule
            FROM reparations r
            INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
            INNER JOIN marque m ON v.id_marque = m.id_marque
            INNER JOIN fournisseur f ON r.id_fournisseur = f.id_fournisseur
            INNER JOIN sud_reparation sr ON r.id_reparation = sr.id_reparation
            INNER JOIN type_reparations tr ON sr.id_type_reparation = tr.id_type_reparation
            LEFT JOIN type_statut_suivi tss ON sr.id_statut = tss.id_type_statut_suivi
            LEFT JOIN statut_vehicule sv ON r.id_statut_vehicule = sv.id_statut_vehicule
            ${whereClause}
            ORDER BY sr.created_at DESC
        `;

        const reparations = await queryAsync(query, params);

        return res.status(200).json({
            success: true,
            message: 'Liste des réparations récupérées avec succès',
            data: reparations,
            meta: {
                tenant_id: !isSuperAdmin ? tenantId : null,
                is_super_admin: isSuperAdmin,
                total: reparations.length
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des réparations:', error);
        return res.status(500).json({
            success: false,
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
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id || req.body.user_cr;

    // Vérification des droits
    if (!isSuperAdmin && !tenantId) {
        return res.status(403).json({ error: 'Non autorisé à ajouter une réparation' });
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
                    id_sub_inspection_gen
                } = req.body;

                if (!id_vehicule || cout === null || cout === undefined || !Array.isArray(reparations)) {
                    throw new Error("Certains champs obligatoires sont manquants ou invalides.");
                }

                // 🔥 Vérifier que le véhicule appartient au tenant
                if (!isSuperAdmin && tenantId) {
                    const checkVehiculeQuery = 'SELECT id_vehicule, immatriculation, tenant_id FROM vehicules WHERE id_vehicule = ? AND tenant_id = ?';
                    const [vehicule] = await queryPromise(connection, checkVehiculeQuery, [id_vehicule, tenantId]);
                    
                    if (!vehicule || vehicule.length === 0) {
                        throw new Error('Véhicule non trouvé ou n\'appartient pas à votre société');
                    }
                }

                // Insertion principale avec tenant_id
                const insertMainQuery = `
                    INSERT INTO reparations (
                        id_vehicule, date_entree, date_prevu, cout, id_fournisseur,
                        commentaire, code_rep, kilometrage, id_statut_vehicule, 
                        user_cr, tenant_id, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
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
                    currentUserId,
                    tenantId,           // 🔥 tenant_id automatique
                    currentUserId       // 🔥 created_by
                ];

                const [mainResult] = await queryPromise(connection, insertMainQuery, mainValues);
                const insertedRepairId = mainResult.insertId;

                // Insertion des sous-réparations
                const insertSubQuery = `
                    INSERT INTO sud_reparation (
                        id_reparation, id_type_reparation, id_sub_inspection_gen, 
                        montant, description, id_statut, tenant_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                `;

                let sudReparationIds = [];

                for (const sud of reparations) {
                    const subValues = [
                        insertedRepairId,
                        sud.id_type_reparation,
                        id_sub_inspection_gen ?? null,
                        sud.montant || 0,
                        sud.description || null,
                        2,  // statut par défaut
                        tenantId    // 🔥 tenant_id pour sud_reparation
                    ];

                    const [subResult] = await queryPromise(connection, insertSubQuery, subValues);
                    const insertedSudReparationId = subResult.insertId;
                    sudReparationIds.push(insertedSudReparationId);

                    // Insertion dans l'historique_vehicule
                    const historiqueSQL = `
                        INSERT INTO historique_vehicule (
                            id_vehicule, id_chauffeur, id_statut_vehicule, statut, 
                            id_sud_reparation, action, commentaire, user_cr, tenant_id, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    `;

                    const historiqueValues = [
                        id_vehicule,
                        null,
                        id_statut_vehicule || null,
                        2,
                        insertedSudReparationId,
                        "Nouvelle réparation ajoutée",
                        `Réparation ajoutée avec succès pour le véhicule ${id_vehicule}`,
                        currentUserId,
                        tenantId
                    ];

                    await queryPromise(connection, historiqueSQL, historiqueValues);

                    // Gestion de l'inspection
                    if (id_sub_inspection_gen) {
                        const updateQuery = `
                            UPDATE sub_inspection_gen 
                            SET date_reparation = ?, statut = ?, tenant_id = ?
                            WHERE id_sub_inspection_gen = ?
                        `;
                        const updateValues = [moment().format('YYYY-MM-DD'), 2, tenantId, id_sub_inspection_gen];
                        await queryPromise(connection, updateQuery, updateValues);

                        const logSQL = `
                            INSERT INTO log_inspection (table_name, action, record_id, user_id, description, tenant_id)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        await queryPromise(connection, logSQL, [
                            'sub_inspection_gen',
                            'Modification',
                            id_sub_inspection_gen,
                            currentUserId,
                            `Statut sous-inspection mis à jour à 2 (réparée), liée à réparation #${insertedRepairId}`,
                            tenantId
                        ]);
                    }

                    // Journalisation
                    const logSudSQL = `
                        INSERT INTO log_inspection (table_name, action, record_id, user_id, description, tenant_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `;
                    await queryPromise(connection, logSudSQL, [
                        'sud_reparation',
                        'Création',
                        insertedSudReparationId,
                        currentUserId,
                        `Réparation ajoutée à reparation, ID #${insertedSudReparationId}`,
                        tenantId
                    ]);

                    // Récupération infos véhicule pour notification
                    const getVehiculeSQL = `
                        SELECT v.id_vehicule, v.immatriculation, m.nom_marque 
                        FROM vehicules v 
                        INNER JOIN marque m ON v.id_marque = m.id_marque
                        WHERE v.id_vehicule = ?
                    `;
                    const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, id_vehicule);

                    const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
                    const [getTypeResult] = await queryPromise(connection, getType, sud.id_type_reparation);

                    // Notification
                    const notifQuery = `
                        INSERT INTO notifications (user_id, message, target_type, target_id, tenant_id, created_at)
                        VALUES (?, ?, ?, ?, ?, NOW())
                    `;

                    const notifMessage = `Une nouvelle réparation a été enregistrée pour le véhicule ${getVehiculeResult?.[0]?.nom_marque || ''}, immatriculé ${getVehiculeResult?.[0]?.immatriculation || ''}, de type ${getTypeResult?.[0]?.type_rep || ''}.`;

                    await queryPromise(connection, notifQuery, [currentUserId, notifMessage, 'Reparation', insertedRepairId, tenantId]);

                    // Envoi d'emails uniquement si non Super Admin
                    if (!isSuperAdmin) {
                        const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ? AND tenant_id = ?`;
                        const [userResult] = await queryPromise(connection, getUserEmailSQL, [currentUserId, tenantId]);
                        const userEmail = userResult?.[0]?.email;

                        const permissionSQL = `
                            SELECT DISTINCT u.email 
                            FROM permission p 
                            INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
                            WHERE p.menus_id = 14 AND p.can_read = 1 AND u.tenant_id = ?
                        `;

                        const [perResult] = await queryPromise(connection, permissionSQL, [tenantId]);

                        const message = `
                            Bonjour,

                            Une nouvelle réparation a été enregistrée pour le véhicule suivant :

                            - Marque : ${getVehiculeResult?.[0]?.nom_marque || 'N/A'}
                            - Immatriculation : ${getVehiculeResult?.[0]?.immatriculation || 'N/A'}
                            - Type de réparation : ${getTypeResult?.[0]?.type_rep || 'N/A'}

                            Merci de prendre les dispositions nécessaires si besoin.

                            Cordialement,
                            L'équipe Maintenance
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
                }

                // Commit si tout est OK
                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation des données." });
                    }

                    return res.status(201).json({
                        success: true,
                        message: "Réparation enregistrée avec succès.",
                        data: { 
                            id: insertedRepairId, 
                            sud_reparation_ids: sudReparationIds,
                            tenant_id: tenantId
                        }
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
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id || req.body.user_id;
    const { id_sud_reparation } = req.body;

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
                // 🔥 Vérifier que la réparation appartient au tenant
                if (!isSuperAdmin && tenantId) {
                    const checkQuery = `
                        SELECT sr.id_sud_reparation, sr.tenant_id, r.id_vehicule
                        FROM sud_reparation sr
                        INNER JOIN reparations r ON sr.id_reparation = r.id_reparation
                        WHERE sr.id_sud_reparation = ? AND (sr.tenant_id = ? OR r.tenant_id = ?)
                    `;
                    const [checkResult] = await queryPromise(connection, checkQuery, [id_sud_reparation, tenantId, tenantId]);
                    
                    if (!checkResult || checkResult.length === 0) {
                        throw new Error("Réparation non trouvée ou n'appartient pas à votre société");
                    }
                }

                // Suppression logique
                await queryPromise(connection, `
                    UPDATE sud_reparation SET est_supprime = 1 WHERE id_sud_reparation = ?
                `, [id_sud_reparation]);

                // Journalisation avec tenant_id
                await queryPromise(connection, `
                    INSERT INTO log_inspection (table_name, action, record_id, user_id, description, tenant_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `, [
                    'sud_reparation_gen',
                    'Suppression',
                    id_sud_reparation,
                    currentUserId || null,
                    `Suppression logique de la réparation #${id_sud_reparation}`,
                    tenantId
                ]);

                // 🔔 Notification avec tenant_id
                const notifMessage = `La sous-réparation #${id_sud_reparation} a été supprimée par l'utilisateur ${currentUserId}.`;
                await queryPromise(connection, `
                    INSERT INTO notifications (user_id, message, target_type, target_id, tenant_id, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `, [currentUserId, notifMessage, 'sud_reparation', id_sud_reparation, tenantId]);

                // Commit
                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit:", commitErr);
                        return res.status(500).json({ error: "Erreur lors du commit." });
                    }

                    return res.status(200).json({ 
                        success: true,
                        message: "Réparation supprimée avec succès.",
                        data: { id_sud_reparation, tenant_id: tenantId }
                    });
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
    const { tenantId, isSuperAdmin } = req;
    const { id_reparation, id_inspection_gen } = req.query;

    if (!id_reparation && !id_inspection_gen) {
        return res.status(400).json({ 
            error: "L'ID de la réparation ou de l'inspection est requis." 
        });
    }

    let query = `
        SELECT 
            ir.id_image_reparation, 
            ir.commentaire, 
            ir.image, 
            tp.nom_type_photo, 
            ir.created_at,
            r.id_reparation,
            r.tenant_id AS reparation_tenant_id,
            v.immatriculation,
            v.tenant_id AS vehicule_tenant_id
        FROM image_reparation ir
        INNER JOIN type_photo tp ON ir.id_type_photo = tp.id_type_photo
        INNER JOIN reparations r ON ir.id_reparation = r.id_reparation
        INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
        LEFT JOIN sud_reparation sud ON r.id_reparation = sud.id_reparation
        WHERE 1=1
    `;

    const params = [];

    if (id_reparation) {
        query += ` AND ir.id_reparation = ?`;
        params.push(id_reparation);
    }

    if (id_inspection_gen) {
        query += ` AND sud.id_sub_inspection_gen = ?`;
        params.push(id_inspection_gen);
    }

    if (!isSuperAdmin && tenantId) {
        query += ` AND (r.tenant_id = ? OR v.tenant_id = ?)`;
        params.push(tenantId, tenantId);
    }

    query += ` ORDER BY ir.created_at DESC`;

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des images :", err);
            return res.status(500).json({ 
                error: "Erreur serveur lors de la récupération des données.",
                details: err.message 
            });
        }

        return res.status(200).json({
            success: true,
            data: results,
            meta: {
                tenant_id: !isSuperAdmin ? tenantId : null,
                is_super_admin: isSuperAdmin,
                total: results.length
            }
        });
    });
};

exports.postReparationImage = (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id;

    // Vérification des droits
    if (!isSuperAdmin && !tenantId) {
        return res.status(403).json({ error: 'Non autorisé à ajouter des images' });
    }

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

                // 🔥 Vérifier que la réparation appartient au tenant
                if (!isSuperAdmin && tenantId) {
                    const checkQuery = `
                        SELECT r.id_reparation, r.tenant_id, v.tenant_id as vehicule_tenant_id
                        FROM reparations r
                        INNER JOIN vehicules v ON r.id_vehicule = v.id_vehicule
                        WHERE r.id_reparation = ? AND (r.tenant_id = ? OR v.tenant_id = ?)
                    `;
                    const [checkResult] = await queryPromise(connection, checkQuery, [id_reparation, tenantId, tenantId]);
                    
                    if (!checkResult || checkResult.length === 0) {
                        throw new Error("Réparation non trouvée ou n'appartient pas à votre société");
                    }
                }

                const file = req.files[0];
                const imagePath = file.path.replace(/\\/g, '/');

                const q = `
                    INSERT INTO image_reparation 
                    (id_reparation, commentaire, id_type_photo, image, tenant_id, created_by, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                const values = [
                    id_reparation, 
                    commentaire || null, 
                    id_type_photo, 
                    imagePath,
                    tenantId,           // 🔥 tenant_id automatique
                    currentUserId       // 🔥 created_by
                ];

                const result = await queryPromise(connection, q, values);

                // Journalisation
                const logQuery = `
                    INSERT INTO log_inspection (table_name, action, record_id, user_id, description, tenant_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                await queryPromise(connection, logQuery, [
                    'image_reparation',
                    'Création',
                    result.insertId,
                    currentUserId,
                    `Ajout d'une image pour la réparation #${id_reparation}`,
                    tenantId
                ]);

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation de la transaction." });
                    }

                    return res.status(201).json({
                        success: true,
                        message: "Image enregistrée avec succès.",
                        data: { 
                            id: result.insertId,
                            image_path: imagePath,
                            tenant_id: tenantId
                        }
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

//Suivie reparation
exports.getSuiviReparation = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const { id_reparation, id_inspection_gen } = req.query;

    if (!id_reparation && !id_inspection_gen) {
        return res.status(400).json({ 
            error: "L'ID de la réparation ou de l'inspection est requis." 
        });
    }

    try {
        let id_sub_inspection_gen = null;

        if (id_inspection_gen) {
            const qI = `SELECT id_sub_inspection_gen FROM sub_inspection_gen WHERE id_inspection_gen = ?`;
            const result = await queryAsync(qI, [id_inspection_gen]);

            if (result && result.length > 0) {
                id_sub_inspection_gen = result[0].id_sub_inspection_gen;
            }
        }

        let q = `
            SELECT 
                sr.id_suivi_reparation, 
                sr.budget, 
                sr.commentaire, 
                p.nom AS type_rep, 
                ci.nom_cat_inspection AS nom_cat_inspection,
                u.nom AS user_nom,
                u.prenom AS user_prenom,
                e.nom_evaluation,
                sud.id_reparation,
                sud.id_sub_inspection_gen,
                sud.tenant_id AS sud_tenant_id,
                r.tenant_id AS reparation_tenant_id
            FROM suivi_reparation sr 
            LEFT JOIN pieces p ON sr.id_piece = p.id
            LEFT JOIN cat_inspection ci ON sr.id_tache_rep = ci.id_cat_inspection
            LEFT JOIN sud_reparation sud ON sr.id_sud_reparation = sud.id_sud_reparation
            LEFT JOIN reparations r ON sud.id_reparation = r.id_reparation
            LEFT JOIN utilisateur u ON sr.user_cr = u.id_utilisateur
            LEFT JOIN evaluation e ON sud.id_evaluation = e.id_evaluation
            WHERE (sud.id_reparation = ? OR sud.id_sub_inspection_gen = ?)
        `;

        const params = [id_reparation, id_sub_inspection_gen];

        if (!isSuperAdmin && tenantId) {
            q += ` AND (sud.tenant_id = ? OR r.tenant_id = ?)`;
            params.push(tenantId, tenantId);
        }

        q += ` ORDER BY sr.created_at DESC`;

        db.query(q, params, (error, data) => {
            if (error) {
                console.error("Erreur getSuiviReparation:", error);
                return res.status(500).json({ 
                    error: "Erreur lors de la récupération des suivis",
                    details: error.message 
                });
            }
            
            return res.status(200).json({
                success: true,
                data: data,
                meta: {
                    tenant_id: !isSuperAdmin ? tenantId : null,
                    is_super_admin: isSuperAdmin,
                    total: data.length
                }
            });
        });
    } catch (error) {
        console.error("Erreur getSuiviReparation:", error);
        return res.status(500).json({ 
            error: "Une erreur s'est produite lors de la récupération des suivis." 
        });
    }
};

exports.getSuiviReparationOne = (req, res) => {
    const { id_sud_reparation } = req.query;

    const q = `
           SELECT sr.id_suivi_reparation, 
                    sr.budget, 
                    sr.commentaire, 
                    sr.id_evaluation,
                    sr.id_sud_reparation,
                    sr.id_piece,
                    sr.id_tache_rep,
                    sr.statut_fin,
                     p.nom AS type_rep, 
                     ci.nom_cat_inspection AS nom_cat_inspection,
                    u.nom,
                    e.nom_evaluation,
                    e.id_evaluation,
                    v.immatriculation,
                    m.nom_marque,
                    v.immatriculation,
                    tr.type_rep AS nom_type_rep
                    FROM 
                    suivi_reparation sr 
                    LEFT JOIN
                         pieces p ON sr.id_piece = p.id
                    LEFT JOIN 
                        cat_inspection ci ON sr.id_tache_rep = ci.id_cat_inspection
                    LEFT JOIN 
                    	sud_reparation sud ON sr.id_sud_reparation = sud.id_sud_reparation
                    LEFT JOIN 
                    	utilisateur u ON sr.user_cr = u.id_utilisateur
                    LEFT JOIN 
                    	reparations r ON sud.id_reparation = r.id_reparation
                    LEFT JOIN 
                    	vehicules v ON r.id_vehicule = v.id_vehicule
                    LEFT JOIN 
                    	marque m ON v.id_marque = m.id_marque
                    LEFT JOIN 
            			    evaluation e ON sud.id_evaluation = e.id_evaluation
                     LEFT JOIN type_reparations tr ON sud.id_type_reparation = tr.id_type_reparation
                    WHERE sr.id_sud_reparation = ?
            `;

    db.query(q, [id_sud_reparation], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.postSuiviReparation = async (req, res) => {
      let connection;
  
      try {
          const { id_evaluation, id_statut_vehicule, id_sud_reparation, user_cr, info } = req.body;
  
          if (!id_evaluation || !id_sud_reparation || !user_cr || !info || !Array.isArray(info)) {
            return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
          }
  
          connection = await new Promise((resolve, reject) => {
              db.getConnection((err, conn) => {
                  if (err) return reject(err);
                  resolve(conn);
              });
          });
  
          const beginTransaction = util.promisify(connection.beginTransaction).bind(connection);
          const commit = util.promisify(connection.commit).bind(connection);
          const connQuery = util.promisify(connection.query).bind(connection);
  
          await beginTransaction();
  
          const insertQuery = `
              INSERT INTO suivi_reparation (
                  id_sud_reparation,
                  id_tache_rep,
                  id_piece,
                  budget,
                  commentaire,
                  user_cr
              ) VALUES (?, ?, ?, ?, ?, ?)
          `;
  
          for (const rep of info) {
              const repValues = [
                  id_sud_reparation,
                  rep.id_tache_rep,
                  rep.id_piece,
                  rep.budget,
                  rep.commentaire,
                  user_cr
              ];
              await connQuery(insertQuery, repValues);
          }

          const getSubQuery = `
              SELECT sud.id_sub_inspection_gen, r.id_vehicule, r.id_statut_vehicule, r.id_reparation, gen.id_inspection_gen, sud.id_type_reparation
              FROM sud_reparation sud
              INNER JOIN reparations r ON sud.id_reparation = r.id_reparation
              LEFT JOIN sub_inspection_gen sub ON sud.id_sub_inspection_gen = sub.id_sub_inspection_gen
              LEFT JOIN inspection_gen gen ON sub.id_inspection_gen = gen.id_inspection_gen
              WHERE id_sud_reparation = ?
            `;
          const [subResult] = await connQuery(getSubQuery, [id_sud_reparation]);


          // Mise à jour de l'évaluation
          const updateEvalQuery = `
              UPDATE sud_reparation 
              SET id_evaluation = ?
              WHERE id_sud_reparation = ?
          `;
          await connQuery(updateEvalQuery, [id_evaluation, id_sud_reparation]);
  
          // Mise à jour du statut si évaluation est "OK (R)" → id_evaluation = 1
          const now = new Date();
          if (parseInt(id_evaluation) === 1) {
              const updateStatusQuery = `
                UPDATE sud_reparation
                SET id_statut = 9, 
                date_sortie = ?
                WHERE id_sud_reparation = ?
              `;
              await connQuery(updateStatusQuery, [ now ,id_sud_reparation]);

              const updateEtatQuery = `
                UPDATE reparations
                SET id_statut_vehicule = ?
                WHERE id_reparation = ?
              `;
              await connQuery(updateEtatQuery, [id_statut_vehicule, subResult?.id_reparation]);

              const updateStatusQueryInspect = `
                UPDATE sub_inspection_gen
                SET statut = 9
                WHERE id_sub_inspection_gen = ?
              `;
              await connQuery(updateStatusQueryInspect, [subResult?.id_sub_inspection_gen]);

              const updateStatusQueryInspectGen = `
                UPDATE inspection_gen
                SET id_statut_vehicule = ?
                WHERE id_inspection_gen = ?
              `;
              await connQuery(updateStatusQueryInspectGen, [id_statut_vehicule, subResult?.id_inspection_gen, ]);

              const historiqueSQL = `
                INSERT INTO historique_vehicule (
                  id_vehicule, id_chauffeur, id_statut_vehicule, statut, id_sud_reparation, action, commentaire, user_cr
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;
    
              const historiqueValues = [
                subResult?.id_vehicule,
                null,
                id_statut_vehicule || subResult?.id_statut_vehicule,
                9,
                id_sud_reparation,
                "Nouveau suivi de réparation ajouté",
                `Un nouveau suivi a été ajouté avec succès pour le véhicule n°${subResult?.id_vehicule}.`,
                user_cr
              ];
            
              await queryPromise(connection, historiqueSQL, historiqueValues);

              const getVehiculeSQL = `
              SELECT v.id_vehicule, v.immatriculation, m.nom_marque FROM vehicules v 
                INNER JOIN marque m ON v.id_marque = m.id_marque
                WHERE v.id_vehicule = ?
              `;
              
              const [getVehiculeResult] = await queryPromise(connection, getVehiculeSQL, subResult?.id_vehicule);
              const getType = `SELECT tr.type_rep FROM type_reparations tr WHERE tr.id_type_reparation = ?`;
              const [getTypeResult] = await queryPromise(connection, getType, subResult?.id_type_reparation);

              // Envoi d'emails aux utilisateurs autorisés
              const permissionSQL = `
              SELECT u.email FROM permission p 
                INNER JOIN utilisateur u ON p.user_id = u.id_utilisateur
                WHERE p.menus_id = 14 AND p.can_read = 1
                GROUP BY p.user_id
              `;

              const getUserEmailSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
              const [userResult] = await queryPromise(connection, getUserEmailSQL, [user_cr]);
              const userEmail = userResult?.[0]?.email;

            const [perResult] = await queryPromise(connection, permissionSQL);
            const message = 
            `
            Bonjour,

            Le véhicule suivant a été réparé pour le type d’intervention suivant :

            - Marque : ${getVehiculeResult?.[0].nom_marque}
            - Immatriculation : ${getVehiculeResult?.[0].immatriculation}
            - Type de réparation : ${getTypeResult?.[0].type_rep}
            - Réparation n°${id_sud_reparation}

            La réparation a été finalisée avec succès et le statut du véhicule a été mis à jour dans le système.

            Cordialement,  
            L'équipe Maintenance GTM
            `;

            perResult
              .filter(({ email }) => email !== userEmail)
              .forEach(({ email }) => {
                sendEmail({
                  email,
                  subject: `🔧 Réparation mise à jour`,
                  message
                  });
                });
          }
  
          await commit();
          connection.release();
  
          return res.status(201).json({ message: 'Suivi de réparation ajouté avec succès.' });
  
      } catch (error) {
          console.error("Erreur pendant le traitement :", error);
          if (connection) {
              try {
                  await connection.rollback();
                  connection.release();
              } catch (rollbackError) {
                  console.error('Erreur pendant le rollback :', rollbackError);
              }
          }
          return res.status(500).json({ error: 'Erreur interne du serveur.' });
      }
};
  
exports.putSuiviReparation = async (req, res) => {
    let connection;

    try {
        const { id_suivi_reparation } = req.query;
        const { id_tache_rep, id_piece, budget, commentaire, id_evaluation, id_sud_reparation } = req.body;

        if (!id_suivi_reparation || !id_evaluation || !id_sud_reparation) {
            return res.status(400).json({ error: 'Certains champs requis sont manquants.' });
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if (err) return reject(err);
                resolve(conn);
            });
        });

        const connQuery = util.promisify(connection.query).bind(connection);

        // Mise à jour du suivi
        const updateQuery = `
            UPDATE suivi_reparation
            SET 
                id_tache_rep = ?,
                id_piece = ?,
                budget = ?,
                commentaire = ?
            WHERE id_suivi_reparation = ?
        `;

        const values = [
            id_tache_rep || null,
            id_piece || null,
            budget || 0,
            commentaire || '',
            id_suivi_reparation
        ];

        const result = await connQuery(updateQuery, values);

        if (result.affectedRows === 0) {
            connection.release();
            return res.status(404).json({ error: 'Aucun suivi trouvé avec cet ID.' });
        }

        // Mise à jour de l’évaluation
        const updateEvalQuery = `
            UPDATE sud_reparation 
            SET id_evaluation = ?
            WHERE id_sud_reparation = ?
        `;
        await connQuery(updateEvalQuery, [id_evaluation, id_sud_reparation]);

        // Mise à jour du statut si l’évaluation est "OK (R)" (id = 1)
        if (parseInt(id_evaluation) === 1) {
            const updateStatusQuery = `
                UPDATE sud_reparation
                SET id_statut = 9
                WHERE id_sud_reparation = ?
            `;
            await connQuery(updateStatusQuery, [id_sud_reparation]);
        }

        connection.release();

        return res.status(200).json({ message: 'Suivi de réparation et évaluation mis à jour avec succès.' });

    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        if (connection) connection.release();
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
};

//Document réparation
exports.getDocumentReparation = (req, res) => {
    const {id_sud_reparation} = req.query;
    const q = `
                SELECT 
                    dr.nom_document, 
                    dr.type_document, 
                    dr.chemin_document, 
                    dr.created_at
                FROM 
                    document_reparation dr
                WHERE dr.id_sud_reparation = ?
            `;

    db.query(q, [id_sud_reparation], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postDocumentReparation = async (req, res) => {
    const { id_sud_reparation, id_sub_inspection, nom_document, type_document, chemin_document } = req.body;
    
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_sud_reparation,
        id_sub_inspection,
        nom_document,
        type_document
    }));
    

    try {
        await Promise.all(
            documents.map((doc) => {
                return new Promise((resolve, reject) => {
                    const query = 'INSERT INTO document_reparation(`id_sud_reparation`, `id_sub_inspection`, `nom_document`, `type_document`, `chemin_document`) VALUES(?,?,?,?,?)';
                    db.query(query, [doc.id_sud_reparation, doc.id_sub_inspection, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
                        if (err) {
                            console.error('Erreur lors de l\'insertion du document:', err);
                            reject(err);
                        } else {
                            resolve(result); 
                        }
                    });
                });
            })
        );

        res.status(200).json({ message: 'Documents ajoutés avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur interne du serveur', error });
    }
};