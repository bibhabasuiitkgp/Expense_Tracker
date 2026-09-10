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

    const typeSelect = document.getElementById('inv-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => this.handleTypeChange());
    }

    const contribForm = document.getElementById('contribution-form');
    if (contribForm) {
      contribForm.addEventListener('submit', (e) => this.handleContributionSubmit(e));
    }
  }

  handleTypeChange() {
    const type = document.getElementById('inv-type').value;
    const unitsGroup = document.getElementById('inv-units-group');
    const navRow = document.getElementById('inv-nav-row');
    const targetGroup = document.getElementById('inv-target-group');
    const amountLabel = document.getElementById('inv-amount-label');

    const unitsInput = document.getElementById('inv-units');
    const navPurchaseInput = document.getElementById('inv-nav-purchase');

    if (type === 'emergency_fund') {
      if (unitsGroup) unitsGroup.classList.add('hidden');
      if (navRow) navRow.classList.add('hidden');
      if (targetGroup) targetGroup.classList.remove('hidden');
      if (amountLabel) amountLabel.textContent = 'Initial Deposit (₹)';

      if (unitsInput) unitsInput.removeAttribute('required');
      if (navPurchaseInput) navPurchaseInput.removeAttribute('required');
    } else {
      if (unitsGroup) unitsGroup.classList.remove('hidden');
      if (navRow) navRow.classList.remove('hidden');
      if (targetGroup) targetGroup.classList.add('hidden');
      if (amountLabel) amountLabel.textContent = 'Amount Invested (₹)';

      if (unitsInput) unitsInput.setAttribute('required', 'true');
      if (navPurchaseInput) navPurchaseInput.setAttribute('required', 'true');
    }
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

    // Emergency Fund Card
    const efCard = document.getElementById('emergency-fund-card');
    if (data.emergencyFund && data.emergencyFund.total > 0) {
      if (efCard) efCard.classList.remove('hidden');
      document.getElementById('ef-total-val').textContent = window.app.formatCurrency(data.emergencyFund.total);
      
      const targetVal = document.getElementById('ef-target-val');
      const progressText = document.getElementById('ef-progress-text');
      const progressBar = document.getElementById('ef-progress-bar');
      
      if (data.emergencyFund.target > 0) {
        targetVal.textContent = `Target: ${window.app.formatCurrency(data.emergencyFund.target)}`;
        progressText.textContent = `${data.emergencyFund.progress}% of target saved`;
        progressBar.style.width = `${Math.min(data.emergencyFund.progress, 100)}%`;
      } else {
        targetVal.textContent = 'No target set';
        progressText.textContent = 'Emergency fund active';
        progressBar.style.width = '100%';
      }
    } else if (efCard) {
      efCard.classList.add('hidden');
    }
  }

  renderTable(funds) {
    const tbody = document.getElementById('investment-tbody');
    if (!tbody) return;

    if (!funds || funds.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: var(--sp-6);">No investments added yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = funds.map(f => {
      const isEmergency = f.type === 'emergency_fund';
      const isGain = f.gainLoss >= 0;
      const badgeClass = isEmergency ? 'badge--success' : (f.type === 'SIP' ? 'badge--info' : 'badge--warning');
      const typeLabel = isEmergency ? 'Emergency Fund' : f.type;

      return `
        <tr>
          <td style="font-weight: var(--fw-medium);" onclick="window.investmentsModule.editInvestment('${f._id}')" style="cursor: pointer;">
            ${f.fundName}
          </td>
          <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
          <td>${window.app.formatCurrency(f.amountInvested)}</td>
          <td>${window.app.formatCurrency(f.currentValue)}</td>
          <td class="${isGain ? 'gain-positive' : 'gain-negative'}">
            ${isEmergency ? '—' : `${isGain ? '+' : ''}${window.app.formatCurrency(f.gainLoss)}<br><span style="font-size: 0.85em;">(${isGain ? '+' : ''}${f.gainLossPercent}%)</span>`}
          </td>
          <td style="color: ${f.xirr >= 0 ? 'var(--success)' : 'var(--danger)'};">${isEmergency ? '—' : `${f.xirr}%`}</td>
          <td class="text-right">
            <div style="display: flex; gap: var(--sp-2); justify-content: flex-end;">
              ${(f.type === 'emergency_fund' || f.type === 'SIP') ? `
                <button class="btn btn--secondary btn--xs" onclick="event.stopPropagation(); window.investmentsModule.openContributionModal('${f._id}')" title="Add Monthly Contribution">
                  + Deposit
                </button>
              ` : ''}
              <button class="btn btn--ghost btn--xs" onclick="event.stopPropagation(); window.investmentsModule.editInvestment('${f._id}')">
                ✏️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openModal() {
    document.getElementById('inv-id').value = '';
    document.getElementById('investment-form').reset();
    document.getElementById('inv-purchase-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('investment-modal-title').textContent = 'Add Investment';
    
    // Set default type to SIP and trigger field state reset
    document.getElementById('inv-type').value = 'SIP';
    this.handleTypeChange();

    // Delete button
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
    this.handleTypeChange();

    document.getElementById('inv-folio').value = inv.folioNumber || '';
    document.getElementById('inv-amount').value = inv.amountInvested;

    if (inv.type === 'emergency_fund') {
      const targetInput = document.getElementById('inv-target');
      if (targetInput) targetInput.value = inv.targetAmount || '';
    } else {
      document.getElementById('inv-units').value = inv.units || '';
      document.getElementById('inv-nav-purchase').value = inv.NAVatPurchase || '';
      if (inv.currentNAV) document.getElementById('inv-nav-current').value = inv.currentNAV;
    }

    document.getElementById('inv-purchase-date').value = new Date(inv.purchaseDate).toISOString().split('T')[0];
    
    const delBtn = document.getElementById('inv-delete-btn');
    if (delBtn) delBtn.classList.remove('hidden');
  }

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('inv-submit-btn');
    btn.disabled = true;
    
    const id = document.getElementById('inv-id').value;
    const type = document.getElementById('inv-type').value;
    const currentNavStr = document.getElementById('inv-nav-current').value;
    const targetStr = document.getElementById('inv-target').value;
    
    const data = {
      fundName: document.getElementById('inv-fund-name').value,
      type,
      folioNumber: document.getElementById('inv-folio').value,
      amountInvested: parseFloat(document.getElementById('inv-amount').value),
      purchaseDate: document.getElementById('inv-purchase-date').value
    };

    if (type === 'emergency_fund') {
      data.targetAmount = targetStr ? parseFloat(targetStr) : null;
      data.units = null;
      data.NAVatPurchase = null;
    } else {
      data.units = parseFloat(document.getElementById('inv-units').value);
      data.NAVatPurchase = parseFloat(document.getElementById('inv-nav-purchase').value);
      data.currentNAV = currentNavStr ? parseFloat(currentNavStr) : null;
    }

    try {
      if (id) {
        await window.api.updateInvestment(id, data);
        window.app.showToast('Investment updated', 'success');
      } else {
        await window.api.createInvestment(data);
        window.app.showToast('Investment added (Expense transaction auto-created)', 'success');
      }
      window.closeModal('investment-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    } finally {
      btn.disabled = false;
    }
  }

  openContributionModal(id) {
    const inv = this.investments.find(x => x._id === id);
    if (!inv) return;

    document.getElementById('contrib-inv-id').value = inv._id;
    document.getElementById('contribution-fund-name').textContent = `${inv.type === 'emergency_fund' ? 'Emergency Fund' : 'SIP'}: ${inv.fundName}`;
    document.getElementById('contrib-amount').value = '';
    document.getElementById('contrib-note').value = '';
    document.getElementById('contrib-date').value = new Date().toISOString().split('T')[0];

    window.openModal('contribution-modal');
  }

  async handleContributionSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('contrib-submit-btn');
    btn.disabled = true;

    const invId = document.getElementById('contrib-inv-id').value;
    const amount = parseFloat(document.getElementById('contrib-amount').value);
    const date = document.getElementById('contrib-date').value;
    const note = document.getElementById('contrib-note').value;

    try {
      await window.api.addContribution(invId, { amount, date, note });
      window.app.showToast('Contribution recorded (Expense transaction auto-created)', 'success');
      window.closeModal('contribution-modal');
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
    
    if (!confirm('Delete this investment? Linked expense transactions will also be removed.')) return;

    try {
      await window.api.deleteInvestment(id);
      window.app.showToast('Investment & linked transactions deleted', 'success');
      window.closeModal('investment-modal');
      this.loadData();
    } catch (err) {
      window.app.showToast(err.message, 'danger');
    }
  }
}

window.investmentsModule = new InvestmentsModule();
