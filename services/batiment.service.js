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

exports.createEquipement = async (data) => {
    const sql = `
        INSERT INTO equipments
        (
            id_bureau,
            id_bin,
            id_batiment,
            id_type_equipement,
            model,
            num_serie,
            installation_date, 
            maintenance_date,
            date_prochaine_maintenance,
            location,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
      
    const values = [
        data.id_bureau,
        data.id_bin,
        data.id_batiment,
        data.id_type_equipement,
        data.model,
        data.num_serie,
        data.installation_date,
        data.maintenance_date,
        data.date_prochaine_maintenance,
        data.location,
        data.status
    ];

    const result = await queryAsync(sql, values);
    return result;
};

exports.updateEquipement = async (id, data) => {
    const sql = `
        UPDATE equipments 
        SET 
            model = ?,
            num_serie = ?,
            installation_date = ?,
            maintenance_date = ?,
            date_prochaine_maintenance = ?,
            location = ?,
            type_stockage = ?,
            status = ?
        WHERE id_equipement = ?
    `;

    const values = [
        data.model,
        data.num_serie,
        data.installation_date,
        data.maintenance_date,
        data.date_prochaine_maintenance,
        data.location,
        data.type_stockage,
        data.status,
        id
    ];

    const result = await queryAsync(sql, values);
    return result;
};
