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
        ORDER BY last_transaction_date DESC
    `;

    db.query(q, (error, data) => {
        if(error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    })

}

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

}