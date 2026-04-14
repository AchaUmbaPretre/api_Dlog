const { queryAsync } = require("../config/database");

exports.getEquipements = async () => {
    const q = `
                SELECT equipments.model, equipments.num_serie, 
                    equipments.id_equipement, equipments.installation_date, 
                    equipments.maintenance_date, equipments.date_prochaine_maintenance, bins.nom AS location, batiment.nom_batiment, statut_equipement.nom_statut, articles.nom_article FROM equipments 
                    LEFT JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                    LEFT JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                    LEFT JOIN articles ON equipments.id_type_equipement = articles.id_article
                    LEFT JOIN bins ON equipments.id_bin = bins.id
            `;
  return await queryAsync(q);
};

exports.getEquipementById = async (id) => {
    const sql = `
        SELECT * 
        FROM equipments 
        WHERE id_equipement = ?
    `;

    const result = await queryAsync(sql, [id]);
    return result;
};

exports.getEquipementOne = async(id) => {
    const sql = `
            SELECT equipments.model, equipments.num_serie, 
                equipments.id_equipement, equipments.installation_date, 
                equipments.maintenance_date, equipments.date_prochaine_maintenance, bins.nom AS location, batiment.nom_batiment, statut_equipement.nom_statut, articles.nom_article FROM equipments 
                INNER JOIN batiment ON equipments.id_batiment = batiment.id_batiment
                INNER JOIN statut_equipement ON equipments.status = statut_equipement.id_statut_equipement
                INNER JOIN articles ON equipments.id_type_equipement = articles.id_article
                INNER JOIN bins ON equipments.id_bin = bins.id
            WHERE 
                equipments.id_batiment= ?
            `;
    const result = await queryAsync(sql, [id]);
    return result;
}