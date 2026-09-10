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
        this.filterCategoryDropdown(catInput.value);
      });
      
      catInput.addEventListener('input', (e) => {
        document.getElementById('txn-category').value = e.target.value;
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
      <div class="dropdown__item" data-val="${c.name}" data-icon="${c.icon}" onclick="window.transactionsModule.selectCategory('${c.name.replace(/'/g, "\\'")}')">
        <span class="dropdown__item-icon">${c.icon}</span>
        <span>${c.name}</span>
        <div class="dropdown__item-color" style="background: ${c.color}; margin-left: auto;"></div>
      </div>
    `).join('');
  }

  filterCategoryDropdown(query) {
    const dropdown = document.getElementById('category-dropdown');
    if (!dropdown) return;

    const items = dropdown.querySelectorAll('.dropdown__item:not(.dropdown__item--create)');
    query = (query || '').trim();
    const queryLower = query.toLowerCase();
    
    let exactMatch = false;
    items.forEach(item => {
      const val = item.getAttribute('data-val') || '';
      const text = val.toLowerCase();
      if (text === queryLower) exactMatch = true;

      if (!query || text.includes(queryLower)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });

    // Remove existing custom create item if present
    const existingCreate = dropdown.querySelector('.dropdown__item--create');
    if (existingCreate) existingCreate.remove();

    // If query typed and not exact match, add "+ Add category '[query]'" item
    if (query && !exactMatch) {
      const createEl = document.createElement('div');
      createEl.className = 'dropdown__item dropdown__item--create';
      createEl.style.cssText = 'color: var(--accent-primary); font-weight: var(--fw-medium); cursor: pointer; display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--card-border); padding: 8px 12px;';
      createEl.innerHTML = `<span>➕ Create category "${query}"</span>`;
      createEl.onclick = () => {
        this.selectCategory(query);
      };
      dropdown.appendChild(createEl);
    }
  }

  selectCategory(name) {
    const input = document.getElementById('txn-category-input');
    const hidden = document.getElementById('txn-category');
    const dropdown = document.getElementById('category-dropdown');
    
    if (input) input.value = name;
    if (hidden) hidden.value = name;
    if (dropdown) dropdown.classList.remove('open');

    // If category is not in list yet, temporarily add it locally
    const exists = window.app.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (!exists && name.trim()) {
      window.app.categories.push({
        name: name.trim(),
        icon: '📌',
        color: '#6366f1'
      });
      this.renderCategoryDropdown();
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

      // Render Bucket Badge if transaction is linked to a bucket
      let bucketBadge = '';
      if (t.bucket) {
        const b = typeof t.bucket === 'object' ? t.bucket : (window.bucketsModule ? window.bucketsModule.buckets.find(x => x._id === t.bucket) : null);
        if (b) {
          bucketBadge = `<span class="badge badge--info" style="font-size: var(--fs-xs); font-weight: normal; margin-left: 6px;">${b.icon || '🪣'} ${b.name}</span>`;
        }
      }

      html += `
        <div class="transaction-item" onclick="window.transactionsModule.editTransaction('${t._id}')" style="position: relative;">
          ${anomalyBadge}
          <div class="transaction-item__icon" style="background: ${color}20; color: ${color}">
            ${icon}
          </div>
          <div class="transaction-item__info">
            <div class="transaction-item__category">${t.category} ${bucketBadge}</div>
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
    document.getElementById('txn-category-input').value = '';
    document.getElementById('txn-category').value = '';
    document.getElementById('transaction-modal-title').textContent = 'Add Transaction';
    
    // Ensure bucket dropdown is populated with current buckets
    if (window.bucketsModule && window.bucketsModule.buckets) {
      this.updateBucketOptions(window.bucketsModule.buckets);
    }

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
    
    const bucketId = (t.bucket && typeof t.bucket === 'object') ? t.bucket._id : (t.bucket || '');
    document.getElementById('txn-bucket').value = bucketId;
    
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
    
    const categoryName = (catHidden || catInput || 'General').trim();

    const data = {
      date: document.getElementById('txn-date').value,
      amount: parseFloat(document.getElementById('txn-amount').value),
      type: document.getElementById('txn-type').value,
      category: categoryName,
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
      
      // Refresh categories from API to ensure newly added categories stay in sync
      const catRes = await window.api.getCategories();
      window.app.categories = catRes.categories || [];
      this.renderCategoryDropdown();

      // Reload current list & buckets data so spent progress updates instantly
      this.loadData(true);
      if (window.bucketsModule) window.bucketsModule.loadData();
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
    
    const t = this.transactions.find(x => x._id === id);
    if (!t) return;

    if (!confirm('Delete this transaction?')) return;

    try {
      this.transactions = this.transactions.filter(x => x._id !== id);
      this.renderList();
      window.closeModal('transaction-modal');

      await window.api.deleteTransaction(id);
      if (window.bucketsModule) window.bucketsModule.loadData();
      
      window.app.showToast('Transaction deleted', 'info', {
        label: 'Undo',
        onClick: async () => {
          const data = { ...t };
          delete data._id;
          delete data.createdAt;
          delete data.updatedAt;
          await window.api.createTransaction(data);
          this.loadData(true);
          if (window.bucketsModule) window.bucketsModule.loadData();
        }
      });
      
    } catch (err) {
      window.app.showToast(err.message, 'danger');
      this.loadData(true);
    }
  }

  updateBucketOptions(buckets) {
    const select = document.getElementById('txn-bucket');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">None</option>' + (buckets || []).map(b => 
      `<option value="${b._id}">${b.icon || '🪣'} ${b.name}</option>`
    ).join('');
    
    select.value = currentValue;
  }
}

window.transactionsModule = new TransactionsModule();
