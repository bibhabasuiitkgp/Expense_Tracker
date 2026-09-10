/**
 * Transactions Module
 */
class TransactionsModule {
  constructor() {
    this.transactions = [];
    this.page = 1;
    this.hasMore = true;
    this.isLoading = false;
    
    // Elements
    this.listEl = document.getElementById('transaction-list');
    this.loadMoreBtn = document.getElementById('load-more-btn');
    this.loadMoreContainer = document.getElementById('load-more-container');
    
    // Filters
    this.filters = {
      type: '',
      from: '',
      to: '',
      q: ''
    };
    
    this.setupEventListeners();
  }

  init() {
    // Populate category dropdown
    this.renderCategoryDropdown();
    
    if (document.getElementById('page-transactions').classList.contains('active')) {
      this.loadData(true);
    }
  }

  setupEventListeners() {
    // Add button
    const addBtn = document.getElementById('add-transaction-btn');
    const fabBtn = document.getElementById('fab-add');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());
    if (fabBtn) fabBtn.addEventListener('click', () => this.openModal());

    // Filter bar
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        filterChips.forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        
        const type = e.target.getAttribute('data-filter');
        this.filters.type = type === 'all' ? '' : type;
        this.loadData(true);
      });
    });

    // Date filters
    const fromEl = document.getElementById('filter-from');
    const toEl = document.getElementById('filter-to');
    
    const applyDateFilter = () => {
      this.filters.from = fromEl.value;
      this.filters.to = toEl.value;
      this.loadData(true);
    };
    
    if (fromEl) fromEl.addEventListener('change', applyDateFilter);
    if (toEl) toEl.addEventListener('change', applyDateFilter);

    // Search input (debounce)
    const searchEl = document.getElementById('search-input');
    let searchTimeout;
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.filters.q = e.target.value;
          this.loadData(true);
        }, 500);
      });
    }

    // Load more
    if (this.loadMoreBtn) {
      this.loadMoreBtn.addEventListener('click', () => this.loadData());
    }

    // --- Modal Form ---
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Category Dropdown
    const catInput = document.getElementById('txn-category-input');
    const dropdown = document.getElementById('category-dropdown');
    
    if (catInput) {
      catInput.addEventListener('focus', () => {
        dropdown.classList.add('open');
        this.filterCategoryDropdown('');
      });
      
      catInput.addEventListener('input', (e) => {
        dropdown.classList.add('open');
        this.filterCategoryDropdown(e.target.value);
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!catInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });
    }

    // Tags
    const tagsInput = document.getElementById('txn-tags-input');
    const tagsDisplay = document.getElementById('txn-tags-display');
    this.currentTags = [];

    if (tagsInput) {
      tagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const tag = tagsInput.value.trim().toLowerCase();
          if (tag && !this.currentTags.includes(tag)) {
            this.currentTags.push(tag);
            this.renderTags();
          }
          tagsInput.value = '';
        }
      });
    }

    // NLP Input
    const nlpInput = document.getElementById('nlp-input');
    if (nlpInput) {
      nlpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const parsed = window.nlpParser.parse(nlpInput.value);
          if (parsed && parsed.amount) {
            this.openModal(parsed);
            nlpInput.value = '';
          } else {
            window.app.showToast('Could not parse transaction amount.', 'warning');
          }
        }
      });
    }
  }

  renderCategoryDropdown() {
    const dropdown = document.getElementById('category-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = window.app.categories.map(c => `
      <div class="dropdown__item" data-val="${c.name}" data-icon="${c.icon}" onclick="window.transactionsModule.selectCategory('${c.name}')">
        <span class="dropdown__item-icon">${c.icon}</span>
        <span>${c.name}</span>
        <div class="dropdown__item-color" style="background: ${c.color}; margin-left: auto;"></div>
      </div>
    `).join('');
  }

  filterCategoryDropdown(query) {
    const items = document.querySelectorAll('#category-dropdown .dropdown__item');
    query = query.toLowerCase();
    
    let hasMatch = false;
    items.forEach(item => {
      const text = item.getAttribute('data-val').toLowerCase();
      if (text.includes(query)) {
        item.style.display = 'flex';
        hasMatch = true;
      } else {
        item.style.display = 'none';
      }
    });
    
    if (!hasMatch) {
      // Optionally show a "Create category" option
    }
  }

  selectCategory(name) {
    const input = document.getElementById('txn-category-input');
    const hidden = document.getElementById('txn-category');
    const dropdown = document.getElementById('category-dropdown');
    
    const cat = window.app.categories.find(c => c.name === name);
    if (cat) {
      input.value = cat.name;
      hidden.value = cat.name;
      dropdown.classList.remove('open');
    }
  }

  renderTags() {
    const display = document.getElementById('txn-tags-display');
    if (!display) return;
    
    display.innerHTML = this.currentTags.map((tag, i) => `
      <div class="tag">
        #${tag}
        <span class="tag__remove" onclick="window.transactionsModule.removeTag(${i})">×</span>
      </div>
    `).join('');
  }

  removeTag(index) {
    this.currentTags.splice(index, 1);
    this.renderTags();
  }

  async loadData(reset = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    
    if (reset) {
      this.page = 1;
      this.transactions = [];
      if (this.listEl) this.listEl.innerHTML = '<div class="skeleton" style="height: 60px; margin-bottom: 8px;"></div><div class="skeleton" style="height: 60px;"></div>';
    }

    try {
      const params = {
        page: this.page,
        limit: 20,
        ...this.filters
      };

      const res = await window.api.getTransactions(params);
      
      if (reset) {
        this.transactions = res.transactions;
      } else {
        this.transactions = [...this.transactions, ...res.transactions];
      }
      
      this.hasMore = res.pagination.page < res.pagination.pages;
      this.renderList();
      
      if (this.loadMoreContainer) {
        if (this.hasMore) {
          this.loadMoreContainer.classList.remove('hidden');
        } else {
          this.loadMoreContainer.classList.add('hidden');
        }
      }
    } catch (e) {
      window.app.showToast('Failed to load transactions', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  renderList() {
    if (!this.listEl) return;

    if (this.transactions.length === 0) {
      this.listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">📄</div>
          <div class="empty-state__text">No transactions found</div>
        </div>
      `;
      return;
    }

    let currentDate = '';
    let html = '';

    this.transactions.forEach(t => {
      const dateStr = window.app.formatDate(t.date);
      
      // Add date header if date changes
      if (dateStr !== currentDate) {
        html += `<div style="font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--text-tertiary); margin: var(--sp-4) 0 var(--sp-2) 0; text-transform: uppercase; letter-spacing: 0.5px;">${dateStr}</div>`;
        currentDate = dateStr;
      }

      const isExpense = t.type === 'expense';
      const color = window.app.getCategoryColor(t.category);
      const icon = window.app.getCategoryIcon(t.category);
      
      const anomalyBadge = t.isAnomaly ? `<div class="transaction-item__anomaly">High</div>` : '';
      
      let desc = t.description;
      if (t.tags && t.tags.length > 0) {
        desc += ` <span style="color: var(--accent-primary); opacity: 0.8;">#${t.tags[0]}</span>`;
      }

      html += `
        <div class="transaction-item" onclick="window.transactionsModule.editTransaction('${t._id}')" style="position: relative;">
          ${anomalyBadge}
          <div class="transaction-item__icon" style="background: ${color}20; color: ${color}">
            ${icon}
          </div>
          <div class="transaction-item__info">
            <div class="transaction-item__category">${t.category}</div>
            <div class="transaction-item__desc">${desc || t.paymentMethod}</div>
          </div>
          <div class="transaction-item__amount transaction-item__amount--${t.type}">
            ${isExpense ? '-' : '+'}${window.app.formatCurrency(t.amount)}
            <div class="transaction-item__date">${new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
          </div>
        </div>
      `;
    });

    this.listEl.innerHTML = html;
  }

  openModal(prefill = null) {
    document.getElementById('txn-id').value = '';
    document.getElementById('transaction-form').reset();
    document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-modal-title').textContent = 'Add Transaction';
    
    this.currentTags = [];
    this.renderTags();

    if (prefill) {
      if (prefill.amount) document.getElementById('txn-amount').value = prefill.amount;
      if (prefill.type) document.getElementById('txn-type').value = prefill.type;
      if (prefill.paymentMethod) document.getElementById('txn-payment').value = prefill.paymentMethod;
      if (prefill.description) document.getElementById('txn-description').value = prefill.description;
      if (prefill.category) {
        this.selectCategory(prefill.category);
      }
      document.getElementById('txn-bucket').value = '';
    }

    // Add delete button if missing but hide it
    let delBtn = document.getElementById('txn-delete-btn');
    if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.id = 'txn-delete-btn';
      delBtn.type = 'button';
      delBtn.className = 'btn btn--danger btn--full mt-2';
      delBtn.textContent = 'Delete Transaction';
      delBtn.onclick = () => this.deleteTransaction();
      document.getElementById('transaction-form').appendChild(delBtn);
    }
    delBtn.classList.add('hidden');

    window.openModal('transaction-modal');
  }

  async editTransaction(id) {
    const t = this.transactions.find(x => x._id === id);
    if (!t) return;

    this.openModal();
    document.getElementById('transaction-modal-title').textContent = 'Edit Transaction';
    document.getElementById('txn-id').value = t._id;
    document.getElementById('txn-date').value = new Date(t.date).toISOString().split('T')[0];
    document.getElementById('txn-amount').value = t.amount;
    document.getElementById('txn-type').value = t.type;
    document.getElementById('txn-payment').value = t.paymentMethod;
    document.getElementById('txn-description').value = t.description;
    this.selectCategory(t.category);
    
    document.getElementById('txn-bucket').value = t.bucket || '';
    
    this.currentTags = [...(t.tags || [])];
    this.renderTags();

    const delBtn = document.getElementById('txn-delete-btn');
    if (delBtn) delBtn.classList.remove('hidden');
  }

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('txn-submit-btn');
    btn.disabled = true;
    
    const id = document.getElementById('txn-id').value;
    const catHidden = document.getElementById('txn-category').value;
    const catInput = document.getElementById('txn-category-input').value;
    const bucket = document.getElementById('txn-bucket').value;
    
    const data = {
      date: document.getElementById('txn-date').value,
      amount: parseFloat(document.getElementById('txn-amount').value),
      type: document.getElementById('txn-type').value,
      category: catHidden || catInput, // fallback if they just typed it
      bucket: bucket || null,
      paymentMethod: document.getElementById('txn-payment').value,
      description: document.getElementById('txn-description').value,
      tags: this.currentTags
    };

    try {
      if (id) {
        await window.api.updateTransaction(id, data);
        window.app.showToast('Transaction updated', 'success');
      } else {
        await window.api.createTransaction(data);
        window.app.showToast('Transaction added', 'success');
      }
      window.closeModal('transaction-modal');
      
      // Reload current list
      this.loadData(true);
      
      // Background reload dashboard if needed
      window.dashboardModule.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  async deleteTransaction() {
    const id = document.getElementById('txn-id').value;
    if (!id) return;
    
    // Store data for optimistic undo
    const t = this.transactions.find(x => x._id === id);
    if (!t) return;

    if (!confirm('Delete this transaction?')) return;

    try {
      // Optimistic remove from UI
      this.transactions = this.transactions.filter(x => x._id !== id);
      this.renderList();
      window.closeModal('transaction-modal');

      await window.api.deleteTransaction(id);
      
      // Show undo toast
      window.app.showToast('Transaction deleted', 'info', {
        label: 'Undo',
        onClick: async () => {
          // Recreate it (minus id)
          const data = { ...t };
          delete data._id;
          delete data.createdAt;
          delete data.updatedAt;
          await window.api.createTransaction(data);
          this.loadData(true);
        }
      });
      
    } catch (err) {
      window.app.showToast(err.message, 'danger');
      this.loadData(true); // reload to fix UI state
    }
  }

  updateBucketOptions(buckets) {
    const select = document.getElementById('txn-bucket');
    if (!select) return;
    
    select.innerHTML = '<option value="">None</option>' + buckets.map(b => 
      `<option value="${b._id}">${b.icon} ${b.name}</option>`
    ).join('');
  }
}

window.transactionsModule = new TransactionsModule();
