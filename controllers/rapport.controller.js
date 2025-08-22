const { db } = require("./../config/database");
const util = require("util");
const query = util.promisify(db.query).bind(db);

exports.getRapport = (req, res) => {
    const { id_client } = req.query;

    if (!id_client) {
        return res.status(400).json({ error: "L'ID de client est requis." });
    }

    const q = `
            SELECT 
                cp.periode, 
                cp.valeur_parametre,
                p.nom_parametre,
                cr.nom_contrat,
                cat.nom_cat,
                cr.id_client,
                c.nom
            FROM 
                contrat_parametres cp 
            INNER JOIN cat_rapport cat ON cp.id_cat = cat.id_cat_rapport
            INNER JOIN contrats_rapport cr ON cp.id_contrat = cr.id_contrats_rapport
            INNER JOIN parametre p ON cp.id_parametre = p.id_parametre
            INNER JOIN client c ON cr.id_client = c.id_client
            WHERE cr.id_client = ?
            GROUP BY p.id_parametre, cp.periode
            ORDER BY 
                cp.periode,cp.id_cat, cr.nom_contrat 
                `

    db.query(q, [id_client], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.getRapportOne = (req, res) => {
    const { id_contrat_parametre } = req.query;

    const q = `SELECT * FROM contrat_parametres WHERE id_contrat_parametre = ?`

    db.query(q, [id_contrat_parametre], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapport special' });
        }
        res.json(results);
    })
}

