const { db } = require("./../config/database");
const util = require("util");
const query = util.promisify(db.query).bind(db);
const moment = require("moment");


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
       WHERE est_supprime = 0
       ) AS total_bons,

      (SELECT COUNT(DISTINCT id_vehicule) 
       FROM bande_sortie
       WHERE est_supprime = 0 AND statut != 9
         AND sortie_time IS NOT NULL) AS total_vehicules,

      (SELECT COUNT(DISTINCT id_chauffeur) 
       FROM bande_sortie 
       WHERE est_supprime = 0 AND statut != 9
         AND sortie_time IS NOT NULL) AS total_chauffeurs,

      (SELECT 
          ROUND(AVG(TIMESTAMPDIFF(MINUTE, sortie_time, retour_time)), 2)
       FROM bande_sortie
       WHERE est_supprime = 0 AND statut != 9
         AND sortie_time IS NOT NULL 
         AND retour_time IS NOT NULL
      ) AS temps_moyen_minutes,

      (SELECT 
          ROUND(AVG(TIMESTAMPDIFF(SECOND, sortie_time, retour_time)) / 3600, 2)
       FROM bande_sortie
       WHERE est_supprime = 0 AND statut != 9
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
      AND b.statut != 9
      AND sortie_time IS NOT NULL
    GROUP BY v.id_cat_vehicule, cv.nom_cat, cv.abreviation
    ORDER BY nbre DESC
  `;

  const q3 = `
    SELECT 
      COUNT(*) AS nbre, 
      sd.nom_service
    FROM bande_sortie bs
    JOIN service_demandeur sd 
      ON sd.id_service_demandeur = bs.id_demandeur
    WHERE bs.est_supprime = 0 
      AND bs.statut != 9
      AND sortie_time IS NOT NULL
    GROUP BY bs.id_demandeur, sd.nom_service
    ORDER BY nbre DESC
  `;

  try {
    db.query(q1, (error, globalData) => {
      if (error) {
        console.error("❌ Erreur récupération globale :", error);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des données globales." });
      }

      db.query(q2, (error2, repartitionVehicule) => {
        if (error2) {
          console.error("❌ Erreur récupération répartition véhicules :", error2);
          return res.status(500).json({ error: "Erreur serveur lors de la récupération des répartitions véhicules." });
        }

        db.query(q3, (error3, repartitionService) => {
          if (error3) {
            console.error("❌ Erreur récupération répartition services :", error3);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des répartitions services." });
          }

          return res.status(200).json({
            global: globalData?.[0] || {},
            repartitionVehicule,
            repartitionService
          });
        });
      });
    });
  } catch (err) {
    console.error("🔥 Erreur inattendue :", err);
    return res.status(500).json({ error: "Erreur serveur interne." });
  }
};

exports.getRapportPerformanceBon = async (req, res) => {
  try {
    const { service, destination, type, vehicule, dateRange } = req.query;

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

    // Filtrage par type
    if (type && type.length > 0) {
      whereConditions.push(`cv.id_cat_vehicule IN (${type.map(() => '?').join(',')})`);
      params.push(...type);
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
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
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
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      ${whereClause} AND bs.sortie_time IS NOT NULL AND bs.retour_time IS NOT NULL
      GROUP BY bs.id_destination, d.nom_destination
      ORDER BY duree_moyenne_minutes DESC
    `;

    // 4. Taux de respect des délais
    const q4 = `
      SELECT 
        IFNULL(SUM(CASE WHEN retour_time <= date_retour THEN 1 ELSE 0 END) / COUNT(*) * 100, 0) AS taux_retour_delais
      FROM bande_sortie bs
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      ${whereClause} AND bs.retour_time IS NOT NULL AND bs.date_retour IS NOT NULL
    `;

    // 5. Bons avec statut = 5
    const q5 = `
      SELECT bs.id_vehicule
      FROM bande_sortie bs
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
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
    const { service, destination, type, vehicule, dateRange } = req.query;

    const whereConditions = ['bs.est_supprime = 0'];
    const params = [];

    // Filtrage par dates
    if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
      whereConditions.push('DATE(bs.sortie_time) BETWEEN ? AND ?');
      params.push(dateRange[0], dateRange[1]);
    }

    // Filtrage par type
    if (type && type.length > 0) {
      whereConditions.push(`cv.id_cat_vehicule IN (${type.map(() => '?').join(',')})`);
      params.push(...type);
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
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
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
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
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
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      ${whereClause}
      GROUP BY s.nom_service
      ORDER BY nb_courses DESC
    `;

    // 4. Nombre d'OT associés
    const nbOtQuery = `
      SELECT COUNT(DISTINCT bs.id_bande_sortie) AS nb_ot
      FROM bande_sortie bs
      JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
      JOIN marque m ON m.id_marque = v.id_marque
      JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      ${whereClause}
    `;

    // 5. Taux d’utilisation du parc véhicules avec filtres
    const tauxVehiculesWhereConditions = ['bs.est_supprime = 0'];
    const tauxVehiculesParams = [];

    if (dateRange && dateRange.length === 2) {
      tauxVehiculesWhereConditions.push('DATE(bs.sortie_time) BETWEEN ? AND ?');
      tauxVehiculesParams.push(dateRange[0], dateRange[1]);
    }
    if (type && type.length > 0) {
      tauxVehiculesWhereConditions.push(`cv.id_cat_vehicule IN (${type.map(() => '?').join(',')})`);
      tauxVehiculesParams.push(...type);
    }
    if (vehicule && vehicule.length > 0) {
      tauxVehiculesWhereConditions.push(`bs.id_vehicule IN (${vehicule.map(() => '?').join(',')})`);
      tauxVehiculesParams.push(...vehicule);
    }
    if (destination && destination.length > 0) {
      tauxVehiculesWhereConditions.push(`bs.id_destination IN (${destination.map(() => '?').join(',')})`);
      tauxVehiculesParams.push(...destination);
    }
    if (service && service.length > 0) {
      tauxVehiculesWhereConditions.push(`bs.id_demandeur IN (${service.map(() => '?').join(',')})`);
      tauxVehiculesParams.push(...service);
    }

    const tauxVehiculesWhereClause = tauxVehiculesWhereConditions.length
      ? `WHERE ${tauxVehiculesWhereConditions.join(' AND ')}`
      : '';

    const tauxVehiculesQuery = `
      SELECT 
        (SELECT COUNT(DISTINCT bs.id_vehicule)
         FROM bande_sortie bs
         JOIN vehicules v ON v.id_vehicule = bs.id_vehicule
         JOIN marque m ON m.id_marque = v.id_marque
         JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
         ${tauxVehiculesWhereClause}) /
        (SELECT COUNT(*) FROM vehicules WHERE IsDispo = 1) * 100 AS taux_utilisation
    `;

    // Exécution parallèle
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

    res.status(200).json({
      top_destinations: topDestinations || [],
      temps_moyen_par_destination: tempsMoyen || [],
      volume_courses_par_service: volumeService || [],
      nb_ot: nbOtResult[0]?.nb_ot || 0,
      taux_utilisation_parc: parseFloat(tauxVehiculesResult[0]?.taux_utilisation?.toFixed(2) || 0)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur serveur lors du calcul des KPI." });
  }
};

//Rapport mouvement véhicule
exports.getMouvementVehicule = async (req, res) => {
  try {
    const { service, destination, vehicule, type, dateRange, dateFilter = 'today', userId } = req.query;

    if (!userId) return res.status(400).json({ error: "userId est requis" });

    const filters = [];
    const params = [];


    // --- Gestion période ---
    let startDate, endDate;
    if (dateRange?.length === 2) {
      startDate = moment(new Date(dateRange[0])).format('YYYY-MM-DD');
      endDate   = moment(new Date(dateRange[1])).format('YYYY-MM-DD');

    }
    else {
      switch (dateFilter) {
        case 'today':
          startDate = endDate = moment().format('YYYY-MM-DD'); break;
        case 'yesterday':
          startDate = endDate = moment().subtract(1, 'days').format('YYYY-MM-DD'); break;
        case 'last7days':
          startDate = moment().subtract(6, 'days').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD'); break;
        case 'last30days':
          startDate = moment().subtract(29, 'days').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD'); break;
        case 'last1year':
          startDate = moment().subtract(1, 'year').format('YYYY-MM-DD');
          endDate = moment().format('YYYY-MM-DD'); break;
        case 'year':
          startDate = moment().startOf('year').format('YYYY-MM-DD');
          endDate = moment().endOf('year').format('YYYY-MM-DD'); break;
      }
    }

    if (startDate && endDate) {
      filters.push('DATE(b.created_at) BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    // --- Filtrage véhicules ---
    if (vehicule?.length) {
      filters.push(`b.id_vehicule IN (${vehicule.map(() => '?').join(',')})`);
      params.push(...vehicule);
    }

    if (type?.length) {
      filters.push(`cv.id_cat_vehicule IN (${type.map(() => '?').join(',')})`);
      params.push(...type)
    }

    // --- Filtrage destinations ---
    if (destination?.length) {
      filters.push(`b.id_localisation IN (${destination.map(() => '?').join(',')})`);
      params.push(...destination);
    }

    // --- Filtrage services / demandeurs ---
    if (service?.length) {
      filters.push(`b.id_demandeur IN (${service.map(() => '?').join(',')})`);
      params.push(...service);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // --- Requête principale ---
    const query = `
      SELECT
        COUNT(*) AS total_bons,
        COUNT(CASE WHEN b.statut = 4 THEN 1 END) AS bons_valides,
        COUNT(CASE WHEN vd.id_validation_demande IS NULL THEN 1 END) AS bons_en_attente,
        COUNT(CASE WHEN b.sortie_time IS NOT NULL THEN 1 END) AS departs_effectues,
        COUNT(CASE WHEN b.retour_time IS NOT NULL THEN 1 END) AS retours_confirmes,
        COUNT(CASE WHEN b.sortie_time > b.date_prevue THEN 1 END) AS departs_hors_timing,
        COUNT(CASE WHEN b.retour_time > b.date_retour THEN 1 END) AS retours_hors_timing,
        COUNT(CASE WHEN b.statut = 9 THEN 1 END) AS courses_annulees,
        COUNT(CASE WHEN b.sortie_time IS NOT NULL 
                   AND b.retour_time IS NULL 
                   AND b.statut != 9 
                   AND v.est_supprime = 0 THEN 1 END) AS vehicules_hors_site,
        (SELECT COUNT(*) FROM vehicules v2 WHERE v2.est_supprime = 0 AND v2.IsDispo = 1) AS vehicules_disponibles
      FROM bande_sortie b
      LEFT JOIN vehicules v ON v.id_vehicule = b.id_vehicule
      LEFT JOIN marque m ON m.id_marque = v.id_marque
      LEFT JOIN cat_vehicule cv ON cv.id_cat_vehicule = v.id_cat_vehicule
      LEFT JOIN validation_demande vd ON vd.id_bande_sortie = b.id_bande_sortie AND vd.validateur_id = ?
      ${whereClause};
    `;

    const queryParams = [userId, ...params];

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Erreur SQL:', err);
        return res.status(500).json({ error: 'Erreur serveur lors de la récupération des données.' });
      }

      const r = results[0];

      res.json({
        bons_valides: `${r.bons_valides} / ${r.total_bons}`,
        bons_en_attente: r.bons_en_attente,
        departs_effectues: `${r.departs_effectues} / ${r.total_bons}`,
        retours_confirmes: `${r.retours_confirmes} / ${r.total_bons}`,
        departs_hors_timing: r.departs_effectues ? `${r.departs_hors_timing} / ${r.departs_effectues}` : '0 / 0',
        retours_hors_timing: r.retours_confirmes ? `${r.retours_hors_timing} / ${r.retours_confirmes}` : '0 / 0',
        courses_annulees: `${r.courses_annulees} / ${r.total_bons}`,
        vehicules_hors_site: r.vehicules_hors_site,
        vehicules_disponibles: r.vehicules_disponibles,
      });
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données.' });
  }
};

//RAPPORT INSPECTION & REPARATION
exports.getRapportInspectionReparation = async (req, res) => {
  try {
    const query = `
              SELECT 
        -- Nombre total de sub reparation
        (SELECT COUNT(*) FROM sud_reparation WHERE est_supprime = 0) AS total_rep,
        
        -- Nombre total de sous-inspectio (inspections détaillées)
        (SELECT COUNT(*) FROM sub_inspection_gen WHERE est_supprime = 0) AS total_sous_insp,
        
        -- Nombre de véhicules inspectés
        (SELECT COUNT(DISTINCT id_vehicule) FROM inspection_gen WHERE est_supprime = 0) AS vehicules_inspectes,
        
        -- Taux de couverture du parc (si vous avez une table vehicules)
        ROUND(
          (SELECT COUNT(DISTINCT id_vehicule) FROM inspection_gen WHERE est_supprime = 0) 
          / (SELECT COUNT(*) FROM vehicules) * 100, 2
        ) AS taux_couverture_parc
    `;

    db.query(query, async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Erreur lors de la récupération du rapport" });
      }

      // Deux autres requêtes pour les répartitions
      const repartitionTypePanneQuery = `
        SELECT sub.id_type_reparation, COUNT(*) as total, tr.type_rep
        FROM sub_inspection_gen sub
        JOIN type_reparations tr ON tr.id_type_reparation = sub.id_type_reparation
        WHERE est_supprime = 0
        GROUP BY id_type_reparation
        ORDER BY total DESC
      `;

      db.query(repartitionTypePanneQuery, (err2, panneResults) => {
        if (err2) {
          console.error(err2);
          return res.status(500).json({ error: "Erreur lors de la répartition par type de panne" });
        }

          res.json({
            ...results[0],
            repartition_type_panne: panneResults,
          });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

//Coûts de maintenance (capex/opex)
exports.getRapportInspectionCout = async (req, res) => {
  try {
    // Coût total des réparations
    const coutTotalQuery = `
      SELECT SUM(iv.cout) AS cout_total_usd
      FROM inspection_valide iv
      JOIN sub_inspection_gen sg 
        ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
      WHERE sg.est_supprime = 0;
    `;

    // Coût par type de véhicule
    const coutParTypeVehiculeQuery = `
        SELECT 
          v.id_cat_vehicule,
          cv.nom_cat,
          SUM(iv.cout) AS cout_total
      FROM inspection_valide iv
      JOIN sub_inspection_gen sg ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
      JOIN inspection_gen ig ON sg.id_inspection_gen = ig.id_inspection_gen
      JOIN vehicules v ON v.id_vehicule = ig.id_vehicule
      JOIN cat_vehicule cv ON v.id_cat_vehicule = cv.id_cat_vehicule
      WHERE sg.est_supprime = 0
      GROUP BY v.id_cat_vehicule
      ORDER BY cout_total DESC;
            `;

    // Coût par type de panne
    const coutParTypePanneQuery = `
      SELECT sg.id_type_reparation, tr.type_rep,
        SUM(iv.cout) AS cout_total,
        COUNT(*) AS nb_interventions
      FROM inspection_valide iv
      JOIN sub_inspection_gen sg ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
      JOIN type_reparations tr ON sg.id_type_reparation = tr.id_type_reparation
      WHERE sg.est_supprime = 0
      GROUP BY sg.id_type_reparation
      ORDER BY cout_total DESC;
    `;

    //Top 10 véhicules par coût cumulé
    const topVehiculesQuery = `
            SELECT v.id_vehicule, v.immatriculation, m.nom_marque,
             SUM(iv.cout) AS cout_cumule,
             COUNT(*) AS nb_interventions
      FROM inspection_valide iv
      JOIN sub_inspection_gen sg ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
      JOIN inspection_gen ig ON sg.id_inspection_gen = ig.id_inspection_gen
      JOIN vehicules v ON ig.id_vehicule = v.id_vehicule
      JOIN marque m ON v.id_marque = m.id_marque
      WHERE sg.est_supprime = 0
      GROUP BY v.id_vehicule
      ORDER BY cout_cumule DESC
      LIMIT 10;
    `;

    //Coût moyen par intervention
    const coutMoyenQuery = `
      SELECT ROUND(SUM(iv.cout) / COUNT(iv.id_inspection_valide), 2) AS cout_moyen_par_intervention
      FROM inspection_valide iv
      JOIN sub_inspection_gen sg ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
      WHERE sg.est_supprime = 0;
    `;

    // Répartition pièces vs main-d’œuvre
    const repartitionQuery = `
    SELECT 
        ROUND(SUM(iv.cout) / SUM(iv.cout + iv.manoeuvre) * 100, 2) AS pct_pieces,
        ROUND(SUM(iv.manoeuvre) / SUM(iv.cout + iv.manoeuvre) * 100, 2) AS pct_manoeuvre
    FROM inspection_valide iv
    JOIN sub_inspection_gen sg ON sg.id_sub_inspection_gen = iv.id_sub_inspection_gen
    WHERE sg.est_supprime = 0;
    `;

    // Exécution parallèle des requêtes
    const [
      coutTotalResult,
      coutParTypeVehicule,
      coutParTypePanne,
      topVehicules,
      coutMoyenResult,
      repartitionResult
    ] = await Promise.all([
      query(coutTotalQuery),
      query(coutParTypeVehiculeQuery),
      query(coutParTypePanneQuery),
      query(topVehiculesQuery),
      query(coutMoyenQuery),
      query(repartitionQuery)
    ]);

    const result = {
      cout_total_usd: parseFloat(coutTotalResult[0]?.cout_total_usd || 0),
      cout_par_type_vehicule: coutParTypeVehicule || [],
      cout_par_type_panne: coutParTypePanne || [],
      top_10_vehicules_cout: topVehicules || [],
      cout_moyen_par_intervention: parseFloat(coutMoyenResult[0]?.cout_moyen_par_intervention || 0),
      repartition_pieces_manoeuvre: repartitionResult[0] || { pct_pieces: 0, pct_manoeuvre: 0 }
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données.' });
  }
};

//Performance maintenance (délais & disponibilité)
exports.getRapportPerformanceDelais = async (req, res) => {
  try {
    // MTTR par véhicule
    const mttrVehiculeQuery = `
      SELECT 
        r.id_vehicule, v.immatriculation, m.nom_marque,
        AVG(DATEDIFF(sr.date_sortie, sr.created_at)) AS MTTR_jours
      FROM sud_reparation sr
      JOIN reparations r ON r.id_reparation = sr.id_reparation
      JOIN vehicules v ON v.id_vehicule = r.id_vehicule
      JOIN marque m ON v.id_marque = m.id_marque
      WHERE sr.created_at IS NOT NULL AND sr.est_supprime = 0
      GROUP BY r.id_vehicule
    `;

    // Downtime total
    const downtimeQuery = `
     SELECT SUM(TIMESTAMPDIFF(HOUR, sr.created_at, sr.date_sortie)) AS downtime_total_heures
      FROM sud_reparation sr
      WHERE sr.date_reparation IS NOT NULL AND sr.est_supprime = 0
    `;

    // Respect des SLA
    const slaQuery = `
      SELECT 
        100 * SUM(CASE WHEN sr.date_sortie <= r.date_prevu THEN 1 ELSE 0 END) / COUNT(*) AS respect_sla_pct
      FROM sud_reparation sr
      JOIN reparations r ON r.id_reparation = sr.id_reparation
      WHERE sr.date_sortie IS NOT NULL AND sr.est_supprime = 0
    `;

    //Réparations rapides < 24h
    const rapidesQuery = `
      SELECT 
        100 * SUM(CASE WHEN TIMESTAMPDIFF(HOUR, sr.created_at, sr.date_sortie) < 24 THEN 1 ELSE 0 END) / COUNT(*) AS reparations_rapides_pct
      FROM sud_reparation sr
      WHERE sr.date_sortie IS NOT NULL AND sr.est_supprime = 0
    `;

    // Taux de réouverture ≤ 30 jours
    const reouvertureQuery = `
     SELECT 
        100 * SUM(CASE WHEN DATEDIFF(sr2.created_at, sr1.date_sortie) <= 30 THEN 1 ELSE 0 END) / COUNT(*) AS taux_reouverture_pct
      FROM sud_reparation sr1
      JOIN sud_reparation sr2 
        ON sr1.id_reparation = sr2.id_reparation
        AND sr1.id_type_reparation = sr2.id_type_reparation
        AND sr2.created_at > sr1.date_sortie
      WHERE sr1.est_supprime = 0 AND sr2.est_supprime = 0
    `;

    // Exécution de toutes les requêtes en parallèle
    const [
      mttrVehicule,
      downtimeResult,
      slaResult,
      rapidesResult,
      reouvertureResult
    ] = await Promise.all([
      query(mttrVehiculeQuery),
      query(downtimeQuery),
      query(slaQuery),
      query(rapidesQuery),
      query(reouvertureQuery)
    ]);

    // Calcul disponibilité (%)
/*     const debutPeriode = new Date('2025-08-01');
    const finPeriode = new Date('2025-08-31');
    const heuresTotales = ((finPeriode - debutPeriode) / (1000*60*60)); // heures totales dans la période
    const downtimeTotal = downtimeResult[0].downtime_total_heures || 0;
    const disponibilitePct = ((1 - downtimeTotal / heuresTotales) * 100).toFixed(2);
 */
    res.json({
      mttrVehicule,
      downtimeResult,
      respectSlaPct: slaResult[0].respect_sla_pct,
      reparationsRapidesPct: rapidesResult[0].reparations_rapides_pct,
      tauxReouverturePct: reouvertureResult[0].taux_reouverture_pct
    });

  } catch (error) {
    console.error('Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des données.' });
  }
};

//Kiosque
/* exports.getRapportKiosque = async (req, res) => {
  try {
    const AnomaliesDuJour = `
      SELECT 
        SUM(CASE WHEN v.id_validation_demande IS NULL THEN 1 ELSE 0 END) AS nb_depart_non_valide,
        SUM(CASE WHEN b.retour_time IS NOT NULL AND b.retour_time > b.date_retour THEN 1 ELSE 0 END) AS nb_retour_en_retard
      FROM bande_sortie b
      LEFT JOIN validation_demande v 
          ON b.id_bande_sortie = v.id_bande_sortie
      WHERE b.est_supprime = 0;
    `;

    const evenementLive = `
      SELECT bs.id_bande_sortie, 
        d.nom_destination, 
        v.immatriculation, 
        bs.sortie_time, 
        stbs.nom_statut_bs 
      FROM bande_sortie bs
        INNER JOIN destination d ON bs.id_destination = d.id_destination
        INNER JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
        INNER JOIN statut_bs stbs ON bs.statut = stbs.id_statut_bs
      WHERE bs.sortie_time IS NOT NULL AND bs.statut = 5
    `;

    const departHorsTiming = `
        SELECT 
          b.id_bande_sortie,
          v.immatriculation,
          c.nom AS nom_chauffeur,
          sd.nom_service,
          d.nom_destination,
          b.date_prevue,
          b.sortie_time,
          b.retour_time,
          CASE
              WHEN b.sortie_time IS NULL AND b.date_prevue < NOW() THEN 'Départ non effectué à temps'
              WHEN b.sortie_time > b.date_prevue THEN 'Départ en retard'
              ELSE 'OK'
          END AS statut_sortie
        FROM bande_sortie b
        INNER JOIN vehicules v ON b.id_vehicule = v.id_vehicule
        INNER JOIN chauffeurs c ON b.id_chauffeur = c.id_chauffeur
        INNER JOIN service_demandeur sd ON b.id_demandeur = sd.id_service_demandeur
        INNER JOIN destination d ON b.id_destination = d.id_destination
        WHERE b.est_supprime = 0
          AND (
              b.sortie_time IS NULL AND b.date_prevue < NOW()
              OR b.sortie_time > b.date_prevue
          );
    `;

    const ponctualiteSql = `
      SELECT
        ROUND(
            100 * SUM(CASE WHEN b.sortie_time IS NOT NULL AND b.sortie_time <= b.date_prevue THEN 1 ELSE 0 END) /
            NULLIF(COUNT(b.id_bande_sortie), 0), 2
        ) AS ponctualite_depart,
        ROUND(
            100 * SUM(CASE WHEN b.retour_time IS NOT NULL AND b.retour_time <= b.date_retour THEN 1 ELSE 0 END) /
            NULLIF(COUNT(b.id_bande_sortie), 0), 2
        ) AS ponctualite_retour,
        ROUND(
            100 * SUM(CASE WHEN b.sortie_time IS NOT NULL THEN 1 ELSE 0 END) /
            NULLIF(COUNT(DISTINCT b.id_vehicule), 0), 2
        ) AS utilisation_parc
      FROM bande_sortie b
      WHERE b.est_supprime = 0;
    `;

    const courseVehiculeSql = `
      SELECT COUNT(id_vehicule) AS nbre_course, c.nom, c.prenom 
      FROM bande_sortie bs 
      INNER JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
      GROUP BY bs.id_vehicule
      ORDER BY nbre_course DESC
    `;

    const courseServiceSql = `
      SELECT sd.nom_service, COUNT(DISTINCT bs.id_bande_sortie) AS nbre_service 
      FROM bande_sortie bs
      INNER JOIN service_demandeur sd ON bs.id_demandeur = sd.id_service_demandeur
      GROUP BY bs.id_demandeur
      ORDER BY nbre_service DESC
    `;

    const miniTendanceSql = `
      SELECT
        ROUND(
            100 * SUM(CASE WHEN b.sortie_time IS NOT NULL AND b.sortie_time <= b.date_prevue THEN 1 ELSE 0 END) 
            / NULLIF(COUNT(b.id_bande_sortie), 0), 2
        ) AS ponctualite_depart,
        ROUND(
            100 * SUM(CASE WHEN b.retour_time IS NOT NULL AND b.retour_time <= b.date_retour THEN 1 ELSE 0 END) 
            / NULLIF(COUNT(b.id_bande_sortie), 0), 2
        ) AS ponctualite_retour,
        ROUND(
            100 * COUNT(DISTINCT CASE WHEN b.sortie_time IS NOT NULL THEN b.id_vehicule END) 
            / NULLIF(COUNT(DISTINCT b.id_vehicule), 0), 2
        ) AS utilisation_parc
      FROM bande_sortie b
      WHERE b.est_supprime = 0;
    `;

    // Exécution en parallèle
    const [
      [anomalies],
      evenementLiveRows,
      departHorsTimingRows,
      [ponctualite],
      courseVehiculeRows,
      courseServiceRows,
      [miniTendances]
    ] = await Promise.all([
      query(AnomaliesDuJour),
      query(evenementLive),
      query(departHorsTiming),
      query(ponctualiteSql),
      query(courseVehiculeSql),
      query(courseServiceSql),
      query(miniTendanceSql)
    ]);

    res.json({
      anomalies,
      evenementLive: evenementLiveRows,
      departHorsTiming: departHorsTimingRows,
      ponctualite,
      courseVehicule: courseVehiculeRows,
      courseService: courseServiceRows,
      miniTendances
    });

  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
  }
}; */


exports.getRapportKiosque = async (req, res) => {
  try {
    // 1️⃣ Anomalies du jour
    const anomaliesSql = `
      SELECT 
        SUM(CASE WHEN v.id_validation_demande IS NULL THEN 1 ELSE 0 END) AS depart_non_valide,
        SUM(CASE WHEN b.sortie_time > b.date_prevue THEN 1 ELSE 0 END) AS depart_en_retard,
        SUM(CASE WHEN b.retour_time IS NOT NULL AND b.retour_time > b.date_retour THEN 1 ELSE 0 END) AS retour_en_retard,
        SUM(CASE WHEN b.retour_time IS NULL AND b.sortie_time IS NOT NULL AND b.date_retour < NOW() THEN 1 ELSE 0 END) AS retour_non_apparie
      FROM bande_sortie b
      LEFT JOIN validation_demande v ON b.id_bande_sortie = v.id_bande_sortie
      WHERE b.est_supprime = 0;
    `;

    // 2️⃣ Événements live (véhicules dehors ou réservés)
    const evenementLiveSql = `
      SELECT 
        bs.id_bande_sortie,
        d.nom_destination,
        v.immatriculation,
        bs.sortie_time,
        stbs.nom_statut_bs
      FROM bande_sortie bs
      INNER JOIN destination d ON bs.id_destination = d.id_destination
      INNER JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      INNER JOIN statut_bs stbs ON bs.statut = stbs.id_statut_bs
      WHERE bs.sortie_time IS NOT NULL AND bs.statut = 5
      ORDER BY bs.sortie_time DESC
    `;

    // 3️⃣ Départs hors timing
    const departHorsTimingSql = `
      SELECT 
        b.id_bande_sortie,
        v.immatriculation,
        c.nom AS nom_chauffeur,
        sd.nom_service,
        d.nom_destination,
        b.date_prevue,
        b.sortie_time,
        b.retour_time,
        CASE
          WHEN b.sortie_time IS NULL AND b.date_prevue < NOW() THEN 'Départ non effectué à temps'
          WHEN b.sortie_time > b.date_prevue THEN 'Départ en retard'
          ELSE 'OK'
        END AS statut_sortie
      FROM bande_sortie b
      INNER JOIN vehicules v ON b.id_vehicule = v.id_vehicule
      INNER JOIN chauffeurs c ON b.id_chauffeur = c.id_chauffeur
      INNER JOIN service_demandeur sd ON b.id_demandeur = sd.id_service_demandeur
      INNER JOIN destination d ON b.id_destination = d.id_destination
      WHERE b.est_supprime = 0
        AND (
          b.sortie_time IS NULL AND b.date_prevue < NOW()
          OR b.sortie_time > b.date_prevue
        )
      ORDER BY b.created_at DESC;
    `;

    // 4️⃣ Ponctualité départ / retour et utilisation parc
    const ponctualiteSql = `
      SELECT
        ROUND(100 * SUM(CASE WHEN b.sortie_time IS NOT NULL AND b.sortie_time <= b.date_prevue THEN 1 ELSE 0 END) / NULLIF(COUNT(b.id_bande_sortie), 0), 2) AS ponctualite_depart,
        ROUND(100 * SUM(CASE WHEN b.retour_time IS NOT NULL AND b.retour_time <= b.date_retour THEN 1 ELSE 0 END) / NULLIF(COUNT(b.id_bande_sortie), 0), 2) AS ponctualite_retour,
        ROUND(100 * COUNT(DISTINCT CASE WHEN b.sortie_time IS NOT NULL THEN b.id_vehicule END) / NULLIF(COUNT(DISTINCT b.id_vehicule), 0), 2) AS utilisation_parc
      FROM bande_sortie b
      WHERE b.est_supprime = 0;
    `;

    // 5️⃣ Courses par chauffeur (aujourd’hui)
    const courseChauffeurSql = `
      SELECT 
        c.id_chauffeur,
        CONCAT(c.nom, ' ', c.prenom) AS chauffeur,
        COUNT(bs.id_bande_sortie) AS courses
      FROM bande_sortie bs
      INNER JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
      WHERE DATE(bs.sortie_time) = CURDATE()
      GROUP BY c.id_chauffeur
      ORDER BY courses DESC;
    `;

    // 6️⃣ Leaderboard par service
    const courseServiceSql = `
      SELECT 
        sd.nom_service,
        COUNT(DISTINCT bs.id_bande_sortie) AS nbre_service
      FROM bande_sortie bs
      INNER JOIN service_demandeur sd ON bs.id_demandeur = sd.id_service_demandeur
      WHERE bs.est_supprime = 0
      GROUP BY sd.nom_service
      ORDER BY nbre_service DESC;
    `;

    //7 HORS TIME
    const départsHorsTimingCompletSql = `
      SELECT 
    b.id_bande_sortie,
    v.immatriculation AS vehicule,
    c.nom AS chauffeur,
    sd.nom_service AS service,
    d.nom_destination AS destination,
    b.date_prevue AS depart_prevu,
    b.sortie_time AS depart_reel,
    b.date_retour AS retour_prevu,
    b.retour_time AS retour_reel,

    -- Statut sortie
    CASE
        WHEN b.sortie_time IS NULL AND b.date_prevue < NOW() THEN 'En attente'
        WHEN b.sortie_time > b.date_prevue THEN 'En retard'
        WHEN b.retour_time IS NOT NULL AND b.retour_time > b.date_retour THEN 'Retard retour'
        ELSE 'Validé'
    END AS statut,

    -- Retard (Hors timing avec tolérance 10 min par ex.)
    CASE
        WHEN b.sortie_time IS NOT NULL 
             AND TIMESTAMPDIFF(MINUTE, b.date_prevue, b.sortie_time) > 10
        THEN CONCAT('Hors timing (+', TIMESTAMPDIFF(MINUTE, b.date_prevue, b.sortie_time), ' min)')
        ELSE NULL
    END AS retard_info,

    -- Validations (agrégées par rôle)
    MAX(CASE WHEN u.role = 'RS' THEN '✔' ELSE '' END) AS resp_validation,
    MAX(CASE WHEN u.role = 'Admin' THEN '✔' ELSE '' END) AS dirlog_validation,
    MAX(CASE WHEN u.role = 'RH' THEN '✔' ELSE '' END) AS rh_validation

FROM bande_sortie b
INNER JOIN vehicules v ON b.id_vehicule = v.id_vehicule
INNER JOIN chauffeurs c ON b.id_chauffeur = c.id_chauffeur
INNER JOIN service_demandeur sd ON b.id_demandeur = sd.id_service_demandeur
INNER JOIN destination d ON b.id_destination = d.id_destination

-- Jointure validations
LEFT JOIN validation_demande vd ON b.id_bande_sortie = vd.id_bande_sortie
LEFT JOIN utilisateur u ON vd.validateur_id = u.id_utilisateur

WHERE b.est_supprime = 0
  AND (
      (b.sortie_time IS NULL AND b.date_prevue < NOW())
      OR b.sortie_time > b.date_prevue
      OR (b.retour_time IS NOT NULL AND b.retour_time > b.date_retour)
  )

GROUP BY 
    b.id_bande_sortie, v.immatriculation, c.nom, sd.nom_service, d.nom_destination,
    b.date_prevue, b.sortie_time, b.date_retour, b.retour_time
ORDER BY b.created_at DESC;
    `;

    // ✅ Exécution parallèle
    const [
      [anomalies],
      evenementLiveRows,
      departHorsTimingRows,
      [ponctualite],
      courseChauffeurRows,
      courseServiceRows,
      departHorsTimingCompletRows
    ] = await Promise.all([
      query(anomaliesSql),
      query(evenementLiveSql),
      query(departHorsTimingSql),
      query(ponctualiteSql),
      query(courseChauffeurSql),
      query(courseServiceSql),
      query(départsHorsTimingCompletSql)
    ]);

    // 7️⃣ Fonction pour badge selon seuil
    const getBadge = (value) => {
      if (value >= 90) return "✔";
      if (value >= 80) return "!";
      return "✖";
    };

    // Ajout des badges aux courses chauffeurs
    const courseChauffeurWithBadge = courseChauffeurRows.map(chauffeur => ({
      ...chauffeur,
      badge: chauffeur.courses >= 4 ? "Surcharge" : null
    }));

    res.json({
      anomalies,
      evenementLive: evenementLiveRows,
      departHorsTiming: departHorsTimingRows,
      ponctualite: {
        depart: ponctualite.ponctualite_depart,
        departBadge: getBadge(ponctualite.ponctualite_depart),
        retour: ponctualite.ponctualite_retour,
        retourBadge: getBadge(ponctualite.ponctualite_retour),
        tolérance: 10
      },
      utilisationParc: {
        pourcentage: ponctualite.utilisation_parc
      },
      courseChauffeur: courseChauffeurWithBadge,
      courseService: courseServiceRows,
      departHorsTimingCompletRows,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error("Erreur serveur:", error);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
  }
};
