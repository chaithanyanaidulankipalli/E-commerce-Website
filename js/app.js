// --- GLOBAL STATE ---
let cart = [];
let activeFilters = {
  category: 'All',
  search: '',
  minPrice: '',
  maxPrice: '',
  sort: 'featured'
};

// Initialize Cart from LocalStorage
function initCart() {
  const savedCart = localStorage.getItem('cart_items');
  try {
    cart = savedCart ? JSON.parse(savedCart) : [];
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
  renderCartDrawer();
}

// Save Cart to LocalStorage
function saveCart() {
  localStorage.setItem('cart_items', JSON.stringify(cart));
  updateCartBadge();
  renderCartDrawer();
}

// Update Cart Badge Indicator
function updateCartBadge() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.innerText = count;
    if (count > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Toast Notifications Helper
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'danger') icon = 'fa-circle-exclamation';
  if (type === 'warning') icon = 'fa-triangle-exclamation';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove toast after 3.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// --- AUTH STATE SYNC FOR HEADER ---
function syncAuthState() {
  const isLoggedIn = !!API.getToken();
  const user = API.getUser();

  const infoDisplay = document.getElementById('user-info-display');
  const infoDivider = document.getElementById('user-info-divider');
  const dropdownOrders = document.getElementById('dropdown-orders');
  const dropdownLogin = document.getElementById('dropdown-login');
  const dropdownRegister = document.getElementById('dropdown-register');
  const dropdownLogout = document.getElementById('dropdown-logout');
  const navOrders = document.getElementById('nav-orders');

  const displayUsername = document.getElementById('display-username');
  const displayUseremail = document.getElementById('display-useremail');

  if (isLoggedIn && user) {
    if (infoDisplay) {
      infoDisplay.classList.remove('hidden');
      displayUsername.innerText = user.name;
      displayUseremail.innerText = user.email;
    }
    if (infoDivider) infoDivider.classList.remove('hidden');
    if (dropdownOrders) dropdownOrders.classList.remove('hidden');
    if (dropdownLogout) dropdownLogout.classList.remove('hidden');
    if (navOrders) navOrders.classList.remove('hidden');

    if (dropdownLogin) dropdownLogin.classList.add('hidden');
    if (dropdownRegister) dropdownRegister.classList.add('hidden');
  } else {
    if (infoDisplay) infoDisplay.classList.add('hidden');
    if (infoDivider) infoDivider.classList.add('hidden');
    if (dropdownOrders) dropdownOrders.classList.add('hidden');
    if (dropdownLogout) dropdownLogout.classList.add('hidden');
    if (navOrders) navOrders.classList.add('hidden');

    if (dropdownLogin) dropdownLogin.classList.remove('hidden');
    if (dropdownRegister) dropdownRegister.classList.remove('hidden');
  }
}

// --- CART DRAWER CONTROLS & RENDER ---
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  
  if (open) {
    drawer.classList.add('active');
    overlay.classList.add('active');
  } else {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
  }
}

function addToCart(product, quantity = 1) {
  const existing = cart.find(item => item.product.id === product.id);
  if (existing) {
    if (existing.quantity + quantity > product.stock) {
      showToast(`Cannot add items. Only ${product.stock} available in stock.`, 'warning');
      return;
    }
    existing.quantity += quantity;
  } else {
    if (quantity > product.stock) {
      showToast(`Cannot add items. Only ${product.stock} available in stock.`, 'warning');
      return;
    }
    cart.push({ product, quantity });
  }
  saveCart();
  showToast(`Added "${product.name}" to cart!`, 'success');
  toggleCartDrawer(true);
}

function updateCartItemQty(productId, quantity) {
  const item = cart.find(item => item.product.id === productId);
  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  if (quantity > item.product.stock) {
    showToast(`Sorry, only ${item.product.stock} units available in stock.`, 'warning');
    return;
  }

  item.quantity = quantity;
  saveCart();
}

function removeFromCart(productId) {
  const itemIndex = cart.findIndex(item => item.product.id === productId);
  if (itemIndex > -1) {
    const name = cart[itemIndex].product.name;
    cart.splice(itemIndex, 1);
    saveCart();
    showToast(`Removed "${name}" from cart`, 'info');
  }
}

