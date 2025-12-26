const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }

exports.getSortieEam = (req, res) => {
    const q = `
        SELECT 
            s.transanction_date,
            s.mois,
            s.transanction_num,
            s.store_description,
            s.part,
            s.part_description,
            s.stock_type,
            s.requisition,
            s.purchase,
            s.transaction,
            s.part_description12,
            s.purchase_order17,
            s.requisition17,
            s.scrapped_qty18,
            s.store19,
            s.transaction_date22,
            s.transaction_qty24,
            s.transaction_status25,
            s.transaction_type26,
            s.bulk_issue,
            s.site,
            s.smr_ref,
            SUM(s.quantite_out) AS total_quantite_out,
            SUM(s.quantite_in) AS total_quantite_in,
            COUNT(*) AS total_sorties,
            MAX(s.transanction_date) AS last_transaction_date,
            COALESCE(edp.doc_physique_ok, 0) AS doc_physique_ok,
            edp.qte_doc_physique,
            CASE
                WHEN edp.qte_doc_physique IS NOT NULL
                THEN edp.qte_doc_physique - SUM(s.quantite_out)
                ELSE NULL
            END AS ecart_doc_eam
        FROM sortie_eam s
        LEFT JOIN eam_doc_physique edp ON s.smr_ref = edp.smr_ref
        GROUP BY s.part, s.smr_ref, s.part_description, edp.doc_physique_ok, edp.qte_doc_physique
        ORDER BY last_transaction_date DESC;
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })
};

exports.getSortieEamBySmr = (req, res) => {
    const { smr_ref, part } = req.query;

    if (!smr_ref && !part) {
        return res.status(400).json({
            error: "Au moins un paramètre est requis : smr_ref ou part."
        });
    }

    let whereClauses = [];
    let params = [];

    if (smr_ref) {
        whereClauses.push("s.smr_ref = ?");
        params.push(smr_ref);
    }

    if (part) {
        whereClauses.push("s.part = ?");
        params.push(part);
    }

    const query = `
        SELECT 
            s.*
        FROM sortie_eam s
        WHERE ${whereClauses.join(" OR ")}
        ORDER BY s.transanction_date DESC
    `;

    db.query(query, params, (error, results) => {
        if (error) {
            console.error("Erreur getSortieEamBySmr :", error);
            return res.status(500).json({
                error: "Erreur interne du serveur"
            });
        }

        return res.status(200).json({
            count: results.length,
            data: results
        });
    });
};

exports.getSortieFmp = (req, res) => {
    const q = `
        SELECT 
            s.id_sortie_fmp,
            s.produit_pd_code,
            s.sortie_gsm_num,
            s.sortie_gsm_num_gtm,
            s.sortie_gsm_num_site,
            s.item_code,
            s.designation,
           	SUM(s.nbre_colis) AS nbre_colis,
            s.unite,
            s.sortie_gsm_num_be,
            s.smr,
            s.difference,
            s.colonne1,
            s.commentaire,
            fmp.doc_physique_ok,
            fmp.qte_doc_physique,
            CASE	
            	WHEN fmp.qte_doc_physique IS NOT NULL
                THEN  SUM(s.nbre_colis) - SUM(fmp.qte_doc_physique)
                ELSE NULL
            END AS ecart_doc_fmp
        FROM sortie_fmp s
        LEFT JOIN fmp_doc_physique fmp ON s.item_code = fmp.item_code AND s.sortie_gsm_num_be = fmp.sortie_gsm_num_be
        GROUP BY s.sortie_gsm_num_be, s.item_code;
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

};

exports.getSMR = (req, res) => {
    const q = `
        SELECT smr AS smr
        FROM sortie_fmp
        WHERE smr IS NOT NULL

        UNION

        SELECT smr_ref AS smr
        FROM sortie_eam
        WHERE smr_ref IS NOT NULL
        ORDER BY smr ASC
    `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).json(error);
        }
        return res.status(200).json(data);
    });
};

