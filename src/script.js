(() => {
  const $ = id => document.getElementById(id),
    n = id => Number($(id)
      .value),
    money = x => x.toLocaleString('en-US', { style: 'currency',
      currency: 'USD', maximumFractionDigits: 2 }),
    pct = x => (100 * x)
    .toFixed(1) + '%';
  let market = 'futures',
    last = null;
  const marketIds = ['binary', 'futures', 'forex', 'options', 'stocks',
    'crypto'
  ];
  const ids = ['capital', 'sizing', 'risk', 'win', 'payout', 'minimum',
    'contract', 'exit', 'stop', 'target', 'trail', 'bias', 'fees', 'slip',
    'margin', 'duration', 'trades', 'runs', 'floor', 'seed', 'instrument',
    'unitValue', 'unitPrice', 'otherStop', 'otherTarget', 'increment',
    'direction', 'otherCost', 'leverage', 'binaryPair'
  ];

  function config() { const other = !['binary', 'futures'].includes(market),
      premium = market === 'options',
      spot = market === 'crypto'; const tick = other ? n('unitValue') :
  ({ MNQ: .5, NQ: 5, MES: 1.25, ES: 12.5, MYM: .5, YM: 5, MGC: 1, GC: 10,
      MCL: 1, CL: 10 })[$('contract')
      .value]; return { other, increment: other ? n('increment') : 1, market,
      capital: n('capital'), sizing: $('sizing')
        .value, risk: n('risk'), p: n('win') / 100, payout: n('payout') / 100,
      min: n('minimum'), tick, exit: other ? 'fixed' : $('exit')
        .value, stop: other ? n('otherStop') : n('stop'), target: other ? n(
        'otherTarget') : n('target'), trail: n('trail'), bias: n('bias') /
        100, fees: other ? n('otherCost') : n('fees'), slip: other ? 0 : n(
        'slip'), margin: other ? n('unitPrice') / (premium || spot ? 1 : n(
        'leverage')) : n('margin'), duration: n('duration'), trades: n(
        'trades'), runs: n('runs'), floor: n('floor'), seed: n('seed') } }

  function update() { const c = config(),
      f = market !== 'binary',
      path = market === 'futures' && c.exit !== 'fixed';
    $('binaryFields')
      .hidden = f;
    $('futureFields')
      .hidden = market !== 'futures';
    $('otherFields')
      .hidden = !c.other;
    marketUI();
    $('winLabel')
      .hidden = path;
    $('meter')
      .hidden = path;
    $('biasLabel')
      .hidden = !path;
    $('trailLabel')
      .hidden = !path || c.exit === 'trail';
    $('targetLabel')
      .firstChild.textContent = path && c.exit !== 'trail' ?
      'Profit activation (ticks)' : 'Take profit (ticks)';
    $('sizing')
      .options[2].disabled = market !== 'futures'; if (market !== 'futures' &&
      c.sizing === 'contracts') $('sizing')
      .value = 'percent';
    $('riskLabel')
      .firstChild.textContent = $('sizing')
      .value === 'percent' ? 'Risk per trade (%)' : $('sizing')
      .value === 'fixed' ? 'Risk per trade ($)' : 'Contracts per trade';
    $('winOut')
      .textContent = n('win') + '%';
    $('meter')
      .firstElementChild.style.width = n('win') + '%';
    $('meter')
      .querySelectorAll('b')
      .forEach((b, i) => b.classList.toggle('won', i < Math.round(n('win') /
        5)));
    $('winsLabel')
      .textContent = n('win') + '% wins';
    $('lossesLabel')
      .textContent = (100 - n('win'))
      .toFixed(1) + '% losses';
    $('payoff')
      .hidden = false; let stake = size(c, c.capital, 1);
    $('winMoney')
      .textContent = money(stake * (f ? c.target * c.tick - c.fees - c.slip *
        c.tick : c.payout));
    $('lossMoney')
      .textContent = money(-stake * (f ? c.stop * c.tick + c.fees + c.slip * c
        .tick : 1)); for (const id of marketIds) $(id)
      .setAttribute('aria-pressed', String(id === market)); const cost = c
      .fees + c.slip * c.tick,
      loss = f ? c.stop * c.tick + cost : 1,
      gain = f ? c.target * c.tick - cost : c.payout,
      ev = c.p * gain - (1 - c.p) * loss;
    $('preview')
      .textContent = path ?
      'Trailing exits use a synthetic tick-by-tick market. Win rate is measured, not assumed.' :
      `Average ${ev>=0?'gain':'loss'}: ${money(Math.abs(ev))} per ${f?(c.other?'position unit traded':'contract traded'):'$1 risked'} · Break-even win rate: ${(100*loss/(gain+loss)).toFixed(3)+'%'}`;
    $('riskInfo')
      .hidden = !f; const q = size(c, c.capital, 1),
      required = c.sizing === 'percent' ? Math.max(c.margin, loss * 100 / c
        .risk) * c.increment : Math.max(c.margin, loss) * c.increment;
    $('riskInfo')
      .textContent = f ?
      `Starting position: ${q} ${c.other?'unit(s)':'contract(s)'} · Modeled loss: ${money(q*loss)} · Minimum balance for minimum position at this risk setting: ${money(required)}. ${c.sizing==='percent'?'Trading stops if minimum position exceeds the risk budget.':''}` :
      ''; const be = 100 * loss / (gain + loss),
      valid = Number.isFinite(be) && gain + loss > 0 && Number.isFinite(
      ev); const fmt = v => Number.isFinite(v) ? money(v) : '—'; const
      entries = [
        ['Assumed win rate', path ? 'Measured in test' : n('win')
          .toFixed(1) + '%', ''
        ],
        ['Break-even win rate', path || !valid ? '—' : be.toFixed(3) + '%',
          ''],
        ['Net expectancy', path || !valid ? '—' : fmt(ev), path || !valid ?
          '' : ev > 0 ? 'good' : ev < 0 ? 'bad' : ''
        ],
        [f ? (c.other ? 'Modeled loss / unit' : 'Modeled loss / contract') :
          'Starting stake', fmt(f ? loss : stake), ''
        ]
      ];
    $('liveStats')
      .replaceChildren(...entries.map(([label, value, cls]) => { let el =
          document.createElement('div');
        el.className = 'stat'; let a = document.createElement('small'),
          b = document.createElement('strong');
        a.textContent = label;
        b.textContent = value;
        b.className = cls;
        el.append(a, b); return el }));
    $('edgeVisual')
      .hidden = path || !valid; let boundary = Math.max(0, Math.min(100, be));
    $('edgeZones')
      .style.background =
      `linear-gradient(to right,#f43f5e 0%,#f43f5e ${boundary}%,#22c55e ${boundary}%,#22c55e 100%)`;
    $('edgeMarker')
      .style.left = n('win') + '%';
    $('liveExplanation')
      .textContent = path ?
      'Trailing exits use synthetic price paths. Run the test to estimate outcomes.' :
      !valid ? 'Enter valid strategy settings.' :
      `Expected net ${ev>=0?'gain':'loss'}: ${fmt(Math.abs(ev))} per ${f?(c.other?'position unit traded':'contract traded'):'$1 risked'}. ${ev>0?'Positive expectancy under your assumptions is not proof of a real trading edge.':ev<0?'Money management cannot turn negative expectancy into positive expectancy.':'Break-even under your assumptions.'}`; try { localStorage
        .setItem('TradingGameMultiV2', JSON.stringify({ market, values: Object
            .fromEntries(ids.map(id => [id, $(id)
              .value
            ])) })) } catch (e) {} }
  const defaults = { futures: { capital: 5000, contract: 'MNQ', stop: 80,
      target: 80, fees: 1.5, slip: 2, margin: 100 }, binary: { capital: 100,
      payout: 92, minimum: 1, binaryPair: 'EUR/USD' },
    forex: { capital: 500, instrument: 'EUR/USD', unitValue: .1,
      unitPrice: 1100, otherStop: 20, otherTarget: 20, otherCost: .15,
      increment: 1, leverage: 30 }, options: { capital: 5000,
      instrument: 'SPY call', unitValue: 100, unitPrice: 200, otherStop: .4,
      otherTarget: .4, otherCost: 1.3, increment: 1, leverage: 1 },
    stocks: { capital: 1000, instrument: 'SPY', unitValue: 1,
      unitPrice: 500, otherStop: 5, otherTarget: 5, otherCost: .1,
      increment: 1, leverage: 1 }, crypto: { capital: 100,
      instrument: 'BTC/USD', unitValue: 1, unitPrice: 100000,
      otherStop: 2000, otherTarget: 2000, otherCost: 200, increment: .00001,
      leverage: 1 } };

  function marketUI() { const m = market; if (!defaults[m] || m ===
      'binary' || m === 'futures') return; const labels = { forex: [
        'Pip value / micro lot ($)', 'Notional / micro lot ($)',
        'Stop loss (pips)', 'Take profit (pips)',
        'One unit = 1 micro lot (1,000 base currency units). Enter USD pip value and notional; include spread, commission and any swap in round-trip cost.'
      ], options: ['Contract multiplier', 'Premium paid / contract ($)',
        'Stop loss (premium points)', 'Take profit (premium points)',
        'Long calls or puts only. Enter premium paid per contract and assumed premium changes; no option pricing, Greeks or expiration model. A stop is not guaranteed; full premium can be lost.'
      ], stocks: ['Dollar value per price point / share', 'Share price ($)',
        'Stop loss ($/share)', 'Take profit ($/share)',
        'Cash long shares; short mode uses simplified collateral. Include borrow costs if applicable. No gaps or dividends modeled.'
      ], crypto: ['Dollar value per price point / coin', 'Coin price ($)',
        'Stop loss ($/coin)', 'Take profit ($/coin)',
        'Spot long only. Enter coin price and round-trip fees per coin. No perpetual funding or liquidation model.'
      ] }; let l = labels[m];
    ['unitLabel', 'priceLabel', 'otherStopLabel', 'otherTargetLabel'].forEach(
      (id, i) => $(id)
      .firstChild.textContent = l[i]);
    $('marketNote')
      .textContent = l[4];
    $('directionLabel')
      .hidden = m === 'options' || m === 'crypto';
    $('leverage')
      .disabled = m === 'options' || m === 'crypto'; }

  function restore() { let v = { capital: 5000, sizing: 'percent', risk: 1,
        exit: 'fixed', trail: 10, bias: 50, duration: 100, trades: 1000,
        runs: 5000, floor: 0, seed: 42, direction: 'Long', ...defaults[
        market] }; for (let [id, val] of Object.entries(v)) $(id)
      .value = val; let c = config(),
      cost = c.fees + c.slip * c.tick,
      loss = market === 'binary' ? 1 : c.stop * c.tick + cost,
      gain = market === 'binary' ? c.payout : c.target * c.tick - cost;
    $('win')
      .value = Math.min(100, (Math.floor(1000 * loss / (loss + gain) + 1e-9) +
        1) / 10);
    clearResults();
    update() }

  function clearResults() { last = null;
    $('results')
      .hidden = true;
    $('emptyResults')
      .hidden = false;
    $('status')
      .textContent = '' }

  function choose(m, reset = true) { market = m; for (const id of marketIds)
      $(id)
      .classList.toggle('selected', id === m); if (reset) restore();
    else update() }

  function rng(seed) { let a = seed >>> 0; return () => { a = (a +
        0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>>
        14)) >>> 0) / 4294967296 } }

  function outcome(c, r) { if (c.market === 'binary') return r() < c.p ? c
      .payout : -1; if (c.exit === 'fixed') return r() < c.p ? c.target : -c
      .stop; let x = 0,
      peak = 0; for (let i = 0; i < c.duration; i++) { x += r() < c.bias ? 1 :
        -1;
      peak = Math.max(peak, x); let stop = (c.exit === 'trail' || c.exit ===
        'both') ? peak - c.stop : -c.stop; if ((c.exit === 'profit' || c
          .exit === 'both') && peak >= c.target) stop = Math.max(stop, peak -
        c.trail); if (x <= stop || (c.exit === 'trail' && x >= c.target))
        break } return x }

  function size(c, b, m) { let budget = c.sizing === 'percent' ? b * c.risk *
      m / 100 : c.risk * m; if (c.market === 'binary') { let stake = Math
        .floor(Math.min(b, budget) * 100) / 100; return stake >= c.min ?
        stake : 0 } let loss = c.stop * c.tick + c.fees + c.slip * c.tick; let
      step = c.increment; return Math.max(0, Math.floor(Math.min(b / Math.max(
        c.margin, loss), c.sizing === 'contracts' ? c.risk * m :
      budget / loss) / step + 1e-10) * step) }

  function quant(a, p) { return a[Math.floor((a.length - 1) *
    p)] } async function run() { const c = config(); if ((c.market ===
          'options' && c.stop * c.tick > n('unitPrice')) || ids.some(id => $(
            id)
          .type === 'number' && !$(id)
          .closest('[hidden]') && (!$(id)
            .checkValidity() || $(id)
            .value === '')) || c.floor >= c.capital || (c.sizing ===
          'percent' && c.risk > 100) || (c.sizing === 'contracts' && !Number
          .isInteger(c.risk))) { $('status')
          .textContent =
          'Check your numbers. Risk must be valid and the stopping balance below starting money.'; return } if (
        c.market === 'futures' && c.exit !== 'fixed' && c.trades * c.runs * c
        .duration > 150000000) { $('status')
          .textContent =
          'For trailing exits, choose fewer trades, futures or ticks held.'; return } if (
        c.trades * c.runs > 10000000) { $('status')
          .textContent =
          'Choose fewer trades or possible futures (maximum 10 million trades).'; return } $
        ('run')
        .disabled = true;
      $('restore')
        .disabled = true; for (const id of ids) $(id)
        .disabled = true;
      $('results')
        .hidden = true;
      $('emptyResults')
        .hidden = false; try { let r = rng(c.seed),
          steps = Math.min(100, c.trades),
          samples = Array.from({ length: 3 }, () => Array
        .from({ length: steps + 1 }, () => [])),
          finals = [],
          ruins = 0,
          profits = 0,
          dd = 0,
          wins = 0,
          count = 0,
          net = 0,
          grossWin = 0,
          grossLoss = 0,
          streakMax = 0; for (let j = 0; j < c.runs; j++) { let b = [c
              .capital, c.capital, c.capital
            ],
            dead = [false, false, false],
            peak = c.capital,
            drop = 0,
            streak = 0; for (let k = 0; k < 3; k++) samples[k][0].push(b[
          k]); let s = 1; for (let i = 1; i <= c.trades; i++) { let o =
              outcome(c, r); for (let k = 0; k < 3; k++) { if (dead[k])
                continue; let q = size(c, b[k], [.5, 1, 2][k]); if (b[k] <= c
                .floor || q <= 0) { dead[k] = true; continue } let pl = q * (c
                .market === 'binary' ? o : o * c.tick - c.fees - c.slip * c
                .tick);
              b[k] += pl; if (k === 1) { count++;
                net += pl; if (pl > 0) { wins++;
                  grossWin += pl;
                  streak = 0 } else if (pl < 0) { grossLoss -= pl;
                  streak++;
                  streakMax = Math.max(streakMax, streak) } else streak = 0;
                peak = Math.max(peak, b[k]);
                drop = Math.max(drop, (peak - b[k]) / peak) } if (b[k] <= c
                .floor || size(c, b[k], [.5, 1, 2][k]) <= 0) dead[k] =
              true } if (i === Math.ceil(s * c.trades / steps)) { for (let k =
                  0; k < 3; k++) samples[k][s].push(b[k]);
              s++ } } finals.push(b[1]);
          ruins += dead[1];
          profits += b[1] > c.capital;
          dd += drop; if (j % 25 === 0) { $('status')
              .textContent = `Testing ${j+1} of ${c.runs} possible futures…`;
            await new Promise(resolve => setTimeout(resolve, 0)) } } for (
          const group of samples)
          for (const a of group) a.sort((a, b) => a - b);
        finals.sort((a, b) => a - b);
        last = { c, samples, finals }; let avg = count ? net / count : 0;
        $('verdict')
          .textContent = !count ? 'Not enough money to trade' : avg > 0 ?
          'Your model made money on average' : avg < 0 ?
          'Your model lost money on average' : 'Your model broke even';
        $('verdict')
          .className = avg > 0 ? 'good' : avg < 0 ? 'bad' : '';
        $('insight')
          .textContent =
          'These are possible outcomes under your assumptions, not predictions. Smaller bets can reduce losses but cannot create positive expectancy.';
        $('stats')
          .innerHTML = [
            ['Typical ending money', money(quant(finals, .5))],
            ['Chance of finishing ahead', pct(profits / c.runs)],
            ['Chance of being unable to continue', pct(ruins / c.runs)],
            ['Average biggest drop', pct(dd / c.runs)],
            ['Unlucky outcome (5th percentile)', money(quant(finals, .05))],
            ['Lucky outcome (95th percentile)', money(quant(finals, .95))]
          ].map(([a, b]) =>
            `<div class="stat"><small>${a}</small><strong>${b}</strong></div>`
            )
          .join('');
        $('advanced')
          .textContent =
          `Executed trades: ${count.toLocaleString()} · Observed net win rate: ${count?pct(wins/count):'N/A'} · Average net P/L per executed trade: ${money(avg)} · Profit factor: ${grossLoss?(grossWin/grossLoss).toFixed(2):grossWin?'∞':'N/A'} · Longest losing streak: ${streakMax} · Seed: ${c.seed}. Independent outcomes; trailing mode uses a bounded one-tick random walk with no historical calibration. Binary ties omitted. Margin and costs are simplified; no intratrade margin calls, gaps, option pricing or liquidation modeled. All fixed exits assume independent outcomes and fills at modeled prices.`;
        $('results')
          .hidden = false;
        $('emptyResults')
          .hidden = true;
        draw();
        $('status')
          .textContent = 'Test complete.' } catch (e) { $('status')
          .textContent = 'Test failed: ' + e.message } finally { $('run')
          .disabled = false;
        $('restore')
          .disabled = false; for (const id of ids) $(id)
          .disabled = false;
        marketUI() } }

  function chart(id, series, base, band) { let cv = $(id),
      w = cv.clientWidth,
      h = cv.clientHeight,
      d = devicePixelRatio || 1;
    cv.width = w * d;
    cv.height = h * d; let g = cv.getContext('2d');
    g.scale(d, d); let vals = series.flatMap(s => s.v)
      .concat(band ? band.flat() : [], base === null ? [] : [base]),
      lo = Math.min(0, ...vals),
      hi = Math.max(...vals, 1),
      X = i => 65 + i * (w - 80) / (series[0].v.length - 1 || 1),
      Y = v => h - 28 - (v - lo) / (hi - lo) * (h - 48);
    g.font = '11px system-ui';
    g.fillStyle = '#94a3b8'; for (let i = 0; i < 5; i++) { let v = lo + (hi -
          lo) * i / 4,
        y = Y(v);
      g.strokeStyle = '#283347';
      g.beginPath();
      g.moveTo(65, y);
      g.lineTo(w - 15, y);
      g.stroke();
      g.fillText(Math.abs(v) >= 10000 ? '$' + (v / 1000)
        .toFixed(0) + 'k' : money(v), 3, y + 4) } if (band) { g.beginPath();
      band[0].forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(
        v))); for (let i = band[1].length - 1; i >= 0; i--) g.lineTo(X(i), Y(
        band[1][i]));
      g.closePath();
      g.fillStyle = '#60a5fa22';
      g.fill() } if (base !== null) { g.setLineDash([5, 5]);
      g.strokeStyle = '#64748b';
      g.beginPath();
      g.moveTo(65, Y(base));
      g.lineTo(w - 15, Y(base));
      g.stroke();
      g.setLineDash([]) } for (const s of series) { g.beginPath();
      s.v.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v)));
      g.strokeStyle = s.color;
      g.lineWidth = 2;
      g.stroke() } g.fillStyle = '#94a3b8';
    g.fillText('Start', 65, h - 8);
    g.fillText('End', w - 40, h - 8) }

  function draw() { if (!last) return; let { c, samples, finals } = last, med
      = k => samples[k].map(a => quant(a, .5));
    chart('equity', [{ v: med(1), color: '#60a5fa' }], c.capital, [samples[1]
      .map(a => quant(a, .05)), samples[1].map(a => quant(a, .95))
    ]);
    chart('compare', [{ v: med(0), color: '#22c55e' }, { v: med(1),
      color: '#60a5fa' }, { v: med(2), color: '#f43f5e' }], c.capital); let
      cv = $('hist'),
      w = cv.clientWidth,
      h = cv.clientHeight,
      d = devicePixelRatio || 1;
    cv.width = w * d;
    cv.height = h * d; let g = cv.getContext('2d');
    g.scale(d, d); let lo = finals[0],
      hi = finals.at(-1),
      span = hi - lo || 1,
      bins = Array(20)
      .fill(0); for (let v of finals) bins[Math.min(19, Math.floor((v - lo) /
      span * 20))]++; let max = Math.max(...bins);
    bins.forEach((v, i) => { g.fillStyle = lo + (i + .5) * span / 20 >= c
        .capital ? '#22c55e' : '#f43f5e';
      g.fillRect(12 + i * (w - 24) / 20, h - 32 - v / max * (h - 52), (w -
        24) / 20 - 2, v / max * (h - 52)) });
    g.fillStyle = '#94a3b8';
    g.font = '12px system-ui';
    g.fillText(money(lo), 12, h - 10);
    g.textAlign = 'right';
    g.fillText(money(hi), w - 12, h - 10) }

  function init() { let loaded = false; try { let s = JSON.parse(localStorage
        .getItem('TradingGameMultiV2')); if (s) { loaded = true; for (const
            id of ids)
          if (s.values[id] != null) $(id)
            .value = s.values[id];
        market = marketIds.includes(s.market) ? s.market :
        'futures' } } catch (e) {} for (const id of ids) $(id)
      .addEventListener('input', () => { clearResults();
        update() }); for (const id of marketIds) $(id)
      .onclick = () => { if (!$('run')
          .disabled) choose(id) };
    $('restore')
      .onclick = () => { if (!$('run')
          .disabled) restore() };
    $('run')
      .onclick = run;
    window.addEventListener('resize', () => { if (!$('results')
        .hidden) draw() });
    choose(market, !loaded) }
  if (document.readyState === 'loading') document.addEventListener(
    'DOMContentLoaded', init);
  else init()
})();
// Tall sidebars stick at their bottom edge so every control remains reachable.
(() => { const panel = document.querySelector('.strategy-panel'); if (!panel)
    return; const update = () => panel.style.setProperty(
    '--strategy-sticky-top', Math.min(16, window.innerHeight - panel
      .getBoundingClientRect()
      .height - 16) + 'px');
  window.addEventListener('resize', update); if (typeof ResizeObserver !==
    'undefined') new ResizeObserver(update)
    .observe(panel);
  update(); })();