function clearCart() {
  cart = [];
  saveCart();
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cart-items-container');
  const footerContainer = document.getElementById('cart-drawer-footer');
  
  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-cart-state">
        <i class="fa-solid fa-bag-shopping empty-cart-icon"></i>
        <p>Your bag is empty.</p>
        <button class="btn btn-primary" id="drawer-shop-btn">Shop Products</button>
      </div>
    `;
    if (footerContainer) footerContainer.classList.add('hidden');

    // Bind shop action button in empty state
    const shopBtn = document.getElementById('drawer-shop-btn');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        toggleCartDrawer(false);
        Router.navigate('/');
      });
    }
    return;
  }

  if (footerContainer) footerContainer.classList.remove('hidden');

  let itemsHtml = '';
  let subtotal = 0;

  cart.forEach(item => {
    const totalItemPrice = (item.product.price * item.quantity).toFixed(2);
    subtotal += item.product.price * item.quantity;

    itemsHtml += `
      <div class="cart-item">
        <img src="${item.product.image_url}" alt="${item.product.name}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.product.name}</h4>
          <span class="cart-item-price">$${item.product.price.toFixed(2)}</span>
          <div class="cart-item-footer">
            <div class="qty-selector">
              <button class="qty-btn dec-qty" data-id="${item.product.id}"><i class="fa-solid fa-minus"></i></button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn inc-qty" data-id="${item.product.id}"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="remove-item-btn" data-id="${item.product.id}"><i class="fa-solid fa-trash-can"></i> Remove</button>
          </div>
        </div>
      </div>
    `;
  });

  itemsContainer.innerHTML = itemsHtml;

  // Update numbers
  const shippingCharge = subtotal >= 100 ? 0 : 9.99;
  const grandTotal = subtotal + shippingCharge;

  document.getElementById('cart-subtotal').innerText = `$${subtotal.toFixed(2)}`;
  document.getElementById('cart-shipping').innerText = shippingCharge === 0 ? 'FREE' : `$${shippingCharge.toFixed(2)}`;
  document.getElementById('cart-total').innerText = `$${grandTotal.toFixed(2)}`;

  // Bind cart action events
  itemsContainer.querySelectorAll('.dec-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const item = cart.find(item => item.product.id === id);
      updateCartItemQty(id, item.quantity - 1);
    });
  });

  itemsContainer.querySelectorAll('.inc-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const item = cart.find(item => item.product.id === id);
      updateCartItemQty(id, item.quantity + 1);
    });
  });

  itemsContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      removeFromCart(id);
    });
  });
}

// --- GLOBAL THEME CONFIGURATION ---
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const darkIcon = themeToggle.querySelector('.theme-icon-dark');
  const lightIcon = themeToggle.querySelector('.theme-icon-light');

  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  if (savedTheme === 'light') {
    darkIcon.classList.add('hidden');
    lightIcon.classList.remove('hidden');
  } else {
    darkIcon.classList.remove('hidden');
    lightIcon.classList.add('hidden');
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'light') {
      darkIcon.classList.add('hidden');
      lightIcon.classList.remove('hidden');
      showToast('Light mode activated', 'info');
    } else {
      darkIcon.classList.remove('hidden');
      lightIcon.classList.add('hidden');
      showToast('Dark mode activated', 'info');
    }
  });
}

// --- PAGE VIEWS RENDER HANDLERS ---

// 1. HOME VIEW (PRODUCT LISTING)
async function renderHomeView(params, queryParams) {
  const appView = document.getElementById('app-view');
  
  // Set query parameter overrides if they exist
  if (queryParams.category) activeFilters.category = queryParams.category;
  
  appView.innerHTML = `
    <div class="container">
      
      <!-- Hero Banner -->
      <section class="hero">
        <div class="hero-text">
          <span class="badge-glow">Special launch offers</span>
          <h1>Experience <span>Premium Electronics</span> & Modern Acoustics</h1>
          <p>Equip your desktop workspace with our collection of self-cleaning smart bottles, intelligent LED study lighting, noise-cancelling acoustics, and Swiss-engineered timepieces.</p>
          <a href="#/" class="btn btn-primary" id="hero-cta-btn">Shop Best Sellers</a>
        </div>
        <img src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=60" alt="Premium workspace setup" class="hero-image">
      </section>

      <!-- Shop Section -->
      <div class="shop-layout">
        
        <!-- Sidebar filters -->
        <aside class="filters-sidebar">
          <div class="filter-group">
            <h3>Categories</h3>
            <button class="category-btn ${activeFilters.category === 'All' ? 'active' : ''}" data-category="All">All Items <i class="fa-solid fa-angle-right"></i></button>
            <button class="category-btn ${activeFilters.category === 'Audio' ? 'active' : ''}" data-category="Audio">Audio <i class="fa-solid fa-angle-right"></i></button>
            <button class="category-btn ${activeFilters.category === 'Electronics' ? 'active' : ''}" data-category="Electronics">Electronics <i class="fa-solid fa-angle-right"></i></button>
            <button class="category-btn ${activeFilters.category === 'Home & Living' ? 'active' : ''}" data-category="Home & Living">Home & Living <i class="fa-solid fa-angle-right"></i></button>
            <button class="category-btn ${activeFilters.category === 'Lifestyle' ? 'active' : ''}" data-category="Lifestyle">Lifestyle <i class="fa-solid fa-angle-right"></i></button>
          </div>

          <div class="filter-group">
            <h3>Price Range</h3>
            <div class="price-inputs">
              <input type="number" id="min-price" placeholder="Min" value="${activeFilters.minPrice}">
              <span>-</span>
              <input type="number" id="max-price" placeholder="Max" value="${activeFilters.maxPrice}">
            </div>
            <button class="btn btn-secondary btn-sm w-full" id="apply-price-filter">Apply Price</button>
          </div>

          <button class="btn btn-secondary w-full" id="clear-filters-btn"><i class="fa-solid fa-rotate-left"></i> Reset Filters</button>
        </aside>

        <!-- Product Listing Area -->
        <div class="products-column">
          
          <div class="control-bar">
            <span class="results-count" id="results-count">Loading products...</span>
            <div class="sort-select-wrapper">
              <label for="sort-select">Sort By:</label>
              <select id="sort-select">
                <option value="featured" ${activeFilters.sort === 'featured' ? 'selected' : ''}>Featured</option>
                <option value="price-asc" ${activeFilters.sort === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-desc" ${activeFilters.sort === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                <option value="rating" ${activeFilters.sort === 'rating' ? 'selected' : ''}>Customer Rating</option>
              </select>
            </div>
          </div>

          <!-- Product Card Grid -->
          <div class="grid products-grid" id="products-grid-inner">
            <!-- Skeletons render dynamically on start -->
            ${Array(6).fill('<div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-text skeleton-title"></div><div class="skeleton-text skeleton-category"></div><div class="skeleton-footer"><div class="skeleton-text skeleton-price"></div></div></div>').join('')}
          </div>

        </div>

      </div>

    </div>
  `;

  // Scroll to products on CTA click
  const ctaBtn = document.getElementById('hero-cta-btn');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('.shop-layout').scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Load and render dynamic products list
  await fetchAndRenderProducts();

  // Bind Sidebar Actions
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.category = btn.dataset.category;
      
      // Update browser URL query parameter without reloading
      const url = activeFilters.category === 'All' ? '#/' : `#[category=${encodeURIComponent(activeFilters.category)}]`;
      // Instead of changing hash directly which triggers router, we'll fetch products reactively
      await fetchAndRenderProducts();
    });
  });

  const applyPriceBtn = document.getElementById('apply-price-filter');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', async () => {
      activeFilters.minPrice = document.getElementById('min-price').value;
      activeFilters.maxPrice = document.getElementById('max-price').value;
      await fetchAndRenderProducts();
    });
  }

  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', async () => {
      activeFilters = {
        category: 'All',
        search: '',
        minPrice: '',
        maxPrice: '',
        sort: 'featured'
      };
      
      const searchInput = document.getElementById('global-search');
      if (searchInput) searchInput.value = '';
      document.getElementById('clear-search').classList.add('hidden');

      // Re-render template to reset views
      renderHomeView(params, queryParams);
    });
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', async (e) => {
      activeFilters.sort = e.target.value;
      await fetchAndRenderProducts();
    });
  }
}

