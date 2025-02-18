const { db } = require("./../config/database");

//Template
exports.getTemplateCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_template) AS nbre_template
        FROM template_occupation
        WHERE template_occupation.est_supprime = 0
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.getTemplate = (req, res) => {

    const q = `
            SELECT 
                tm.id_template, 
                tm.date_actif,
                tm.date_inactif,
                tm.desc_template,
                client.nom AS nom_client, 
                td.nom_type_d_occupation, 
                batiment.nom_batiment, 
                dn.nom_denomination_bat, 
                b.nom_batiment AS nom_whse_fact,
                objet_fact.nom_objet_fact,
                statut_template.nom_statut_template,
                statut_template.id_statut_template,
                niveau_batiment.nom_niveau,
                ct.conditions
            FROM 
                template_occupation tm
                INNER JOIN client ON tm.id_client = client.id_client
                INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
                INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
                INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
                INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
                INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
                INNER JOIN batiment b ON whse_fact.id_batiment = b.id_batiment
                INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
                INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau
                LEFT JOIN contrat ct ON tm.id_contrat = ct.id_contrat 
                WHERE tm.est_supprime = 0    
                ORDER BY tm.date_actif DESC   
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


exports.getTemplate5DerniersSS = (req, res) => {
    const { id_client, periode } = req.query;

    if (!id_client || !periode) {
        return res.status(400).json({ error: "L'ID de la tâche est requis." });
    }

    const q = `
        SELECT 
            tm.id_template, 
            tm.date_actif,
            tm.date_inactif,
            tm.desc_template,
            client.nom AS nom_client, 
            td.nom_type_d_occupation, 
            batiment.nom_batiment, 
            dn.nom_denomination_bat, 
            whse_fact.nom_whse_fact,
            objet_fact.nom_objet_fact,
            statut_template.nom_statut_template,
            statut_template.id_statut_template,
            niveau_batiment.nom_niveau
        FROM 
            template_occupation tm
            INNER JOIN client ON tm.id_client = client.id_client
            INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
            LEFT JOIN batiment ON tm.id_batiment = batiment.id_batiment
            LEFT JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
            INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
            LEFT JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
            LEFT JOIN statut_template ON tm.status_template = statut_template.id_statut_template
            INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau
        WHERE 
            MOTH(tm.date_actif) = ? 
            AND tm.id_client = ?
        ORDER BY 
            tm.date_actif DESC;
    `;

    // Inverser l'ordre des paramètres : periode (date) puis id_client
    db.query(q, [periode, id_client], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTemplate5Derniers = (req, res) => {
    const { id_client, periode, idProvince } = req.query;

    // Validation des paramètres
    if (!id_client || !periode) {
        return res.status(400).json({
            error: "Les paramètres 'id_client' et 'periode' sont requis.",
        });
    }

    // Extraire l'année et le mois de la période
    const [year, month] = periode.split('-');

    if (!year || !month || isNaN(year) || isNaN(month) || year.length !== 4 || month.length !== 2) {
        return res.status(400).json({
            error: "Le paramètre 'periode' doit être au format 'YYYY-MM'.",
        });
    }

    let q = `
        SELECT 
            tm.id_template, 
            tm.date_actif,
            tm.date_inactif,
            tm.desc_template,
            client.nom AS nom_client, 
            td.nom_type_d_occupation, 
            batiment.nom_batiment, 
            dn.nom_denomination_bat, 
            whse_fact.nom_whse_fact,
            objet_fact.nom_objet_fact,
            statut_template.nom_statut_template,
            statut_template.id_statut_template,
            niveau_batiment.nom_niveau,
            pv.capital
        FROM 
            template_occupation tm
            INNER JOIN client ON tm.id_client = client.id_client
            INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
            LEFT JOIN batiment ON tm.id_batiment = batiment.id_batiment
            INNER JOIN provinces pv ON batiment.ville = pv.id
            LEFT JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
            INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
            LEFT JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
            LEFT JOIN statut_template ON tm.status_template = statut_template.id_statut_template
            INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau
        WHERE 
            YEAR(tm.date_actif) = ? 
            AND MONTH(tm.date_actif) = ? 
            AND tm.id_client = ?
    `;

    const params = [year, month, id_client];

    if (idProvince) {
        q += ' AND pv.id = ?';
        params.push(idProvince);
    }

    q += ' ORDER BY tm.date_actif DESC';

    // Exécuter la requête avec les paramètres
    db.query(q, params, (error, data) => {
        if (error) {
            console.error("Erreur lors de l'exécution de la requête :", error);
            return res.status(500).json({ error: "Erreur interne du serveur." });
        }

        // Retourner les résultats sous forme de JSON
        return res.status(200).json(data);
    });
};

exports.getTemplateDeuxPrecedent = (req, res) => {
    const { id_client, idProvince } = req.query;

    let q = `
        SELECT 
            tm.id_template, 
            tm.date_actif,
            tm.date_inactif,
            tm.desc_template,
            client.nom AS nom_client, 
            td.nom_type_d_occupation, 
            batiment.nom_batiment, 
            dn.nom_denomination_bat, 
            whse_fact.nom_whse_fact,
            objet_fact.nom_objet_fact,
            statut_template.nom_statut_template,
            statut_template.id_statut_template,
            niveau_batiment.nom_niveau,
            pv.capital
        FROM 
            template_occupation tm
            INNER JOIN client ON tm.id_client = client.id_client
            INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
            INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
            INNER JOIN provinces pv ON batiment.ville = pv.id
            INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
            INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
            INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
            INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
            INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau
        WHERE 
            tm.id_client = ?
    `;

    const params = [id_client];

    if (idProvince) {
        q += ' AND pv.id = ?';
        params.push(idProvince);
    }

    // Exécuter la requête
    db.query(q, params, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTemplateOne = (req, res) => {
    const {id_template} = req.query;

    const q = `
            SELECT 
                tm.id_template, 
                tm.date_actif,
                tm.date_inactif,
                tm.desc_template,
                client.nom AS nom_client, 
                client.id_client,
                td.nom_type_d_occupation, 
                batiment.nom_batiment, 
                dn.nom_denomination_bat, 
                b.nom_batiment AS nom_whse_fact,
                objet_fact.nom_objet_fact,
                statut_template.nom_statut_template,
                statut_template.id_statut_template,
                niveau_batiment.nom_niveau,
                b.ville AS id_ville
            FROM 
                template_occupation tm
                INNER JOIN client ON tm.id_client = client.id_client
                INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
                INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
                INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
                INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
                INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
                INNER JOIN batiment b ON whse_fact.id_batiment = b.id_batiment
                INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
                INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau     
                WHERE tm.est_supprime = 0 AND tm.id_template = ?        
            `;

    db.query(q,[id_template], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postTemplate = (req, res) => {
    db.getConnection((err, connection) => {
        if (err) {
            console.error("Erreur de connexion à la base de données:", err);
            return res.status(500).json({ error: "Erreur de connexion à la base de données." });
        }

        // Démarrer une transaction
        connection.beginTransaction((err) => {
            if (err) {
                console.error("Erreur lors du démarrage de la transaction:", err);
                return res.status(500).json({ error: "Erreur lors du démarrage de la transaction." });
            }

            // Insérer dans la table whse_fact pour obtenir l'id_whse_fact
            const qWhseFact = `INSERT INTO whse_fact (id_batiment, nom_whse_fact) VALUES (?, ?)`;
            const whseFactValues = [
                req.body.id_batiment_fact,
                req.body.nom_whse_fact
            ];

            connection.query(qWhseFact, whseFactValues, (err, whseFactResult) => {
                if (err) {
                    return connection.rollback(() => {
                        console.log("Erreur lors de l'insertion dans whse_fact:", err);
                        return res.status(500).json({ error: "Erreur lors de l'insertion dans whse_fact.", err });
                    });
                }

                const id_whse_fact = whseFactResult.insertId; // Récupérer l'ID généré

                // Insérer dans la table template_occupation avec le nouvel id_whse_fact
                const qTemplate = `
                    INSERT INTO template_occupation 
                    (id_client, id_type_occupation, id_batiment, id_niveau, id_denomination, id_whse_fact, id_contrat, id_objet_fact, desc_template, status_template, date_actif) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const templateValues = [
                    req.body.id_client,
                    req.body.id_type_occupation,
                    req.body.id_batiment,
                    req.body.id_niveau,
                    req.body.id_denomination,
                    id_whse_fact,  // Utiliser l'ID généré dans whse_fact
                    req.body.id_contrat,
                    req.body.id_objet_fact,
                    req.body.desc_template,
                    req.body.status_template || 1,
                    req.body.date_actif || new Date()
                ];

                connection.query(qTemplate, templateValues, (err, result) => {
                    if (err) {
                        return connection.rollback(() => {
                            console.error("Erreur lors de l'insertion dans template_occupation:", err);
                            return res.status(500).json({ error: "Erreur lors de l'insertion dans template_occupation." });
                        });
                    }

                    // Commit de la transaction
                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error("Erreur lors du commit de la transaction:", err);
                                return res.status(500).json({ error: "Erreur lors du commit de la transaction." });
                            });
                        }

                        // Si tout a réussi, envoyer la réponse
                        return res.status(201).json({ message: 'Template ajouté avec succès' });
                    });
                });
            });
        });

        // Libérer la connexion après l'opération
        connection.release();
    });
};

