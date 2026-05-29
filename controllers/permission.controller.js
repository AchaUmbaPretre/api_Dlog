const { db } = require("./../config/database");
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');


dotenv.config();

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

exports.menusAllOne = (req, res) => {
    const { userId } = req.query;

    const userQuery = `
        SELECT u.*, 
               CASE WHEN u.is_super_admin = 1 THEN 'SuperAdmin' ELSE u.role END as user_role,
               u.created_by,
               u.niveau
        FROM utilisateur u
        WHERE u.id_utilisateur = ?
    `;
    
    db.query(userQuery, [userId], (roleErr, roleResults) => {
        if (roleErr || roleResults.length === 0) {
            return res.status(500).json({ error: "Erreur lors de la récupération" });
        }

        const user = roleResults[0];
        // ✅ CORRECTION : Vérifier aussi is_super_admin directement
        const isSuperAdmin = user.is_super_admin === 1 || user.user_role === "SuperAdmin";
        
        // Super Admin voit TOUS les menus sans restriction
        if (isSuperAdmin) {
            const query = `
                SELECT 
                    menus.id AS menu_id, 
                    menus.title AS menu_title, 
                    menus.url AS menu_url, 
                    menus.icon AS menu_icon, 
                    submenus.id AS submenu_id, 
                    submenus.title AS submenu_title, 
                    submenus.url AS submenu_url, 
                    submenus.icon AS submenu_icon
                FROM menus
                LEFT JOIN submenus ON menus.id = submenus.menu_id
                ORDER BY menus.index ASC, submenus.id ASC
            `;
            
            db.query(query, [], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                const menus = buildMenuTree(results, true);
                res.json(menus);
            });
            return;
        }
        
        // Pour Admin et utilisateurs normaux
        const query = `
            SELECT 
                menus.id AS menu_id, 
                menus.title AS menu_title, 
                menus.url AS menu_url, 
                menus.icon AS menu_icon, 
                submenus.id AS submenu_id, 
                submenus.title AS submenu_title, 
                submenus.url AS submenu_url, 
                submenus.icon AS submenu_icon,
                COALESCE(permission.can_read, 0) AS menu_can_read,
                COALESCE(submenu_permission.can_read, 0) AS submenu_can_read,
                COALESCE(permission.can_edit, 0) AS can_edit,
                COALESCE(permission.can_comment, 0) AS can_comment,
                COALESCE(permission.can_delete, 0) AS can_delete
            FROM menus 
            LEFT JOIN submenus ON menus.id = submenus.menu_id
            LEFT JOIN permission ON menus.id = permission.menus_id 
                AND permission.user_id = ? 
                AND (permission.submenu_id IS NULL OR permission.submenu_id = 0)
            LEFT JOIN permission AS submenu_permission ON submenus.id = submenu_permission.submenu_id 
                AND submenu_permission.user_id = ?
            ORDER BY menus.index ASC, submenus.id ASC
        `;
        
        // Dans votre requête "Accès normal - avec permissions"
      db.query(query, [userId, userId], (err, results) => {
          if (err) return res.status(500).json({ error: err.message });
          
          
          const menus = buildMenuTree(results, false);
          res.json(menus);
      });
    });
};

// Fonction utilitaire pour construire l'arbre des menus
function buildMenuTree(results, isAdmin = false) {
    const menus = [];
    let currentMenu = null;

    results.forEach(row => {
        // 🔥 CORRECTION : Pour les non-admins, on ignore les menus sans permission
        if (!isAdmin && row.menu_can_read !== 1) {
            return; // Ne pas ajouter ce menu
        }
        
        // Si nouveau menu
        if (!currentMenu || currentMenu.menu_id !== row.menu_id) {
            currentMenu = {
                menu_id: row.menu_id,
                menu_title: row.menu_title,
                menu_url: row.menu_url,
                menu_icon: row.menu_icon,
                can_read: isAdmin ? 1 : (row.menu_can_read || 0),
                can_edit: isAdmin ? 1 : (row.can_edit || 0),
                can_comment: isAdmin ? 1 : (row.can_comment || 0),
                can_delete: isAdmin ? 1 : (row.can_delete || 0),
                subMenus: []
            };
            menus.push(currentMenu);
        }

        if (row.submenu_id) {
            if (!isAdmin && row.submenu_can_read !== 1) {
                return;
            }
            
            currentMenu.subMenus.push({
                submenu_id: row.submenu_id,
                submenu_title: row.submenu_title,
                submenu_url: row.submenu_url,
                submenu_icon: row.submenu_icon,
                can_read: isAdmin ? 1 : (row.submenu_can_read || 0),
                can_edit: isAdmin ? 1 : (row.can_edit || 0),
                can_comment: isAdmin ? 1 : (row.can_comment || 0),
                can_delete: isAdmin ? 1 : (row.can_delete || 0)
            });
        }
    });
    return menus;
}

