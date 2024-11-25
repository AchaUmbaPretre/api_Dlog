const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { db } = require("./../config/database");

/* exports.getTacheChart = (req, res) => {
    const q = `SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE 
            tache.est_supprime = 0 
        GROUP BY typeC.nom_type_statut`

        db.query(q, (error, data) => {
                if (error) res.status(500).send(error);
                return res.status(200).json(data);
            });
} */
// Exemple d'implémentation dans un contrôleur ou un service
exports.getTacheChart = (req, res) => {
    const { filter, dateRange } = req.query;

    let whereClause = "tache.est_supprime = 0";

    const today = new Date();

    if (filter === 'today') {
        whereClause += ` AND DATE(tache.date_creation) = DATE('${today.toISOString().split('T')[0]}')`;
    } else if (filter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        whereClause += ` AND DATE(tache.date_creation) = DATE('${yesterday.toISOString().split('T')[0]}')`;
    } else if (filter === '7days') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        whereClause += ` AND tache.date_creation >= DATE('${sevenDaysAgo.toISOString().split('T')[0]}')`;
    } else if (filter === '30days') {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        whereClause += ` AND tache.date_creation >= DATE('${thirtyDaysAgo.toISOString().split('T')[0]}')`;
    } else if (filter === 'range' && dateRange && dateRange.length === 2) {
        const startDate = new Date(dateRange[0]);
        const endDate = new Date(dateRange[1]);
        whereClause += ` AND tache.date_creation >= DATE('${startDate.toISOString().split('T')[0]}') AND tache.date_creation <= DATE('${endDate.toISOString().split('T')[0]}')`;
    }

    const q = `
      SELECT 
          typeC.nom_type_statut AS statut,
          COUNT(*) AS nombre_taches,
          (SELECT COUNT(*) FROM tache WHERE ${whereClause}) AS total_taches
      FROM 
          tache
      LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
      WHERE 
          ${whereClause}
      GROUP BY typeC.nom_type_statut
    `;

    db.query(q, (error, data) => {
        if (error) return res.status(500).send(error);
        
        const totalTasks = data.length > 0 ? data[0].total_taches : 0;

        return res.status(200).json({ totalTasks, data });
    });
};

