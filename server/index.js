import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

// Setup env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.warn('[server] DATABASE_URL not set. API will still start, but DB calls will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Initialize table
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists hotels (
        id text primary key,
        name text not null,
        country text not null,
        city text not null,
        stars integer,
        rate_availability jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index if not exists idx_hotels_city on hotels(city);
      create index if not exists idx_hotels_country on hotels(country);
    `);
  } finally {
    client.release();
  }
}

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    city: row.city,
    stars: row.stars ?? undefined,
    rateAvailability: row.rate_availability,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hotels', async (_req, res) => {
  try {
    const { rows } = await pool.query('select * from hotels order by created_at desc limit 1000');
    res.json(rows.map(toApi));
  } catch (err) {
    console.error('GET /api/hotels error', err);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.post('/api/hotels', async (req, res) => {
  try {
    const { name, country, city, stars, rateAvailability } = req.body ?? {};
    if (!name || !country || !city || !Array.isArray(rateAvailability)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { rows } = await pool.query(
      `insert into hotels (id, name, country, city, stars, rate_availability)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [id, name, country, city, stars ?? null, JSON.stringify(rateAvailability)]
    );
    res.status(201).json(toApi(rows[0]));
  } catch (err) {
    console.error('POST /api/hotels error', err);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

app.put('/api/hotels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, city, stars, rateAvailability } = req.body ?? {};
    const { rows } = await pool.query(
      `update hotels set
         name = coalesce($2, name),
         country = coalesce($3, country),
         city = coalesce($4, city),
         stars = $5,
         rate_availability = coalesce($6, rate_availability),
         updated_at = now()
       where id = $1
       returning *`,
      [id, name ?? null, country ?? null, city ?? null, stars ?? null, rateAvailability ? JSON.stringify(rateAvailability) : null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(toApi(rows[0]));
  } catch (err) {
    console.error('PUT /api/hotels/:id error', err);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

app.delete('/api/hotels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('delete from hotels where id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/hotels/:id error', err);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Failed to start', err);
    process.exit(1);
  });
