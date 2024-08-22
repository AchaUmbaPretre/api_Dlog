const express = require('express');
const cors = require('cors');
const colors = require('colors');
const dotenv = require('dotenv');
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

const app = express();

dotenv.config();

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
app.use(express.static('public'));

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