exports.putTemplate = (req, res) => {
    const { id_template } = req.query;

    if (!id_template || isNaN(id_template)) {
        return res.status(400).json({ error: 'Invalid template ID provided' });
    }

    db.getConnection((err, connection) => {
        if (err) {
            console.error("Erreur de connexion à la base de données:", err);
            return res.status(500).json({ error: "Erreur de connexion à la base de données." });
        }

        connection.beginTransaction((err) => {
            if (err) {
                console.error("Erreur lors du démarrage de la transaction:", err);
                connection.release();
                return res.status(500).json({ error: "Erreur lors du démarrage de la transaction." });
            }

            // Insertion dans whse_fact pour obtenir un id_whse_fact
            const qWhseFact = `INSERT INTO whse_fact (id_batiment, nom_whse_fact) VALUES (?, ?)`;
            const whseFactValues = [
                req.body.id_batiment,
                req.body.nom_whse_fact
            ];

            connection.query(qWhseFact, whseFactValues, (err, whseFactResult) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error("Erreur lors de l'insertion dans whse_fact:", err);
                        connection.release();
                        return res.status(500).json({ error: "Erreur lors de l'insertion dans whse_fact." });
                    });
                }

                const id_whse_fact = whseFactResult.insertId; // ID généré dans whse_fact

                // Mise à jour dans template_occupation avec le nouvel id_whse_fact
                const q = `
                    UPDATE template_occupation 
                    SET 
                        id_client = ?,
                        id_type_occupation = ?,
                        id_batiment = ?,
                        id_niveau = ?,
                        id_denomination = ?,
                        id_whse_fact = ?,
                        id_objet_fact = ?,
                        desc_template = ?
                    WHERE id_template = ?
                `;

                const values = [
                    req.body.id_client,
                    req.body.id_type_occupation,
                    req.body.id_batiment,
                    req.body.id_niveau,
                    req.body.id_denomination,
                    id_whse_fact, // Utiliser le nouvel id_whse_fact ici
                    req.body.id_objet_fact,
                    req.body.desc_template,
                    id_template
                ];

                connection.query(q, values, (error, result) => {
                    if (error) {
                        return connection.rollback(() => {
                            console.error("Erreur lors de la mise à jour du template:", error);
                            connection.release();
                            return res.status(500).json({ error: 'Erreur lors de la mise à jour du template.' });
                        });
                    }

                    connection.commit((err) => {
                        if (err) {
                            return connection.rollback(() => {
                                console.error("Erreur lors du commit de la transaction:", err);
                                connection.release();
                                return res.status(500).json({ error: "Erreur lors du commit de la transaction." });
                            });
                        }

                        // Succès de la transaction
                        connection.release();
                        return res.json({ message: 'Template record updated successfully' });
                    });
                });
            });
        });
    });
};

exports.putTemplateStatut = async (req, res) => {
    const { id_template } = req.query;

    if (!id_template || isNaN(id_template)) {
        return res.status(400).json({ error: 'Invalid template ID provided' });
    }

    const { status_template } = req.body;
    if (typeof status_template === 'undefined' || isNaN(status_template)) {
        return res.status(400).json({ error: 'Invalid status value provided' });
    }

    try {
        let query = `
            UPDATE template_occupation
            SET status_template = ?,
                date_inactif = CASE WHEN ? = 2 THEN NOW() ELSE NULL END
            WHERE id_template = ?
        `;

        const values = [parseInt(status_template), parseInt(status_template), id_template];

        db.query(query, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update template status' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }

            return res.json({ message: 'Template status updated successfully' });
        });
    } catch (err) {
        console.error("Error updating template status:", err);
        return res.status(500).json({ error: 'Failed to update template status' });
    }
};

exports.deleteUpdateTemplate = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE template_occupation SET est_supprime = 1 WHERE id_template = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
}

