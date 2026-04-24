// services/rapprochementService.js
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
  
  // Moteur de décision - 6 cas
  determinerStatut(hasBS, hasTablette, hasGPS) {
    if (hasBS && hasTablette && hasGPS) return 'CONFORME';
    if (!hasBS && hasTablette && hasGPS) return 'SORTIE_SANS_BON';
    if (hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_POINTEE';
    if (hasBS && hasTablette && !hasGPS) return 'ANOMALIE_A_VERIFIER';
    if (hasBS && !hasTablette && !hasGPS) return 'BON_NON_EXECUTE';
    if (!hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_AUTORISEE';
    return 'A_VERIFIER';
  }
  
  // Trouver le véhicule à partir du device_name Falcon
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
  
  // Chercher un bon de sortie dans la fenêtre -12h / +2h
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
  
  // Chercher un pointage tablette dans la fenêtre -30min / +30min
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
  
  // Chercher une sortie GPS dans la fenêtre -30min / +30min
  async chercherGPS(deviceName, referenceTime) {
    const ref = moment(referenceTime);
    const fenetre = this.getFenetres().gps;
    const debut = ref.clone().subtract(fenetre.avant, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    const fin = ref.clone().add(fenetre.apres, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const rows = await queryAsync(`
      SELECT *
      FROM vehicle_events
      WHERE device_name = ?
        AND type = 'zone_out'
        AND event_time BETWEEN ? AND ?
      ORDER BY event_time DESC
      LIMIT 1
    `, [deviceName, debut, fin]);
    
    return rows[0] || null;
  }
  
  // Vérifier si la sortie GPS est réelle (évite faux positifs)
  async isRealGPSExit(deviceName, eventTime, latitude, longitude) {
    // Récupérer la zone du véhicule via name_capteur
    const zone = await queryAsync(`
      SELECT g.coordinates
      FROM vehicules v
      JOIN vehicule_geofence vg ON v.id_vehicule = vg.id_vehicule
      JOIN geofences_dlog gd ON vg.id_geo_dlog = gd.id_geo_dlog
      JOIN geofences g ON gd.nom_falcon = g.name
      WHERE v.name_capteur = ?
      LIMIT 1
    `, [deviceName]);
    
    if (!zone.length) return true; // Par défaut, on considère vrai
    
    // Vérifier les 5 minutes suivantes
    const cinqMinutesApres = moment(eventTime).add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const positions = await queryAsync(`
      SELECT COUNT(*) as count
      FROM vehicle_events
      WHERE device_name = ?
        AND event_time BETWEEN ? AND ?
        AND type IN ('movement', 'position', 'zone_out')
    `, [deviceName, eventTime, cinqMinutesApres]);
    
    // Si le véhicule a continué à bouger pendant 5 min -> sortie réelle
    return positions[0].count >= 3;
  }
  
  // Traiter un événement GPS zone_out de Falcon
  async traiterZoneOut(eventData) {
    console.log('📡 Événement reçu:', eventData);
    
    const { device_name, event_time, latitude, longitude, device_id, speed } = eventData;
    
    // 1. Trouver le véhicule via name_capteur
    const vehicule = await this.trouverVehiculeParDeviceName(device_name);
    
    if (!vehicule) {
      console.log(`❌ Véhicule non trouvé pour device_name: ${device_name}`);
      return { ignore: true, raison: 'vehicule_non_trouve', device_name };
    }
    
    console.log(`🚗 Véhicule trouvé: ${vehicule.immatriculation} (ID: ${vehicule.id_vehicule})`);
    
    // 2. Vérifier si c'est une vraie sortie (évite faux positifs)
    const isReal = await this.isRealGPSExit(device_name, event_time, latitude, longitude);
    if (!isReal) {
      console.log(`⚠️ Faux positif ignoré: ${vehicule.immatriculation}`);
      return { ignore: true, raison: 'faux_positif', immatriculation: vehicule.immatriculation };
    }
    
    // 3. Chercher les correspondances
    const [bon, tablette, gpsExistant] = await Promise.all([
      this.chercherBon(vehicule.id_vehicule, event_time),
      this.chercherTablette(vehicule.id_vehicule, event_time),
      this.chercherGPS(device_name, event_time)
    ]);
    
    const hasBS = !!bon;
    const hasTablette = !!tablette;
    const hasGPS = !!gpsExistant || true;
    
    // 4. Calculer l'écart entre tablette et GPS
    let ecartMinutes = null;
    if (hasTablette && hasGPS) {
      const heureTablette = moment(tablette.sortie_time);
      const heureGPS = moment(event_time);
      ecartMinutes = Math.abs(heureGPS.diff(heureTablette, 'minutes'));
    }
    
    // 5. Déterminer statut et score
    const statut = this.determinerStatut(hasBS, hasTablette, hasGPS);
    const score = this.calculerScore(hasBS, hasTablette, hasGPS, ecartMinutes);
    
    console.log(`📊 Résultat: ${statut} (BS:${hasBS}, Tab:${hasTablette}, GPS:${hasGPS})`);
    
    // 6. Sauvegarder dans controle_sorties
    const result = await queryAsync(`
      INSERT INTO controle_sorties 
      (immatriculation, id_vehicule, bon_id, tablette_id, gps_id,
       bon_heure, tablette_heure, gps_heure,
       a_bon, a_tablette, a_gps, statut, score,
       gps_latitude, gps_longitude, device_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vehicule.immatriculation,
      vehicule.id_vehicule,
      bon?.id_bande_sortie || null,
      tablette?.id_bande_sortie || null,
      eventData.id || null,
      bon?.sortie_time || bon?.date_prevue,
      tablette?.sortie_time || null,
      event_time,
      hasBS ? 1 : 0,
      hasTablette ? 1 : 0,
      hasGPS ? 1 : 0,
      statut,
      score,
      latitude,
      longitude,
      device_name
    ]);
    
    return {
      id: result.insertId,
      immatriculation: vehicule.immatriculation,
      statut,
      score,
      hasBS,
      hasTablette,
      hasGPS,
      ecartMinutes
    };
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
      LEFT JOIN chauffeur c ON bs.id_chauffeur = c.id_chauffeur
      WHERE DATE(cs.created_at) = ?
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
        SUM(CASE WHEN statut = 'SORTIE_NON_POINTEE' THEN 1 ELSE 0 END) as non_pointees,
        SUM(CASE WHEN statut = 'BON_NON_EXECUTE' THEN 1 ELSE 0 END) as bon_non_execute,
        SUM(CASE WHEN statut = 'SORTIE_NON_AUTORISEE' THEN 1 ELSE 0 END) as non_autorisees,
        AVG(score) as score_moyen
      FROM controle_sorties
      WHERE DATE(created_at) = ?
    `, [dateFilter]);
    
    return stats[0] || {
      total: 0, conformes: 0, sans_bon: 0, non_pointees: 0,
      bon_non_execute: 0, non_autorisees: 0, score_moyen: 0
    };
  }
  
  // Régulariser une sortie sans bon
  async regulariser(id, idBonSortie, commentaire, userId) {
    await queryAsync(`
      UPDATE controle_sorties 
      SET bon_id = ?,
          a_bon = 1,
          statut = 'CONFORME',
          score = 100,
          commentaire = ?,
          regularise_par = ?,
          regularise_le = NOW()
      WHERE id = ?
    `, [idBonSortie, commentaire, userId, id]);
    
    return true;
  }
}

module.exports = new RapprochementService();