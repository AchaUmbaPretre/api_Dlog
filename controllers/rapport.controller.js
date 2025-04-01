const { db } = require("./../config/database");

exports.getRapport = (req, res) => {

    const q = `SELECT rs.*, c.nom 
                FROM 
                rapport_special rs
                INNER JOIN client c ON c.id_client = rs.id_client`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.getRapportOne = (req, res) => {
    const { rapport } = req.query;

    const q = `SELECT * FROM rapport_special WHERE id_rapport_special = ?`

    db.query(q, [rapport], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.postRapport = async (req, res) => {

    try {
        const {
            periode, id_client, superficie, entreposage, transport_nrj, teu, lourd, tonnage, 
            peage_camion, teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
            bouteilles_intrants, camions_charge_decharge, sacs_tonne, palettes_mise_en_bac, bout, palettes_avenant, camions_livres, user_cr
        } = req.body;

        if (!periode || !id_client || !user_cr) {
            return res.status(400).json({ error: "Les champs 'periode', 'id_client' et 'user_cr' sont obligatoires." });
        }

        const insertRapport = `
            INSERT INTO rapport_special (
                periode, id_client, superficie, entreposage, 
                transport_nrj, teu, lourd, tonnage, peage_camion, 
                teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
                bouteilles_intrants, camions_charge_decharge, sacs_tonne, 
                palettes_mise_en_bac, bout, palettes_avenant, camions_livres, user_cr
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

        const values = [
            periode, id_client, superficie, entreposage, transport_nrj, teu, lourd, tonnage, 
            peage_camion, teu_retour, camions_manut, sacs_manut_IN, sacs_manut_OUT, 
            bouteilles_intrants, camions_charge_decharge, sacs_tonne, palettes_mise_en_bac, 
            bout, palettes_avenant, camions_livres, user_cr
        ];

        // Exécution de la requête avec une promesse
        const result = await new Promise((resolve, reject) => {
            db.query(insertRapport, values, (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return res.status(201).json({ 
            message: "Rapport ajouté avec succès.",
            id: result.insertId 
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout du rapport :", error);
        return res.status(500).json({ error: "Une erreur interne s'est produite." });
    }
};

//Categorie rapport
exports.getCatRapport = (req, res) => {

    const q = `SELECT * FROM cat_rapport`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

//Contrat
exports.getContratRapport = (req, res) => {

    const q = `SELECT * FROM contrats_rapport`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.postContratRapport = async(req, res) => {
    try {
        const { nom_contrat, superfice, tarif_camion, tarif_tonne, tarif_palette } = req.body;
        
        const q = 'INSERT INTO contrats_rapport(`nom_contrat`, `superfice`, `tarif_camion`, `tarif_tonne`, `tarif_palette`) VALUES(?)';

        const values = [
            nom_contrat, 
            superfice,
            tarif_camion, 
            tarif_tonne, 
            tarif_palette
        ]

        await db.query(q, [values]);
        // Réponse en cas de succès
        return res.status(201).json({ message: 'Contrat ajouté avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du contrat:', error.message);
        // Réponse en cas d'erreur
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du contrat." });
    }
}

// TEMPLATE DECLARATION
exports.getDeclarationTemplateOne = (req, res) => {
    const { id_template, id_province } = req.query;

    const q = ` SELECT 
                ds.periode,
                SUM(COALESCE(ds.m2_occupe)) AS m2_occupe,
                SUM(COALESCE(ds.m2_facture)) AS m2_facture,
                SUM(COALESCE(ds.total_entreposage, 0)) AS total_entreposage,
                SUM(COALESCE(ds.total_manutation, 0)) AS total_manutation,
                SUM(COALESCE(ds.total_entreposage, 0) + COALESCE(ds.total_manutation, 0)) AS total
            FROM declaration_super ds
            WHERE ds.id_template = ? OR ds.id_ville = ?
              GROUP BY MONTH(ds.periode)`
    db.query(q, [id_template, id_province], (error, results) => {
        if(error){
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport' });
        }
        res.json(results);
    })
}

//Rapport cloturé
exports.getClotureRapport = (req, res) => {

    const q = `SELECT 
                c.id_cloture, 
                c.periode, 
                c.m2_occupe, 
                c.m2_facture, 
                c.entreposage, 
                c.manutation, 
                SUM(COALESCE(c.entreposage, 0) + COALESCE(c.manutation, 0)) AS total
              FROM 
                cloture c
                GROUP BY c.id_cloture
                `

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.postClotureRapport = (req, res) => {
    const dataArray = req.body;

    // Transformation des périodes pour fixer le jour à "03"
    const transformedData = dataArray.map(item => {
        const date = new Date(item.periode);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const newPeriode = `${year}-${month}-03`; // Fixe toujours le jour à "03"
        return {
            periode: newPeriode,
            m2_occupe: item.m2_occupe,
            m2_facture: item.m2_facture,
            total_entreposage: item.total_entreposage,
            total_manutation: item.total_manutation
        };
    });

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Erreur de connexion à la base de données:', err.message);
            return res.status(500).json({ error: 'Erreur de connexion à la base de données.' });
        }

        connection.beginTransaction((err) => {
            if (err) {
                console.error('Erreur lors du démarrage de la transaction:', err.message);
                connection.release();
                return res.status(500).json({ error: 'Erreur lors du démarrage de la transaction.' });
            }

            // Vérification des périodes existantes dans la base de données
            connection.query('SELECT periode FROM cloture', (err, results) => {
                if (err) {
                    console.error('Erreur lors de la récupération des périodes:', err.message);
                    connection.rollback(() => {
                        connection.release();
                    });
                    return res.status(500).json({ error: 'Erreur lors de la récupération des périodes.' });
                }

                const existingPeriodes = new Set(results.map(row => row.periode));

                // Vérification de chaque période avant l'insertion
                const newData = [];
                transformedData.forEach(item => {
                    if (!existingPeriodes.has(item.periode)) {
                        newData.push(item);
                    }
                });

                if (newData.length === 0) {
                    connection.rollback(() => {
                        connection.release();
                    });
                    return res.status(200).json({ message: 'Aucune nouvelle période à ajouter.' });
                }

                // Préparer les données pour l'insertion
                const values = newData.map(item => [
                    item.periode, 
                    item.m2_occupe, 
                    item.m2_facture, 
                    item.total_entreposage, 
                    item.total_manutation
                ]);

                const insertQuery = 'INSERT INTO cloture (`periode`, `m2_occupe`, `m2_facture`, `entreposage`, `manutation`) VALUES ?';

                connection.query(insertQuery, [values], (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des données:', err.message);
                        connection.rollback(() => {
                            connection.release();
                        });
                        return res.status(500).json({ error: 'Erreur lors de l\'insertion des données.' });
                    }

                    // Commit de la transaction après une insertion réussie
                    connection.commit((err) => {
                        if (err) {
                            console.error('Erreur lors du commit de la transaction:', err.message);
                            connection.rollback(() => {
                                connection.release();
                            });
                            return res.status(500).json({ error: 'Erreur lors du commit de la transaction.' });
                        }

                        connection.release();
                        return res.status(201).json({ message: 'Clôture ajoutée avec succès.' });
                    });
                });
            });
        });
    });
};

exports.postClotureRapportSimple = (req, res) => {
    const { periode, m2_occupe, m2_facture, total_entreposage, total_manutation } = req.body;

    if (!periode) {
        return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

     // Normalisation de la période
     const periodeDate = new Date(periode);
     if (isNaN(periodeDate.getTime())) {
         return res.status(400).json({ error: "Format de période invalide." });
     }
     const year = periodeDate.getUTCFullYear();
     const month = String(periodeDate.getUTCMonth() + 1).padStart(2, '0');
     const fixedPeriode = `${year}-${month}-03`;

    db.getConnection((err, connection) => {
        if (err) {
            console.error('Erreur de connexion à la base de données:', err.message);
            return res.status(500).json({ error: 'Erreur de connexion à la base de données.' });
        }

        connection.beginTransaction((err) => {
            if (err) {
                console.error('Erreur lors du démarrage de la transaction:', err.message);
                connection.release();
                return res.status(500).json({ error: 'Erreur lors du démarrage de la transaction.' });
            }

            // Vérifier si la période existe déjà
            connection.query('SELECT COUNT(*) AS count FROM cloture WHERE periode = ?', [periodeDate], (err, results) => {
                if (err) {
                    console.error('Erreur lors de la récupération des périodes:', err.message);
                    return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ error: 'Erreur lors de la récupération des périodes.' });
                    });
                }

                if (results[0].count > 0) {
                    connection.release();
                    return res.status(409).json({ message: 'Cette période existe déjà.' });
                }

                // Insérer les données
                const insertQuery = 'INSERT INTO cloture (periode, m2_occupe, m2_facture, entreposage, manutation) VALUES (?, ?, ?, ?, ?)';
                connection.query(insertQuery, [periodeDate , m2_occupe, m2_facture, total_entreposage, total_manutation], (err) => {
                    if (err) {
                        console.error('Erreur lors de l\'insertion des données:', err.message);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({ error: 'Erreur lors de l\'insertion des données.' });
                        });
                    }

                    // Valider la transaction
                    connection.commit((err) => {
                        if (err) {
                            console.error('Erreur lors du commit de la transaction:', err.message);
                            return connection.rollback(() => {
                                connection.release();
                                res.status(500).json({ error: 'Erreur lors du commit de la transaction.' });
                            });
                        }

                        connection.release();
                        res.status(201).json({ message: 'Clôture ajoutée avec succès.' });
                    });
                });
            });
        });
    });
};




