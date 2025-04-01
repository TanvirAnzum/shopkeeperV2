const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "inventory.db");
const db = new Database(dbPath);

console.log(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      buying_price REAL NOT NULL,
      avg_buying_price REAL NOT NULL,  -- Weighted average
      selling_price REAL NOT NULL,
      discounted_price REAL DEFAULT 0,
      total_sold INTEGER DEFAULT 0,    -- Sales tracking
      net_profit REAL DEFAULT 0,       -- Profit tracking
      remark TEXT,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );
  
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      action TEXT NOT NULL,  -- 'STOCK_ADD', 'STOCK_SELL', 'PRICE_UPDATE', 'DELETE'
      quantity_change INTEGER,
      price_change REAL,
      previous_avg_price REAL,
      new_avg_price REAL,
      old_quantity INTEGER,
      new_quantity INTEGER,
      changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE  -- Delete logs when product is deleted
    );

    CREATE TABLE IF NOT EXISTS product_daily_sales (
    date TEXT,
    product_id INTEGER,
    sales_count INTEGER DEFAULT 0,
    total_profit REAL DEFAULT 0,
    PRIMARY KEY (date, product_id)
    );
  `);

module.exports = db;
