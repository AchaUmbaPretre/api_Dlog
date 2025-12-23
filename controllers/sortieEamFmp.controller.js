const { db } = require("./../config/database");
const { promisify } = require('util');
const query = promisify(db.query).bind(db);

exports.getSortieEam = (req, res) => {
    const q = `
        SELECT 
            s.*,
            COUNT(*) AS total_sorties,
            MAX(s.transanction_date) AS last_transaction_date
        FROM sortie_eam s
        GROUP BY s.part, s.smr_ref
        ORDER BY s.transanction_date DESC
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

}

exports.getReconciliation = (req, res) => {
    const { smr } = req.body;

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
