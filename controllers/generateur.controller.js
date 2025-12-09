const { db } = require("./../config/database");
const { promisify } = require("util");
const query = promisify(db.query).bind(db);

//Type des Générateurs
exports.getTypeGenerateur = (req, res) => {
  const query = `SELECT * FROM type_generateur`;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Erreur lors de la récupération des types de générateur :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de la récupération des types de générateur."
      });
    }

    return res.status(200).json(results);
  });
};

exports.postTypeGenerateur = (req, res) => {
  const { nom_type_gen } = req.body;

  if (!nom_type_gen || nom_type_gen.trim() === "") {
    return res.status(400).json({ message: "Le nom du type de générateur est requis." });
  }

  const query = `INSERT INTO type_generateur (nom_type_gen) VALUES (?)`;
  const values = [nom_type_gen];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l’insertion du type de générateur :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "Le type de générateur a été enregistré avec succès.",
      insertedId: result.insertId
    });
  });
};

//Marque generateur
exports.getMarqueGenerateur = (req,res) => {
    const q = `SELECT * FROM marque_generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.postMarqueGenerateur = (req, res) => {
  const { nom_marque } = req.body;

  // Validation
  if (!nom_marque || nom_marque.trim() === "") {
    return res.status(400).json({ message: "Le nom de la marque est requis." });
  }

  const query = `INSERT INTO marque_generateur (nom_marque) VALUES (?)`;
  const values = [nom_marque.trim()];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l'insertion de la marque :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "La marque a été enregistrée avec succès.",
      insertedId: result.insertId
    });
  });
};

//Modele generateur
exports.getModeleGenerateur = (req,res) => {
    const q = `SELECT * FROM modele_generateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.getModeleGenerateurOne = (req,res) => {
    const {id_marque_generateur} = req.query;

    if(!id_marque_generateur) {
        res.status(400).json({message: "Veuillez entrer l'id marque"})
    }

    const q = `SELECT * FROM modele_generateur WHERE id_marque_generateur = ?`;

    db.query(q, [id_marque_generateur], (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data)
    })
};

exports.postModeleGenerateur = (req, res) => {
  const { nom_modele, id_marque_generateur } = req.body;
  console.log(req.body)

  // Validation
  if (!nom_modele || nom_modele === "") {
    return res.status(400).json({ message: "Le nom du modèle est requis." });
  }

  const query = `INSERT INTO modele_generateur (nom_modele, id_marque_generateur) VALUES (?,?)`;
  const values = [nom_modele.trim(), id_marque_generateur];

  db.query(query, values, (error, result) => {
    if (error) {
      console.error("Erreur lors de l'insertion de la marque :", error);
      return res.status(500).json({
        message: "Une erreur est survenue lors de l’enregistrement.",
      });
    }

    return res.status(201).json({
      message: "Le modèle a été enregistré avec succès.",
      insertedId: result.insertId
    });
  });
};

