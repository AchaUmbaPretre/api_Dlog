const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

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
            s.quantite_out,
            s.quantite_in,
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
            MAX(s.transanction_date) AS last_transaction_date
        FROM sortie_eam s
        GROUP BY s.part, s.smr_ref
        ORDER BY last_transaction_date DESC;
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

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
            s.commentaire
        FROM sortie_fmp s
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
        SELECT 
            s.smr
        FROM sortie_fmp s
        GROUP BY s.smr
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

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
        smr = smr.split(','); // supposer que l'API reçoit "123,124,125"
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

    // Définir les paramètres seulement si filtre smr existe
    const params = smr && smr.length ? [smr, smr, smr, smr] : [];

    db.query(query, params, (error, data) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        return res.status(200).json(data);
    });
};