// Fetch products from Express Server
async function fetchAndRenderProducts() {
  const grid = document.getElementById('products-grid-inner');
  const countLabel = document.getElementById('results-count');
  if (!grid) return;

  try {
    const products = await API.getProducts(activeFilters);
    
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="text-center w-full" style="grid-column: 1 / -1; padding: 60px 0;">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
          <h3>No products match your criteria.</h3>
          <p class="text-muted">Try clearing your filters or tweaking your price values.</p>
        </div>
      `;
      if (countLabel) countLabel.innerText = '0 Results found';
      return;
    }

    if (countLabel) countLabel.innerText = `${products.length} product(s) found`;

    grid.innerHTML = products.map(prod => {
      const isLowStock = prod.stock > 0 && prod.stock <= 10;
      const isOutOfStock = prod.stock === 0;

      return `
        <div class="product-card">
          <div class="product-card-img-wrapper">
            <img src="${prod.image_url}" alt="${prod.name}" class="product-card-img">
            ${prod.rating >= 4.7 ? '<span class="product-tag">Top Choice</span>' : ''}
            ${isOutOfStock ? '<span class="product-tag" style="background-color: var(--danger);">Sold Out</span>' : ''}
            ${!isOutOfStock ? `
              <button class="quick-add-btn" data-id="${prod.id}" title="Quick Add to Bag">
                <i class="fa-solid fa-plus"></i>
              </button>
            ` : ''}
          </div>
          <div class="product-card-info">
            <span class="product-card-category">${prod.category}</span>
            <h3 class="product-card-title"><a href="#/product/${prod.id}">${prod.name}</a></h3>
            <div class="product-rating">
              <i class="fa-solid fa-star"></i>
              ${prod.rating.toFixed(1)} <span>(Rating)</span>
            </div>
            <div class="product-card-footer">
              <span class="product-card-price">$${prod.price.toFixed(2)}</span>
              ${isLowStock ? '<span class="text-danger text-sm font-bold">Only ' + prod.stock + ' left!</span>' : ''}
              ${isOutOfStock ? '<span class="text-muted text-sm font-bold">Out of stock</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind Quick Add Clicks
    grid.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const prod = products.find(p => p.id === id);
        addToCart(prod, 1);
      });
    });

  } catch (err) {
    grid.innerHTML = `
      <div class="text-center w-full" style="grid-column: 1 / -1; padding: 60px 0;">
        <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 3rem; margin-bottom: 16px;"></i>
        <h3>Failed to fetch products</h3>
        <p class="text-muted">${err.message || 'Check your server connection.'}</p>
      </div>
    `;
  }
}

