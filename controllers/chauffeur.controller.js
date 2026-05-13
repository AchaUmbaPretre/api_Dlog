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
        v.id_capteur
      FROM bande_sortie bs
      LEFT JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      LEFT JOIN destination d ON bs.id_destination = d.id_destination
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