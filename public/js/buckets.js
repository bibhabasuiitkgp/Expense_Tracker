/**
 * Buckets Module
 */
class BucketsModule {
  constructor() {
    this.buckets = [];
    this.setupEventListeners();
  }

  init() {
    if (document.getElementById('page-buckets') && document.getElementById('page-buckets').classList.contains('active')) {
      this.loadData();
    }
  }

  setupEventListeners() {
    const addBtn = document.getElementById('add-bucket-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    const form = document.getElementById('bucket-system-form');
    if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async loadData() {
    try {
      const res = await window.api.getBuckets();
      this.buckets = res.buckets;
      this.renderBuckets();
      
      // Notify transactions module to update its bucket dropdown
      if (window.transactionsModule && window.transactionsModule.updateBucketOptions) {
        window.transactionsModule.updateBucketOptions(this.buckets);
      }
    } catch (e) {
      window.app.showToast('Failed to load buckets', 'danger');
    }
  }

  renderBuckets() {
    const listEl = document.getElementById('buckets-list');
    if (!listEl) return;

    if (!this.buckets || this.buckets.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🪣</div>
          <div class="empty-state__text">No buckets created yet.</div>
          <button class="btn btn--secondary btn--sm" onclick="window.openModal('bucket-modal')">Create a Bucket</button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.buckets.map(b => {
      const isOver = b.left < 0;
      
      return `
        <div class="card goal-card" onclick="window.bucketsModule.editBucket('${b._id}')">
          <div class="goal-card__header">
            <div class="goal-card__name">
              ${b.icon} ${b.name}
            </div>
            <div class="goal-card__target">
              <strong style="color: ${isOver ? 'var(--danger)' : 'var(--text-primary)'}">
                ${window.app.formatCurrency(b.spent)}
              </strong> 
              / ${window.app.formatCurrency(b.targetAmount)}
            </div>
          </div>
          
          <div class="goal-card__bar">
            <div class="goal-card__fill" style="width: ${Math.min(b.percentage, 100)}%; background: ${isOver ? 'var(--danger)' : 'var(--accent-primary)'};"></div>
          </div>
          
          <div class="goal-card__meta">
            <span>${b.percentage}% spent</span>
            <span>
              ${isOver 
                ? `<span style="color: var(--danger)">Overspent by ${window.app.formatCurrency(Math.abs(b.left))}</span>` 
                : `<span style="color: var(--success)">${window.app.formatCurrency(b.left)} left</span>`
              }
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  openModal() {
    document.getElementById('bucket-id').value = '';
    document.getElementById('bucket-system-form').reset();
    document.getElementById('bucket-modal-title').textContent = 'Create Bucket';
    
    const delBtn = document.getElementById('bucket-delete-btn');
    if (delBtn) delBtn.classList.add('hidden');

    window.openModal('bucket-modal');
  }

  editBucket(id) {
    const b = this.buckets.find(x => x._id === id);
    if (!b) return;

    document.getElementById('bucket-modal-title').textContent = 'Edit Bucket';
    document.getElementById('bucket-id').value = b._id;
    document.getElementById('bucket-name').value = b.name;
    document.getElementById('bucket-target').value = b.targetAmount;
    document.getElementById('bucket-icon').value = b.icon || '🪣';
    
    let delBtn = document.getElementById('bucket-delete-btn');
    if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.id = 'bucket-delete-btn';
      delBtn.type = 'button';
      delBtn.className = 'btn btn--danger btn--full mt-2';
      delBtn.textContent = 'Delete Bucket';
      delBtn.onclick = () => this.deleteBucket();
      document.getElementById('bucket-system-form').appendChild(delBtn);
    }
    delBtn.classList.remove('hidden');

    window.openModal('bucket-modal');
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('bucket-id').value;
    
    const data = {
      name: document.getElementById('bucket-name').value,
      targetAmount: parseFloat(document.getElementById('bucket-target').value),
      icon: document.getElementById('bucket-icon').value || '🪣'
    };

    try {
      if (id) {
        await window.api.updateBucket(id, data);
        window.app.showToast('Bucket updated', 'success');
      } else {
        await window.api.createBucket(data);
        window.app.showToast('Bucket created', 'success');
      }
      window.closeModal('bucket-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }

  async deleteBucket() {
    const id = document.getElementById('bucket-id').value;
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this bucket? Associated transactions will keep their records but lose the bucket tag.')) return;

    try {
      await window.api.deleteBucket(id);
      window.app.showToast('Bucket deleted', 'success');
      window.closeModal('bucket-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }
}

window.bucketsModule = new BucketsModule();