/* exports.getReconciliation = (req, res) => {
    const { smr } = req.query;

    // Sécurité minimale
    if (!Array.isArray(smr) || smr.length === 0) {
        return res.status(400).json({ error: "SMR requis" });
    }

    const query = `
        SELECT
            COALESCE(eam.part, fmp.item_code) AS code_article,
            COALESCE(eam.part_description, fmp.designation) AS description,
            IFNULL(eam.qte_eam, 0) AS qte_eam,
            IFNULL(fmp.qte_fmp, 0) AS qte_fmp,
            (IFNULL(fmp.qte_fmp, 0) - IFNULL(eam.qte_eam, 0)) AS ecart
        FROM
        (
            SELECT
                smr_ref,
                part,
                part_description,
                ABS(SUM(quantite_out)) AS qte_eam
            FROM sortie_eam
            WHERE smr_ref IN (?)
            GROUP BY smr_ref, part, part_description
        ) eam
        LEFT JOIN
        (
            SELECT
                smr,
                item_code,
                designation,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            WHERE smr IN (?)
            GROUP BY smr, item_code, designation
        ) fmp
        ON eam.part = fmp.item_code

        UNION

        SELECT
            COALESCE(eam.part, fmp.item_code) AS code_article,
            COALESCE(eam.part_description, fmp.designation) AS description,
            IFNULL(eam.qte_eam, 0) AS qte_eam,
            IFNULL(fmp.qte_fmp, 0) AS qte_fmp,
            (IFNULL(fmp.qte_fmp, 0) - IFNULL(eam.qte_eam, 0)) AS ecart
        FROM
        (
            SELECT
                smr_ref,
                part,
                part_description,
                ABS(SUM(quantite_out)) AS qte_eam
            FROM sortie_eam
            WHERE smr_ref IN (?)
            GROUP BY smr_ref, part, part_description
        ) eam
        RIGHT JOIN
        (
            SELECT
                smr,
                item_code,
                designation,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            WHERE smr IN (?)
            GROUP BY smr, item_code, designation
        ) fmp
        ON eam.part = fmp.item_code
    `;

    const params = [smr, smr, smr, smr];

    db.query(query, params, (error, data) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        return res.status(200).json(data);
    });
};
 */

exports.getReconciliation = (req, res) => {
    let { smr } = req.query;

    // Convertir en tableau si nécessaire
    if (smr && !Array.isArray(smr)) {
        smr = smr.split(',');
    }

    // Base de la requête
    let query = `
        SELECT
            COALESCE(eam.part, fmp.item_code) AS code_article,
            COALESCE(eam.part_description, fmp.designation) AS description,
            IFNULL(eam.qte_eam, 0) AS qte_eam,
            IFNULL(fmp.qte_fmp, 0) AS qte_fmp,
            (IFNULL(fmp.qte_fmp, 0) - IFNULL(eam.qte_eam, 0)) AS ecart
        FROM
        (
            SELECT
                smr_ref,
                part,
                part_description,
                ABS(SUM(quantite_out)) AS qte_eam
            FROM sortie_eam
            ${smr && smr.length ? 'WHERE smr_ref IN (?)' : ''}
            GROUP BY smr_ref, part, part_description
        ) eam
        LEFT JOIN
        (
            SELECT
                smr,
                item_code,
                designation,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            ${smr && smr.length ? 'WHERE smr IN (?)' : ''}
            GROUP BY smr, item_code, designation
        ) fmp
        ON eam.part = fmp.item_code

        UNION

        SELECT
            COALESCE(eam.part, fmp.item_code) AS code_article,
            COALESCE(eam.part_description, fmp.designation) AS description,
            IFNULL(eam.qte_eam, 0) AS qte_eam,
            IFNULL(fmp.qte_fmp, 0) AS qte_fmp,
            (IFNULL(fmp.qte_fmp, 0) - IFNULL(eam.qte_eam, 0)) AS ecart
        FROM
        (
            SELECT
                smr_ref,
                part,
                part_description,
                ABS(SUM(quantite_out)) AS qte_eam
            FROM sortie_eam
            ${smr && smr.length ? 'WHERE smr_ref IN (?)' : ''}
            GROUP BY smr_ref, part, part_description
        ) eam
        RIGHT JOIN
        (
            SELECT
                smr,
                item_code,
                designation,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            ${smr && smr.length ? 'WHERE smr IN (?)' : ''}
            GROUP BY smr, item_code, designation
        ) fmp
        ON eam.part = fmp.item_code
    `;

    const params = smr && smr.length ? [smr, smr, smr, smr] : [];

    db.query(query, params, (error, data) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        return res.status(200).json(data);
    });
};

