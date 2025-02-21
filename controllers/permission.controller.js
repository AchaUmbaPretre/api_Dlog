const { db } = require("./../config/database");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

exports.menusAllOne = (req, res) => {
    const { userId } = req.query;

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
            permission.can_read,
            permission.can_edit,
            permission.can_delete
        FROM menus 
            LEFT JOIN submenus ON menus.id = submenus.menu_id
            LEFT JOIN permission ON menus.id = permission.menus_id AND permission.user_id = ${userId}
            WHERE permission.can_read = 1
            GROUP BY menus.id, submenus.id, permission.can_read, permission.can_edit, permission.can_delete
            ORDER BY menus.id, submenus.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des menus:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des menus' });
        }

        // Traiter les résultats pour structurer les données comme attendu dans le frontend
        const menus = [];
        let currentMenu = null;

        results.forEach(row => {
            if (!currentMenu || currentMenu.menu_id !== row.menu_id) {
                // Nouveau menu rencontré, créer un nouvel objet menu
                currentMenu = {
                    menu_id: row.menu_id,
                    menu_title: row.menu_title,
                    menu_url: row.menu_url,
                    menu_icon: row.menu_icon,
                    subMenus: [],
                    can_read: row.can_read,
                    can_edit: row.can_edit,
                    can_delete: row.can_delete
                };
                menus.push(currentMenu);
            }

            // Ajouter le sous-menu au menu courant
            currentMenu.subMenus.push({
                submenu_id: row.submenu_id,
                submenu_title: row.submenu_title,
                submenu_url: row.submenu_url,
                submenu_icon: row.submenu_icon,
                can_read: row.can_read,
                can_edit: row.can_edit,
                can_delete: row.can_delete
            });
        });

        res.json(menus);
    });
};

exports.menusAll = (req, res) => {
    const {userId} = req.query;

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
        LEFT JOIN permission ON menus.id = permission.menus_id
        ${userId ? `WHERE permission.user_id = ${userId}` : ''}
        GROUP BY menus.id, submenus.id
        ORDER BY menus.id, submenus.id
    `;

    db.query(query,(err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération des menus:', err);
            return res.status(500).json({ error: 'Erreur lors de la récupération des menus' });
        }

        // Traiter les résultats pour structurer les données comme attendu dans le frontend
        const menus = [];
        let currentMenu = null;

        results.forEach(row => {
            if (!currentMenu || currentMenu.menu_id !== row.menu_id) {
                // Nouveau menu rencontré, créer un nouvel objet menu
                currentMenu = {
                    menu_id: row.menu_id,
                    menu_title: row.menu_title,
                    menu_url: row.menu_url,
                    menu_icon: row.menu_icon,
                    subMenus: []
                };
                menus.push(currentMenu);
            }

            // Ajouter le sous-menu au menu courant
            currentMenu.subMenus.push({
                submenu_id: row.submenu_id,
                submenu_title: row.submenu_title,
                submenu_url: row.submenu_url,
                submenu_icon: row.submenu_icon
            });
        });

        res.json(menus);
    });
};

exports.permissions =  (req, res) => {
    const {userId} = req.query;
    db.query(
      'SELECT p.*,o.title, u.nom FROM permission p JOIN menus o ON p.menus_id = o.id JOIN utilisateur u ON p.user_id = u.id_utilisateur WHERE p.user_id = ?',
      [userId],
      (err, results) => {
        if (err) throw err;
        res.json(results);
      }
    );
  };

exports.putPermission = (req, res) => {
    const userId = req.params.userId;
    const optionId = req.params.optionId;
    const submenuId = req.body.submenu_id;
    const { can_read, can_edit, can_delete } = req.body;
  
    let query;
    let queryParams;
  
    if (submenuId) {
      // If submenuId is provided, update permissions for the submenu
      query = `
        UPDATE permission 
        SET can_read = ?, can_edit = ?, can_delete = ? 
        WHERE user_id = ? AND menus_id = ? AND submenu_id = ?
      `;
      queryParams = [can_read, can_edit, can_delete, userId, optionId, submenuId];
    } else {
      // If no submenuId, update permissions for the main menu
      query = `
        UPDATE permission 
        SET can_read = ?, can_edit = ?, can_delete = ? 
        WHERE user_id = ? AND menus_id = ? AND submenu_id IS NULL
      `;
      queryParams = [can_read, can_edit, can_delete, userId, optionId];
    }
  
    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error('Erreur lors de la mise à jour des permissions:', err);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour des permissions' });
      }
  
      if (results.affectedRows === 0) {
        // Si aucune ligne n'a été mise à jour, ajoutez une nouvelle ligne
        const insertQuery = `
          INSERT INTO permission (user_id, menus_id, submenu_id, can_read, can_edit, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const insertParams = submenuId
          ? [userId, optionId, submenuId, can_read, can_edit, can_delete]
          : [userId, optionId, null, can_read, can_edit, can_delete]; // Null for submenu_id if it's not provided
  
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
  };
  
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
}

