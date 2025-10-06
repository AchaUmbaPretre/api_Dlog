// fetch_events.js
const { fetchAndStoreEvents } = require("./controllers/event.controller");

(async () => {
  console.log("🚀 Lancement du script de récupération des événements Falcon...");
  await fetchAndStoreEvents();
  console.log("✅ Événements récupérés et stockés avec succès !");
  process.exit(0); // quitte le script
})();
