import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const isRemoteDb = !["localhost", "127.0.0.1"].includes(process.env.DB_HOST);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

export default pool;