//Type d'occupation
exports.getTypeOccupation = (req, res) => {

    const q = `
            SELECT * FROM type_d_occupation
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

//Objet facture
exports.getObjetFacture = (req, res) => {

    const q = `
            SELECT * FROM objet_fact
            `;  

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    }); 
};

//Déclaration superficie
exports.getDeclarationCount = (req, res) => {
    
    let q = `
        SELECT 
            COUNT(id_declaration_super ) AS nbre_declaration
        FROM declaration_super
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

/* exports.getDeclaration = (req, res) => { 
    const { ville, client, batiment, dateRange } = req.body;

    const {search} = req.query;

    console.log(req.body)


    const months = dateRange?.months || [];
    const year = dateRange?.year;

    // Début de la requête SQL pour les détails de la déclaration
    let q = `
        SELECT 
            ds.*, 
            client.nom, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0
    `;

    // Ajout des filtres dynamiques uniquement si les paramètres sont présents
    if (ville && Array.isArray(ville) && ville.length > 0) {
        const escapedVille = ville.map(v => db.escape(v)).join(',');
        q += ` AND ds.id_ville IN (${escapedVille})`;
    }
    
    if (client && Array.isArray(client) && client.length > 0) {
        const escapedClient = client.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_client IN (${escapedClient})`;
    }
    
    if (batiment && Array.isArray(batiment) && batiment.length > 0) {
        const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
        q += ` AND ds.id_batiment IN (${escapedBatiment})`;
    }
    
    if (months && months.length > 0) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    if (year) {
        const escapedYear = db.escape(year);
        q += ` AND YEAR(ds.periode) = ${escapedYear}`;
    }

    // Ajout du tri des résultats
    q += ` ORDER BY ds.date_creation DESC`;

    // Exécution de la première requête (détails des déclarations)
    db.query(q, (error, data) => {
        if (error) {
            console.error('Erreur SQL:', error.message);
            return res.status(500).json({
                error: 'Erreur lors de l\'exécution de la requête SQL.',
                details: error.message,
            });
        }
        
        // Vérification des résultats de la première requête
        if (!data || data.length === 0) {
            return res.status(404).json({
                message: 'Aucune déclaration trouvée pour les critères sélectionnés.',
            });
        }

        // Requête SQL pour les agrégats
        let qTotal = `
            SELECT 
                client.nom,
                COUNT(DISTINCT ds.id_client) AS nbre_client,
                SUM(ds.m2_facture) AS total_m2_facture,
                SUM(ds.total_entreposage) AS total_entreposage,
                SUM(ds.ttc_entreposage) AS total_ttc_entreposage,
                SUM(ds.total_manutation) AS total_manutation,
                SUM(ds.ttc_manutation) AS total_ttc_manutation
            FROM 
                declaration_super AS ds
                LEFT JOIN provinces p ON p.id = ds.id_ville
                LEFT JOIN client ON ds.id_client = client.id_client
                LEFT JOIN template_occupation tc ON tc.id_template = ds.id_template
            WHERE 
                tc.status_template = 1 
                AND ds.est_supprime = 0
        `;

        // Ajout des mêmes filtres dynamiques pour la deuxième requête
        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVille = ville.map(v => db.escape(v)).join(',');
            qTotal += ` AND ds.id_ville IN (${escapedVille})`;
        }

        if (client && Array.isArray(client) && client.length > 0) {
            const escapedClient = client.map(c => db.escape(c)).join(',');
            qTotal += ` AND ds.id_client IN (${escapedClient})`;
        }

        if (batiment && Array.isArray(batiment) && batiment.length > 0) {
            const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
            qTotal += ` AND ds.id_batiment IN (${escapedBatiment})`;
        }

        if (months && months.length > 0) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qTotal += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (year) {
            const escapedYear = db.escape(year);
            qTotal += ` AND YEAR(ds.periode) = ${escapedYear}`;
        }

        if (search) {
            const searchQuery = `%${search}%`;
            q += ` AND (client.nom LIKE ${db.escape(searchQuery)} OR tc.desc_template LIKE ${db.escape(searchQuery)})`;
        }
        
        

        // Exécution de la deuxième requête (agrégats)
        db.query(qTotal, (error, totals) => {
            if (error) {
                console.error('Erreur SQL (agrégats):', error.message);
                return res.status(500).json({
                    error: 'Erreur lors de l\'exécution de la requête SQL pour les agrégats.',
                    details: error.message,
                });
            }

            // Vérification des résultats des agrégats
            if (!totals || totals.length === 0) {
                return res.status(404).json({
                    message: 'Aucun agrégat trouvé pour les critères sélectionnés.',
                });
            }

            // Fusionner les résultats des deux requêtes et les renvoyer
            return res.status(200).json({
                declarations: data,
                totals: totals[0], // Totaux sous forme d'objet
            });
        });
    });
}; */

exports.getDeclarationsId = (req, res) => {

    const q = `
            SELECT ds.id_declaration_super FROM declaration_super AS ds
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDeclaration = (req, res) => {
    const { ville, client, batiment, period } = req.body;
    const { search } = req.query;

    let months = [];
    let year;

    if (typeof period === 'string' && period.includes('-')) {
        const [yr, mo] = period.split('-').map(Number);
        year = yr;
        months = [mo];
    } else if (typeof period === 'number') {
        year = period;
    }

    let q = `
        SELECT 
            ds.*, 
            client.nom, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
            LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0
    `;

    // Ajout des filtres
    if (ville?.length > 0) q += ` AND ds.id_ville IN (${ville.map(v => db.escape(v)).join(',')})`;
    if (client?.length > 0) q += ` AND ds.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    if (batiment?.length > 0) q += ` AND tc.id_batiment IN (${batiment.map(b => db.escape(b)).join(',')})`;
    if (months.length > 0) q += ` AND MONTH(ds.periode) IN (${months.map(m => db.escape(m)).join(',')})`;
    if (year) q += ` AND YEAR(ds.periode) = ${db.escape(year)}`;
    if (search) q += ` AND (client.nom LIKE ${db.escape(`%${search}%`)} OR tc.desc_template LIKE ${db.escape(`%${search}%`)})`;

    q += ` ORDER BY ds.date_creation DESC`;

    db.query(q, (error, data) => {
        if (error) return res.status(500).json({ error: 'Erreur SQL', details: error.message });

        if (!data?.length) return res.status(404).json({ message: 'Aucune déclaration trouvée.' });

        let qTotal = `
            SELECT 
                client.nom,
                COUNT(DISTINCT ds.id_client) AS nbre_client,
                SUM(ds.m2_facture) AS total_m2_facture,
                SUM(ds.total_entreposage) AS total_entreposage,
                SUM(ds.ttc_entreposage) AS total_ttc_entreposage,
                SUM(ds.total_manutation) AS total_manutation,
                SUM(ds.ttc_manutation) AS total_ttc_manutation
            FROM 
                declaration_super AS ds
                LEFT JOIN provinces p ON p.id = ds.id_ville
                LEFT JOIN client ON ds.id_client = client.id_client
                LEFT JOIN template_occupation tc ON tc.id_template = ds.id_template
            WHERE 
                tc.status_template = 1 
                AND ds.est_supprime = 0
        `;

        if (ville?.length > 0) qTotal += ` AND ds.id_ville IN (${ville.map(v => db.escape(v)).join(',')})`;
        if (client?.length > 0) qTotal += ` AND ds.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
        if (batiment?.length > 0) qTotal += ` AND ds.id_batiment IN (${batiment.map(b => db.escape(b)).join(',')})`;
        if (months.length > 0) qTotal += ` AND MONTH(ds.periode) IN (${months.map(m => db.escape(m)).join(',')})`;
        if (year) qTotal += ` AND YEAR(ds.periode) = ${db.escape(year)}`;
        if (search) qTotal += ` AND (client.nom LIKE ${db.escape(`%${search}%`)} OR tc.desc_template LIKE ${db.escape(`%${search}%`)})`;

        db.query(qTotal, (error, totals) => {
            if (error) return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });

            return res.status(200).json({
                declarations: data,
                totals: totals[0],
            });
        });
    });
};

/* exports.getDeclarationClientOneAll = (req, res) => { 
    const { ville, batiment, dateRange } = req.body;
    const { idClient } = req.query;

        // Validation et parsing de dateRange
        let year, month;
        if (dateRange && typeof dateRange === 'string') {
            [year, month] = dateRange.split('-');
            if (!year || !month || isNaN(year) || isNaN(month)) {
                return res.status(400).json({ error: "Invalid dateRange format. Expected 'YYYY-MM'." });
            }
        }

    let q = `
        SELECT 
            ds.*, 
            client.nom, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
        WHERE tc.status_template = 1 AND ds.est_supprime = 0
    `;

    if (ville && ville.length > 0) {
        q += ` AND ds.id_ville IN (${ville.map(v => db.escape(v)).join(',')})`;
    }
    
    if (idClient) {
        q += ` AND ds.id_client = ${idClient}`;
    }
    
    if (batiment && batiment.length > 0) {
        q += ` AND ds.id_batiment IN (${batiment.map(b => db.escape(b)).join(',')})`;
    }
    
    if (dateRange && typeof dateRange === 'string') {
        q += ` AND MONTH(ds.periode) = ${db.escape(month)}`;
    }

    q += ` ORDER BY ds.periode DESC`

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}; */

exports.getDeclarationClientOneAll = (req, res) => { 
    const { ville, batiment, period } = req.body;
    const { idClient } = req.query;

    let months = [];
    let years = [];

    if (period) {
        // Vérifier si mois est un tableau ou une valeur unique
        if (Array.isArray(period.mois)) {
            months = period.mois.map(Number);
        } else if (typeof period.mois === 'number') {
            months = [Number(period.mois)];
        }

        // Vérifier si annees est un tableau ou une valeur unique
        if (Array.isArray(period.annees)) {
            years = period.annees.map(Number);
        } else if (typeof period.annees === 'number') {
            years = [Number(period.annees)];
        }
    }

    let q = `
        SELECT 
            ds.*, 
            client.nom, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
        WHERE tc.status_template = 1 AND ds.est_supprime = 0
    `;

    // Filtrer par ville
    if (ville && ville.length > 0) {
        q += ` AND ds.id_ville IN (${ville.map(v => db.escape(v)).join(',')})`;
    }

    // Filtrer par client
    if (idClient) {
        q += ` AND ds.id_client = ${db.escape(idClient)}`;
    }

    // Filtrer par bâtiment
    if (batiment && batiment.length > 0) {
        q += ` AND dsb.id_batiment IN (${batiment.map(b => db.escape(b)).join(',')})`;
    }

    // Filtrer par mois
    if (months.length > 0) {
        q += ` AND MONTH(ds.periode) IN (${months.map(m => db.escape(m)).join(',')})`;
    }

    // Filtrer par année
    if (years.length > 0) {
        q += ` AND YEAR(ds.periode) IN (${years.map(y => db.escape(y)).join(',')})`;
    }

    // Ajouter l'ordre de tri
    q += ` ORDER BY ds.date_creation DESC`;

    // Exécuter la requête
    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDeclaration5derniers = (req, res) => { 
    let q = `
                SELECT 
                    ds.*, 
                    client.nom, 
                    p.capital, 
                    batiment.nom_batiment, 
                    objet_fact.nom_objet_fact,
                    tc.desc_template
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                WHERE tc.status_template = 1 AND ds.est_supprime = 0
                ORDER BY ds.date_creation DESC
                LIMIT 5
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDeclarationOne = (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: "L'identifiant (id) est requis." });
    }

    const query = `
        SELECT 
            ds.*, 
            client.nom, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0 
            AND ds.id_declaration_super = ?
    `;

    db.query(query, [id], (error, data) => {
        if (error) {
            return res.status(500).json({ message: "Erreur lors de la récupération des données.", error });
        }
        
        if (data.length === 0) {
            return res.status(404).json({ message: "Déclaration non trouvée." });
        }
        
        return res.status(200).json(data);
    });
};

exports.getDeclarationOneClient = (req, res) => {
    const { id_client, idProvince, periode } = req.query;

    // Validation de l'identifiant du client
    if (!id_client) {
        return res.status(400).json({ message: "L'identifiant (id_client) est requis." });
    }

    // Extraire l'année et le mois de la période
    const [year, month] = periode.split('-');

    if (isNaN(parseInt(id_client))) {
        return res.status(400).json({ message: "L'identifiant (id_client) doit être un nombre valide." });
    }

    // Début de la requête SQL
    let query = `
        SELECT 
            ds.*, 
            client.nom AS nom_client, 
            p.capital, 
            batiment.nom_batiment, 
            objet_fact.nom_objet_fact,
            tc.desc_template
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            LEFT JOIN template_occupation tc ON tc.id_template = ds.id_template
        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0 
            AND ds.id_client = ?
    `;

    const params = [id_client];

    // Ajout de la condition pour idProvince si elle est fournie
    if (idProvince) {
        if (isNaN(parseInt(idProvince))) {
            return res.status(400).json({ message: "L'identifiant de la province (idProvince) doit être un nombre valide." });
        }
        query += ` AND ds.id_ville = ?`;
        params.push(idProvince);
    }

     if(periode !== 'null') {
        query += ` AND YEAR(ds.periode) = ? AND MONTH(ds.periode) = ? `;
        params.push(year, month);
    }

    query += `
        ORDER BY 
            YEAR(ds.periode) DESC, 
            MONTH(ds.periode) DESC
    `;
};

/* exports.postDeclaration = async (req, res) => {

    try {
        const {
            id_template,
            periode,
            m2_occupe,
            m2_facture,
            tarif_entreposage,
            entreposage,
            debours_entreposage,
            total_entreposage,
            ttc_entreposage,
            desc_entreposage,
            id_ville,
            id_client,
            id_objet,
            manutation,
            tarif_manutation,
            debours_manutation,
            total_manutation,
            ttc_manutation,
            desc_manutation,
            id_batiments = [],
        } = req.body;

        if (!id_ville || !id_client) {
            return res.status(400).json({ error: "L'ID de la ville et client sont requis." });
        }

        if (!id_template || !periode ) {
            return res.status(400).json({ error: "Les champs obligatoires sont manquants." });
        }

        const declarationQuery = `
            INSERT INTO declaration_super (
                id_template, periode, m2_occupe, m2_facture, tarif_entreposage,
                entreposage, debours_entreposage, total_entreposage, ttc_entreposage, desc_entreposage,
                id_ville, id_client, id_objet, manutation, tarif_manutation,
                debours_manutation, total_manutation, ttc_manutation, desc_manutation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const declarationValues = [
            id_template, periode, m2_occupe, m2_facture, tarif_entreposage,
            entreposage, debours_entreposage, total_entreposage, ttc_entreposage, desc_entreposage,
            id_ville, id_client, id_objet, manutation, tarif_manutation,
            debours_manutation, total_manutation, ttc_manutation, desc_manutation
        ];

        // Exécuter la requête principale
        db.query(declarationQuery, declarationValues, (declarationError, declarationResult) => {
            if (declarationError) {
                console.error("Erreur lors de l'insertion dans declaration_super:", declarationError);
                return res.status(500).json({ error: "Erreur lors de l'ajout de la déclaration." });
            }

            const declarationId = declarationResult.insertId;

            // Associer les bâtiments s'ils sont fournis
            if (id_batiments.length > 0) {
                const batimentValues = id_batiments.map((id_batiment) => [declarationId, id_batiment]);
                const batimentQuery = `
                    INSERT INTO declaration_super_batiment (id_declaration_super, id_batiment) VALUES ?
                `;

                db.query(batimentQuery, [batimentValues], (batimentError) => {
                    if (batimentError) {
                        console.error("Erreur lors de l'insertion dans declaration_super_batiment:", batimentError);
                        return res.status(500).json({ error: "Erreur lors de l'association des bâtiments." });
                    }

                    return res.status(201).json({ message: 'Déclaration ajoutée avec succès et bâtiments associés.' });
                });
            } else {
                // Si aucun bâtiment n'est fourni
                return res.status(201).json({ message: 'Déclaration ajoutée avec succès.' });
            }
        });
    } catch (error) {
        console.error("Erreur inattendue lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur inattendue s'est produite lors de l'ajout de la déclaration." });
    }
}; */

exports.postDeclaration = async (req, res) => {
    try {
        const {
            id_template,
            periode,
            m2_occupe,
            m2_facture,
            tarif_entreposage,
            entreposage,
            debours_entreposage,
            total_entreposage,
            ttc_entreposage,
            desc_entreposage,
            id_ville,
            id_client,
            id_objet,
            manutation,
            tarif_manutation,
            debours_manutation,
            total_manutation,
            ttc_manutation,
            desc_manutation,
            id_batiments = [],
        } = req.body;


        if (!id_ville || !id_client) {
            return res.status(400).json({ error: "Veuillez ouvrir la section Manutention pour vérifier si la ville et le client sont remplis. Si c'est le cas, envoyez les données maintenant." });
        }

        if (!id_template || !periode) {
            return res.status(400).json({ error: "Les champs obligatoires sont manquants." });
        }

        const periodeDate = new Date(periode);
            if (isNaN(periodeDate.getTime())) {
                return res.status(400).json({ error: "Format de période invalide." });
            }
            const year = periodeDate.getUTCFullYear();
            const month = String(periodeDate.getUTCMonth() + 1).padStart(2, '0');
            const fixedPeriode = `${year}-${month}-03`;


        const checkQuery = `
            SELECT COUNT(*) AS count
            FROM declaration_super
            WHERE id_template = ? AND periode = ?
        `;
        const checkValues = [id_template, fixedPeriode];

        db.query(checkQuery, checkValues, (checkError, checkResult) => {
            if (checkError) {
                console.error("Erreur lors de la vérification des doublons:", checkError);
                return res.status(500).json({ error: "Erreur lors de la vérification des doublons." });
            }

            const { count } = checkResult[0];
            if (count > 0) {
                return res.status(409).json({ error: "Une déclaration avec cet id_template et cette période existe déjà." });
            }

            // Insérer la déclaration après la vérification
            const declarationQuery = `
                INSERT INTO declaration_super (
                    id_template, periode, m2_occupe, m2_facture, tarif_entreposage,
                    entreposage, debours_entreposage, total_entreposage, ttc_entreposage, desc_entreposage,
                    id_ville, id_client, id_objet, manutation, tarif_manutation,
                    debours_manutation, total_manutation, ttc_manutation, desc_manutation
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const declarationValues = [
                id_template, fixedPeriode, m2_occupe, m2_facture, tarif_entreposage,
                entreposage, debours_entreposage, total_entreposage, ttc_entreposage, desc_entreposage,
                id_ville, id_client, id_objet, manutation, tarif_manutation,
                debours_manutation, total_manutation, ttc_manutation, desc_manutation
            ];

            db.query(declarationQuery, declarationValues, (declarationError, declarationResult) => {
                if (declarationError) {
                    console.error("Erreur lors de l'insertion dans declaration_super:", declarationError);
                    return res.status(500).json({ error: "Erreur lors de l'ajout de la déclaration." });
                }

                const declarationId = declarationResult.insertId;

                // Associer les bâtiments s'ils sont fournis
                if (id_batiments.length > 0) {
                    const batimentValues = id_batiments.map((id_batiment) => [declarationId, id_batiment]);
                    const batimentQuery = `
                        INSERT INTO declaration_super_batiment (id_declaration_super, id_batiment) VALUES ?
                    `;

                    db.query(batimentQuery, [batimentValues], (batimentError) => {
                        if (batimentError) {
                            console.error("Erreur lors de l'insertion dans declaration_super_batiment:", batimentError);
                            return res.status(500).json({ error: "Erreur lors de l'association des bâtiments." });
                        }

                        return res.status(201).json({ message: 'Déclaration ajoutée avec succès et bâtiments associés.' });
                    });
                } else {
                    // Si aucun bâtiment n'est fourni
                    return res.status(201).json({ message: 'Déclaration ajoutée avec succès.' });
                }
            });
        });
    } catch (error) {
        console.error("Erreur inattendue lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur inattendue s'est produite lors de l'ajout de la déclaration." });
    }
};


exports.putDeclaration = (req, res) => {
    const { id_declaration } = req.query;
    const { periode } = req.body; // Ajout de la récupération de "periode" depuis le body

    if (!id_declaration || isNaN(id_declaration)) {
        return res.status(400).json({ error: 'Invalid declaration ID provided' });
    }

    if (!periode) {
        return res.status(400).json({ error: 'Period is required' });
    }

    const periodeDate = new Date(periode);
    if (isNaN(periodeDate.getTime())) {
        return res.status(400).json({ error: "Invalid period format." });
    }
    
    // Formatting the period to the expected format YYYY-MM-DD
    const year = periodeDate.getUTCFullYear();
    const month = String(periodeDate.getUTCMonth() + 1).padStart(2, '0');
    const fixedPeriode = `${year}-${month}-03`; // Assuming the day is always 03

    try {
        const q = `
            UPDATE declaration_super
            SET 
                id_template = ?,
                periode = ?,
                m2_occupe = ?,
                m2_facture = ?,
                tarif_entreposage = ?,
                entreposage = ?,
                debours_entreposage = ?,
                total_entreposage = ?,
                ttc_entreposage = ?,
                desc_entreposage = ?,
                id_ville = ?,
                id_client = ?,
                id_objet = ?,
                manutation = ?,
                tarif_manutation = ?,
                debours_manutation = ?,
                total_manutation = ?,
                ttc_manutation = ?,
                desc_manutation = ?
            WHERE id_declaration_super = ?
        `;

        const values = [
            req.body.id_template,
            fixedPeriode,
            req.body.m2_occupe,
            req.body.m2_facture,
            req.body.tarif_entreposage,
            req.body.entreposage,
            req.body.debours_entreposage,
            req.body.total_entreposage,
            req.body.ttc_entreposage,
            req.body.desc_entreposage,
            req.body.id_ville,
            req.body.id_client,
            req.body.id_objet,
            req.body.manutation,
            req.body.tarif_manutation,
            req.body.debours_manutation,
            req.body.total_manutation,
            req.body.ttc_manutation,
            req.body.desc_manutation,
            id_declaration // ID de la déclaration à mettre à jour
        ];

        db.query(q, values, (error, data) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ error: 'Error updating declaration record' });
            }
            if (data.affectedRows === 0) {
                return res.status(404).json({ error: 'Declaration record not found' });
            }
            return res.json({ message: 'Declaration record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating declaration:", err);
        return res.status(500).json({ error: 'Failed to update declaration record' });
    }
};

exports.deleteUpdateDeclaration = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE declaration_super SET est_supprime = 1 WHERE id_declaration_super = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
}

//Contrat
exports.getContrat = (req, res) => {

    const q = `
            SELECT contrat.*, tc.nom_type_contrat, client.nom FROM contrat
                INNER JOIN type_contrat tc ON tc.id_type_contrat = contrat.type_contrat
                INNER JOIN client ON contrat.id_client = client.id_client
                ORDER BY contrat.created_at DESC
            `;  

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    }); 
};

exports.getContratClientOne = (req, res) => {
    const {id_client} = req.query;

    const q = `
            SELECT * FROM contrat c WHERE c.id_client = ?
            `;  

    db.query(q, [id_client], (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    }); 
};

exports.postContrat = async (req, res) => {
    try {
        // Vérification des paramètres requis dans req.body
        const { id_client, date_debut, date_fin, montant, type_contrat, statut, date_signature, conditions } = req.body;

        if (!id_client || !date_debut || !date_fin || !type_contrat || !date_signature) {
            return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
        }

        // Construction de la requête SQL
        const q = 'INSERT INTO contrat(`id_client`, `date_debut`, `date_fin`, `montant`, `type_contrat`, `statut`, `date_signature`, `conditions`) VALUES(?)';

        // Paramètres de la requête
        const values = [
            id_client,
            date_debut,
            date_fin,
            montant,
            type_contrat,
            statut || 'actif', // Si 'statut' est manquant, on attribue 'actif' par défaut
            date_signature,
            conditions || '' // Si 'conditions' est manquant, on attribue une chaîne vide
        ];

        // Exécution de la requête SQL
        await db.query(q, [values]);

        // Réponse en cas de succès
        return res.status(201).json({ message: 'Contrat ajouté avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du contrat:', error.message);

        // Réponse en cas d'erreur
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du contrat." });
    }
};

//Type de contrat
exports.getContratTypeContrat = (req, res) => {

    const q = `
            SELECT * FROM type_contrat
            `;  

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    });
};

//Rapport m2 facture
exports.getRapportFacture = (req, res) => {
    const { ville, client, montant, period, status_batiment } = req.body;

    let months = [];
    let years = [];

    // Extraction des mois et années
    if (period?.mois?.length) {
        months = period.mois.map(Number);
    }
    if (period?.annees?.length) {
        years = period.annees.map(Number);
    }

    const montantMin = montant?.min || null;
    const montantMax = montant?.max || null;

    let q = `
        SELECT 
            client.nom AS Client,
            MONTH(ds.periode) AS Mois,
            YEAR(ds.periode) AS Année,
            SUM(ds.m2_facture) AS Montant
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
            LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0
    `;

    if (ville && Array.isArray(ville) && ville.length > 0) {
        const escapedVilles = ville.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_ville IN (${escapedVilles})`;
    }

    if (client?.length) {
        const escapedClients = client.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_client IN (${escapedClients})`;
    }

    if (status_batiment) {
        q += ` AND batiment.statut_batiment = ${db.escape(status_batiment)}`;
    }

    if (months.length) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    if (years.length) {
        const escapedYears = years.map(y => db.escape(y)).join(',');
        q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
    }

    q += `
        GROUP BY 
            client.nom, MONTH(ds.periode), YEAR(ds.periode)
    `;

    // Gestion de HAVING pour montant
    const havingConditions = [];
    if (montantMin !== null) {
        havingConditions.push(`SUM(ds.m2_facture) >= ${db.escape(montantMin)}`);
    }
    if (montantMax !== null) {
        havingConditions.push(`SUM(ds.m2_facture) <= ${db.escape(montantMax)}`);
    }
    if (havingConditions.length) {
        q += ` HAVING ${havingConditions.join(' AND ')}`;
    }

    q += `
        ORDER BY 
            YEAR(ds.periode) DESC, MONTH(ds.periode) DESC
    `;

    db.query(q, (error, data) => {
        if (error) {
            console.error('Erreur SQL:', error.message);
            return res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des données.',
                details: error.message,
            });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
            SELECT 
                COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                SUM(ds.m2_facture) AS Total_M2_facture,
                SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.m2_facture ELSE 0 END) AS Total_M2_facture_Extérieur,
                SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.m2_facture ELSE 0 END) AS Total_M2_facture_Intérieur
            FROM 
                declaration_super AS ds
                INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
            WHERE 
                tco.status_template = 1 
                AND ds.est_supprime = 0
        `;

        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (client?.length) {
            const escapedClients = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClients})`;
        }

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (months.length) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (years.length) {
            const escapedYears = years.map(y => db.escape(y)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

        // Ajout du HAVING dans la requête de résumé
        if (havingConditions.length) {
            qResume += ` HAVING ${havingConditions.join(' AND ')}`;
        }

        db.query(qResume, (error, datas) => {
            if (error) {
                return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
            }
            return res.status(200).json({
                data: data,
                resume: datas[0] || {}, // Assurer un objet vide si aucun résultat
            });
        });
    });
};

//Rapport superficie
exports.getRapportSuperficie = (req, res) => {
    const { client, montant, period, status_batiment, batiment } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
            SELECT 
                b.nom_batiment,
                ds.periode,
                SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
                SUM(COALESCE(ds.m2_facture, 0)) - SUM(COALESCE(ds.m2_occupe, 0)) AS superficie
            FROM declaration_super ds
                INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
            WHERE ds.est_supprime = 0
            `;  

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (batiment?.length > 0) {
                const escapedBatiments = batiment.map(b => db.escape(b)).join(',');
                q += ` AND tco.id_batiment IN (${escapedBatiments})`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            // Filter by years if provided
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }
            q += `
                    GROUP BY ds.periode, b.id_batiment
        	        ORDER BY ds.periode, b.id_batiment
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT b.id_batiment) AS nbre_batiment,
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total      
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
                `;

                if (status_batiment) {
                    qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
                }
    
                if (batiment?.length > 0) {
                    const escapedBatiments = batiment.map(b => db.escape(b)).join(',');
                    qResume += ` AND tco.id_batiment IN (${escapedBatiments})`;
                }
    
                if (months && Array.isArray(months) && months.length > 0) {
                    const escapedMonths = months.map(month => db.escape(month)).join(',');
                    qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
                }
            
                if (years && years.length > 0) {
                    const escapedYears = years.map(year => db.escape(year)).join(',');
                    qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
                }

                db.query(qResume, (error, datas) => {
                    if (error) {
                        return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
                    }
                    return res.status(200).json({
                        data: data,
                        resume: datas[0] || {},
                    });
                });
    });
};

//Rapport complet
exports.getRapportComplet = (req, res) => {
    const { client, montant, ville, period, status_batiment, batiment } = req.body;
    let months = [];
    let years = [];
    let conditions = [];


    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
        if (months.length > 0) {
            conditions.push(`MONTH(ds.periode) IN (${months.join(', ')})`);
        }
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
        if (years.length > 0) {
            conditions.push(`YEAR(ds.periode) IN (${years.join(', ')})`);
        }
    }

    if(ville && ville.length > 0) {
        const escapedVille = ville.map(v => db.escape(v)).join(', ');
        conditions.push(`ds.id_ville IN (${escapedVille})`);
    }

    if (status_batiment) {
        conditions.push(`b.statut_batiment = ${db.escape(status_batiment)}`);
    }

    if (batiment && batiment.length > 0) {
        const escapedBatiments = batiment.map(b => db.escape(b)).join(',');
        conditions.push(`tc.id_batiment IN (${escapedBatiments})`);
    }

    if (client && client.length > 0) {
        const escapedClient = client.map(c => db.escape(c)).join(',');
        conditions.push(`ds.id_client IN (${escapedClient})`);
    }

    let q = `
        SELECT 
            client.nom AS nom_client,
            SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
            SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
            SUM(COALESCE(ds.total_entreposage, 0)) AS total_entrep,
            SUM(COALESCE(ds.total_manutation, 0)) AS total_manu,
            SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_superficie
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN client ON ds.id_client = client.id_client
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
            LEFT JOIN batiment b ON tc.id_batiment = b.id_batiment
        ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
        GROUP BY client.id_client
    `;

    // Exécution de la requête
    db.query(q, (error, data) => {
        if (error) {
            console.error('Erreur SQL:', error.message);
            return res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des données.',
                details: error.message,
            });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }
        
        let qResume = `
                SELECT 
                    COUNT(ds.id_client) AS nbre_client,
                    SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.total_entreposage, 0)) AS total_entrep,
                    SUM(COALESCE(ds.total_manutation, 0)) AS total_manu,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_superficie
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    LEFT JOIN batiment b ON tc.id_batiment = b.id_batiment
                    ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
        `;

        db.query(qResume, (error, datas) => {
            if (error) {
                return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
            }
            return res.status(200).json({
                data: data,
                resume: datas[0] || {},
            });
        })
    });
};

