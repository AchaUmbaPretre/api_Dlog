// services/rapprochementService.js - Version complète
const moment = require('moment');
const { queryAsync } = require('../config/database');

class RapprochementService {
  
  // Fenêtres temporelles
  getFenetres() {
    return {
      bon: { avant: 12, apres: 2 },      // heures
      tablette: { avant: 30, apres: 30 }, // minutes
      gps: { avant: 30, apres: 30 }       // minutes
    };
  }
  
  // Calcul du score
  calculerScore(hasBS, hasTablette, hasGPS, ecartMinutes = null) {
    let score = 0;
    if (hasBS) score += 50;
    if (hasTablette) score += 30;
    if (hasGPS) score += 40;
    if (ecartMinutes && Math.abs(ecartMinutes) > 20) score -= 30;
    if (!hasBS) score -= 50;
    return Math.max(0, Math.min(100, score));
  }
  
  // Moteur de décision
  determinerStatut(hasBS, hasTablette, hasGPS, autoriseSansBS = false) {
    if (!hasBS && autoriseSansBS && (hasTablette || hasGPS)) {
      return 'SORTIE_AUTORISEE_SANS_BS';
    }
    if (hasBS && hasTablette && hasGPS) return 'CONFORME';
    if (!hasBS && hasTablette && hasGPS) return 'SORTIE_SANS_BON';
    if (hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_POINTEE';
    if (hasBS && hasTablette && !hasGPS) return 'ANOMALIE_A_VERIFIER';
    if (hasBS && !hasTablette && !hasGPS) return 'BON_NON_EXECUTE';
    if (!hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_AUTORISEE';
    return 'A_VERIFIER';
  }
  
  // Récupérer la zone de base du véhicule
  async getZoneBaseVehicule(deviceName) {
    const rows = await queryAsync(`
      SELECT 
        vg.id_geo_dlog,
        gd.nom as zone_nom,
        gd.falcon_id,
        g.name as geofence_name,
        g.coordinates,
        g.type as geofence_type,
        vg.autorise_sans_bs
      FROM vehicules v
      JOIN vehicule_geofence vg ON v.id_vehicule = vg.id_vehicule
      JOIN geofences_dlog gd ON vg.id_geo_dlog = gd.id_geo_dlog
      JOIN geofences g ON gd.falcon_id = g.id_geofence
      WHERE v.name_capteur = ?
        AND v.est_supprime = 0
      LIMIT 1
    `, [deviceName]);
    
    return rows[0] || null;
  }
  
  // Vérifier si un point est dans un polygone
  pointDansPolygone(latitude, longitude, coordinates) {
    if (!coordinates) return true;
    
    try {
      const points = JSON.parse(coordinates);
      let inside = false;
      
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].lat, yi = points[i].lng;
        const xj = points[j].lat, yj = points[j].lng;
        
        const intersect = ((yi > latitude) != (yj > latitude)) &&
          (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      return inside;
    } catch(e) {
      console.error('Erreur parsing polygone:', e);
      return true;
    }
  }
  
  // Vérifier si la sortie est réelle (resté dehors 5+ minutes)
  async isRealExit(deviceName, eventTime, latitude, longitude, zoneCoordinates) {
    const cinqMinutesApres = moment(eventTime).add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const positions = await queryAsync(`
      SELECT latitude, longitude, event_time, type
      FROM vehicle_events
      WHERE device_name = ?
        AND event_time BETWEEN ? AND ?
        AND type IN ('movement', 'position', 'zone_out')
      ORDER BY event_time ASC
    `, [deviceName, eventTime, cinqMinutesApres]);
    
    if (positions.length < 3) return false;
    
    let resteDehors = true;
    for (const pos of positions) {
      const estDansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      if (estDansZone) {
        resteDehors = false;
        break;
      }
    }
    
    return resteDehors;
  }
  
  // Trouver le véhicule
  async trouverVehiculeParDeviceName(deviceName) {
    const rows = await queryAsync(`
      SELECT id_vehicule, immatriculation, name_capteur
      FROM vehicules
      WHERE name_capteur = ?
        AND est_supprime = 0
      LIMIT 1
    `, [deviceName]);
    
    return rows[0] || null;
  }
  
  // Chercher un bon de sortie
  async chercherBon(idVehicule, referenceTime) {
    const ref = moment(referenceTime);
    const fenetre = this.getFenetres().bon;
    const debut = ref.clone().subtract(fenetre.avant, 'hours').format('YYYY-MM-DD HH:mm:ss');
    const fin = ref.clone().add(fenetre.apres, 'hours').format('YYYY-MM-DD HH:mm:ss');
    
    const rows = await queryAsync(`
      SELECT bs.*
      FROM bande_sortie bs
      WHERE bs.id_vehicule = ?
        AND bs.statut = 1
        AND bs.est_supprime = 0
        AND COALESCE(bs.sortie_time, bs.date_prevue) BETWEEN ? AND ?
      ORDER BY COALESCE(bs.sortie_time, bs.date_prevue) DESC
      LIMIT 1
    `, [idVehicule, debut, fin]);
    
    return rows[0] || null;
  }
  
  // Chercher le pointage tablette (dans bande_sortie.sortie_time)
  async chercherTablette(idVehicule, referenceTime) {
    const ref = moment(referenceTime);
    const fenetre = this.getFenetres().tablette;
    const debut = ref.clone().subtract(fenetre.avant, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const fin = ref.clone().add(fenetre.apres, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const rows = await queryAsync(`
      SELECT bs.*
      FROM bande_sortie bs
      WHERE bs.id_vehicule = ?
        AND bs.sortie_time IS NOT NULL
        AND bs.sortie_time BETWEEN ? AND ?
        AND bs.statut = 1
      ORDER BY bs.sortie_time DESC
      LIMIT 1
    `, [idVehicule, debut, fin]);
    
    return rows[0] || null;
  }
  
  // === TRAITEMENT PRINCIPAL : Enregistre TOUTES les sorties ===
  async traiterZoneOut(eventData) {
    console.log('📡 Événement reçu:', eventData);
    
    const { device_name, event_time, latitude, longitude, external_id, speed } = eventData;
    
    // 1. Éviter les doublons
    const existeDeja = await queryAsync(`
      SELECT id FROM controle_sorties 
      WHERE device_name = ? AND gps_heure = ?
      LIMIT 1
    `, [device_name, event_time]);
    
    if (existeDeja.length > 0) {
      console.log(`⚠️ Événement déjà traité: ${device_name} - ${event_time}`);
      return { ignore: true, raison: 'deja_traite', id: existeDeja[0].id };
    }
    
    // 2. Trouver le véhicule
    const vehicule = await this.trouverVehiculeParDeviceName(device_name);
    if (!vehicule) {
      console.log(`❌ Véhicule non trouvé pour: ${device_name}`);
      // Quand même enregistrer pour traçabilité
      const result = await queryAsync(`
        INSERT INTO controle_sorties 
        (device_name, gps_heure, gps_latitude, gps_longitude, statut, commentaire)
        VALUES (?, ?, ?, ?, 'VEHICULE_NON_TROUVE', ?)
      `, [device_name, event_time, latitude, longitude, `Véhicule non trouvé pour device_name: ${device_name}`]);
      return { ignore: true, raison: 'vehicule_non_trouve', id: result.insertId };
    }
    
    // 3. Récupérer SA zone de base
    const zoneBase = await this.getZoneBaseVehicule(device_name);
    if (!zoneBase) {
      console.log(`⚠️ ${vehicule.immatriculation} n'a pas de zone de base`);
      const result = await queryAsync(`
        INSERT INTO controle_sorties 
        (immatriculation, id_vehicule, device_name, gps_heure, gps_latitude, gps_longitude, statut, commentaire)
        VALUES (?, ?, ?, ?, ?, ?, 'AUCUNE_ZONE_BASE', ?)
      `, [vehicule.immatriculation, vehicule.id_vehicule, device_name, event_time, latitude, longitude, `Aucune zone de base définie pour ce véhicule`]);
      return { ignore: true, raison: 'aucune_zone_base', id: result.insertId };
    }
    
    console.log(`🚗 Véhicule: ${vehicule.immatriculation}`);
    console.log(`🗺️ Zone de base: ${zoneBase.zone_nom}`);
    console.log(`📌 Position: ${latitude}, ${longitude}`);
    
    // 4. Vérifier si c'est une SORTIE de zone (point hors zone)
    const estDansSaZone = this.pointDansPolygone(latitude, longitude, zoneBase.coordinates);
    
    if (estDansSaZone) {
      // Pas une sortie, le véhicule est encore dans sa zone
      console.log(`ℹ️ ${vehicule.immatriculation} est encore dans sa zone - pas une sortie`);
      return { ignore: true, raison: 'toujours_dans_zone', zone: zoneBase.zone_nom };
    }
    
    console.log(`🚪 SORTIE DÉTECTÉE: ${vehicule.immatriculation} a quitté ${zoneBase.zone_nom}`);
    
    // 5. Vérifier que c'est une vraie sortie (resté dehors 5+ minutes)
    const isReal = await this.isRealExit(device_name, event_time, latitude, longitude, zoneBase.coordinates);
    if (!isReal) {
      console.log(`⚠️ Faux positif: ${vehicule.immatriculation} (retour rapide dans la zone)`);
      // On enregistre quand même mais avec statut spécifique
      const result = await queryAsync(`
        INSERT INTO controle_sorties 
        (immatriculation, id_vehicule, device_name, id_zone, zone_nom,
         gps_heure, gps_latitude, gps_longitude, gps_speed,
         a_gps, statut, score, commentaire)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vehicule.immatriculation,
        vehicule.id_vehicule,
        device_name,
        zoneBase.id_geo_dlog,
        zoneBase.zone_nom,
        event_time,
        latitude,
        longitude,
        speed || null,
        1,
        'FAUX_POSITIF',
        0,
        'Retour rapide dans la zone - sortie non confirmée'
      ]);
      return { ignore: true, raison: 'faux_positif', id: result.insertId };
    }
    
    // 6. === C'EST UNE VRAIE SORTIE : ON ENREGISTRE ===
    
    // Chercher le bon et le pointage tablette associés
    const bon = await this.chercherBon(vehicule.id_vehicule, event_time);
    const tablette = await this.chercherTablette(vehicule.id_vehicule, event_time);
    
    const hasBS = !!bon;
    const hasTablette = !!tablette;
    const hasGPS = true;
    
    // Calculer l'écart entre tablette et GPS (ce que tu veux comparer)
    let ecartMinutes = null;
    let heureTablette = null;
    if (hasTablette) {
      heureTablette = tablette.sortie_time;
      const heureGPS = moment(event_time);
      const heureTab = moment(tablette.sortie_time);
      ecartMinutes = Math.abs(heureGPS.diff(heureTab, 'minutes'));
      console.log(`📊 Écart tablette/GPS: ${ecartMinutes} minutes (Tablette: ${heureTablette}, GPS: ${event_time})`);
    }
    
    const statut = this.determinerStatut(hasBS, hasTablette, hasGPS, zoneBase.autorise_sans_bs);
    const score = this.calculerScore(hasBS, hasTablette, hasGPS, ecartMinutes);
    
    console.log(`📊 Résultat: ${statut} (BS:${hasBS}, Tablette:${hasTablette}, Autorisé sans BS:${zoneBase.autorise_sans_bs})`);
    
    // 7. Sauvegarde COMPLÈTE dans controle_sorties
    const result = await queryAsync(`
      INSERT INTO controle_sorties 
      (immatriculation, id_vehicule, device_name,
       bon_id, tablette_id, gps_id,
       bon_heure, tablette_heure, gps_heure,
       a_bon, a_tablette, a_gps,
       statut, score, ecart_minutes,
       gps_latitude, gps_longitude, gps_speed,
       id_zone, zone_nom, autorise_sans_bs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicule.immatriculation,
      vehicule.id_vehicule,
      device_name,
      bon?.id_bande_sortie || null,
      tablette?.id_bande_sortie || null,
      external_id || null,
      bon?.date_prevue || null,
      tablette?.sortie_time || null,  // Heure tablette (pointage)
      event_time,                      // Heure GPS (sortie réelle)
      hasBS ? 1 : 0,
      hasTablette ? 1 : 0,
      hasGPS ? 1 : 0,
      statut,
      score,
      ecartMinutes,                    // Différence tablette/GPS
      latitude,
      longitude,
      speed || null,
      zoneBase.id_geo_dlog,
      zoneBase.zone_nom,
      zoneBase.autorise_sans_bs ? 1 : 0
    ]);
    
    console.log(`✅ Sortie enregistrée (ID: ${result.insertId}) - Heure GPS: ${event_time} - Heure Tablette: ${tablette?.sortie_time || 'N/A'}`);
    
    // 8. Alerte si sortie sans bon non autorisée
    if (statut === 'SORTIE_SANS_BON' && !zoneBase.autorise_sans_bs) {
      await this.creerAlerteSortieSansBon(vehicule, zoneBase, eventData);
    }
    
    return {
      id: result.insertId,
      immatriculation: vehicule.immatriculation,
      statut,
      score,
      hasBS,
      hasTablette,
      gps_heure: event_time,
      tablette_heure: tablette?.sortie_time,
      ecart_minutes: ecartMinutes,
      zone: zoneBase.zone_nom
    };
  }
  
  // Créer une alerte
  async creerAlerteSortieSansBon(vehicule, zoneBase, eventData) {
    await queryAsync(`
      INSERT INTO vehicle_alerts 
      (device_id, device_name, alert_type, alert_level, alert_message, alert_time, latitude, longitude)
      VALUES (?, ?, 'SORTIE_SANS_BON', 'CRITICAL', ?, ?, ?, ?)
    `, [
      eventData.device_id || null,
      eventData.device_name,
      `🚨 SORTIE SANS BON: ${vehicule.immatriculation} a quitté sa zone (${zoneBase.zone_nom}) sans bon de sortie valide à ${moment(eventData.event_time).format('HH:mm')}`,
      eventData.event_time,
      eventData.latitude,
      eventData.longitude
    ]);
  }
  
  // Récupérer tous les contrôles pour une date
  async getControles(date) {
    const dateFilter = date || moment().format('YYYY-MM-DD');
    
    const rows = await queryAsync(`
      SELECT 
        cs.*,
        bs.numero_bon_sortie,
        c.nom as chauffeur_nom,
        c.prenom as chauffeur_prenom
      FROM controle_sorties cs
      LEFT JOIN bande_sortie bs ON cs.bon_id = bs.id_bande_sortie
      LEFT JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
      WHERE DATE(cs.created_at) = ? AND cs.statut NOT IN ('VEHICULE_NON_TROUVE', 'AUCUNE_ZONE_BASE', 'FAUX_POSITIF')
      ORDER BY cs.gps_heure DESC
    `, [dateFilter]);
    
    return rows;
  }
  
  // Récupérer les statistiques
  async getStatistiques(date) {
    const dateFilter = date || moment().format('YYYY-MM-DD');
    
    const stats = await queryAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'CONFORME' THEN 1 ELSE 0 END) as conformes,
        SUM(CASE WHEN statut = 'SORTIE_SANS_BON' THEN 1 ELSE 0 END) as sans_bon,
        SUM(CASE WHEN statut = 'SORTIE_AUTORISEE_SANS_BS' THEN 1 ELSE 0 END) as autorisees_sans_bs,
        SUM(CASE WHEN statut = 'SORTIE_NON_POINTEE' THEN 1 ELSE 0 END) as non_pointees,
        SUM(CASE WHEN statut = 'BON_NON_EXECUTE' THEN 1 ELSE 0 END) as bon_non_execute,
        SUM(CASE WHEN statut = 'SORTIE_NON_AUTORISEE' THEN 1 ELSE 0 END) as non_autorisees,
        AVG(score) as score_moyen,
        AVG(ecart_minutes) as ecart_moyen
      FROM controle_sorties
      WHERE DATE(created_at) = ?
        AND statut NOT IN ('VEHICULE_NON_TROUVE', 'AUCUNE_ZONE_BASE', 'FAUX_POSITIF')
    `, [dateFilter]);
    
    return stats[0] || { total: 0, conformes: 0, sans_bon: 0, autorisees_sans_bs: 0, non_pointees: 0, bon_non_execute: 0, non_autorisees: 0, score_moyen: 0, ecart_moyen: null };
  }
  
  // Régulariser une sortie sans bon
  async regulariser(id, idBonSortie, commentaire, userId) {
    // Récupérer l'heure du bon pour mettre à jour
    const bon = await queryAsync(`
      SELECT sortie_time, date_prevue FROM bande_sortie WHERE id_bande_sortie = ?
    `, [idBonSortie]);
    
    const heureBon = bon[0]?.sortie_time || bon[0]?.date_prevue;
    
    await queryAsync(`
      UPDATE controle_sorties 
      SET bon_id = ?,
          bon_heure = ?,
          a_bon = 1,
          statut = 'CONFORME',
          score = 100,
          commentaire = CONCAT(IFNULL(commentaire, ''), ' - Régularisé par user ', ?),
          regularise_par = ?,
          regularise_le = NOW(),
          est_regularise = 1
      WHERE id = ?
    `, [idBonSortie, heureBon, userId, userId, id]);
    
    return true;
  }
}

module.exports = new RapprochementService();