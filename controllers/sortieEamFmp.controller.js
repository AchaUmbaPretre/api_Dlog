const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);
const moment = require("moment");

function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve([results]);
      });
    });
  }

exports.getSortieEam = (req, res) => {
    const {
        smr = [],
        part = [],
        dateRange = []
    } = req.query.data || {};


    let where = "WHERE 1=1";
    const params = [];

    /* ===== FILTRE SMR ===== */
    if (Array.isArray(smr) && smr.length > 0) {
        where += ` AND s.smr_ref IN (${smr.map(() => "?").join(",")})`;
        params.push(...smr);
    }

    /* ===== FILTRE PART ===== */
    if (Array.isArray(part) && part.length > 0) {
        where += ` AND s.part IN (${part.map(() => "?").join(",")})`;
        params.push(...part);
    }

    /* ===== FILTRE DATE ===== */
    if (Array.isArray(dateRange) && dateRange.length === 2) {
        where += ` AND s.transanction_date BETWEEN ? AND ?`;
        params.push(
            moment(dateRange[0]).startOf("day").format("YYYY-MM-DD HH:mm:ss"),
            moment(dateRange[1]).endOf("day").format("YYYY-MM-DD HH:mm:ss")
        );
    }


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
        LEFT JOIN eam_doc_physique edp 
            ON s.smr_ref = edp.smr_ref

        ${where}

        GROUP BY 
            s.part,
            s.smr_ref,
            s.part_description,
            edp.doc_physique_ok,
            edp.qte_doc_physique

        ORDER BY last_transaction_date DESC
    `;

    db.query(q, params, (error, data) => {
        if (error) {
            return res.status(500).json({
                message: "Erreur lors de la récupération des sorties EAM",
                error
            });
        }
        return res.status(200).json(data);
    });
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

exports.putSortieEam = (req, res) => {
    try {
        const {
            id_sortie_eam,
            quantite_out,
            quantite_in
        } = req.body;

        if(!id_sortie_eam) {
            return res.status(400).json({ message : 'ID sortie eam'})
        }

        const q = `
            UPDATE sortie_eam SET
                quantite_out = ?,
                quantite_in = ?
                WHERE id_sortie_eam = ?
        `;

        const values = [
            quantite_out,
            quantite_in,
            id_sortie_eam
        ]
        db.query(q, values, (error, data) => {
            if(error) {
                console.error(error);
                return res.status(500).json({
                    message: "Erreur serveur lors de la mise à jour."
                })
            }

            res.status(200).json({
                message: "Sortie EAM mis à jour avec succès."
            });
        })

    } catch (error) {
        
    }
};

exports.getSortieFmp = (req, res) => {
    const { smr = [], item_code = [] } = req.query.data || {};

    let where = "WHERE 1=1";
    const params = [];

    if (Array.isArray(smr) && smr.length > 0) {
        where += ` AND s.smr IN (${smr.map(() => "?").join(",")})`;
        params.push(...smr);
    }

    if (Array.isArray(item_code) && item_code.length > 0) {
        where += ` AND s.item_code IN (${item_code.map(() => "?").join(",")})`;
        params.push(...item_code);
    }

    const q = `
        SELECT 
            MAX(s.id_sortie_fmp) AS id_sortie_fmp,
            MAX(s.produit_pd_code) AS produit_pd_code,
            MAX(s.sortie_gsm_num) AS sortie_gsm_num,
            MAX(s.sortie_gsm_num_gtm) AS sortie_gsm_num_gtm,
            MAX(s.sortie_gsm_num_site) AS sortie_gsm_num_site,
            s.item_code,
            s.smr,
            MAX(s.designation) AS designation,
            SUM(s.nbre_colis) AS nbre_colis,
            MAX(s.unite) AS unite,
            s.sortie_gsm_num_be,
            MAX(s.difference) AS difference,
            MAX(s.colonne1) AS colonne1,
            MAX(s.commentaire) AS commentaire,
            fmp.doc_physique_ok,
            fmp.total_doc_physique AS qte_doc_physique,
            CASE
                WHEN fmp.total_doc_physique IS NOT NULL
                THEN SUM(s.nbre_colis) - fmp.total_doc_physique
                ELSE NULL
            END AS ecart_doc_fmp
        FROM sortie_fmp s
        LEFT JOIN (
            SELECT item_code, SUM(qte_doc_physique) AS total_doc_physique, MAX(doc_physique_ok) AS doc_physique_ok
            FROM fmp_doc_physique
            GROUP BY item_code
        ) fmp ON s.item_code = fmp.item_code
            ${where}
        GROUP BY s.sortie_gsm_num_be, s.item_code, s.smr;
    `;

    db.query(q, params, (error, data) => {
        if (error) return res.status(500).send(error);
        return res.status(200).json(data);
    });
};

exports.getSortieFmpBySmr = (req, res) => {
    const { smr, sortie_gsm_num_be } = req.query;

    if (!smr && !sortie_gsm_num_be) {
        return res.status(400).json({
            error: "Au moins un paramètre est requis : smr ou N° Be."
        });
    }

    let whereClauses = [];
    let params = [];

    if (smr) {
        whereClauses.push("s.smr = ?");
        params.push(smr);
    }

    if (sortie_gsm_num_be) {
        whereClauses.push("s.sortie_gsm_num_be = ?");
        params.push(sortie_gsm_num_be);
    }

    const query = `
        SELECT 
            s.*
        FROM sortie_fmp s
        WHERE ${whereClauses.join(" OR ")}

    `;

    db.query(query, params, (error, results) => {
        if (error) {
            console.error("Erreur getSortieFmpBySmr :", error);
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

exports.putSortieFMP = (req, res) => {
    try {
        const {
            id_sortie_fmp,
            nbre_colis
        } = req.body;

        if(!id_sortie_fmp) {
            return res.status(400).json({ message : 'ID sortie eam'})
        }

        const q = `
            UPDATE sortie_fmp SET
                nbre_colis = ?
                WHERE id_sortie_fmp  = ?
        `;

        const values = [
            nbre_colis,
            id_sortie_fmp
        ]
        db.query(q, values, (error, data) => {
            if(error) {
                console.error(error);
                return res.status(500).json({
                    message: "Erreur serveur lors de la mise à jour."
                })
            }

            res.status(200).json({
                message: "Sortie FMP mis à jour avec succès."
            });
        })

    } catch (error) {
        res.status(500).json({ message: 'Erreur inattendue' });
    }
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

exports.getPartItem = (req, res) => {
    const q = `
        SELECT part AS item
        FROM sortie_eam
        WHERE part IS NOT NULL

        UNION

        SELECT item_code AS item
        FROM sortie_fmp
        WHERE item_code IS NOT NULL
        ORDER BY item ASC
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
    let { smr = [], item_code= [], dateRange = []  } = req.query;

    if (smr && !Array.isArray(smr)) {
        smr = smr.split(',');
    }

    const filterEam = smr?.length
        ? 'WHERE (smr_ref IN (?) OR smr_ref IS NULL OR smr_ref = "")'
        : '';

    const filterFmp = smr?.length
        ? 'WHERE (smr IN (?) OR smr IS NULL OR smr = "")'
        : '';

    const query = `
        WITH
        eam AS (
            SELECT
                smr_ref,
                part AS code_article,
                part_description AS description,
                ABS(SUM(quantite_out)) AS qte_eam
            FROM sortie_eam
            ${filterEam}
            GROUP BY smr_ref, part, part_description
        ),
        fmp AS (
            SELECT
                smr,
                item_code AS code_article,
                designation AS description,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            ${filterFmp}
            GROUP BY smr, item_code, designation
        )

        SELECT
            COALESCE(e.code_article, f.code_article) AS code_article,
            COALESCE(e.description, f.description) AS description,
            IFNULL(e.qte_eam, 0) AS qte_eam,
            IFNULL(f.qte_fmp, 0) AS qte_fmp,
            (IFNULL(f.qte_fmp, 0) - IFNULL(e.qte_eam, 0)) AS ecart,
            CASE
                WHEN COALESCE(e.smr_ref, f.smr) IS NULL
                     OR COALESCE(e.smr_ref, f.smr) = ''
                THEN 'SANS_SMR'
                ELSE 'AVEC_SMR'
            END AS type_smr
        FROM eam e
        LEFT JOIN fmp f ON e.code_article = f.code_article

        UNION ALL

        SELECT
            COALESCE(e.code_article, f.code_article) AS code_article,
            COALESCE(e.description, f.description) AS description,
            IFNULL(e.qte_eam, 0) AS qte_eam,
            IFNULL(f.qte_fmp, 0) AS qte_fmp,
            (IFNULL(f.qte_fmp, 0) - IFNULL(e.qte_eam, 0)) AS ecart,
            CASE
                WHEN COALESCE(e.smr_ref, f.smr) IS NULL
                     OR COALESCE(e.smr_ref, f.smr) = ''
                THEN 'SANS_SMR'
                ELSE 'AVEC_SMR'
            END AS type_smr
        FROM eam e
        RIGHT JOIN fmp f ON e.code_article = f.code_article
        WHERE e.code_article IS NULL
    `;

    const params = smr?.length ? [smr, smr] : [];

    db.query(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        res.status(200).json(rows);
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