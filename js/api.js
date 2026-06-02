const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('token');
  },
  
  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  logout() {
    this.setToken(null);
    this.setUser(null);
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers
    };
    
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },
  
  // Auth Api
  async register(name, email, password) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
    if (res.token && res.user) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  },
  
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (res.token && res.user) {
      this.setToken(res.token);
      this.setUser(res.user);
    }
    return res;
  },
  
  getProfile() {
    return this.request('/auth/me');
  },
  
  // Products Api
  getProducts(filters = {}) {
    const query = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        query.append(key, filters[key]);
      }
    });
    const queryString = query.toString();
    return this.request(`/products${queryString ? '?' + queryString : ''}`);
  },
  
  getProduct(id) {
    return this.request(`/products/${id}`);
  },
  
  // Orders Api
  createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: orderData
    });
  },
  
  getOrders() {
    return this.request('/orders');
  }
};
window.API = API;
