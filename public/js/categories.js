/**
 * Categories Management Module
 */
class CategoriesModule {
  constructor() {
    this.editingId = null;
    this.setupEventListeners();
  }

  init() {
    // Initialized when categories load
  }

  setupEventListeners() {
    const manageBtn = document.getElementById('manage-categories-btn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => this.openModal());
    }

    const modalManageBtn = document.getElementById('txn-manage-cat-btn');
    if (modalManageBtn) {
      modalManageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    const form = document.getElementById('category-system-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const cancelBtn = document.getElementById('cat-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.resetForm());
    }
  }

  async openModal() {
    this.resetForm();
    await this.refreshCategories();
    this.renderCategoryList();
    window.openModal('category-modal');
  }

  async refreshCategories() {
    try {
      const res = await window.api.getCategories();
      window.app.categories = res.categories || [];
      if (window.transactionsModule) {
        window.transactionsModule.renderCategoryDropdown();
      }
    } catch (err) {
      window.app.showToast('Failed to fetch categories', 'danger');
    }
  }

  resetForm() {
    this.editingId = null;
    document.getElementById('cat-id').value = '';
    document.getElementById('category-system-form').reset();
    document.getElementById('cat-icon').value = '📦';
    document.getElementById('cat-color').value = '#6366f1';
    document.getElementById('cat-form-title').textContent = 'Create New Category';
    document.getElementById('cat-submit-btn').textContent = 'Save Category';
    document.getElementById('cat-cancel-btn').classList.add('hidden');
  }

  renderCategoryList() {
    const listContainer = document.getElementById('categories-manage-list');
    if (!listContainer) return;

    if (!window.app.categories || window.app.categories.length === 0) {
      listContainer.innerHTML = `<div class="text-center text-tertiary" style="padding: var(--sp-4);">No categories found.</div>`;
      return;
    }

    listContainer.innerHTML = window.app.categories.map(c => `
      <div class="category-item-card" style="display: flex; align-items: center; justify-content: space-between; padding: var(--sp-3); background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-md); margin-bottom: var(--sp-2);">
        <div style="display: flex; align-items: center; gap: var(--sp-3);">
          <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: ${c.color}20; color: ${c.color}; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            ${c.icon || '📌'}
          </div>
          <div>
            <div style="font-weight: var(--fw-semibold); color: var(--text-primary);">${c.name}</div>
            <div style="font-size: var(--fs-xs); color: var(--text-tertiary);">
              ${c.monthlyBudget ? `Budget: ${window.app.formatCurrency(c.monthlyBudget)}/mo` : 'No monthly budget set'}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: var(--sp-2);">
          <button type="button" class="btn btn--ghost btn--xs" onclick="window.categoriesModule.editCategory('${c._id}')" title="Edit Category">✏️ Edit</button>
          <button type="button" class="btn btn--danger btn--xs" onclick="window.categoriesModule.deleteCategory('${c._id}', '${c.name.replace(/'/g, "\\'")}')" title="Delete Category">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  editCategory(id) {
    const cat = window.app.categories.find(c => c._id === id);
    if (!cat) return;

    this.editingId = cat._id;
    document.getElementById('cat-id').value = cat._id;
    document.getElementById('cat-name').value = cat.name;
    document.getElementById('cat-icon').value = cat.icon || '📌';
    document.getElementById('cat-color').value = cat.color || '#6366f1';
    document.getElementById('cat-budget').value = cat.monthlyBudget || '';

    document.getElementById('cat-form-title').textContent = 'Edit Category';
    document.getElementById('cat-submit-btn').textContent = 'Update Category';
    document.getElementById('cat-cancel-btn').classList.remove('hidden');

    document.getElementById('category-system-form').scrollIntoView({ behavior: 'smooth' });
  }

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('cat-submit-btn');
    btn.disabled = true;

    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim() || '📌';
    const color = document.getElementById('cat-color').value || '#6366f1';
    const budgetStr = document.getElementById('cat-budget').value;

    const data = {
      name,
      icon,
      color,
      monthlyBudget: budgetStr ? parseFloat(budgetStr) : null
    };

    try {
      if (id) {
        await window.api.updateCategory(id, data);
        window.app.showToast('Category updated', 'success');
      } else {
        await window.api.createCategory(data);
        window.app.showToast('Category created', 'success');
      }

      this.resetForm();
      await this.refreshCategories();
      this.renderCategoryList();
    } catch (err) {
      window.app.showToast(err.message || 'Failed to save category', 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  async deleteCategory(id, name) {
    if (!confirm(`Deactivate category "${name}"? Existing transactions will keep their records.`)) return;

    try {
      await window.api.deleteCategory(id);
      window.app.showToast(`Category "${name}" removed`, 'info');
      await this.refreshCategories();
      this.renderCategoryList();
    } catch (err) {
      window.app.showToast(err.message || 'Failed to delete category', 'danger');
    }
  }
}

window.categoriesModule = new CategoriesModule();