exports.menusAll = (req, res) => {
    const { userId } = req.query;
    const currentUserId = req.user?.id || req.query.currentUserId;
    
    // 🔥 Vérifier si l'utilisateur qui appelle a le droit de voir tous les menus
    if (currentUserId) {
        const checkQuery = 'SELECT role, is_super_admin FROM utilisateur WHERE id_utilisateur = ?';
        db.query(checkQuery, [currentUserId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length === 0) {
                return res.status(401).json({ error: 'Utilisateur non trouvé' });
            }
            
            const user = results[0];
            const isSuperAdmin = user.is_super_admin === 1;
            const isAdmin = user.role === 'Admin';
            
            // Seul Super Admin ou Admin peut voir tous les menus
            if (!isSuperAdmin && !isAdmin) {
                return res.status(403).json({ error: 'Accès non autorisé' });
            }
            
          if (userId && !isSuperAdmin) {
              const checkTargetQuery = 'SELECT created_by FROM utilisateur WHERE id_utilisateur = ?';
              db.query(checkTargetQuery, [userId], (err, targetResults) => {
                  if (err || targetResults.length === 0 || targetResults[0].created_by !== currentUserId) {
                      return res.status(403).json({ error: 'Vous ne pouvez pas gérer cet utilisateur' });
                  }
                  getAllMenusData(res, currentUserId, isSuperAdmin);
              });
          } else {
              getAllMenusData(res, currentUserId, isSuperAdmin);
          } 
        });
    } else {
        getAllMenusData(res);
    }
};

function getAllMenusData(res, currentUserId = null, isSuperAdmin = false) {
    let query;
    let params = [];
    
    if (!isSuperAdmin && currentUserId) {
        // 🔥 Admin : ne voit que les menus où il a can_read=1
        query = `
            SELECT DISTINCT
                menus.id AS menu_id, 
                menus.title AS menu_title, 
                menus.url AS menu_url, 
                menus.icon AS menu_icon, 
                submenus.id AS submenu_id, 
                submenus.title AS submenu_title, 
                submenus.url AS submenu_url, 
                submenus.icon AS submenu_icon
            FROM menus 
            LEFT JOIN submenus ON menus.id = submenus.menu_id
            INNER JOIN permission ON menus.id = permission.menus_id 
                AND permission.user_id = ?
                AND permission.can_read = 1
                AND (permission.submenu_id IS NULL OR permission.submenu_id = 0)
            ORDER BY menus.index ASC, submenus.id ASC
        `;
        params = [currentUserId];
    } else {
        // Super Admin : voit TOUS les menus
        query = `
            SELECT 
                menus.id AS menu_id, 
                menus.title AS menu_title, 
                menus.url AS menu_url, 
                menus.icon AS menu_icon, 
                submenus.id AS submenu_id, 
                submenus.title AS submenu_title, 
                submenus.url AS submenu_url, 
                submenus.icon AS submenu_icon
            FROM menus 
            LEFT JOIN submenus ON menus.id = submenus.menu_id
            ORDER BY menus.index ASC, submenus.id ASC
        `;
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Erreur:', err);
            return res.status(500).json({ error: err.message });
        }

        const menus = [];
        let currentMenu = null;

        results.forEach(row => {
            if (!currentMenu || currentMenu.menu_id !== row.menu_id) {
                currentMenu = {
                    menu_id: row.menu_id,
                    menu_title: row.menu_title,
                    menu_url: row.menu_url,
                    menu_icon: row.menu_icon,
                    subMenus: []
                };
                menus.push(currentMenu);
            }

            if (row.submenu_id) {
                currentMenu.subMenus.push({
                    submenu_id: row.submenu_id,
                    submenu_title: row.submenu_title,
                    submenu_url: row.submenu_url,
                    submenu_icon: row.submenu_icon
                });
            }
        });

        res.json(menus);
    });
}

