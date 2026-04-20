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
};

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
        data.status,
        id
    ];

    const result = await queryAsync(sql, values);
    return result;
};

//Plan
exports.getBatimentPlans = async (filters) => {
    const {
        searchValue,
        selectedBatiment,
        currentPage = 1,
        pageSize = 10
    } = filters;

    let whereClauses = [];
    let values = [];

    if (searchValue) {
        whereClauses.push(`bp.nom_document LIKE ?`);
        values.push(`%${searchValue}%`);
    }

    if (selectedBatiment && (Array.isArray(selectedBatiment) ? selectedBatiment.length : true)) {
        const ids = Array.isArray(selectedBatiment)
            ? selectedBatiment
            : [selectedBatiment];

        whereClauses.push(`bp.id_batiment IN (${ids.map(() => '?').join(', ')})`);
        values.push(...ids);
    }

    const whereClause = whereClauses.length
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';

    const limit = parseInt(pageSize);
    const offset = (parseInt(currentPage) - 1) * limit;

    const countSql = `
        SELECT COUNT(*) AS total 
        FROM batiment_plans bp 
        ${whereClause}
    `;

    const dataSql = `
        SELECT bp.*
        FROM batiment_plans bp
        ${whereClause}
        ORDER BY bp.date_ajout DESC
        LIMIT ? OFFSET ?
    `;

    const [countResult, data] = await Promise.all([
        queryAsync(countSql, values),
        queryAsync(dataSql, [...values, limit, offset])
    ]);

    return {
        rows: data,
        total: countResult[0].total
    };
};

exports.getBatimentPlansByBatimentId = async (id_batiment) => {
    const sql = `
        SELECT 
            bp.nom_document,
            bp.type_document,
            bp.chemin_document,
            bp.date_ajout,
            b.nom_batiment
        FROM batiment_plans bp
        INNER JOIN batiment b 
            ON bp.id_batiment = b.id_batiment
        WHERE bp.id_batiment = ?
    `;

    const result = await queryAsync(sql, [id_batiment]);
    return result;
};

exports.createBatimentPlans = async (documents) => {
    const sql = `
        INSERT INTO batiment_plans
        (id_batiment, nom_document, type_document, chemin_document)
        VALUES ?
    `;

    const values = documents.map(doc => ([
        doc.id_batiment,
        doc.nom_document,
        doc.type_document,
        doc.chemin_document
    ]));

    const result = await queryAsync(sql, [values]);
    return result;
};