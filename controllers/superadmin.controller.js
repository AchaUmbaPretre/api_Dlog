const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Récupérer tous les admins (créés par Super Admin)
exports.getAdmins = (req, res) => {
    const superAdminId = req.user?.id || req.query.superAdminId;
    
    const query = `
        SELECT 
            u.id_utilisateur,
            u.nom,
            u.email,
            u.role,
            u.niveau,
            u.date_creation,
            u.created_by,
            COUNT(DISTINCT p.id_permission) as total_permissions,
            COUNT(DISTINCT uv.id_vehicule) as total_vehicules
        FROM utilisateur u
        LEFT JOIN permission p ON u.id_utilisateur = p.user_id
        LEFT JOIN utilisateur_vehicule uv ON u.id_utilisateur = uv.id_utilisateur
        WHERE u.created_by = ? AND u.role = 'Admin'
        GROUP BY u.id_utilisateur
    `;
    
    db.query(query, [superAdminId], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, data: results });
    });
};

// Créer un nouvel admin
exports.createAdmin = async (req, res) => {
    const { nom, email, role = 'Admin', permissions_limit = {} } = req.body;
    const superAdminId = req.user?.id || req.body.superAdminId;
    
    // Vérifier que c'est un super admin
    const checkQuery = 'SELECT is_super_admin FROM utilisateur WHERE id_utilisateur = ?';
    db.query(checkQuery, [superAdminId], async (err, results) => {
        if (err || results.length === 0 || results[0].is_super_admin !== 1) {
            return res.status(403).json({ 
                success: false, 
                message: 'Seul un Super Admin peut créer un admin' 
            });
        }
        
        // Créer l'admin
        const defaultPassword = '1234';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const insertQuery = `
            INSERT INTO utilisateur 
            (nom, email, mot_de_passe, role, created_by, niveau, is_super_admin, date_creation)
            VALUES (?, ?, ?, ?, ?, 1, 0, NOW())
        `;
        
        db.query(insertQuery, [nom, email, hashedPassword, role, superAdminId], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            
            // Créer les permissions par défaut pour l'admin (sauvegarder les limites)
            const permissionsLimitJSON = JSON.stringify({
                max_users: permissions_limit.max_users || 50,
                max_vehicules: permissions_limit.max_vehicules || 100,
                can_create_users: permissions_limit.can_create_users !== false,
                can_assign_permissions: permissions_limit.can_assign_permissions !== false
            });
            
            // Stocker les limites dans une table ou dans une colonne JSON
            const updateQuery = 'UPDATE utilisateur SET permissions_limits = ? WHERE id_utilisateur = ?';
            db.query(updateQuery, [permissionsLimitJSON, result.insertId]);
            
            res.json({
                success: true,
                message: 'Admin créé avec succès',
                data: {
                    id_admin: result.insertId,
                    nom,
                    email,
                    mot_de_passe: defaultPassword
                }
            });
        });
    });
};

// Modifier les permissions d'un admin
exports.updateAdminPermissions = (req, res) => {
    const { adminId } = req.params;
    const { permissions_limit } = req.body;
    const superAdminId = req.user?.id;
    
    // Vérifier que l'admin appartient bien au super admin
    const checkQuery = 'SELECT id_utilisateur FROM utilisateur WHERE id_utilisateur = ? AND created_by = ?';
    db.query(checkQuery, [adminId, superAdminId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous ne pouvez pas modifier cet admin' 
            });
        }
        
        const updateQuery = 'UPDATE utilisateur SET permissions_limits = ? WHERE id_utilisateur = ?';
        db.query(updateQuery, [JSON.stringify(permissions_limit), adminId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, message: 'Permissions mises à jour' });
        });
    });
};

// Supprimer un admin (et tous ses utilisateurs)
exports.deleteAdmin = (req, res) => {
    const { adminId } = req.params;
    const superAdminId = req.user?.id;
    
    // Vérifier la hiérarchie
    const checkQuery = 'SELECT id_utilisateur FROM utilisateur WHERE id_utilisateur = ? AND created_by = ?';
    db.query(checkQuery, [adminId, superAdminId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Vous ne pouvez pas supprimer cet admin' 
            });
        }
        
        // Supprimer l'admin (cascade: ses utilisateurs seront aussi supprimés si vous avez FOREIGN KEY)
        const deleteQuery = 'DELETE FROM utilisateur WHERE id_utilisateur = ?';
        db.query(deleteQuery, [adminId], (err) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true, message: 'Admin supprimé avec succès' });
        });
    });
};