exports.postEamDocPhysique = (req, res) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur de connexion DB : ", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                console.error('Erreur transaction : ', trxErr)
            }

            try {
                const {
                    smr_ref,
                    part,
                    doc_physique_ok,
                    qte_doc_physique
                } = req.body;

                if(!smr_ref || !part) {
                    throw new Error("Champs obligatoires manquants (smr ou part).");
                }

                const insertSql = `
                    INSERT INTO eam_doc_physique (
                        smr_ref,
                        part,
                        doc_physique_ok,
                        qte_doc_physique
                    ) VALUES (?, ?, ?, ?)
                `;

                const values = [
                    smr_ref,
                    part,
                    doc_physique_ok,
                    qte_doc_physique
                ]

                const [insertResult] = await queryPromise(connection, insertSql, values);
                const insertId = insertResult.insertId;

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation d'Eam doc physique." });
                    }

                    return res.status(201).json({
                        message: "Eam doc physique enregistré avec succès.",
                        data: { id: insertId }
                    });
                });

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur pendant la transaction :", error);
                    return res.status(500).json({
                        error: error.message || "Une erreur est survenue lors de l'enregistrement.",
                    });
                });
            }
        })
    })
};

exports.postFmpDocPhysique = (req, res) => {
    db.getConnection((connErr, connection) => {
        if (connErr) {
            console.error("Erreur de connexion DB : ", connErr);
            return res.status(500).json({ error: "Connexion à la base de données échouée." });
        }

        connection.beginTransaction(async (trxErr) => {
            if(trxErr) {
                connection.release();
                console.error('Erreur transaction : ', trxErr)
            }

            try {
                const {
                    smr,
                    sortie_gsm_num_be,
                    item_code,
                    doc_physique_ok,
                    qte_doc_physique
                } = req.body;

                if(!smr || !item_code) {
                    throw new Error("Champs obligatoires manquants (smr ou item code).");
                }

                const insertSql = `
                    INSERT INTO fmp_doc_physique (
                        smr,
                        sortie_gsm_num_be,
                        item_code,
                        doc_physique_ok,
                        qte_doc_physique
                    ) VALUES (?, ?, ?, ?, ?)
                `;

                const values = [
                    smr,
                    sortie_gsm_num_be,
                    item_code,
                    doc_physique_ok,
                    qte_doc_physique
                ]

                const [insertResult] = await queryPromise(connection, insertSql, values);
                const insertId = insertResult.insertId;

                connection.commit((commitErr) => {
                    connection.release();
                    if (commitErr) {
                        console.error("Erreur commit :", commitErr);
                        return res.status(500).json({ error: "Erreur lors de la validation d'Eam doc physique." });
                    }

                    return res.status(201).json({
                        message: "Eam doc physique enregistré avec succès.",
                        data: { id: insertId }
                    });
                });

            } catch (error) {
                connection.rollback(() => {
                    connection.release();
                    console.error("Erreur pendant la transaction :", error);
                    return res.status(500).json({
                        error: error.message || "Une erreur est survenue lors de l'enregistrement.",
                    });
                });
            }
        })
    })
};