exports.postRapport = async (req, res) => {
    try {
        const parametres = req.body; // Récupérer la liste complète
        if (!Array.isArray(parametres) || parametres.length === 0) {
            return res.status(400).json({ error: "Données invalides." });
        }

        const values = parametres.map(({ periode, id_contrat, id_parametre, id_cat, valeur }) => 
            [`${periode}-03`, id_contrat, id_parametre, id_cat, valeur] // Ici, on modifie periode
        );

        const insertRapport = `
            INSERT INTO contrat_parametres(periode, id_contrat, id_parametre, id_cat, valeur_parametre) 
            VALUES ?
        `;

        const result = await new Promise((resolve, reject) => {
            db.query(insertRapport, [values], (error, results) => {
                if (error) reject(error);
                else resolve(results);
            });
        });

        return res.status(201).json({ 
            message: "Rapport ajouté avec succès.",
            affectedRows: result.affectedRows
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

//Parametre
exports.getParametreRapport = (req, res) => {

    const q = `SELECT * FROM parametre`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.getParametreRapportOne = (req, res) => {
    const { id_contrat } = req.query;

    const q = `SELECT * FROM parametre WHERE id_contrat = ?`

    db.query(q, [id_contrat], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.getParametreContratCat = (req, res) => {
    const { id_element_contrat } = req.query;

    const q = `SELECT * FROM parametre WHERE id_element_contrat = ?`

    db.query(q, [id_element_contrat], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.postParametreRapport = async (req, res) => {
    try {
        const q = 'INSERT INTO parametre(`id_contrat`, `nom_parametre`, `id_element_contrat`, `id_etiquette`) VALUES(?)';

        // Vérification si req.body est bien un tableau
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Données invalides. Un tableau est requis.' });
        }

        // Exécution de toutes les requêtes SQL en parallèle
        await Promise.all(req.body.map(async (d) => {
            try {
                const values = [
                    d.id_contrat,
                    d.nom_parametre,
                    d.id_element_contrat,
                    d.id_etiquette
                ];

                await db.query(q, [values]);
            } catch (err) {
                console.error('Erreur lors de l\'ajout du paramètre:', err.message);
            }
        }));

        // Réponse en cas de succès
        return res.status(201).json({ message: 'Paramètres ajoutés avec succès' });

    } catch (error) {
        console.error('Erreur générale lors de l\'ajout des paramètres:', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des paramètres." });
    }
};

//Element contrat
exports.getElementContrat = (req, res) => {

    const q = `SELECT * FROM element_contrat`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.getElementContratCat = (req, res) => {
    const { id_contrat, id_cat_rapport } = req.query;

    const q = `SELECT * FROM element_contrat ec WHERE ec.id_contrat = ? AND ec.id_cat = ?`;

    db.query(q, [id_contrat, id_cat_rapport], (error, results) => {
        if (error) {
            console.error('Erreur lors de la récupération des rapports:', error);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    });
};

exports.postElementContrat = async(req, res) => {
    try {
        const { id_contrat, id_cat, nom_element } = req.body;
        
        const q = 'INSERT INTO element_contrat(`id_contrat`, `id_cat`, `nom_element`) VALUES(?)';

        const values = [
            id_contrat, 
            id_cat,
            nom_element
        ]

        db.query(q, [values], (err, result)=> {
            if(err) {
                console.log(err)
            }
            return res.status(201).json({ message: 'Parametre ajouté avec succès' });

        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout d  un element:', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout du parametre." });
    }
}

//Etiquette
exports.getEtiquette = (req, res) => {

    const q = `SELECT * FROM etiquette`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des étiquettes:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des étiquettes' });
        }
        res.json(results);
    })
}

exports.postEtiquette = async(req, res) => {
    try {
        const { nom_etiquette } = req.body;
        
        const q = 'INSERT INTO etiquette(`nom_etiquette`) VALUES(?)';

        const values = [
            nom_etiquette
        ]

        await db.query(q, [values]);
        return res.status(201).json({ message: 'L etiquette a été ajoutée avec succès' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout d une etiquette:', error.message);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout d une etiquette." });
    }
}

//Contrat
exports.getContratRapport = (req, res) => {

    const q = `SELECT cr.id_contrats_rapport,
					  cr.nom_contrat, 
                      cr.superfice, 
                      cr.tarif_camion, 
                      cr.tarif_tonne, 
                      cr.tarif_palette, 
                      client.nom 
                FROM contrats_rapport cr
                INNER JOIN client ON cr.id_client = client.id_client`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.getContratRapportClient = (req, res) => {

    const q = `SELECT
                    cr.id_client,
                    client.nom,
                    COUNT(cr.id_client) AS nbre
                FROM contrats_rapport cr
                INNER JOIN client ON cr.id_client = client.id_client
                GROUP BY client.id_client
`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.getContratRapportClientOne = (req, res) => {
    const { id_client } = req.query;

    if (!id_client) {
        return res.status(400).json({ error: "L'ID de client est requis." });
    }

    const q = `SELECT 
                    cr.id_contrats_rapport,
					cr.nom_contrat, 
                    cr.superfice, 
                    cr.tarif_camion, 
                    cr.tarif_tonne, 
                    cr.tarif_palette, 
                    client.nom 
                FROM contrats_rapport cr
                INNER JOIN client ON cr.id_client = client.id_client
                WHERE cr.id_client = ?
                `

    db.query(q, [id_client], (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des rapports:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des rapports' });
        }
        res.json(results);
    })
}

exports.postContratRapport = async(req, res) => {
    try {
        const { nom_contrat, id_client, superfice, tarif_camion, tarif_tonne, tarif_palette } = req.body;
        
        const q = 'INSERT INTO contrats_rapport(`id_client`, `nom_contrat`, `superfice`, `tarif_camion`, `tarif_tonne`, `tarif_palette`) VALUES(?)';

        const values = [
            id_client,
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

//TEMPLATE DECLARATION
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

//RAPPORT DE BON DE SORTIE
exports.getRapportBonGlobal = (req, res) => {
  
  const q1 = `
    SELECT 
      (SELECT COUNT(*) 
       FROM bande_sortie 
       WHERE est_supprime = 0) AS total_bons,

      (SELECT COUNT(DISTINCT id_vehicule) 
       FROM bande_sortie 
       WHERE est_supprime = 0) AS total_vehicules,

      (SELECT COUNT(DISTINCT id_chauffeur) 
       FROM bande_sortie 
       WHERE est_supprime = 0) AS total_chauffeurs,

      (SELECT 
          ROUND(AVG(TIMESTAMPDIFF(MINUTE, sortie_time, retour_time)), 2)
       FROM bande_sortie
       WHERE est_supprime = 0 
         AND sortie_time IS NOT NULL 
         AND retour_time IS NOT NULL
      ) AS temps_moyen_minutes,

      (SELECT 
          ROUND(AVG(TIMESTAMPDIFF(SECOND, sortie_time, retour_time)) / 3600, 2)
       FROM bande_sortie
       WHERE est_supprime = 0 
         AND sortie_time IS NOT NULL 
         AND retour_time IS NOT NULL
      ) AS temps_moyen_heures
  `;

  const q2 = `
    SELECT 
        v.id_cat_vehicule, 
        cv.nom_cat, 
        cv.abreviation, 
        COUNT(*) AS nbre
    FROM bande_sortie b
    JOIN vehicules v ON v.id_vehicule = b.id_vehicule
    JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
    WHERE b.est_supprime = 0
    GROUP BY v.id_cat_vehicule, cv.nom_cat, cv.abreviation
    ORDER BY nbre DESC;

  `;

  const q3 = `
    SELECT COUNT(*) AS nbre, sd.nom_service
    FROM bande_sortie bs
    JOIN service_demandeur sd ON sd.id_service_demandeur = bs.id_demandeur
    WHERE bs.est_supprime = 0
    GROUP BY bs.id_demandeur
    ORDER BY nbre DESC;
  `;

  db.query(q1, (error, globalData) => {
    if (error) {
      console.error("Erreur lors de la récupération globale :", error);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des données globales." });
    }

    db.query(q2, (error2, repartitionVehicule) => {
      if (error2) {
        console.error("Erreur lors de la récupération de la répartition :", error2);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des répartitions." });
      }

      db.query(q3, (error3, repartitionService) => {
        if (error3) {
          console.error("Erreur lors de la récupération de la répartition :", error3);
          return res.status(500).json({ error: "Erreur serveur lors de la récupération des répartitions." });
        }

        return res.status(200).json({
          global: globalData[0],
          repartitionVehicule,
          repartitionService
        });
      });
    });
  });
};

exports.getRapportPerformanceBon = async (req, res) => {
  try {
    const { service, destination, vehicule, dateRange } = req.query;

    const whereConditions = ['bs.est_supprime = 0'];
    const params = [];

    // Filtrage par dates
    if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
      whereConditions.push('DATE(bs.sortie_time) BETWEEN ? AND ?');
      params.push(new Date(dateRange[0]), new Date(dateRange[1]));
    }

    // Filtrage par véhicule
    if (vehicule && vehicule.length > 0) {
      whereConditions.push(`bs.id_vehicule IN (${vehicule.map(() => '?').join(',')})`);
      params.push(...vehicule);
    }

    // Filtrage par destination
    if (destination && destination.length > 0) {
      whereConditions.push(`bs.id_destination IN (${destination.map(() => '?').join(',')})`);
      params.push(...destination);
    }

    // Filtrage par service demandeur
    if (service && service.length > 0) {
      whereConditions.push(`bs.id_demandeur IN (${service.map(() => '?').join(',')})`);
      params.push(...service);
    }

    // Préparer clause WHERE
    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 1. Moyenne sorties par véhicule
    const q1 = `
      SELECT 
        v.id_vehicule,
        v.immatriculation,
        m.nom_marque,
        cv.nom_cat,
        COUNT(bs.id_bande_sortie) AS total_sorties
      FROM bande_sortie bs
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      ${whereClause}
      GROUP BY v.id_vehicule, v.immatriculation, m.nom_marque, cv.nom_cat
    `;

    // 2. Moyenne sorties par chauffeur
    const q2 = `
      SELECT 
        c.id_chauffeur,
        c.nom,
        COUNT(bs.id_bande_sortie) AS total_sorties
      FROM bande_sortie bs
      JOIN chauffeurs c ON c.id_chauffeur = bs.id_chauffeur
      ${whereClause}
      GROUP BY c.id_chauffeur, c.nom
    `;

    // 3. Durée moyenne et totale par destination
    const q3 = `
      SELECT 
        d.nom_destination,            
        COUNT(bs.id_bande_sortie) AS total_sorties,
        AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) AS duree_moyenne_minutes,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) / 60, 2) AS duree_moyenne_heures,
        SUM(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) AS duree_totale_minutes,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) / 60, 2) AS duree_totale_heures,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) / 1440, 2) AS duree_totale_jours
      FROM bande_sortie bs
      JOIN destination d ON d.id_destination = bs.id_destination
      ${whereClause} AND bs.sortie_time IS NOT NULL AND bs.retour_time IS NOT NULL
      GROUP BY bs.id_destination, d.nom_destination
      ORDER BY duree_moyenne_minutes DESC
    `;

    // 4. Taux de respect des délais
    const q4 = `
      SELECT 
        IFNULL(SUM(CASE WHEN retour_time <= date_retour THEN 1 ELSE 0 END) / COUNT(*) * 100, 0) AS taux_retour_delais
      FROM bande_sortie bs
      ${whereClause} AND bs.retour_time IS NOT NULL AND bs.date_retour IS NOT NULL
    `;

    // 5. Bons avec statut = 5
    const q5 = `
      SELECT bs.id_vehicule
      FROM bande_sortie bs
      ${whereClause} AND bs.statut = 5
    `;

    // Exécution parallèle avec Promises
    const [vehiculeData, chauffeurData, dureeData, tauxData, sortieTotal] = await Promise.all([
      new Promise((resolve, reject) => db.query(q1, params, (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(q2, params, (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(q3, params, (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(q4, params, (err, res) => err ? reject(err) : resolve(res))),
      new Promise((resolve, reject) => db.query(q5, params, (err, res) => err ? reject(err) : resolve(res))),
    ]);

    res.status(200).json({
      vehiculeData,
      chauffeurData,
      dureeData,
      sortieTotal,
      tauxData: tauxData[0] || { taux_retour_delais: 0 },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur lors du calcul des performances" });
  }
};

exports.getStatutsPrincipaux = (req, res) => {
  const { startDate, endDate } = req.query;
  const params = [];

  let dateFilter = '';
  if (startDate && endDate) {
    dateFilter = 'AND DATE(sortie_time) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  const q = `
    SELECT
      SUM(CASE WHEN statut = 4 THEN 1 ELSE 0 END) AS bons_valides,
      SUM(CASE WHEN statut IN (5,6) THEN 1 ELSE 0 END) AS departs_effectues,
      SUM(CASE WHEN statut IN (7,8) THEN 1 ELSE 0 END) AS retours_confirmes,
      SUM(CASE WHEN statut IN (1,4) THEN 1 ELSE 0 END) AS courses_non_parties,
      SUM(CASE WHEN statut IN (5,6) THEN 1 ELSE 0 END) AS courses_non_revenues,
      COUNT(*) AS total_bons
    FROM bande_sortie
    WHERE est_supprime = 0
    ${dateFilter};
  `;

  db.query(q, params, (error, data) => {
    if (error) {
      console.error("Erreur lors de la récupération des statuts principaux :", error);
      return res.status(500).json({ error: "Erreur serveur lors de la récupération des statuts principaux." });
    }

    const row = data[0];

    const result = {
      bons_valides: { nbre: row.bons_valides, pourcentage: ((row.bons_valides / row.total_bons) * 100).toFixed(2) },
      departs_effectues: { nbre: row.departs_effectues, pourcentage: ((row.departs_effectues / row.total_bons) * 100).toFixed(2) },
      retours_confirmes: { nbre: row.retours_confirmes, pourcentage: ((row.retours_confirmes / row.total_bons) * 100).toFixed(2) },
      courses_non_parties: { nbre: row.courses_non_parties, pourcentage: ((row.courses_non_parties / row.total_bons) * 100).toFixed(2) },
      courses_non_revenues: { nbre: row.courses_non_revenues, pourcentage: ((row.courses_non_revenues / row.total_bons) * 100).toFixed(2) },
    };

    return res.status(200).json(result);
  });
};

exports.getRapportKpi = async (req, res) => {
  try {
    const { service, destination, vehicule, dateRange } = req.query;

    const whereConditions = ['bs.est_supprime = 0'];
    const params = [];

    // Filtrage par dates
    if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
      whereConditions.push('DATE(bs.sortie_time) BETWEEN ? AND ?');
      params.push(new Date(dateRange[0]), new Date(dateRange[1]));
    }

    // Filtrage par véhicule
    if (vehicule && vehicule.length > 0) {
      whereConditions.push(`bs.id_vehicule IN (${vehicule.map(() => '?').join(',')})`);
      params.push(...vehicule);
    }

    // Filtrage par destination
    if (destination && destination.length > 0) {
      whereConditions.push(`bs.id_destination IN (${destination.map(() => '?').join(',')})`);
      params.push(...destination);
    }

    // Filtrage par service demandeur
    if (service && service.length > 0) {
      whereConditions.push(`bs.id_demandeur IN (${service.map(() => '?').join(',')})`);
      params.push(...service);
    }

    // Préparer la clause WHERE
    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 1. Destinations les plus fréquentes (top 5) et le temps moyen
    const topDestQuery = `
      SELECT 
        d.nom_destination, 
        COUNT(*) AS nb_courses,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)), 2) AS duree_moyenne_minutes,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)) / 60, 2) AS duree_moyenne_heures
      FROM bande_sortie bs
      JOIN destination d ON d.id_destination = bs.id_destination
      ${whereClause}
      GROUP BY d.nom_destination
      ORDER BY nb_courses DESC
      LIMIT 5;
    `;

    // 2. Temps moyen par destination
    const tempsMoyenQuery = `
      SELECT d.nom_destination, 
             ROUND(AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)),2) AS temps_moyen_minutes
      FROM bande_sortie bs
      JOIN destination d ON d.id_destination = bs.id_destination
      ${whereClause} AND bs.retour_time IS NOT NULL
      GROUP BY d.nom_destination
    `;

    // 3. Volume de courses par service
    const volumeServiceQuery = `
      SELECT s.nom_service, 
             COUNT(*) AS nb_courses,
             ROUND(AVG(TIMESTAMPDIFF(MINUTE, bs.sortie_time, bs.retour_time)),2) AS temps_moyen_minutes
      FROM bande_sortie bs
      JOIN service_demandeur s ON s.id_service_demandeur = bs.id_demandeur
      ${whereClause}
      GROUP BY s.nom_service
    `;

    // 4. Nombre d'OT associés
    const nbOtQuery = `
      SELECT COUNT(DISTINCT bs.id_bande_sortie) AS nb_ot
      FROM bande_sortie bs
      ${whereClause}
    `;

    // 5. Taux d’utilisation du parc véhicules
    let tauxVehiculesParams = [];
    let tauxVehiculesWhere = '';
    if (dateRange && dateRange.length === 2) {
      tauxVehiculesWhere = 'WHERE DATE(bs.sortie_time) BETWEEN ? AND ?';
      tauxVehiculesParams.push(new Date(dateRange[0]), new Date(dateRange[1]));
    }

    const tauxVehiculesQuery = `
      SELECT 
        (SELECT COUNT(DISTINCT id_vehicule) FROM bande_sortie bs ${tauxVehiculesWhere}) /
        (SELECT COUNT(*) FROM vehicules WHERE IsDispo = 1) * 100 AS taux_utilisation
    `;

    // Exécution parallèle avec promisified query
    const [
      topDestinations,
      tempsMoyen,
      volumeService,
      nbOtResult,
      tauxVehiculesResult
    ] = await Promise.all([
      query(topDestQuery, params),
      query(tempsMoyenQuery, params),
      query(volumeServiceQuery, params),
      query(nbOtQuery, params),
      query(tauxVehiculesQuery, tauxVehiculesParams)
    ]);

    const result = {
      top_destinations: topDestinations || [],
      temps_moyen_par_destination: tempsMoyen || [],
      volume_courses_par_service: volumeService || [],
      nb_ot: nbOtResult[0]?.nb_ot || 0,
      taux_utilisation_parc: parseFloat(tauxVehiculesResult[0]?.taux_utilisation?.toFixed(2) || 0)
    };

    res.status(200).json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur lors du calcul des KPI." });
  }
}