// 2. PRODUCT DETAILS VIEW
async function renderProductDetailsView(params) {
  const appView = document.getElementById('app-view');
  appView.innerHTML = `
    <div class="container details-page">
      <div class="back-btn-container">
        <a href="#/" class="back-btn"><i class="fa-solid fa-arrow-left-long"></i> Back to shop listings</a>
      </div>
      <div id="details-inner-loading" class="text-center" style="padding: 100px 0;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
        <p style="margin-top: 16px;">Retrieving item details...</p>
      </div>
    </div>
  `;

  try {
    const product = await API.getProduct(params.id);
    const isOutOfStock = product.stock === 0;
    const isLowStock = product.stock > 0 && product.stock <= 10;
    
    let stockClass = 'in-stock';
    let stockText = `In Stock (${product.stock} items available)`;
    if (isOutOfStock) {
      stockClass = 'out-of-stock';
      stockText = 'Out of Stock';
    } else if (isLowStock) {
      stockClass = 'low-stock';
      stockText = `Only ${product.stock} left in stock!`;
    }

    document.getElementById('details-inner-loading').remove();
    
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'product-details-grid';
    detailsContainer.innerHTML = `
      <div class="product-details-gallery">
        <img src="${product.image_url}" alt="${product.name}">
      </div>
      <div class="product-details-info">
        <span class="product-details-category">${product.category}</span>
        <h1 class="product-details-title">${product.name}</h1>
        <div class="product-rating" style="margin-bottom: 16px;">
          <i class="fa-solid fa-star"></i>
          <span style="color: var(--text-primary); font-weight: 700; margin-left: 4px;">${product.rating.toFixed(1)}</span>
          <span style="color: var(--text-muted); font-weight: 500;">/5 customer rating</span>
        </div>
        <div class="product-details-price">$${product.price.toFixed(2)}</div>
        
        <p class="product-details-desc">${product.description}</p>
        
        <div class="stock-status">
          <span class="stock-dot ${stockClass}"></span>
          <span class="${isLowStock ? 'text-danger' : isOutOfStock ? 'text-muted' : 'text-success'}">${stockText}</span>
        </div>
        
        <div class="purchase-controls">
          ${!isOutOfStock ? `
            <div class="qty-selector">
              <button class="qty-btn" id="details-dec"><i class="fa-solid fa-minus"></i></button>
              <span class="qty-value" id="details-qty">1</span>
              <button class="qty-btn" id="details-inc"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="btn btn-primary" id="details-add-btn" style="flex-grow: 1;">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
          ` : `
            <button class="btn btn-secondary w-full" disabled style="cursor: not-allowed; opacity: 0.6;">
              Out of stock
            </button>
          `}
        </div>
      </div>
    `;

    document.querySelector('.details-page').appendChild(detailsContainer);

    // Bind quantity increment/decrement
    if (!isOutOfStock) {
      let qty = 1;
      const qtyVal = document.getElementById('details-qty');
      const decBtn = document.getElementById('details-dec');
      const incBtn = document.getElementById('details-inc');
      const addBtn = document.getElementById('details-add-btn');

      decBtn.addEventListener('click', () => {
        if (qty > 1) {
          qty--;
          qtyVal.innerText = qty;
        }
      });

      incBtn.addEventListener('click', () => {
        if (qty < product.stock) {
          qty++;
          qtyVal.innerText = qty;
        } else {
          showToast(`Sorry, only ${product.stock} items are in stock.`, 'warning');
        }
      });

      addBtn.addEventListener('click', () => {
        addToCart(product, qty);
      });
    }

  } catch (err) {
    document.getElementById('details-inner-loading').innerHTML = `
      <i class="fa-solid fa-circle-exclamation text-danger" style="font-size: 2.5rem;"></i>
      <h3 style="margin-top: 16px;">Failed to load product details</h3>
      <p class="text-muted">${err.message || 'Product may not exist.'}</p>
      <a href="#/" class="btn btn-primary" style="margin-top: 20px;">Return to Shop</a>
    `;
  }
}

