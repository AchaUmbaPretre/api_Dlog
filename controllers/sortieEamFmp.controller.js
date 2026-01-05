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
    const { smr = [], part = [], dateRange = [] } = req.query.data || {};

    let where = "WHERE 1=1";
    const params = [];

    if (Array.isArray(smr) && smr.length > 0) {
        where += ` AND s.smr_ref IN (${smr.map(() => "?").join(",")})`;
        params.push(...smr);
    }

    if (Array.isArray(part) && part.length > 0) {
        where += ` AND s.part IN (${part.map(() => "?").join(",")})`;
        params.push(...part);
    }

    if (Array.isArray(dateRange) && dateRange.length === 2) {
        where += ` AND s.transanction_date BETWEEN ? AND ?`;
        params.push(
            moment(dateRange[0]).startOf("day").format("YYYY-MM-DD HH:mm:ss"),
            moment(dateRange[1]).endOf("day").format("YYYY-MM-DD HH:mm:ss")
        );
    }

    const query = `
        SELECT 
            s.smr_ref,
            s.part AS code_article,
            MAX(s.transanction_date) AS transanction_date,
            MAX(s.mois) AS mois,
            MAX(s.transanction_num) AS transanction_num,
            MAX(s.store_description) AS store_description,
            MAX(s.part_description) AS part_description,
            MAX(s.part) AS part,
            MAX(s.stock_type) AS stock_type,
            MAX(s.requisition) AS requisition,
            MAX(s.purchase) AS purchase,
            MAX(s.transaction) AS transaction,
            MAX(s.part_description12) AS part_description12,
            MAX(s.purchase_order17) AS purchase_order17,
            MAX(s.requisition17) AS requisition17,
            MAX(s.scrapped_qty18) AS scrapped_qty18,
            MAX(s.store19) AS store19,
            MAX(s.transaction_date22) AS transaction_date22,
            MAX(s.transaction_qty24) AS transaction_qty24,
            MAX(s.transaction_status25) AS transaction_status25,
            MAX(s.transaction_type26) AS transaction_type26,
            MAX(s.bulk_issue) AS bulk_issue,
            MAX(s.site) AS site,
            SUM(ABS(s.quantite_out)) AS total_quantite_out,
            SUM(ABS(s.quantite_in)) AS total_quantite_in,
            COUNT(*) AS total_sorties,
            COALESCE(MAX(edp.doc_physique_ok), 0) AS doc_physique_ok,
            MAX(edp.qte_doc_physique) AS qte_doc_physique,
            CASE
                WHEN MAX(edp.qte_doc_physique) IS NOT NULL
                THEN MAX(edp.qte_doc_physique) - SUM(ABS(s.quantite_out))
                ELSE NULL
            END AS ecart_doc_eam
        FROM sortie_eam s
        LEFT JOIN eam_doc_physique edp
            ON s.smr_ref = edp.smr_ref
           AND s.part = edp.part
        ${where}
        GROUP BY s.smr_ref, s.part
        ORDER BY transanction_date DESC;
    `;

    db.query(query, params, (error, data) => {
        if (error) {
            return res.status(500).json({
                message: "Erreur lors de la récupération des sorties EAM",
                error
            });
        }
        return res.status(200).json(data);
    });
};

exports.getSortieEamById = (req, res) => {
    const { id_sortie_eam } = req.query;

    if(!id_sortie_eam) {
        return res.status(400).json({
            error: 'ID sortie eam est requis.'
        })
    }

    const q = `SELECT * FROM sortie_eam WHERE id_sortie_eam = ?`

    db.query(q, [id_sortie_eam], (err, data) => {
        if (err) {
            console.error("getSortieFmpOne error:", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        res.status(200).json(data)
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
            s.id_sortie_eam,
            s.smr_ref,
            s.part,
            s.transanction_date,
            s.transanction_num,
            s.transaction,
            s.part_description,
            s.quantite_out,
            s.quantite_in
        FROM sortie_eam s
        WHERE ${whereClauses.join(" AND ")}
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
            quantite_in,
            smr_ref
        } = req.body;

        if(!id_sortie_eam) {
            return res.status(400).json({ message : 'ID sortie eam'})
        }

        const q = `
            UPDATE sortie_eam SET
                quantite_out = ?,
                quantite_in = ?,
                smr_ref = ?
                WHERE id_sortie_eam = ?
        `;

        const values = [
            quantite_out,
            quantite_in,
            smr_ref,
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
        return res.status(500).json({
            error: error.message || "Une erreur est survenue lors de l'enregistrement.",
        });
    }
};

exports.putSortieEamSmr = (req, res) => {
    try {
        const {
            id_sortie_eam,
            smr_ref
        } = req.body;

        if(!id_sortie_eam) {
            return res.status(400).json({ message : 'ID sortie eam'})
        }

        const q = `
            UPDATE sortie_eam SET
                smr_ref = ?
                WHERE id_sortie_eam = ?
        `;

        const values = [
            smr_ref,
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
                message: "Sortie EAM SMR mis à jour avec succès."
            });
        })

    } catch (error) {
        return res.status(500).json({
            error: error.message || "Une erreur est survenue lors de l'enregistrement.",
        });
    }
};

