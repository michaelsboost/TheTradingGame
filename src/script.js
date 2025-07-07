// === CORE MODULE ===
const Core = (() => {
  const state = {
    activeTrade: false,
    startBalance: 1000,
    balance: 1000,
    wager: 100,
    duration: { hour: 0, minute: 0, second: 5 },
    trades: [],
    openTrades: [],
    currentPrice: 100000,
    candles: (() => {
      const candles = [];
      let price = 100000;
      let trend = 1;
      for (let i = 0; i < 100; i++) {
        const volatility = 3;
        const open = price;
        const bodySize = Math.random() * volatility;
        const direction = Math.random() > 0.3 ? trend : -trend;
        const close = open + bodySize * direction;
        const high = Math.max(open, close) + Math.random();
        const low = Math.min(open, close) - Math.random();
        price = close;
        trend = direction;
        candles.push({ open, close, high, low, timestamp: Date.now() - (1000 * (100 - i)) });
      }
      return candles;
    })(),
  };

  function clearStorage() {
    // Clear local storage
    localStorage.removeItem('TheTradingGame');
  
    // Clear session storage specific to TheTradingGame (if you use a specific key)
    sessionStorage.removeItem('TheTradingGame');
  
    // Clear cookies specific to TheTradingGame
    document.cookie.split(";").forEach(function(c) {
      if (c.trim().startsWith('TheTradingGame')) {
        document.cookie = c.trim().split("=")[0] + 
                          '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      }
    });
  
    // Clear service worker caches specific to TheTradingGame
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          if (name === 'TheTradingGame-cache') {
            caches.delete(name);
          }
        });
      });
    }
  
    // Unregister service workers specific to TheTradingGame
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        registrations.forEach(function(registration) {
          if (registration.scope.includes('TheTradingGame')) {
            registration.unregister();
          }
        });
      });
    }
  }

  function simulateTick() {
    const { challenge } = state;
  
    // Adjust volatility based on speed
    let changeFactor = 2;
  
    // Simulate price change
    const change = (Math.random() * changeFactor - changeFactor / 2).toFixed(2);
    state.currentPrice = parseFloat((state.currentPrice + parseFloat(change)).toFixed(2));
  
    const last = state.candles[state.candles.length - 1];
    const now = Date.now();
  
    if (!last || now - last.timestamp > 1000) {
      state.candles.push({
        open: state.currentPrice,
        high: state.currentPrice,
        low: state.currentPrice,
        close: state.currentPrice,
        timestamp: now
      });
    } else {
      last.high = Math.max(last.high, state.currentPrice);
      last.low = Math.min(last.low, state.currentPrice);
      last.close = state.currentPrice;
    }
  
    if (state.candles.length > 200) state.candles.shift();
  
    Stats.update(state);
    Chart.draw(state);
  }

  setInterval(simulateTick, 100);

  return { state, clearStorage };
})();