// 3. CART VIEW PAGE
function renderCartView() {
  const appView = document.getElementById('app-view');

  if (cart.length === 0) {
    appView.innerHTML = `
      <div class="container text-center" style="padding: 100px 0;">
        <i class="fa-solid fa-bag-shopping empty-cart-icon" style="font-size: 4rem; margin-bottom: 24px; color: var(--text-muted);"></i>
        <h2>Your Bag is Empty</h2>
        <p class="text-muted" style="margin: 12px 0 24px;">Explore our premium collection and pick items to fill your cart.</p>
        <a href="#/" class="btn btn-primary">Continue Shopping</a>
      </div>
    `;
    return;
  }

  let subtotal = 0;
  let itemsHtml = '';

  cart.forEach(item => {
    subtotal += item.product.price * item.quantity;
    itemsHtml += `
      <div class="cart-page-item">
        <img src="${item.product.image_url}" alt="${item.product.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
        <div>
          <h3 class="font-bold text-lg"><a href="#/product/${item.product.id}">${item.product.name}</a></h3>
          <span class="text-muted text-sm">${item.product.category}</span>
        </div>
        <div class="qty-selector">
          <button class="qty-btn page-dec-qty" data-id="${item.product.id}"><i class="fa-solid fa-minus"></i></button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn page-inc-qty" data-id="${item.product.id}"><i class="fa-solid fa-plus"></i></button>
        </div>
        <div style="text-align: right; min-width: 120px;">
          <p class="font-bold text-lg">$${(item.product.price * item.quantity).toFixed(2)}</p>
          <button class="remove-item-btn page-remove-btn" data-id="${item.product.id}" style="margin-top: 8px;">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        </div>
      </div>
    `;
  });

  const shipping = subtotal >= 100 ? 0 : 9.99;
  const total = subtotal + shipping;

  appView.innerHTML = `
    <div class="container">
      <div class="cart-page-grid">
        <div class="cart-table-card">
          <h2>Shopping Bag (${cart.reduce((s, i) => s + i.quantity, 0)} items)</h2>
          <div id="cart-page-list-inner">
            ${itemsHtml}
          </div>
        </div>

        <div class="cart-page-summary">
          <h3>Summary</h3>
          <div class="cart-summary-row">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Estimated Shipping</span>
            <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div class="cart-divider"></div>
          <div class="cart-summary-row total-row" style="margin-bottom: 24px;">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
          </div>
          <a href="#/checkout" class="btn btn-primary w-full text-center">Proceed to Checkout</a>
          <a href="#/" class="btn btn-secondary w-full text-center" style="margin-top: 12px;">Continue Shopping</a>
        </div>
      </div>
    </div>
  `;

  // Bind actions
  appView.querySelectorAll('.page-dec-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const item = cart.find(item => item.product.id === id);
      updateCartItemQty(id, item.quantity - 1);
      renderCartView(); // Re-render the view
    });
  });

  appView.querySelectorAll('.page-inc-qty').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const item = cart.find(item => item.product.id === id);
      updateCartItemQty(id, item.quantity + 1);
      renderCartView(); // Re-render the view
    });
  });

  appView.querySelectorAll('.page-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      removeFromCart(id);
      renderCartView(); // Re-render the view
    });
  });
}

