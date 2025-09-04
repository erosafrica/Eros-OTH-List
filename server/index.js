import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import compression from 'compression';
const SALT_ROUNDS = 10;
import { signToken, authRequired, requireRole } from './helpers.js';
import { randomUUID } from 'crypto';
import { performanceMiddleware, logDatabaseQuery } from './performance.js';

// Setup env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://eros-oth-list.vercel.app';
const SECURE_COOKIES = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

app.use(cors({
  origin: [
    FRONTEND_ORIGIN,
    // 'https://eros-oth-list.vercel.app',
    // 'http://localhost:8080',
    // 'http://127.0.0.1:8080',
    // 'https://eros-oth-list.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(helmet());
app.use(cookieParser());
app.use(compression());
app.use(performanceMiddleware);
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
}));

if (!process.env.DATABASE_URL) {
  console.warn('[server] DATABASE_URL not set. API will still start, but DB calls will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Simple in-memory cache for hotels API
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(params) {
  return `hotels:${JSON.stringify(params)}`;
}

function isCacheValid(cacheEntry) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
}

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
              -- Create indexes for better query performance
        create index if not exists idx_hotels_city on hotels(city);
        create index if not exists idx_hotels_country on hotels(country);
        create index if not exists idx_hotels_name on hotels(name);
        create index if not exists idx_hotels_created_at on hotels(created_at desc);
        create index if not exists idx_hotels_country_city on hotels(country, city);
        
        -- GIN index for JSONB queries on rate_availability
        create index if not exists idx_hotels_rate_availability_gin on hotels using gin(rate_availability);

      create table if not exists users (
        id text primary key,
        email text not null unique,
        password_hash text not null,
        role text not null default 'user',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
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
app.post('/api/auth/register', async (req, res) => {
  const { email, password, role } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const client = await pool.connect();
  try {
    const id = randomUUID();
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await client.query(
      'insert into users (id, email, password_hash, role) values ($1,$2,$3,$4)',
      [id, email.toLowerCase(), hash, role === 'admin' ? 'admin' : 'user']
    );
    return res.status(201).json({ ok: true });
  } catch (e) {
    if (String(e?.message || '').includes('unique')) return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: 'Failed to register' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const { rows } = await pool.query('select * from users where email = $1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: SECURE_COOKIES ? 'none' : 'lax',
      secure: SECURE_COOKIES,
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hotels', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      country = '', 
      city = '', 
      year = new Date().getFullYear(),
      contractStatus = 'all'
    } = req.query;

    // Check cache first
    const cacheKey = getCacheKey(req.query);
    const cachedResult = cache.get(cacheKey);
    if (isCacheValid(cachedResult)) {
      return res.json(cachedResult.data);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100); // Cap at 100 for performance

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // Build search conditions
    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR city ILIKE $${paramIndex} OR country ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (country) {
      whereConditions.push(`country = $${paramIndex}`);
      queryParams.push(country);
      paramIndex++;
    }

    if (city) {
      whereConditions.push(`city = $${paramIndex}`);
      queryParams.push(city);
      paramIndex++;
    }

    // Contract status filtering
    if (contractStatus !== 'all') {
      const yearNum = parseInt(year);
      if (contractStatus === 'available') {
        whereConditions.push(`rate_availability @> '[{"year": ${yearNum}, "available": true}]'`);
      } else if (contractStatus === 'unavailable') {
        whereConditions.push(`rate_availability @> '[{"year": ${yearNum}, "available": false}]'`);
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records for pagination
    const countQuery = `SELECT COUNT(*) FROM hotels ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM hotels 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limitNum, offset);
    
    const { rows } = await pool.query(dataQuery, queryParams);
    
    const result = {
      hotels: rows.map(toApi),
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    };

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (err) {
    console.error('GET /api/hotels error', err);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.post('/api/hotels', authRequired, requireRole('admin'), async (req, res) => {
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
    
    // Clear cache when new hotel is added
    cache.clear();
    
    res.status(201).json(toApi(rows[0]));
  } catch (err) {
    console.error('POST /api/hotels error', err);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

app.put('/api/hotels/:id', authRequired, requireRole('admin'), async (req, res) => {
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
    
    // Clear cache when hotel is updated
    cache.clear();
    
    res.json(toApi(rows[0]));
  } catch (err) {
    console.error('PUT /api/hotels/:id error', err);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
});

app.delete('/api/hotels/:id', authRequired, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('delete from hotels where id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    
    // Clear cache when hotel is deleted
    cache.clear();
    
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