//Refroidissement
exports.getRefroidissement = (req, res) => {
    const q = `SELECT * FROM refroidissement`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

//Générateur
exports.getGenerateur = (req, res) => {
    const q = `SELECT 
                g.id_generateur, 
                g.code_groupe, 
                g.num_serie, 
                g.puissance, 
                g.reservoir, 
                g.valeur_acquisition, 
                g.dimension, 
                g.poids, 
                g.longueur, 
                g.largeur, 
                g.annee_fabrication, 
                g.annee_service, 
                g.img, 
                g.capacite_radiateur, 
                g.frequence, 
                g.cos_phi, 
                g.nbre_cylindre, 
                g.tension, 
                g.frequence, 
                g.id_carburant_vehicule,
                mog.nom_modele, 
                mg.nom_marque, 
                dc.nom_disposition, 
                tc.nom_type_carburant, 
                r.nom_refroidissement, 
                tg.nom_type_gen, 
                u.nom AS user_cr 
            FROM generateur g 
                LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
                LEFT JOIN marque_generateur mg ON mog.id_marque_generateur = mg.id_marque_generateur
                LEFT JOIN disposition_cylindre dc ON g.disposition_cylindre = dc.id_disposition_cylindre
                LEFT JOIN type_carburant tc ON g.id_type_carburant = tc.id_type_carburant
                LEFT JOIN refroidissement r ON g.refroidissement = r.id_refroidissement
                LEFT JOIN type_generateur tg ON g.id_type_gen = tg.id_type_generateur
                LEFT JOIN utilisateur u ON g.user_cr = u.id_utilisateur`;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.getGenerateurOne = (req, res) => {
    const { id_generateur } = req.query;

    if(!id_generateur) {
        res.status(400).json({message: 'Paramètres manquants.'})
    }

    const q = `SELECT g.*, mog.nom_modele, mag.nom_marque, tg.nom_type_gen, tc.nom_type_carburant, r.nom_refroidissement FROM generateur g
                LEFT JOIN modele_generateur mog ON g.id_modele = g.id_modele
                LEFT JOIN marque_generateur mag ON mog.id_marque_generateur = mag.id_marque_generateur
                LEFT JOIN type_generateur tg ON g.id_type_gen = tg.nom_type_gen
                LEFT JOIN type_carburant tc ON g.id_type_carburant = tc.id_type_carburant
                LEFT JOIN refroidissement r ON g.refroidissement = r.id_refroidissement 
                WHERE id_generateur = ?`;

    db.query(q, [id_generateur], (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.postGenerateur = async (req, res) => {
    try {
        const {
            code_groupe,
            id_type_gen,
            id_modele,
            num_serie,
            puissance,
            reservoir,
            valeur_acquisition,
            dimension,
            longueur,
            largeur,
            poids,
            annee_fabrication,
            annee_service,
            id_type_carburant,
            refroidissement,
            puissance_sec,
            capacite_radiateur,
            frequence,
            cos_phi,
            nbre_cylindre,
            tension,
            type_lubrifiant,
            puissance_acc,
            pression_acc,
            capacite_carter,
            regime_moteur,
            consommation_carburant,
            demarrage,
            nbr_phase,
            disposition_cylindre,
            user_cr
        } = req.body;

        console.log(req.body)

        // Vérification des champs obligatoires
        if (!id_modele || !puissance || !id_type_gen ) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires pour la logistique."
            });
        }

        let img = null;
        if (req.files && req.files.length > 0) {
            img = req.files.map(file => file.path.replace(/\\/g, "/")).join(",");
        }

        const values = [
            code_groupe,
            id_type_gen,
            id_modele,
            num_serie,
            puissance,
            reservoir,
            valeur_acquisition,
            dimension,
            longueur,
            largeur,
            poids,
            annee_fabrication,
            annee_service,
            img,
            id_type_carburant,
            refroidissement,
            puissance_sec,
            capacite_radiateur,
            frequence,
            cos_phi,
            nbre_cylindre,
            tension,
            type_lubrifiant,
            puissance_acc,
            pression_acc,
            capacite_carter,
            regime_moteur,
            consommation_carburant,
            demarrage,
            nbr_phase,
            disposition_cylindre,
            user_cr
        ];

        const q = `
            INSERT INTO generateur (
                code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir, valeur_acquisition,
                dimension, longueur, largeur, poids,annee_fabrication, annee_service, img,
                id_type_carburant, refroidissement, puissance_sec, capacite_radiateur, frequence, cos_phi,
                nbre_cylindre, tension, type_lubrifiant, puissance_acc, pression_acc, capacite_carter,
                regime_moteur, consommation_carburant, demarrage, nbr_phase, disposition_cylindre, user_cr
            )
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `;

        db.query(q, values, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Erreur serveur lors de l'ajout du générateur." });
            }

            res.status(201).json({
                message: "Générateur ajouté avec succès dans le système logistique (volume calculé automatiquement)."
            });
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};

exports.updateGenerateur = async (req, res) => {
    try {
        const {
            id_generateur,
            code_groupe,
            id_type_gen,
            id_modele,
            num_serie,
            puissance,
            reservoir,
            valeur_acquisition,
            dimension,
            longueur,
            largeur,
            poids,
            annee_fabrication,
            annee_service,
            id_type_carburant,
            refroidissement,
            puissance_sec,
            capacite_radiateur,
            frequence,
            cos_phi,
            nbre_cylindre,
            tension,
            type_lubrifiant,
            puissance_acc,
            pression_acc,
            capacite_carter,
            regime_moteur,
            consommation_carburant,
            demarrage,
            nbr_phase,
            disposition_cylindre,
            user_cr
        } = req.body;

        if (!id_generateur) {
            return res.status(400).json({ message: "ID générateur manquant." });
        }

        if (!id_modele || !puissance || !id_type_gen) {
            return res.status(400).json({
                message: "Veuillez remplir tous les champs obligatoires pour la logistique."
            });
        }

        // -------------------------
        // 🔥 Correction principale : pas de db.promise() avec mysql
        // -------------------------
        const getImgQuery = "SELECT img FROM generateur WHERE id_generateur = ?";

        const rows = await new Promise((resolve, reject) => {
            db.query(getImgQuery, [id_generateur], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        let oldImage = rows.length > 0 ? rows[0].img : null;

        // Nouveau upload ?
        let img = oldImage;
        if (req.files && req.files.length > 0) {
            img = req.files.map(file => file.path.replace(/\\/g, "/")).join(",");
        }

        const q = `
            UPDATE generateur SET
                code_groupe = ?, id_type_gen = ?, id_modele = ?, num_serie = ?, puissance = ?, reservoir = ?, 
                valeur_acquisition = ?, dimension = ?, longueur = ?, largeur = ?, poids = ?, 
                annee_fabrication = ?, annee_service = ?, img = ?, id_type_carburant = ?, 
                refroidissement = ?, puissance_sec = ?, capacite_radiateur = ?, frequence = ?, 
                cos_phi = ?, nbre_cylindre = ?, tension = ?, type_lubrifiant = ?, puissance_acc = ?, 
                pression_acc = ?, capacite_carter = ?, regime_moteur = ?, consommation_carburant = ?, 
                demarrage = ?, nbr_phase = ?, disposition_cylindre = ?, user_cr = ?
            WHERE id_generateur = ?
        `;

        const values = [
            code_groupe, id_type_gen, id_modele, num_serie, puissance, reservoir,
            valeur_acquisition, dimension, longueur, largeur, poids, annee_fabrication,
            annee_service, img, id_type_carburant, refroidissement, puissance_sec,
            capacite_radiateur, frequence, cos_phi, nbre_cylindre, tension, type_lubrifiant,
            puissance_acc, pression_acc, capacite_carter, regime_moteur, consommation_carburant,
            demarrage, nbr_phase, disposition_cylindre, user_cr, id_generateur
        ];

        db.query(q, values, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    message: "Erreur serveur lors de la mise à jour du générateur."
                });
            }

            res.status(200).json({
                message: "Générateur mis à jour avec succès."
            });
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};


//Relier générateur à un fichier excel
exports.putRelierGenerateurFichierExcel = async (req, res) => {
  try {
    const { id_generateur } = req.query;
    const { id_enregistrement } = req.body;

    if (!id_generateur || !id_enregistrement) {
      return res.status(400).json({ message: "Paramètres manquants (id_vehicule ou id_capteur)." });
    }

    // 1️. Supprimer l'ancien lien avec ce capteur
    const q1 = "UPDATE generateur SET id_carburant_vehicule = NULL WHERE id_carburant_vehicule = ?";
    await new Promise((resolve, reject) => {
      db.query(q1, [id_enregistrement], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2️. Lier le nouveau véhicule
    const q2 = "UPDATE generateur SET id_carburant_vehicule = ? WHERE id_generateur = ?";
    await new Promise((resolve, reject) => {
      db.query(q2, [id_enregistrement, id_generateur], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    return res.status(200).json({ message: "Générateur relié/mis à jour avec succès." });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    return res.status(500).json({ message: "Erreur inattendue côté serveur." });
  }
};

//PLein generateur
exports.getPleinGenerateur = (req, res) => {
    const q = `SELECT p.*, 
                    g.code_groupe,
                    mog.nom_modele, 
                    mg.nom_marque,
                    u.nom AS createur,
                    tg.nom_type_gen,
                    tc.nom_type_carburant,
                    f.nom_fournisseur
                FROM plein_generateur p 
                    LEFT JOIN generateur g ON p.id_generateur = g.id_generateur
                    LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
                    LEFT JOIN marque_generateur mg ON mog.id_marque_generateur = mg.id_marque_generateur
                    LEFT JOIN utilisateur u ON p.user_cr = u.id_utilisateur
                    LEFT JOIN type_generateur tg ON g.id_type_gen = tg.id_type_generateur
                    LEFT JOIN type_carburant tc ON g.id_type_carburant = tc.id_type_carburant
                    LEFT JOIN fournisseur f ON p.id_fournisseur = f.id_fournisseur
                WHERE p.est_supprime = 0
                ORDER BY p.date_operation DESC
            `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    })
};

exports.getPleinGenerateurLimitTen = (req, res) => {
    const q = `SELECT p.*, 
                    g.code_groupe,
                    mog.nom_modele, 
                    mg.nom_marque,
                    u.nom AS createur
                FROM plein_generateur p 
                    LEFT JOIN generateur g ON p.id_generateur = g.id_generateur
                    LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
                    LEFT JOIN marque_generateur mg ON mog.id_marque_generateur = mg.id_marque_generateur
                    LEFT JOIN utilisateur u ON p.user_cr = u.id_utilisateur
                WHERE p.est_supprime = 0
                ORDER BY p.created_at DESC
                LIMIT 10
            `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    })
};

exports.getPleinGenerateurOne = (req, res) => {
    const { id_plein_generateur } = req.query;

    if(id_plein_generateur) {
        res.status(400).json({ message : 'Paramètres manquants.'})
    }

    const q = `SELECT * FROM plein_generateur WHERE id_plein_generateur = ?`;

    db.query(q, [id_plein_generateur], (error, data) => {
        if(error) {
            return res.status(500).send(error)
        }
        return res.status(200).json(data);
    })
};

exports.postPleinGenerateur = async (req, res) => {
    const { 
        id_generateur, 
        quantite_litres, 
        id_type_carburant, 
        date_operation, 
        id_fournisseur,
        user_cr, 
        commentaire 
    } = req.body;

    try {
        // 1️⃣ Validation des champs obligatoires
        if (!quantite_litres || !id_type_carburant || !id_generateur || !date_operation) {
            return res.status(400).json({ 
                error: "Les champs quantite_litres, id_type_carburant, id_generateur et date_operation sont obligatoires." 
            });
        }

        // 2️⃣ Récupérer le prix carburant le plus récent
        const priceResult = await query(`
            SELECT prix_cdf, taux_usd
            FROM prix_carburant
            WHERE id_type_carburant = ?
            ORDER BY date_effective DESC, id_prix_carburant DESC
            LIMIT 1
        `, [id_type_carburant]);

        if (priceResult.length === 0) {
            return res.status(404).json({
                error: "Aucun prix carburant trouvé pour ce type."
            });
        }

        const { prix_cdf, taux_usd } = priceResult[0];

        // 3️⃣ Calcul des montants
        const montant_total_cdf = quantite_litres * prix_cdf;
        const montant_total_usd = parseFloat((montant_total_cdf / taux_usd).toFixed(2));

        // 4️⃣ Préparation des valeurs pour l’insert
        const values = [
            id_generateur,
            quantite_litres,
            id_type_carburant,
            date_operation,
            id_fournisseur,
            user_cr,
            commentaire || null,
            montant_total_cdf,
            montant_total_usd
        ];

        // 5️⃣ Insertion dans la base de données
        const q = `
            INSERT INTO plein_generateur(
                id_generateur, quantite_litres, 
                id_type_carburant, date_operation, 
                user_cr, id_fournisseur, commentaire, 
                montant_total_cdf, montant_total_usd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(q, values, (error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ 
                    message: "Erreur serveur lors de l'ajout du plein générateur." 
                });
            }

            res.status(201).json({
                message: "Plein générateur ajouté avec succès (montant calculé automatiquement).",
                montant_total_cdf,
                montant_total_usd
            });
        });

    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};

exports.putPleinGenerateur = async(req, res) => {
    const { 
        id_generateur, 
        quantite_litres, 
        id_type_carburant, 
        date_operation, 
        user_cr, 
        commentaire,
        id_plein_generateur 
    } = req.body;

    try {

        if (!id_plein_generateur) {
            return res.status(400).json({ message: "ID plein manquant." });
        }

        if (!quantite_litres || !id_type_carburant || !id_generateur || !date_operation ) {
            res.status(400).json({ error: "Les champs quantite_litres, type_carburant, generateur et date d'operation "})
        }

        const q = `
        UPDATE plein_generateur SET 
            id_generateur = ?, quantite_litres = ?, 
            id_type_carburant = ?, date_operation = ?, 
            user_cr = ?, commentaire = ?
        WHERE id_plein_generateur  = ?
            `;

        const values = [
            id_generateur, 
            quantite_litres, 
            id_type_carburant, 
            date_operation, 
            user_cr, 
            commentaire,
            id_plein_generateur 
        ];

        db.query(q,values, (error) => {
            if(error) {
                console.error(error)
                return res.status(500).json({ message: "Erreur serveur lors de l'ajout du plein générateur."})
            }
            res.status(201).json({
                message: "Plein générateur a été modifié avec succès dans le système logistique (volume calculé automatiquement)."
            });
        })

    } catch (error) {
        console.error("Erreur lors de l'ajout :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};

exports.deletePleinGen = async(req, res) => {
    const { id_plein_generateur } = req.query;

    try {
        if(!id_plein_generateur) {
            res.status(400).json({ error: "id plein generateur est obligatoire"})
        }
        const q = `UPDATE plein_generateur SET est_supprime = 1 WHERE id_plein_generateur = ?`;
        db.query(q, [id_plein_generateur], (error) => {
            if(error) {
                console.error(error)
                return res.status(500).json({ message: "Erreur serveur lors de suppresion du plein générateur."})
            }
            res.status(201).json({
                message: "Plein générateur a été modifié avec succès dans le système logistique (volume calculé automatiquement)."
            });
        })
    } catch (error) {
        console.error("Erreur lors de modification :", error);
        return res.status(500).json({
            message: "Une erreur interne s'est produite."
        });
    }
};

exports.rapportGenerateurPleinAll = async(req, res) => {
    try {
        const { date_debut, date_fin} = req.query;
        if(!date_debut || !date_fin) {
            return res.status(400).json({ message :'Periode requise'})
        }

        const resume = await query(`
            SELECT 
                COUNT(*) AS total_pleins,
                SUM(pg.quantite_litres) AS total_litres,
                SUM(pg.montant_total_cdf) AS total_cdf,
                SUM(pg.montant_total_usd) AS total_usd
            FROM plein_generateur pg
            WHERE pg.date_operation BETWEEN ? AND ?
            `, [date_debut, date_fin]);

        const parGenerateur = await query(`
                SELECT 
                    g.id_generateur,
                    g.code_groupe,
                    mog.nom_modele,
                    mg.nom_marque,
                    SUM(pg.quantite_litres) AS total_litres,
                    SUM(pg.montant_total_cdf) AS total_cdf,
                    SUM(pg.montant_total_usd) AS total_usd
                FROM plein_generateur pg
                LEFT JOIN generateur g ON pg.id_generateur = g.id_generateur
                LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
                LEFT JOIN marque_generateur mg ON mog.id_marque_generateur = mg.id_marque_generateur
                WHERE pg.date_operation BETWEEN ? AND ?
                GROUP BY pg.id_generateur
                ORDER BY MAX(pg.date_operation) DESC
                `, [date_debut, date_fin]);

        const coutHebdo = await query(`
                SELECT 
                    YEARWEEK(date_operation, 1) AS semaine,
                    SUM(pg.quantite_litres) AS total_litres,
                    SUM(pg.montant_total_cdf) AS total_cdf,
                    SUM(pg.montant_total_usd) AS total_usd
                FROM plein_generateur pg
                WHERE pg.date_operation BETWEEN ? AND ?
                GROUP BY YEARWEEK(pg.date_operation, 1)
                ORDER BY semaine ASC
                `, [date_debut, date_fin]);
        
        const repartition = await query(`
            SELECT tg.nom_type_gen, SUM(pg.quantite_litres) AS total_litres 
        FROM plein_generateur pg
        LEFT JOIN generateur g ON pg.id_generateur = g.id_generateur
        LEFT JOIN type_generateur tg ON g.id_type_gen = tg.id_type_generateur
        WHERE pg.date_operation BETWEEN ? AND ?
            `, [date_debut, date_fin]);

        return res.status(200).json({
            periode: { date_debut, date_fin},
            resume: resume[0],
            graphiques : { parGenerateur, coutHebdo, repartition },
            detailGenerateurs: parGenerateur
        })
        
    } catch (error) {
        console.error('Erreur rapport générateur all :', error);
        res.status(500).json(error);
    }
}