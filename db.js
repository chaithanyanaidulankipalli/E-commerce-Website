const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'ecommerce.db');
const db = new sqlite3.Database(dbPath);

// Promised-based wrappers
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function initDb() {
  // 1. Create Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Create Products Table
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      rating REAL DEFAULT 0.0,
      stock INTEGER NOT NULL DEFAULT 0
    )
  `);

  // 3. Create Orders Table
  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      address TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // 4. Create Order Items Table
  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `);

  // 5. Seed default products if database is empty
  const countObj = await get('SELECT COUNT(*) as count FROM products');
  if (countObj.count === 0) {
    const productsSeed = [
      {
        name: "AeroSound Max",
        description: "Immersive wireless headphones with advanced Active Noise Cancellation (ANC), 40-hour playback time, Bluetooth 5.2, and premium memory foam ear cushions.",
        price: 199.99,
        image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=60",
        category: "Audio",
        rating: 4.8,
        stock: 15
      },
      {
        name: "ChronoLux Classic Watch",
        description: "Elegant mechanical watch featuring precise Swiss movement, scratch-proof sapphire crystal glass, 50m water resistance, and a genuine Italian leather strap.",
        price: 249.99,
        image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60",
        category: "Lifestyle",
        rating: 4.7,
        stock: 8
      },
      {
        name: "Nebula Smart Projector",
        description: "Ultra-portable 1080p Full HD home theater projector. Features built-in Android TV, 360-degree dual speakers, instant auto-focus, and screen casting.",
        price: 349.99,
        image_url: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&auto=format&fit=crop&q=60",
        category: "Electronics",
        rating: 4.6,
        stock: 12
      },
      {
        name: "Lumina Glow Desk Lamp",
        description: "Minimalist aluminum smart LED desk lamp. Equipped with touch control, adjustable brightness & color temperatures, and a built-in 15W fast wireless charger base.",
        price: 79.99,
        image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=60",
        category: "Home & Living",
        rating: 4.5,
        stock: 20
      },
      {
        name: "EcoFit UV Smart Bottle",
        description: "Double-walled insulated water bottle with UV-C light sterilization built into the cap. Automatically purifies water and cleans the inner bottle surfaces.",
        price: 59.99,
        image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=60",
        category: "Lifestyle",
        rating: 4.9,
        stock: 30
      },
      {
        name: "VoltStream PowerBank 20K",
        description: "Sleek 20,000mAh external battery packs with dual USB-C Power Delivery (PD 3.0), Quick Charge USB-A port, and a magnetic wireless charging pad.",
        price: 49.99,
        image_url: "https://images.unsplash.com/photo-1609592424089-9a740705a610?w=600&auto=format&fit=crop&q=60",
        category: "Electronics",
        rating: 4.4,
        stock: 25
      },
      {
        name: "AromaMist Humidifier",
        description: "Ultrasonic cool mist humidifier and oil diffuser. Operates silently, features an auto-off timer, and includes color-changing LED mood lighting.",
        price: 39.99,
        image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=60",
        category: "Home & Living",
        rating: 4.3,
        stock: 40
      },
      {
        name: "Nomad Anti-Theft Backpack",
        description: "Water-resistant commuter backpack with a TSA-friendly lay-flat design, hidden anti-theft zipper compartments, RFID blocking cards pocket, and integrated USB port.",
        price: 89.99,
        image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=60",
        category: "Lifestyle",
        rating: 4.7,
        stock: 18
      }
    ];

    for (const prod of productsSeed) {
      await run(
        `INSERT INTO products (name, description, price, image_url, category, rating, stock) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prod.name, prod.description, prod.price, prod.image_url, prod.category, prod.rating, prod.stock]
      );
    }
    console.log("Database seeded successfully with default products.");
  }
}

module.exports = {
  run,
  get,
  all,
  initDb,
  db
};
