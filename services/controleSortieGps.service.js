const moment = require('moment');
const { queryAsync } = require('../config/database');

class RapprochementService {
  
  getFenetres() {
    return {   
      bon: { avant: 12, apres: 4 },      // heures
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
  
  // ==================== STRATÉGIE 5: COMBINAISON ====================
  
  // 1. Vérifier la fiabilité du signal GPS (satellites, HDOP, précision)
  isGPSReliable(eventData) {
    // Si Falcon fournit ces données, décommentez et utilisez-les
    const { satellites, hdop, accuracy } = eventData;
    
    // Par défaut, si les données ne sont pas disponibles, on considère fiable
    if (!satellites && !hdop && !accuracy) return true;
    
    let reliable = true;
    if (satellites !== undefined && satellites < 6) {
      console.log(`⚠️ GPS peu fiable: ${satellites} satellites (<6)`);
      reliable = false;
    }
    if (hdop !== undefined && hdop > 1.5) {
      console.log(`⚠️ GPS peu fiable: HDOP = ${hdop} (>1.5)`);
      reliable = false;
    }
    if (accuracy !== undefined && accuracy > 50) {
      console.log(`⚠️ GPS peu fiable: précision = ${accuracy}m (>50m)`);
      reliable = false;
    }
    
    return reliable;
  }
  
  // 2. Vérifier la vitesse minimale (véhicule à l'arrêt ne peut pas sortir)
  isVitesseSuffisante(speed) {
    if (speed < 5) {
      console.log(`⚠️ Vitesse trop faible: ${speed} km/h - sortie non confirmée`);
      return false;
    }
    return true;
  }
  
  // 3. Calculer la distance entre deux points (formule de Haversine)
  calculerDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Rayon terrestre en mètres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // 4. Vérifier par distance cumulée et temps hors zone
  async verifierDistanceEtTemps(deviceName, eventTime, zoneCoordinates) {
    const cinqMinutesApres = moment(eventTime).add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const positions = await queryAsync(`
      SELECT latitude, longitude, event_time, speed
      FROM vehicle_events
      WHERE device_name = ?
        AND event_time > ? 
        AND event_time <= ?
        AND type IN ('movement', 'position', 'zone_out')
      ORDER BY event_time ASC
    `, [deviceName, eventTime, cinqMinutesApres]);
    
    if (positions.length < 2) {
      console.log(`⚠️ Pas assez de positions pour analyser la sortie`);
      return { isValid: false, distance: 0, temps: 0 };
    }
    
    let distanceTotale = 0;
    let tempsHorsZone = 0;
    let dernierePosition = null;
    let tempsDebutHorsZone = null;
    
    for (const pos of positions) {
      const estDansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      
      if (!estDansZone) {
        if (!tempsDebutHorsZone) {
          tempsDebutHorsZone = moment(pos.event_time);
        }
        
        if (dernierePosition) {
          const distance = this.calculerDistance(
            dernierePosition.latitude, dernierePosition.longitude,
            pos.latitude, pos.longitude
          );
          distanceTotale += distance;
        }
        dernierePosition = pos;
      } else {
        if (tempsDebutHorsZone) {
          tempsHorsZone = moment(pos.event_time).diff(tempsDebutHorsZone, 'seconds');
          break;
        }
      }
    }
    
    if (tempsDebutHorsZone && !tempsHorsZone) {
      tempsHorsZone = moment(cinqMinutesApres).diff(tempsDebutHorsZone, 'seconds');
    }
    
    
    // Conditions cumulatives pour confirmer une vraie sortie
    const distanceOk = distanceTotale >= 200; // Au moins 200 mètres
    const tempsOk = tempsHorsZone >= 180;     // Au moins 3 minutes
    
    return { 
      isValid: distanceOk && tempsOk, 
      distance: distanceTotale, 
      temps: tempsHorsZone,
      distanceOk,
      tempsOk
    };
  }
  
  // 5. Confirmer par délai (2 minutes sans retour)
  async confirmerParDelai(deviceName, eventTime, zoneCoordinates) {
    const deuxMinutesApres = moment(eventTime).add(2, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    const positions = await queryAsync(`
      SELECT latitude, longitude, event_time
      FROM vehicle_events
      WHERE device_name = ?
        AND event_time BETWEEN ? AND ?
        AND type IN ('movement', 'position')
      ORDER BY event_time ASC
      LIMIT 5
    `, [deviceName, eventTime, deuxMinutesApres]);
    
    if (positions.length < 2) {
      console.log(`⚠️ Délai: pas assez de données`);
      return false;
    }
    
    // Vérifier que toutes les positions sont hors zone
    for (const pos of positions) {
      const estDansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      if (estDansZone) {
        console.log(`⚠️ Délai: position dans zone à ${pos.event_time}`);
        return false;
      }
    }
    
    console.log(`✅ Délai: sortie confirmée après ${positions.length} positions`);
    return true;
  }
  
  // === MÉTHODE PRINCIPALE: isRealExit avec stratégie 5 ===
  async isRealExit(eventData, zoneCoordinates) {
    const { device_name, event_time, latitude, longitude, speed } = eventData;
    
    console.log(`🔍 Vérification de la sortie pour ${device_name}`);
    
    // ÉTAPE 1: Vérifier la fiabilité du signal GPS
    const isReliable = this.isGPSReliable(eventData);
    if (!isReliable) {
      console.log(`⚠️ Signal GPS peu fiable, passage en mode vérification renforcée`);
    }
    
    // ÉTAPE 2: Vérifier la vitesse minimale
    if (!this.isVitesseSuffisante(speed)) {
      console.log(`⚠️ Vitesse insuffisante - sortie non confirmée`);
      return false;
    }
    
    // ÉTAPE 3: Vérifier par distance cumulée et temps hors zone
    const verification = await this.verifierDistanceEtTemps(device_name, event_time, zoneCoordinates);
    
    if (verification.isValid) {
      console.log(`✅ Sortie confirmée: ${verification.distance.toFixed(0)}m parcourus, ${verification.temps} secondes hors zone`);
      return true;
    }
    
    // ÉTAPE 4: Si la distance/temps est insuffisante, utiliser la confirmation par délai
    if (!verification.distanceOk && verification.temps < 120) {
      console.log(`⚠️ Distance/temps insuffisants, tentative de confirmation par délai`);
      const delaiOk = await this.confirmerParDelai(device_name, event_time, zoneCoordinates);
      if (delaiOk) {
        console.log(`✅ Sortie confirmée par délai`);
        return true;
      }
    }
    
    // ÉTAPE 5: Cas ambigu - on vérifie si le GPS est muet
    const debutPeriode = moment(event_time).subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const finPeriode = moment(event_time).add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
    const gpsMuet = await this.verifierGPSMuet(device_name, debutPeriode, finPeriode);
    
    if (gpsMuet) {
      console.log(`⚠️ GPS muet détecté - sortie considérée comme vraie`);
      return true;
    }
    
    console.log(`⚠️ Sortie non confirmée - faux positif probable`);
    return false;
  }
  
  // ==================== FIN DE LA STRATÉGIE 5 ====================
  
  // === RECHERCHE BS + Tablette ===
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
        AND bs.statut IN (4, 5)
        AND bs.est_supprime = 0
        AND COALESCE(bs.sortie_time, bs.date_prevue) BETWEEN ? AND ?
      ORDER BY COALESCE(bs.sortie_time, bs.date_prevue) DESC
      LIMIT 1
    `, [idVehicule, debut, fin]);
    
    return rows[0] || null;
  }
  
  // === ÉVITER LES DOUBLONS ===
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
      console.log(`⚠️ Doublon détecté: dernière sortie à ${existing[0].gps_heure}`);
      return true;
    }
    return false;
  }
  
  // === ENTRÉE SANS GPS ===
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
  
  // === MATCHING SOUPLE ===
  async trouverVehiculeParMatchingSouple(deviceName, tabletteImmatriculation = null) {
    let vehicule = await this.trouverVehiculeParDeviceName(deviceName);
    if (vehicule) return vehicule;
    
    if (tabletteImmatriculation) {
      const rows = await queryAsync(`
        SELECT id_vehicule, immatriculation, name_capteur
        FROM vehicules
        WHERE immatriculation = ?
          AND est_supprime = 0
        LIMIT 1
      `, [tabletteImmatriculation]);
      
      if (rows.length > 0) return rows[0];
      
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
  
  // === GPS MUET ===
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
  
  // === ZONE DE BASE ===
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
  
  // === POINT DANS POLYGONE ===
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
  
  // === TROUVER VÉHICULE ===
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
  
  // === BONS NON EXÉCUTÉS ===
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
      WHERE bs.statut IN (4, 5)
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
  
  // === TRAITEMENT PRINCIPAL ===
  async traiterZoneOut(eventData) {
    
    const { device_name, event_time, latitude, longitude, external_id, speed } = eventData;
    
    // 1. Trouver le véhicule
    const vehicule = await this.trouverVehiculeParMatchingSouple(device_name);
    if (!vehicule) {
      return { ignore: true, raison: 'vehicule_non_trouve', device_name };
    }
    
    // 2. Éviter les doublons
    const isDuplicate = await this.isDuplicateExit(device_name, event_time, vehicule.id_vehicule);
    if (isDuplicate) {
      console.log(`⏩ Doublon ignoré pour ${vehicule.immatriculation}`);
      return { ignore: true, raison: 'doublon' };
    }
    
    // 3. Récupérer SA zone de base
    const zoneBase = await this.getZoneBaseVehicule(device_name);
    if (!zoneBase) {
      console.log(`⚠️ ${vehicule.immatriculation} n'a pas de zone de base`);
      return { ignore: true, raison: 'aucune_zone_base' };
    }
    
    console.log(`🚗 Véhicule: ${vehicule.immatriculation}`);
    console.log(`🗺️ Zone de base: ${zoneBase.zone_nom}`);
    console.log(`📌 Position: ${latitude}, ${longitude}`);
    
    // 4. Vérifier si c'est une SORTIE de zone
    const estDansSaZone = this.pointDansPolygone(latitude, longitude, zoneBase.coordinates);
    if (estDansSaZone) {
      console.log(`ℹ️ ${vehicule.immatriculation} est encore dans sa zone`);
      return { ignore: true, raison: 'toujours_dans_zone' };
    }
    
    console.log(`🚪 SORTIE DÉTECTÉE: ${vehicule.immatriculation} a quitté ${zoneBase.zone_nom}`);
    
    // 5. Vérifier que c'est une vraie sortie (STRATÉGIE 5)
    const eventDataAvecGPS = { ...eventData, device_name, event_time, latitude, longitude, speed };
    const isReal = await this.isRealExit(eventDataAvecGPS, zoneBase.coordinates);
    
    if (!isReal) {
      console.log(`⚠️ Faux positif: ${vehicule.immatriculation}`);
      return { ignore: true, raison: 'faux_positif' };
    }
    
    // 6. C'EST UNE VRAIE SORTIE
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
    
    console.log(`📊 Résultat: ${statut} (Score: ${score})`);
    
    // 7. Vérifier entrée existante
    let existingId = null;
    if (hasBS) {
      const existing = await this.trouverEntreeSansGPS(vehicule.id_vehicule, bon.id_bande_sortie);
      if (existing) existingId = existing.id;
    } else {
      const existing = await this.trouverEntreeSansGPS(vehicule.id_vehicule);
      if (existing) existingId = existing.id;
    }
    
    let result;
    if (existingId) {
      await queryAsync(`
        UPDATE controle_sorties 
        SET gps_heure = ?, gps_latitude = ?, gps_longitude = ?,
            a_gps = 1, statut = ?, score = ?, niveau_risque = ?, ecart_minutes = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [event_time, latitude, longitude, statut, score, niveauRisque, ecartMinutes, existingId]);
      result = { insertId: existingId };
      console.log(`✅ Entrée #${existingId} mise à jour -> ${statut}`);
    } else {
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
        vehicule.immatriculation, vehicule.id_vehicule, device_name,
        bon?.id_bande_sortie || null, external_id || null,
        bon?.date_prevue || null, tabletteHeure, event_time,
        hasBS ? 1 : 0, hasTablette ? 1 : 0, hasGPS ? 1 : 0,
        statut, score, niveauRisque, ecartMinutes,
        latitude, longitude,
        zoneBase.id_geo_dlog, zoneBase.zone_nom, zoneBase.autorise_sans_bs ? 1 : 0
      ]);
      console.log(`✅ Nouvelle sortie enregistrée (ID: ${result.insertId})`);
    }
    
    // 8. Alerte si sortie sauvage
    if (statut === 'SORTIE_NON_AUTORISEE') {
      await this.creerAlerteSortieSauvage(vehicule, zoneBase, eventData);
    }
    
    return {
      id: result.insertId,
      misAJour: !!existingId,
      immatriculation: vehicule.immatriculation,
      statut, score, niveauRisque,
      hasBS, hasTablette,
      gps_heure: event_time,
      tablette_heure: tabletteHeure,
      ecart_minutes: ecartMinutes,
      zone: zoneBase.zone_nom
    };
  }
  
