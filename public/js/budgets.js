/**
 * Budgets Module
 */
class BudgetsModule {
  constructor() {
    this.currentMonth = '';
    
    // Elements
    this.monthSelect = document.getElementById('budget-month');
    
    this.setupMonthSelect();
    this.setupEventListeners();
  }

  init() {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (this.monthSelect) {
      this.monthSelect.value = this.currentMonth;
    }
    
    if (document.getElementById('page-budgets').classList.contains('active')) {
      this.loadData();
    }
    
    // Populate category select in modal
    const catSelect = document.getElementById('budget-category');
    if (catSelect && window.app.categories) {
      catSelect.innerHTML = window.app.categories
        .filter(c => c.name !== 'Salary') // exclude income
        .map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`)
        .join('');
    }
  }

  setupMonthSelect() {
    if (!this.monthSelect) return;
    
    const now = new Date();
    for (let i = -1; i < 6; i++) { // Next month + past 5 months
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = i === 0 ? 'This Month' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      this.monthSelect.appendChild(option);
    }
  }

  setupEventListeners() {
    if (this.monthSelect) {
      this.monthSelect.addEventListener('change', (e) => {
        this.currentMonth = e.target.value;
        this.loadData();
      });
    }

    const addBtn = document.getElementById('add-budget-btn');
    if (addBtn) addBtn.addEventListener('click', () => window.openModal('budget-modal'));

    const form = document.getElementById('budget-form');
    if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async loadData() {
    try {
      const res = await window.api.getBudgets(this.currentMonth);
      this.renderBudgets(res.budgets);
    } catch (e) {
      window.app.showToast('Failed to load budgets', 'danger');
    }
  }

  renderBudgets(budgets) {
    const listEl = document.getElementById('budget-list');
    if (!listEl) return;

    if (!budgets || budgets.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🎯</div>
          <div class="empty-state__text">No budgets set for this month.</div>
          <button class="btn btn--secondary btn--sm" onclick="window.openModal('budget-modal')">Create a Budget</button>
        </div>
      `;
      return;
    }

    // Sort by percentage spent
    budgets.sort((a, b) => b.percentage - a.percentage);

    listEl.innerHTML = budgets.map(b => {
      const isExceeded = b.status === 'exceeded';
      const isWarning = b.status === 'warning';
      
      return `
        <div class="card budget-item" onclick="window.budgetsModule.editBudget('${b.category}', ${b.limit})">
          <div class="budget-item__header">
            <div class="budget-item__category">
              <span>${window.app.getCategoryIcon(b.category)}</span>
              ${b.category}
            </div>
            <div class="budget-item__amounts">
              <strong style="color: ${isExceeded ? 'var(--danger)' : 'var(--text-primary)'}">
                ${window.app.formatCurrency(b.spent)}
              </strong>
              / ${window.app.formatCurrency(b.limit)}
            </div>
          </div>
          
          <div class="budget-bar">
            <div class="budget-bar__fill budget-bar__fill--${b.status}" style="width: ${Math.min(b.percentage, 100)}%;"></div>
          </div>
          
          <div class="budget-item__meta">
            <span>${b.percentage}% spent</span>
            <span>
              ${isExceeded 
                ? `<span style="color: var(--danger)">Over by ${window.app.formatCurrency(Math.abs(b.remaining))}</span>`
                : `${window.app.formatCurrency(b.remaining)} left`
              }
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  editBudget(category, currentLimit) {
    document.getElementById('budget-category').value = category;
    document.getElementById('budget-limit').value = currentLimit;
    window.openModal('budget-modal');
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const data = {
      category: document.getElementById('budget-category').value,
      month: this.currentMonth,
      limit: parseFloat(document.getElementById('budget-limit').value)
    };

    try {
      await window.api.setBudget(data);
      window.app.showToast('Budget saved', 'success');
      window.closeModal('budget-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }
}

window.budgetsModule = new BudgetsModule();