// === CHART MODULE ===
const Chart = (() => {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  let scaleX = 1;
  let offsetX = 0;
  let isDragging = false;
  let lastX = 0;
  let selectedLine = null;
  let dragOffset = 0;

  // Zoom
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scaleX *= delta;
    scaleX = Math.max(0.5, Math.min(scaleX, 10));
  });

  // Drag
  function getXYFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  function handleDown(e) {
    const { x, y } = getXYFromEvent(e);
    selectedLine = null;
  
    const state = Core.state;
    const height = canvas.height;
    const padding = 10;
    const viewCount = Math.floor(60 / scaleX);
    const start = Math.max(0, state.candles.length - viewCount - Math.floor(offsetX));
    const candles = state.candles.slice(start, start + viewCount);
    const max = Math.max(...candles.map(c => c.high));
    const min = Math.min(...candles.map(c => c.low));
    const scaleY = (height - 2 * padding) / (max - min);
  
    state.openTrades.forEach(trade => {
      const test = (price, key) => {
        const py = height - (price - min) * scaleY - padding;
        if (Math.abs(py - y) < 6) {
          selectedLine = { trade, key };
          dragOffset = py - y;
        }
      };
      test(trade.stop, 'stop');
      test(trade.target, 'target');
    });
  
    if (!selectedLine) {
      isDragging = true;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
    }
  }
  
  function handleUpLeave() {
    isDragging = false;
    selectedLine = null;
  }
  
  function handleMove(e) {
    if (!canvas) return;
    const state = Core.state;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
  
    const height = canvas.height;
    const padding = 10;
    const viewCount = Math.floor(60 / scaleX);
    const start = Math.max(0, state.candles.length - viewCount - Math.floor(offsetX));
    const candles = state.candles.slice(start, start + viewCount);
    const max = Math.max(...candles.map(c => c.high));
    const min = Math.min(...candles.map(c => c.low));
    const scaleY = (height - 2 * padding) / (max - min);
  
    if (selectedLine) {
      const newPrice = ((height - (y + dragOffset) - padding) / scaleY) + min;
      selectedLine.trade[selectedLine.key] = parseFloat(newPrice.toFixed(2));
    } else if (isDragging) {
      const dx = clientX - lastX;
      offsetX += dx / 5;
      offsetX = Math.max(0, Math.min(offsetX, 200));
      lastX = clientX;
    }
  }
  
  canvas.addEventListener("mousedown", handleDown);
  canvas.addEventListener("touchstart", handleDown);
  
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("touchmove", handleMove, { passive: false });
  
  canvas.addEventListener("mouseup", handleUpLeave);
  canvas.addEventListener("touchend", handleUpLeave);
  
  canvas.addEventListener("mouseleave", handleUpLeave);

  function draw(state) {
    if (!canvas || !ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const labelMargin = 60;

    ctx.clearRect(0, 0, width, height);

    const viewCount = Math.floor(60 / scaleX);
    const start = Math.max(0, state.candles.length - viewCount - Math.floor(offsetX));
    const candles = state.candles.slice(start, start + viewCount);
    if (candles.length < 2) return;

    const max = Math.max(...candles.map(c => c.high));
    const min = Math.min(...candles.map(c => c.low));
    const scaleY = (height - 2 * padding) / (max - min);
    const candleWidth = (width - labelMargin) / candles.length;

    // === Grid + Right-Aligned Labels ===
    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const y = padding + ((height - 2 * padding) * i / steps);
      const price = max - ((max - min) * i / steps);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.fillText(price.toFixed(2), width - 4, y);
    }

    // === Candlesticks ===
    candles.forEach((c, i) => {
      const x = i * candleWidth;

      const openY = height - (c.open - min) * scaleY - padding;
      const closeY = height - (c.close - min) * scaleY - padding;
      const highY = height - (c.high - min) * scaleY - padding;
      const lowY = height - (c.low - min) * scaleY - padding;

      const isBullish = c.close >= c.open;
      // TradingView Colors
      ctx.strokeStyle = isBullish ? "#089a81" : "#f33645";
      ctx.fillStyle = isBullish ? "#089a81" : "#f33645";
      // Grayscale Colors
      // ctx.strokeStyle = isBullish ? "#fff" : "#000";
      // ctx.fillStyle = isBullish ? "#fff" : "#000";

      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      const bodyTop = isBullish ? closeY : openY;
      const bodyHeight = Math.max(1, Math.abs(openY - closeY));
      ctx.fillRect(x + 1, bodyTop, candleWidth - 2, bodyHeight);
    });

    // === Trade Lines - Entry @ Price ===
    state.openTrades.forEach(trade => {
      const drawLine = (price, color, label, trade) => {
        const y = height - (price - min) * scaleY - padding;
    
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    
        let dollar = '';
        ctx.fillStyle = color;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${label} ${price.toFixed(2)}${dollar}`, 8, y - 4);
    
        // Add countdown timer for this trade
        const remaining = trade.endTime
        ? Math.max(0, (trade.endTime - Date.now()) / 1000)
        : 0;
        const countdown = `${Math.floor(remaining)}s`;
        ctx.textAlign = "left";
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.fillText(countdown, 8, y + 12); // 8px from left, slightly below the entry label
      };
    
      drawLine(trade.entry, trade.type === 'buy' ? '#0f0' : '#f00', 'Entry', trade);
    });

    // === Live Price Box (Right Side) ===
    const liveY = height - (state.currentPrice - min) * scaleY - padding;
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(width - labelMargin, liveY - 10, 55, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0ff";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.currentPrice.toFixed(2), width - labelMargin + 27.5, liveY);
  }

  return { draw };
})();

// === TRADES MODULE ===
const Trades = (() => {
  function place(type, state) {
    // Check if user has enough balance to place this trade
    if (state.balance < state.wager) {
      showTradeMessage("❌ Insufficient balance to place trade.");
      return;
    }
    
    const entry = state.currentPrice;
    const durationMs = (state.duration.hour * 3600 + state.duration.minute * 60 + state.duration.second) * 1000;
  
    const now = Date.now();
    const trade = {
      type,
      entry,
      wager: state.wager,
      entryTime: now,
      duration: durationMs,
      endTime: now + durationMs
    };

    state.balance -= state.wager;
  
    state.openTrades.push(trade);
  
    setTimeout(() => resolveTrade(trade, state), durationMs);
    saveStateToLocalStorage();
  }

  function resolveTrade(trade, state) {
    const exit = state.currentPrice;
  
    const isBuy = trade.type === "buy";
    const isSell = trade.type === "sell";
  
    let exitResult = "Loss";
    let pnl = 0;
  
    const payoutMultiplier = 1.8;
  
    if ((isBuy && exit > trade.entry) || (isSell && exit < trade.entry)) {
      exitResult = "Win";
      pnl = trade.wager * (payoutMultiplier - 1); // Only profit
      state.balance += trade.wager + pnl; // Return wager + profit
    } else if (exit === trade.entry) {
      exitResult = "Break Even";
      pnl = 0;
      state.balance += trade.wager; // Return wager
    }
    // Else: Loss – wager already deducted
  
    state.trades.push({
      ...trade,
      exit,
      pnl: exitResult === "Loss" ? -trade.wager : pnl,
      exitResult,
      time: new Date().toLocaleTimeString()
    });
  
    const index = state.openTrades.indexOf(trade);
    // if (index > -1) state.openTrades.splice(index, 1);
    if (index !== -1) state.openTrades.splice(index, 1);
  
    saveStateToLocalStorage();
    Stats.update(state);
    Chart.draw(state);
  
    showTradeMessage(
      exitResult === "Win"
        ? `✅ You won! Profit: +$${pnl.toFixed(2)}`
        : exitResult === "Break Even"
        ? `⚖️ Trade ended break even.`
        : `❌ You lost $${trade.wager.toFixed(2)}`
    );
  }

  return { place, resolveTrade };
})();

// === STATS + UI MODULE ===
const Stats = (() => {
  function update(state) {
    const { balance, wager, duration } = Core.state;
  
    // ⏱️ Update Duration Display
    document.getElementById('durH').textContent = `${String(duration.hour).padStart(2, '0')}h:`;
    document.getElementById('durM').textContent = `${String(duration.minute).padStart(2, '0')}m:`;
    document.getElementById('durS').textContent = `${String(duration.second).padStart(2, '0')}s`;
  
    // 💰 Update Balance Display
    document.getElementById('balance').querySelector('span').textContent = balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  
    // 🎯 Update Wager Display
    document.getElementById('wager').textContent = wager.toLocaleString();
      
    // === 1. Profit + Progress ===
    const profit = state.balance - state.startBalance;
    const openPNL = state.openTrades.reduce((acc, trade) => {
      const won = (trade.type === "buy" && state.currentPrice > trade.entry) || (trade.type === "sell" && state.currentPrice < trade.entry);
      return acc + (won ? trade.wager : -trade.wager);
    }, 0);

    // === 5. Win Rate & Trade Stats ===
    const wins = state.trades.filter(t => t.pnl > 0);
    const total = state.trades.length;
    const winRate = total ? ((wins.length / total) * 100).toFixed(1) + '%' : '0%';

    document.getElementById("totalTrades").textContent = total;
    document.getElementById("winlossratio").textContent = winRate;

    // === 6. Trade History Table ===
    const historyEl = document.getElementById("history").querySelector("tbody");
    historyEl.innerHTML = state.trades.map(t => `
      <tr>
        <td>${t.time}</td>
        <td>${t.type}</td>
        <td>${t.entry.toFixed(2)}</td>
        <td>${t.exit.toFixed(2)}</td>
        <td style="color:${t.pnl >= 0 ? 'limegreen' : 'red'}">${t.pnl.toFixed(2)}</td>
        <td>${(t.duration / 1000).toFixed(1)}s</td>
        <td>${t.exitResult || 'Manual'}</td>
      </tr>
    `).reverse().join("");
  }

  return { update };
})();

// === MODAL MODULE ===
const Modal = (() => {
  function render({
    large,
    title = "Are you sure you want to proceed?",
    content,
    CloseLabel,
    ConfirmLabel,
    onLoad,
    onClose,
    onConfirm
  }) {
    const hClass = "text-lg font-thin m-0";
    const buttonClass = "text-xs w-auto px-3 py-2 m-0 capitalize rounded-md";
    const svgClass = "w-3";
    const times = `<svg class="${svgClass}" viewBox="0 0 384 512">
        <path fill="currentColor" d="M342.6 150.6c12.5-12.5 12.5-32.8 
        0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5
        -45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 
        32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 
        12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
      </svg>`;

    const html = `<article class="${large ? 'flex flex-col h-3/4' : ''} rounded-md">
      <header class="${large ? 'flex-none' : ''} flex justify-between items-center">
        <h1 class="${hClass}">${title}</h1>
        <button class="${buttonClass} bg-transparent border-0" style="color: unset;" aria-label="Close">${times}</button>
      </header>
      <main class="font-thin ${large ? 'flex-grow' : ''}">
        ${content || ''}
      </main>
      <footer ${large ? 'class="flex-none"' : ''}>
        <button class="${buttonClass} bg-transparent border border-gray-600" aria-label="Close">${CloseLabel || 'close'}</button>
        ${onConfirm ? `<button class="${buttonClass}" aria-label="Confirm">${ConfirmLabel || 'confirm'}</button>` : ''}
      </footer>
    </article>`;

    const modal = document.createElement('dialog');
    modal.open = true;
    modal.innerHTML = html;
    document.body.appendChild(modal);

    if (onLoad && typeof onLoad === 'function') onLoad();

    const timesBtn = modal.querySelector('header button');
    const closeBtn = modal.querySelector('footer button:first-child');
    const confirmBtn = modal.querySelector('footer button:last-child');

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    timesBtn.onclick = () => {
      if (onClose) onClose();
      closeModal();
    };

    closeBtn.onclick = () => {
      if (onClose) onClose();
      closeModal();
    };

    if (onConfirm && confirmBtn) {
      confirmBtn.onclick = () => {
        onConfirm();
        closeModal();
      };
    }
  }

  return { render };
})();

// Utility Functions (General Helpers)
function showTradeMessage(msg) {
  // First check if the browser supports notifications
  if (!("Notification" in window)) {
    console.log("This browser does not support system notifications");
    // Fallback to existing method if no notification support
    const el = document.getElementById("tradeMessage");
    if (el) {
      el.textContent = msg;
      setTimeout(() => { el.textContent = ""; }, 3000);
    }
    return;
  }

  // Check if permission has been granted
  if (Notification.permission === "granted") {
    // If it's okay, create a notification
    new Notification("Trading Alert", {
      body: msg
    });
  }
  // Otherwise, ask for permission first
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("Trading Alert", {
          body: msg
        });
      }
    });
  }
  
  // Also show in the UI as fallback
  const el = document.getElementById("tradeMessage");
  if (el) {
    el.textContent = msg;
    setTimeout(() => { el.textContent = ""; }, 3000);
  }
}
function formatMs(ms) {
    const sec = ms / 1000;
    if (sec < 30) return "< 30s";
    if (sec < 60) return "30s - 1m";
    if (sec < 180) return "1-3m";
    if (sec < 600) return "3-10m";
    return "> 10m";
  }
function saveStateToLocalStorage() {
  const stateCopy = { ...Core.state };

  // Saves the remaining time until each trade resolves
  stateCopy.openTrades = stateCopy.openTrades.map(t => ({
    ...t,
    remainingTime: t.entryTime + t.duration - Date.now()
  }));

  try {
    localStorage.setItem("TheTradingGame", JSON.stringify(stateCopy));
  } catch (err) {
    console.error("Failed to save state:", err);
  }
}
function loadStateFromLocalStorage() {
  const stored = localStorage.getItem("TheTradingGame");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);

      // Restore safely
      Object.assign(Core.state, parsed);

      // Resumes and resolves trades
      Core.state.openTrades.forEach(trade => {
        const now = Date.now();
        const timeLeft = trade.endTime - now;

        if (timeLeft <= 0) {
          // Trade should already be resolved
          Trades.resolveTrade(trade, Core.state);
        } else {
          // Still pending, resume timer
          setTimeout(() => Trades.resolveTrade(trade, Core.state), timeLeft);
        }
      });
    } catch (err) {
      console.error("Failed to load state:", err);
    }
  }
}

// === INPUT EVENT HANDLERS ===
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "b") Trades.place("buy", Core.state);
  if (e.key.toLowerCase() === "s") Trades.place("sell", Core.state);
});

// === BUTTON EVENT HANDLERS ===
document.getElementById('performance').onclick = () => {
  const state = Core.state;
  const trades = state.trades;
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const netWinnings = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) + '%' : '0%';
  const avgWin = wins.length ? wins.reduce((a, b) => a + b.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b.pnl, 0) / losses.length : 0;

  const bestTrade = trades.length ? trades.reduce((a, b) => b.pnl > a.pnl ? b : a) : null;
  const worstTrade = trades.length > 1 ? trades.reduce((a, b) => b.pnl < a.pnl ? b : a) : null;

  // Average trade duration
  const avgDuration = trades.length ? trades.reduce((a, b) => a + b.duration, 0) / trades.length : 0;
  
  // Consecutive streaks
  let maxWinStreak = 0, maxLossStreak = 0;
  let currentStreak = 0, lastResult = null;
  
  for (let t of trades) {
    const isWin = t.pnl > 0;
    if (lastResult === null || isWin === lastResult) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    lastResult = isWin;
  
    if (isWin) maxWinStreak = Math.max(maxWinStreak, currentStreak);
    else maxLossStreak = Math.max(maxLossStreak, currentStreak);
  }
  
  // Most common trade duration
  const durationCounts = {};
  trades.forEach(t => {
    const key = `${(t.duration / 1000).toFixed(0)}s`;
    durationCounts[key] = (durationCounts[key] || 0) + 1;
  });
  const mostCommonDuration = Object.entries(durationCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '--';

  const stats = [
    {
      label: "Net Winnings",
      value: `$${netWinnings.toFixed(2)}`,
      class: netWinnings >= 0 ? "text-green-400" : "text-red-400"
    },
    {
      label: "Total Trades",
      value: trades.length
    },
    {
      label: "Win Rate",
      value: winRate
    },
    {
      label: "Avg Win",
      value: `$${avgWin.toFixed(2)}`
    },
    {
      label: "Avg Loss",
      value: `$${avgLoss.toFixed(2)}`
    },
    {
      label: "Best Trade",
      value: bestTrade ? (bestTrade.pnl >= 0 ? `+$${bestTrade.pnl.toFixed(2)}` : `-$${Math.abs(bestTrade.pnl).toFixed(2)}`) : '--',
      class: bestTrade ? (bestTrade.pnl >= 0 ? "text-green-400" : "text-red-400") : ""
    },
    {
      label: "Worst Trade",
      value: worstTrade ? (worstTrade.pnl >= 0 ? `+$${worstTrade.pnl.toFixed(2)}` : `-$${Math.abs(worstTrade.pnl).toFixed(2)}`) : '--',
      class: worstTrade ? (worstTrade.pnl >= 0 ? "text-green-400" : "text-red-400") : ""
    },
    {
      label: "Avg Trade Duration",
      value: `${(avgDuration / 1000).toFixed(1)}s`
    },
    {
      label: "Most Used Duration",
      value: mostCommonDuration
    },
    {
      label: "Max Win Streak",
      value: `${maxWinStreak} wins`
    },
    {
      label: "Max Loss Streak",
      value: `${maxLossStreak} losses`
    }
  ];

  const content = `
    <div class="trading-card rounded-xl p-5">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm text-slate-300">
        ${stats.map(stat => `
          <div>
            <span class="text-slate-500 block">${stat.label}</span>
            <span class="font-bold ${stat.class ?? ''}">${stat.value}</span>
          </div>
        `).join('')}
      </div>

      <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
        <button id="importBackupBtn" class="bg-green-600 text-white text-sm px-4 py-2 rounded-md text-center cursor-pointer w-full sm:w-auto border-0">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"></path>
          </svg>
          Import Backup (.json)
        </button>
        <button id="exportBackupBtn" class="bg-blue-600 text-white text-sm px-4 py-2 rounded-md text-center cursor-pointer w-full sm:w-auto border-0">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"></path>
          </svg>
          Export Backup (.json)
        </button>
      </div>
      <input type="file" id="importBackupInput" accept=".json" class="hidden" />
    </div>
  `;

  Modal.render({
    title: "🎯 Performance Card",
    content,
    CloseLabel: "Close",
    ConfirmLabel: "Reset",
    onLoad: () => {
      setTimeout(() => {
        const exportBtn = document.getElementById("exportBackupBtn");
        const importBtn = document.getElementById("importBackupBtn");
        const importInput = document.getElementById("importBackupInput");
        
        importBtn.addEventListener("click", () => {
          importInput.click(); // ← Triggers the file picker
        });
      
        exportBtn.addEventListener("click", () => {
          const stateCopy = { ...Core.state, openTrades: [] };
          const dataStr = JSON.stringify(stateCopy, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `trading-backup-${new Date().toISOString().split("T")[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        });
      
        importInput.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;
      
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              const imported = JSON.parse(event.target.result);
              if (!imported || typeof imported !== "object" || !imported.trades) {
                alert("Invalid backup file.");
                return;
              }

              Object.assign(Core.state, imported);
              Core.state.openTrades = [];
              saveStateToLocalStorage();

              Stats.update(Core.state);
              Chart.draw(Core.state);
              document.querySelector('dialog[open] footer button:first-child').onclick();
            } catch (err) {
              alert("❌ Failed to import backup.");
            }
          };
      
          reader.readAsText(file);
        });
      }, 50); // slight delay to ensure DOM is mounted
    },
    onConfirm: () => {
      Core.clearStorage();
      
      // Get the input value and update the balance
      Core.state.balance = Core.state.startBalance;
      Core.state.trades = [];

      // Update the balance display
      document.getElementById('balance').querySelector('span').textContent = Core.state.balance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      saveStateToLocalStorage();
    }
  });
};
document.getElementById('balance').onclick = () => {
  Modal.render({
    title: `Reset Your Balance`,
    content: `
      <p class="text-sm text-center mb-4 text-yellow-500">🕹️ Start a new run — all previous trades will vanish!</p>
      <input id="balanceInput" type="number" min="1" step="1" placeholder="1,000" value="${Core.state.startBalance}">
    `,
    onLoad() {
      // Add event listener for the 'Enter' key
      document.getElementById('balanceInput').focus();
      document.getElementById('balanceInput').onkeydown = function(e) {
        if (e.key === 'Enter') {
          // Trigger a click on the Confirm button
          this.closest('dialog').querySelector('footer button[data-modal=confirm]').click();
          e.preventDefault();
        }
      };
    },
    onConfirm() {
      Core.clearStorage();
      
      // Get the input value and update the balance
      const newBalance = parseInt(document.getElementById('balanceInput').value, 10);
      if (!isNaN(newBalance)) {
        Core.state.startBalance = newBalance;
        Core.state.balance = newBalance;
        Core.state.trades = [];

        // Update the balance display
        document.getElementById('balance').querySelector('span').textContent = Core.state.balance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

        saveStateToLocalStorage();
      }
    }
  });
}
document.getElementById("buy").onclick = () => {
  Trades.place("buy", Core.state);
};
document.getElementById('wager').onclick = () => {
  Modal.render({
    title: `Set Your Wager`,
    content: `
      <input
        id="wagerInput"
        type="number"
        min="1"
        step="1"
        placeholder="250"
        value="${Core.state.wager}"
        class="w-full p-2 border border-gray-600 rounded text-center"
      >
    `,
    onLoad() {
      const input = document.getElementById('wagerInput');
      const confirmBtn = document.querySelector('dialog footer button:last-child');
      confirmBtn.setAttribute('data-modal', 'confirm');

      input.focus();
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          confirmBtn.click();
          e.preventDefault();
        }
      };
    },
    onConfirm() {
      const newWager = parseInt(document.getElementById('wagerInput').value, 10);
      if (!isNaN(newWager) && newWager > 0) {
        Core.state.wager = newWager;

        document.getElementById('wager').textContent = Core.state.wager;
        saveStateToLocalStorage();
      } else {
        showTradeMessage("❌ Invalid wager amount.");
      }
    }
  });
};
document.getElementById('duration').onclick = () => {
  Modal.render({
    title: `Set Trade Duration`,
    content: `
      <div class="text-center">
        <div class="grid grid-cols-3 gap-2">
          <input class="duration-input" id="durationHours" type="number" min="0" placeholder="00" value="${Core.state.duration.hour}" class="p-2 border border-gray-600 rounded">
          <input class="duration-input" id="durationMinutes" type="number" min="0" max="59" placeholder="00" value="${Core.state.duration.minute}" class="p-2 border border-gray-600 rounded">
          <input class="duration-input" id="durationSeconds" type="number" min="1" max="59" placeholder="00" value="${Core.state.duration.second}" class="p-2 border border-gray-600 rounded">
        </div>
        <div class="grid grid-cols-3 gap-2 text-sm text-gray-400">
          <span>Hours</span>
          <span>Minutes</span>
          <span>Seconds</span>
        </div>
      </div>
    `,
    onLoad() {
      const confirmBtn = document.querySelector('dialog footer button:last-child');
      const inputs = document.querySelectorAll('.duration-input');

      function updateConfirmState() {
        const h = parseInt(document.getElementById('durationHours').value) || 0;
        const m = parseInt(document.getElementById('durationMinutes').value) || 0;
        const s = parseInt(document.getElementById('durationSeconds').value) || 0;
        confirmBtn.disabled = (h === 0 && m === 0 && s === 0);
      }

      inputs.forEach(input => input.addEventListener('input', updateConfirmState));
      updateConfirmState(); // Initial state
    },
    onConfirm() {
      const h = parseInt(document.getElementById('durationHours').value) || 0;
      const m = parseInt(document.getElementById('durationMinutes').value) || 0;
      const s = parseInt(document.getElementById('durationSeconds').value) || 0;
      if (h === 0 && m === 0 && s === 0) return;

      Core.state.duration = { hour: h, minute: m, second: s };

      // Update display
      durH.textContent = `${String(h).padStart(2, '0')}h:`;
      durM.textContent = `${String(m).padStart(2, '0')}m:`;
      durS.textContent = `${String(s).padStart(2, '0')}s`;

      saveStateToLocalStorage();
    }
  });
};
document.getElementById("sell").onclick = () => {
  Trades.place("sell", Core.state);
};

window.addEventListener('DOMContentLoaded', () => loadStateFromLocalStorage());
