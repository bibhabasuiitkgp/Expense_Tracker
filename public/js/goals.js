/**
 * Goals Module
 */
class GoalsModule {
  constructor() {
    this.goals = [];
    this.setupEventListeners();
  }

  init() {
    if (document.getElementById('page-goals').classList.contains('active')) {
      this.loadData();
    }
    
    // Populate linked category select
    const linkSelect = document.getElementById('goal-linked-category');
    if (linkSelect && window.app.categories) {
      // Find 'savings' or 'investment' type categories if any, else show all
      let options = `<option value="">None</option>`;
      window.app.categories.forEach(c => {
        options += `<option value="${c.name}">${c.icon} ${c.name}</option>`;
      });
      linkSelect.innerHTML = options;
    }
  }

  setupEventListeners() {
    const addBtn = document.getElementById('add-goal-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    const form = document.getElementById('goal-form');
    if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async loadData() {
    try {
      const res = await window.api.getGoals();
      this.goals = res.goals;
      this.renderGoals();
    } catch (e) {
      window.app.showToast('Failed to load goals', 'danger');
    }
  }

  renderGoals() {
    const listEl = document.getElementById('goals-list');
    if (!listEl) return;

    if (!this.goals || this.goals.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🏆</div>
          <div class="empty-state__text">No financial goals set.</div>
          <button class="btn btn--secondary btn--sm" onclick="window.openModal('goal-modal')">Set a Goal</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.goals.map(g => {
      const isComplete = g.percentage >= 100;
      
      return `
        <div class="card goal-card" onclick="window.goalsModule.editGoal('${g._id}')">
          <div class="goal-card__header">
            <div class="goal-card__name">
              ${isComplete ? '🎉 ' : ''}${g.name}
              ${g.linkedCategory ? `<span class="badge badge--info ml-2">Linked: ${g.linkedCategory}</span>` : ''}
            </div>
            <div class="goal-card__target">
              <strong style="color: var(--text-primary)">${window.app.formatCurrency(g.currentProgress)}</strong> 
              / ${window.app.formatCurrency(g.targetAmount)}
            </div>
          </div>
          
          <div class="goal-card__bar">
            <div class="goal-card__fill" style="width: ${Math.min(g.percentage, 100)}%; ${isComplete ? 'background: var(--success);' : ''}"></div>
          </div>
          
          <div class="goal-card__meta">
            <span>${g.percentage}% reached</span>
            <span>${isComplete ? 'Goal achieved!' : `${g.daysLeft} days left`}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  openModal() {
    document.getElementById('goal-id').value = '';
    document.getElementById('goal-form').reset();
    
    // Default target date to 1 year from now
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    document.getElementById('goal-date').value = d.toISOString().split('T')[0];
    
    window.openModal('goal-modal');
  }

  editGoal(id) {
    const g = this.goals.find(x => x._id === id);
    if (!g) return;

    document.getElementById('goal-id').value = g._id;
    document.getElementById('goal-name').value = g.name;
    document.getElementById('goal-target').value = g.targetAmount;
    document.getElementById('goal-date').value = new Date(g.targetDate).toISOString().split('T')[0];
    if (g.linkedCategory) document.getElementById('goal-linked-category').value = g.linkedCategory;
    
    window.openModal('goal-modal');
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('goal-id').value;
    const linkedCat = document.getElementById('goal-linked-category').value;
    
    const data = {
      name: document.getElementById('goal-name').value,
      targetAmount: parseFloat(document.getElementById('goal-target').value),
      targetDate: document.getElementById('goal-date').value,
      linkedCategory: linkedCat || null
    };

    try {
      if (id) {
        // Assume API has a PUT for goals in app.js or api.js
        // Just calling create for demo if put doesn't exist, though backend has put
        // To be safe using standard fetch logic here if api.js lacks updateGoal
        await window.api.request(`/goals/${id}`, { method: 'PUT', body: data });
        window.app.showToast('Goal updated', 'success');
      } else {
        await window.api.createGoal(data);
        window.app.showToast('Goal created', 'success');
      }
      window.closeModal('goal-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }
}

window.goalsModule = new GoalsModule();
