const mysql = require("mysql");

const db = mysql.createPool({
    connectionLimit: 10, // Limite le nombre de connexions simultanées
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dlog',
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('La connexion avec la base de données a été perdue.');
        } else if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Trop de connexions à la base de données.');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('La connexion à la base de données a été refusée.');
        }
    }
    if (connection) {
        connection.release();
    }
    return;
});

module.exports = { db };