exports.getFactureClient = (req, res) => {

    const q = `SELECT c.nom FROM declaration_super ds
                INNER JOIN client c ON ds.id_client = c.id_client
                GROUP BY c.id_client`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getRapportFactureVille = (req, res) => {
    const { ville, client, montant, period, status_batiment } = req.body;

    let months = [];
    let years = []; 

    if (period?.mois?.length) {
        months = period.mois.map(Number);
    }

    if (period?.annees?.length) {
        years = period.annees.map(Number);
    }

    const montantMin = montant?.min || null;
    const montantMax = montant?.max || null;

    let q = `
        SELECT 
            p.capital,
            MONTH(ds.periode) AS Mois,
            YEAR(ds.periode) AS Année,
            SUM(ds.m2_facture) AS Montant
        FROM 
            declaration_super AS ds
            LEFT JOIN provinces p ON p.id = ds.id_ville
            LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
            LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
            INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
            LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment

        WHERE 
            tc.status_template = 1 
            AND ds.est_supprime = 0
    `;

    if (ville && Array.isArray(ville) && ville.length > 0) {
        const escapedVilles = ville.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_ville IN (${escapedVilles})`;
    }

    if (client && Array.isArray(client) && client.length > 0) {
        const escapedClients = client.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_client IN (${escapedClients})`;
    }

    if (status_batiment) {
        q += ` AND batiment.statut_batiment = (${status_batiment})`;
    }

    if (months && Array.isArray(months) && months.length > 0) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    if (years.length) {
        const escapedYears = years.map(y => db.escape(y)).join(',');
        q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
    }

    q += `
        GROUP BY 
            p.capital, MONTH(ds.periode), YEAR(ds.periode)
    `;

    // Ajout du filtre par montant dans la clause HAVING
    if (montantMin !== null) {
        q += ` HAVING SUM(ds.m2_facture) >= ${db.escape(montantMin)}`;
    }

    if (montantMax !== null) {
        if (montantMin === null) {
            q += ` HAVING SUM(ds.m2_facture) <= ${db.escape(montantMax)}`;
        } else {
            q += ` AND SUM(ds.m2_facture) <= ${db.escape(montantMax)}`;
        }
    }

    q += `
        ORDER BY 
            YEAR(ds.periode) DESC, MONTH(ds.periode) DESC
    `;

    // Exécuter la requête
    db.query(q, (error, data) => {
        if (error) {
            console.error('Erreur SQL:', error.message);
            return res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des données.',
                details: error.message,
            });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }
        return res.status(200).json(data);
    });
};

