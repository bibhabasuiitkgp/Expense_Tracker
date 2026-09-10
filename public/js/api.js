/**
 * Centralized API service with JWT authentication and error handling.
 */
class ApiService {
  constructor() {
    this.baseUrl = '/api';
  }

  get token() {
    return localStorage.getItem('token');
  }

  set token(value) {
    if (value) {
      localStorage.setItem('token', value);
    } else {
      localStorage.removeItem('token');
    }
  }

  get isAuthenticated() {
    return !!this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && options.method && options.method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
      }
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.token = null; // Clear invalid token
          window.dispatchEvent(new CustomEvent('auth-error'));
        }
        throw new Error((data && data.error && data.error.message) || response.statusText);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // --- Auth ---
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    this.token = data.token;
    return data.user;
  }

  async register(name, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
    this.token = data.token;
    return data.user;
  }

  async getMe() {
    const data = await this.request('/auth/me');
    return data.user;
  }

  logout() {
    this.token = null;
    window.dispatchEvent(new CustomEvent('auth-error'));
  }

  // --- Transactions ---
  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';
    return this.request(endpoint);
  }

  async createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: data
    });
  }

  async updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Categories ---
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: data
    });
  }

  // --- Budgets ---
  async getBudgets(month) {
    return this.request(`/budgets?month=${month}`);
  }

  async setBudget(data) {
    return this.request('/budgets', {
      method: 'POST',
      body: data
    });
  }

  // --- Dashboard ---
  async getDashboardSummary(month) {
    const query = month ? `?month=${month}` : '';
    return this.request(`/dashboard/summary${query}`);
  }

  async getDashboardTrend(months = 12) {
    return this.request(`/dashboard/trend?months=${months}`);
  }

  // --- Investments ---
  async getInvestments() {
    return this.request('/investments');
  }

  async getInvestmentSummary() {
    return this.request('/investments/summary');
  }

  async createInvestment(data) {
    return this.request('/investments', {
      method: 'POST',
      body: data
    });
  }

  async updateInvestment(id, data) {
    return this.request(`/investments/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteInvestment(id) {
    return this.request(`/investments/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Buckets ---
  async getBuckets() {
    return this.request('/buckets');
  }

  async createBucket(data) {
    return this.request('/buckets', {
      method: 'POST',
      body: data
    });
  }
  
  async updateBucket(id, data) {
    return this.request(`/buckets/${id}`, {
      method: 'PUT',
      body: data
    });
  }
  
  async deleteBucket(id) {
    return this.request(`/buckets/${id}`, {
      method: 'DELETE'
    });
  }
}

window.api = new ApiService();
