/**
 * Investments Module
 */
class InvestmentsModule {
  constructor() {
    this.investments = [];
    this.setupEventListeners();
  }

  init() {
    if (document.getElementById('page-investments').classList.contains('active')) {
      this.loadData();
    }
  }

  setupEventListeners() {
    const addBtn = document.getElementById('add-investment-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openModal());

    const form = document.getElementById('investment-form');
    if (form) form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async loadData() {
    try {
      const [listRes, summaryRes] = await Promise.all([
        window.api.getInvestments(),
        window.api.getInvestmentSummary()
      ]);
      
      this.investments = listRes.investments;
      this.renderSummary(summaryRes);
      this.renderTable(summaryRes.funds);
      
    } catch (e) {
      window.app.showToast('Failed to load investments', 'danger');
    }
  }

  renderSummary(data) {
    // Net Worth Card
    document.getElementById('networth-value').textContent = window.app.formatCurrency(data.netWorth);
    document.getElementById('networth-liquid').textContent = window.app.formatCurrency(data.liquidCash);
    document.getElementById('networth-invested').textContent = window.app.formatCurrency(data.totalCurrentValue);

    // Portfolio Summary
    const xirrEl = document.getElementById('portfolio-xirr');
    xirrEl.textContent = `${data.portfolioXirr}%`;
    xirrEl.style.color = data.portfolioXirr >= 0 ? 'var(--success)' : 'var(--danger)';

    const gainEl = document.getElementById('portfolio-gain');
    const isGain = data.totalGainLoss >= 0;
    gainEl.textContent = `${isGain ? '+' : '-'}${window.app.formatCurrency(Math.abs(data.totalGainLoss))}`;
    gainEl.className = `stat-card__value ${isGain ? 'gain-positive' : 'gain-negative'}`;
  }

  renderTable(funds) {
    const tbody = document.getElementById('investment-tbody');
    if (!tbody) return;

    if (!funds || funds.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: var(--sp-6);">No investments added yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = funds.map(f => {
      const isGain = f.gainLoss >= 0;
      return `
        <tr style="cursor: pointer;" onclick="window.investmentsModule.editInvestment('${f._id}')">
          <td style="font-weight: var(--fw-medium);">${f.fundName}</td>
          <td><span class="badge badge--info">${f.type}</span></td>
          <td>${window.app.formatCurrency(f.amountInvested)}</td>
          <td>${window.app.formatCurrency(f.currentValue)}</td>
          <td class="${isGain ? 'gain-positive' : 'gain-negative'}">
            ${isGain ? '+' : ''}${window.app.formatCurrency(f.gainLoss)}<br>
            <span style="font-size: 0.85em;">(${isGain ? '+' : ''}${f.gainLossPercent}%)</span>
          </td>
          <td style="color: ${f.xirr >= 0 ? 'var(--success)' : 'var(--danger)'};">${f.xirr}%</td>
          <td class="text-right text-tertiary">›</td>
        </tr>
      `;
    }).join('');
  }

  openModal() {
    document.getElementById('inv-id').value = '';
    document.getElementById('investment-form').reset();
    document.getElementById('inv-purchase-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    
    // Add delete button if missing
    let delBtn = document.getElementById('inv-delete-btn');
    if (!delBtn) {
      delBtn = document.createElement('button');
      delBtn.id = 'inv-delete-btn';
      delBtn.type = 'button';
      delBtn.className = 'btn btn--danger btn--full mt-2';
      delBtn.textContent = 'Delete Investment';
      delBtn.onclick = () => this.deleteInvestment();
      document.getElementById('investment-form').appendChild(delBtn);
    }
    delBtn.classList.add('hidden');

    window.openModal('investment-modal');
  }

  editInvestment(id) {
    const inv = this.investments.find(x => x._id === id);
    if (!inv) return;

    this.openModal();
    document.getElementById('investment-modal-title').textContent = 'Edit Investment';
    document.getElementById('inv-id').value = inv._id;
    document.getElementById('inv-fund-name').value = inv.fundName;
    document.getElementById('inv-type').value = inv.type;
    document.getElementById('inv-folio').value = inv.folioNumber || '';
    document.getElementById('inv-amount').value = inv.amountInvested;
    document.getElementById('inv-units').value = inv.units;
    document.getElementById('inv-nav-purchase').value = inv.NAVatPurchase;
    if (inv.currentNAV) document.getElementById('inv-nav-current').value = inv.currentNAV;
    document.getElementById('inv-purchase-date').value = new Date(inv.purchaseDate).toISOString().split('T')[0];
    
    const delBtn = document.getElementById('inv-delete-btn');
    if (delBtn) delBtn.classList.remove('hidden');
  }

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('inv-submit-btn');
    btn.disabled = true;
    
    const id = document.getElementById('inv-id').value;
    const currentNavStr = document.getElementById('inv-nav-current').value;
    
    const data = {
      fundName: document.getElementById('inv-fund-name').value,
      type: document.getElementById('inv-type').value,
      folioNumber: document.getElementById('inv-folio').value,
      amountInvested: parseFloat(document.getElementById('inv-amount').value),
      units: parseFloat(document.getElementById('inv-units').value),
      NAVatPurchase: parseFloat(document.getElementById('inv-nav-purchase').value),
      purchaseDate: document.getElementById('inv-purchase-date').value,
      currentNAV: currentNavStr ? parseFloat(currentNavStr) : null
    };

    try {
      if (id) {
        await window.api.updateInvestment(id, data);
        window.app.showToast('Investment updated', 'success');
      } else {
        await window.api.createInvestment(data);
        window.app.showToast('Investment added', 'success');
      }
      window.closeModal('investment-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  async deleteInvestment() {
    const id = document.getElementById('inv-id').value;
    if (!id) return;
    
    if (!confirm('Delete this investment? This affects your portfolio XIRR.')) return;

    try {
      await window.api.deleteInvestment(id);
      window.app.showToast('Investment deleted', 'success');
      window.closeModal('investment-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }
}

window.investmentsModule = new InvestmentsModule();