exports.getSortieFmp = (req, res) => {
    const { smr = [], item_code = [], dateRange = []  } = req.query.data || {};

    let where = "WHERE 1=1";
    const params = [];

    if (Array.isArray(smr) && smr.length) {
        where += ` AND s.smr IN (${smr.map(() => "?").join(",")})`;
        params.push(...smr);
    }

    if (Array.isArray(item_code) && item_code.length) {
        where += ` AND s.item_code IN (${item_code.map(() => "?").join(",")})`;
        params.push(...item_code);
    }

        if (Array.isArray(dateRange) && dateRange.length === 2) {
        where += ` AND s.date_sortie BETWEEN ? AND ?`;
        params.push(
            moment(dateRange[0]).startOf("day").format("YYYY-MM-DD HH:mm:ss"),
            moment(dateRange[1]).endOf("day").format("YYYY-MM-DD HH:mm:ss")
        );
    }
    const query = `
        WITH last_sortie AS (
            SELECT *,
                   ROW_NUMBER() OVER (
                       PARTITION BY sortie_gsm_num_be, item_code, smr
                       ORDER BY date_sortie DESC
                   ) AS rn
            FROM sortie_fmp
        ),
        fmp_agg AS (
            SELECT
                item_code,
                smr,
                sortie_gsm_num_be,
                SUM(nbre_colis) AS total_colis
            FROM sortie_fmp
            GROUP BY item_code, smr, sortie_gsm_num_be
        ),
        doc_physique AS (
            SELECT
                item_code,
                smr,
                sortie_gsm_num_be,
                SUM(qte_doc_physique) AS total_doc_physique,
                MAX(doc_physique_ok) AS doc_physique_ok
            FROM fmp_doc_physique
            GROUP BY item_code, smr, sortie_gsm_num_be
        )
        SELECT
            s.id_sortie_fmp,
            s.produit_pd_code,
            s.sortie_gsm_num,
            s.sortie_gsm_num_gtm,
            s.sortie_gsm_num_site,
            s.item_code,
            s.smr,
            s.date_sortie AS last_date,
            s.designation,
            a.total_colis AS nbre_colis,
            s.unite,
            s.sortie_gsm_num_be,
            (a.total_colis - COALESCE(d.total_doc_physique, 0)) AS ecart_doc_fmp,
            d.doc_physique_ok,
            COALESCE(d.total_doc_physique, 0) AS qte_doc_physique
        FROM last_sortie s
        JOIN fmp_agg a
            ON s.item_code = a.item_code
           AND s.smr = a.smr
           AND s.sortie_gsm_num_be = a.sortie_gsm_num_be
        LEFT JOIN doc_physique d
            ON s.item_code = d.item_code
           AND s.smr = d.smr
           AND s.sortie_gsm_num_be = d.sortie_gsm_num_be
        ${where}
        AND s.rn = 1
        ORDER BY s.date_sortie DESC
    `;

    db.query(query, params, (err, rows) => {
        if (err) {
            console.error("getSortieFmp error:", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        res.status(200).json(rows);
    });
};

exports.getSortieFmpById = (req, res) => {
    const { id_sortie_fmp } = req.query;

    if(!id_sortie_fmp) {
        return res.status(400).json({
            error: 'ID sortie fmp est requis.'
        })
    }

    const q = `SELECT * FROM sortie_fmp WHERE id_sortie_fmp = ?`

    db.query(q, [id_sortie_fmp], (err, data) => {
        if (err) {
            console.error("getSortieFmpOne error:", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        res.status(200).json(data)
    })
}

exports.getSortieFmpBySmr = (req, res) => {
    const { smr, item_code } = req.query;

    if (!smr && !item_code) {
        return res.status(400).json({
            error: "Au moins un paramètre est requis : smr ou N° Be."
        });
    }

    const whereClauses = [];
    const params = [];

    if (smr) {
        whereClauses.push("s.smr = ?");
        params.push(smr);
    }

    if (item_code) {
        whereClauses.push("s.item_code = ?");
        params.push(item_code);
    }

    const query = `
        SELECT s.*
        FROM sortie_fmp s
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY s.date_sortie DESC
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
            nbre_colis,
            smr
        } = req.body;

        if(!id_sortie_fmp) {
            return res.status(400).json({ message : 'ID sortie eam'})
        }

        const q = `
            UPDATE sortie_fmp SET
                nbre_colis = ?,
                smr = ?
                WHERE id_sortie_fmp = ?
        `;

        const values = [
            nbre_colis,
            smr,
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

exports.putSortieFMPSmr = (req, res) => {
    try {
        const {
            id_sortie_fmp,
            smr
        } = req.body;

        if(!id_sortie_fmp) {
            return res.status(400).json({ message : 'ID sortie eam smr'})
        }

        const q = `
            UPDATE sortie_fmp SET
                smr = ?
                WHERE id_sortie_fmp  = ?
        `;

        const values = [
            smr,
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
                message: "Sortie FMP SMR mis à jour avec succès."
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
    try {
        let { smr = [], item_code = [], dateRange = [] } = req.query.data || {};

        if (!Array.isArray(smr) && smr) smr = smr.split(",");
        if (!Array.isArray(item_code) && item_code) item_code = item_code.split(",");

        const params = [];

        let filterEam = "WHERE 1=1";
        let filterFmp = "WHERE 1=1";

        if (smr.length) {
            filterEam += " AND smr_ref IN (?)";
            filterFmp += " AND smr IN (?)";
            params.push(smr, smr);
        }

        if (item_code.length) {
            filterEam += " AND part IN (?)";
            filterFmp += " AND item_code IN (?)";
            params.push(item_code, item_code);
        }

        if (Array.isArray(dateRange) && dateRange.length === 2) {
            const start = moment(dateRange[0])
                .startOf("day")
                .format("YYYY-MM-DD HH:mm:ss");

            const end = moment(dateRange[1])
                .endOf("day")
                .format("YYYY-MM-DD HH:mm:ss");

            filterEam += " AND transanction_date BETWEEN ? AND ?";
            filterFmp += " AND date_sortie BETWEEN ? AND ?";

            params.push(start, end, start, end);
        }

        const query = `
            WITH eam_agg AS (
                SELECT
                    smr_ref,
                    part AS code_article,
                    SUM(ABS(quantite_out)) AS qte_eam
                FROM sortie_eam
                ${filterEam}
                GROUP BY smr_ref, part
            ),
            fmp_agg AS (
                SELECT
                    smr,
                    item_code AS code_article,
                    SUM(nbre_colis) AS qte_fmp
                FROM sortie_fmp
                ${filterFmp}
                GROUP BY smr, item_code
            )

            -- Cas 1 : correspondance EAM -> FMP
            SELECT
                e.smr_ref AS smr,
                e.code_article,
                e.qte_eam,
                IFNULL(f.qte_fmp, 0) AS qte_fmp,
                (IFNULL(f.qte_fmp, 0) - e.qte_eam) AS ecart,
                CASE
                    WHEN IFNULL(f.qte_fmp, 0) = e.qte_eam THEN 'OK'
                    WHEN IFNULL(f.qte_fmp, 0) > e.qte_eam THEN 'SURPLUS_FMP'
                    ELSE 'MANQUE_FMP'
                END AS statut
            FROM eam_agg e
            LEFT JOIN fmp_agg f
                ON e.smr_ref = f.smr
               AND e.code_article = f.code_article

            UNION ALL

            -- Cas 2 : lignes FMP sans équivalent EAM
            SELECT
                f.smr,
                f.code_article,
                0 AS qte_eam,
                f.qte_fmp,
                f.qte_fmp AS ecart,
                'ABSENT_EAM' AS statut
            FROM fmp_agg f
            LEFT JOIN eam_agg e
                ON e.smr_ref = f.smr
               AND e.code_article = f.code_article
            WHERE e.code_article IS NULL

            ORDER BY smr, code_article
        `;

        db.query(query, params, (err, rows) => {
            if (err) {
                console.error("Reconciliation error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Erreur serveur lors de la réconciliation",
                });
            }

            res.status(200).json({
                success: true,
                total: rows.length,
                data: rows,
            });
        });

    } catch (error) {
        console.error("Reconciliation controller error:", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne",
        });
    }
}; */

exports.getReconciliation = (req, res) => {
    try {
        let { smr = [], item_code = [], dateRange = [] } = req.query.data || {};

        if (!Array.isArray(smr) && smr) smr = smr.split(",");
        if (!Array.isArray(item_code) && item_code) item_code = item_code.split(",");

        const params = [];

        let filterEam = "WHERE 1=1";
        let filterFmp = "WHERE 1=1";

        if (smr.length) {
            filterEam += " AND smr_ref IN (?)";
            filterFmp += " AND smr IN (?)";
            params.push(smr, smr);
        }

        if (item_code.length) {
            filterEam += " AND part IN (?)";
            filterFmp += " AND item_code IN (?)";
            params.push(item_code, item_code);
        }

        if (Array.isArray(dateRange) && dateRange.length === 2) {
            const start = moment(dateRange[0])
                .startOf("day")
                .format("YYYY-MM-DD HH:mm:ss");

            const end = moment(dateRange[1])
                .endOf("day")
                .format("YYYY-MM-DD HH:mm:ss");

            filterEam += " AND transanction_date BETWEEN ? AND ?";
            filterFmp += " AND date_sortie BETWEEN ? AND ?";

            params.push(start, end, start, end);
        }

       const query = `
        WITH eam_agg AS (
            SELECT
                smr_ref,
                part AS code_article,
                SUM(ABS(quantite_out)) AS qte_eam
            FROM sortie_eam
            ${filterEam}
            GROUP BY smr_ref, part
        ),
        fmp_agg AS (
            SELECT
                smr,
                item_code AS code_article,
                SUM(nbre_colis) AS qte_fmp
            FROM sortie_fmp
            ${filterFmp}
            GROUP BY smr, item_code
        ),
        eam_physique AS (
            SELECT
                smr_ref,
                part AS code_article,
                SUM(qte_doc_physique) AS qte_physique_eam
            FROM eam_doc_physique
            GROUP BY smr_ref, part
        ),
        fmp_physique AS (
            SELECT
                smr,
                item_code AS code_article,
                SUM(qte_doc_physique) AS qte_physique_fmp
            FROM fmp_doc_physique
            GROUP BY smr, item_code
        )

        -- 1️⃣ Lignes EAM (avec ou sans FMP)
        SELECT
            e.smr_ref AS smr,
            e.code_article,

            e.qte_eam,
            IFNULL(f.qte_fmp, 0) AS qte_fmp,
            (IFNULL(f.qte_fmp, 0) - e.qte_eam) AS ecart_logique,

            IFNULL(ep.qte_physique_eam, 0) AS qte_physique_eam,
            (IFNULL(ep.qte_physique_eam, 0) - e.qte_eam) AS ecart_physique_eam,

            IFNULL(fp.qte_physique_fmp, 0) AS qte_physique_fmp,
            (IFNULL(fp.qte_physique_fmp, 0) - IFNULL(f.qte_fmp, 0)) AS ecart_physique_fmp,

            CASE
                WHEN IFNULL(f.qte_fmp, 0) = e.qte_eam THEN 'OK'
                WHEN IFNULL(f.qte_fmp, 0) > e.qte_eam THEN 'SURPLUS_FMP'
                ELSE 'MANQUE_FMP'
            END AS statut_logique

        FROM eam_agg e
        LEFT JOIN fmp_agg f
            ON f.smr = e.smr_ref
            AND f.code_article = e.code_article
        LEFT JOIN eam_physique ep
            ON ep.smr_ref = e.smr_ref
            AND ep.code_article = e.code_article
        LEFT JOIN fmp_physique fp
            ON fp.smr = f.smr
            AND fp.code_article = f.code_article

        UNION ALL

        -- 2️⃣ Lignes FMP sans EAM
        SELECT
            f.smr,
            f.code_article,

            0 AS qte_eam,
            f.qte_fmp,
            f.qte_fmp AS ecart_logique,

            0 AS qte_physique_eam,
            0 AS ecart_physique_eam,

            IFNULL(fp.qte_physique_fmp, 0) AS qte_physique_fmp,
            (IFNULL(fp.qte_physique_fmp, 0) - f.qte_fmp) AS ecart_physique_fmp,

            'ABSENT_EAM' AS statut_logique

        FROM fmp_agg f
        LEFT JOIN eam_agg e
            ON e.smr_ref = f.smr
            AND e.code_article = f.code_article
        LEFT JOIN fmp_physique fp
            ON fp.smr = f.smr
            AND fp.code_article = f.code_article
        WHERE e.code_article IS NULL

        ORDER BY smr, code_article
        `;


        db.query(query, params, (err, rows) => {
            if (err) {
                console.error("Reconciliation error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Erreur serveur lors de la réconciliation",
                });
            }

            res.status(200).json({
                success: true,
                total: rows.length,
                data: rows,
            });
        });

    } catch (error) {
        console.error("Reconciliation controller error:", error);
        res.status(500).json({
            success: false,
            message: "Erreur interne",
        });
    }
};

/* exports.getItemCodeTotals = (req, res) => {
    const { item_code, dateRange = [] } = req.query;

    if (!item_code) {
        return res.status(400).json({
            success: false,
            message: "item_code requis"
        });
    }

    if (Array.isArray(dateRange) && dateRange.length === 2) {

    }

    const query = `
        SELECT
            ? AS item_code,
            IFNULL(e.total_qte_eam, 0) AS total_qte_eam,
            IFNULL(f.total_qte_fmp, 0) AS total_qte_fmp,
            (IFNULL(f.total_qte_fmp, 0) - IFNULL(e.total_qte_eam, 0)) AS ecart
        FROM (SELECT 1) x
        LEFT JOIN (
            SELECT part AS item_code,
                   SUM(ABS(quantite_out)) AS total_qte_eam
            FROM sortie_eam
            WHERE part = ?
        ) e ON 1 = 1
        LEFT JOIN (
            SELECT item_code,
                   SUM(nbre_colis) AS total_qte_fmp
            FROM sortie_fmp
            WHERE item_code = ?
        ) f ON 1 = 1
    `;

    db.query(query, [item_code, item_code, item_code], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    });
}; */

exports.getItemCodeTotals = (req, res) => {
    const { item_code, dateRange = [] } = req.query;

    if (!item_code) {
        return res.status(400).json({ success: false, message: "item_code requis" });
    }

    // Préparer les filtres de date
    let dateFilterEam = "";
    let dateFilterFmp = "";
    let params = [item_code, item_code, item_code, item_code, item_code];

    if (Array.isArray(dateRange) && dateRange.length === 2) {
        dateFilterEam = " AND date_operation BETWEEN ? AND ? ";
        dateFilterFmp = " AND date_sortie BETWEEN ? AND ? ";
        params = [
            item_code,
            dateRange[0], dateRange[1], // pour total_qte_eam
            item_code,
            dateRange[0], dateRange[1], // pour total_qte_fmp
            item_code,
            dateRange[0], dateRange[1], // pour ecart FMP
            item_code,
            dateRange[0], dateRange[1]  // pour ecart EAM
        ];
    }

    const query = `
        SELECT 
            ? AS item_code,
            (SELECT IFNULL(SUM(ABS(quantite_out)),0) 
             FROM sortie_eam 
             WHERE part = ? ${dateFilterEam}) AS total_qte_eam,
            (SELECT IFNULL(SUM(nbre_colis),0) 
             FROM sortie_fmp 
             WHERE item_code = ? ${dateFilterFmp}) AS total_qte_fmp,
            ((SELECT IFNULL(SUM(nbre_colis),0) 
              FROM sortie_fmp 
              WHERE item_code = ? ${dateFilterFmp}) -
             (SELECT IFNULL(SUM(ABS(quantite_out)),0) 
              FROM sortie_eam 
              WHERE part = ? ${dateFilterEam})) AS ecart
    `;

    db.query(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false });
        }
        res.json({ success: true, data: rows[0] });
    });
};


exports.getGlobalItemsReconciliation = (req, res) => {
    const query = `
        SELECT
            COALESCE(e.item_code, f.item_code) AS item_code,
            IFNULL(e.total_qte_eam, 0) AS total_qte_eam,
            IFNULL(f.total_qte_fmp, 0) AS total_qte_fmp,
            (IFNULL(f.total_qte_fmp, 0) - IFNULL(e.total_qte_eam, 0)) AS ecart
        FROM (
            SELECT part AS item_code, SUM(ABS(quantite_out)) AS total_qte_eam
            FROM sortie_eam
            GROUP BY part
        ) e
        LEFT JOIN (
            SELECT item_code, SUM(nbre_colis) AS total_qte_fmp
            FROM sortie_fmp
            GROUP BY item_code
        ) f ON f.item_code = e.item_code

        UNION ALL

        SELECT
            f.item_code,
            0,
            f.total_qte_fmp,
            f.total_qte_fmp
        FROM (
            SELECT item_code, SUM(nbre_colis) AS total_qte_fmp
            FROM sortie_fmp
            GROUP BY item_code
        ) f
        LEFT JOIN (
            SELECT part AS item_code FROM sortie_eam GROUP BY part
        ) e ON e.item_code = f.item_code
        WHERE e.item_code IS NULL
        ORDER BY item_code
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false });
        }

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
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