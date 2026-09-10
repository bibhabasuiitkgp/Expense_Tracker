/**
 * Chart wrappers using Chart.js
 */

Chart.defaults.color = 'var(--text-secondary)';
Chart.defaults.font.family = 'var(--font-primary)';

class ChartManager {
  constructor() {
    this.charts = {};
    
    // Color palette for categories
    this.colors = [
      '#6366f1', // Indigo
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#f97316', // Orange
      '#14b8a6', // Teal
      '#3b82f6'  // Blue
    ];
  }

  // Get color for a category (consistent mapping)
  getColorForCategory(category, index) {
    // If we have access to global categories, use their defined color
    if (window.app && window.app.categories) {
      const cat = window.app.categories.find(c => c.name === category);
      if (cat && cat.color) return cat.color;
    }
    // Fallback to palette
    return this.colors[index % this.colors.length];
  }

  renderDonutChart(canvasId, data, labels, onSliceClick = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const bgColors = labels.map((label, i) => this.getColorForCategory(label, i));

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 20,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  label += '₹' + context.parsed.toLocaleString('en-IN');
                }
                return label;
              }
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0 && onSliceClick) {
            const index = elements[0].index;
            onSliceClick(labels[index]);
          }
        }
      }
    });
  }

  renderTrendChart(canvasId, labels, expenseData, incomeData = null) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    const datasets = [{
      label: 'Expenses',
      data: expenseData,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      tension: 0.4,
      fill: true
    }];

    if (incomeData) {
      datasets.push({
        label: 'Income',
        data: incomeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      });
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: incomeData !== null,
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += '₹' + context.parsed.y.toLocaleString('en-IN');
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            grid: { color: gridColor },
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                if (value >= 1000) return '₹' + (value / 1000).toFixed(1) + 'k';
                return '₹' + value;
              }
            }
          }
        }
      }
    });
  }

  updateTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e8eaf0' : '#1a1d2e';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    Chart.defaults.color = textColor;

    Object.values(this.charts).forEach(chart => {
      if (chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = textColor;
      }
      if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.grid.color = gridColor;
      }
      chart.update();
    });
  }
}

window.chartManager = new ChartManager();
