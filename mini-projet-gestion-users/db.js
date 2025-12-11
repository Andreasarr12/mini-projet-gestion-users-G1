// db.js

// 1. On importe le module mysql2
const mysql = require('mysql2');

// 2. On crée une "pool" de connexions à MySQL
const pool = mysql.createPool({
  host: 'localhost',        // le serveur MySQL
  user: 'root',             // ton utilisateur MySQL
  password: '',             // ton mot de passe MySQL (mets-le si tu en as un)
  database: 'gestion_users' // le nom de la base
});

// 3. On exporte la version "promise" pour pouvoir utiliser async/await
module.exports = pool.promise();