// 4. CHECKOUT VIEW PAGE
function renderCheckoutView() {
  const appView = document.getElementById('app-view');

  if (cart.length === 0) {
    Router.navigate('/cart');
    return;
  }

  let subtotal = 0;
  let itemsSummaryHtml = '';

  cart.forEach(item => {
    subtotal += item.product.price * item.quantity;
    itemsSummaryHtml += `
      <div class="summary-item-mini">
        <span class="text-muted">${item.product.name} (x${item.quantity})</span>
        <span class="font-bold">$${(item.product.price * item.quantity).toFixed(2)}</span>
      </div>
    `;
  });

  const shipping = subtotal >= 100 ? 0 : 9.99;
  const total = subtotal + shipping;

  appView.innerHTML = `
    <div class="container">
      <div class="checkout-page-grid">
        
        <!-- Forms area -->
        <div class="checkout-card">
          <h2>Checkout Securely</h2>
          
          <form id="checkout-form-element">
            
            <!-- Shipping Details -->
            <div class="checkout-section">
              <div class="checkout-section-title"><i class="fa-solid fa-truck"></i> Shipping Information</div>
              <div class="form-group">
                <label for="co-name">Recipient Name</label>
                <input type="text" id="co-name" required placeholder="John Doe">
              </div>
              <div class="form-group">
                <label for="co-address">Street Address</label>
                <input type="text" id="co-address" required placeholder="123 Main St, Apt 4">
              </div>
              <div class="form-group-row">
                <div class="form-group">
                  <label for="co-city">City</label>
                  <input type="text" id="co-city" required placeholder="New York">
                </div>
                <div class="form-group">
                  <label for="co-zip">Zip/Postal Code</label>
                  <input type="text" id="co-zip" required placeholder="10001">
                </div>
              </div>
            </div>

            <!-- Payment Details -->
            <div class="checkout-section">
              <div class="checkout-section-title"><i class="fa-solid fa-credit-card"></i> Payment Information</div>
              
              <div class="form-group">
                <label for="co-payment-method">Payment Method</label>
                <select id="co-payment-method">
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              <div id="card-inputs-wrapper">
                <div class="form-group">
                  <label for="co-card-number">Card Number</label>
                  <input type="text" id="co-card-number" placeholder="4111 2222 3333 4444" pattern="\\d{16}" title="16-digit credit card number" required>
                </div>
                <div class="card-details-fields">
                  <div class="form-group">
                    <label for="co-expiry">Expiration</label>
                    <input type="text" id="co-expiry" placeholder="MM/YY" pattern="\\d{2}/\\d{2}" title="Expiry in MM/YY format" required>
                  </div>
                  <div class="form-group">
                    <label for="co-cvv">CVV</label>
                    <input type="text" id="co-cvv" placeholder="123" pattern="\\d{3,4}" title="3 or 4 digit CVV" required>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-full" id="place-order-submit-btn">
              Place Order - $${total.toFixed(2)}
            </button>
          </form>
        </div>

        <!-- Sidebar Summary -->
        <div class="order-summary-sidebar">
          <h3>Your Order Summary</h3>
          <div class="cart-divider"></div>
          <div class="summary-items-list">
            ${itemsSummaryHtml}
          </div>
          <div class="cart-divider"></div>
          <div class="cart-summary-row">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Shipping</span>
            <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div class="cart-divider"></div>
          <div class="cart-summary-row total-row">
            <span>Total</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>

      </div>
    </div>
  `;

  // Dynamic hiding of card wrapper if PayPal is selected
  const pmSelect = document.getElementById('co-payment-method');
  const cardWrapper = document.getElementById('card-inputs-wrapper');
  
  if (pmSelect && cardWrapper) {
    pmSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'PayPal') {
        cardWrapper.classList.add('hidden');
        cardWrapper.querySelectorAll('input').forEach(i => i.removeAttribute('required'));
      } else {
        cardWrapper.classList.remove('hidden');
        cardWrapper.querySelectorAll('input').forEach(i => i.setAttribute('required', ''));
      }
    });
  }

  // Handle checkout form submission
  const checkoutForm = document.getElementById('checkout-form-element');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('place-order-submit-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...';

      const shippingAddress = `${document.getElementById('co-name').value}, ${document.getElementById('co-address').value}, ${document.getElementById('co-city').value}, Zip: ${document.getElementById('co-zip').value}`;
      const paymentMethod = pmSelect.value;
      
      // Structure data
      const itemsPayload = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      try {
        const orderRes = await API.createOrder({
          items: itemsPayload,
          address: shippingAddress,
          paymentMethod: paymentMethod
        });

        // Clear cart
        clearCart();

        // Render Success Card Screen
        appView.innerHTML = `
          <div class="container">
            <div class="success-card">
              <div class="success-icon-wrapper">
                <i class="fa-solid fa-check"></i>
              </div>
              <h2>Order Placed Successfully!</h2>
              <p>Thank you for choosing AeroGlow. Your order has been registered under reference <strong>#AG-00${orderRes.orderId}</strong>.</p>
              <p style="margin-top: -16px; margin-bottom: 32px;" class="text-sm">You can view this transaction in your history.</p>
              <div style="display: flex; gap: 16px; justify-content: center;">
                <a href="#/orders" class="btn btn-primary">View My Orders</a>
                <a href="#/" class="btn btn-secondary">Return to Shop</a>
              </div>
            </div>
          </div>
        `;
        showToast('Payment successful! Order processed.', 'success');

      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerText = `Place Order - $${total.toFixed(2)}`;
        showToast(err.message || 'Order placement failed. Check inventory.', 'danger');
      }
    });
  }
}