exports.getRapportFactureExternEtInterne = (req, res) => {
    const { client, montant, period, status_batiment } = req.body;

    let months = [];
    let years = [];


    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    const montantMin = montant?.min || null;
    const montantMax = montant?.max || null;

    let q = `
        SELECT 
            sb.nom_status_batiment,
            MONTH(ds.periode) AS Mois,
            YEAR(ds.periode) AS Année,
            SUM(ds.m2_facture) AS Montant
        FROM 
            declaration_super AS ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment

        WHERE 
            tco.status_template = 1 
            AND ds.est_supprime = 0
    `;

    if (client && Array.isArray(client) && client.length > 0) {
        const escapedClients = client.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_client IN (${escapedClients})`;
    }

    if (status_batiment) {
        q += ` AND b.statut_batiment = (${status_batiment})`;
    }

    if (months && Array.isArray(months) && months.length > 0) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    if (years && years.length > 0) {
        const escapedYears = years.map(year => db.escape(year)).join(',');
        q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
    }

    q += `
        GROUP BY 
            sb.id_status_batiment, MONTH(ds.periode), YEAR(ds.periode)
    `;

    // Ajout du filtre par montant dans la clause HAVING
    if (montantMin !== null) {
        q += ` HAVING SUM(ds.m2_facture) >= ${db.escape(montantMin)}`;
    }

    if (montantMax !== null) {
        if (montantMin === null) {
            q += ` HAVING SUM(ds.m2_facture) <= ${db.escape(montantMax)}`;
        } else {
            q += ` AND SUM(ds.m2_facture) <= ${db.escape(montantMax)}`;
        }
    }

    q += `
        ORDER BY 
            YEAR(ds.periode) DESC, MONTH(ds.periode) DESC
    `;

    // Exécuter la requête
    db.query(q, (error, data) => {
        if (error) {
            console.error('Erreur SQL:', error.message);
            return res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des données.',
                details: error.message,
            });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }
        return res.status(200).json(data);
    });
};

//Rapport ville
exports.getRapportVille = (req, res) => {
    const { ville, period, client, montant, status_batiment } = req.body;

    let months = [];
    let years = [];  // Rename to 'years' to reflect the plural nature of the data

    // Extract months if provided
    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    // Extract years if provided
    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);  // Assuming multiple years can be provided
    }

    // Start building the query
    let q = `
        SELECT 
            ds.periode,
            p.capital,
            SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
            SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
            SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture
        FROM declaration_super ds
        INNER JOIN provinces p ON ds.id_ville = p.id
         WHERE 
             ds.est_supprime = 0
    `;

    // Filter by ville (cities) if provided
    if (ville && Array.isArray(ville) && ville.length > 0) {
        const escapedVilles = ville.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_ville IN (${escapedVilles})`;
    }

    if (client && Array.isArray(client) && client.length > 0) {
        const escapedClient = client.map(c => db.escape(c)).join(',');
        q += ` AND ds.id_client IN (${escapedClient})`;
    }

    // Filter by months if provided
    if (months && months.length > 0) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    // Filter by years if provided
    if (years && years.length > 0) {
        const escapedYears = years.map(year => db.escape(year)).join(',');
        q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
    }


    // Group by period and province
    q += `
        GROUP BY ds.periode, p.capital
        ORDER BY ds.periode, p.capital
    `;

    // Execute the query
    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                    COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                    SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                    SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Extérieur,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Intérieur      
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
            `;

            if (client?.length) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                qResume += ` AND ds.id_client IN (${escapedClients})`;
            }
        
            if (status_batiment) {
                qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }
        
            if (months.length) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years.length) {
                const escapedYears = years.map(y => db.escape(y)).join(',');
                qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            db.query(qResume, (error, datas) => {
                if (error) {
                    return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
                }
                return res.status(200).json({
                    data: data,
                    resume: datas[0] || {},
                });
            });
    });
};

//Rapport Interieure et Exterieure
exports.getRapportExterneEtInterne = (req, res) => {
    const { client, montant, ville, period, status_batiment } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
            SELECT 
				sb.nom_status_batiment,
                ds.periode,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture  -- Addition des deux pour le total
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
            `;  

            if (client?.length) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                    q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY MONTH(ds.periode), sb.id_status_batiment
                    ORDER BY MONTH(ds.periode), sb.id_status_batiment
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                    COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                    SUM(ds.total_entreposage) AS Total_entrep,
                    SUM(ds.total_manutation) AS Total_manut,
                    SUM(ds.ttc_entreposage) AS Total_ttc_entre,
                    SUM(ds.ttc_manutation) AS Total_ttc_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Extérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Intérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Extérieur_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Intérieur_manu 
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
        `;
                
        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (client?.length) {
            const escapedClients = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClients})`;
        }

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (months.length) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (years.length) {
            const escapedYears = years.map(y => db.escape(y)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

    db.query(qResume, (error, datas) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
        }
        return res.status(200).json({
            data: data,
            resume: datas[0] || {},
        });
    })        
    });
};

