// Global App data
let App = JSON.parse(localStorage.getItem("TheTradingGame")) || {
  activeTrade: false,
  balance: 1000,
  wager: 100,
  duration: { hour: 0, minute: 0, second: 5 },
  history: []
};

// Variables
let tradeDirection = null; // Store trade direction (buy/sell)
let initialTradePrice = 0; // Store the price at trade initiation
let currentPrice = null; // Ensure global scope
let countdownTimer = null; // Global variable for countdown
let timer = 0; // Define timer

// Utility Functions (General Helpers)
function formatNumberWithCommas(number) {
  return new Intl.NumberFormat().format(number);
}
function showNotification(title, body, type) {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications.");
    return;
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: type === "win" ? "✅" : "❌"
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, {
          body: body,
          icon: type === "win" ? "✅" : "❌"
        });
      }
    });
  }
}
function checkConnection() {
  return new Promise((resolve) => {
    const url = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT';
    const request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.onload = function() {
      if (request.status === 200) {
        console.log("Connection established.");
        resolve(true);
      } else {
        console.error("Connection failed with status:", request.status);
        resolve(false);
      }
    };
    request.onerror = function() {
      console.error("Connection error.");
      resolve(false);
    };
    request.send();
  });
}
function getTradeDurationMs() {
  const { hour, minute, second } = App.duration;
  return (hour * 3600 + minute * 60 + second) * 1000;
}
async function fetchValidPrice(retries = 10) {
  for (let i = 0; i < retries; i++) {
    currentPrice = await buildTicker(); // Wait until price is returned

    if (currentPrice > 0) {
      console.log("Valid price received:", currentPrice);
      return currentPrice; // Exit the loop early if price is valid
    }

    console.warn(`Retrying price fetch... Attempts left: ${retries - i - 1}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retrying
  }

  throw new Error("Failed to fetch a valid price after retries.");
}
function saveAppState() {
  localStorage.setItem("TheTradingGame", JSON.stringify(App));
}

// Core Trading Functions
async function initTrade(direction) {
  if (App.activeTrade) {
    console.log("Trade already in progress.");
    return;
  }

  const tradeButton = document.getElementById(direction === "buy" ? "buy" : "sell");
  tradeButton.setAttribute("disabled", "true"); // Disable button immediately

  const isConnected = await checkConnection();
  if (!isConnected) {
    console.error("Failed to establish connection. Trade not started.");
    showNotification("Trade Failed", "Connection failed. Please try again.", "error");
    tradeButton.removeAttribute("disabled");
    return;
  }

  console.log("Fetching latest price before starting trade...");
  currentPrice = null; // Reset current price before fetching

  try {
    await fetchValidPrice(); // Wait until price is valid
    if (currentPrice > 0) {
      executeTrade(direction, tradeButton);
    } else {
      console.error("Trade not started: Failed to fetch a valid price.");
      showNotification("Trade Failed", "Could not fetch a valid price. Please try again.", "error");
      tradeButton.removeAttribute("disabled");
    }
  } catch (error) {
    console.error("Error fetching price:", error);
    showNotification("Trade Failed", "Price retrieval failed. Please try again.", "error");
    tradeButton.removeAttribute("disabled");
  }
}
function executeTrade(direction, tradeButton) {
  if (!currentPrice || currentPrice === 0) {
    console.error("Price is still invalid. Trade will NOT execute.");
    showNotification("Trade Failed", "Price retrieval failed. Please try again.", "error");
    tradeButton.removeAttribute("disabled");
    return;
  }

  App.activeTrade = true;
  tradeDirection = direction;
  initialTradePrice = currentPrice; // Store valid price
  
  // Update start price display
  const startPriceDisplay = document.getElementById('startPrice');
  const currentPriceDisplay = document.getElementById('currentPrice');
  if (startPriceDisplay) {
    startPriceDisplay.textContent = `Start: $${formatNumberWithCommas(initialTradePrice.toFixed(2))}`;
  }
  if (currentPriceDisplay) {
    currentPriceDisplay.classList.remove('text-[#019b6b]', 'text-[#e8453a]');
    currentPriceDisplay.classList.add(direction === 'buy' ? 'text-[#019b6b]' : 'text-[#e8453a]');
  }

  clearTimeout(timer);
  timer = setInterval(buildTicker, 1000);
  console.log(`Trade started... Direction: ${tradeDirection.toUpperCase()}, Initial Price: ${initialTradePrice}`);

  document.querySelectorAll('[data-active]').forEach(input => {
    input.setAttribute('data-active', 'true');
    input.setAttribute('disabled', 'true');
  });

  let tradeDurationMs = getTradeDurationMs();
  let totalSeconds = Math.floor(tradeDurationMs / 1000);

  startCountdown(totalSeconds);

  setTimeout(() => endTrade(tradeButton), tradeDurationMs > 0 ? tradeDurationMs : 1000);
}
function startCountdown(totalSeconds) {
  if (countdownTimer) clearInterval(countdownTimer); // Clear any existing countdown

  function updateTime() {
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    // Update the UI elements
    document.getElementById('durH').textContent = `${String(hours).padStart(2, '0')}h:`;
    document.getElementById('durM').textContent = `${String(minutes).padStart(2, '0')}m:`;
    document.getElementById('durS').textContent = `${String(seconds).padStart(2, '0')}s`;

    if (totalSeconds <= 0) {
      clearInterval(countdownTimer); // Stop countdown when time is up
    } else {
      totalSeconds--; // Decrease time
    }
  }

  updateTime(); // Initial update
  countdownTimer = setInterval(updateTime, 1000); // Update every second
}
function endTrade(tradeButton) {
  App.activeTrade = false;
  console.log("Trade ended.");
  let initialBalance = App.balance;

  // Stop countdown timer
  clearInterval(countdownTimer);

  // Reset duration display
  document.getElementById('durH').textContent = `${String(App.duration.hour).padStart(2, '0')}h:`;
  document.getElementById('durM').textContent = `${String(App.duration.minute).padStart(2, '0')}m:`;
  document.getElementById('durS').textContent = `${String(App.duration.second).padStart(2, '0')}s`;

  // Clear start price display after trade ends
  const startPriceDisplay = document.getElementById('startPrice');
  if (startPriceDisplay) {
    startPriceDisplay.textContent = '';
  }
  
  // Reset current price display color
  const currentPriceDisplay = document.getElementById('currentPrice');
  if (currentPriceDisplay) {
    currentPriceDisplay.classList.remove('text-[#019b6b]', 'text-[#e8453a]');
    currentPriceDisplay.classList.add('text-[#019b6b]');
  }

  const finalPrice = currentPrice;
  let tradeOutcome = "Loss";
  let adjustment = -App.wager;
  let message = `Trade Result: ${tradeOutcome} - Initial: ${initialTradePrice}, Final: ${finalPrice}`;

  if ((tradeDirection === "buy" && finalPrice > initialTradePrice) ||
      (tradeDirection === "sell" && finalPrice < initialTradePrice)) {
    tradeOutcome = "Win";
    adjustment = App.wager;
    message = `Trade Result: ✅ WIN! Initial: ${initialTradePrice}, Final: ${finalPrice}`;
    showNotification("Trade Won! 🎉", message, "win");
  } else {
    message = `Trade Result: ❌ LOSS. Initial: ${initialTradePrice}, Final: ${finalPrice}`;
    showNotification("Trade Lost", message, "loss");
  }

  App.balance += adjustment;

  const tradeRecord = {
    currency: 'BTC/USDT',
    date: new Date().toLocaleString(),
    balance: `$${App.balance.toLocaleString()}`,
    adjustment: `${adjustment > 0 ? '+' : ''}${adjustment}`
  };

  App.history.unshift(tradeRecord);

  console.log(message);
  console.log("Updated Balance:", App.balance);
  console.log("Trade History:", App.history);

  renderHistory();
  updateBalanceDisplay();

  // Re-enable buy & sell buttons after trade is complete
  document.querySelectorAll('[data-active]').forEach(input => {
    input.setAttribute('data-active', 'false');
    input.removeAttribute('disabled');
  });

  // Re-enable the specific button that was clicked
  tradeButton.removeAttribute("disabled");

  clearTimeout(timer);

  // If balance hits 0
  if (App.balance <= 0) {
    let profitability = ((App.balance - initialBalance) / initialBalance) * 100;
  
    Modal.render({
      title: `Trading Session Over`,
      content: `
        <p class="text-sm text-center mb-4">Your trading session has ended as your balance reached $0.</p>
        <p class="text-center">Profitability: <strong>${profitability.toFixed(2)}%</strong></p>
        <p class="text-sm mt-3 text-center">Trading is about <strong>money management</strong> and <strong>finding an edge</strong>. Proper risk management ensures longevity in the market.</p>
      `,
      hideClose: true,
      ConfirmLabel: "Restart Trading",
      onConfirm() {
        // Reset all to default
        App.balance = 1000;
        App.wager = 100;
        App.duration.hour = 0;
        App.duration.minute = 0;
        App.duration.second = 5;
        App.history = [];
        document.getElementById('wager').textContent = formatNumberWithCommas(App.wager);
        durH.textContent = `${String(App.duration.hour).padStart(2, '0')}h:`;
        durM.textContent = `${String(App.duration.minute).padStart(2, '0')}m:`;
        durS.textContent = `${String(App.duration.second).padStart(2, '0')}s`;
        updateBalanceDisplay();
        renderHistory();
        saveAppState(); // Save to localStorage
      }
    });
  } else {
    saveAppState(); // Save to localStorage
  }
}
function buildTicker() {
  return new Promise((resolve, reject) => {
    const url = 'https://data-api.binance.vision/api/v3/ticker/price?symbol=BTCUSDT';
    const request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.onload = function() {
      if (request.status === 200) {
        try {
          const data = JSON.parse(request.responseText);
          if (data.price && parseFloat(data.price) > 0) {
            currentPrice = parseFloat(data.price);
            // Update price display
            const priceDisplay = document.getElementById('currentPrice');
            if (priceDisplay) {
              priceDisplay.textContent = `$${formatNumberWithCommas(currentPrice.toFixed(2))}`;
              
              // Update color based on price movement if in active trade
              if (App.activeTrade && initialTradePrice) {
                const priceChange = currentPrice - initialTradePrice;
                const isPositive = (tradeDirection === 'buy' && priceChange > 0) || 
                                 (tradeDirection === 'sell' && priceChange < 0);
                priceDisplay.classList.remove('text-[#019b6b]', 'text-[#e8453a]');
                priceDisplay.classList.add(isPositive ? 'text-[#019b6b]' : 'text-[#e8453a]');
              }
            }
            console.log("Updated BTC Price:", currentPrice);
            resolve(currentPrice);
          } else {
            console.warn("Invalid price received:", data);
            resolve(null);
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
          reject(error);
        }
      } else {
        console.error("Failed to fetch data. Status:", request.status);
        reject(new Error("API request failed"));
      }
    };

    request.onerror = function() {
      console.error("Request error. Could not fetch price.");
      reject(new Error("Network error"));
    };

    request.send();
  });
}
function watchTicker(callback) {
  let attempts = 10; // Maximum retry attempts

  function checkPrice() {
    buildTicker(); // Fetch the latest price

    setTimeout(() => {
      if (currentPrice > 0) {
        console.log("Valid price received:", currentPrice);
        callback(); // Start trade once price is valid
      } else if (attempts > 0) {
        console.warn(`Waiting for valid price... Retries left: ${attempts}`);
        attempts--;
        checkPrice(); // Try again
      } else {
        console.error("Failed to fetch a valid price after retries.");
        callback(); // Fail gracefully
      }
    }, 500);
  }

  checkPrice(); // Start price fetch loop
}

// UI Update Functions
window.Modal = {
  render({
    large,
    title = "Are you sure you want to proceed?",
    content,
    CloseLabel,
    hideClose,
    ConfirmLabel,
    onLoad,
    onClose,
    onConfirm
  }) {
    // if (!options) return false;
    const hClass = "text-lg font-thin m-0";
    const buttonClass = "text-xs w-auto px-3 py-2 m-0 capitalize rounded-md";
    const svgClass = "w-3";
    const times = `<svg class="${svgClass}" viewBox="0 0 384 512">
        <path 
          fill="currentColor" 
          d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
      </svg>`;

    const html = `<article class="${large ? 'flex flex-col h-3/4' : ''} rounded-md">
      <header class="${large ? 'flex-none' : ''} flex justify-between items-center">
        <h1 class="${hClass}">${title}</h1>
        ${hideClose ? '' : `<button class="${buttonClass} bg-transparent border-0" style="color: unset;" aria-label="Close">
          ${times}
        </button>`}
      </header>
      <main class="font-thin ${large ? 'flex-grow' : ''}">
        ${content ? content : ''}
      </main>
      <footer ${large ? 'class="flex-none"' : ''}>
        ${hideClose ? '' : `<button class="${buttonClass} bg-transparent border border-gray-600" style="color: unset;" aria-label="Close" data-modal="close" onclick="this.closest('dialog').remove()">${CloseLabel ? CloseLabel : 'close'}</button>`}
        ${onConfirm ? `<button class="${buttonClass}" aria-label="Confirm" data-modal="confirm">${ConfirmLabel ? ConfirmLabel : 'confirm'}</button>` : ''}
      </footer>
    </article>`;

    const modal = document.createElement('dialog');
    modal.open = true;
    modal.innerHTML = html;

    document.body.appendChild(modal);
    if (onLoad && typeof onLoad === 'function') {
      onLoad();
    }

    const timesBtn = modal.querySelector('header button');
    const closeBtn = modal.querySelector('footer button[data-modal=cancel]');
    const confirmBtn = modal.querySelector('footer button[data-modal=confirm]');

    // Confirm handler function
    if (timesBtn) {
      timesBtn.onclick = function() {
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
        document.body.removeChild(modal);
      }
    }
    if (closeBtn) {
      closeBtn.onclick = function() {
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
        document.body.removeChild(modal);
      }
    }
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        if (onConfirm && typeof onConfirm === 'function') {
          onConfirm();
        }
        document.body.removeChild(modal);
      }
    }
  }
}
function updateBalanceDisplay() {
  const balanceElement = document.getElementById('balance').querySelector('span'); // Ensure an element with this ID exists
  if (balanceElement) {
    balanceElement.textContent = App.balance.toLocaleString(); // Format balance properly
  }
}
function renderHistory() {
  const tradingHistory = document.getElementById('tradingHistory');
  const winrateElement = document.getElementById('winrate');

  if (!Array.isArray(App.history) || App.history.length === 0) {
    tradingHistory.innerHTML = "<li class='text-center py-2'>No trade history available</li>";
    winrateElement.innerHTML = `<span class="text-[#e8453a]">0%</span>`; // Default red for 0% win rate
    return; // This return is inside a function and is legal
  }

  let wins = 0;
  let totalTrades = App.history.length;

  const historyHTML = App.history
    .map((item) => {
      const isWin = item.adjustment.startsWith('+');
      if (isWin) wins++;

      const adjustmentClass = isWin ? 'text-[#019b6b]' : 'text-[#e8453a]';

      return `
        <li class="list-none flex justify-between mb-2 py-2 border-0 border-b border-solid border-gray-700">
          <div class="flex flex-col">
            <span>${item.currency}</span>
            <span class="flex items-center">
              <svg class="w-4 ${isWin ? 'text-[#019b6b]' : 'text-[#e8453a]'} mr-2" 
                xmlns="http://www.w3.org/2000/svg" style="isolation:isolate" viewBox="0 0 256 256" fill="currentColor">
                <path d="M 0 168.381 L 66.301 102.065 C 73.447 94.894 85.06 94.894 92.206 102.065 L 128 137.905 
                L 193.524 72.381 L 176.762 72.381 C 166.663 72.381 158.476 64.194 158.476 54.095 C 158.476 
                43.996 166.663 35.81 176.762 35.81 L 237.714 35.81 C 247.813 35.81 256 43.996 256 54.095 
                L 256 115.048 C 256 125.147 247.813 133.333 237.714 133.333 C 227.615 133.333 219.429 125.147 
                219.429 115.048 L 219.429 98.286 L 140.937 176.792 C 133.791 183.963 122.179 183.963 115.032 
                176.792 L 79.238 140.952 L 0 220.19"></path>
              </svg> 
              ${item.balance}
            </span>
          </div>
          <div class="flex flex-col text-right">
            <span>${item.date}</span>
            <span class="${adjustmentClass}">${item.adjustment}</span>
          </div>
        </li>
      `;
    })
    .join('');

  tradingHistory.innerHTML = historyHTML;

  // Calculate win rate percentage
  const winRate = totalTrades > 0 ? Math.floor((wins / totalTrades) * 100) : 0;
  const winRateClass = winRate > 50 ? 'text-[#019b6b]' : 'text-[#e8453a]';

  // Update the winrate element
  winrateElement.innerHTML = `<span class="${winRateClass}">${winRate}%</span>`;
}
renderHistory();
new TradingView.widget({
  "width": "100%",
  "height": "100%",
  "symbol": "COINBASE:BTCUSD",
  "interval": "1",
  "timezone": "America/Chicago",
  "theme": "dark",
  "style": "1",
  "locale": "en",
  "toolbar_bg": "#f1f3f6",
  "enable_publishing": false,
  "hide_side_toolbar": false,
  "allow_symbol_change": false,
  "hotlist": true,
  "calendar": true,
  "details": true,
  "studies": [
    // "BB@tv-basicstudies",
    // "MAExp@tv-basicstudies",
    "VWAP@tv-basicstudies"
  ],
  "news": [
    "headlines"
  ],
  "container_id": "tradingview_0b60e"
});

// Event Listeners (DOM Interaction)
document.getElementById('balance').onclick = function() {
  Modal.render({
    title: `Reset Your Balance`,
    content: `
      <p class="text-sm text-center mb-4">Updating your balance will erase your trade history.</p>
      <input id="balanceInput" type="number" min="1" step="1" placeholder="1,000" value="${App.balance}">
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
      // Get the input value and update the balance
      const newBalance = parseInt(document.getElementById('balanceInput').value, 10);
      if (!isNaN(newBalance)) {
        App.balance = newBalance;
        App.history = [];

        // Update the balance display
        document.getElementById('balance').querySelector('span').textContent = formatNumberWithCommas(App.balance);
        saveAppState(); // Save to localStorage
      }
    }
  });
}
historyBtn.onclick = () => {
  modalHistory.show();
  renderHistory();
}
document.getElementById('wager').onclick = function() {
  Modal.render({
    title: `What's your wager?`,
    content: `<input id="ra7mjfe4m" type="number" min="1" step="1" placeholder="250" value="${App.wager}">`,
    onLoad() {
      // Add event listener for the 'Enter' key
      document.getElementById('ra7mjfe4m').focus();
      document.getElementById('ra7mjfe4m').onkeydown = function(e) {
        if (e.key === 'Enter') {
          // Trigger a click on the Confirm button
          this.closest('dialog').querySelector('footer button[data-modal=confirm]').click();
          e.preventDefault();
        }
      };
    },
    onConfirm() {
      // Get the input value and update the wager
      const newWager = parseInt(document.getElementById('ra7mjfe4m').value, 10);
      if (!isNaN(newWager)) {
        App.wager = newWager;

        // Update the wager display
        document.getElementById('wager').textContent = formatNumberWithCommas(App.wager);
        saveAppState(); // Save to localStorage
      }
    }
  });
}
document.getElementById('duration').onclick = function() {
  Modal.render({
    title: `Set Duration`,
    content: `
      <div class="text-center">
        <div class="grid grid-cols-3 gap-2">
          <input class="durElement" id="durHInput" type="number" min="0" step="1" placeholder="00" value="${parseInt(App.duration.hour, 10)}" class="w-1/3 p-2 border border-gray-600 rounded">
          <input class="durElement" id="durMInput" type="number" min="0" max="60" step="1" placeholder="00" value="${parseInt(App.duration.minute, 10)}" class="w-1/3 p-2 border border-gray-600 rounded">
          <input class="durElement" id="durSInput" type="number" min="0" max="60" step="1" placeholder="00" value="${parseInt(App.duration.second, 10)}" class="w-1/3 p-2 border border-gray-600 rounded">
        </div>
        <div class="grid grid-cols-3 gap-2 capitalize">
          <span>h</span>
          <span>m</span>
          <span>s</span>
        </div>
      </div>
    `,
    onLoad() {
      const confirmBtn = document.querySelector('dialog footer button[data-modal=confirm]');
      const inputs = document.querySelectorAll('.durElement');

      // Function to check if at least one value is greater than 0
      function validateInputs() {
        const hours = parseInt(document.getElementById('durHInput').value, 10) || 0;
        const minutes = parseInt(document.getElementById('durMInput').value, 10) || 0;
        const seconds = parseInt(document.getElementById('durSInput').value, 10) || 0;

        confirmBtn.disabled = (hours === 0 && minutes === 0 && seconds === 0);
      }

      // Initialize button state
      validateInputs();

      // Listen for changes in input fields
      inputs.forEach(input => input.addEventListener('input', validateInputs));
    },
    onConfirm() {
      const hours = parseInt(document.getElementById('durHInput').value, 10) || 0;
      const minutes = parseInt(document.getElementById('durMInput').value, 10) || 0;
      const seconds = parseInt(document.getElementById('durSInput').value, 10) || 0;

      // Ensure duration is valid
      if (hours === 0 && minutes === 0 && seconds === 0) return;

      App.duration.hour = hours;
      App.duration.minute = minutes;
      App.duration.second = seconds;

      // Update the duration display
      durH.textContent = `${String(App.duration.hour).padStart(2, '0')}h:`;
      durM.textContent = `${String(App.duration.minute).padStart(2, '0')}m:`;
      durS.textContent = `${String(App.duration.second).padStart(2, '0')}s`;
      saveAppState(); // Save to localStorage
    },
  });
};
buy.onclick = () => initTrade("buy");
sell.onclick = () => initTrade("sell");

function renderAppState() {
  // Update balance display
  document.getElementById('balance').querySelector('span').textContent = App.balance.toLocaleString();

  // Update wager display
  document.getElementById('wager').textContent = App.wager.toLocaleString();

  // Update duration display
  document.getElementById('durH').textContent = `${String(App.duration.hour).padStart(2, '0')}h:`;
  document.getElementById('durM').textContent = `${String(App.duration.minute).padStart(2, '0')}m:`;
  document.getElementById('durS').textContent = `${String(App.duration.second).padStart(2, '0')}s`;

  // Render trade history
  renderHistory();
}
renderAppState();