exports.permissions = (req, res) => {
  const { userId } = req.query;
  db.query(
    `SELECT p.*, o.title AS menuTitle, s.title AS submenuTitle, u.nom 
     FROM permission p
     JOIN menus o ON p.menus_id = o.id
     LEFT JOIN submenus s ON p.submenu_id = s.id  -- Si vous avez une colonne submenu_id
     JOIN utilisateur u ON p.user_id = u.id_utilisateur
     WHERE p.user_id = ?`,
    [userId],
    (err, results) => {
      if (err) throw err;
      res.json(results);
    }
  );
};

exports.putPermission = (req, res) => {
    const userId = req.params.userId;           // Utilisateur cible (qui reçoit les permissions)
    const optionId = req.params.optionId;       // Menu ID
    const submenuId = req.query.submenuId;      // Sous-menu ID (optionnel)
    const { can_read, can_edit, can_comment, can_delete } = req.body;
    
    // 🔥 Récupérer l'utilisateur qui fait la demande
    const currentUserId = req.user?.id || req.query.currentUserId;
    const isSuperAdmin = req.user?.is_super_admin === 1;
    
    if (!currentUserId) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    // 🔥 VÉRIFICATION DES DROITS (AJOUT)
    const checkRightsQuery = `
        SELECT 
            u.id_utilisateur,
            u.created_by,
            u.role,
            (SELECT is_super_admin FROM utilisateur WHERE id_utilisateur = ?) as current_is_super_admin
        FROM utilisateur u
        WHERE u.id_utilisateur = ?
    `;
    
    db.query(checkRightsQuery, [currentUserId, userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const targetUser = results[0];
        const currentIsSuperAdmin = targetUser.current_is_super_admin === 1;
        
        let hasRight = false;
        
        if (currentIsSuperAdmin) {
            hasRight = true;  // Super Admin peut tout modifier
        } else if (targetUser.created_by === currentUserId) {
            hasRight = true;  // Admin peut modifier ses utilisateurs
        } else if (currentUserId === parseInt(userId)) {
            hasRight = false; // Un utilisateur ne peut pas modifier ses propres permissions
        }
        
        if (!hasRight) {
            return res.status(403).json({ 
                error: 'Vous n\'avez pas le droit de modifier les permissions de cet utilisateur' 
            });
        }
        
        // ✅ Suite du code original (inchangé)
        let query;
        let queryParams;
      
        if (submenuId) {
            query = `
                UPDATE permission 
                SET can_read = ?, can_edit = ?, can_comment = ?, can_delete = ? 
                WHERE user_id = ? AND menus_id = ? AND submenu_id = ?
            `;
            queryParams = [can_read, can_edit, can_comment, can_delete, userId, optionId, submenuId];
        } else {
            query = `
                UPDATE permission 
                SET can_read = ?, can_edit = ?, can_comment = ?, can_delete = ? 
                WHERE user_id = ? AND menus_id = ? AND (submenu_id IS NULL OR submenu_id = 0)
            `;
            queryParams = [can_read, can_edit, can_comment, can_delete, userId, optionId];
        }
      
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Erreur lors de la mise à jour des permissions:', err);
                return res.status(500).json({ error: 'Erreur lors de la mise à jour des permissions' });
            }
      
            if (results.affectedRows === 0) {
                const insertQuery = `
                    INSERT INTO permission (user_id, menus_id, submenu_id, can_read, can_edit, can_comment, can_delete) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                const insertParams = submenuId
                    ? [userId, optionId, submenuId, can_read, can_edit, can_comment, can_delete]
                    : [userId, optionId, 0, can_read, can_edit, can_comment, can_delete];
      
                db.query(insertQuery, insertParams, (insertErr) => {
                    if (insertErr) {
                        console.error('Erreur lors de l\'insertion des permissions:', insertErr);
                        return res.status(500).json({ error: 'Erreur lors de l\'insertion des permissions' });
                    }
                    res.json({ message: 'Permissions updated successfully!' });
                });
            } else {
                res.json({ message: 'Permissions updated successfully!' });
            }
        });
    });
};

/* exports.putPermission = (req, res) => {
    const userId = req.params.userId;
    const optionId = req.params.optionId;
    const submenuId = req.query.submenuId;
    const { can_read, can_edit, can_comment, can_delete } = req.body;
  
    let query;
    let queryParams;
  
    if (submenuId) {
      // Si submenuId est fourni, mettez à jour les permissions pour le sous-menu
      query = `
        UPDATE permission 
        SET can_read = ?, can_edit = ?, can_comment = ?, can_delete = ? 
        WHERE user_id = ? AND menus_id = ? AND submenu_id = ?
      `;
      queryParams = [can_read, can_edit, can_comment, can_delete, userId, optionId, submenuId];
    } else {
      // Si aucun submenuId, mettez à jour les permissions pour le menu principal
      query = `
        UPDATE permission 
        SET can_read = ?, can_edit = ?, can_comment = ?, can_delete = ? 
        WHERE user_id = ? AND menus_id = ? AND (submenu_id IS NULL OR submenu_id = 0)
      `;
      queryParams = [can_read, can_edit, can_comment, can_delete, userId, optionId];
    }
  
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Erreur lors de la mise à jour des permissions:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour des permissions' });
      }
  
      if (results.affectedRows === 0) {
        // Si aucune ligne n'a été mise à jour, ajoutez une nouvelle ligne
        const insertQuery = `
          INSERT INTO permission (user_id, menus_id, submenu_id, can_read, can_edit, can_comment, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const insertParams = submenuId
          ? [userId, optionId, submenuId, can_read, can_edit, can_comment, can_delete]
          : [userId, optionId, 0, can_read, can_edit, can_comment, can_delete]; // Utiliser 0 pour submenu_id si aucun sous-menu n'est fourni
  
        db.query(insertQuery, insertParams, (insertErr, insertResults) => {
          if (insertErr) {
            console.error('Erreur lors de l\'insertion des permissions:', insertErr);
            return res.status(500).json({ error: 'Erreur lors de l\'insertion des permissions' });
          }
          res.json({ message: 'Permissions updated successfully!' });
        });
      } else {
        res.json({ message: 'Permissions updated successfully!' });
      }
    });
  }; */

