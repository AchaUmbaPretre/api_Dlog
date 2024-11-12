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
                whse_fact.nom_whse_fact,
                objet_fact.nom_objet_fact,
                statut_template.nom_statut_template,
                statut_template.id_statut_template,
                niveau_batiment.nom_niveau
            FROM 
                template_occupation tm
                INNER JOIN client ON tm.id_client = client.id_client
                INNER JOIN type_d_occupation AS td ON tm.id_type_occupation = td.id_type_d_occupation
                INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
                INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
                INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
                INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
                INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
                INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau     
                WHERE tm.est_supprime = 0     
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTemplate5Derniers = (req, res) => {

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
    INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
    INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
    INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
    INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
    INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
    INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau
ORDER BY tm.date_actif DESC
LIMIT 5;

                `;

    db.query(q, (error, data) => {
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
                tm.*,
                client.nom AS nom_client, 
                client.id_client,
                td.nom_type_d_occupation, 
                batiment.nom_batiment, 
                batiment.id_batiment,
                provinces.id AS id_ville,
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
                INNER JOIN batiment ON tm.id_batiment = batiment.id_batiment
                INNER JOIN provinces ON batiment.ville = provinces.id
                INNER JOIN denomination_bat AS dn ON tm.id_denomination = dn.id_denomination_bat
                INNER JOIN whse_fact ON tm.id_whse_fact = whse_fact.id_whse_fact
                INNER JOIN objet_fact ON tm.id_objet_fact = objet_fact.id_objet_fact
                INNER JOIN statut_template ON tm.status_template = statut_template.id_statut_template
                INNER JOIN niveau_batiment ON tm.id_niveau = niveau_batiment.id_niveau 
            WHERE tm.id_template = ?        
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
                req.body.id_batiment,
                req.body.nom_whse_fact
            ];

            connection.query(qWhseFact, whseFactValues, (err, whseFactResult) => {
                if (err) {
                    return connection.rollback(() => {
                        console.error("Erreur lors de l'insertion dans whse_fact:", err);
                        return res.status(500).json({ error: "Erreur lors de l'insertion dans whse_fact." });
                    });
                }

                const id_whse_fact = whseFactResult.insertId; // Récupérer l'ID généré

                // Insérer dans la table template_occupation avec le nouvel id_whse_fact
                const qTemplate = `
                    INSERT INTO template_occupation 
                    (id_client, id_type_occupation, id_batiment, id_niveau, id_denomination, id_whse_fact, id_objet_fact, desc_template, status_template, date_actif) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const templateValues = [
                    req.body.id_client,
                    req.body.id_type_occupation,
                    req.body.id_batiment,
                    req.body.id_niveau,
                    req.body.id_denomination,
                    id_whse_fact,  // Utiliser l'ID généré dans whse_fact
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

/* exports.putTemplate = (req, res) => {
    const { id_template } = req.query;

    if (!id_template || isNaN(id_template)) {
        return res.status(400).json({ error: 'Invalid template ID provided' });
    }

    try {
        const q = `
            UPDATE template_occupation tm 
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
            req.body.id_whse_fact,
            req.body.id_objet_fact,
            req.body.desc_template,
            id_template
        ];

        db.query(q, values, (error, data) => {
            if (error) {
                console.log(error);
                return res.status(404).json({ error: 'Template record not found' });
            }
            return res.json({ message: 'Template record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating template status:", err);
        return res.status(500).json({ error: 'Failed to update template status' });
    }
}; */

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
        // Si le status_template est défini à 0 (désactiver), on met à jour la date_inactif
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

exports.getDeclaration = (req, res) => {
    const { ville, client, batiment, dateRange } = req.body;
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
    
    if (client && client.length > 0) {
        q += ` AND ds.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    
    if (batiment && batiment.length > 0) {
        q += ` AND ds.id_batiment IN (${batiment.map(b => db.escape(b)).join(',')})`;
    }
    
    if (dateRange && dateRange.length === 2) {
        q += ` AND ds.periode >= ${db.escape(dateRange[0])} AND ds.periode <= ${db.escape(dateRange[1])}`;
    }

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


/* exports.postDeclaration = async (req, res) => {
    
    try {
        const query = `
            INSERT INTO declaration_super (
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
                id_batiment,
                id_objet,
                manutation,
                tarif_manutation,
                debours_manutation,
                total_manutation,
                ttc_manutation,
                desc_manutation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            req.body.id_template,
            req.body.periode,
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
            req.body.id_batiment,
            req.body.id_objet,
            req.body.manutation,
            req.body.tarif_manutation,
            req.body.debours_manutation,
            req.body.total_manutation,
            req.body.ttc_manutation,
            req.body.desc_manutation
        ];  
        db.query(query, values,(error, data) => {
            if(error){
                console.log(error)
            }
            else{
                return res.status(201).json({ message: 'Déclaration ajoutée avec succès' });
            }
        })

    } catch (error) {
        console.error("Erreur lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la déclaration." });
    }
}; */

exports.postDeclaration = async (req, res) => {
    try {
        const query = `
            INSERT INTO declaration_super (
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
                desc_manutation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            req.body.id_template,
            req.body.periode,
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
            req.body.desc_manutation
        ];

        db.query(query, values, (error, result) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ error: "Erreur lors de l'ajout de la déclaration." });
            }

            const declarationId = result.insertId;
            const batimentIds = req.body.id_batiments; // Supposons que `id_batiments` est un tableau d'IDs de bâtiments.

            const batimentValues = batimentIds.map((id_batiment) => [declarationId, id_batiment]);
            const batimentQuery = `
                INSERT INTO declaration_super_batiment (id_declaration_super, id_batiment) VALUES ?
            `;

            db.query(batimentQuery, [batimentValues], (error) => {
                if (error) {
                    console.log(error);
                    return res.status(500).json({ error: "Erreur lors de l'association des bâtiments." });
                }

                return res.status(201).json({ message: 'Déclaration ajoutée avec succès et bâtiments associés.' });
            });
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout de la déclaration:", error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la déclaration." });
    }
};

exports.putDeclaration = (req, res) => {
    const { id_declaration } = req.query;

    if (!id_declaration || isNaN(id_declaration)) {
        return res.status(400).json({ error: 'Invalid declaration ID provided' });
    }

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
            req.body.periode,
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
            id_declaration
        ];

        db.query(q, values, (error, data) => {
            if (error) {
                console.log(error);
                return res.status(404).json({ error: 'Declaration record not found' });
            }
            return res.json({ message: 'Declaration record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating declaration:", err);
        return res.status(500).json({ error: 'Failed to update Declaration record' });
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