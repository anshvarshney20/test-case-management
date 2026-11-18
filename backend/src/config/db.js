const { Pool } = require('pg');
require('dotenv').config();

const useUrl = !!process.env.DATABASE_URL;

const pool = useUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Supabase requires SSL; local Docker usually does not
      ssl:
        process.env.DB_SSL === 'false'
          ? false
          : process.env.DATABASE_URL.includes('supabase') || process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'testcase_mgmt',
      user: process.env.DB_USER || 'tcm_user',
      password: process.env.DB_PASSWORD || 'tcm_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
