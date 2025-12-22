const express = require('express');
const cors = require('cors');
const colors = require('colors');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const departementRoutes = require('./routes/departement.routes');
const tacheRoutes = require('./routes/tache.routes');
const userRoutes = require('./routes/user.routes');
const frequenceRoutes = require('./routes/frequence.routes');
const formatRoutes = require('./routes/format.routes');
const controleRoutes = require('./routes/controle.routes');
const typeRoutes = require('./routes/type.routes');
const suiviRoutes = require('./routes/suivi.routes');
const budgetRoutes = require('./routes/budget.routes');
const projetRoutes = require('./routes/projet.routes');
const fournisseurRoutes = require('./routes/fournisseur.routes');
const offresRoutes = require('./routes/offres.routes');
const besoinsRoutes = require('./routes/besoins.routes');
const batimentRoutes = require('./routes/batiment.routes');
const permissionRoutes = require('./routes/permission.routes');
const templateRoutes = require('./routes/template.routes');
const rapportRoutes = require('./routes/rapport.routes');
const charroiRoutes = require('./routes/charroi.routes');
const transporteurRoutes = require('./routes/transporteur.routes');
const eventRoutes = require('./routes/event.routes');
const geofencesRoutes = require('./routes/geofences.routes');
const webhookRoutes = require('./routes/webhook.routes');
const carburantRoutes = require('./routes/carburant.routes');
const generateurRoutes = require('./routes/generateur.routes');
const sortieEamFmpRoutes = require('./routes/sortieEamFmp.routes');

const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();

dotenv.config();

/* const { initializeSocket } = require('./socket');

const server = http.createServer(app);

// Initialisation de Socket.IO
initializeSocket(server); */

const environment = process.env.PORT || 'development';