exports.getTacheFilter = (req, res) => {
    const { statut, dateDebut, dateFin } = req.query;

    let q = `
        SELECT 
            tache.id_tache, 
            tache.description, 
            tache.date_debut, 
            tache.date_fin,
            tache.nom_tache, 
            tache.priorite,
            tache.id_tache_parente,
            typeC.nom_type_statut AS statut, 
            client.nom AS nom_client, 
            frequence.nom AS frequence, 
            utilisateur.nom AS owner, 
            provinces.name AS ville, 
            departement.nom_departement AS departement,
            cb.controle_de_base,
            cb.id_controle,
            DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
            ct.nom_cat_tache,
            cm.nom_corps_metier,
            tg.nom_tag          
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        LEFT JOIN client ON tache.id_client = client.id_client
        INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
        LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
        LEFT JOIN provinces ON tache.id_ville = provinces.id
        LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
        LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
        LEFT JOIN departement ON tache.id_departement = departement.id_departement
        LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
        LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
        LEFT JOIN tache_tags tt ON tache.id_tache = tt.id_tache
        LEFT JOIN tags tg ON tt.id_tag = tg.id_tag
        WHERE 
            tache.est_supprime = 0
            AND (typeC.nom_type_statut = ? OR ? IS NULL)
            AND (tache.date_debut >= ? OR ? IS NULL)
            AND (tache.date_fin <= ? OR ? IS NULL)
    `;

    const params = [
        statut || null,
        statut || null,
        dateDebut || null,
        dateDebut || null,
        dateFin || null, 
        dateFin || null  
    ];

    db.query(q, params, (error, data) => {
        if (error) {
            console.error('Erreur lors de la récupération des tâches:', error);
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}
            
exports.getTacheCount = (req, res) => {
    const { searchValue } = req.query;
    
    let q = `
        SELECT 
            COUNT(id_tache) AS nbre_tache
        FROM tache
            WHERE est_supprime = 0
        `;

    const params = [];

    if (searchValue) {
        q += ` AND (nom_tache LIKE ?)`;
        params.push(`%${searchValue}%`, `%${searchValue}%`);
    }
     
    db.query(q, params, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

/* exports.getTache = (req, res) => {

    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    WHERE 
        tache.est_supprime = 0 `;

    // Ajout de conditions dynamiques pour les filtres
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    query += ` GROUP BY tache.id_tache ORDER BY tache.date_creation DESC;`;

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}; */

/* exports.getTache = (req, res) => {

    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
        ct.nom_cat_tache,
        cm.nom_corps_metier
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
    LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
    WHERE 
        tache.est_supprime = 0 `;

    // Ajout de conditions dynamiques pour les filtres
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    let statsQuery = `
        SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        statsQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        statsQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        statsQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        statsQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        statsQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        statsQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    statsQuery += ` GROUP BY typeC.nom_type_statut;`;

    // Requête pour obtenir le total des tâches trouvées
    let totalQuery = `
        SELECT 
            COUNT(*) AS total_taches
        FROM 
            tache
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        totalQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        totalQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        totalQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        totalQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        totalQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        totalQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        db.query(statsQuery, (statsError, statsData) => {
            if (statsError) {
                return res.status(500).send(statsError);
            }
            db.query(totalQuery, (totalError, totalData) => {
                if (totalError) {
                    return res.status(500).send(totalError);
                }
                return res.status(200).json({
                    total_taches: totalData[0]?.total_taches || 0,
                    taches: data,
                    statistiques: statsData
                });
            });
        });
    });
}; */

/* exports.getTache = (req, res) => {
    const {id_user} = req.query;
    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
        ct.nom_cat_tache,
        cm.nom_corps_metier,
        tg.nom_tag          
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
    LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
    LEFT JOIN tache_tags tt ON tache.id_tache = tt.id_tache
    LEFT JOIN tags tg ON tt.id_tag = tg.id_tag
    LEFT JOIN permissions_tache pt ON tache.id_tache = pt.id_tache
    WHERE 
        tache.est_supprime = 0`;

    // Ajout de conditions dynamiques pour les filtres
    if (id_user) {
        query += ` AND pt.id_user = ${id_user}`;
    }
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    query += ` ORDER BY tache.date_creation DESC`;

    let statsQuery = `
        SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        statsQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        statsQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        statsQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        statsQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        statsQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        statsQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    statsQuery += ` GROUP BY typeC.nom_type_statut;`;

    // Requête pour obtenir le total des tâches trouvées
    let totalQuery = `
        SELECT 
            COUNT(*) AS total_taches
        FROM 
            tache
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        totalQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        totalQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        totalQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        totalQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        totalQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        totalQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        db.query(statsQuery, (statsError, statsData) => {
            if (statsError) {
                return res.status(500).send(statsError);
            }
            db.query(totalQuery, (totalError, totalData) => {
                if (totalError) {
                    return res.status(500).send(totalError);
                }
                return res.status(200).json({
                    total_taches: totalData[0]?.total_taches || 0,
                    taches: data,
                    statistiques: statsData
                });
            });
        });
    });
}; */

exports.getTache = (req, res) => {
    const { id_user, role } = req.query; // Nous récupérons le rôle de l'utilisateur ici.
    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
        ct.nom_cat_tache,
        cm.nom_corps_metier,
        tg.nom_tag,
        pt.	can_view,
        pt.can_edit,
        pt.can_comment,
        pt.	id_user
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
    LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
    LEFT JOIN tache_tags tt ON tache.id_tache = tt.id_tache
    LEFT JOIN tags tg ON tt.id_tag = tg.id_tag
    LEFT JOIN permissions_tache pt ON tache.id_tache = pt.id_tache
    WHERE 
        tache.est_supprime = 0`;

    // Vérifiez si l'utilisateur est admin
    if (role !== 'Admin' && id_user) {
        query += ` AND pt.id_user = ${db.escape(id_user)} AND pt.can_view = 1`;
    }

    // Ajout des filtres dynamiques
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    query += ` ORDER BY tache.date_creation DESC`;

    let statsQuery = `
        SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE 
            tache.est_supprime = 0`;

    if (departement) {
        statsQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        statsQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        statsQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        statsQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        statsQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        statsQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    statsQuery += ` GROUP BY typeC.nom_type_statut;`;

    let totalQuery = `
        SELECT 
            COUNT(*) AS total_taches
        FROM 
            tache
        WHERE 
            tache.est_supprime = 0`;

    if (departement) {
        totalQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        totalQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        totalQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        totalQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        totalQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        totalQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        db.query(statsQuery, (statsError, statsData) => {
            if (statsError) {
                return res.status(500).send(statsError);
            }
            db.query(totalQuery, (totalError, totalData) => {
                if (totalError) {
                    return res.status(500).send(totalError);
                }
                return res.status(200).json({
                    total_taches: totalData[0]?.total_taches || 0,
                    taches: data,
                    statistiques: statsData
                });
            });
        });
    });
};

exports.getTachePermiAll = (req, res) => {
    const { departement, client, statut, priorite, dateRange, owners } = req.body;

    let query = `SELECT 
        tache.id_tache, 
        tache.description, 
        tache.date_debut, 
        tache.date_fin,
        tache.nom_tache, 
        tache.priorite,
        tache.id_tache_parente,
        typeC.nom_type_statut AS statut, 
        client.nom AS nom_client, 
        frequence.nom AS frequence, 
        utilisateur.nom AS owner, 
        provinces.name AS ville, 
        departement.nom_departement AS departement,
        cb.controle_de_base,
        cb.id_controle,
        DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
        ct.nom_cat_tache,
        cm.nom_corps_metier,
        tg.nom_tag          
    FROM 
        tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    LEFT JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
    LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
    LEFT JOIN departement ON tache.id_departement = departement.id_departement
    LEFT JOIN categorietache AS ct ON tache.id_cat_tache = ct.id_cat_tache
    LEFT JOIN corpsmetier AS cm ON tache.id_corps_metier = cm.id_corps_metier
    LEFT JOIN tache_tags tt ON tache.id_tache = tt.id_tache
    LEFT JOIN tags tg ON tt.id_tag = tg.id_tag
    LEFT JOIN permissions_tache pt ON tache.id_tache = pt.id_tache
    WHERE 
        tache.est_supprime = 0`;

    // Ajout de conditions dynamiques pour les filtres
    if (departement) {
        query += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        query += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        query += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        query += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        query += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        query += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    query += ` GROUP BY tache.id_tache`;

    query += ` ORDER BY tache.date_creation DESC`;

    let statsQuery = `
        SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        statsQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        statsQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        statsQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        statsQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        statsQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        statsQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    statsQuery += ` GROUP BY typeC.nom_type_statut;`;

    // Requête pour obtenir le total des tâches trouvées
    let totalQuery = `
        SELECT 
            COUNT(*) AS total_taches
        FROM 
            tache
        WHERE 
            tache.est_supprime = 0 `;

    if (departement) {
        totalQuery += ` AND tache.id_departement IN (${departement.map(d => db.escape(d)).join(',')})`;
    }
    if (client) {
        totalQuery += ` AND tache.id_client IN (${client.map(c => db.escape(c)).join(',')})`;
    }
    if (statut) {
        totalQuery += ` AND tache.statut IN (${statut.map(s => db.escape(s)).join(',')})`;
    }
    if (priorite) {
        totalQuery += ` AND tache.priorite IN (${priorite.map(p => db.escape(p)).join(',')})`;
    }
    if (dateRange && dateRange.length === 2) {
        totalQuery += ` AND tache.date_debut >= ${db.escape(dateRange[0])} AND tache.date_fin <= ${db.escape(dateRange[1])}`;
    }
    if (owners) {
        totalQuery += ` AND tache.responsable_principal IN (${owners.map(o => db.escape(o)).join(',')})`;
    }

    db.query(query, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        db.query(statsQuery, (statsError, statsData) => {
            if (statsError) {
                return res.status(500).send(statsError);
            }
            db.query(totalQuery, (totalError, totalData) => {
                if (totalError) {
                    return res.status(500).send(totalError);
                }
                return res.status(200).json({
                    total_taches: totalData[0]?.total_taches || 0,
                    taches: data,
                    statistiques: statsData
                });
            });
        });
    });
};

exports.getAllTache = (req, res) => {
    const { id_tache } = req.query;

    const tacheIds = id_tache.split(',').map(Number);

    const q = `SELECT 
                t1.id_tache, 
                t1.nom_tache, 
                t1.description, 
                t1.date_debut, 
                t1.date_fin,
                t1.priorite,
                t1.id_tache_parente,
                typeC.nom_type_statut AS statut, 
                client.nom AS nom_client, 
                frequence.nom AS frequence, 
                utilisateur.nom AS owner, 
                provinces.name AS ville, 
                departement.nom_departement AS departement,
                cb.controle_de_base,
                cb.id_controle,
                DATEDIFF(t1.date_fin, t1.date_debut) AS nbre_jour,
                t2.nom_tache AS sous_tache,
                t2.description AS sous_tache_description,
                ts1.nom_type_statut AS sous_tache_statut,
                t2.date_debut AS sous_tache_dateDebut,
                t2.date_fin AS sous_tache_dateFin,
                suivi_tache.id_suivi,
                suivi_tache.commentaire AS suivi_commentaire,
                suivi_tache.pourcentage_avancement AS suivi_pourcentage_avancement
            FROM 
            tache t1
                LEFT JOIN type_statut_suivi AS typeC ON t1.statut = typeC.id_type_statut_suivi
                LEFT JOIN client ON t1.id_client = client.id_client
                INNER JOIN frequence ON t1.id_frequence = frequence.id_frequence
                LEFT JOIN utilisateur ON t1.responsable_principal = utilisateur.id_utilisateur
                LEFT JOIN provinces ON t1.id_ville = provinces.id
                LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
                LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
                LEFT JOIN departement ON t1.id_departement = departement.id_departement  
                LEFT JOIN tache t2 ON t1.id_tache = t2.id_tache_parente 
                LEFT JOIN suivi_tache ON t1.id_tache = suivi_tache.id_tache
                LEFT JOIN type_statut_suivi ts1 ON t2.statut = ts1.id_type_statut_suivi
            WHERE 
                t1.est_supprime = 0 AND t1.id_tache IN (?)
            GROUP BY 
                    t1.id_tache,t2.id_tache
            ORDER BY 
                t1.date_creation DESC;

        `;

    db.query(q, [tacheIds], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTacheDoc = (req, res) => {
    const q = `
                SELECT tache_documents.*, tache.nom_tache, tache.id_tache, tache.nom_tache FROM tache_documents
            INNER JOIN tache ON tache_documents.id_tache = tache.id_tache
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getDetailTacheDoc = (req, res) => {
    const {id_tache} = req.query;
    const q = `
                SELECT tache_documents.*, tache.nom_tache, tache.id_tache FROM tache_documents
            INNER JOIN tache ON tache_documents.id_tache = tache.id_tache
            WHERE tache_documents.id_tache = ${id_tache}
            `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.getTacheOneV = (req, res) => {
    const {id_tache} = req.query;

    const q = `
            SELECT 
                *
            FROM 
                tache
                WHERE tache.id_tache =${id_tache}
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

/* exports.getTacheOne = (req, res) => {
    const {id_tache} = req.query;

    const q = `
            SELECT 
                tache.id_tache, 
                tache.description, 
                tache.date_debut, 
                tache.date_fin,
                tache.nom_tache, 
                typeC.nom_type_statut AS statut, 
                client.nom AS nom_client, 
                frequence.nom AS frequence, 
                utilisateur.nom AS owner, 
                provinces.name AS ville, 
                departement.nom_departement AS departement,
                cb.controle_de_base,
                cb.id_controle,
                DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
            FROM 
                tache
            LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
            LEFT JOIN client ON tache.id_client = client.id_client
            INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
            LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
            LEFT JOIN provinces ON tache.id_ville = provinces.id
            LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
            LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
            LEFT JOIN departement ON tache.id_departement = departement.id_departement  -- Utilisation de tache.id_departement
                WHERE 
            tache.id_tache = ?
            GROUP BY tache.id_tache
        `;                        
    db.query(q,[id_tache], (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
} */

exports.getTacheOne = (req, res) => {
    const { id_tache } = req.query;
    
        if (!id_tache) {
            return res.status(400).json({ error: "L'ID de la tâche est requis." });
        }
    
        const q = `
            SELECT 
                tache.id_tache, 
                tache.description, 
                tache.date_debut, 
                tache.date_fin,
                tache.nom_tache, 
                typeC.nom_type_statut AS statut, 
                client.nom AS nom_client, 
                frequence.nom AS frequence, 
                utilisateur.nom AS owner, 
                provinces.name AS ville, 
                departement.nom_departement AS departement,
                cb.controle_de_base,
                cb.id_controle,
                DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
            FROM 
                tache
            LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
            LEFT JOIN client ON tache.id_client = client.id_client
            INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
            LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
            LEFT JOIN provinces ON tache.id_ville = provinces.id
            LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
            LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
            LEFT JOIN departement ON tache.id_departement = departement.id_departement
            WHERE 
                tache.id_tache = ?
            GROUP BY tache.id_tache
        `;
    
        const qCat = `
                SELECT categorie_tache.id_categorie_tache, categorie_tache.id_tache, categorietache.nom_cat_tache, categorie_tache.cout
                    FROM categorie_tache
                INNER JOIN categorietache ON categorie_tache.id_cat = categorietache.id_cat_tache
                WHERE categorie_tache.id_tache = ?
        `;
    
        const countTache = `
            SELECT SUM(cout) AS cout_total
            FROM categorie_tache
            WHERE id_tache = ?
        `;
    
        db.query(q, [id_tache], (error, data) => {
            if (error) {
                return res.status(500).json({ error: "Erreur lors de la récupération de la tâche", details: error });
            }
    
            // Vérification si des données existent
            if (data.length === 0) {
                return res.status(404).json({ message: "Tâche non trouvée" });
            }
    
            // Récupération des catégories de dépenses associées
            db.query(qCat, [id_tache], (errorCat, categories) => {
                if (errorCat) {
                    return res.status(500).json({ error: "Erreur lors de la récupération des catégories de dépenses", details: errorCat });
                }
    
                // Calcul du coût total des dépenses pour la tâche
                db.query(countTache, [id_tache], (errorCount, countResult) => {
                    if (errorCount) {
                        return res.status(500).json({ error: "Erreur lors du calcul du coût total", details: errorCount });
                    }
    
                    const cout_total = countResult[0]?.cout_total || 0;
    
                    return res.status(200).json({
                        tache: data,   // Informations sur la tâche
                        categories,       // Catégories de dépenses
                        cout_total        // Coût total des dépenses
                    });
                });
            });
        });
};
    
exports.getTacheControleOne = (req, res) => {
    const {id_controle} = req.query;

    const q = `
        SELECT 
    tache.id_tache, 
    tache.description, 
    tache.date_debut, 
    tache.date_fin,
    tache.nom_tache, 
    typeC.nom_type_statut AS statut, 
    client.nom AS nom_client, 
    frequence.nom AS frequence, 
    utilisateur.nom AS owner, 
    provinces.name AS ville, 
    COALESCE(departement.nom_departement, dp_ac.nom_departement) AS departement, 
    cb.controle_de_base,
    cb.id_controle,
    DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour
FROM 
    tache
    LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
    LEFT JOIN client ON tache.id_client = client.id_client
    INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
    INNER JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
    INNER JOIN provinces ON tache.id_ville = provinces.id
    LEFT JOIN controle_client ON client.id_client = controle_client.id_client
    LEFT JOIN departement ON utilisateur.id_utilisateur = departement.responsable
    LEFT JOIN controle_de_base AS cb ON tache.id_control = cb.id_controle
    LEFT JOIN departement AS dp_ac ON dp_ac.id_departement = cb.id_departement
    WHERE cb.id_controle = ${id_controle}
GROUP BY 
    tache.id_tache
        `;
     
    db.query(q, (error, data) => {
        if (error) res.status(500).send(error);
        return res.status(200).json(data);
    });
}

exports.postTache = async (req, res) => {

    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`, `id_tache_parente`, `id_departement`, `id_client`, `id_frequence`, `id_control`, `id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`, `id_batiment`, `id_ville`, `id_cat_tache`, `id_corps_metier`, `doc`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const qCat = 'INSERT INTO categorie_tache(`id_tache`, `id_cat`, `cout`) VALUES (?, ?, ?)';
        
        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_tache_parente,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_control,
            req.body.id_projet,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            req.body.id_cat_tache,
            req.body.id_corps_metier,
            req.body.doc
        ];

        db.query(q, values, (error, data) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ error: "Erreur lors de l'insertion de la tâche." });
            } else {
                const insertId = data.insertId;

                // Vérifiez que categories est un tableau et a des éléments
                if (Array.isArray(req.body.categories) && req.body.categories.length > 0) {
                    const categoryQueries = req.body.categories.map(datas => {
                        return new Promise((resolve, reject) => {
                            const catValues = [insertId, datas.id_cat, datas.cout];
                            db.query(qCat, catValues, (errorCat) => {
                                if (errorCat) {
                                    console.log(errorCat);
                                    reject(errorCat);
                                } else {
                                    resolve();
                                }
                            });
                        });
                    });

                    // Attendre que toutes les requêtes d'insertion des catégories soient complétées
                    Promise.all(categoryQueries)
                        .then(() => {
                            return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
                        })
                        .catch(() => {
                            return res.status(500).json({ error: "Erreur lors de l'insertion des catégories." });
                        });
                } else {
                    return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

/*1 exports.postTache = async (req, res) => {
    console.log(req.body.categories)

    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_tache_parente`, `id_departement`,`id_client`, `id_frequence`,`id_control`,`id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`,`id_batiment`, `id_ville`,`id_cat_tache`,`id_corps_metier`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        const qCat ='INSERT INTO categorie_tache(`id_tache`, `id_cat`, `cout`)'

        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_tache_parente,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_control,
            req.body.id_projet,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            req.body.id_cat_tache,
            req.body.id_corps_metier,
            req.body.doc
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
            }
            else{
                const insertId = data.insertId;
                if(req.body.categories.length > 0){
                    req.body.categories.forEach(datas => {
                        const catValues = [insertId, datas.id_cat, datas.cout]
                        db.query(qCat, catValues, (errorCat, dataCat)=> {
                            if(errorCat){
                                console.log(errorCat)
                            }
                        })
                    })
                }
                return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
            }
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
}; */

/* exports.postTache = async (req, res) => {
    const tags = req.body.tags;

    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`, `id_tache_parente`, `id_departement`, `id_client`, `id_frequence`, `id_control`, `id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`, `id_batiment`, `id_ville`, `id_cat_tache`, `id_corps_metier`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
        const qTag = 'INSERT INTO tags(`nom_tag`) VALUES(?)';
        const qTagTache = 'INSERT INTO tache_tags(`id_tache`, `id_tag`) VALUES(?, ?)';

        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_tache_parente,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.id_control,
            req.body.id_projet,
            req.body.id_point_supervision,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            req.body.id_cat_tache,
            req.body.id_corps_metier,
            req.body.doc
        ];

        // Insertion de la tâche
        db.query(q, values, (error, data) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
            }

            const idTache = data.insertId;

            // Si des tags sont fournis, insérer chaque tag et associer avec la tâche
            if (Array.isArray(tags) && tags.length > 0) {
                const tagInsertions = tags.map(tag => {
                    return new Promise((resolve, reject) => {
                        db.query(qTag, [tag], (err, tagData) => {
                            if (err) {
                                console.log(err);
                                reject(err);
                            } else {
                                const idTag = tagData.insertId;
                                // Associer le tag à la tâche
                                db.query(qTagTache, [idTache, idTag], (errTagTache) => {
                                    if (errTagTache) {
                                        console.log(errTagTache);
                                        reject(errTagTache);
                                    } else {
                                        resolve();
                                    }
                                });
                            }
                        });
                    });
                });

                // Attendre que toutes les insertions de tags soient terminées
                Promise.all(tagInsertions)
                    .then(() => {
                        return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
                    })
                    .catch(err => {
                        console.log(err);
                        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout des tags." });
                    });
            } else {
                // Pas de tags, juste retourner la réponse
                return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
}; */

exports.postTacheExcel = async (req, res) => {
    try {

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier téléchargé' });
        }

        const filePath = req.files[0].path; // Récupérer le chemin du fichier téléchargé
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Lire la première feuille
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Boucler sur chaque ligne de données du fichier Excel et insérer dans la base de données
        const query = `INSERT INTO tache(nom_tache, description, statut, date_debut, date_fin, priorite, id_tache_parente, id_departement, id_client, id_frequence, id_control, id_projet, id_point_supervision, responsable_principal, id_demandeur, id_batiment, id_ville, doc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        sheetData.forEach((row) => {
            const values = [
                row['nom_tache'],
                row['description'],
                row['statut'] || 1,
                row['date_debut'],
                row['date_fin'],
                row['priorite'],
                row['id_tache_parente'],
                row['id_departement'],
                row['id_client'],
                row['id_frequence'],
                row['id_control'],
                row['id_projet'],
                row['id_point_supervision'],
                row['responsable_principal'],
                row['id_demandeur'],
                row['id_batiment'],
                row['id_ville'],
                row['doc']
            ];

            // Insérer les données dans la base MySQL
            db.query(query, values, (error, data) => {
                if (error) {
                    console.error('Erreur lors de l\'insertion dans la base de données:', error);
                }
            });
        });

        // Supprimer le fichier temporaire après traitement
        fs.unlinkSync(filePath);

        return res.status(201).json({ message: 'Tâches ajoutées avec succès à partir du fichier Excel' });
    } catch (error) {
        console.error('Erreur lors de l\'importation des tâches :', error);
        return res.status(500).json({ error: 'Une erreur est survenue lors de l\'importation des tâches.' });
    }
};

exports.putTache = async (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }

    try {
        const q = `
            UPDATE tache 
            SET 
                nom_tache = ?,
                description = ?,
                statut = ?,
                date_debut = ?,
                date_fin = ?,
                priorite = ?,
                id_departement = ?,
                id_client = ?,
                id_frequence = ?,
                responsable_principal = ?,
                id_demandeur = ?,
                id_batiment = ?,
                id_ville = ?
            WHERE id_tache = ?
        `;
      
        const values = [
            req.body.nom_tache,
            req.body.description,
            req.body.statut || 1,
            req.body.date_debut,
            req.body.date_fin,
            req.body.priorite,
            req.body.id_departement,
            req.body.id_client,
            req.body.id_frequence,
            req.body.responsable_principal,
            req.body.id_demandeur,
            req.body.id_batiment,
            req.body.id_ville,
            id_tache
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Tache record not found' });
            }
            return res.json({ message: 'Tache record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

exports.putTacheDesc = async (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }

    try {
        const q = `
            UPDATE tache 
            SET 
                description = ?
            WHERE id_tache = ?
        `;
      
        const values = [
            req.body.description,
            id_tache
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
                return res.status(404).json({ error: 'Tache record not found' });
            }
            return res.json({ message: 'Tache record updated successfully' });
        })
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
}

exports.putTachePriorite = async (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }

    const priorite = Object.keys(req.body)[0];

    if (!priorite) {
        return res.status(400).json({ error: 'No priorite value provided' });
    }

    try {
        const q = `
            UPDATE tache
            SET 
                priorite = ?
            WHERE id_tache = ?
        `;

        const values = [
            priorite,
            id_tache
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Priority record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Priority record not found' });
            }

            return res.json({ message: 'Priority record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating priority:", err);
        return res.status(500).json({ error: 'Failed to update Priority record' });
    }
};

exports.deleteUpdateTache = (req, res) => {
    const {id} = req.query;
  
    const q = "UPDATE tache SET est_supprime = 1 WHERE id_tache = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) {
        console.log(err)
      }
      return res.json(data);
    });
  
  }

exports.deleteTache = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM tache WHERE id_tache = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }

  //Tacha personne
exports.getTachePersonne = (req, res) => {

    const q = `SELECT * FROM tache_personne`;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postTachePersonnne = async (req, res) => {
    try {
        const q = 'INSERT INTO tache_personne(`id_user`, `id_tache`, `date_assigne`) VALUES(?,?,?)';

        const values = [
            req.body.id_user ,
            req.body.id_tache,
            req.body.date_assigne
        ];

        await db.query(q, values);
        return res.status(201).json({ message: 'Tâche personne ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};

exports.getTacheDocOne = (req, res) => {
    const {id_tache_document} = req.query;

    const q = `SELECT * FROM tache_documents WHERE id_tache_document = ?`;

    db.query(q,[id_tache_document], (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};

exports.postTacheDoc = async (req, res) => {
    const { id_tache, nom_document, type_document } = req.body;

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    const documents = req.files.map(file => ({
        chemin_document: file.path.replace(/\\/g, '/'),
        id_tache,
        nom_document,
        type_document
    }));

    // Insertion de chaque fichier dans la base de données
    documents.forEach((doc) => {
        const query = `INSERT INTO tache_documents (id_tache, nom_document, type_document, chemin_document)
                       VALUES (?, ?, ?, ?)`;

        db.query(query, [doc.id_tache, doc.nom_document, doc.type_document, doc.chemin_document], (err, result) => {
            if (err) {
                console.error('Erreur lors de l\'insertion du document:', err);
                return res.status(500).json({ message: 'Erreur interne du serveur' });
            }
        });
    });

    res.status(200).json({ message: 'Documents ajoutés avec succès' });
};

exports.deleteTachePersonne = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM tache_personne WHERE id_tache_personne = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }
  
exports.putTacheDoc = async (req, res) => {
    const { id_tache_document } = req.query;

    if (!id_tache_document || isNaN(id_tache_document)) {
        return res.status(400).json({ error: 'Invalid tache ID provided' });
    }
    
    const { nom_document, type_document } = req.body;
    if (!nom_document || !type_document) {
        return res.status(400).json({ error: 'Nom du document et type de document sont requis' });
    }

    try {
        const q = `
            UPDATE tache_documents
            SET 
                nom_document = ?,
                type_document = ?
            WHERE id_tache_document = ?
        `;
      
        const values = [
            nom_document,
            type_document,
            id_tache_document
        ];

        db.query(q, values, (error, results) => {
            if (error) {
                console.error("Error executing query:", error);
                return res.status(500).json({ error: 'Failed to update Tache record' });
            }

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Tache record not found' });
            }

            return res.json({ message: 'Tache record updated successfully' });
        });
    } catch (err) {
        console.error("Error updating tache:", err);
        return res.status(500).json({ error: 'Failed to update Tache record' });
    }
};

//Tag
exports.getTag = async (req, res) => {

    const query = 'SELECT * FROM tags';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  })
}

exports.getTagOne = async (req, res) => {
    const tagName = req.body;

    const query =  `
                    SELECT t.* 
                        FROM tache t
                    JOIN tache_tags tt ON t.id_tache = tt.id_tache
                    JOIN tags tg ON tt.id_tag = tg.id_tag
                        WHERE tg.nom_tag = ?
                    `;

  db.query(query,[tagName],(err, results) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(results);
  })
}

/* exports.postTag = async (req, res) => {
    const id_tache = req.params.id;
    const tags = req.body.tags;

    if (!Array.isArray(tags) || tags.length === 0) {
        return res.status(400).send('Aucun tag fourni');
    }

    const query = 'INSERT INTO tache_tags (id_tache, id_tag) VALUES ?';
    const values = tags.map(tagId => [id_tache, tagId]);

    try {
        await new Promise((resolve, reject) => {
            db.query(query, [values], (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        res.status(200).send('Tags associés avec succès');
    } catch (err) {
        console.error('Erreur lors de l\'insertion des tags :', err);
        res.status(500).send('Erreur lors de l\'association des tags');
    }
} */

exports.postTag = async (req, res) => {
        const { id_tache } = req.query;
        const tags = req.body.nom_tag;
    
        const qTag = 'INSERT INTO tags(`nom_tag`) VALUES(?)';
        const query = 'INSERT INTO tache_tags (id_tache, id_tag) VALUES (?, ?)';
    
        try {
            const id_tag = await new Promise((resolve, reject) => {
                db.query(qTag, [tags], (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data.insertId);
                });
            });
    
            await new Promise((resolve, reject) => {
                db.query(query, [id_tache, id_tag], (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(data);
                });
            });
    
            res.status(200).send('Tags associés avec succès');
        } catch (err) {
            console.error('Erreur lors de l\'insertion des tags :', err);
            res.status(500).send('Erreur lors de l\'association des tags');
        }
    };
    
/* exports.getSearch = async (req, res) => {
        const searchTerm = req.query.term;
    
        try {
            console.log(`Recherche avec le terme: ${searchTerm}`);
    
            // Exécution des deux requêtes en parallèle avec Promise.all
            const [projects, tasks] = await Promise.all([
                db.query(`
                    SELECT * FROM projet
                    WHERE id_projet IN (
                        SELECT id_projet FROM projet_tag
                        WHERE id_tag IN (
                            SELECT id_tag FROM tags WHERE nom_tag LIKE ?
                        )
                    )
                `, [`%${searchTerm}%`]),
    
                db.query(`
                    SELECT * FROM tache
                    WHERE id_tache IN (
                        SELECT id_tache FROM tache_tags
                        WHERE id_tag IN (
                            SELECT id_tag FROM tags WHERE nom_tag LIKE ?
                        )
                    )
                `, [`%${searchTerm}%`])
            ]);
    
            // Log des résultats des requêtes
            console.log('Résultats des projets:', projects);
            console.log('Résultats des tâches:', tasks);
    
            // Vérifier si nous avons des données dans l'élément [0] attendu
            const projectResults = projects[0] || []; // S'assurer que ce n'est pas undefined
            const taskResults = tasks[0] || []; // S'assurer que ce n'est pas undefined
    
            // Log des résultats formatés
            console.log('Projets filtrés:', projectResults);
            console.log('Tâches filtrées:', taskResults);
    
            // Envoyer les résultats comme réponse
            res.json({
                projects: projectResults,
                tasks: taskResults,
            });
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            res.status(500).json({ error: 'Erreur de serveur' });
        }
    }; */
    
exports.getSearch = async (req, res) => {
        const searchText = req.query.term;
      
        if (!searchText) {
          return res.status(400).json({ message: 'Le mot clé de recherche est requis' });
        }
      
        // Requête SQL pour rechercher dans les tables tache, projet, controle_de_base et offres
        const query = `
          SELECT 'tache' AS type, id_tache AS id, nom_tache AS nom, description
          FROM tache
          WHERE nom_tache LIKE ? OR description LIKE ?
          UNION
          SELECT 'projet' AS type, id_projet AS id, nom_projet AS nom, description
          FROM projet
          WHERE nom_projet LIKE ? OR description LIKE ?
          UNION
          SELECT 'controle_de_base' AS type, id_controle AS id, controle_de_base AS nom, NULL AS description
          FROM controle_de_base
          WHERE controle_de_base LIKE ?
          UNION
          SELECT 'offres' AS type, id_offre AS id, nom_offre AS nom, description
          FROM offres
          WHERE nom_offre LIKE ? OR description LIKE ?
        `;
      
        const searchPattern = `%${searchText}%`;
      
        db.query(query, [
          searchPattern, // Pour tache
          searchPattern, // Pour tache description
          searchPattern, // Pour projet
          searchPattern, // Pour projet description
          searchPattern, // Pour controle_de_base
          searchPattern, // Pour offres
          searchPattern  // Pour offres description
        ], (err, results) => {
          if (err) {
            console.error('Erreur lors de la recherche: ', err);
            return res.status(500).json({ message: 'Erreur interne du serveur. Veuillez réessayer plus tard.' });
          }
      
          res.json(results);
        });
      }
      
//Tache projet
exports.postTacheProjet = (req, res) => {
    const besoins = req.body.besoins || [];
    const clients = req.body.client || [];
    const batiments = req.body.id_batiment || [];

    const qProjet = 'INSERT INTO projet (`nom_projet`, `description`, `chef_projet`, `date_debut`, `date_fin`, `statut`, `budget`) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const qBesoin = 'INSERT INTO besoins (`id_article`, `description`, `quantite`, `id_projet`) VALUES (?, ?, ?, ?)';
    const qBudget = 'INSERT INTO budgets (`montant`, `id_projet`) VALUES (?, ?)';
    const qProjet_client = 'INSERT INTO projet_client(`id_projet`,`id_client`) VALUES(?,?)';
    const qProjet_batiment = 'INSERT INTO projet_batiment(`id_projet`,`id_batiment`) VALUES(?,?)';
    const qUpdateTache = 'UPDATE tache SET id_projet = ? WHERE id_tache = ?'; // Met à jour la tâche avec l'ID du projet

    const valuesProjet = [
        req.body.nom_projet,
        req.body.description,
        req.body.chef_projet,
        req.body.date_debut,
        req.body.date_fin,
        req.body.statut || 1,
        req.body.budget    
    ];

    db.query(qProjet, valuesProjet, (error, data) => {
        if (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erreur lors de la création du projet' });
        }

        const projetId = data.insertId;

        db.query(qBudget, [req.body.budget, projetId], (budgetError) => {
            if (budgetError) {
                console.error(budgetError);
                return res.status(500).json({ error: 'Erreur lors de l\'insertion du budget' });
            }

            if (besoins.length > 0) {
                besoins.forEach(besoin => {
                    if (besoin.id_article && besoin.description && besoin.quantite) {
                        const besoinValues = [
                            besoin.id_article,
                            besoin.description,
                            besoin.quantite,
                            projetId
                        ];
                        db.query(qBesoin, besoinValues, (besoinError) => {
                            if (besoinError) {
                                console.error(besoinError);
                                return res.status(500).json({ error: 'Erreur lors de l\'insertion des besoins' });
                            }
                        });
                    }
                });
            }

            if (clients.length > 0) {
                clients.forEach(clientId => {
                    const clientValues = [projetId, clientId];
                    db.query(qProjet_client, clientValues, (clientError) => {
                        if (clientError) {
                            console.error(clientError);
                            return res.status(500).json({ error: 'Erreur lors de l\'insertion des clients' });
                        }
                    });
                });
            }

            if (batiments.length > 0) {
                batiments.forEach(batimentId => {
                    const batimentValues = [projetId, batimentId];
                    db.query(qProjet_batiment, batimentValues, (batimentError) => {
                        if (batimentError) {
                            console.error(batimentError);
                            return res.status(500).json({ error: 'Erreur lors de l\'insertion des bâtiments' });
                        }
                    });
                });
            }

            db.query(qUpdateTache, [projetId, req.body.id_tache], (updateError) => {
                if (updateError) {
                    console.error(updateError);
                    return res.status(500).json({ error: 'Erreur lors de la mise à jour de la tâche' });
                }

                res.json('Processus réussi');
            });
        });
    });
};

//Tache associe
exports.putProjetAssocie = async (req, res) => {
    const { id_tache } = req.query;
    const { ...body } = req.body;

    // Vérifier si id_tache est valide
    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'ID de tâche fourni non valide' });
    }

    const dynamicKey = Object.keys(body)[0];
    const id_projet = dynamicKey;

    if (!id_projet) {
        return res.status(400).json({ error: 'ID de projet non fourni ou invalide.' });
    }

    try {
        // Vérifier d'abord si la tâche est déjà associée à un projet
        const checkQuery = `
            SELECT id_projet 
            FROM tache 
            WHERE id_tache = ?
        `;

        db.query(checkQuery, [id_tache], (checkError, checkData) => {
            if (checkError) {
                console.log(checkError);
                return res.status(500).json({ error: 'Erreur lors de la vérification de la tâche' });
            }

            const currentProjet = checkData[0]?.id_projet;

            // Si la tâche est déjà liée à un projet (id_projet n'est pas NULL), envoyer une notification
            if (currentProjet) {
                return res.status(400).json({ message: 'Cette tâche est déjà liée à un projet.' });
            }

            // Si la tâche n'est pas encore liée à un projet, faire la mise à jour
            const updateQuery = `
                UPDATE tache 
                SET 
                    id_projet = ?
                WHERE id_tache = ?
            `;

            const values = [id_projet, id_tache];

            db.query(updateQuery, values, (updateError, updateData) => {
                if (updateError) {
                    console.log(updateError);
                    return res.status(404).json({ error: 'Projet non trouvé' });
                }
                return res.json({ message: 'Le projet a été associé à la tâche avec succès.' });
            });
        });
    } catch (err) {
        console.error("Erreur lors de l'association du projet:", err);
        return res.status(500).json({ error: 'Échec de l\'association du projet à la tâche' });
    }
};