/* exports.postPermissionTache = (req, res) => {
  const { id_tache, id_user, can_view, can_edit, can_comment } = req.body;

  if (!id_tache || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_tache' et 'id_user' sont requis." });
  }

  try {
    // Vérifiez si une ligne existe déjà pour id_tache et id_user
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
          SET can_view = ?, can_edit = ?, can_comment = ? 
          WHERE id_tache = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, id_tache, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          res.status(200).send({ message: "Permission mise à jour avec succès." });
        });
      } else {
        // Insérez une nouvelle ligne
        const qInsert = `
          INSERT INTO permissions_tache (id_tache, id_user, can_view, can_edit, can_comment) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_tache, id_user, can_view, can_edit, can_comment];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }

          res.status(201).send({ message: "Permission ajoutée avec succès." });
        });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
}; */

exports.postPermissionTache = (req, res) => {
  const { id_tache, id_user, can_view, can_edit, can_comment } = req.body;

  if (!id_tache || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_tache' et 'id_user' sont requis." });
  }

  try {
    // Vérifiez si une ligne existe déjà pour id_tache et id_user
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
          SET can_view = ?, can_edit = ?, can_comment = ? 
          WHERE id_tache = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, id_tache, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          // Ajoutez une notification après la mise à jour des permissions
          addNotification(id_user, "Vos permissions pour une tâche ont été mises à jour.", res);
        });
      } else {
        // Insérez une nouvelle ligne
        const qInsert = `
          INSERT INTO permissions_tache (id_tache, id_user, can_view, can_edit, can_comment) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_tache, id_user, can_view, can_edit, can_comment];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }

          // Ajoutez une notification après l'insertion des permissions
          addNotification(id_user,"Vous avez reçu un accès à une nouvelle tâche.", res);
        });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
};

// Fonction pour ajouter une notification
const addNotification = (userId, message, res) => {
  const qInsertNotification = `
    INSERT INTO notifications (user_id, message, timestamp) 
    VALUES (?, ?, NOW())
  `;
  const valuesNotification = [userId, message];

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
  const { id_ville } = req.query;

  const q = `SELECT * FROM user_villes WHERE id_ville = ?`;

  db.query(q, [id_ville], (error, data) => {
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
  const { id_departement } = req.query;

  const q = `SELECT * FROM user_departements WHERE id_departement  = ?`;

  db.query(q, [id_departement], (error, data) => {
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
    const valuesSelect = [id_ville, id_user];

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
        const qInsert = `INSERT INTO user_client (id_user, id_ville, can_view) VALUES (?, ?, ?)`;
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
  const { id_declaration } = req.query;

  const q = `SELECT id_user, can_view, can_edit, can_comment FROM permissions_declaration WHERE id_declaration = ?`

  db.query(q, [id_declaration], (error, data) => {
    if (error) {
        return  res.status(500).send(error);
    }
    return res.status(200).json(data);
});
}

exports.postPermissionDeclaration = (req, res) => {
  const { id_declaration, id_user, can_view, can_edit, can_comment } = req.body;


  if (!id_declaration || !id_user) {
    return res.status(400).send({ error: "Les champs 'id_tache' et 'id_user' sont requis." });
  }

  try {
    // Vérifiez si une ligne existe déjà pour id_tache et id_user
    const qSelect = `SELECT * FROM permissions_declaration WHERE id_declaration = ? AND id_user = ?`;
    const valuesSelect = [id_declaration , id_user];

    db.query(qSelect, valuesSelect, (error, data) => {
      if (error) {
        console.error("Erreur lors de la récupération des permissions:", error);
        return res.status(500).send({ error: "Erreur interne du serveur." });
      }

      if (data.length > 0) {
        const qUpdate = `
          UPDATE permissions_declaration 
          SET can_view = ?, can_edit = ?, can_comment = ? 
          WHERE id_declaration = ? AND id_user = ?
        `;
        const valuesUpdate = [can_view, can_edit, can_comment, id_declaration, id_user];

        db.query(qUpdate, valuesUpdate, (errorUpdate) => {
          if (errorUpdate) {
            console.error("Erreur lors de la mise à jour des permissions:", errorUpdate);
            return res.status(500).send({ error: "Erreur lors de la mise à jour des permissions." });
          }

          // Ajoutez une notification après la mise à jour des permissions
          addNotification(id_user, "Vos permissions pour une declaration ont été mises à jour.", res);
        });
      } else {
        // Insérez une nouvelle ligne
        const qInsert = `
          INSERT INTO permissions_declaration  (id_declaration, id_user, can_view, can_edit, can_comment) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const valuesInsert = [id_declaration, id_user, can_view, can_edit, can_comment];

        db.query(qInsert, valuesInsert, (errorInsert) => {
          if (errorInsert) {
            console.error("Erreur lors de l'insertion des permissions:", errorInsert);
            return res.status(500).send({ error: "Erreur lors de l'insertion des permissions." });
          }

          // Ajoutez une notification après l'insertion des permissions
          addNotification(id_user,"Vous avez reçu un accès à une nouvelle tâche.", res);
        });
      }
    });
  } catch (error) {
    console.error("Erreur inattendue:", error);
    res.status(500).send({ error: "Erreur interne du serveur." });
  }
};