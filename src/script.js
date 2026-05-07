/**
 * tradingApp() – Alpine.js data store
 * Contains all game logic, chart management, two distinct chart modes.
 * 
 * @property {number} balance         - current virtual balance (starts at 1000)
 * @property {number} wager           - amount placed on each trade
 * @property {number} winCount        - total winning trades
 * @property {number} loseCount       - total losing trades
 * @property {number} payoutPercent   - payout multiplier (e.g., 92 means win returns wager * 0.92 extra)
 * @property {number} edgePercent     - probability of winning a trade (50..90%)
 * @property {string} outcomeMessage  - last trade result description
 * @property {string} outcomeType     - 'win', 'loss', 'idle' (animation)
 * @property {Object} chart           - LightweightCharts instance
 * @property {Object} candleSeries    - candlestick series reference
 * @property {Array} candlesData      - array of {time, open, high, low, close}
 * @property {string} chartMode       - 'fullReset' or 'nextCandle'
 * @property {boolean} showTestModal  - modal visibility for 300‑trade test
 * @property {Object} testStats       - aggregated results of the 300‑trade simulation
 */
function tradingApp() {
  return {
    // ------ Reactive properties ------
    balance: 1000.00,
    wager: 10,
    winCount: 0,
    loseCount: 0,
    payoutPercent: 92,
    edgePercent: 50,
    outcomeMessage: '⚡ Choose chart mode (Full Refresh / Next Candle) and tap UP/DOWN',
    outcomeType: 'idle',
    chart: null,
    candleSeries: null,
    candlesData: [],
    chartMode: 'fullReset',    // 'fullReset' = brand new random chart after each trade
                               // 'nextCandle' = extend chart with a single new candle after trade
    showTestModal: false,
    testStats: {
      startingBalance: 0, finalBalance: 0, netPL: 0, wins: 0, losses: 0,
      observedWinRate: 0, totalWagered: 0, expectancy: 0, edgeUsed: 50,
      balanceHistory: [], winRateHistory: []
    },
    
    // *****************************
    // CHART GENERATION & HELPERS
    // *****************************
    
    /**
     * generateRandomCandles – creates a synthetic candlestick series
     * @param {number} num           – number of candles
     * @param {number} startPrice    – starting closing price (used as first open)
     * @returns {Array}              – array of candle objects compatible with lightweight-charts
     */
    generateRandomCandles(num = 55, startPrice = 100) {
      let candles = [], prevClose = startPrice;
      for (let i = 0; i < num; i++) {
        let changePct = (Math.random() - 0.5) * 0.045;  // random walk up/down
        let close = +(prevClose * (1 + changePct)).toFixed(4);
        close = Math.max(close, 0.5);
        let open = prevClose;
        let high = +(Math.max(open, close) * (1 + Math.random() * 0.015)).toFixed(4);
        let low = +(Math.min(open, close) * (1 - Math.random() * 0.012)).toFixed(4);
        candles.push({ time: i, open: +open.toFixed(4), high, low, close: +close.toFixed(4) });
        prevClose = close;
      }
      return candles;
    },
    
    /**
     * updateChartFromData – applies current candlesData to the candlestick series
     * and auto‑fits the chart view.
     */
    updateChartFromData() {
      if (!this.candleSeries) return;
      this.candleSeries.setData(this.candlesData);
      if (this.chart) this.chart.timeScale().fitContent();
    },
    
    /**
     * refreshFullChart – replaces entire dataset with fresh random candles.
     * Used in 'fullReset' mode after every trade.
     */
    refreshFullChart() {
      this.candlesData = this.generateRandomCandles(55, 95 + Math.random() * 20);
      this.updateChartFromData();
    },
    
    /**
     * generateNextCandle – creates a single new candle based on prediction outcome.
     * This ensures the visual direction matches the win/loss result:
     *   - Win + predicted UP   → bullish candle (close > open)
     *   - Win + predicted DOWN → bearish candle
     *   - Loss + predicted UP  → bearish candle (opposite direction)
     *   - Loss + predicted DOWN→ bullish candle
     * 
     * @param {string} prediction   – 'up' or 'down'
     * @param {boolean} isWin       – actual trade outcome (true = win)
     * @param {number} prevClose    – previous candle's closing price
     * @returns {Object}            – new candle object with incremented time index
     */
    generateNextCandle(prediction, isWin, prevClose) {
      const targetUp = (prediction === 'up' && isWin) || (prediction === 'down' && !isWin);
      let open = prevClose;
      let close;
      let absMovePercent = 0.002 + Math.random() * 0.038; // 0.2% to 3.8% price move
      if (targetUp) {
        close = open * (1 + absMovePercent);
      } else {
        close = open * (1 - absMovePercent);
      }
      close = Math.max(0.25, +close.toFixed(4));
      let high = +(Math.max(open, close) * (1 + Math.random() * 0.018)).toFixed(4);
      let low = +(Math.min(open, close) * (1 - Math.random() * 0.014)).toFixed(4);
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);
      const newTime = this.candlesData.length; // sequential index
      return { time: newTime, open: +open.toFixed(4), high, low, close: +close.toFixed(4) };
    },
    
    /**
     * setChartMode – switches between 'fullReset' and 'nextCandle'.
     * Does NOT reset the chart data immediately, but the next bet will use the new mode.
     * @param {string} mode 
     */
    setChartMode(mode) {
      this.chartMode = mode;
      this.outcomeMessage = `🎮 Mode switched to ${mode === 'fullReset' ? 'Full Refresh (new chart each trade)' : 'Next Candle (extend chart + predict)'}`;
      setTimeout(() => { if (this.chart) this.chart.timeScale().fitContent(); }, 10);
    },
    
    // *****************************
    // CORE TRADING ENGINE
    // *****************************
    
    /**
     * placeBet – executes a binary trade based on current mode.
     * Steps:
     *   1. Validate balance & wager.
     *   2. Determine win/loss using edgePercent (random probability).
     *   3. Update balance and counters (winCount/loseCount).
     *   4. Update chart according to active mode:
     *      - 'fullReset': completely new random chart series.
     *      - 'nextCandle': extend existing chart with ONE candle whose direction visually reflects outcome.
     *   5. Display outcome message.
     * @param {string} prediction 'up' or 'down'
     */
    placeBet(prediction) {
      if (!this.canBet()) {
        this.outcomeMessage = '❌ Insufficient balance or invalid wager';
        this.outcomeType = 'idle';
        return;
      }
      const wageredAmount = this.wager;
      // Random outcome weighted by edgePercent (win probability)
      const isWin = Math.random() < (this.edgePercent / 100);
      const multiplier = this.payoutPercent / 100;
      
      let winAmount = 0;
      if (isWin) {
        winAmount = wageredAmount * multiplier;
        this.balance += winAmount;
        this.winCount++;
      } else {
        this.balance -= wageredAmount;
        this.loseCount++;
      }
      
      // ---------- CHART MODE SPECIFIC HANDLING ----------
      if (this.chartMode === 'fullReset') {
        // Mode 1: discard old chart, generate fully new candles (fresh random walk)
        this.candlesData = this.generateRandomCandles(55, 95 + Math.random() * 20);
        this.updateChartFromData();
        if (isWin) {
          this.outcomeMessage = `🎉 WIN +$${winAmount.toFixed(2)} (${this.payoutPercent}% payout) → $${this.balance.toFixed(2)} [Full Refresh Mode]`;
        } else {
          this.outcomeMessage = `📉 LOSS -$${wageredAmount.toFixed(2)} → $${this.balance.toFixed(2)} [Full Refresh Mode]`;
        }
      } 
      else if (this.chartMode === 'nextCandle') {
        // Mode 2: dynamic growth – chart must exist, if empty generate base series
        if (!this.candlesData.length) {
          this.candlesData = this.generateRandomCandles(55, 100);
        }
        const prevCandle = this.candlesData[this.candlesData.length - 1];
        const prevClose = prevCandle.close;
        // Create a candle that visually matches the prediction outcome (bullish/bearish)
        const newCandle = this.generateNextCandle(prediction, isWin, prevClose);
        this.candlesData.push(newCandle);
        this.updateChartFromData();
        
        if (isWin) {
          this.outcomeMessage = `🎉 WIN +$${winAmount.toFixed(2)} (${this.payoutPercent}% payout) → $${this.balance.toFixed(2)} | Next candle ${prediction === 'up' ? '📈 BULLISH' : '📉 BEARISH'} (matched your ${prediction} call)`;
        } else {
          this.outcomeMessage = `📉 LOSS -$${wageredAmount.toFixed(2)} → $${this.balance.toFixed(2)} | Next candle went ${prediction === 'up' ? '🔻 BEARISH' : '📈 BULLISH'} (opposite to your ${prediction} call)`;
        }
      }
      
      this.outcomeType = isWin ? 'win' : 'loss';
      
      // Safe guard: wager cannot exceed remaining balance
      if (this.wager > this.balance && this.balance > 0) this.wager = Math.max(1, Math.floor(this.balance));
      if (this.balance <= 0) this.outcomeMessage += ' 💀 GAME OVER — press RESET';
    },
    
    /**
     * canBet – checks if balance > 0, wager within balance and chart loaded.
     */
    canBet() {
      return this.balance > 0 && this.wager > 0 && this.wager <= this.balance && this.chart !== null;
    },
    
    // ------ Wager helpers ------
    adjustWager(delta) { let newVal = this.wager + delta; if (newVal < 1) newVal = 1; if (newVal > this.balance) newVal = this.balance; this.wager = Math.floor(newVal); },
    syncWagerFromSlider(e) { let val = parseFloat(e.target.value); if (isNaN(val)) val = 1; val = Math.min(this.balance, Math.max(1, val)); this.wager = Math.floor(val); },
    validateWagerFromInput() { let val = parseFloat(this.wager); if (isNaN(val)) val = 1; val = Math.min(this.balance, Math.max(1, val)); this.wager = Math.floor(val); },
    setWager(amount) { this.wager = Math.min(this.balance, Math.max(1, amount)); },
    winRate() { const total = this.winCount + this.loseCount; return total === 0 ? '0%' : ((this.winCount / total) * 100).toFixed(1) + '%'; },
    
    /**
     * resetGame – restores all default values, generates fresh chart based on current mode.
     */
    resetGame() {
      this.balance = 1000;
      this.winCount = 0;
      this.loseCount = 0;
      this.wager = 10;
      this.payoutPercent = 92;
      this.edgePercent = 50;
      // Reset chart using current mode (both modes get fresh random chart on reset)
      this.candlesData = this.generateRandomCandles(55, 100);
      this.updateChartFromData();
      this.outcomeMessage = '🔄 Game fully reset. Edge = 50%. Mode: ' + (this.chartMode === 'fullReset' ? 'Full Refresh' : 'Next Candle');
      this.outcomeType = 'idle';
      if (this.wager > this.balance) this.wager = this.balance;
    },
    
    // *****************************
    // CHART INITIALIZATION & RESIZE
    // *****************************
    initChartAndRandomize() {
      setTimeout(() => {
        const container = document.getElementById('trading-chart');
        if (!container) return;
        this.chart = LightweightCharts.createChart(container, {
          layout: { background: { color: '#0a0e17' }, textColor: '#d1d5db', fontSize: 10 },
          grid: { vertLines: { color: '#1f2a3e' }, horzLines: { color: '#1f2a3e' } },
          crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
          rightPriceScale: { borderColor: '#2a3a55' },
          timeScale: { borderColor: '#2a3a55', timeVisible: true },
          width: container.clientWidth,
          height: container.clientHeight,
        });
        this.candleSeries = this.chart.addCandlestickSeries({
          upColor: '#26a69a', downColor: '#ef5350',
          borderDownColor: '#ef5350', borderUpColor: '#26a69a',
          wickDownColor: '#ef5350', wickUpColor: '#26a69a',
        });
        this.candlesData = this.generateRandomCandles(55, 100);
        this.candleSeries.setData(this.candlesData);
        this.chart.timeScale().fitContent();
        window.addEventListener('resize', () => this.resizeChart());
        new ResizeObserver(() => this.resizeChart()).observe(container);
        this.outcomeMessage = '🔥 Ready! Select chart mode and trade.';
      }, 30);
    },
    
    resizeChart() {
      if (this.chart) {
        const container = document.getElementById('trading-chart');
        if (container) {
          this.chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
          this.chart.timeScale().fitContent();
        }
      }
    },
    
    // *****************************
    // 300-TRADE SIMULATION & CANVAS DRAWING
    // *****************************
    /**
     * run300TradeTest – runs a Monte Carlo style simulation of 300 trades
     * using the current wager, payout, and edge. Does NOT alter actual game state,
     * but shows statistical outcomes, equity curve and win rate evolution.
     */
    run300TradeTest() {
      const startBalance = this.balance;
      let currentBalance = startBalance;
      let wins = 0, losses = 0;
      const balanceHistory = [startBalance];
      const winRateHistory = [0];
      const wagerAmount = this.wager;
      const payoutMult = this.payoutPercent / 100;
      const winProb = this.edgePercent / 100;
      const totalTrades = 300;
      for (let i = 1; i <= totalTrades; i++) {
        const isWinSim = Math.random() < winProb;
        if (isWinSim) { currentBalance += wagerAmount * payoutMult; wins++; } 
        else { currentBalance -= wagerAmount; losses++; }
        balanceHistory.push(currentBalance);
        winRateHistory.push((wins / i) * 100);
      }
      const finalBalance = currentBalance;
      const netPL = finalBalance - startBalance;
      const observedWinRate = (wins / totalTrades) * 100;
      const totalWagered = wagerAmount * totalTrades;
      const expectancy = netPL / totalTrades;
      this.testStats = {
        startingBalance: startBalance, finalBalance, netPL, wins, losses,
        observedWinRate: observedWinRate.toFixed(2), totalWagered, expectancy,
        edgeUsed: this.edgePercent, balanceHistory, winRateHistory
      };
      this.showTestModal = true;
      // Wait for DOM rendering then draw canvas charts
      setTimeout(() => { this.drawEquityCurve(); this.drawWinRateCurve(); }, 50);
    },
    
    drawEquityCurve() {
      const canvas = document.getElementById('equityCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w; canvas.height = h;
      const data = this.testStats.balanceHistory;
      if (!data?.length) return;
      const minVal = Math.min(...data), maxVal = Math.max(...data), range = maxVal - minVal || 1;
      const stepX = w / (data.length - 1);
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath(); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2;
      for (let i = 0; i < data.length; i++) {
        const x = i * stepX, y = h - ((data[i] - minVal) / range) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#a0aec0'; ctx.font = '8px monospace';
      ctx.fillText(`Start: $${this.testStats.startingBalance.toFixed(0)}`, 5, 15);
      ctx.fillStyle = '#38bdf8'; ctx.fillText(`End: $${this.testStats.finalBalance.toFixed(0)}`, w-65, h-5);
    },
    
    drawWinRateCurve() {
      const canvas = document.getElementById('winrateCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w; canvas.height = h;
      const data = this.testStats.winRateHistory;
      if (!data?.length) return;
      const stepX = w / (data.length - 1);
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
      for (let i = 0; i < data.length; i++) {
        const x = i * stepX, y = h - (data[i] / 100) * h;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
      const yEdge = h - (this.testStats.edgeUsed / 100) * h;
      ctx.moveTo(0, yEdge); ctx.lineTo(w, yEdge); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#a0aec0'; ctx.font = '8px monospace';
      ctx.fillText(`Edge ${this.testStats.edgeUsed}%`, w-55, yEdge-2);
      ctx.fillStyle = '#f59e0b'; ctx.fillText(`Final: ${this.testStats.observedWinRate}%`, w-65, 15);
    }
  };
}