if (environment === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept'
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

app.setMaxListeners(0);

const port = process.env.PORT || 8070;

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/client', clientRoutes)
app.use('/api/tache', tacheRoutes)
app.use('/api/departement', departementRoutes)
app.use('/api/frequence', frequenceRoutes)
app.use('/api/format', formatRoutes)
app.use('/api/controle', controleRoutes)
app.use('/api/types', typeRoutes)
app.use('/api/suivi', suiviRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/projet', projetRoutes)
app.use('/api/fournisseur', fournisseurRoutes)
app.use('/api/offre', offresRoutes)
app.use('/api/besoin', besoinsRoutes)
app.use('/api/batiment', batimentRoutes)
app.use('/api/permission', permissionRoutes)
app.use('/api/template', templateRoutes)
app.use('/api/rapport', rapportRoutes)
app.use('/api/charroi', charroiRoutes)
app.use('/api/event', eventRoutes)
app.use('/api/geofences', geofencesRoutes)
app.use('/api/transporteur', transporteurRoutes)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/api/event', eventRoutes)
app.use('/api/carburant', carburantRoutes)
app.use('/api/generateur', generateurRoutes)
app.use('/api/sortieEamFmp', sortieEamFmpRoutes)
app.get("/api/falcon", (req, res) => {
  const options = {
    hostname: "31.207.34.171",
    port: 80,
    path: `/api/get_devices?&lang=fr&user_api_hash=${process.env.api_hash}`,
    method: "GET",
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = "";

    proxyRes.on("data", (chunk) => {
      data += chunk;
    });

    proxyRes.on("end", () => {
      console.log("Falcon API response:");
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        console.error("Erreur parsing JSON:", e.message);
        res.status(500).send(data);
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Erreur proxy falcon:", err.message);
    res.status(500).send("Erreur proxy falcon: " + err.message);
  });

  proxyReq.end();
});
app.use('/', webhookRoutes)

app.get("/api/get_event", (req, res) => {
  const query = new URLSearchParams(req.query).toString();

  const options = {
    hostname: "falconeyesolutions.com",
    port: 80,
    path: `/api/get_events?${query}`,
    method: "GET",
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = "";

    proxyRes.on("data", (chunk) => {
      data += chunk;
    });

    proxyRes.on("end", () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        console.error("Erreur parsing JSON:", e.message);
        res.status(500).send(data);
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Erreur proxy falcon:", err.message);
    res.status(500).send("Erreur proxy falcon: " + err.message);
  });

  proxyReq.end();
});

 app.get("/api/get_history", (req, res) => {
  const query = new URLSearchParams(req.query).toString();

  const options = {
    hostname: "falconeyesolutions.com",
    port: 80,
    path: `/api/get_history?${query}`,
    method: "GET",
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = "";

    proxyRes.on("data", (chunk) => {
      data += chunk;
    });

    proxyRes.on("end", () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        console.error("Erreur parsing JSON:", e.message);
        res.status(500).send(data);
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Erreur proxy falcon:", err.message);
    res.status(500).send("Erreur proxy falcon: " + err.message);
  });

  proxyReq.end();
});

app.get("/api/point_in_geofences", (req, res) => {
  const query = new URLSearchParams(req.query).toString();

  const options = {
    hostname: "falconeyesolutions.com",
    port: 80,
    path: `/api/point_in_geofences?${query}`,
    method: "GET",
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = "";

    proxyRes.on("data", (chunk) => {
      data += chunk;
    });

    proxyRes.on("end", () => {
      try {
        res.json(JSON.parse(data));
      } catch (e) {
        console.error("Erreur parsing JSON:", e.message);
        res.status(500).send(data);
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Erreur proxy falcon:", err.message);
    res.status(500).send("Erreur proxy falcon: " + err.message);
  });

  proxyReq.end();
});

app.get("/api/get_geofences", (req, res) => {
  const options = {
    hostname: "falconeyesolutions.com",
    port: 80,
    path: `/api/get_geofences?lang=fr&user_api_hash=${process.env.api_hash}`,
    method: "GET",
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let data = "";

    proxyRes.on("data", (chunk) => {
      data += chunk;
    });

    proxyRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        if (!parsed.items || !parsed.items.geofences) {
          return res.status(400).json({ error: "Format de données invalide" });
        }

        const geofences = parsed.items.geofences;

        const insertQuery = `
          INSERT INTO geofences (
            id_geofence, name, coordinates, polygon_color, type, speed_limit, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            coordinates = VALUES(coordinates),
            polygon_color = VALUES(polygon_color),
            type = VALUES(type),
            speed_limit = VALUES(speed_limit),
            created_at = VALUES(created_at),
            updated_at = VALUES(updated_at)
        `;

        let count = 0;

        geofences.forEach((g) => {
          let coords;
          try {
            coords = JSON.parse(g.coordinates);
          } catch {
            coords = [];
          }

          db.query(
            insertQuery,
            [
              g.id,
              g.name,
              JSON.stringify(coords),
              g.polygon_color || null,
              g.type || null,
              g.speed_limit || null,
              g.created_at || null,
              g.updated_at || null,
            ],
            (err) => {
              if (err) console.error("Erreur insertion/màj:", err);
              else count++;
            }
          );
        });

        res.json({
          message: `✅ Synchronisation terminée (${count} geofences mises à jour ou ajoutées).`,
        });
      } catch (e) {
        console.error("Erreur parsing JSON:", e.message);
        res.status(500).json({ error: "Erreur parsing JSON Falcon" });
      }
    });
  });

  proxyReq.on("error", (err) => {
    console.error("Erreur proxy Falcon:", err.message);
    res.status(500).json({ error: "Erreur proxy Falcon" });
  });

  proxyReq.end();
});

app.get('/api/image-proxy', (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send('URL manquante');
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    client.get(imageUrl, (imageRes) => {
      if (imageRes.statusCode !== 200) {
        res.status(imageRes.statusCode).send(`Erreur: ${imageRes.statusCode}`);
        return;
      }

      res.setHeader('Content-Type', imageRes.headers['content-type'] || 'image/*');
      res.setHeader('Access-Control-Allow-Origin', '*');
      imageRes.pipe(res);
    }).on('error', (err) => {
      console.error('Erreur proxy image:', err.message);
      res.status(500).send('Erreur proxy');
    });
  } catch (error) {
    console.error('URL invalide:', error.message);
    res.status(400).send('URL invalide');
  }
});

app.listen(port, () => {
    console.log(
      `Le serveur est connecté au port ${port}`.bgCyan.white
    );
  });


// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Une erreur est survenue sur le serveur');
  });