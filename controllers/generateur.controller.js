const { db } = require("./../config/database");
const moment = require('moment');
const { promisify } = require("util");
const query = promisify(db.query).bind(db);

function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      }); 
    });
  }

const queryAsync = (query, values = []) =>
    new Promise((resolve, reject) => {
        db.query(query, values, (error, results) => {
            if (error) {
                return reject(error);
        }
        resolve(results);
    });
});


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
    try {
        const {
            marque = [],
            modele = [],
            dateRange = [],
            type = []
        } = req.query || {};

        let where = "WHERE p.est_supprime = 0";
        const params = [];

        // Filtre marque
        if (Array.isArray(marque) && marque.length > 0) {
            where += ` AND mg.id_marque_generateur IN (${marque.map(() => "?").join(",")})`;
            params.push(...marque);
        }

        // Filtre modèle
        if (Array.isArray(modele) && modele.length > 0) {
            where += ` AND mog.id_modele_generateur IN (${modele.map(() => "?").join(",")})`;
            params.push(...modele);
        }

        // Filtre Type
        if (Array.isArray(type) && type.length > 0) {
            where += ` AND tg.id_type_generateur IN (${type.map(() => "?").join(",")})`;
            params.push(...type);
        }

        // Filtre période
        if (Array.isArray(dateRange) && dateRange.length === 2) {
            where += ` AND p.date_operation BETWEEN ? AND ?`;
            params.push(
                moment(dateRange[0]).startOf("day").format("YYYY-MM-DD HH:mm:ss"),
                moment(dateRange[1]).endOf("day").format("YYYY-MM-DD HH:mm:ss")
            );
        }

        const query = `
            SELECT 
                p.id_plein_generateur,
                p.num_pc,
                p.num_facture,
                p.quantite_litres,
                p.date_operation,
                p.commentaire,
                p.prix_cdf,
                p.prix_usd,
                p.montant_total_cdf,
                p.montant_total_usd,
                g.code_groupe,
                mog.nom_modele,
                mog.id_modele_generateur,
                mg.nom_marque,
                mg.id_marque_generateur,
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
            ${where}
            ORDER BY p.date_operation DESC
        `;

        db.query(query, params, (error, data) => {
            if (error) {
                console.error("Erreur getPleinGenerateur:", error);
                return res.status(500).json({ message: "Erreur serveur" });
            }
            return res.status(200).json(data);
        });

    } catch (err) {
        console.error("Exception getPleinGenerateur:", err);
        return res.status(500).json({ message: "Erreur interne" });
    }
};