// 5. LOGIN VIEW PAGE
function renderLoginView() {
  const appView = document.getElementById('app-view');
  appView.innerHTML = `
    <div class="container auth-container">
      <div class="auth-card">
        <h2>Welcome Back</h2>
        <p class="auth-subtitle">Login to your account to order premium items</p>
        
        <form id="login-form-element">
          <div class="form-group">
            <label for="login-email">Email Address</label>
            <input type="email" id="login-email" required placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label for="login-password">Password</label>
            <input type="password" id="login-password" required placeholder="••••••••" minlength="6">
          </div>
          <button type="submit" class="btn btn-primary" id="login-submit-btn">Login</button>
        </form>

        <p class="auth-footer-text">
          Don't have an account? <a href="#/register">Register now</a>
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form-element');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit-btn');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

      try {
        await API.login(email, password);
        syncAuthState();
        showToast('Welcome back! Login successful.', 'success');
        
        // Go back to previous hash or home
        const nextHash = cart.length > 0 ? '/checkout' : '/';
        Router.navigate(nextHash);
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Login';
        showToast(err.message || 'Invalid credentials.', 'danger');
      }
    });
  }
}

// 6. REGISTER VIEW PAGE
function renderRegisterView() {
  const appView = document.getElementById('app-view');
  appView.innerHTML = `
    <div class="container auth-container">
      <div class="auth-card">
        <h2>Create Account</h2>
        <p class="auth-subtitle">Join AeroGlow for custom orders and checkout tracking</p>
        
        <form id="register-form-element">
          <div class="form-group">
            <label for="reg-name">Full Name</label>
            <input type="text" id="reg-name" required placeholder="John Doe">
          </div>
          <div class="form-group">
            <label for="reg-email">Email Address</label>
            <input type="email" id="reg-email" required placeholder="you@example.com">
          </div>
          <div class="form-group">
            <label for="reg-password">Password</label>
            <input type="password" id="reg-password" required placeholder="••••••••" minlength="6">
          </div>
          <button type="submit" class="btn btn-primary" id="reg-submit-btn">Register</button>
        </form>

        <p class="auth-footer-text">
          Already have an account? <a href="#/login">Login instead</a>
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('register-form-element');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const submitBtn = document.getElementById('reg-submit-btn');

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing Account...';

      try {
        await API.register(name, email, password);
        syncAuthState();
        showToast('Registration successful! Welcome.', 'success');
        Router.navigate('/');
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Register';
        showToast(err.message || 'Registration failed. Email might exist.', 'danger');
      }
    });
  }
}

