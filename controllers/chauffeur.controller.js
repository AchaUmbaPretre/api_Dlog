const { queryAsync } = require('./../config/database');

exports.loginChauffeur = async (req, res) => {
  try {
    const { nom, telephone } = req.body;

    if (!nom || !telephone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nom et téléphone requis' 
      });
    }

    // Rechercher le chauffeur
    const chauffeurs = await queryAsync(`
      SELECT 
        id_chauffeur,
        nom,
        prenom,
        telephone,
        statut,
        matricule,
        id_permis
      FROM chauffeurs 
      WHERE nom = ? AND telephone = ?
    `, [nom, telephone]);

    if (chauffeurs.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Nom ou téléphone incorrect' 
      });
    }

    const chauffeur = chauffeurs[0];

    // Vérifier si le chauffeur est actif
    if (chauffeur.statut !== 1) {
      return res.status(403).json({ 
        success: false, 
        message: 'Compte désactivé. Contactez l\'administration' 
      });
    }

    // Générer un token simple (ou JWT)
    const token = Buffer.from(`${chauffeur.id_chauffeur}:${Date.now()}`).toString('base64');

    // Mettre à jour dernière connexion
    await queryAsync(`
      UPDATE chauffeurs 
      SET date_modification = NOW() 
      WHERE id_chauffeur = ?
    `, [chauffeur.id_chauffeur]);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        token,
        chauffeur: {
          id: chauffeur.id_chauffeur,
          nom: chauffeur.nom,
          prenom: chauffeur.prenom,
          telephone: chauffeur.telephone,
          matricule: chauffeur.matricule,
        }
      }
    });

  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
}

exports.profilChauffeur = async (req, res) => {
  res.json({
    success: true,
    data: req.chauffeur
  });
}

//Chauffeur
exports.getChauffeurCount = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    
    if (!isSuperAdmin && !tenantId) {
        return res.status(200).json({
            message: 'Le count est récupéré avec succès',
            data: [{ nbre_chauffeur: 0 }]
        });
    }
    
    try {
        let query = `SELECT COUNT(id) AS nbre_chauffeur FROM chauffeurs`;
        let params = [];
        
        if (!isSuperAdmin) {
            query += ` WHERE tenant_id = ?`;
            params.push(tenantId);
        }
        
        const chauffeurs = await queryAsync(query, params);
        
        return res.status(200).json({
            message: 'Le count est récupéré avec succès',
            data: chauffeurs,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chauffeurs :', error);
        
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
        });
    }
};