exports.getPleinGenerateurV = (req, res) => {
    const {
        marque = [],
        modele = [],
        type = [],
        dateRange = [],
        page = 1,
        pageSize = 20,
        sortField = "p.date_operation",
        sortOrder = "DESC",
    } = req.body;

    const params = [];
    let where = "WHERE p.est_supprime = 0";

    // Utilitaire pour générer les filtres IN
    const addFilter = (column, values) => {
        if (Array.isArray(values) && values.length > 0) {
            const placeholders = values.map(() => "?").join(",");
            where += ` AND ${column} IN (${placeholders})`;
            params.push(...values);
        }
    };

    // Filtres dynamiques
    addFilter("mog.id_marque_generateur", marque);
    addFilter("g.id_modele", modele);
    addFilter("g.id_type_gen", type);

    // Filtre date
    if (Array.isArray(dateRange) && dateRange.length === 2) {
        where += ` AND p.date_operation BETWEEN ? AND ?`;
        params.push(dateRange[0], dateRange[1]);
    }

    // Pagination calculée
    const offset = (page - 1) * pageSize;

    // Sécurisation du tri
    const allowedSortFields = [
        "p.date_operation",
        "p.quantite_litres",
        "p.prix_cdf",
        "p.prix_usd",
        "p.montant_total_cdf",
        "p.montant_total_usd",
        "mg.nom_marque",
        "mog.nom_modele"
    ];

    const safeSortField = allowedSortFields.includes(sortField)
        ? sortField
        : "p.date_operation";

    const safeSortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

    // Requête principale
    const query = `
        SELECT 
            p.id_plein_generateur, 
            p.num_pc, 
            p.num_facture, 
            p.quantite_litres,
            p.date_operation, 
            p.commentaire, 
            p.prix_cdf, 
            p.prix_usd, 
            p.montant_total_cdf, 
            p.montant_total_usd,
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
        ${where}
        ORDER BY ${safeSortField} ${safeSortOrder}
        LIMIT ? OFFSET ?
    `;

    // On ajoute pageSize & offset à la fin
    params.push(pageSize, offset);

    // Requête pour compter le total
    const countQuery = `
        SELECT COUNT(*) AS total
        FROM plein_generateur p 
        LEFT JOIN generateur g ON p.id_generateur = g.id_generateur
        LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
        LEFT JOIN marque_generateur mg ON mog.id_marque_generateur = mg.id_marque_generateur
        ${where}
    `;

    // Exécution des deux requêtes
    db.query(countQuery, params.slice(0, params.length - 2), (countError, countResult) => {
        if (countError) {
            console.error(countError);
            return res.status(500).json({ error: "Erreur serveur" });
        }

        const total = countResult[0].total;

        db.query(query, params, (error, rows) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: "Erreur serveur" });
            }

            return res.status(200).json({
                data: rows,
                pagination: {
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                },
                sorting: {
                    sortField: safeSortField,
                    sortOrder: safeSortOrder,
                },
            });
        });
    });
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

    if(!id_plein_generateur) {
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
        num_pc,
        num_facture,
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
        const prix_usd = parseFloat((prix_cdf / taux_usd).toFixed(2));

        // 4️⃣ Préparation des valeurs pour l’insert
        const values = [
            id_generateur,
            num_pc,
            num_facture,
            quantite_litres,
            id_type_carburant,
            date_operation,
            id_fournisseur,
            user_cr,
            commentaire || null,
            prix_cdf, 
            prix_usd,
            montant_total_cdf,
            montant_total_usd
        ];

        // 5️⃣ Insertion dans la base de données
        const q = `
            INSERT INTO plein_generateur(
                id_generateur, num_pc, num_facture, quantite_litres, 
                id_type_carburant, date_operation, 
                user_cr, id_fournisseur, commentaire, prix_cdf, prix_usd, 
                montant_total_cdf, montant_total_usd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        num_pc,
        num_facture,
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
            id_generateur = ?, num_pc = ?, num_facture = ?, quantite_litres = ?, 
            id_type_carburant = ?, date_operation = ?, 
            user_cr = ?, commentaire = ?
        WHERE id_plein_generateur  = ?
            `;

        const values = [
            id_generateur, 
            num_pc,
            num_facture,
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
};

//Inspection générateur
exports.getInspeGenerateur = (req, res) => {
    const query = `
        SELECT 
            ig.id_inspection_generateur, 
            ig.date_inspection,
            subIns.id_sub_inspection_generateur, 
            subIns.date_reparation,
            subIns.date_validation,
            subIns.commentaire,
            subIns.avis,
            subIns.montant,
            g.num_serie, mog.nom_modele, 
            mag.nom_marque,
            tg.nom_type_gen,
            cat.nom_cat_inspection,
            tr.type_rep, 
            tss.nom_type_statut,
            sv.nom_statut_vehicule,
            iv.budget_valide,
            iv.manoeuvre
        FROM inspection_generateur ig
            LEFT JOIN generateur g ON ig.id_generateur = g.id_generateur
            LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
            LEFT JOIN marque_generateur mag ON mog.id_marque_generateur = mag.id_marque_generateur
            LEFT JOIN sub_inspection_generateur subIns ON ig.id_inspection_generateur = subIns.id_inspection_generateur
            LEFT JOIN type_reparations tr ON subIns.id_cat_inspection = tr.id_type_reparation
            LEFT JOIN type_generateur tg ON subIns.id_type_reparation = tg.id_type_generateur
            LEFT JOIN cat_inspection cat ON subIns.id_cat_inspection = cat.id_cat_inspection
            LEFT JOIN type_statut_suivi tss ON subIns.statut = tss.id_type_statut_suivi
            LEFT JOIN statut_vehicule sv ON ig.id_statut_vehicule = sv.id_statut_vehicule
            LEFT JOIN inspection_generateur_valide iv ON subIns.id_sub_inspection_generateur = iv.id_sub_inspection_generateur
            GROUP BY subIns.id_sub_inspection_generateur
            ORDER BY ig.created_at DESC
        `;

    db.query(query, (error, results) => {
        if(error) {
            console.error("Erreur lors de la récupération des réparations : ", error);
            return res.status(500).json({
                message: 'Une erreur est servenu lors de la récupération de reparation generateur'
            })
        }

        return res.status(200).json(results)
    })
}

exports.postInspeGenerateur = (req, res) => {
  db.getConnection((connErr, connection) => {
    if (connErr) {
      console.error("DB connection error:", connErr);
      return res.status(500).json({ error: "Connexion DB échouée." });
    }

    connection.beginTransaction(async (trxErr) => {
      if (trxErr) {
        connection.release();
        return res.status(500).json({ error: "Démarrage transaction échoué." });
      }

      try {
        const {
          id_generateur,
          id_statut_vehicule,
          user_cr,
          reparations = [],
          date_inspection,
          date_prevu
        } = req.body;

        if (!id_generateur || !id_statut_vehicule || !user_cr) {
          throw new Error("Champs obligatoires manquants.");
        }

        const inspectionDate = moment(date_inspection).format("YYYY-MM-DD");
        const prevuDate = moment(date_prevu).format("YYYY-MM-DD");

        const insertInspectionSql = `
          INSERT INTO inspection_generateur (
            id_generateur,
            date_prevu,
            date_inspection,
            id_statut_vehicule,
            user_cr
          ) VALUES (?, ?, ?, ?, ?)
        `;

        const [inspectionResult] = await queryPromise(
          connection,
          insertInspectionSql,
          [
            id_generateur,
            prevuDate,
            inspectionDate,
            id_statut_vehicule,
            user_cr
          ]
        );

        const inspectionId = inspectionResult.insertId;

        const parsedReparations = Array.isArray(reparations)
          ? reparations
          : JSON.parse(reparations);

        if (!Array.isArray(parsedReparations)) {
          throw new Error("Le champ réparations doit être un tableau.");
        }

        const insertReparationSql = `
          INSERT INTO sub_inspection_generateur (
            id_inspection_generateur,
            id_type_reparation,
            id_cat_inspection,
            montant,
            commentaire,
            avis,
            statut,
            date_reparation,
            date_validation
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const rep of parsedReparations) {
          await queryPromise(connection, insertReparationSql, [
            inspectionId,
            rep.id_type_reparation,
            rep.id_cat_inspection,
            rep.montant || 0,
            rep.commentaire || null,
            rep.avis || null,
            1,
            rep.date_reparation
              ? moment(rep.date_reparation).format("YYYY-MM-DD")
              : null,
            null
          ]);
        }

        connection.commit((commitErr) => {
          connection.release();

          if (commitErr) {
            return res
              .status(500)
              .json({ error: "Erreur lors du commit." });
          }

          return res.status(201).json({
            message: "Inspection enregistrée avec succès",
            data: { id_inspection: inspectionId }
          });
        });
      } catch (error) {
        console.error("Transaction error:", error);
        connection.rollback(() => {
          connection.release();
          res.status(500).json({ error: error.message });
        });
      }
    });
  });
};

//Sous inspection generateur
exports.getInspeSousGenerateurById = (req, res) => {
    const { id_inspection_generateur } = req.query;

    if(!id_inspection_generateur) {
        return res.status(400).json({
            message: "L'ID de l'inspection du générateur est requis."
        });
    }
    const query = `
        SELECT 
            ig.id_inspection_generateur, 
            ig.date_inspection,
            subIns.id_sub_inspection_generateur, 
            subIns.date_reparation,
            subIns.date_validation,
            subIns.commentaire,
            subIns.avis,
            subIns.montant,
            subIns.id_type_reparation,
            subIns.id_cat_inspection,
            g.num_serie, mog.nom_modele, 
            mag.nom_marque,
            tg.nom_type_gen,
            cat.nom_cat_inspection,
            tr.type_rep, 
            tss.nom_type_statut,
            sv.nom_statut_vehicule
        FROM inspection_generateur ig
            LEFT JOIN generateur g ON ig.id_generateur = g.id_generateur
            LEFT JOIN modele_generateur mog ON g.id_modele = mog.id_modele_generateur
            LEFT JOIN marque_generateur mag ON mog.id_marque_generateur = mag.id_marque_generateur
            LEFT JOIN sub_inspection_generateur subIns ON ig.id_inspection_generateur = subIns.id_inspection_generateur
            LEFT JOIN type_reparations tr ON subIns.id_cat_inspection = tr.id_type_reparation
            LEFT JOIN type_generateur tg ON subIns.id_type_reparation = tg.id_type_generateur
            LEFT JOIN cat_inspection cat ON subIns.id_cat_inspection = cat.id_cat_inspection
            LEFT JOIN type_statut_suivi tss ON subIns.statut = tss.id_type_statut_suivi
            LEFT JOIN statut_vehicule sv ON ig.id_statut_vehicule = sv.id_statut_vehicule
        WHERE subIns.id_inspection_generateur = ${id_inspection_generateur}
        `;

    db.query(query, (error, results) => {
        if(error) {
            console.error("Erreur lors de la récupération des réparations : ", error);
            return res.status(500).json({
                message: 'Une erreur est servenu lors de la récupération de reparation generateur'
            })
        }

        return res.status(200).json(results)
    })
};

//Validation inspection générateur
exports.getValidationInspectionGenerateur = (req, res) => {
    const { id_sub_inspection_generateur } = req.query;

    if (!id_sub_inspection_generateur) {
        return res.status(400).json({ error: "L'identifiant de l'inspection est requis." });
    }

    const query = `
            SELECT 
          	  iv.id_inspection_generateur_valide, 
              iv.id_type_reparation, 
              iv.manoeuvre, 
              iv.cout, iv.budget_valide,
              subIg.avis,
              subIg.commentaire,
              ig.id_generateur,
              ig.id_statut_vehicule
          FROM inspection_generateur_valide iv
          LEFT JOIN sub_inspection_generateur subIg ON iv.id_sub_inspection_generateur = subIg.id_sub_inspection_generateur
          LEFT JOIN inspection_generateur ig ON subIg.id_inspection_generateur = ig.id_inspection_generateur
          WHERE subIg.id_sub_inspection_generateur = ? AND subIg.est_supprime = 0
      `;

    db.query(query, [id_sub_inspection_generateur], (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des sous-inspections :", err);
            return res.status(500).json({ error: "Erreur serveur lors de la récupération des données." });
        }

        return res.status(200).json(results);
    });
};

exports.postValidationInspectionGenerateur = async (req, res) => {
    try {
        const inspections = req.body;

        if (!Array.isArray(inspections) || inspections.length === 0) {
            return res.status(400).json({ error: 'Aucune donnée reçue.' });
        }

        for (const inspection of inspections) {
            const {
                id_sub_inspection_generateur,
                id_type_reparation,
                id_cat_inspection,
                montant,
                budget_valide,
                manoeuvre,
                user_cr
            } = inspection;

            const cout = montant;

            // Vérifie si cette réparation a déjà été validée pour cette sous-inspection
            const checkQuery = `
                SELECT COUNT(*) AS count 
                FROM inspection_generateur_valide 
                WHERE id_sub_inspection_generateur = ? AND id_type_reparation = ?
            `;
            const [checkResult] = await queryAsync(checkQuery, [id_sub_inspection_generateur, id_type_reparation]);

            if (checkResult.count > 0) {
                // On ignore ou on peut aussi renvoyer une erreur
                return res.status(400).json({
                    error: `Le type de réparation a déjà été validé pour la sous-inspection).`
                });
            }

            // Si pas encore validé, on insère
            const insertQuery = `
                INSERT INTO inspection_generateur_valide 
                (id_sub_inspection_generateur, id_type_reparation, id_cat_inspection, cout, budget_valide, manoeuvre, user_cr)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const insertValues = [
                id_sub_inspection_generateur,
                id_type_reparation,
                id_cat_inspection,
                cout,
                budget_valide,
                manoeuvre,
                user_cr
            ];

            await queryAsync(insertQuery, insertValues);

            const updateQuery = `
                UPDATE sub_inspection_generateur 
                SET date_validation = ?, statut = ?
                WHERE id_sub_inspection_generateur = ?
            `;

            const updateValues = [moment().format('YYYY-MM-DD'), 8, id_sub_inspection_generateur];

            await queryAsync(updateQuery, updateValues);
        }

        return res.status(201).json({ message: 'Les inspections ont été validées avec succès.' });

    } catch (error) {
        console.error('Erreur lors de la validation des inspections :', error);
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la validation des inspections.",
        });
    }
};

//Reparation generateur
exports.getRepGenerateur = (req, res) => {
    const query = `
        SELECT 
            rg.id_reparations_generateur,
            rg.id_generateur, rg.date_entree, 
            rg.date_prevu, rg.cout, rg.commentaire, 
            f.nom_fournisseur, g.num_serie, mg.nom_modele, 
            mag.nom_marque, subRe.id_sub_reparations_generateur,
            subRe.montant, subRe.description, tr.type_rep, 
            sv.nom_statut_vehicule, u.nom AS nom_createur, 
            u.prenom AS prenom_cr, tss.nom_type_statut
        FROM reparations_generateur rg
            LEFT JOIN sub_reparations_generateur subRe ON rg.id_reparations_generateur = subRe.id_reparations_generateur
            LEFT JOIN type_reparations tr ON subRe.id_type_reparation = tr.id_type_reparation
            LEFT JOIN statut_vehicule sv ON rg.id_statut_vehicule = sv.id_statut_vehicule
            LEFT JOIN fournisseur f ON rg.id_fournisseur = f.id_fournisseur
            LEFT JOIN generateur g ON rg.id_generateur = g.id_generateur
            LEFT JOIN modele_generateur mg ON g.id_modele = mg.id_modele_generateur
            LEFT JOIN marque_generateur mag ON mg.id_marque_generateur = mag.id_marque_generateur
            LEFT JOIN type_statut_suivi tss ON subRe.id_statut = tss.id_type_statut_suivi
            LEFT JOIN utilisateur u ON rg.user_cr = u.id_utilisateur`;

    db.query(query, (error, results) => {
        if(error) {
            console.error("Erreur lors de la récupération des réparations : ", error);
            return res.status(500).json({
                message: 'Une erreur est servenu lors de la récupération de reparation generateur'
            })
        }

        return res.status(200).json(results)
    })
};

exports.getRepGenerateurOne = async(req, res) => {
    try {
        const { id_reparations_generateur } = req.query;

        if(!id_reparations_generateur) {
            return res.status(400).json({
                message: "L'ID de la réparation du générateur est requis."
            });
        }

        const sqlDetail = await query (`
            SELECT 
                rg.id_reparations_generateur,
                subRe.id_sub_reparations_generateur,
                rg.id_generateur, rg.date_entree, 
                rg.date_prevu, rg.cout, rg.commentaire, 
                f.nom_fournisseur, g.num_serie, mg.nom_modele, 
                mag.nom_marque, subRe.id_sub_reparations_generateur,
                subRe.montant, subRe.description, tr.type_rep, 
                sv.nom_statut_vehicule, u.nom AS nom_createur, 
                u.prenom AS prenom_cr, tss.nom_type_statut,
                eva.nom_evaluation
            FROM reparations_generateur rg
                LEFT JOIN sub_reparations_generateur subRe ON rg.id_reparations_generateur = subRe.id_reparations_generateur
                LEFT JOIN type_reparations tr ON subRe.id_type_reparation = tr.id_type_reparation
                LEFT JOIN statut_vehicule sv ON rg.id_statut_vehicule = sv.id_statut_vehicule
                LEFT JOIN fournisseur f ON rg.id_fournisseur = f.id_fournisseur
                LEFT JOIN generateur g ON rg.id_generateur = g.id_generateur
                LEFT JOIN modele_generateur mg ON g.id_modele = mg.id_modele_generateur
                LEFT JOIN marque_generateur mag ON mg.id_marque_generateur = mag.id_marque_generateur
                LEFT JOIN type_statut_suivi tss ON subRe.id_statut = tss.id_type_statut_suivi
                LEFT JOIN evaluation eva ON subRe.id_evaluation = eva.id_evaluation
                LEFT JOIN utilisateur u ON rg.user_cr = u.id_utilisateur
                WHERE rg.id_reparations_generateur = ${id_reparations_generateur}`);
    
        const sqlInfo = await query(`
            SELECT 
                rg.id_reparations_generateur,
                rg.id_generateur, rg.date_entree, 
                rg.date_prevu, rg.cout, rg.commentaire, 
                f.nom_fournisseur, g.num_serie, mg.nom_modele, 
                mag.nom_marque,
                sv.nom_statut_vehicule, u.nom AS nom_createur, 
                u.prenom AS prenom_cr
            FROM reparations_generateur rg
                LEFT JOIN statut_vehicule sv ON rg.id_statut_vehicule = sv.id_statut_vehicule
                LEFT JOIN fournisseur f ON rg.id_fournisseur = f.id_fournisseur
                LEFT JOIN generateur g ON rg.id_generateur = g.id_generateur
                LEFT JOIN modele_generateur mg ON g.id_modele = mg.id_modele_generateur
                LEFT JOIN marque_generateur mag ON mg.id_marque_generateur = mag.id_marque_generateur
                LEFT JOIN utilisateur u ON rg.user_cr = u.id_utilisateur
            WHERE rg.id_reparations_generateur = ${id_reparations_generateur}`);

        const sqlDesc = await query(`
                SELECT 
                    svg.id_suivi_reparation_generateur, 
                    svg.budget, svg.commentaire, 
                    p.nom, ev.nom_evaluation,
                    tr.nom_tache_rep
                FROM suivi_reparation_generateur svg 
                    LEFT JOIN pieces p ON svg.id_piece = p.id
                    LEFT JOIN evaluation ev ON svg.id_evaluation = ev.id_evaluation
                    LEFT JOIN tache_rep tr ON svg.id_tache_rep = tr.id_tache_rep
                    LEFT JOIN sub_reparations_generateur subGen ON svg.id_sub_reparations_generateur = subGen.id_sub_reparations_generateur
                    WHERE subGen.id_reparations_generateur = ${id_reparations_generateur}
            `)

        return res.status(200).json({
            sqlDetail,
            sqlInfo,
            sqlDesc
        })
    } catch (error) {
        console.error("Erreur générateur :", error);
        res.status(500).json(error);
    }
};

exports.getSubRepGenerateurById = (req, res) => {
    const { id_sub_reparations_generateur } = req.query;

    if (!id_sub_reparations_generateur) {
        return res.status(400).json({
            message: "id_sub_reparations_generateur est requis"
        });
    }

    const query = `
        SELECT 
            subRe.*,
            rg.id_generateur, rg.date_entree, rg.date_prevu, rg.cout, rg.commentaire,
            f.nom_fournisseur, g.num_serie, mg.nom_modele,
            mag.nom_marque, tr.type_rep,
            sv.nom_statut_vehicule,
            u.nom AS nom_createur, u.prenom AS prenom_cr,
            tss.nom_type_statut,
            eva.nom_evaluation
        FROM reparations_generateur rg
        LEFT JOIN sub_reparations_generateur subRe 
            ON rg.id_reparations_generateur = subRe.id_reparations_generateur
        LEFT JOIN type_reparations tr 
            ON subRe.id_type_reparation = tr.id_type_reparation
        LEFT JOIN statut_vehicule sv 
            ON rg.id_statut_vehicule = sv.id_statut_vehicule
        LEFT JOIN fournisseur f 
            ON rg.id_fournisseur = f.id_fournisseur
        LEFT JOIN generateur g 
            ON rg.id_generateur = g.id_generateur
        LEFT JOIN modele_generateur mg 
            ON g.id_modele = mg.id_modele_generateur
        LEFT JOIN marque_generateur mag 
            ON mg.id_marque_generateur = mag.id_marque_generateur
        LEFT JOIN type_statut_suivi tss 
            ON subRe.id_statut = tss.id_type_statut_suivi
        LEFT JOIN evaluation eva 
            ON subRe.id_evaluation = eva.id_evaluation
        LEFT JOIN utilisateur u 
            ON rg.user_cr = u.id_utilisateur
        WHERE subRe.id_sub_reparations_generateur = ?
    `;

    db.query(query, [id_sub_reparations_generateur], (error, rows) => {
        if (error) {
            console.error("Erreur SQL getSubRepGenerateurById:", error);
            return res.status(500).json({
                message: "Erreur interne du serveur"
            });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                message: "Sous-réparation non trouvée"
            });
        }

        return res.status(200).json(rows[0]);
    });
};

