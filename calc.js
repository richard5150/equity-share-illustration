// Settlement math for a home equity sharing agreement.
// Investor is repaid the initial payment plus `multiple` x investment% of any gain above the
// starting agreed value (appraised value less the risk adjustment), or minus 1x investment% of any loss.
// On a buyout, or a sale within the 3-year restriction period, the ending value is floored at the
// appraised value (investor never shares a loss there).
function settle({ ahv, payment, endValue, years, buyout = false, multiple = 4, riskAdj = 0.05 }) {
  const pct = payment / ahv;
  const sav = ahv * (1 - riskAdj);
  // ponytail: exit exactly at year 3 counts as inside the restriction period (conservative reading)
  const floored = (buyout || years <= 3) && endValue < ahv;
  const eav = floored ? ahv : endValue;
  const change = eav - sav;
  const sharePct = change > 0 ? pct * multiple : pct;
  const share = change * sharePct;
  const repay = payment + share;
  return { pct, sav, eav, floored, change, sharePct, share, repay, keep: endValue - repay, cost: (repay / payment) ** (1 / years) - 1 };
}

// Self-check against every worked example in the source docs: `node calc.js`
if (typeof module !== 'undefined' && require.main === module) {
  const assert = require('assert');
  const r = (o) => settle({ ahv: 1e6, payment: 1e5, ...o });
  const eq = (a, b) => assert.strictEqual(Math.round(a), b);
  // Scenario table (moderate/substantial increase, moderate decrease, no change)
  eq(r({ endValue: 1.2e6, years: 5 }).repay, 200000);
  eq(r({ endValue: 1.4e6, years: 5 }).repay, 280000);
  eq(r({ endValue: 8e5, years: 5 }).repay, 85000);
  eq(r({ endValue: 8e5, years: 5 }).keep, 715000);
  eq(r({ endValue: 1e6, years: 5 }).repay, 120000);
  // Case study Q1-Q4
  eq(r({ endValue: 1.45e6, years: 5 }).repay, 300000);
  eq(r({ endValue: 9e5, years: 5 }).repay, 95000);
  eq(r({ endValue: 9e5, years: 2 }).repay, 120000); // restriction period floor
  eq(r({ endValue: 1.2e6, years: 4, buyout: true }).repay, 200000);
  eq(r({ endValue: 9e5, years: 8, buyout: true }).repay, 120000); // buyout floor
  // Calculator slide: 2%/yr for 10 years, fees 3.9% + 2,500 + 2,599 + 800
  const c = r({ endValue: 1e6 * 1.02 ** 10, years: 10 });
  eq(c.share, 107598); eq(c.repay, 207598); eq(c.keep, 1011397);
  assert.strictEqual((c.cost * 100).toFixed(2), '7.58');
  const net = 1e5 * (1 - 0.039) - 2500 - 2599 - 800;
  eq(net, 90201);
  assert.strictEqual((((c.repay / net) ** 0.1 - 1) * 100).toFixed(2), '8.69');
  console.log('calc ok');
}
