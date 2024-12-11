const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: '192.168.1.38', // Adjust if running PostgreSQL remotely
    database: 'postgres',
    password: 'AdminHom3125',
    port: 5432, // Default PostgreSQL port
});

module.exports = pool;
