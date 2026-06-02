const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'premium_ecommerce_secret_key_987654';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Token missing.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// --- AUTHENTICATION API ENDPOINTS ---

// Register User
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into DB
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );

    // Create Token
    const token = jwt.sign({ id: result.id, name, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: result.id,
        name,
        email
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter all fields.' });
  }

  try {
    // Check if user exists
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Validate Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Create Token
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error("Auth profile error:", error);
    res.status(500).json({ error: 'Server error fetching profile.' });
  }
});


// --- PRODUCTS API ENDPOINTS ---

// Get All Products (with filter, search, sort)
app.get('/api/products', async (req, res) => {
  let { category, search, minPrice, maxPrice, sort } = req.query;
  
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  if (minPrice) {
    sql += ' AND price >= ?';
    params.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    sql += ' AND price <= ?';
    params.push(parseFloat(maxPrice));
  }

  // Sorting
  if (sort) {
    if (sort === 'price-asc') {
      sql += ' ORDER BY price ASC';
    } else if (sort === 'price-desc') {
      sql += ' ORDER BY price DESC';
    } else if (sort === 'rating') {
      sql += ' ORDER BY rating DESC';
    } else {
      sql += ' ORDER BY id DESC'; // default / featured
    }
  } else {
    sql += ' ORDER BY id DESC';
  }

  try {
    const products = await db.all(sql, params);
    res.json(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ error: 'Server error fetching products.' });
  }
});

// Get Product by ID
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json(product);
  } catch (error) {
    console.error("Get product detail error:", error);
    res.status(500).json({ error: 'Server error fetching product details.' });
  }
});


// --- ORDERS API ENDPOINTS ---

// Place a New Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items, address, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty. Order cannot be processed.' });
  }

  if (!address || !paymentMethod) {
    return res.status(400).json({ error: 'Shipping address and payment details are required.' });
  }

  try {
    let calculatedTotal = 0;
    const validatedItems = [];

    // Verify stock and calculate real total on server-side
    for (const item of items) {
      const dbProduct = await db.get('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!dbProduct) {
        return res.status(400).json({ error: `Product ID ${item.productId} not found.` });
      }

      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product "${dbProduct.name}". Only ${dbProduct.stock} left.` 
        });
      }

      calculatedTotal += dbProduct.price * item.quantity;
      validatedItems.push({
        productId: dbProduct.id,
        quantity: item.quantity,
        price: dbProduct.price,
        newStock: dbProduct.stock - item.quantity
      });
    }

    // Insert Order into DB
    const orderResult = await db.run(
      'INSERT INTO orders (user_id, total_amount, address, payment_method) VALUES (?, ?, ?, ?)',
      [req.user.id, calculatedTotal, address, paymentMethod]
    );
    const orderId = orderResult.id;

    // Insert Order Items and Update Stock (using transaction logic sequentially)
    for (const valItem of validatedItems) {
      // Create Order Item
      await db.run(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, valItem.productId, valItem.quantity, valItem.price]
      );

      // Decrement Stock
      await db.run(
        'UPDATE products SET stock = ? WHERE id = ?',
        [valItem.newStock, valItem.productId]
      );
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      total: calculatedTotal
    });

  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: 'Server error processing the order.' });
  }
});

// Retrieve User's Order History
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    // Get all orders for the user
    const orders = await db.all(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', 
      [req.user.id]
    );

    // Fetch items for each order
    const enhancedOrders = [];
    for (const order of orders) {
      const items = await db.all(`
        SELECT oi.*, p.name as product_name, p.image_url 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      enhancedOrders.push({
        ...order,
        items
      });
    }

    res.json(enhancedOrders);
  } catch (error) {
    console.error("Get orders history error:", error);
    res.status(500).json({ error: 'Server error retrieving order history.' });
  }
});


// Catch-all route to serve index.html for SPA router support
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and then start listening
async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}

startServer();
