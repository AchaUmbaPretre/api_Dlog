// services/autoFalconAnalyzer.js - Version complète avec getNiveauRisque
const moment = require('moment');
const { queryAsync } = require('../config/database');
const http = require('http');

class AutoFalconAnalyzer {
  constructor() {
    this.falconHostname = 'falconeyesolutions.com';
    this.apiHash = process.env.api_hash;
    this.isAnalyzing = false;
    this.lastAnalysisRun = null;
    this.timeoutId = null;
    this.isRunning = true;
    this.stats = {
      totalVehicles: 0,
      processedToday: 0,
      sortiesDetected: 0,
      errors: 0
    };
  }

  // === AJOUTER CETTE MÉTHODE ===
  getNiveauRisque(score) {
    if (score >= 90) return 'FAIBLE';
    if (score >= 60) return 'MOYEN';
    return 'ELEVE';
  }

  // === SOURCE 1: Récupérer les positions depuis la base de données (vehicle_events) ===
  async getPositionsFromDatabase(deviceName, date) {
    const fromDate = moment(date).format('YYYY-MM-DD');
    
    const rows = await queryAsync(`
      SELECT 
        event_time as time,
        latitude,
        longitude,
        speed,
        'db' as source
      FROM vehicle_events
      WHERE device_name = ?
        AND DATE(event_time) = ?
        AND type IN ('position', 'movement', 'zone_out', 'zone_in')
      ORDER BY event_time ASC
    `, [deviceName, fromDate]);
    
    const formattedRows = rows.map(row => ({
      ...row,
      time: moment(row.time).format('YYYY-MM-DD HH:mm:ss')
    }));
    
    console.log(`📍 Positions DB pour ${deviceName}: ${formattedRows.length}`);
    return formattedRows;
  }