//Rapport Interieure et Exterieure Année
exports.getRapportExterneEtInterneAnnee = (req, res) => {
    const { client, montant, ville, period, status_batiment } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
            SELECT 
				sb.nom_status_batiment,
                YEAR(ds.periode) AS periode,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture  -- Addition des deux pour le total
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
            `;  

            if (client?.length) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                    q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY YEAR(ds.periode), sb.id_status_batiment
                    ORDER BY YEAR(ds.periode), sb.id_status_batiment
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                    COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                    SUM(ds.total_entreposage) AS Total_entrep,
                    SUM(ds.total_manutation) AS Total_manut,
                    SUM(ds.ttc_entreposage) AS Total_ttc_entre,
                    SUM(ds.ttc_manutation) AS Total_ttc_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Extérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Intérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Extérieur_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Intérieur_manu 
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
        `;
                
        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (client?.length) {
            const escapedClients = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClients})`;
        }

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (months.length) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (years.length) {
            const escapedYears = years.map(y => db.escape(y)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

    db.query(qResume, (error, datas) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
        }
        return res.status(200).json({
            data: data,
            resume: datas[0] || {},
        });
    })        
    });
};

//Rapport Interieure et Exterieure Par client
exports.getRapportExterneEtInterneClient = (req, res) => {
    const { client, montant, ville, period, status_batiment } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
            SELECT 
				sb.nom_status_batiment,
                c.nom,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture  -- Addition des deux pour le total
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                INNER JOIN client c ON ds.id_client = c.id_client       
            `;  

            if (client?.length) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            // Filter by years if provided
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                    q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY c.id_client, sb.id_status_batiment
                    ORDER BY c.id_client, sb.id_status_batiment
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                    COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                    SUM(ds.total_entreposage) AS Total_entrep,
                    SUM(ds.total_manutation) AS Total_manut,
                    SUM(ds.ttc_entreposage) AS Total_ttc_entre,
                    SUM(ds.ttc_manutation) AS Total_ttc_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Extérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Intérieur_entre,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Extérieur_manu,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Intérieur_manu 
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
        `;
                
        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (client?.length) {
            const escapedClients = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClients})`;
        }

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (months.length) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (years.length) {
            const escapedYears = years.map(y => db.escape(y)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

    db.query(qResume, (error, datas) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
        }
        return res.status(200).json({
            data: data,
            resume: datas[0] || {},
        });
    })        
    });
};

//Rapport Pays
exports.getRapportPays = (req, res) => {
    const { client, montant,ville, period, status_batiment } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
           SELECT 
				pays.nom_pays,
                ds.periode,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                INNER JOIN provinces p ON b.ville = p.id
                INNER JOIN pays ON p.id_pays = pays.id_pays
            WHERE 
            ds.est_supprime = 0
            `;  

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClient = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClient})`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY MONTH(ds.periode), pays.id_pays
                    ORDER BY MONTH(ds.periode)
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                COUNT(DISTINCT pays.id_pays) AS nbre_pays,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                INNER JOIN provinces p ON b.ville = p.id
                INNER JOIN pays ON p.id_pays = pays.id_pays
            WHERE 
            ds.est_supprime = 0
            `;

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                qResume += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                    const escapedYears = years.map(year => db.escape(year)).join(',');
                    qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            db.query(qResume, (error, datas) => {
                if (error) {
                    return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
                }
                return res.status(200).json({
                    data: data,
                    resume: datas[0] || {},
                });
            });
    });
};

//Rapport manutention
exports.getRapportManutention = (req, res) => {
    const { ville, client, montant, period, status_batiment } = req.body;
    let months = [];
    let years = []; 

        // Extraction des mois et années
        if (period?.mois?.length) {
            months = period.mois.map(Number);
        }
        if (period?.annees?.length) {
            years = period.annees.map(Number);
        }

        const montantMin = montant?.min || null;
        const montantMax = montant?.max || null;


    let q = `
                SELECT
                    client.nom AS Client,
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Année,
                    SUM(COALESCE(ds.total_manutation, 0)) AS Montant,
                    SUM(COALESCE(ds.ttc_manutation, 0)) AS TTC_montant

                FROM declaration_super ds
                    INNER JOIN client ON ds.id_client = client.id_client
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
                WHERE ds.est_supprime = 0
            `;

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (status_batiment) {
                q += ` AND batiment.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }

            if (years.length) {
                const escapedYears = years.map(y => db.escape(y)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
            GROUP BY 
                client.nom, MONTH(ds.periode), YEAR(ds.periode)
            `;

            // Gestion de HAVING pour montant
            const havingConditions = [];
            if (montantMin !== null) {
                havingConditions.push(`SUM(ds.total_manutation) >= ${db.escape(montantMin)}`);
            }
            if (montantMax !== null) {
                havingConditions.push(`SUM(ds.total_manutation) <= ${db.escape(montantMax)}`);
            }
            if (havingConditions.length) {
                q += ` HAVING ${havingConditions.join(' AND ')}`;
            }

            q += `
            ORDER BY MONTH(ds.periode), YEAR(ds.periode) DESC
            `;


    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
        SELECT 
            COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
            COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
            SUM(ds.total_manutation) AS Total,
            SUM(ds.ttc_manutation) AS Total_ttc,
            SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Extérieur,
            SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_manutation ELSE 0 END) AS Total_Intérieur
            
        FROM 
            declaration_super AS ds
            INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
            INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
            INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
        WHERE 
            tco.status_template = 1 
            AND ds.est_supprime = 0
    `;

    if (ville && Array.isArray(ville) && ville.length > 0) {
        const escapedVilles = ville.map(c => db.escape(c)).join(',');
        qResume += ` AND ds.id_ville IN (${escapedVilles})`;
    }

    if (client?.length) {
        const escapedClients = client.map(c => db.escape(c)).join(',');
        qResume += ` AND ds.id_client IN (${escapedClients})`;
    }

    if (status_batiment) {
        qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
    }

    if (months.length) {
        const escapedMonths = months.map(month => db.escape(month)).join(',');
        qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
    }

    if (years.length) {
        const escapedYears = years.map(y => db.escape(y)).join(',');
        qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
    }

     // Gestion de HAVING pour montant
     const havingConditions = [];
     if (montantMin !== null) {
         havingConditions.push(`SUM(ds.total_manutation) >= ${db.escape(montantMin)}`);
     }
     if (montantMax !== null) {
         havingConditions.push(`SUM(ds.total_manutation) <= ${db.escape(montantMax)}`);
     }
     if (havingConditions.length) {
         q += ` HAVING ${havingConditions.join(' AND ')}`;
     }

    db.query(qResume, (error, datas) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
        }
        return res.status(200).json({
            data: data,
            resume: datas[0] || {},
        });
    });

    });
};

