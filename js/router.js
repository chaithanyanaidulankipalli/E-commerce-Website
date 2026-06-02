const Router = {
  routes: [],
  currentRoute: null,

  addRoute(path, handler) {
    // Convert path to regex (e.g., /product/:id -> ^/product/([^/]+)$)
    const paramNames = [];
    const regexPath = path
      .replace(/([:*])(\w+)/g, (full, type, name) => {
        paramNames.push(name);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');
    
    this.routes.push({
      path,
      regex: new RegExp(`^#${regexPath}$`),
      paramNames,
      handler
    });
  },

  getParams(route, hash) {
    const match = hash.match(route.regex);
    if (!match) return {};
    
    const params = {};
    route.paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    return params;
  },

  navigate(path) {
    window.location.hash = path.startsWith('/') ? path : '/' + path;
  },

  async handleRouting() {
    const hash = window.location.hash || '#/';
    
    // Check if the current route has query parameters
    let cleanHash = hash;
    let queryParams = {};
    if (hash.includes('?')) {
      const parts = hash.split('?');
      cleanHash = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, value] of searchParams.entries()) {
        queryParams[key] = value;
      }
    }

    let routeFound = false;

    for (const route of this.routes) {
      const match = cleanHash.match(route.regex);
      if (match) {
        routeFound = true;
        const params = this.getParams(route, cleanHash);
        
        // Before running the route, check for authentication restrictions
        const requiresAuth = ['/checkout', '/orders'].includes(route.path);
        const isLoggedIn = !!window.API.getToken();

        if (requiresAuth && !isLoggedIn) {
          window.showToast('Please login to continue', 'warning');
          this.navigate('/login');
          return;
        }

        // If logged in and trying to access auth pages, redirect to home
        const isAuthPage = ['/login', '/register'].includes(route.path);
        if (isAuthPage && isLoggedIn) {
          this.navigate('/');
          return;
        }

        // Trigger active class in navbar links
        this.updateActiveNavLinks(route.path);

        // Run handler
        try {
          await route.handler(params, queryParams);
        } catch (err) {
          console.error("Route handler execution error:", err);
          document.getElementById('app-view').innerHTML = `
            <div class="container text-center" style="padding: 100px 0;">
              <h2>Failed to load view</h2>
              <p class="text-muted">${err.message || 'An unexpected error occurred.'}</p>
              <a href="#/" class="btn btn-primary" style="margin-top: 16px;">Go to Shop</a>
            </div>
          `;
        }
        break;
      }
    }

    if (!routeFound) {
      console.warn("No route matched:", hash);
      document.getElementById('app-view').innerHTML = `
        <div class="container text-center" style="padding: 100px 0;">
          <h2>404 - Page Not Found</h2>
          <p class="text-muted">The page you are looking for does not exist.</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 16px;">Go to Shop</a>
        </div>
      `;
    }
  },

  updateActiveNavLinks(path) {
    // Remove active classes
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Add active class based on current path
    if (path === '/') {
      const shopNav = document.getElementById('nav-shop');
      if (shopNav) shopNav.classList.add('active');
    } else if (path === '/orders') {
      const ordersNav = document.getElementById('nav-orders');
      if (ordersNav) ordersNav.classList.add('active');
    }
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRouting());
    window.addEventListener('load', () => this.handleRouting());
  }
};

window.Router = Router;