  // === SOURCE 2: Récupérer l'historique depuis Falcon API ===
  fetchHistory(deviceId, date) {
    return new Promise((resolve, reject) => {
      const fromDate = moment(date).subtract(3, 'days').format('YYYY-MM-DD');
      const toDate = moment(date).format('YYYY-MM-DD');
      
      const params = new URLSearchParams({
        device_id: deviceId,
        from_date: fromDate,
        from_time: '00:00:00',
        to_date: toDate,
        to_time: '23:59:59',
        lang: 'fr',
        limit: 15000,
        user_api_hash: this.apiHash
      }).toString();

      const options = {
        hostname: this.falconHostname,
        port: 80,
        path: `/api/get_history?${params}`,
        method: 'GET',
        timeout: 30000
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error(`Erreur JSON: ${e.message}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de la requête Falcon'));
      });

      req.end();
    });
  }

  // Extraire les positions de l'historique Falcon
  extrairePositionsFalcon(historyData) {
    const positions = [];
    
    if (!historyData?.items) return positions;
    
    for (const segment of historyData.items) {
      if (segment.items && Array.isArray(segment.items)) {
        for (const point of segment.items) {
          const time = point.raw_time || point.time;
          const lat = point.latitude || point.lat;
          const lng = point.longitude || point.lng;
          
          if (lat && lng && time) {
            positions.push({
              time: moment(time).format('YYYY-MM-DD HH:mm:ss'),
              latitude: lat,
              longitude: lng,
              speed: point.speed || 0,
              source: 'falcon'
            });
          }
        }
      }
    }
    
    positions.sort((a, b) => moment(a.time).unix() - moment(b.time).unix());
    
    console.log(`📍 Positions Falcon: ${positions.length}`);
    if (positions.length > 0) {
      console.log(`🕐 Falcon - Première: ${positions[0].time}`);
      console.log(`🕐 Falcon - Dernière: ${positions[positions.length-1].time}`);
    }
    
    return positions;
  }

  // === FUSIONNER LES DEUX SOURCES ===
  async fusionnerPositions(deviceName, deviceId, date) {
    const dbPositions = await this.getPositionsFromDatabase(deviceName, date);
    
    let falconPositions = [];
    try {
      const history = await this.fetchHistory(deviceId, date);
      falconPositions = this.extrairePositionsFalcon(history);
    } catch (error) {
      console.log(`⚠️ Erreur Falcon pour ${deviceName}: ${error.message}`);
    }
    
    const allPositions = [...dbPositions];
    const timesSet = new Set(dbPositions.map(p => p.time));
    
    for (const pos of falconPositions) {
      if (!timesSet.has(pos.time)) {
        allPositions.push(pos);
        timesSet.add(pos.time);
      }
    }
    
    allPositions.sort((a, b) => moment(a.time).unix() - moment(b.time).unix());
    
    console.log(`📍 Total positions fusionnées: ${allPositions.length}`);
    return allPositions;
  }

  // Récupérer tous les véhicules avec id_capteur valide
  async getVehiculesActifs() {
    const rows = await queryAsync(`
      SELECT 
        id_vehicule, 
        immatriculation, 
        name_capteur, 
        id_capteur,
        id_cat_vehicule
      FROM vehicules
      WHERE est_supprime = 0 
        AND id_capteur IS NOT NULL
      ORDER BY id_vehicule
    `);
    
    console.log(`📋 ${rows.length} véhicules actifs trouvés avec ID capteur`);
    return rows;
  }

  // Récupérer la zone de base du véhicule
  async getZoneBaseVehiculeById(idVehicule) {
    const rows = await queryAsync(`
      SELECT 
        vg.id_geo_dlog,
        gd.nom as zone_nom,
        gd.falcon_id,
        g.id_geofence,
        g.name as geofence_name,
        g.coordinates,
        g.type as geofence_type,
        vg.autorise_sans_bs
      FROM vehicule_geofence vg
      JOIN geofences_dlog gd ON vg.id_geo_dlog = gd.id_geo_dlog
      JOIN geofences g ON gd.falcon_id = g.id_geofence
      WHERE vg.id_vehicule = ?
      LIMIT 1
    `, [idVehicule]);
    
    return rows[0] || null;
  }

  // Vérifier si un point est dans un polygone
  pointDansPolygone(latitude, longitude, coordinates) {
    if (!coordinates) return true;

    try {
      const points = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
      let inside = false;

      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].lng, yi = points[i].lat;
        const xj = points[j].lng, yj = points[j].lat;

        const entreLatitudes = ((yi > latitude) !== (yj > latitude));
        const intersect = entreLatitudes &&
          (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);

        if (intersect) inside = !inside;
      }

      return inside;
    } catch (e) {
      console.error('Erreur pointDansPolygone:', e.message);
      return false;
    }
  }

  // Analyser les sorties (uniquement pour la date cible)
  analyserSorties(positions, zoneCoordinates, zoneNom, targetDate) {
    if (positions.length === 0) return [];
    
    console.log(`\n🔍 Analyse des sorties pour ${zoneNom}`);
    console.log(`📍 ${positions.length} positions à analyser`);
    console.log(`📅 Date cible: ${targetDate}`);
    
    const sorties = [];
    let etat = null;
    let debutSortie = null;
    let positionSortie = null;
    
    console.log(`\n📊 APERÇU DES 5 PREMIÈRES POSITIONS:`);
    for (let i = 0; i < Math.min(5, positions.length); i++) {
      const pos = positions[i];
      const dansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      console.log(`  ${i+1}. ${pos.time} - (${pos.latitude}, ${pos.longitude}) - ${dansZone ? '✅ DANS ZONE' : '❌ HORS ZONE'} [${pos.source || 'db'}]`);
    }
    
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const estDansZone = this.pointDansPolygone(pos.latitude, pos.longitude, zoneCoordinates);
      
      if (etat === null) {
        etat = estDansZone ? 'DANS_ZONE' : 'HORS_ZONE';
        console.log(`📍 État initial à ${pos.time}: ${etat}`);
        continue;
      }
      
      if (etat === 'DANS_ZONE' && !estDansZone) {
        debutSortie = pos.time;
        positionSortie = pos;
        etat = 'HORS_ZONE';
        console.log(`  🚪 SORTIE à ${debutSortie}`);
      }
      else if (etat === 'HORS_ZONE' && estDansZone) {
        const duree = moment(pos.time).diff(moment(debutSortie), 'minutes');
        console.log(`  🔄 RETOUR à ${pos.time} - durée: ${duree} min`);
        
        if (duree >= 5) {
          const sortieDate = moment(debutSortie).format('YYYY-MM-DD');
          if (sortieDate === targetDate) {
            sorties.push({
              temps_sortie: debutSortie,
              position_sortie: positionSortie,
              temps_retour: pos.time,
              duree_minutes: duree
            });
            console.log(`  ✅ SORTIE CONFIRMÉE (${duree} min) - ${sortieDate}`);
          } else {
            console.log(`  ⏭️ Sortie ignorée (date ${sortieDate} ≠ ${targetDate})`);
          }
        } else {
          console.log(`  ⚠️ Sortie courte ignorée (${duree} min < 5 min)`);
        }
        
        etat = 'DANS_ZONE';
        debutSortie = null;
        positionSortie = null;
      }
    }
    
    if (etat === 'HORS_ZONE' && debutSortie) {
      const dernierePos = positions[positions.length - 1];
      const duree = moment(dernierePos.time).diff(moment(debutSortie), 'minutes');
      const sortieDate = moment(debutSortie).format('YYYY-MM-DD');
      
      if (duree >= 5 && sortieDate === targetDate) {
        sorties.push({
          temps_sortie: debutSortie,
          position_sortie: positionSortie,
          temps_retour: null,
          duree_minutes: duree
        });
        console.log(`  ✅ SORTIE CONFIRMÉE (toujours dehors, ${duree} min) - ${sortieDate}`);
      } else if (sortieDate !== targetDate) {
        console.log(`  ⏭️ Sortie ignorée (date ${sortieDate} ≠ ${targetDate})`);
      }
    }
    
    // Éviter les doublons
    const sortiesUniques = [];
    let dernierTemps = null;
    
    for (const sortie of sorties) {
      if (!dernierTemps || moment(sortie.temps_sortie).diff(moment(dernierTemps), 'hours') >= 2) {
        sortiesUniques.push(sortie);
        dernierTemps = sortie.temps_sortie;
        console.log(`📌 Sortie retenue: ${sortie.temps_sortie}`);
      }
    }
    
    console.log(`📊 Total sorties confirmées pour ${targetDate}: ${sortiesUniques.length}`);
    return sortiesUniques;
  }

  // Chercher un BS pour une sortie
  async chercherBon(idVehicule, tempsSortie) {
    const ref = moment(tempsSortie);
    const debut = ref.clone().subtract(12, 'hours').format('YYYY-MM-DD HH:mm:ss');
    const fin = ref.clone().add(4, 'hours').format('YYYY-MM-DD HH:mm:ss');
    
    const rows = await queryAsync(`
      SELECT 
        bs.id_bande_sortie,
        bs.date_prevue,
        bs.sortie_time as tablette_heure
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

  // Enregistrer une sortie avec vérification des doublons et niveau de risque
    async enregistrerSortie(data) {
    const {
        immatriculation,
        id_vehicule,
        device_name,
        gps_heure,
        gps_latitude,
        gps_longitude,
        duree_minutes,
        a_bon,
        a_tablette,
        tablette_heure,
        bon_id,
        bon_heure,
        id_zone,
        zone_nom,
        statut,
        score
    } = data;
    
    const niveauRisque = this.getNiveauRisque(score);
    
    // Conversion des dates
    let gpsHeureFormatted = gps_heure;
    if (typeof gps_heure === 'string' && gps_heure.includes('GMT')) {
        gpsHeureFormatted = moment(gps_heure).format('YYYY-MM-DD HH:mm:ss');
    }
    
    let tabletteHeureFormatted = tablette_heure;
    if (tabletteHeureFormatted && typeof tabletteHeureFormatted === 'string' && tabletteHeureFormatted.includes('GMT')) {
        tabletteHeureFormatted = moment(tabletteHeureFormatted).format('YYYY-MM-DD HH:mm:ss');
    }
    
    let bonHeureFormatted = bon_heure;
    if (bonHeureFormatted && typeof bonHeureFormatted === 'string' && bonHeureFormatted.includes('GMT')) {
        bonHeureFormatted = moment(bonHeureFormatted).format('YYYY-MM-DD HH:mm:ss');
    }
    
    // Vérification 1: doublon par heure (60 minutes)
    const existe = await queryAsync(`
        SELECT id FROM controle_sorties 
        WHERE id_vehicule = ? 
        AND DATE(gps_heure) = DATE(?)
        AND ABS(TIMESTAMPDIFF(MINUTE, gps_heure, ?)) < 60
        AND a_gps = 1
        LIMIT 1
    `, [id_vehicule, gpsHeureFormatted, gpsHeureFormatted]);
    
    if (existe.length > 0) {
        console.log(`⚠️ Doublon ignoré pour ${immatriculation} à ${gpsHeureFormatted}`);
        return existe[0].id;
    }
    
    // Vérification 2: MÊME BS ne doit pas être associé à plusieurs sorties
    if (bon_id) {
        const bsExistant = await queryAsync(`
        SELECT id, gps_heure FROM controle_sorties 
        WHERE bon_id = ? 
        LIMIT 1
        `, [bon_id]);
        
        if (bsExistant.length > 0) {
        console.log(`⚠️ BS ${bon_id} déjà associé à une sortie (${bsExistant[0].gps_heure}), ignoré`);
        return bsExistant[0].id;
        }
    }
    
    // Insertion
    const result = await queryAsync(`
        INSERT INTO controle_sorties 
        (immatriculation, id_vehicule, device_name,
        bon_id, bon_heure, tablette_heure, gps_heure,
        a_bon, a_tablette, a_gps,
        statut, score, niveau_risque, ecart_minutes,
        gps_latitude, gps_longitude,
        id_zone, zone_nom, commentaire)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        immatriculation, id_vehicule, device_name,
        bon_id, bonHeureFormatted, tabletteHeureFormatted, gpsHeureFormatted,
        a_bon ? 1 : 0, a_tablette ? 1 : 0, 1,
        statut, score, niveauRisque,
        tabletteHeureFormatted ? Math.abs(moment(gpsHeureFormatted).diff(moment(tabletteHeureFormatted), 'minutes')) : null,
        gps_latitude, gps_longitude,
        id_zone, zone_nom,
        `Sortie détectée - Hors zone: ${duree_minutes} min`
    ]);
    
    console.log(`✅ Sortie enregistrée: ${immatriculation} - ${statut} (Score: ${score}, Risque: ${niveauRisque}) à ${gpsHeureFormatted}`);
    return result.insertId;
    }

  async analyserVehicule(vehicule, date) {
    console.log(`\n🔍 Analyse ${vehicule.immatriculation} (device_id: ${vehicule.id_capteur})`);
    
    const zoneBase = await this.getZoneBaseVehiculeById(vehicule.id_vehicule);
    if (!zoneBase) {
      console.log(`⚠️ ${vehicule.immatriculation} pas de zone de base`);
      return null;
    }
    
    console.log(`🗺️ Zone: ${zoneBase.zone_nom}`);
    
    const positions = await this.fusionnerPositions(vehicule.name_capteur, vehicule.id_capteur, date);
    
    if (positions.length === 0) {
      console.log(`⚠️ Aucune position pour ${vehicule.immatriculation}`);
      return null;
    }
    
    const sorties = this.analyserSorties(positions, zoneBase.coordinates, zoneBase.zone_nom, date);
    if (sorties.length === 0) return null;
    
    console.log(`🚪 ${sorties.length} sortie(s) détectée(s)`);
    
    const results = [];
    for (const sortie of sorties) {
      const bon = await this.chercherBon(vehicule.id_vehicule, sortie.temps_sortie);
      
      const hasBS = !!bon;
      const hasTablette = bon?.tablette_heure ? true : false;
      const tabletteHeure = bon?.tablette_heure || null;
      
      let statut = 'SORTIE_NON_AUTORISEE';
      let score = 0;
      
      if (hasBS && hasTablette) {
        statut = 'CONFORME';
        score = 100;
      } else if (hasBS && !hasTablette) {
        statut = 'SORTIE_NON_POINTEE';
        score = 90;
      }
      
      const id = await this.enregistrerSortie({
        immatriculation: vehicule.immatriculation,
        id_vehicule: vehicule.id_vehicule,
        device_name: vehicule.name_capteur,
        gps_heure: sortie.temps_sortie,
        gps_latitude: sortie.position_sortie.latitude,
        gps_longitude: sortie.position_sortie.longitude,
        duree_minutes: sortie.duree_minutes,
        a_bon: hasBS,
        a_tablette: hasTablette,
        tablette_heure: tabletteHeure,
        bon_id: bon?.id_bande_sortie,
        bon_heure: bon?.date_prevue,
        id_zone: zoneBase.id_geo_dlog,
        zone_nom: zoneBase.zone_nom,
        statut: statut,
        score: score
      });
      
      results.push({ id, statut, temps_sortie: sortie.temps_sortie });
      this.stats.sortiesDetected++;
    }
    
    return results;
  }

  // Analyser tous les véhicules
  async analyserTousVehicules(date) {
    if (this.isAnalyzing) {
      console.log('⏳ Analyse déjà en cours, ignorée');
      return null;
    }
    
    this.isAnalyzing = true;
    const startTime = Date.now();
    
    const today = moment().format('YYYY-MM-DD');
    const dateFilter = date || today;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 DÉBUT ANALYSE AUTOMATIQUE - ${dateFilter}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const vehicules = await this.getVehiculesActifs();
      this.stats.totalVehicles = vehicules.length;
      this.stats.processedToday = 0;
      this.stats.sortiesDetected = 0;
      this.stats.errors = 0;
      
      for (const vehicule of vehicules) {
        try {
          const result = await this.analyserVehicule(vehicule, dateFilter);
          if (result && result.length > 0) {
            this.stats.processedToday++;
          }
          await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
          console.error(`❌ Erreur ${vehicule.immatriculation}:`, error.message);
          this.stats.errors++;
        }
      }
      
      const duration = Date.now() - startTime;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 RAPPORT FINAL - ${dateFilter}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📋 Véhicules analysés: ${this.stats.processedToday}/${this.stats.totalVehicles}`);
      console.log(`🚪 Sorties détectées: ${this.stats.sortiesDetected}`);
      console.log(`❌ Erreurs: ${this.stats.errors}`);
      console.log(`⏱️ Durée: ${Math.round(duration / 1000)} secondes`);
      console.log(`${'='.repeat(60)}\n`);
      
      this.lastAnalysisRun = new Date();
      return this.stats;
      
    } catch (error) {
      console.error('❌ Erreur analyse globale:', error.message);
      return null;
    } finally {
      this.isAnalyzing = false;
    }
  }

  // === MÉTHODE AVEC setTimeout RÉCURSIF ===
  startContinuousAnalysis(intervalMinutes = 15) {
    console.log(`🚀 Démarrage analyse continue toutes les ${intervalMinutes} minutes`);
    
    const scheduleNext = async () => {
      if (!this.isRunning) return;
      
      try {
        const currentDate = moment().format('YYYY-MM-DD');
        console.log(`\n⏰ [SCHEDULER] Début analyse à ${moment().format('HH:mm:ss')}`);
        await this.analyserTousVehicules(currentDate);
      } catch (error) {
        console.error('❌ Erreur analyse:', error.message);
      }
      
      if (this.isRunning) {
        this.timeoutId = setTimeout(() => {
          scheduleNext();
        }, intervalMinutes * 60 * 1000);
      }
    };
    
    scheduleNext();
  }

  // Arrêter l'analyse
  stopContinuousAnalysis() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('🛑 Scheduler arrêté');
    }
  }

  getStats() {
    return {
      ...this.stats,
      isAnalyzing: this.isAnalyzing,
      lastAnalysisRun: this.lastAnalysisRun,
      isSchedulerRunning: this.isRunning
    };
  }
}

module.exports = new AutoFalconAnalyzer();