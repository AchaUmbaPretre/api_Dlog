const mysql = require("mysql");

const db = mysql.createPool({
    connectionLimit: 10, // Limite le nombre de connexions simultanées
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
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

const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

module.exports = { db, queryAsync };