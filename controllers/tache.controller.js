const { db } = require("./../config/database");
const nodemailer = require('nodemailer');

// 📦 Petite helper function pour convertir mysql en Promises
function queryPromise(connection, sql, params) {
    return new Promise((resolve, reject) => {
      connection.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

// Créer le transporteur avec les informations SMTP
const transporter = nodemailer.createTransport({
  host: 'mail.loginsmart-cd.com', // Serveur sortant
  port: 465, // Port SMTP pour SSL
  secure: true, // Utiliser SSL
  auth: {
    user: 'contact@loginsmart-cd.com', // Votre adresse email
    pass: '824562776Acha', // Mot de passe du compte de messagerie
  },
});

// Fonction pour envoyer l'email
const sendEmail = async (options) => {
  const mailOptions = {
    from: '"Dlog" <contact@loginsmart-cd.com>', // Nom et adresse de l'expéditeur
    to: options.email, // Adresse email du destinataire
    subject: options.subject, // Sujet de l'email
    text: options.message, // Message en texte brut
    // html: options.htmlMessage, // Message en HTML si nécessaire
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error.message);
  }
};

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

    // Définition de la requête SQL
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
            AND (typeC.nom_type_statut = ? OR ? IS NULL)  -- Filtre par statut
            AND (tache.date_debut >= ? OR ? IS NULL)  -- Filtre par date de début
            AND (tache.date_fin <= ? OR ? IS NULL)  -- Filtre par date de fin
    `;

    const params = [
        statut || null,
        statut || null,
        dateDebut || null,
        dateDebut || null,
        dateFin || null, 
        dateFin || null  
    ];

    // Exécution de la requête
    db.query(q, params, (error, data) => {
        if (error) {
            console.error('Erreur lors de la récupération des tâches:', error);
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
}

exports.getTacheCount = (req, res) => {
        const { userId } = req.query;
    
        const userQuery = `
            SELECT id_ville, id_departement, role 
            FROM utilisateur 
            WHERE id_utilisateur = ?
        `;
    
        db.query(userQuery, [userId], (error, result) => {
            if (error) {
                return res.status(500).send(error);
            }
    
            if (result.length === 0) {
                return res.status(404).send('Utilisateur non trouvé');
            }
    
            const { id_ville, id_departement, role } = result[0];
    
            let countQuery = `
                SELECT COUNT(id_tache) AS nbre_tache
                FROM tache
                WHERE est_supprime = 0
            `;
    
            if (role === 'Manager' && id_departement) {
                countQuery += ` AND tache.id_departement = ?`;
            }
    
            if (id_ville) {
                countQuery += ` AND tache.id_ville = ?`;
            }
    
            if (role === 'Admin') {
                countQuery = `
                    SELECT COUNT(id_tache) AS nbre_tache
                    FROM tache
                    WHERE est_supprime = 0
                `;
            }
    
            // Préparer les paramètres de la requête
            const params = [];
            if (role === 'Manager' && id_departement) {
                params.push(id_departement);
            }
            if (id_ville) {
                params.push(id_ville);
            }
    
            db.query(countQuery, params, (error, data) => {
                if (error) {
                    return res.status(500).send(error); 
                }
                return res.status(200).json(data);
            });
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

exports.getTache = (req, res) => {
    const { id_user, role } = req.query;
    const { departement = [], client = [], statut = [], priorite = [], dateRange = [], owners = [], projet = [] } = req.body;

    const baseWhere = [`tache.est_supprime = 0`];
    const statsWhere = [`tache.est_supprime = 0`];
    const totalWhere = [`tache.est_supprime = 0`];

    // Rôle spécifique
    if (role !== 'Admin' && role === 'Manager' && id_user) {
        baseWhere.push(`
            tache.id_departement = (SELECT id_departement FROM utilisateur WHERE id_utilisateur = ${db.escape(id_user)})
            AND tache.id_ville = (SELECT id_ville FROM utilisateur WHERE id_utilisateur = ${db.escape(id_user)})
            AND pt.id_user = ${db.escape(id_user)} AND pt.can_view = 1
        `);
    } else if (role === 'Owner' && id_user) {
        baseWhere.push(`(pt.id_user = ${db.escape(id_user)} AND pt.can_view = 1 OR tache.user_cr = ${db.escape(id_user)})`);
    }

    // Filtres communs
    const filters = [
        { field: 'tache.id_departement', values: departement },
        { field: 'tache.id_client', values: client },
        { field: 'tache.statut', values: statut },
        { field: 'tache.priorite', values: priorite },
        { field: 'tache.responsable_principal', values: owners },
        { field: 'tache.id_projet', values: projet }
    ];

    for (const { field, values } of filters) {
        if (Array.isArray(values) && values.length > 0) {
            const escaped = values.map(v => db.escape(v)).join(',');
            baseWhere.push(`${field} IN (${escaped})`);
            statsWhere.push(`${field} IN (${escaped})`);
            totalWhere.push(`${field} IN (${escaped})`);
        }
    }

    // Date Range
    if (dateRange.length === 2) {
        const [start, end] = dateRange;
        const dateClause = `tache.date_debut >= ${db.escape(start)} AND tache.date_fin <= ${db.escape(end)}`;
        baseWhere.push(dateClause);
        statsWhere.push(dateClause);
        totalWhere.push(dateClause);
    }

    // MAIN QUERY
    const query = `
        SELECT 
            tache.id_tache, 
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
            pt.can_view,
            pt.can_edit,
            pt.can_comment,
            pt.id_user
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
        WHERE ${baseWhere.join(' AND ')}
        ORDER BY tache.date_creation DESC
    `;

    // STATS QUERY
    const statsQuery = `
        SELECT 
            typeC.nom_type_statut AS statut,
            COUNT(*) AS nombre_taches
        FROM 
            tache
        LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
        WHERE ${statsWhere.join(' AND ')}
        GROUP BY typeC.nom_type_statut
    `;

    // TOTAL QUERY
    const totalQuery = `
        SELECT COUNT(*) AS total_taches
        FROM tache
        WHERE ${totalWhere.join(' AND ')}
    `;

    // EXECUTION
    db.query(query, (error, data) => {
        if (error) return res.status(500).send(error);

        db.query(statsQuery, (statsError, statsData) => {
            if (statsError) return res.status(500).send(statsError);

            db.query(totalQuery, (totalError, totalData) => {
                if (totalError) return res.status(500).send(totalError);

                res.status(200).json({
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

exports.getTacheVille = (req, res) => {
    const { id_ville } = req.query;

    // Vérification de l'entrée
    if (!id_ville) {
        return res.status(400).json({ error: "L'identifiant de la ville est requis." });
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
            cb.id_controle
        FROM tache
            LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
            LEFT JOIN client ON tache.id_client = client.id_client
            INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
            LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
            LEFT JOIN provinces ON tache.id_ville = provinces.id
            LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
            LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
            LEFT JOIN departement ON tache.id_departement = departement.id_departement
        WHERE tache.id_ville = ?
        GROUP BY tache.id_tache
    `;

    db.query(q, [id_ville], (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des tâches :", error);
            return res.status(500).json({ error: "Erreur interne du serveur." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Aucune tâche trouvée pour cette ville." });
        }

        return res.status(200).json(results);
    });
};

exports.getTacheDepartement = (req, res) => {
    const { id_departement } = req.query;

    // Vérification de l'entrée
    if (!id_departement) {
        return res.status(400).json({ error: "L'identifiant de departement est requis." });
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
            cb.id_controle
        FROM tache
            LEFT JOIN type_statut_suivi AS typeC ON tache.statut = typeC.id_type_statut_suivi
            LEFT JOIN client ON tache.id_client = client.id_client
            INNER JOIN frequence ON tache.id_frequence = frequence.id_frequence
            LEFT JOIN utilisateur ON tache.responsable_principal = utilisateur.id_utilisateur
            LEFT JOIN provinces ON tache.id_ville = provinces.id
            LEFT JOIN controle_client AS cc ON client.id_client = cc.id_client
            LEFT JOIN controle_de_base AS cb ON cc.id_controle = cb.id_controle
            LEFT JOIN departement ON tache.id_departement = departement.id_departement
        WHERE tache.id_departement = ?
        GROUP BY tache.id_tache
    `;

    db.query(q, [id_departement], (error, results) => {
        if (error) {
            console.error("Erreur lors de la récupération des tâches :", error);
            return res.status(500).json({ error: "Erreur interne du serveur." });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Aucune tâche trouvée pour ce departement." });
        }

        return res.status(200).json(results);
    });
};

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
                DATEDIFF(tache.date_fin, tache.date_debut) AS nbre_jour,
                u.nom AS demandeur,
                p.nom_projet
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
            LEFT JOIN utilisateur u ON tache.id_demandeur = u.id_utilisateur
            LEFT JOIN projet p ON tache.id_projet = p.id_projet
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

/* exports.postTache = async (req, res) => {

    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_tache_parente`, `id_departement`,`id_client`, `id_frequence`,`id_control`,`id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`,`id_batiment`, `id_ville`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

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
            req.body.doc
        ];

        db.query(q, values, (error, data)=>{
            if(error){
                console.log(error)
            }
            else{
                return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
            }
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
}; */

/*exports.postTache = async (req, res) => {

    try {
        const q = 'INSERT INTO tache(`nom_tache`, `description`, `statut`, `date_debut`, `date_fin`, `priorite`,`id_tache_parente`, `id_departement`,`id_client`, `id_frequence`,`id_control`,`id_projet`, `id_point_supervision`, `responsable_principal`, `id_demandeur`,`id_batiment`, `id_ville`,`id_cat_tache`,`id_corps_metier`, `doc`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

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
                return res.status(201).json({ message: 'Tâche ajoutée avec succès', data: { nom_tache: req.body.nom_tache } });
            }
        })
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la tâche :', error);
        return res.status(500).json({ error: "Une erreur s'est produite lors de l'ajout de la tâche." });
    }
};*/

exports.postTache = async (req, res) => {
  const pool = db;

  let connection;
  try {
    connection = await new Promise((resolve, reject) => {
      pool.getConnection((err, conn) => {
        if (err) return reject(err);
        resolve(conn);
      });
    });

    const {
      nom_tache, description, statut = 1, date_debut, date_fin, priorite,
      id_tache_parente, id_departement, id_client, id_frequence, id_control,
      id_projet, id_point_supervision, responsable_principal, id_demandeur,
      id_batiment, id_ville, id_cat_tache, id_corps_metier, doc, user_cr, categories, idInspection
    } = req.body;


    if (!nom_tache || !user_cr) {
      connection.release();
      return res.status(400).json({ error: "Les champs 'nom_tache' et 'user_cr' sont obligatoires." });
    }

    // Démarrer la transaction
    await queryPromise(connection, 'START TRANSACTION');

    const existingQuery = `
        SELECT id_tache FROM tache 
        WHERE nom_tache = ? AND date_debut = ? LIMIT 1
        `;

    const existingTask = await queryPromise(connection, existingQuery, [nom_tache, date_debut]);

    if (existingTask.length > 0) {
        connection.release();
        return res.status(409).json({ 
            error: "Une tâche avec les mêmes informations existe déjà.",
            id_tache: existingTask[0].id_tache
        });
    }

    // Insertion tâche
    const insertTaskQuery = `
      INSERT INTO tache (
        nom_tache, description, statut, date_debut, date_fin, priorite, 
        id_tache_parente, id_departement, id_client, id_frequence, 
        id_control, id_projet, id_point_supervision, responsable_principal, 
        id_demandeur, id_batiment, id_ville, id_cat_tache, 
        id_corps_metier, doc, user_cr
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const taskValues = [
      nom_tache, description, statut, date_debut, date_fin, priorite,
      id_tache_parente, id_departement, id_client, id_frequence,
      id_control, id_projet, id_point_supervision, responsable_principal,
      id_demandeur, id_batiment, id_ville, id_cat_tache,
      id_corps_metier, doc, user_cr
    ];

    const taskResult = await queryPromise(connection, insertTaskQuery, taskValues);
    const taskId = taskResult.insertId;

    //Inspection
    if(idInspection) {
        const inspectionQuery = `UPDATE inspections SET id_tache = ? WHERE id_inspection = ?`;
            await queryPromise(connection, inspectionQuery, [taskId, idInspection]);

    }
    // Audit logs
    const auditLogQuery = `
      INSERT INTO audit_logs (action, user_id, id_tache, timestamp)
      VALUES ('Création', ?, ?, NOW())
    `;
    await queryPromise(connection, auditLogQuery, [user_cr, taskId]);

    // Permissions
    const permissionsQuery = `
      INSERT INTO permissions_tache (id_tache, id_user, can_view, can_edit, can_comment)
      VALUES (?, ?, 1, 1, 1)
    `;
    await queryPromise(connection, permissionsQuery, [taskId, user_cr]);

        // Permissions Owner
    const permissionsOwnerQuery = `
      INSERT INTO permissions_tache (id_tache, id_user, can_view, can_edit, can_comment)
      VALUES (?, ?, 1, 1, 1)
    `;
    await queryPromise(connection, permissionsOwnerQuery, [taskId, responsable_principal]);
    // Notification
    const notificationMessage = `Une nouvelle tâche vient d'être créée avec le titre de : ${nom_tache}`;
    const notificationsQuery = `
      INSERT INTO notifications (user_id, message, timestamp, target_type, target_id)
      VALUES (?, ?, NOW(), ?, ?)
    `;
    await queryPromise(connection, notificationsQuery, [user_cr, notificationMessage, 'Tache', taskId]);

    // Récupérer nom créateur
    const userSQL = `SELECT nom FROM utilisateur WHERE id_utilisateur = ?`;
    const getUserResult = await queryPromise(connection, userSQL, [user_cr]);
    const nomCreateur = getUserResult.length > 0 ? getUserResult[0].nom : "Inconnu";

    // Récupérer email responsable principal si défini
    let emailResponsable = null;
    if (responsable_principal) {
      const ownerSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`;
      const getOwnerResult = await queryPromise(connection, ownerSQL, [responsable_principal]);
      emailResponsable = getOwnerResult.length > 0 ? getOwnerResult[0].email : null;
    }

    // Insertion catégories
    if (Array.isArray(categories) && categories.length > 0) {
      for (const { id_cat, cout } of categories) {
        const categoryQuery = `
          INSERT INTO categorie_tache (id_tache, id_cat, cout)
          VALUES (?, ?, ?)
        `;
        await queryPromise(connection, categoryQuery, [taskId, id_cat, cout]);
      }
    }

    // Commit
    await queryPromise(connection, 'COMMIT');

    // Libérer la connexion
    connection.release();
const stripHtml = (html) => html.replace(/<\/?[^>]+(>|$)/g, '');

const PRIORITE_LABELS = {
  1: 'Très faible',
  2: 'Faible',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Très haute'
};

const prioriteLabel = PRIORITE_LABELS[priorite] || 'Non définie';

    // Envoyer email hors transaction
    if (emailResponsable) {
const message = `
🆕 Nouvelle Tâche Créée

📌 Titre         : ${nom_tache}

📝 Description   : ${stripHtml(description || 'Aucune description')}

⭐ Priorité       : ${prioriteLabel}

👤 Créée par     : ${nomCreateur}

Merci de consulter la plateforme pour plus de détails.
`;

      sendEmail({
        email: emailResponsable,
        subject: '📌 Nouvelle tâche',
        message
      });
    }

    return res.status(201).json({
      message: 'Tâche ajoutée avec succès.',
      data: { nom_tache, id_tache: taskId }
    });

  } catch (error) {
    if (connection) {
      try {
        await queryPromise(connection, 'ROLLBACK');
      } catch (rollbackErr) {
        console.error('Erreur rollback transaction:', rollbackErr);
      }
      connection.release();
    }
    console.error("Erreur inattendue lors de l'ajout de la tâche :", error);
    return res.status(500).json({ error: "Une erreur inattendue s'est produite." });
  }
};

exports.getTacheCorbeille = (req, res) => {

    const q = `SELECT 
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
                pt.can_view,
                pt.can_edit,
                pt.can_comment,
                pt.id_user
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
                tache.est_supprime = 1
                GROUP BY tache.id_tache
                ORDER BY tache.date_creation DESC`

    db.query(q, (error, results) => {
        if(error) {
            console.error('Erreur lors de la récupération des corbeilles:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des corbeilles' });
        }
        res.json(results);
    })
}

exports.putTacheCorbeille = (req, res) => {
    const { id_tache } = req.query;

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'ID de tache non valide fourni' });
    }

    const q = `
        UPDATE tache 
        SET est_supprime = 0
        WHERE id_tache = ?
    `;

    db.query(q, [id_tache], (error, result) => {
        if (error) {
            console.error("Database error:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Tache non trouvée ou déjà supprimée' });
        }

        return res.status(200).json({ message: 'Tache a été modifiée avec succès' });
    });
};

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
    return res.status(400).json({ error: 'ID de tâche invalide.' });
  }

  const {
    nom_tache, description, statut = 1, date_debut, date_fin, priorite,
    id_departement, id_client, id_frequence, responsable_principal,
    id_demandeur, id_batiment, id_ville, id_cat_tache, id_corps_metier, user_cr
  } = req.body;

  try {
    const updateQuery = `
      UPDATE tache 
      SET 
        nom_tache = ?, description = ?, statut = ?, date_debut = ?, date_fin = ?, priorite = ?,
        id_departement = ?, id_client = ?, id_frequence = ?, responsable_principal = ?,
        id_demandeur = ?, id_batiment = ?, id_ville = ?, id_cat_tache = ?, id_corps_metier = ?
      WHERE id_tache = ?
    `;

    const values = [
      nom_tache, description, statut, date_debut, date_fin, priorite,
      id_departement, id_client, id_frequence, responsable_principal,
      id_demandeur, id_batiment, id_ville, id_cat_tache, id_corps_metier,
      id_tache
    ];

    // Vérifier si la tâche existe et mettre à jour
    const result = await queryPromise(db, updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée ou aucun changement détecté.' });
    }

    // Log audit
    const logQuery = `
      INSERT INTO audit_logs (action, user_id, id_tache, timestamp)
      VALUES (?, ?, ?, NOW())
    `;
    await queryPromise(db, logQuery, ['Modification', user_cr, id_tache]);

    // Récupérer les utilisateurs liés à la tâche via permissions
    const permissionSQL = `
      SELECT u.email, t.nom_tache 
      FROM permissions_tache pt
      INNER JOIN utilisateur u ON pt.id_user = u.id_utilisateur
      INNER JOIN tache t ON t.id_tache = pt.id_tache
      WHERE pt.id_tache = ?
      GROUP BY u.id_utilisateur
    `;
    const dataP = await queryPromise(db, permissionSQL, [id_tache]);

    const userSQL = `SELECT nom, email FROM utilisateur WHERE id_utilisateur = ?`;
    const userData = await queryPromise(db, userSQL, [user_cr]);
    const nomCreateur = userData[0]?.nom || 'Inconnu';
    const userEmail = userData[0]?.email || 'Inconnu';

    // Horodatage
    const horodatage = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Etc/GMT-1',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
        }).format(new Date());

const message = `
📌 Mise à jour de la tâche : ${nom_tache}

👤 Modifiée par : ${nomCreateur}

🕒 Date & Heure : ${horodatage}

Merci de consulter la plateforme pour plus de détails.
`;

    const emailPromises = dataP
        .filter(({ email })=> email && email !== userEmail) 
        .map(({ email }) => 
            sendEmail({
            email,
            subject: '📌 Mise à jour de la tâche',
            message
            }).catch((emailErr) => {
          console.error(`Erreur d'envoi à ${email} :`, emailErr.message);
        })
        )

        await Promise.all(emailPromises);
        return res.status(200).json({ message: 'La tâche a été modifiée avec succès.' });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de la tâche :", err);
    return res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour.' });
  }
};

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
        const userId = req.body.user_id;
    
        const q = "UPDATE tache SET est_supprime = 1 WHERE id_tache = ?";
      
        db.query(q, [id], (err, data) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ error: "Erreur lors de la mise à jour de la tâche." });
            }
    
            const logQuery = `
                INSERT INTO audit_logs (action, user_id, id_tache, timestamp)
                VALUES (?, ?, ?, NOW())
            `;
            const logValues = [
                'Suppression',
                userId,
                id
            ];
    
            db.query(logQuery, logValues, (logError) => {
                if (logError) {
                    console.log("Erreur lors de l'ajout du log d'audit:", logError);
                }
            });
    
            return res.json({ message: "Tâche supprimée avec succès", data });
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
  const { id_tache, nom_document, type_document, user_cr } = req.body;
  const baseURL = 'https://apidlog.loginsmart-cd.com';

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'Aucun fichier téléchargé.' });
  }

  try {
    // Récupérer les infos nécessaires
    const [dataP, userData] = await Promise.all([
      queryPromise(db, `
        SELECT u.email, t.nom_tache 
        FROM permissions_tache pt
        INNER JOIN utilisateur u ON pt.id_user = u.id_utilisateur
        INNER JOIN tache t ON t.id_tache = pt.id_tache
        WHERE pt.id_tache = ?
        GROUP BY u.id_utilisateur
      `, [id_tache]),
      queryPromise(db, `SELECT nom FROM utilisateur WHERE id_utilisateur = ?`, [user_cr])
    ]);

    const nomTache = dataP[0]?.nom_tache || 'Tâche inconnue';
    const nomCreateur = userData[0]?.nom || 'Inconnu';
    const horodatage = new Date().toLocaleString('fr-FR');

    // Génération des documents avec URL
    const documents = req.files.map(file => {
      const cheminRelatif = file.path.replace(/\\/g, '/');
      const urlDocument = `${baseURL}/${cheminRelatif}`;
      return {
        chemin_document: cheminRelatif,
        id_tache,
        nom_document,
        type_document,
        urlDocument
      };
    });

    // Texte des liens
    const liens = documents.map(doc =>
      `📄 ${doc.nom_document} : ${doc.urlDocument}`
    ).join('\n');

    // Contenu du message
    const message = `
📌 Nouveau document ajouté à la tâche : ${nomTache}

👤 Ajouté par : ${nomCreateur}
🕒 Date & Heure : ${horodatage}

🔗 Documents :
${liens}

Merci de consulter la plateforme pour plus de détails.
    `;

    // Envoi des e-mails
    for (const d of dataP) {
      try {
        await sendEmail({
          email: d.email,
          subject: `📌 Nouveau document ajouté à la tâche : ${nomTache}`,
          message
        });
      } catch (emailErr) {
        console.error(`Erreur lors de l'envoi de l'e-mail à ${d.email} :`, emailErr.message);
      }
    }

    // Insertion des documents dans la base
    const insertPromises = documents.map(doc => {
      const query = `
        INSERT INTO tache_documents (id_tache, nom_document, type_document, chemin_document)
        VALUES (?, ?, ?, ?)
      `;
      return queryPromise(db, query, [
        doc.id_tache,
        doc.nom_document,
        doc.type_document,
        doc.chemin_document
      ]);
    });

    await Promise.all(insertPromises);

    return res.status(200).json({ message: 'Documents ajoutés avec succès.' });

  } catch (err) {
    console.error('Erreur lors de l\'ajout des documents :', err);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
};

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

