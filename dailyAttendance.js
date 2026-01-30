// dailyAttendance.js
const { cronDailyAttendance } = require("./controllers/presence.controller");

(async () => {
  console.log("🚀 Lancement du script de récupération des présences...");
  try {
    await cronDailyAttendance();
    console.log("✅ Événements récupérés et stockés avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors du traitement des présences :", error);
  } finally {
    process.exit(0); // quitte le script proprement
  }
})();
