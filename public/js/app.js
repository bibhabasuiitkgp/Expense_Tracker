/**
 * Main Application Logic
 */
class App {
  constructor() {
    this.categories = [];
    this.isInitialized = false;

    // DOM Elements
    this.pages = {
      login: document.getElementById('login-page'),
      app: document.getElementById('app')
    };

    this.sections = {
      dashboard: document.getElementById('page-dashboard'),
      transactions: document.getElementById('page-transactions'),
      investments: document.getElementById('page-investments'),
      buckets: document.getElementById('page-buckets')
    };

    this.navItems = document.querySelectorAll('.bottom-nav__item');
    this.toastContainer = document.getElementById('toast-container');
    
    this.setupEventListeners();
    this.initTheme();
    this.checkAuth();
  }

  async checkAuth() {
    if (window.api.isAuthenticated) {
      try {
        await window.api.getMe();
        this.showApp();
        if (!this.isInitialized) {
          await this.initializeApp();
        }
      } catch (e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  showLogin() {
    this.pages.app.classList.add('hidden');
    this.pages.login.classList.remove('hidden');
  }

  showApp() {
    this.pages.login.classList.add('hidden');
    this.pages.app.classList.remove('hidden');
  }

  async initializeApp() {
    this.isInitialized = true;
    try {
      // Fetch common data
      const res = await window.api.getCategories();
      this.categories = res.categories || [];
      window.nlpParser.setCategories(this.categories);

      // Initialize all modules
      window.dashboardModule.init();
      window.transactionsModule.init();
      window.investmentsModule.init();
      window.bucketsModule.init();

    } catch (e) {
      this.showToast('Failed to load initial data', 'danger');
    }
  }

  setupEventListeners() {
    // Auth errors from API
    window.addEventListener('auth-error', () => {
      this.showLogin();
    });

    // Navigation
    this.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const page = item.getAttribute('data-page');
        this.navigateTo(page);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // 'n' to open transaction modal (if not typing in an input)
      if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        window.transactionsModule.openModal();
      }
    });

    // Auth Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    if (showRegister) {
      showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      });
    }

    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      });
    }

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        const btn = document.getElementById('login-btn');
        
        btn.textContent = 'Signing in...';
        btn.disabled = true;
        
        try {
          await window.api.login(email, pass);
          errEl.classList.add('hidden');
          this.showApp();
          if (!this.isInitialized) {
            await this.initializeApp();
          }
        } catch (err) {
          errEl.textContent = err.message || 'Login failed';
          errEl.classList.remove('hidden');
        } finally {
          btn.textContent = 'Sign In';
          btn.disabled = false;
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const pass = document.getElementById('register-password').value;
        const errEl = document.getElementById('register-error');
        const btn = document.getElementById('register-btn');
        
        btn.textContent = 'Creating account...';
        btn.disabled = true;
        
        try {
          await window.api.register(name, email, pass);
          errEl.classList.add('hidden');
          this.showApp();
          if (!this.isInitialized) {
            await this.initializeApp();
          }
        } catch (err) {
          errEl.textContent = err.message || 'Registration failed';
          errEl.classList.remove('hidden');
        } finally {
          btn.textContent = 'Create Account';
          btn.disabled = false;
        }
      });
    }
  }

  navigateTo(pageId) {
    // Update nav active state
    this.navItems.forEach(item => {
      if (item.getAttribute('data-page') === pageId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update section active state
    Object.values(this.sections).forEach(section => {
      if (section) section.classList.remove('active');
    });

    if (this.sections[pageId]) {
      this.sections[pageId].classList.add('active');
      
      // Trigger load data for specific pages
      if (pageId === 'dashboard') window.dashboardModule.loadData();
      if (pageId === 'transactions') window.transactionsModule.loadData();
      if (pageId === 'investments') window.investmentsModule.loadData();
      if (pageId === 'buckets') window.bucketsModule.loadData();
    }
    
    // Scroll to top
    window.scrollTo(0,0);
  }

  // --- Theme ---
  initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.setTheme(theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    window.chartManager.updateTheme();
  }

  // --- UI Helpers ---
  showToast(message, type = 'info', action = null) {
    const toast = document.createElement('div');
    toast.className = `toast border-l-4 border-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'danger') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
    `;

    if (action) {
      const btn = document.createElement('button');
      btn.className = 'toast__btn';
      btn.textContent = action.label;
      btn.onclick = () => {
        action.onClick();
        toast.remove();
      };
      toast.appendChild(btn);
    }

    this.toastContainer.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideUp 0.3s ease-in reverse forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 0
    });
  }

  formatDate(dateString) {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }

  getCategoryIcon(catName) {
    const cat = this.categories.find(c => c.name === catName);
    return cat ? cat.icon : '📌';
  }

  getCategoryColor(catName) {
    const cat = this.categories.find(c => c.name === catName);
    return cat ? cat.color : '#9ca3af';
  }
}

// Global Modal Helper
window.closeModal = (id) => {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('open');
  }
};

window.openModal = (id) => {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('open');
  }
};

// Close modal when clicking overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

window.app = new App();