exports.postRepGenerateur = (req, res) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur connexion DB :", connErr);
            return res.status(500).json({
                error: "Connexion à la base de données échouée."
            });
        }

        connection.beginTransaction(async (trxErr) => {
            if (trxErr) {
                connection.release();
                console.error("Erreur démarrage transaction :", trxErr);
                return res.status(500).json({
                    error: "Impossible de démarrer la transaction."
                });
            }

            try {
                const {
                    id_generateur,
                    date_entree,
                    date_prevu,
                    cout,
                    id_fournisseur,
                    commentaire,
                    reparations,
                    code_rep,
                    id_statut_vehicule,
                    user_cr
                } = req.body;

                if (!id_generateur || typeof id_generateur !== "number") {
                    throw new Error("Générateur invalide.");
                }

                if (!Array.isArray(reparations) || reparations.length === 0) {
                    throw new Error("Aucune réparation fournie.");
                }

                const dateEntree = moment(date_entree);
                if (!dateEntree.isValid()) {
                    throw new Error("Date d'entrée invalide.");
                }

                const datePrevu = date_prevu ? moment(date_prevu) : null;
                if (datePrevu && !datePrevu.isValid()) {
                    throw new Error("Date prévue invalide.");
                }

                reparations.forEach((rep, index) => {
                    if (!rep.id_type_reparation || !rep.montant) {
                        throw new Error(
                            `Réparation invalide à la ligne ${index + 1}.`
                        );
                    }
                });

                const insertMainQuery = `
                    INSERT INTO reparations_generateur (
                        id_generateur,
                        date_entree,
                        date_prevu,
                        cout,
                        id_fournisseur,
                        commentaire,
                        code_rep,
                        id_statut_vehicule,
                        user_cr
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const mainValues = [
                    id_generateur,
                    dateEntree.format("YYYY-MM-DD"),
                    datePrevu ? datePrevu.format("YYYY-MM-DD") : null,
                    cout || 0,
                    id_fournisseur || null,
                    commentaire || null,
                    code_rep || null,
                    id_statut_vehicule || null,
                    user_cr || null
                ];

                const [mainResult] = await queryPromise(
                    connection,
                    insertMainQuery,
                    mainValues
                );

                const insertedRepairId = mainResult.insertId;

                const insertSubQuery = `
                    INSERT INTO sub_reparations_generateur (
                        id_reparations_generateur,
                        id_type_reparation,
                        montant,
                        description,
                        date_reparation,
                        date_sortie,
                        id_statut,
                        id_evaluation
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                for (const rep of reparations) {
                    const subValues = [
                        insertedRepairId,
                        rep.id_type_reparation,
                        rep.montant,
                        rep.description || null,
                        rep.date_reparation
                            ? moment(rep.date_reparation).format("YYYY-MM-DD")
                            : null,
                        rep.date_sortie
                            ? moment(rep.date_sortie).format("YYYY-MM-DD")
                            : null,
                        2,
                        3
                    ];

                    await queryPromise(
                        connection,
                        insertSubQuery,
                        subValues
                    );
                }

                connection.commit((commitErr) => {
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return connection.rollback(() => {
                            connection.release();
                            res.status(500).json({
                                error: "Erreur lors de la validation."
                            });
                        });
                    }

                    connection.release();
                    return res.status(201).json({
                        message: "Réparation enregistrée avec succès.",
                        data: { id: insertedRepairId }
                    });
                });

            } catch (error) {
                console.error("Erreur transaction :", error);

                connection.rollback(() => {
                    connection.release();
                    res.status(400).json({
                        error: error.message || "Erreur inattendue."
                    });
                });
            }
        });
    });
};

