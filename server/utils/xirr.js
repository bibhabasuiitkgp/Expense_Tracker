/**
 * XIRR (Extended Internal Rate of Return) calculator
 * Uses Newton-Raphson method to find the rate that makes NPV = 0.
 *
 * @param {Array<{amount: number, date: Date}>} cashflows
 *   - Negative amounts = investments (outflows)
 *   - Positive amounts = current value / redemptions (inflows)
 * @returns {number} XIRR as a decimal (e.g., 0.12 = 12%)
 */
function xirr(cashflows) {
  if (!cashflows || cashflows.length < 2) {
    return 0;
  }

  // Sort cashflows by date
  const sorted = [...cashflows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = new Date(sorted[0].date);

  // Calculate day differences from the first date
  const dayDiffs = sorted.map(cf => {
    return (new Date(cf.date) - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
  });

  // NPV function
  function npv(rate) {
    return sorted.reduce((sum, cf, i) => {
      return sum + cf.amount / Math.pow(1 + rate, dayDiffs[i]);
    }, 0);
  }

  // NPV derivative
  function npvDerivative(rate) {
    return sorted.reduce((sum, cf, i) => {
      if (dayDiffs[i] === 0) return sum;
      return sum - dayDiffs[i] * cf.amount / Math.pow(1 + rate, dayDiffs[i] + 1);
    }, 0);
  }

  // Newton-Raphson iteration
  let rate = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    const f = npv(rate);
    const fPrime = npvDerivative(rate);

    if (Math.abs(fPrime) < 1e-10) {
      break;
    }

    const newRate = rate - f / fPrime;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;

    // Guard against divergence
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate;
}

module.exports = { xirr };
