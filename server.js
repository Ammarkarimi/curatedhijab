require('dotenv').config();
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL connection configuration
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false
});

const AUTH_USERNAME = 'ZaeemZahra';
const AUTH_PASSWORD = 'ShafikaZaid';
const AUTH_TOKEN = 'hijabbilling-static-token-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function initializeDatabase() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      productName TEXT NOT NULL,
      customerName TEXT,
      customerContact TEXT,
      buyingPrice REAL DEFAULT 0,
      sellingPrice REAL DEFAULT 0,
      status TEXT NOT NULL,
      orderDate TEXT NOT NULL,
      deliveryDate TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `;
  await pool.query(queryText);
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (authHeader === `Bearer ${AUTH_TOKEN}`) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    return res.json({ token: AUTH_TOKEN, user: { username } });
  }
  return res.status(401).json({ error: 'Invalid username or password' });
});

function mapRowToCamelCase(row) {
  if (!row) return null;
  return {
    id: row.id,
    productName: row.productname !== undefined ? row.productname : row.productName,
    customerName: row.customername !== undefined ? row.customername : row.customerName,
    customerContact: row.customercontact !== undefined ? row.customercontact : row.customerContact,
    buyingPrice: row.buyingprice !== undefined ? parseFloat(row.buyingprice) : parseFloat(row.buyingPrice),
    sellingPrice: row.sellingprice !== undefined ? parseFloat(row.sellingprice) : parseFloat(row.sellingPrice),
    status: row.status,
    orderDate: row.orderdate !== undefined ? row.orderdate : row.orderDate,
    deliveryDate: row.deliverydate !== undefined ? row.deliverydate : row.deliveryDate,
    notes: row.notes,
    createdAt: row.createdat !== undefined ? row.createdat : row.createdAt,
    updatedAt: row.updatedat !== undefined ? row.updatedat : row.updatedAt
  };
}

app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY orderDate DESC, createdAt DESC');
    return res.json(result.rows.map(mapRowToCamelCase));
  } catch (err) {
    console.error('[GET /api/orders] error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', authenticate, async (req, res) => {
  const order = req.body;
  console.log('[POST /api/orders] payload:', order);
  if (!order.productName || typeof order.productName !== 'string' || !order.productName.trim()) {
    return res.status(400).json({ error: 'productName is required' });
  }

  const now = new Date().toISOString();
  const generatedId = order.id && String(order.id).trim() ? String(order.id) : now;

  const queryText = `
    INSERT INTO orders (id, productName, customerName, customerContact, buyingPrice, sellingPrice, status, orderDate, deliveryDate, notes, createdAt, updatedAt)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;

  try {
    await pool.query(queryText, [
      generatedId,
      order.productName.trim(),
      order.customerName || '',
      order.customerContact || '',
      parseFloat(order.buyingPrice) || 0,
      parseFloat(order.sellingPrice) || 0,
      order.status || 'Pending',
      order.orderDate || now.split('T')[0],
      order.deliveryDate || '',
      order.notes || '',
      now,
      now
    ]);

    const saved = Object.assign({}, order, {
      id: generatedId,
      createdAt: now,
      updatedAt: now,
      orderDate: order.orderDate || now.split('T')[0]
    });
    return res.status(201).json(saved);
  } catch (error) {
    console.error('[POST /api/orders] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', authenticate, async (req, res) => {
  const orderId = req.params.id;
  const order = req.body;
  console.log('[PUT /api/orders/:id] id=', orderId, 'payload=', order);
  const now = new Date().toISOString();

  if (!order.productName || typeof order.productName !== 'string' || !order.productName.trim()) {
    return res.status(400).json({ error: 'productName is required' });
  }

  const queryText = `
    UPDATE orders SET
      productName = $1,
      customerName = $2,
      customerContact = $3,
      buyingPrice = $4,
      sellingPrice = $5,
      status = $6,
      orderDate = $7,
      deliveryDate = $8,
      notes = $9,
      updatedAt = $10
    WHERE id = $11
  `;

  try {
    const result = await pool.query(queryText, [
      order.productName.trim(),
      order.customerName || '',
      order.customerContact || '',
      parseFloat(order.buyingPrice) || 0,
      parseFloat(order.sellingPrice) || 0,
      order.status || 'Pending',
      order.orderDate || now.split('T')[0],
      order.deliveryDate || '',
      order.notes || '',
      now,
      orderId
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (error) {
    console.error('[PUT /api/orders/:id] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', authenticate, async (req, res) => {
  const orderId = req.params.id;
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error('[DELETE /api/orders/:id] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  return next();
});

// Lazy database initialization middleware for serverless environment support
let dbInitialized = false;
async function ensureDbInitialized(req, res, next) {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Lazy DB initialization error:', err);
    }
  }
  next();
}

app.use('/api', ensureDbInitialized);

if (!process.env.VERCEL) {
  (async () => {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized successfully.');
    } catch (err) {
      console.error('Error initializing database:', err);
    }

    app.listen(port, () => {
      console.log(`HijabBilling backend running at http://localhost:${port}`);
    });
  })();
}

module.exports = app;