//Sous réparation générateur
exports.getSubRepGenerateurById = (req, res) => {
    const { id_sub_reparations_generateur } = req.query;

    if (!id_sub_reparations_generateur) {
        return res.status(400).json({
            message: "id_sub_reparations_generateur est requis"
        });
    }

    const query = `
        SELECT 
            subRe.*,
            rg.id_generateur, rg.date_entree, rg.date_prevu, rg.cout, rg.commentaire,
            f.nom_fournisseur, g.num_serie, mg.nom_modele,
            mag.nom_marque, tr.type_rep,
            sv.nom_statut_vehicule,
            u.nom AS nom_createur, u.prenom AS prenom_cr,
            tss.nom_type_statut,
            eva.nom_evaluation
        FROM reparations_generateur rg
        LEFT JOIN sub_reparations_generateur subRe 
            ON rg.id_reparations_generateur = subRe.id_reparations_generateur
        LEFT JOIN type_reparations tr 
            ON subRe.id_type_reparation = tr.id_type_reparation
        LEFT JOIN statut_vehicule sv 
            ON rg.id_statut_vehicule = sv.id_statut_vehicule
        LEFT JOIN fournisseur f 
            ON rg.id_fournisseur = f.id_fournisseur
        LEFT JOIN generateur g 
            ON rg.id_generateur = g.id_generateur
        LEFT JOIN modele_generateur mg 
            ON g.id_modele = mg.id_modele_generateur
        LEFT JOIN marque_generateur mag 
            ON mg.id_marque_generateur = mag.id_marque_generateur
        LEFT JOIN type_statut_suivi tss 
            ON subRe.id_statut = tss.id_type_statut_suivi
        LEFT JOIN evaluation eva 
            ON subRe.id_evaluation = eva.id_evaluation
        LEFT JOIN utilisateur u 
            ON rg.user_cr = u.id_utilisateur
        WHERE subRe.id_sub_reparations_generateur = ?
    `;

    db.query(query, [id_sub_reparations_generateur], (error, rows) => {
        if (error) {
            console.error("Erreur SQL getSubRepGenerateurById:", error);
            return res.status(500).json({
                message: "Erreur interne du serveur"
            });
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                message: "Sous-réparation non trouvée"
            });
        }

        return res.status(200).json(rows[0]);
    });
};