//Permission Tache
exports.getPermissionTache = (req, res) => {
  const { id_tache } = req.query;
  const q = `SELECT id_user, can_view, can_edit, can_comment FROM permissions_tache WHERE id_tache = ?`

  db.query(q, [id_tache], (error, data) => {
    if (error) {
        return res.status(500).send(error);
    }
    return res.status(200).json(data);
});
};

exports.postPermissionTache = (req, res) => {
  const { id_tache, id_user, user_cr, id_ville, id_departement, can_view, can_edit, can_comment, can_delete } = req.body;

  if (!id_tache || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_tache' et 'id_user' sont requis." });
  }

  try {
    const qSelect = `SELECT * FROM permissions_tache WHERE id_tache = ? AND id_user = ?`;
    const valuesSelect = [id_tache, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      if (data.length > 0) {
        const qUpdate = `
          UPDATE permissions_tache 
          SET can_view = ?, can_edit = ?, can_comment = ?, can_delete = ?
          WHERE id_tache = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, can_delete, id_tache, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          // Ajoutez une notification après la mise à jour des permissions
          addNotification(user_cr, id_user, "Vos permissions pour une tâche ont été mises à jour.", res);
        });
      } else {
        const qInsert = `
          INSERT INTO permissions_tache (id_tache, id_user, id_ville, id_departement, can_view, can_edit, can_comment, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_tache, id_user, id_ville, id_departement, can_view, can_edit, can_comment, can_delete];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }
          const tacheSQL = `SELECT t.nom_tache FROM tache t WHERE t.id_tache = ?`
          db.query(tacheSQL, [id_tache], (error, datas) => {
            if(error) {
              console.error("Erreur lors de recupération des taches:", errorInsert);
              return res.status(500).send({ error: "Erreur lors de la récuperation des taches." });
            }

            const nomTache = datas[0].nom_tache;

            const userSQL = `SELECT email FROM utilisateur WHERE id_utilisateur = ?`
            db.query(userSQL, [id_user], (error,data) => {
              if (error) {
                console.error("Erreur lors de l'insertion des permissions:", errorInsert);
                return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
              }
              const email = data[0]?.email;

              const message = `
🆕 Vous avez été ajouté à la tache : ${nomTache}

Merci de consulter la plateforme pour plus de détails.
`;
      sendEmail({
        email: email,
        subject: '📌 Vous avez été ajouté',
        message
      });
    })
  })

  // Ajoutez une notification après l'insertion des permissions
      addNotification(user_cr, id_user, "Vous avez reçu un accès à une nouvelle tâche.", res);
      });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

// Fonction pour ajouter une notification
const addNotification = (userId, receiverId, message, res) => {
  const qInsertNotification = `
    INSERT INTO notifications (user_id, target_user_id, message, timestamp) 
    VALUES (?, ?, ?, NOW())
  `;
  const valuesNotification = [userId, receiverId, message];

  db.query(qInsertNotification, valuesNotification, (error) => {
    if (error) {
      console.error("Erreur lors de l'ajout de la notification:", error);
      return res.status(500).send({ error: "Erreur lors de l'ajout de la notification." });
    }

    // Répondre une fois l'opération terminée
    res.status(200).send({ message: "Permission et notification ajoutées/mises à jour avec succès." });
  });
};

//Permission ville
exports.getPermissionVille = (req, res) => {

  const q = `SELECT * FROM user_villes`;

  db.query(q, (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.getPermissionVilleOne = (req, res) => {
  const { id_user } = req.query;

  const q = `SELECT * FROM permissions_tache WHERE id_user = ?`;

  db.query(q, [id_user], (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.postPermissionVille = (req, res) => {
  const { id_user, id_ville, can_view } = req.body;

  try {
    // Vérifier si l'utilisateur a déjà cette permission pour la ville
    const qSelect = `SELECT * FROM user_villes WHERE id_ville = ? AND id_user = ?`;
    const valuesSelect = [id_ville, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      // Si l'utilisateur a déjà cette permission, mettre à jour
      if (data.length > 0) {
        const qUpdate = `
          UPDATE user_villes 
          SET can_view = ? 
          WHERE id_user = ? AND id_ville = ?
        `;
        const valuesUpdate = [can_view, id_user, id_ville]; // Mise à jour de la permission spécifique

        db.query(qUpdate, valuesUpdate, (errorP, dataP) => {
          if (errorP) {
            console.error("Erreur lors de la mise à jour des permissions:", errorP);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          return res.status(200).send({ message: "Permissions mises à jour avec succès." });
        });
      } else {
        // Si l'utilisateur n'a pas cette permission, insérer une nouvelle entrée
        const qInsert = `INSERT INTO user_villes (id_user, id_ville, can_view) VALUES (?, ?, ?)`;
        const valuesInsert = [id_user, id_ville, can_view];

        db.query(qInsert, valuesInsert, (errorI, dataI) => {
          if (errorI) {
            console.error("Erreur lors de l'ajout des permissions:", errorI);
            return res.status(500).send({ error: "Erreur lors de l'ajout des permissions." });
          }

          return res.status(200).send({ message: "Permissions ajoutées avec succès." });
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

//Permission de departement
exports.getPermissionDepartementOne = (req, res) => {
  const { id_user } = req.query;

  const q = `SELECT * FROM permissions_tache WHERE id_user = ?`;

  db.query(q, [id_user], (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.postPermissionDepartement = (req, res) => {
  const { id_user, id_departement, id_ville, can_view } = req.body;

  // Vérification des données d'entrée
  if (!id_user || !id_departement || !id_ville || can_view === undefined) {
    return res.status(400).send({ error: "Les champs id_user, id_departement, id_ville et can_view sont requis." });
  }

  try {
    // Vérifier si l'utilisateur a déjà cette permission pour le département et la ville
    const qSelect = `
      SELECT * 
      FROM user_departements 
      WHERE id_user = ? AND id_departement = ? AND id_ville = ?
    `;
    const valuesSelect = [id_user, id_departement, id_ville];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur lors de la récupération des permissions." });
      }

      if (data.length > 0) {
        // Mise à jour si la permission existe déjà
        const qUpdate = `
          UPDATE user_departements 
          SET can_view = ? 
          WHERE id_user = ? AND id_departement = ? AND id_ville = ?
        `;
        const valuesUpdate = [can_view, id_user, id_departement, id_ville];

        db.query(qUpdate, valuesUpdate, (errorP) => {
          if (errorP) {
            console.error("Erreur lors de la mise à jour des permissions:", errorP);
            return res.status(500).send({ error: "Erreur interne du serveur lors de la mise à jour des permissions." });
          }

          return res.status(200).send({ message: "Permissions mises à jour avec succès." });
        });
      } else {
        // Insérer si la permission n'existe pas encore
        const qInsert = `
          INSERT INTO user_departements (id_user, id_departement, id_ville, can_view) 
          VALUES (?, ?, ?, ?)
        `;
        const valuesInsert = [id_user, id_departement, id_ville, can_view];

        db.query(qInsert, valuesInsert, (errorI) => {
          if (errorI) {
            console.error("Erreur lors de l'ajout des permissions:", errorI);
            return res.status(500).send({ error: "Erreur interne du serveur lors de l'ajout des permissions." });
          }

          return res.status(200).send({ message: "Permissions ajoutées avec succès." });
        });
      }
    });
  } catch (error) {
    console.error("Erreur interne:", error);
    return res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

//Permission Déclaration ville
exports.getPermissionDeclarationVille = (req, res) => {

  const q = `SELECT * FROM user_declaration`;

  db.query(q, (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.getPermissionDeclarationVilleOne = (req, res) => {
  const { id_ville } = req.query;

  const q = `SELECT * FROM user_declaration WHERE id_ville = ?`;

  db.query(q, [id_ville], (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.postPermissionDeclarationVille = (req, res) => {
  const { id_user, id_ville, can_view } = req.body;

  try {
    // Vérifier si l'utilisateur a déjà cette permission pour la ville
    const qSelect = `SELECT * FROM user_declaration WHERE id_ville = ? AND id_user = ?`;
    const valuesSelect = [id_ville, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      // Si l'utilisateur a déjà cette permission, mettre à jour
      if (data.length > 0) {
        const qUpdate = `
          UPDATE user_declaration 
          SET can_view = ? 
          WHERE id_user = ? AND id_ville = ?
        `;
        const valuesUpdate = [can_view, id_user, id_ville]; // Mise à jour de la permission spécifique

        db.query(qUpdate, valuesUpdate, (errorP, dataP) => {
          if (errorP) {
            console.error("Erreur lors de la mise à jour des permissions:", errorP);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          return res.status(200).send({ message: "Permissions mises à jour avec succès." });
        });
      } else {
        // Si l'utilisateur n'a pas cette permission, insérer une nouvelle entrée
        const qInsert = `INSERT INTO user_declaration (id_user, id_ville, can_view) VALUES (?, ?, ?)`;
        const valuesInsert = [id_user, id_ville, can_view];

        db.query(qInsert, valuesInsert, (errorI, dataI) => {
          if (errorI) {
            console.error("Erreur lors de l'ajout des permissions:", errorI);
            return res.status(500).send({ error: "Erreur lors de l'ajout des permissions." });
          }

          return res.status(200).send({ message: "Permissions ajoutées avec succès." });
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

//Permission declaration client
exports.getPermissionDeclarationClientOne = (req, res) => {
  const { id_client } = req.query;

  const q = `SELECT * FROM user_client WHERE id_client = ?`;

  db.query(q, [id_client], (error, data) => {
      if (error) {
          return res.status(500).send(error);
      }
      return res.status(200).json(data);
  });
};

exports.postPermissionDeclarationClient = (req, res) => {
  const { id_user, id_client, can_view } = req.body;

  try {
    // Vérifier si l'utilisateur a déjà cette permission pour la ville
    const qSelect = `SELECT * FROM user_client WHERE id_client = ? AND id_user = ?`;
    const valuesSelect = [id_client, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      // Si l'utilisateur a déjà cette permission, mettre à jour
      if (data.length > 0) {
        const qUpdate = `
          UPDATE user_client 
          SET can_view = ? 
          WHERE id_user = ? AND id_client = ?
        `;
        const valuesUpdate = [can_view, id_user, id_client]; // Mise à jour de la permission spécifique

        db.query(qUpdate, valuesUpdate, (errorP, dataP) => {
          if (errorP) {
            console.error("Erreur lors de la mise à jour des permissions:", errorP);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          return res.status(200).send({ message: "Permissions mises à jour avec succès." });
        });
      } else {
        // Si l'utilisateur n'a pas cette permission, insérer une nouvelle entrée
        const qInsert = `INSERT INTO user_client (id_user, id_client, can_view) VALUES (?, ?, ?)`;
        const valuesInsert = [id_user, id_client, can_view];

        db.query(qInsert, valuesInsert, (errorI, dataI) => {
          if (errorI) {
            console.error("Erreur lors de l'ajout des permissions:", errorI);
            return res.status(500).send({ error: "Erreur lors de l'ajout des permissions." });
          }

          return res.status(200).send({ message: "Permissions ajoutées avec succès." });
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

//Permission Déclaration
exports.getPermissionDeclaration = (req, res) => {
  const { userId } = req.query;

  const q = `SELECT id_user, can_view, can_edit, can_comment, can_delete, id_template FROM permissions_declaration pd WHERE pd.id_user  = ?`

  db.query(q, [userId], (error, data) => {
    if (error) {
        return  res.status(500).send(error);
    }
    return res.status(200).json(data);
});
}

exports.postPermissionDeclaration = (req, res) => {
  const { id_template, id_user, id_client,	id_ville, can_view, can_edit, can_comment, can_delete } = req.body;

  if (!id_template || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_tache' et 'id_user' sont requis." });
  }

  try {
    // Vérifiez si une ligne existe déjà pour id_declaration et id_user
    const qSelect = `SELECT * FROM permissions_declaration WHERE id_template = ? AND id_user = ?`;
    const valuesSelect = [id_template, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      if (data.length > 0) {
        const qUpdate = `
          UPDATE permissions_declaration 
          SET can_view = ?, can_edit = ?, can_comment = ?, can_delete = ? 
          WHERE id_template = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, can_delete, id_template, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          // Ajoutez une notification après la mise à jour des permissions
          addNotification(user_cr, id_user, "Vos permissions pour une declaration ont été mises à jour.", res);
        });
        
      } else {
        const qInsert = `
          INSERT INTO permissions_declaration  (id_template, id_user, id_client, id_ville, can_view, can_edit, can_comment, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_template, id_user, id_client,	id_ville, can_view, can_edit, can_comment, can_delete];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }
          addNotification(user_cr, id_user, "Vous avez reçu un accès à une nouvelle tâche.", res);
        });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

//Permission projet
exports.getPermissionProjet = (req, res) => {
  const { userId } = req.query;

  const q = `SELECT id_user, can_view, can_edit, can_comment, can_delete, id_projet FROM permissions_projet pd WHERE pd.id_user  = ?`

  db.query(q, [userId], (error, data) => {
    if (error) {
        return  res.status(500).send(error);
    }
    return res.status(200).json(data);
  });
};

exports.postPermissionProjet = (req, res) => {
  const { id_projet, id_user, can_view, can_edit, can_comment, can_delete, user_cr } = req.body;

  if (!id_projet || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_projet' et 'id_user' sont requis." });
  }

  try {
    // Vérifiez si une ligne existe déjà pour id_declaration et id_user
    const qSelect = `SELECT * FROM permissions_projet WHERE id_projet = ? AND id_user = ?`;
    const valuesSelect = [id_projet, id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      if (data.length > 0) {
        const qUpdate = `
          UPDATE permissions_projet 
          SET can_view = ?, can_edit = ?, can_comment = ?, can_delete = ? 
          WHERE id_projet = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, can_delete, id_projet, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          // Ajoutez une notification après la mise à jour des permissions
          addNotification(user_cr, id_user, "Vos permissions pour un projet ont été mises à jour.", res);
        });
        
      } else {
        // Insérez une nouvelle ligne
        const qInsert = `
          INSERT INTO permissions_projet (id_projet, id_user, can_view, can_edit, can_comment, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_projet, id_user, can_view, can_edit, can_comment, can_delete];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }
          addNotification(user_cr, id_user, "Vous avez reçu un accès à un nouveau projet.", res);
        });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

exports.postPermissionUserVehicule = (req, res) => {
    const { utilisateur, vehicules } = req.body;

    const checkUserQuery = 'SELECT id_utilisateur FROM utilisateur WHERE email = ?';
    db.query(checkUserQuery, [utilisateur.email], async (err, userResults) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        let userId;

        if (userResults.length === 0) {
            const defaultPassword = '1234';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // 🔥 tenant_id est géré ICI par le backend
            const insertUserQuery = `
                INSERT INTO utilisateur 
                (nom, prenom, email, mot_de_passe, role, id_admin, tenant_id, is_super_admin, date_creation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;
            
            // 🔥 LOGIQUE: tenant_id = son propre ID (sera mis à jour après insertion)
            // 🔥 is_super_admin = 0 (par défaut)
            
            db.query(insertUserQuery, [
                utilisateur.nom || '',
                utilisateur.prenom || '',
                utilisateur.email,
                hashedPassword,
                utilisateur.role || 'Admin',
                utilisateur.id_admin || null,
                null,  // tenant_id temporaire
                0,     // is_super_admin
            ], (err, result) => {
                if (err) {
                    console.error('❌ Erreur insertion:', err);
                    return res.status(500).json({ success: false, error: err.message });
                }
                
                userId = result.insertId;
                console.log('✅ Utilisateur créé avec ID:', userId);
                
                // 🔥 Mettre à jour tenant_id avec son propre ID
                const updateTenantQuery = 'UPDATE utilisateur SET tenant_id = ? WHERE id_utilisateur = ?';
                db.query(updateTenantQuery, [userId, userId], (updateErr) => {
                    if (updateErr) {
                        console.error('⚠️ Erreur mise à jour tenant_id:', updateErr);
                    } else {
                        console.log('✅ tenant_id mis à jour:', userId);
                    }
                    
                    // Traiter les véhicules
                    processVehicules(userId, vehicules, res);
                });
            });
        } else {
            userId = userResults[0].id_utilisateur;
            console.log('✅ Utilisateur existant:', userId);
            
            // Mettre à jour si nécessaire
            const updateUserQuery = `
                UPDATE utilisateur 
                SET nom = ?, prenom = ?, role = ?, date_modification = NOW()
                WHERE id_utilisateur = ?
            `;
            db.query(updateUserQuery, [
                utilisateur.nom || '',
                utilisateur.prenom || '',
                utilisateur.role || 'Admin',
                userId
            ], (updateErr) => {
                if (updateErr) {
                    console.error('⚠️ Erreur mise à jour:', updateErr);
                }
                processVehicules(userId, vehicules, res);
            });
        }
    });
};

function processVehicules(userId, vehicules, res) {
    let completed = 0;
    let errors = [];
    const total = vehicules.length;

    if (total === 0) {
        return res.json({ 
            success: true, 
            message: 'Aucun véhicule à synchroniser', 
            data: { utilisateur_id: userId, vehicules_count: 0 } 
        });
    }

    for (const vehicule of vehicules) {
        const checkVehiculeQuery = 'SELECT id_vehicule FROM vehicules WHERE immatriculation = ?';
        db.query(checkVehiculeQuery, [vehicule.immatriculation], (err, results) => {
            if (err) {
                console.error('❌ Erreur vérification véhicule:', err);
                errors.push({ immatriculation: vehicule.immatriculation, error: err.message });
                checkComplete();
                return;
            }

            if (results.length === 0) {
                // 🔥 tenant_id = userId (l'utilisateur qui possède le véhicule)
                const insertVehiculeQuery = `
                    INSERT INTO vehicules 
                    (immatriculation, numero_ordre, id_marque, id_modele, id_admin, tenant_id, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                db.query(insertVehiculeQuery, [
                    vehicule.immatriculation,
                    vehicule.numero_ordre || null,
                    vehicule.id_marque || null,
                    vehicule.id_modele || null,
                    vehicule.id_admin || null,
                    userId  // 🔥 tenant_id = l'ID de l'utilisateur
                ], (err, result) => {
                    if (err) {
                        console.error('❌ Erreur création véhicule:', err);
                        errors.push({ immatriculation: vehicule.immatriculation, error: err.message });
                        checkComplete();
                        return;
                    }
                    console.log('✅ Véhicule créé, tenant_id:', userId);
                    createPermission(userId, result.insertId, () => checkComplete());
                });
            } else {
                console.log('✅ Véhicule existant:', vehicule.immatriculation);
                const vehiculeId = results[0].id_vehicule;
                createPermission(userId, vehiculeId, () => checkComplete());
            }
        });
    }

    function createPermission(userId, vehiculeId, callback) {
        const checkPermissionQuery = 'SELECT id FROM utilisateur_vehicule WHERE id_utilisateur = ? AND id_vehicule = ?';
        db.query(checkPermissionQuery, [userId, vehiculeId], (checkErr, checkResults) => {
            if (checkErr) {
                console.error('❌ Erreur vérification permission:', checkErr);
                callback();
                return;
            }
            
            if (checkResults.length === 0) {
                const query = 'INSERT INTO utilisateur_vehicule (id_utilisateur, id_vehicule, created_at) VALUES (?, ?, NOW())';
                db.query(query, [userId, vehiculeId], (err) => {
                    if (err) {
                        console.error('❌ Erreur création permission:', err);
                    } else {
                        console.log('✅ Permission créée:', { userId, vehiculeId });
                    }
                    callback();
                });
            } else {
                console.log('✅ Permission déjà existante');
                callback();
            }
        });
    }

    function checkComplete() {
        completed++;
        if (completed === total) {
            res.json({ 
                success: errors.length === 0,
                message: errors.length === 0 ? 'Permissions synchronisées' : 'Synchronisation partielle',
                data: { 
                    utilisateur_id: userId, 
                    vehicules_count: total,
                    errors: errors.length > 0 ? errors : undefined
                } 
            });
        }
    }
}