exports.deleteTachePersonne = (req, res) => {
    const id = req.params.id;
  
    const q = "DELETE FROM tache_personne WHERE id_tache_personne = ?";
  
    db.query(q, [id], (err, data) => {
      if (err) return res.send(err);
      return res.json(data);
    });
  
  }
  
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
    const qUpdateTache = 'UPDATE tache SET id_projet = ? WHERE id_tache = ?';

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

    if (!id_tache || isNaN(id_tache)) {
        return res.status(400).json({ error: 'ID de tâche fourni non valide' });
    }

    const dynamicKey = Object.keys(body)[0];
    const id_projet = dynamicKey;

    if (!id_projet) {
        return res.status(400).json({ error: 'ID de projet non fourni ou invalide.' });
    }

    try {
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

            if (currentProjet) {
                return res.status(400).json({ message: 'Cette tâche est déjà liée à un projet.' });
            }

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


//Audit Logs Tache
exports.getAuditLogsTache = (req, res) => {

    const q = `SELECT audit_logs.*, tache.nom_tache, utilisateur.nom, utilisateur.prenom, departement.nom_departement FROM audit_logs
                    LEFT JOIN tache ON audit_logs.id_tache = tache.id_tache
                    LEFT JOIN departement ON tache.id_departement = departement.id_departement
                    LEFT JOIN utilisateur ON audit_logs.user_id = utilisateur.id_utilisateur
                    ORDER BY audit_logs.timestamp DESC
                `;

    db.query(q, (error, data) => {
        if (error) {
            return res.status(500).send(error);
        }
        return res.status(200).json(data);
    });
};


//Notifications
exports.getNotificationTache = (req, res) => {
    const { user_id } = req.query;

    const checkRoleQuery = `SELECT role FROM utilisateur WHERE id_utilisateur = ?`;

    db.query(checkRoleQuery, [user_id], (error, result) => {
        if (error) {
            return res.status(500).json({ error: 'Erreur serveur lors de la vérification du rôle.' });
        }

        if (!result.length) {
            return res.status(403).json({ error: 'Utilisateur non trouvé.' });
        }

        const role = result[0].role;

        let notificationQuery;
        let queryParams;

        if (role === 'Admin') {
            // Admin : notifications destinées à d'autres que lui, et non créées par lui
            notificationQuery = `
                SELECT notifications.*, u.nom, u.prenom 
                FROM notifications
                INNER JOIN utilisateur u ON notifications.user_id = u.id_utilisateur
                WHERE is_read = 0 
                AND notifications.user_id != ?
                ORDER BY notifications.timestamp DESC
            `;
            queryParams = [user_id];
        } else {
            // Utilisateur normal : notifications destinées à lui
            notificationQuery = `
                SELECT notifications.*, u.nom, u.prenom 
                FROM notifications
                INNER JOIN utilisateur u ON notifications.user_id = u.id_utilisateur
                WHERE is_read = 0 
                AND notifications.target_user_id = ?
                ORDER BY notifications.timestamp DESC
            `;
            queryParams = [user_id];
        }

        db.query(notificationQuery, queryParams, (error, data) => {
            if (error) {
                return res.status(500).json({ error: 'Erreur serveur lors de la récupération des notifications.' });
            }

            return res.status(200).json(data);
        });
    });
};

exports.getNotificationTacheOne = (req, res) => {
    const { id_notification } = req.query;

    // Vérification de la présence du paramètre requis
    if (!id_notification) {
        return res.status(400).json({
            error: "Le paramètre 'id_notification' est requis.",
        });
    }

    // Requête SQL pour récupérer les données
    const query = `
        SELECT notifications.*, u.nom, u.prenom 
        FROM notifications
        INNER JOIN utilisateur u ON notifications.user_id = u.id_utilisateur
        WHERE notifications.id_notifications = ?
    `;

    db.query(query, [id_notification], (error, results) => {
        if (error) {
            console.error("Erreur lors de l'exécution de la requête:", error);
            return res.status(500).json({
                error: "Une erreur est survenue lors de la récupération de la notification.",
            });
        }

        // Vérification si une notification est trouvée
        if (results.length === 0) {
            return res.status(404).json({
                message: "Aucune notification trouvée avec cet ID.",
            });
        }

        // Réponse avec les données de la notification
        return res.status(200).json(results[0]);
    });
};

exports.deleteUpdateNotification = (req, res) => {
    const {id} = req.query;

    const q = "UPDATE notifications SET is_read = 1 WHERE id_notifications = ?";
  
    db.query(q, [id], (err, data) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: "Erreur lors de la mise à jour de la notification." });
        }

        return res.json({ message: "Notification a été mise à jour avec succès", data });
    });
};