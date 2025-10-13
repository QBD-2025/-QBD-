// backend/db/conexion.js

const mysql = require("mysql2/promise");

// Crear un pool de conexiones a la base de datos
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',      // Host de la base de datos
    user: process.env.DB_USER || 'root',           // Usuario de la base de datos
    password: process.env.DB_PASSWORD || '',       // Contraseña del usuario
    database: process.env.DB_NAME || 'quebuendato', // Nombre de la base de datos
});

// Exportar el pool para usarlo en consultas
module.exports = pool;
