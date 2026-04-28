const moment = require('moment');
const { queryAsync } = require('../config/database');

class RapprochementService {
  
  // Fenêtres temporelles
  getFenetres() {
    return {
      bon: { avant: 12, apres: 4 },      // heures (élargi à +4h pour capturer pointages tardifs)
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
  
  // Déterminer le niveau de risque selon le score
  getNiveauRisque(score) {
    if (score >= 90) return 'FAIBLE';
    if (score >= 60) return 'MOYEN';
    return 'ELEVE';
  }
  
  // Moteur de décision
  determinerStatut(hasBS, hasTablette, hasGPS, autoriseSansBS = false) {
    if (hasTablette && !hasBS) return 'INCOHERENT';
    
    if (!hasBS && autoriseSansBS && hasGPS) {
      return 'SORTIE_AUTORISEE_SANS_BS';
    }
    if (hasBS && hasTablette && hasGPS) return 'CONFORME';
    if (hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_POINTEE';
    if (hasBS && hasTablette && !hasGPS) return 'ANOMALIE_A_VERIFIER';
    if (hasBS && !hasTablette && !hasGPS) return 'BON_NON_EXECUTE';
    if (!hasBS && !hasTablette && hasGPS) return 'SORTIE_NON_AUTORISEE';
    
    return 'A_VERIFIER';
  }
  
  // === UNE SEULE RECHERCHE : BS + Tablette en même temps ===
  async chercherBonAvecTablette(idVehicule, referenceTime) {
    const ref = moment(referenceTime);
    const fenetre = this.getFenetres().bon;
    const debut = ref.clone().subtract(fenetre.avant, 'hours').format('YYYY-MM-DD HH:mm:ss');
    const fin = ref.clone().add(fenetre.apres, 'hours').format('YYYY-MM-DD HH:mm:ss');
    
    const rows = await queryAsync(`
      SELECT 
        bs.id_bande_sortie,
        bs.date_prevue,
        bs.sortie_time as tablette_heure,
        bs.id_vehicule,
        bs.id_chauffeur
      FROM bande_sortie bs
      WHERE bs.id_vehicule = ?
        AND bs.statut = 4
        AND bs.est_supprime = 0
        AND COALESCE(bs.sortie_time, bs.date_prevue) BETWEEN ? AND ?
      ORDER BY COALESCE(bs.sortie_time, bs.date_prevue) DESC
      LIMIT 1
    `, [idVehicule, debut, fin]);
    
    return rows[0] || null;
  }
  
  // === ÉVITER LES DOUBLONS : Vérifier si une sortie a déjà été enregistrée récemment ===
  async isDuplicateExit(deviceName, eventTime, idVehicule) {
    const trenteMinutesAvant = moment(eventTime).subtract(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const existing = await queryAsync(`
      SELECT id, gps_heure, statut
      FROM controle_sorties
      WHERE id_vehicule = ?
        AND gps_heure > ?
        AND a_gps = 1
      ORDER BY gps_heure DESC
      LIMIT 1
    `, [idVehicule, trenteMinutesAvant]);
    
    if (existing.length > 0) {
      console.log(`⚠️ Doublon détecté: dernière sortie à ${existing[0].gps_heure} (${existing[0].statut})`);
      return true;
    }
    
    return false;
  }
  
  // === VÉRIFIER SI UNE ENTRÉE SANS GPS EXISTE DÉJÀ ===
  async trouverEntreeSansGPS(idVehicule, bonId = null) {
    let query = `
      SELECT id, a_bon, tablette_heure, bon_id
      FROM controle_sorties
      WHERE id_vehicule = ? 
        AND a_gps = 0
        AND DATE(created_at) = CURDATE()
    `;
    const params = [idVehicule];
    
    if (bonId) {
      query += ` AND bon_id = ?`;
      params.push(bonId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 1`;
    
    const rows = await queryAsync(query, params);
    return rows[0] || null;
  }
  
  // === CAS PARTICULIER B: Matching souple pour plaque mal saisie ===
  async trouverVehiculeParMatchingSouple(deviceName, tabletteImmatriculation = null) {
    // 1. Match exact par name_capteur
    let vehicule = await this.trouverVehiculeParDeviceName(deviceName);
    if (vehicule) return vehicule;
    
    // 2. Match par immatriculation
    if (tabletteImmatriculation) {
      const rows = await queryAsync(`
        SELECT id_vehicule, immatriculation, name_capteur
        FROM vehicules
        WHERE immatriculation = ?
          AND est_supprime = 0
        LIMIT 1
      `, [tabletteImmatriculation]);
      
      if (rows.length > 0) return rows[0];
      
      // 3. Proximité approximative
      const similarite = await queryAsync(`
        SELECT id_vehicule, immatriculation, name_capteur
        FROM vehicules
        WHERE est_supprime = 0
          AND (immatriculation LIKE CONCAT('%', ?, '%')
            OR name_capteur LIKE CONCAT('%', ?, '%'))
        LIMIT 1
      `, [tabletteImmatriculation.substring(0, 4), deviceName.substring(0, 4)]);
      
      if (similarite.length > 0) return similarite[0];
    }
    
    return null;
  }
  
  // === CAS PARTICULIER C: GPS muet ===
  async verifierGPSMuet(deviceName, dateDebut, dateFin) {
    const events = await queryAsync(`
      SELECT COUNT(*) as count
      FROM vehicle_events
      WHERE device_name = ?
        AND event_time BETWEEN ? AND ?
        AND type IN ('zone_out', 'movement', 'position')
    `, [deviceName, dateDebut, dateFin]);
    
    return events[0].count === 0;
  }
  
  async marquerGPSIndisponible(vehicule, date) {
    await queryAsync(`
      UPDATE controle_sorties 
      SET statut = 'GPS_INDISPONIBLE',
          commentaire = CONCAT(IFNULL(commentaire, ''), ' - Aucune donnée GPS reçue sur cette période')
      WHERE id_vehicule = ? AND DATE(created_at) = ? AND a_gps = 0
    `, [vehicule.id_vehicule, date]);
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
        AND event_time > ? 
        AND event_time <= ?
        AND type IN ('movement', 'position', 'zone_out')
      ORDER BY event_time ASC
    `, [deviceName, eventTime, cinqMinutesApres]);
    
    if (positions.length === 0) {
      console.log(`⚠️ Aucune donnée GPS après sortie - considéré comme vrai`);
      return true;
    }
    
    let retourneDansZone = false;
    for (const pos of positions) {
      const estDansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      if (estDansZone) {
        retourneDansZone = true;
        console.log(`📍 Retour détecté dans zone à ${pos.event_time}`);
        break;
      }
    }
    
    return !retourneDansZone;
  }
  
  // Trouver le véhicule par device_name
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
  
  // Générer les BON_NON_EXECUTE à partir des BS validés sans sortie GPS
  async genererBonsNonExecutes(date) {
    const dateFilter = date || moment().format('YYYY-MM-DD');
    
    console.log(`🔍 Recherche des BS validés sans sortie GPS pour le ${dateFilter}`);
    
    const bons = await queryAsync(`
      SELECT 
        bs.id_bande_sortie,
        bs.date_prevue,
        bs.sortie_time,
        bs.id_vehicule,
        bs.id_chauffeur,
        v.immatriculation
      FROM bande_sortie bs
      JOIN vehicules v ON bs.id_vehicule = v.id_vehicule
      WHERE bs.statut = 4
        AND bs.est_supprime = 0
        AND DATE(COALESCE(bs.sortie_time, bs.date_prevue)) = ?
        AND NOT EXISTS (
          SELECT 1 FROM controle_sorties cs 
          WHERE cs.bon_id = bs.id_bande_sortie 
            AND cs.a_gps = 1
        )
    `, [dateFilter]);
    
    console.log(`📋 ${bons.length} BS validés sans sortie GPS trouvés`);
    
    let created = 0;
    let updated = 0;
    
    for (const bon of bons) {
      const existe = await queryAsync(`
        SELECT id, statut FROM controle_sorties 
        WHERE bon_id = ?
      `, [bon.id_bande_sortie]);
      
      if (existe.length > 0) {
        if (existe[0].statut !== 'BON_NON_EXECUTE' && existe[0].statut !== 'CONFORME') {
          await queryAsync(`
            UPDATE controle_sorties 
            SET statut = 'BON_NON_EXECUTE',
                score = 50,
                niveau_risque = 'MOYEN',
                commentaire = 'BS validé sans sortie GPS détectée'
            WHERE id = ?
          `, [existe[0].id]);
          updated++;
          console.log(`📝 Mise à jour BS ID ${bon.id_bande_sortie} -> BON_NON_EXECUTE`);
        }
      } else {
        await queryAsync(`
          INSERT INTO controle_sorties 
          (id_vehicule, immatriculation, bon_id, 
           bon_heure, tablette_heure,
           a_bon, a_tablette, a_gps, 
           statut, score, niveau_risque, commentaire)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BON_NON_EXECUTE', 50, 'MOYEN', ?)
        `, [
          bon.id_vehicule,
          bon.immatriculation,
          bon.id_bande_sortie,
          bon.date_prevue,
          bon.sortie_time,
          1,
          bon.sortie_time ? 1 : 0,
          0,
          'BS validé sans sortie GPS détectée'
        ]);
        created++;
        console.log(`✅ BON_NON_EXECUTE créé pour BS ID ${bon.id_bande_sortie}`);
      }
    }
    
    console.log(`📊 Résultat: ${created} créés, ${updated} mis à jour`);
    
    return { created, updated, total: bons.length };
  }
  
  // TRAITEMENT PRINCIPAL
  async traiterZoneOut(eventData) {
    console.log('📡 Événement reçu:', eventData);
    
    const { device_name, event_time, latitude, longitude, external_id, speed } = eventData;
    
    // 1. Trouver le véhicule (avec matching souple)
    const vehicule = await this.trouverVehiculeParMatchingSouple(device_name);
    if (!vehicule) {
      console.log(`❌ Véhicule non trouvé pour: ${device_name}`);
      return { ignore: true, raison: 'vehicule_non_trouve', device_name };
    }
    
    // 2. ÉVITER LES DOUBLONS - Vérifier si sortie récente
    const isDuplicate = await this.isDuplicateExit(device_name, event_time, vehicule.id_vehicule);
    if (isDuplicate) {
      console.log(`⏩ Doublon ignoré pour ${vehicule.immatriculation} à ${event_time}`);
      return { ignore: true, raison: 'doublon', immatriculation: vehicule.immatriculation };
    }
    
    // 3. Vérifier GPS muet
    const debutPeriode = moment(event_time).subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const finPeriode = moment(event_time).add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const gpsMuet = await this.verifierGPSMuet(device_name, debutPeriode, finPeriode);
    
    if (gpsMuet) {
      console.log(`⚠️ GPS muet détecté pour: ${vehicule.immatriculation}`);
      await this.marquerGPSIndisponible(vehicule, moment(event_time).format('YYYY-MM-DD'));
    }
    
    // 4. Récupérer SA zone de base
    const zoneBase = await this.getZoneBaseVehicule(device_name);
    if (!zoneBase) {
      console.log(`⚠️ ${vehicule.immatriculation} n'a pas de zone de base`);
      return { ignore: true, raison: 'aucune_zone_base', immatriculation: vehicule.immatriculation };
    }
    
    console.log(`🚗 Véhicule: ${vehicule.immatriculation}`);
    console.log(`🗺️ Zone de base: ${zoneBase.zone_nom}`);
    console.log(`📌 Position: ${latitude}, ${longitude}`);
    
    // 5. Vérifier si c'est une SORTIE de zone
    const estDansSaZone = this.pointDansPolygone(latitude, longitude, zoneBase.coordinates);
    
    if (estDansSaZone) {
      console.log(`ℹ️ ${vehicule.immatriculation} est encore dans sa zone - pas une sortie`);
      return { ignore: true, raison: 'toujours_dans_zone', zone: zoneBase.zone_nom };
    }
    
    console.log(`🚪 SORTIE DÉTECTÉE: ${vehicule.immatriculation} a quitté ${zoneBase.zone_nom}`);
    
    // 6. Vérifier que c'est une vraie sortie
    const isReal = await this.isRealExit(device_name, event_time, latitude, longitude, zoneBase.coordinates);
    if (!isReal) {
      console.log(`⚠️ Faux positif: ${vehicule.immatriculation} (retour rapide dans la zone)`);
      return { ignore: true, raison: 'faux_positif', immatriculation: vehicule.immatriculation };
    }
    
    // 7. C'EST UNE VRAIE SORTIE - RECHERCHE UNIFIÉE
    const bon = await this.chercherBonAvecTablette(vehicule.id_vehicule, event_time);
    
    const hasBS = !!bon;
    const hasTablette = bon?.tablette_heure ? true : false;
    const tabletteHeure = bon?.tablette_heure || null;
    const hasGPS = true;
    
    // Calculer l'écart
    let ecartMinutes = null;
    if (hasTablette) {
      const heureGPS = moment(event_time);
      const heureTab = moment(tabletteHeure);
      ecartMinutes = Math.abs(heureGPS.diff(heureTab, 'minutes'));
      console.log(`📊 Écart tablette/GPS: ${ecartMinutes} minutes`);
    }
    
    const statut = this.determinerStatut(hasBS, hasTablette, hasGPS, zoneBase.autorise_sans_bs);
    const score = this.calculerScore(hasBS, hasTablette, hasGPS, ecartMinutes);
    const niveauRisque = this.getNiveauRisque(score);
    
    console.log(`📊 Résultat: ${statut} (Score: ${score}, Risque: ${niveauRisque})`);
    
    // 8. VÉRIFIER SI UNE ENTRÉE SANS GPS EXISTE DÉJÀ (mise à jour au lieu d'insertion)
    let existingId = null;
    
    if (hasBS) {
      // Chercher une entrée existante avec ce BS
      const existing = await this.trouverEntreeSansGPS(vehicule.id_vehicule, bon.id_bande_sortie);
      if (existing) {
        existingId = existing.id;
      }
    } else {
      // Chercher une entrée existante sans BS
      const existing = await this.trouverEntreeSansGPS(vehicule.id_vehicule);
      if (existing) {
        existingId = existing.id;
      }
    }
    
    let result;
    if (existingId) {
      // Mettre à jour l'entrée existante
      await queryAsync(`
        UPDATE controle_sorties 
        SET gps_heure = ?,
            gps_latitude = ?,
            gps_longitude = ?,
            a_gps = 1,
            bon_id = COALESCE(bon_id, ?),
            bon_heure = COALESCE(bon_heure, ?),
            tablette_heure = COALESCE(tablette_heure, ?),
            a_bon = CASE WHEN ? = 1 OR a_bon = 1 THEN 1 ELSE a_bon END,
            a_tablette = CASE WHEN ? = 1 OR a_tablette = 1 THEN 1 ELSE a_tablette END,
            statut = ?,
            score = ?,
            niveau_risque = ?,
            ecart_minutes = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [
        event_time, latitude, longitude,
        bon?.id_bande_sortie || null,
        bon?.date_prevue || null,
        tabletteHeure,
        hasBS ? 1 : 0,
        hasTablette ? 1 : 0,
        statut, score, niveauRisque, ecartMinutes,
        existingId
      ]);
      
      result = { insertId: existingId };
      console.log(`✅ Entrée #${existingId} mise à jour -> ${statut}`);
    } else {
      // Créer une nouvelle entrée
      result = await queryAsync(`
        INSERT INTO controle_sorties 
        (immatriculation, id_vehicule, device_name,
         bon_id, gps_id,
         bon_heure, tablette_heure, gps_heure,
         a_bon, a_tablette, a_gps,
         statut, score, niveau_risque, ecart_minutes,
         gps_latitude, gps_longitude,
         id_zone, zone_nom, autorise_sans_bs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vehicule.immatriculation,
        vehicule.id_vehicule,
        device_name,
        bon?.id_bande_sortie || null,
        external_id || null,
        bon?.date_prevue || null,
        tabletteHeure,
        event_time,
        hasBS ? 1 : 0,
        hasTablette ? 1 : 0,
        hasGPS ? 1 : 0,
        statut,
        score,
        niveauRisque,
        ecartMinutes,
        latitude,
        longitude,
        zoneBase.id_geo_dlog,
        zoneBase.zone_nom,
        zoneBase.autorise_sans_bs ? 1 : 0
      ]);
      console.log(`✅ Nouvelle sortie enregistrée (ID: ${result.insertId})`);
    }
    
    // 9. Alerte si sortie sauvage
    if (statut === 'SORTIE_NON_AUTORISEE') {
      await this.creerAlerteSortieSauvage(vehicule, zoneBase, eventData);
    }
    
    return {
      id: result.insertId,
      misAJour: !!existingId,
      immatriculation: vehicule.immatriculation,
      statut,
      score,
      niveauRisque,
      hasBS,
      hasTablette,
      gps_heure: event_time,
      tablette_heure: tabletteHeure,
      ecart_minutes: ecartMinutes,
      zone: zoneBase.zone_nom
    };
  }
  
  // Alerte pour sortie sauvage
  async creerAlerteSortieSauvage(vehicule, zoneBase, eventData) {
    await queryAsync(`
      INSERT INTO vehicle_alerts 
      (device_id, device_name, alert_type, alert_level, alert_message, alert_time, latitude, longitude)
      VALUES (?, ?, 'SORTIE_SAUVAGE', 'CRITICAL', ?, ?, ?, ?)
    `, [
      eventData.device_id || null,
      eventData.device_name,
      `🚨 SORTIE SAUVAGE: ${vehicule.immatriculation} a quitté sa zone (${zoneBase.zone_nom}) sans aucun justificatif (ni BS, ni pointage) à ${moment(eventData.event_time).format('HH:mm')}`,
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
        c.nom as chauffeur_nom,
        c.prenom as chauffeur_prenom
      FROM controle_sorties cs
      LEFT JOIN bande_sortie bs ON cs.bon_id = bs.id_bande_sortie
      LEFT JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
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
        SUM(CASE WHEN statut = 'SORTIE_NON_POINTEE' THEN 1 ELSE 0 END) as non_pointees,
        SUM(CASE WHEN statut = 'BON_NON_EXECUTE' THEN 1 ELSE 0 END) as bon_non_execute,
        SUM(CASE WHEN statut = 'SORTIE_NON_AUTORISEE' THEN 1 ELSE 0 END) as non_autorisees,
        SUM(CASE WHEN statut = 'ANOMALIE_A_VERIFIER' THEN 1 ELSE 0 END) as anomalies,
        SUM(CASE WHEN statut = 'GPS_INDISPONIBLE' THEN 1 ELSE 0 END) as gps_indisponible,
        AVG(score) as score_moyen,
        AVG(ecart_minutes) as ecart_moyen
      FROM controle_sorties
      WHERE DATE(created_at) = ?
    `, [dateFilter]);
    
    return stats[0] || { 
      total: 0, conformes: 0, non_pointees: 0, bon_non_execute: 0, 
      non_autorisees: 0, anomalies: 0, gps_indisponible: 0,
      score_moyen: 0, ecart_moyen: null 
    };
  }
  
  // Régulariser une sortie
  async regulariser(id, idBonSortie, commentaire, userId) {
    const bon = await queryAsync(`
      SELECT date_prevue, sortie_time FROM bande_sortie WHERE id_bande_sortie = ?
    `, [idBonSortie]);
    
    const heureBon = bon[0]?.sortie_time || bon[0]?.date_prevue;
    
    await queryAsync(`
      UPDATE controle_sorties 
      SET bon_id = ?,
          bon_heure = ?,
          a_bon = 1,
          a_tablette = CASE WHEN ? IS NOT NULL THEN 1 ELSE a_tablette END,
          tablette_heure = COALESCE(tablette_heure, ?),
          statut = 'CONFORME',
          score = 100,
          niveau_risque = 'FAIBLE',
          commentaire = CONCAT(IFNULL(commentaire, ''), ' - Régularisé par user ', ?),
          regularise_par = ?,
          regularise_le = NOW(),
          est_regularise = 1
      WHERE id = ?
    `, [idBonSortie, heureBon, heureBon, heureBon, userId, userId, id]);
    
    return true;
  }
}

module.exports = new RapprochementService();