  // === ALERTE SORTIE SAUVAGE ===
  async creerAlerteSortieSauvage(vehicule, zoneBase, eventData) {
    await queryAsync(`
      INSERT INTO vehicle_alerts 
      (device_id, device_name, alert_type, alert_level, alert_message, alert_time, latitude, longitude)
      VALUES (?, ?, 'SORTIE_SAUVAGE', 'CRITICAL', ?, ?, ?, ?)
    `, [
      eventData.device_id || null,
      eventData.device_name,
      `🚨 SORTIE SAUVAGE: ${vehicule.immatriculation} a quitté sa zone (${zoneBase.zone_nom}) sans aucun justificatif à ${moment(eventData.event_time).format('HH:mm')}`,
      eventData.event_time, eventData.latitude, eventData.longitude
    ]);
  }
  
  // === RÉCUPÉRATION DES DONNÉES ===
  async getControles(date) {
    const dateFilter = date || moment().format('YYYY-MM-DD');
    const rows = await queryAsync(`
      SELECT cs.*, c.nom as chauffeur_nom, c.prenom as chauffeur_prenom
      FROM controle_sorties cs
      LEFT JOIN bande_sortie bs ON cs.bon_id = bs.id_bande_sortie
      LEFT JOIN chauffeurs c ON bs.id_chauffeur = c.id_chauffeur
      WHERE DATE(cs.created_at) = ?
      ORDER BY cs.gps_heure DESC
    `, [dateFilter]);
    return rows;
  }
  
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
        AVG(score) as score_moyen,
        AVG(ecart_minutes) as ecart_moyen
      FROM controle_sorties
      WHERE DATE(created_at) = ?
    `, [dateFilter]);
    
    return stats[0] || { total: 0, conformes: 0, non_pointees: 0, bon_non_execute: 0, 
      non_autorisees: 0, anomalies: 0, score_moyen: 0, ecart_moyen: null };
    }
  
  // === RÉGULARISATION ===
  async regulariser(id, idBonSortie, commentaire, userId) {
    const bon = await queryAsync(`
      SELECT date_prevue, sortie_time FROM bande_sortie WHERE id_bande_sortie = ?
    `, [idBonSortie]);
    
    const heureBon = bon[0]?.sortie_time || bon[0]?.date_prevue;
    
    await queryAsync(`
      UPDATE controle_sorties 
      SET bon_id = ?, bon_heure = ?, a_bon = 1,
          a_tablette = CASE WHEN ? IS NOT NULL THEN 1 ELSE a_tablette END,
          tablette_heure = COALESCE(tablette_heure, ?),
          statut = 'CONFORME', score = 100, niveau_risque = 'FAIBLE',
          commentaire = CONCAT(IFNULL(commentaire, ''), ' - Régularisé par user ', ?),
          regularise_par = ?, regularise_le = NOW(), est_regularise = 1
      WHERE id = ?
    `, [idBonSortie, heureBon, heureBon, heureBon, userId, userId, id]);
    
    return true;
  }
}

module.exports = new RapprochementService();