//Tracking reparation générateur
exports.postSuiviReparationGenerateur = async(req, res) => {
    let connection;

    try {
        const { id_evaluation, id_statut_vehicule, id_sub_reparations_generateur, user_cr, info } = req.body;
          
        if (!id_evaluation || !id_sub_reparations_generateur || !user_cr || !info || !Array.isArray(info)) {
            return res.status(400).json({ error: 'Champs requis manquants ou invalides.' });
        }

        connection = await new Promise((resolve, reject) => {
            db.getConnection((err, conn) => {
                if(err) return reject(err);
                resolve(conn);
            });
        });

        const beginTransaction = promisify(connection.beginTransaction);
        const commit = promisify(connection.commit);
        const connQuery = promisify(connection.query);

        await beginTransaction();

        const insertQuery = `
            INSERT INTO suivi_reparation_generateur (
                  id_sub_reparations_generateur,
                  id_tache_rep,
                  id_piece,
                  budget,
                  commentaire,
                  user_cr
              ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        for (const rep of info) {
            const repValues = [
                id_sub_reparations_generateur,
                rep.id_tache_rep,
                rep.id_piece,
                rep.budget,
                rep.commentaire,
                user_cr
            ];
            await connQuery(insertQuery, repValues);
        }

        const getSubQsl = `
            SELECT
        `

    } catch (error) {
        
    }
};