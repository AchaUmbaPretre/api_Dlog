const http = require("http");
const https = require("https");
const { query } = require("./db");
const { decrypt } = require("./encrypt");
const { URL } = require("url");

const PULL_INTERVAL_MS = 30 * 1000;
const API_PRESENCE_URL = "http://localhost:8080/api/presence/hikvision";

async function pullAllHikvisionTerminals() {
  const terminals = await query(
    `SELECT id_terminal, device_sn, ip_address, port, credentials_encrypted
     FROM terminals
     WHERE is_enabled = 1 AND usage_mode IN ('ATTENDANCE','BOTH')`
  );

  if (!terminals.length) return console.log("Aucun terminal actif");

  for (const terminal of terminals) await pullSingleTerminal(terminal);
}

async function pullSingleTerminal(terminal) {
  try {
    const credentials = JSON.parse(decrypt(terminal.credentials_encrypted));
    const url = new URL(`http://${terminal.ip_address}:${terminal.port}/ISAPI/AccessControl/AcsEvent?format=json`);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      auth: `${credentials.username}:${credentials.password}`,
      timeout: 10000
    };

    const protocol = url.protocol === "https:" ? https : http;

    const data = await new Promise((resolve, reject) => {
      const req = protocol.request(options, res => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => resolve(body));
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.end();
    });

    let json;
    try { json = JSON.parse(data); } catch { return; }

    const events = json?.AcsEvent?.info || [];
    for (const event of events) {
      if (event.majorEventType !== 5 || event.subEventType !== 75) continue;

      await sendToPresenceAPI({
        user_code: event.employeeNoString,
        datetime: event.time,
        device_sn: terminal.device_sn
      });
    }

    await query(`UPDATE terminals SET last_sync_at = NOW(), last_seen_at = NOW() WHERE id_terminal = ?`, [terminal.id_terminal]);
    console.log(`✅ Terminal ${terminal.device_sn} synchronisé`);

  } catch (err) {
    console.error(`❌ Terminal ${terminal.device_sn}:`, err.message);
  }
}

async function sendToPresenceAPI(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_PRESENCE_URL);
    const data = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    };
    const req = http.request(options, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

setInterval(() => {
  pullAllHikvisionTerminals()
    .then(() => console.log("[AutoSync] Terminaux pullés"))
    .catch(err => console.error("[AutoSync] Erreur:", err.message));
}, PULL_INTERVAL_MS);

module.exports = { startPullScheduler: pullAllHikvisionTerminals };
