// scripts/runAnalysis.js
const moment = require('moment');
const autoFalconAnalyzer = require('./services/autoFalconAnalyzer.service');

async function run() {
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🚀 Début analyse...`);
  
  const date = process.argv[2] || moment().format('YYYY-MM-DD');
  const result = await autoFalconAnalyzer.analyserTousVehicules(date);
  
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ✅ Analyse terminée`);
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});