exports.getChauffeur = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    
    if (!isSuperAdmin && !tenantId) {
        return res.status(200).json({
            message: 'Liste des chauffeurs récupérée avec succès',
            data: []
        });
    }
    
    try {
        let query = `
            SELECT 
                ch.*, 
                s.nom_site
            FROM chauffeurs ch
            LEFT JOIN affectations a ON ch.id_chauffeur = a.id_chauffeur
            LEFT JOIN sites s ON a.id_site = s.id_site
        `;
        let params = [];
        
        if (!isSuperAdmin) {
            query += ` WHERE ch.tenant_id = ?`;
            params.push(tenantId);
        }
        
        query += ` ORDER BY ch.nom ASC`;
        
        const chauffeurs = await queryAsync(query, params);
        
        return res.status(200).json({
            message: 'Liste des chauffeurs récupérée avec succès',
            data: chauffeurs,
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des chauffeurs :', error);
        
        return res.status(500).json({
            error: "Une erreur s'est produite lors de la récupération des chauffeurs.",
        });
    }
};

exports.postChauffeur = async (req, res) => {
    const { tenantId, isSuperAdmin } = req;
    const currentUserId = req.user?.id;
    
    // Vérifier les droits
    if (!isSuperAdmin && !tenantId) {
        return res.status(403).json({ error: 'Non autorisé à ajouter un chauffeur' });
    }
    
    const checkTenantQuery = 'SELECT id_utilisateur FROM utilisateur WHERE tenant_id = ? OR id_utilisateur = ?';
    const tenantExists = await queryAsync(checkTenantQuery, [tenantId, tenantId]);
    
    if (!isSuperAdmin && (!tenantExists || tenantExists.length === 0)) {
        return res.status(404).json({ error: 'Tenant non trouvé' });
    }
    
    try {
        const profil = req?.files?.map((file) => file.path.replace(/\\/g, '/')).join(',') || null;

        const {
            matricule,
            nom,
            prenom,
            telephone,
            adresse,
            id_etat_civil,
            statut,
            sexe,
            id_type_contrat,
            id_fonction,
            type_travail,
            id_permis,
            id_ville,
            date_naissance,
            date_engagement,
            user_cr,
            tel_service,
        } = req.body;

        const query = `
            INSERT INTO chauffeurs (
                matricule, nom, prenom, telephone, adresse, id_etat_civil,
                statut, profil, sexe, id_type_contrat, id_fonction, type_travail,
                id_permis, id_ville, date_naissance, date_engagement, 
                user_cr, tel_service, tenant_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            matricule, nom, prenom, telephone, adresse, id_etat_civil,
            statut, profil, sexe, id_type_contrat, id_fonction, type_travail,
            id_permis, id_ville, date_naissance, date_engagement, 
            user_cr, tel_service,
            tenantId,
            currentUserId
        ];

        const result = await queryAsync(query, values);

        return res.status(201).json({
            message: 'Chauffeur ajouté avec succès',
            data: { 
                id: result.insertId, 
                nom, 
                prenom,
                tenant_id: tenantId
            },
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du chauffeur :', error);

        const statusCode = error.code === 'ER_DUP_ENTRY' ? 409 : 500;
        const errorMessage =
            error.code === 'ER_DUP_ENTRY'
                ? "Un chauffeur avec ces informations existe déjà."
                : "Une erreur s'est produite lors de l'ajout du chauffeur.";

        return res.status(statusCode).json({ error: errorMessage });
    }
};

//Version mobile
exports.missionChauffeurById = async (req, res) => {
  try {
    const missions = await queryAsync(`
      SELECT 
        bs.id_bande_sortie,
        bs.numero_bon_sortie,
        bs.id_vehicule,
        bs.id_chauffeur,
        bs.date_prevue,
        bs.approche_start_time,
        bs.approche_end_time,
        bs.distance_approche_km,
        bs.carburant_approche_litres,
        d.nom_destination AS destination,
        bs.statut_mission,
        bs.distance_km,
        bs.carburant_litres,
        bs.sortie_time,
        bs.retour_time,
        v.immatriculation,
        v.consommation_carburant,
        v.id_capteur,
        -- ✅ Ajouter les infos du chauffeur
        c.nom AS chauffeur_nom,
        c.prenom AS chauffeur_prenom,
        c.telephone AS chauffeur_telephone,
        c.matricule AS chauffeur_matricule,
        cl.telephone AS numero_client
      FROM bande_sortie bs
      LEFT JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      LEFT JOIN destination d ON bs.id_destination = d.id_destination
      LEFT JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
      LEFT JOIN client cl ON cl.id_client = bs.id_client
      WHERE bs.id_chauffeur = ?
        AND DATE(bs.date_prevue) = CURDATE()
        AND bs.statut_mission != 'terminee'
      ORDER BY bs.date_prevue ASC
    `, [req.chauffeur.id_chauffeur]);
    
    res.json({ success: true, missions });
  } catch (error) {
    console.error('Erreur missions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.envoyerPosition = async (req, res) => {
  try {
    const { latitude, longitude, id_bande_sortie } = req.body;
    const chauffeurId = req.chauffeur.id_chauffeur;

/*     console.log('📍 Position reçue:', { chauffeurId, latitude, longitude, id_bande_sortie });
 */
    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude et longitude requises' 
      });
    }

    // Optionnel : Sauvegarder dans une table `positions_gps`
    await queryAsync(`
      INSERT INTO positions_gps (id_chauffeur, id_bande_sortie, latitude, longitude, timestamp)
      VALUES (?, ?, ?, ?, NOW())
    `, [chauffeurId, id_bande_sortie || null, latitude, longitude]);

    // Optionnel : Mettre à jour la dernière position du chauffeur
    await queryAsync(`
      UPDATE chauffeurs 
      SET derniere_latitude = ?, derniere_longitude = ?, derniere_position_at = NOW()
      WHERE id_chauffeur = ?
    `, [latitude, longitude, chauffeurId]);

    res.json({ 
      success: true, 
      message: 'Position enregistrée' 
    });
  } catch (error) {
    console.error('❌ Erreur position:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};