// 7. ORDER HISTORY VIEW
async function renderOrdersView() {
  const appView = document.getElementById('app-view');
  appView.innerHTML = `
    <div class="container orders-page">
      <h2>Your Order History</h2>
      <div id="orders-list-loading" class="text-center" style="padding: 100px 0;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--primary);"></i>
        <p style="margin-top: 16px;">Retrieving purchase records...</p>
      </div>
    </div>
  `;

  try {
    const orders = await API.getOrders();
    const loadingElem = document.getElementById('orders-list-loading');
    if (loadingElem) loadingElem.remove();

    const ordersPage = document.querySelector('.orders-page');
    
    if (orders.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-orders-state';
      emptyState.innerHTML = `
        <i class="fa-solid fa-box-open empty-orders-icon"></i>
        <h3>No Orders Placed Yet</h3>
        <p>Your purchases will be listed here after checkout processing.</p>
        <a href="#/" class="btn btn-primary">Start Shopping</a>
      `;
      ordersPage.appendChild(emptyState);
      return;
    }

    orders.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = 'order-group-card';
      
      const dateStr = new Date(order.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      let itemsHtml = order.items.map(item => `
        <div class="order-product-row">
          <img src="${item.image_url}" alt="${item.product_name}" class="order-product-img">
          <div class="order-product-info">
            <h4 class="order-product-name">${item.product_name}</h4>
            <span class="order-product-qty">Quantity: ${item.quantity}</span>
          </div>
          <div class="order-product-price">$${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      `).join('');

      orderCard.innerHTML = `
        <div class="order-group-header">
          <div class="order-header-cell">
            <label>Order Placed</label>
            <span>${dateStr}</span>
          </div>
          <div class="order-header-cell">
            <label>Total Price</label>
            <span>$${order.total_amount.toFixed(2)}</span>
          </div>
          <div class="order-header-cell">
            <label>Ship To</label>
            <span title="${order.address}">${order.address.split(',')[0]}</span>
          </div>
          <div class="order-header-cell">
            <label>Order Reference</label>
            <span>#AG-00${order.id}</span>
          </div>
          <div class="order-status-badge status-completed">
            Completed
          </div>
        </div>
        <div class="order-group-body">
          ${itemsHtml}
        </div>
      `;
      ordersPage.appendChild(orderCard);
    });

  } catch (err) {
    document.getElementById('orders-list-loading').innerHTML = `
      <i class="fa-solid fa-triangle-exclamation text-danger" style="font-size: 2.5rem;"></i>
      <h3 style="margin-top: 16px;">Failed to load order history</h3>
      <p class="text-muted">${err.message || 'Check your authentication token.'}</p>
      <a href="#/" class="btn btn-primary" style="margin-top: 20px;">Return to Shop</a>
    `;
  }
}

// --- GLOBAL EVENT BINDINGS & APP SETUP ---
function initAppEvents() {
  // Sync Nav dropdown menu open/close
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');

  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }

  // Bind Logout
  const logoutBtn = document.getElementById('dropdown-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      API.logout();
      syncAuthState();
      showToast('Logged out successfully.', 'info');
      Router.navigate('/');
    });
  }

  // Cart Drawer open/close
  const cartBtn = document.getElementById('cart-btn');
  const closeCartBtn = document.getElementById('close-cart');
  const cartOverlay = document.getElementById('cart-overlay');

  if (cartBtn) cartBtn.addEventListener('click', () => toggleCartDrawer(true));
  if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));
  if (cartOverlay) cartOverlay.addEventListener('click', () => toggleCartDrawer(false));

  // Global Search bar logic
  const searchInput = document.getElementById('global-search');
  const clearSearchBtn = document.getElementById('clear-search');

  if (searchInput && clearSearchBtn) {
    searchInput.addEventListener('input', async (e) => {
      const val = e.target.value.trim();
      activeFilters.search = val;
      
      if (val.length > 0) {
        clearSearchBtn.classList.remove('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
      }

      // If we are not on the listings page (home), redirect to home page for search
      if (window.location.hash !== '#/' && !window.location.hash.startsWith('#/?')) {
        Router.navigate('/');
      } else {
        await fetchAndRenderProducts();
      }
    });

    clearSearchBtn.addEventListener('click', async () => {
      searchInput.value = '';
      activeFilters.search = '';
      clearSearchBtn.classList.add('hidden');
      await fetchAndRenderProducts();
    });
  }

  // Newsletter signup form
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input').value;
      showToast(`Thank you! "${email}" has been added to our newsletter list.`, 'success');
      newsletterForm.reset();
    });
  }
}

// --- BOOTSTRAP APP ---
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup global modules
  initCart();
  syncAuthState();
  initTheme();
  initAppEvents();

  // 2. Add application routes
  Router.addRoute('/', renderHomeView);
  Router.addRoute('/product/:id', renderProductDetailsView);
  Router.addRoute('/cart', renderCartView);
  Router.addRoute('/checkout', renderCheckoutView);
  Router.addRoute('/login', renderLoginView);
  Router.addRoute('/register', renderRegisterView);
  Router.addRoute('/orders', renderOrdersView);

  // 3. Start routing listening
  Router.init();
});
