/**
 * Dashboard Module
 */
class DashboardModule {
  constructor() {
    this.currentMonth = '';
    
    // Elements
    this.monthSelect = document.getElementById('dashboard-month');
    
    // Setup month select options (last 12 months)
    this.setupMonthSelect();
    
    // Listeners
    if (this.monthSelect) {
      this.monthSelect.addEventListener('change', (e) => {
        this.currentMonth = e.target.value;
        this.loadData();
      });
    }
  }

  init() {
    const now = new Date();
    this.currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (this.monthSelect) {
      this.monthSelect.value = this.currentMonth;
    }
    
    // Only load if section is active
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      this.loadData();
    }
  }

  setupMonthSelect() {
    if (!this.monthSelect) return;
    
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      this.monthSelect.appendChild(option);
    }
  }

  async loadData() {
    try {
      const [summary, trend] = await Promise.all([
        window.api.getDashboardSummary(this.currentMonth),
        window.api.getDashboardTrend(12)
      ]);
      
      this.renderSummary(summary);
      this.renderTrend(trend.trend);
    } catch (e) {
      window.app.showToast('Failed to load dashboard data', 'danger');
    }
  }

  renderSummary(data) {
    // 1. Stat Cards
    document.getElementById('stat-total-spend').textContent = window.app.formatCurrency(data.totalSpend);
    document.getElementById('stat-income').textContent = window.app.formatCurrency(data.totalIncome);
    document.getElementById('stat-savings').textContent = window.app.formatCurrency(data.netSavings);
    document.getElementById('stat-count').textContent = data.transactionCount;
    
    const invOutflowEl = document.getElementById('stat-investment-outflow');
    if (invOutflowEl) {
      invOutflowEl.textContent = window.app.formatCurrency(data.investmentOutflow || 0);
    }
    
    const changeEl = document.getElementById('stat-change');
    if (data.percentChange !== 0) {
      const isUp = data.percentChange > 0;
      changeEl.textContent = `${isUp ? '↑' : '↓'} ${Math.abs(data.percentChange)}%`;
      changeEl.className = `stat-card__change stat-card__change--${isUp ? 'up' : 'down'}`;
    } else {
      changeEl.textContent = 'No change';
      changeEl.className = 'stat-card__change';
    }

    // 2. Streak
    const streakEl = document.getElementById('streak-count');
    if (streakEl) {
      streakEl.textContent = data.streak;
      document.getElementById('streak-badge').style.display = data.streak > 0 ? 'inline-flex' : 'none';
    }

    // 3. Forecast
    if (data.forecast) {
      document.getElementById('forecast-projected').textContent = window.app.formatCurrency(data.forecast.projected);
      document.getElementById('forecast-daily').textContent = window.app.formatCurrency(data.forecast.dailyRate);
      document.getElementById('forecast-days-left').textContent = data.forecast.daysLeft;
      
      // Warn if projecting over budget (naive check)
      const fc = document.getElementById('forecast-card');
      if (data.forecast.projected > (data.forecast.movingAverage * 1.1)) {
        fc.style.borderColor = 'var(--warning)';
      } else {
        fc.style.borderColor = 'var(--card-border)';
      }
    }

    // 4. Anomalies
    const anomalyWidget = document.getElementById('anomaly-widget');
    const anomalyList = document.getElementById('anomaly-list');
    
    if (data.anomalies && data.anomalies.length > 0) {
      anomalyWidget.classList.remove('hidden');
      anomalyList.innerHTML = data.anomalies.map(t => `
        <div class="transaction-item" onclick="window.transactionsModule.editTransaction('${t._id}')">
          <div class="transaction-item__icon" style="background: ${window.app.getCategoryColor(t.category)}20; color: ${window.app.getCategoryColor(t.category)}">
            ${window.app.getCategoryIcon(t.category)}
          </div>
          <div class="transaction-item__info">
            <div class="transaction-item__category">${t.category}</div>
            <div class="transaction-item__desc">${t.description}</div>
          </div>
          <div class="transaction-item__amount transaction-item__amount--expense">
            ${window.app.formatCurrency(t.amount)}
            <div class="transaction-item__date">${window.app.formatDate(t.date)}</div>
          </div>
        </div>
      `).join('');
    } else {
      anomalyWidget.classList.add('hidden');
    }

    // 5. Category Donut Chart
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      const labels = data.categoryBreakdown.map(c => c._id);
      const values = data.categoryBreakdown.map(c => c.total);
      
      window.chartManager.renderDonutChart('chart-donut', values, labels, (category) => {
        // Navigate to transactions filtered by this category
        window.app.navigateTo('transactions');
        // A bit hacky but works for now
        setTimeout(() => {
          document.getElementById('filter-bar').scrollLeft = 0;
          document.getElementById('search-input').value = category;
          window.transactionsModule.loadData(true);
        }, 100);
      });
    } else {
      // Empty state
      const ctx = document.getElementById('chart-donut').getContext('2d');
      ctx.clearRect(0,0,300,300);
      ctx.font = '14px Inter';
      ctx.fillStyle = 'var(--text-tertiary)';
      ctx.textAlign = 'center';
      ctx.fillText('No expenses this month', 150, 150);
    }

    // 6. Heatmap
    this.renderHeatmap(data.dailySpend, this.currentMonth);
  }

  renderTrend(trendData) {
    if (!trendData || trendData.length === 0) return;
    
    const labels = trendData.map(t => {
      const [y, m] = t.month.split('-');
      const d = new Date(y, m - 1);
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
    
    const expenses = trendData.map(t => t.expense || 0);
    const income = trendData.map(t => t.income || 0);
    
    window.chartManager.renderTrendChart('chart-trend', labels, expenses, income);
  }

  renderHeatmap(dailySpend, month) {
    const grid = document.getElementById('heatmap-grid');
    const labels = document.getElementById('heatmap-labels');
    if (!grid || !labels) return;
    
    grid.innerHTML = '';
    labels.innerHTML = '<div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>';
    
    const [year, m] = month.split('-');
    const date = new Date(year, m - 1, 1);
    const daysInMonth = new Date(year, m, 0).getDate();
    const firstDayIndex = date.getDay(); // 0 = Sun
    
    // Map spend data
    const spendMap = {};
    let maxSpend = 0;
    
    dailySpend.forEach(d => {
      const day = parseInt(d._id.split('-')[2]);
      spendMap[day] = d.total;
      if (d.total > maxSpend) maxSpend = d.total;
    });
    
    // Empty cells for offset
    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.style.background = 'transparent';
      grid.appendChild(cell);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap__cell';
      
      const spend = spendMap[i] || 0;
      if (spend > 0) {
        // Calculate intensity level (1-5)
        let level = 1;
        if (maxSpend > 0) {
          const ratio = spend / maxSpend;
          if (ratio > 0.8) level = 5;
          else if (ratio > 0.6) level = 4;
          else if (ratio > 0.4) level = 3;
          else if (ratio > 0.2) level = 2;
        }
        cell.classList.add(`heatmap__cell--l${level}`);
        
        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = `${window.app.formatCurrency(spend)} on ${i} ${date.toLocaleString('default', {month:'short'})}`;
        
        cell.addEventListener('mouseenter', (e) => {
          tooltip.style.left = `${e.pageX}px`;
          tooltip.style.top = `${e.pageY - 30}px`;
          document.body.appendChild(tooltip);
        });
        
        cell.addEventListener('mouseleave', () => {
          if (tooltip.parentNode) tooltip.remove();
        });
        
        // Click to view transactions for that day
        cell.addEventListener('click', () => {
          window.app.navigateTo('transactions');
          const dayStr = String(i).padStart(2, '0');
          const dateStr = `${month}-${dayStr}`;
          document.getElementById('filter-from').value = dateStr;
          document.getElementById('filter-to').value = dateStr;
          window.transactionsModule.loadData(true);
        });
      }
      
      grid.appendChild(cell);
    }
  }
}

window.dashboardModule = new DashboardModule();