//Rapport entreposage
exports.getRapportEntreposage = (req, res) => {
    const { ville, client, montant, period, status_batiment } = req.body;
    let months = [];
    let years = []; 

        // Extraction des mois et années
        if (period?.mois?.length) {
            months = period.mois.map(Number);
        }
        if (period?.annees?.length) {
            years = period.annees.map(Number);
        }

        const montantMin = montant?.min || null;
        const montantMax = montant?.max || null;

    let q = `
                SELECT 
                    client.nom AS Client,
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Année,
                    SUM(COALESCE(ds.total_entreposage, 0)) AS Montant,
                    SUM(COALESCE(ds.ttc_entreposage, 0)) AS TTC_montant
                FROM declaration_super ds
                    INNER JOIN client ON ds.id_client = client.id_client
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
                WHERE ds.est_supprime = 0
            `;  

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (status_batiment) {
                q += ` AND batiment.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }

            if (years.length) {
                const escapedYears = years.map(y => db.escape(y)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
            GROUP BY 
                client.nom, MONTH(ds.periode), YEAR(ds.periode)
            `;

            // Gestion de HAVING pour montant
            const havingConditions = [];
            if (montantMin !== null) {
                havingConditions.push(`SUM(ds.total_entreposage) >= ${db.escape(montantMin)}`);
            }
            if (montantMax !== null) {
                havingConditions.push(`SUM(ds.total_entreposage) <= ${db.escape(montantMax)}`);
            }
            if (havingConditions.length) {
                q += ` HAVING ${havingConditions.join(' AND ')}`;
            }

            q += `
                ORDER BY MONTH(ds.periode), YEAR(ds.periode) DESC
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }

        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    COUNT(DISTINCT ds.id_client) AS Nbre_de_clients,
                    COUNT(DISTINCT ds.id_ville) AS Nbre_de_villes,
                    SUM(ds.total_entreposage) AS Total,
                    SUM(ds.ttc_entreposage) AS Total_ttc,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Non couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Extérieur,
                    SUM(CASE WHEN sb.nom_status_batiment = 'Couvert' THEN ds.total_entreposage ELSE 0 END) AS Total_Intérieur      
                FROM 
                    declaration_super AS ds
                    INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                    INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                    INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                WHERE 
                    tco.status_template = 1 
                    AND ds.est_supprime = 0
            `;
        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (client?.length) {
            const escapedClients = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClients})`;
        }

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (months.length) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }

        if (years.length) {
            const escapedYears = years.map(y => db.escape(y)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

    db.query(qResume, (error, datas) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
        }
        return res.status(200).json({
            data: data,
            resume: datas[0] || {},
        });
    });

    });
};

//Rapport de template
exports.getRapportTemplate = (req, res) => {
    const { period, status_batiment, ville, client, batiment, template } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
                SELECT 
                    tc.desc_template,
                    client.nom,
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Année,
                    SUM(ds.m2_facture) AS total_facture,
                    SUM(ds.total_entreposage) AS total_entreposage,
                    SUM(ds.ttc_entreposage) AS ttc_entreposage,
                    SUM(ds.total_manutation) AS total_manutation,
                    SUM(ds.ttc_manutation) AS ttc_manutation,
                    SUM(ds.m2_occupe) AS total_occupe,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_entreManu
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    INNER JOIN batiment b ON tc.id_batiment = b.id_batiment

                WHERE tc.status_template = 1 AND ds.est_supprime = 0
            `;  

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (batiment && Array.isArray(batiment) && batiment.length > 0) {
                const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
                q += ` AND b.id_batiment IN (${escapedBatiment})`;
            }

            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClient = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClient})`;
            }

            if (template && Array.isArray(template) && template.length > 0) {
                const escapedTemplate = template.map(t => db.escape(t)).join(',');
                q += ` AND ds.id_template IN (${escapedTemplate})`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY 
                    ds.id_template, MONTH(ds.periode), YEAR(ds.periode)
                    ORDER BY MONTH(ds.periode)
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
            SELECT 
            	COUNT(DISTINCT ds.id_client) AS nbre_client,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.ttc_entreposage, 0)) AS ttc_entreposage,
                SUM(COALESCE(ds.ttc_manutation, 0)) AS ttc_manutention,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total,
                SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                INNER JOIN provinces p ON b.ville = p.id
                INNER JOIN pays ON p.id_pays = pays.id_pays
            WHERE ds.est_supprime = 0
        `;

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (batiment && Array.isArray(batiment) && batiment.length > 0) {
            const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
            qResume += ` AND b.id_batiment IN (${escapedBatiment})`;
        }
        
        if (client && Array.isArray(client) && client.length > 0) {
            const escapedClient = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClient})`;
        }

        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (template && Array.isArray(template) && template.length > 0) {
            const escapedTemplate = template.map(t => db.escape(t)).join(',');
            qResume += ` AND ds.id_template IN (${escapedTemplate})`;
        }

        if (months && Array.isArray(months) && months.length > 0) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }
    
        if (years && years.length > 0) {
            const escapedYears = years.map(year => db.escape(year)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

        db.query(qResume, (error, datas) => {
            if (error) {
                return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
            }
            return res.status(200).json({
                data: data,
                resume: datas[0] || {},
            });
        });
    });
};

//Rapport de template batement
exports.getRapportBatiment = (req, res) => {
    const { period, status_batiment, ville, client, batiment, template } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
                SELECT 
                  	b.nom_batiment,
                    client.nom,
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Année,
                    SUM(ds.m2_facture) AS total_facture,
                    SUM(ds.total_entreposage) AS total_entreposage,
                    SUM(ds.ttc_entreposage) AS ttc_entreposage,
                    SUM(ds.total_manutation) AS total_manutation,
                    SUM(ds.ttc_manutation) AS ttc_manutation,
                    SUM(ds.m2_occupe) AS total_occupe,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_entreManu
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    INNER JOIN batiment b ON tc.id_batiment = b.id_batiment
                WHERE tc.status_template = 1 AND ds.est_supprime = 0
            `;  

            if (status_batiment) {
                q += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }

            if (batiment && Array.isArray(batiment) && batiment.length > 0) {
                const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
                q += ` AND b.id_batiment IN (${escapedBatiment})`;
            }

            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClient = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClient})`;
            }

            if (template && Array.isArray(template) && template.length > 0) {
                const escapedTemplate = template.map(t => db.escape(t)).join(',');
                q += ` AND ds.id_template IN (${escapedTemplate})`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

            q += `
                    GROUP BY 
                        tc.id_batiment, MONTH(ds.periode), YEAR(ds.periode)
                    ORDER BY MONTH(ds.periode)
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
            SELECT 
            	COUNT(DISTINCT ds.id_client) AS nbre_client,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.ttc_entreposage, 0)) AS ttc_entreposage,
                SUM(COALESCE(ds.ttc_manutation, 0)) AS ttc_manutention,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total,
                SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe
            FROM declaration_super ds
            	INNER JOIN template_occupation tco ON ds.id_template = tco.id_template
                INNER JOIN batiment b ON tco.id_batiment = b.id_batiment
                INNER JOIN status_batiment sb ON b.statut_batiment = sb.id_status_batiment
                INNER JOIN provinces p ON b.ville = p.id
                INNER JOIN pays ON p.id_pays = pays.id_pays
            WHERE ds.est_supprime = 0
        `;

        if (status_batiment) {
            qResume += ` AND b.statut_batiment = ${db.escape(status_batiment)}`;
        }

        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (batiment && Array.isArray(batiment) && batiment.length > 0) {
            const escapedBatiment = batiment.map(b => db.escape(b)).join(',');
            qResume += ` AND b.id_batiment IN (${escapedBatiment})`;
        }
        
        if (client && Array.isArray(client) && client.length > 0) {
            const escapedClient = client.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_client IN (${escapedClient})`;
        }

        if (ville && Array.isArray(ville) && ville.length > 0) {
            const escapedVilles = ville.map(c => db.escape(c)).join(',');
            qResume += ` AND ds.id_ville IN (${escapedVilles})`;
        }

        if (template && Array.isArray(template) && template.length > 0) {
            const escapedTemplate = template.map(t => db.escape(t)).join(',');
            qResume += ` AND ds.id_template IN (${escapedTemplate})`;
        }

        if (months && Array.isArray(months) && months.length > 0) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
        }
    
        if (years && years.length > 0) {
            const escapedYears = years.map(year => db.escape(year)).join(',');
            qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
        }

        db.query(qResume, (error, datas) => {
            if (error) {
                return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
            }
            return res.status(200).json({
                data: data,
                resume: datas[0] || {},
            });
        });
    });
};

