const moment = require('moment');
const http = require('http');

function fetchHistory(deviceId, startTime, endTime) {
  return new Promise((resolve, reject) => {
    // Formater les dates pour Falcon
    const startDate = moment(startTime).format('YYYY-MM-DD');
    const startTimeFormatted = moment(startTime).format('HH:mm:ss');
    const endDate = moment(endTime).format('YYYY-MM-DD');
    const endTimeFormatted = moment(endTime).format('HH:mm:ss');
    
    const params = new URLSearchParams({
      device_id: deviceId,
      from_date: startDate,
      from_time: startTimeFormatted,
      to_date: endDate,
      to_time: endTimeFormatted,
      lang: 'fr',
      limit: 15000,
      user_api_hash: process.env.api_hash
    }).toString();
    
    const options = {
      hostname: 'falconeyesolutions.com',
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

module.exports = { fetchHistory };