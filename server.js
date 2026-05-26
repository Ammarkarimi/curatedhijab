const path = require('path');
const fs = require('fs');
const express = require('express');
const initSqlJs = require('sql.js');

const app = express();
const port = process.env.PORT || 3000;
// const dbPath = path.join(__dirname, 'orders.db');
const dbFile = path.join("/tmp", "orders.db");
let db;

const AUTH_USERNAME = 'ZaeemZahra';
const AUTH_PASSWORD = 'ShafikaZaid';
const AUTH_TOKEN = 'hijabbilling-static-token-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function loadDatabase(SQL) {
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
    initializeDatabase();
    saveDatabase();
  }
}

function initializeDatabase() {
  const stmt = db.prepare(`
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
  `);
  stmt.run();
  stmt.free();
}

function getRows(stmt) {
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
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

app.get('/api/orders', authenticate, (req, res) => {
  const stmt = db.prepare('SELECT * FROM orders ORDER BY orderDate DESC, createdAt DESC');
  const rows = getRows(stmt);
  return res.json(rows);
});

app.post('/api/orders', authenticate, (req, res) => {
  const order = req.body;
  console.log('[POST /api/orders] payload:', order);
  if (!order.productName || typeof order.productName !== 'string' || !order.productName.trim()) {
    return res.status(400).json({ error: 'productName is required' });
  }

  const now = new Date().toISOString();
  // Use provided id if present, otherwise use the current ISO timestamp as a unique id
  const generatedId = order.id && String(order.id).trim() ? String(order.id) : now;

  // Use positional parameters to ensure binding works reliably with sql.js
  const stmt = db.prepare(
    `INSERT INTO orders (id, productName, customerName, customerContact, buyingPrice, sellingPrice, status, orderDate, deliveryDate, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  try {
    stmt.run([
      generatedId,
      order.productName.trim(),
      order.customerName || '',
      order.customerContact || '',
      order.buyingPrice || 0,
      order.sellingPrice || 0,
      order.status || 'Pending',
      order.orderDate || now.split('T')[0],
      order.deliveryDate || '',
      order.notes || '',
      now,
      now
    ]);
    stmt.free();
    saveDatabase();
    // Return the persisted record with generated id and timestamps
    const saved = Object.assign({}, order, {
      id: generatedId,
      createdAt: now,
      updatedAt: now,
      orderDate: order.orderDate || now.split('T')[0]
    });
    return res.status(201).json(saved);
  } catch (error) {
    stmt.free();
    console.error('[POST /api/orders] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', authenticate, (req, res) => {
  const orderId = req.params.id;
  const order = req.body;
  console.log('[PUT /api/orders/:id] id=', orderId, 'payload=', order);
  const now = new Date().toISOString();
  // Use positional parameters for UPDATE as well
  const stmt = db.prepare(`
    UPDATE orders SET
      productName = ?,
      customerName = ?,
      customerContact = ?,
      buyingPrice = ?,
      sellingPrice = ?,
      status = ?,
      orderDate = ?,
      deliveryDate = ?,
      notes = ?,
      updatedAt = ?
    WHERE id = ?
  `);

  if (!order.productName || typeof order.productName !== 'string' || !order.productName.trim()) {
    return res.status(400).json({ error: 'productName is required' });
  }

  try {
    const result = stmt.run([
      order.productName.trim(),
      order.customerName || '',
      order.customerContact || '',
      order.buyingPrice || 0,
      order.sellingPrice || 0,
      order.status || 'Pending',
      order.orderDate || now.split('T')[0],
      order.deliveryDate || '',
      order.notes || '',
      now,
      orderId
    ]);
    stmt.free();

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    saveDatabase();
    return res.json(order);
  } catch (error) {
    stmt.free();
    console.error('[PUT /api/orders/:id] error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', authenticate, (req, res) => {
  const orderId = req.params.id;
  // Use positional binding to avoid named-parameter issues with sql.js
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  try {
    const result = stmt.run([orderId]);
    stmt.free();
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    saveDatabase();
    return res.status(204).send();
  } catch (error) {
    stmt.free();
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

(async () => {
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
  });

  loadDatabase(SQL);

  app.listen(port, () => {
    console.log(`HijabBilling backend running at http://localhost:${port}`);
  });
})();