//Rapport de variation
exports.getRapportVariation = (req, res) => {
    const { period, status_batiment, ville, client } = req.body;
    let months = [];
    let years = [];

    if (period && period.mois && Array.isArray(period.mois) && period.mois.length > 0) {
        months = period.mois.map(Number);
    }

    if (period && period.annees && Array.isArray(period.annees) && period.annees.length > 0) {
        years = period.annees.map(Number);
    }

    let q = `
                SELECT 
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Année,
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_entreManu,
                    SUM(COALESCE(ds.ttc_entreposage, 0) + COALESCE(ds.ttc_manutation, 0)) AS ttc_entreManu
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
                WHERE tc.status_template = 1 AND ds.est_supprime = 0
            `;  

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_ville IN (${escapedVilles})`;
            }
            
            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                q += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (status_batiment) {
                q += ` AND batiment.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                q += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
                // Filter by years if provided
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                    q += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }
            q += `
                    GROUP BY 
                    MONTH(ds.periode), YEAR(ds.periode)
                    ORDER BY MONTH(ds.periode)
                `

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error)
        }
        if (data.length === 0) {
            return res.status(404).json({ message: 'Aucune donnée trouvée pour les critères sélectionnés.' });
        }

        let qResume = `
                SELECT 
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.m2_occupe, 0)) AS total_occupe,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_entreManu,
                    SUM(COALESCE(ds.ttc_entreposage, 0) + COALESCE(ds.ttc_manutation, 0)) AS ttc_entreManu
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                    LEFT JOIN batiment ON tc.id_batiment = batiment.id_batiment
                WHERE tc.status_template = 1 AND ds.est_supprime = 0
            `;

            if (ville && Array.isArray(ville) && ville.length > 0) {
                const escapedVilles = ville.map(c => db.escape(c)).join(',');
                qResume += ` AND ds.id_ville IN (${escapedVilles})`;
            }
            
            if (client && Array.isArray(client) && client.length > 0) {
                const escapedClients = client.map(c => db.escape(c)).join(',');
                qResume += ` AND ds.id_client IN (${escapedClients})`;
            }

            if (status_batiment) {
                qResume += ` AND batiment.statut_batiment = ${db.escape(status_batiment)}`;
            }

            if (months && Array.isArray(months) && months.length > 0) {
                const escapedMonths = months.map(month => db.escape(month)).join(',');
                qResume += ` AND MONTH(ds.periode) IN (${escapedMonths})`;
            }
        
                // Filter by years if provided
            if (years && years.length > 0) {
                const escapedYears = years.map(year => db.escape(year)).join(',');
                qResume += ` AND YEAR(ds.periode) IN (${escapedYears})`;
            }

        db.query(qResume, (error, datas) => {
                if (error) {
                    return res.status(500).json({ error: 'Erreur SQL (agrégats)', details: error.message });
                }
                return res.status(200).json({
                    data: data,
                    resume: datas[0] || {},
            });
        });

    });
};

//Rapport de variation ville
exports.getRapportVariationVille = (req, res) => {
    const { mois, annees } = req.body;
    let months = [];
    let years = [];

    if (mois) {
        months = Array.isArray(mois) ? mois.map(Number) : [Number(mois)];
    }

    if (annees) {
        years = Array.isArray(annees) ? annees.map(Number) : [Number(annees)];
    }

    let q = `
        WITH current_month AS (
            SELECT 
                ds.periode,
                p.capital,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture,
                'actuel' AS type_periode
            FROM declaration_super ds
            INNER JOIN provinces p ON ds.id_ville = p.id
            WHERE ds.est_supprime = 0
                ${months.length > 0 ? `AND MONTH(ds.periode) IN (${months.join(',')})` : ''}
                ${years.length > 0 ? `AND YEAR(ds.periode) IN (${years.join(',')})` : ''}
            GROUP BY ds.periode, p.capital
        ), 
        previous_month AS (
            SELECT 
                ds.periode,
                p.capital,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_facture,
                'precedent' AS type_periode
            FROM declaration_super ds
            INNER JOIN provinces p ON ds.id_ville = p.id
            WHERE ds.est_supprime = 0
                ${months.length > 0 ? `AND MONTH(ds.periode) IN (${months.map(m => (m === 1 ? 12 : m - 1)).join(',')})` : ''}
                ${years.length > 0 ? `AND YEAR(ds.periode) IN (${years.map(y => (months.includes(1) ? y - 1 : y)).join(',')})` : ''}
            GROUP BY ds.periode, p.capital
        )
        SELECT 
            cm.periode,
            cm.capital,
            cm.total_entreposage,
            cm.total_manutation,
            cm.total_facture,
            cm.type_periode,
            CASE 
                WHEN cm.type_periode = 'precedent' THEN NULL
                WHEN pm.total_facture IS NULL OR pm.total_facture = 0 THEN NULL
                ELSE ((cm.total_facture - pm.total_facture) / pm.total_facture) * 100
            END AS variation_pourcentage
        FROM (
            SELECT * FROM current_month
            UNION ALL
            SELECT * FROM previous_month
        ) cm
        LEFT JOIN previous_month pm ON cm.capital = pm.capital AND cm.type_periode = 'actuel'
        ORDER BY YEAR(cm.periode), MONTH(cm.periode), cm.capital;
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getRapportVariationClient = (req, res) => {
    try {
        const { period, status_batiment, ville } = req.body;
        let months = [];
        let years = [];

        if (period?.mois?.length) {
            months = period.mois.map(Number);
        }

        if (period?.annees?.length) {
            years = period.annees.map(Number);
        }

        let filters = [`tc.status_template = 1`, `ds.est_supprime = 0`];

        if (ville) {
            filters.push(`p.capital = ${db.escape(ville)}`);
        }

        if (status_batiment) {
            filters.push(`batiment.statut_batiment = ${db.escape(status_batiment)}`);
        }

        if (months.length > 0) {
            const escapedMonths = months.map(month => db.escape(month)).join(',');
            filters.push(`MONTH(ds.periode) IN (${escapedMonths})`);
        }

        if (years.length > 0) {
            const escapedYears = years.map(year => db.escape(year)).join(',');
            filters.push(`YEAR(ds.periode) IN (${escapedYears})`);
        }

        let whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

        let q = `
            WITH MonthlyData AS (
                SELECT 
                    client.nom AS client_nom,
                    MONTH(ds.periode) AS Mois,
                    YEAR(ds.periode) AS Annee,
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.total_entreposage, 0)) AS total_entrep,
                    SUM(COALESCE(ds.total_manutation, 0)) AS total_manu,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_superficie
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                ${whereClause}
                GROUP BY client.nom, YEAR(ds.periode), MONTH(ds.periode)
            ),
            TotalData AS (
                SELECT 
                    client.nom AS client_nom,
                    NULL AS Mois,
                    NULL AS Annee,
                    SUM(COALESCE(ds.m2_facture, 0)) AS total_facture,
                    SUM(COALESCE(ds.total_entreposage, 0)) AS total_entrep,
                    SUM(COALESCE(ds.total_manutation, 0)) AS total_manu,
                    SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total_superficie
                FROM 
                    declaration_super AS ds
                    LEFT JOIN provinces p ON p.id = ds.id_ville
                    LEFT JOIN client ON ds.id_client = client.id_client
                    LEFT JOIN declaration_super_batiment dsb ON ds.id_declaration_super = dsb.id_declaration_super
                    LEFT JOIN batiment ON dsb.id_batiment = batiment.id_batiment
                    LEFT JOIN objet_fact ON ds.id_objet = objet_fact.id_objet_fact
                    INNER JOIN template_occupation tc ON tc.id_template = ds.id_template
                ${whereClause}
                GROUP BY client.nom
            ),
            VariationData AS (
                SELECT 
                    m1.client_nom,
                    m1.Mois,
                    m1.Annee,
                    m1.total_facture,
                    m1.total_entrep,
                    m1.total_manu,
                    m1.total_superficie,
                    m2.total_facture AS prev_total_facture,
                    m2.total_entrep AS prev_total_entrep,
                    m2.total_manu AS prev_total_manu,
                    m2.total_superficie AS prev_total_superficie,
                    CASE 
                        WHEN m2.total_facture > 0 THEN ROUND(((m1.total_facture - m2.total_facture) / m2.total_facture) * 100, 2) 
                        ELSE NULL 
                    END AS variation_facture,
                    CASE 
                        WHEN m2.total_entrep > 0 THEN ROUND(((m1.total_entrep - m2.total_entrep) / m2.total_entrep) * 100, 2) 
                        ELSE NULL 
                    END AS variation_entrep,
                    CASE 
                        WHEN m2.total_manu > 0 THEN ROUND(((m1.total_manu - m2.total_manu) / m2.total_manu) * 100, 2) 
                        ELSE NULL 
                    END AS variation_manu,
                    CASE 
                        WHEN m2.total_superficie > 0 THEN ROUND(((m1.total_superficie - m2.total_superficie) / m2.total_superficie) * 100, 2) 
                        ELSE NULL 
                    END AS variation_superficie
                FROM 
                    MonthlyData m1
                LEFT JOIN MonthlyData m2 
                    ON m1.client_nom = m2.client_nom 
                    AND m1.Annee = m2.Annee 
                    AND m1.Mois = m2.Mois + 1
            )
            SELECT 
                client_nom,
                Mois,
                Annee,
                total_facture,
                total_entrep,
                total_manu,
                total_superficie,
                NULL AS prev_total_facture,
                NULL AS prev_total_entrep,
                NULL AS prev_total_manu,
                NULL AS variation_facture,
                NULL AS variation_entrep,
                NULL AS variation_manu,
                NULL AS variation_superficie,
                total_entrep + total_manu AS superficie_totale
            FROM TotalData
            UNION ALL
            SELECT 
                client_nom,
                Mois,
                Annee,
                total_facture,
                total_entrep,
                total_manu,
                total_superficie,
                prev_total_facture,
                prev_total_entrep,
                prev_total_manu,
                variation_facture,
                variation_entrep,
                variation_manu,
                variation_superficie,
                total_entrep + total_manu AS superficie_totale
            FROM VariationData
            ORDER BY client_nom, Annee, Mois;
        `;

        db.query(q, (error, data) => {
            if (error) {
                console.error("SQL Error:", error);
                return res.status(500).json({ message: "Erreur serveur", error });
            }
            return res.status(200).json(data);
        });
    } catch (err) {
        console.error("Request Error:", err);
        return res.status(500).json({ message: "Erreur serveur", error: err });
    }
};

//ANNEE ET MOIS
exports.getMois = (req, res) => {
    const { annee } = req.query;

    const q = `
        SELECT 
            MONTH(ds.periode) AS mois
        FROM declaration_super ds
        WHERE YEAR(ds.periode) = ?
        GROUP BY MONTH(ds.periode)
        ORDER BY MONTH(ds.periode)
    `;

    db.query(q, [annee], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getAnnee = (req, res) => {

    const q = `
            SELECT 
                YEAR(ds.periode) AS annee
                FROM declaration_super ds
            GROUP BY YEAR(ds.periode)
            ORDER BY YEAR(ds.periode)
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};