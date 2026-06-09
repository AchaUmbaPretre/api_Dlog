const db = require('../config/database');

const verifierLimiteVehicules = async (req, res, next) => {
    const { tenantId, isSuperAdmin } = req;
    const userId = req.user?.id;

    // Super Admin n'a pas de limite
    if (isSuperAdmin) {
        return next();
    }

    if (!tenantId) {
        return res.status(403).json({ 
            success: false, 
            message: "Tenant non identifié" 
        });
    }

    try {
        // Récupérer la limite de l'utilisateur
        const queryUtilisateur = `
            SELECT limite_vehicules, nb_vehicules_utilises 
            FROM utilisateur 
            WHERE id_utilisateur = ? AND tenant_id = ?
        `;
        
        const user = await queryAsync(queryUtilisateur, [userId, tenantId]);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Utilisateur non trouvé" 
            });
        }

        // Si pas de limite définie, on continue
        if (user.limite_vehicules === null) {
            return next();
        }

        // Compter les véhicules actuels du tenant
        const queryComptage = `
            SELECT COUNT(*) AS total 
            FROM vehicules 
            WHERE tenant_id = ? AND est_supprime = 0
        `;
        const result = await queryAsync(queryComptage, [tenantId]);
        
        const nbVehiculesActuels = result.total;

        // Vérifier si la limite est atteinte
        if (nbVehiculesActuels >= user.limite_vehicules) {
            return res.status(403).json({
                success: false,
                message: `Limite de véhicules atteinte. Maximum: ${user.limite_vehicules} véhicules.`,
                code: 'LIMITE_ATTEINTE',
                limite: user.limite_vehicules,
                actuel: nbVehiculesActuels
            });
        }

        next();
    } catch (error) {
        console.error("Erreur vérification limite:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur lors de la vérification de la limite" 
        });
    }
};

module.exports = { verifierLimiteVehicules };