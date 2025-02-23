// Market symbol mapping (TradingView symbols)
const marketSymbols = {
  'BTCUSD': 'BINANCE:BTCUSD',
  'ETHUSD': 'BINANCE:ETHUSD',
  'XRPUSD': 'BINANCE:XRPUSD',
  'ADAUSD': 'BINANCE:ADAUSD',
  'DJIA': 'DJ:DJI',
  'Nasdaq': 'NASDAQ:NDX',
  'SP500': 'SP:SPX',
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'AUDUSD': 'FX:AUDUSD',
  'USDCAD': 'FX:USDCAD',
  'XAUUSD': 'FX:XAUUSD',
  'WTI': 'NYMEX:CL1!',
  'XAGUSD': 'FX:XAGUSD'
};

// Alpha Vantage symbol mapping (for API calls)
const alphaVantageSymbols = {
  'BTCUSD': 'BTCUSD',
  'ETHUSD': 'ETHUSD',
  'XRPUSD': 'XRPUSD',
  'ADAUSD': 'ADAUSD',
  'DJIA': 'DJI',
  'Nasdaq': 'NDX',
  'SP500': 'SPX',
  'EURUSD': 'EURUSD',
  'GBPUSD': 'GBPUSD',
  'USDJPY': 'USDJPY',
  'AUDUSD': 'AUDUSD',
  'USDCAD': 'USDCAD',
  'XAUUSD': 'XAUUSD',
  'WTI': 'CL=F',  // Corrected WTI symbol for Alpha Vantage
  'XAGUSD': 'XAGUSD'
};

// Get the market parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
let market = urlParams.get('market');

// Set a default market if none is provided
if (!market) {
    market = 'BTCUSD'; // Default to Bitcoin
}

// Global App data
let App = JSON.parse(localStorage.getItem("TheTradingGame")) || {
    activeTrade: false,
    balance: 1000,
    wager: 100,
    duration: { hour: 0, minute: 0, second: 5 },
    history: []
};

// Variables
let tradeDirection = null;
let initialTradePrice = 0;
let currentPrice = null;
let countdownTimer = null;
let timer = 0;

// --- UI Update Functions ---

function updateBalanceDisplay() {
    document.getElementById('balanceValue').textContent = `$${formatNumberWithCommas(App.balance.toFixed(2))}`;
}

function updatePriceDisplay(price) {
    const priceDisplay = document.getElementById('currentPrice');
    if (priceDisplay) {
        priceDisplay.textContent = `$${formatNumberWithCommas(price.toFixed(2))}`;

        if (App.activeTrade && initialTradePrice) {
            const priceChange = price - initialTradePrice;
            const isPositive = (tradeDirection === 'buy' && priceChange > 0) ||
                (tradeDirection === 'sell' && priceChange < 0);
            priceDisplay.classList.remove('text-[#019b6b]', 'text-[#e8453a]');
            priceDisplay.classList.add(isPositive ? 'text-[#019b6b]' : 'text-[#e8453a]');
        }
    }
}

function updateStartPriceDisplay(price) {
    const startPriceDisplay = document.getElementById('startPrice');
        if (startPriceDisplay) {
            startPriceDisplay.textContent = `Start: $${formatNumberWithCommas(price.toFixed(2))}`;
        }
}

// --- Utility Functions ---

function formatNumberWithCommas(number) {
    return new Intl.NumberFormat().format(number);
}

// --- API Interaction ---

// Function to check API connection (using IBM as a test)
function checkConnection() {
    return new Promise((resolve) => {
        const symbol = 'IBM';
        const url = `/api/global-quote/${symbol}`;

        fetch(url)
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .then(data => {
                if (data["Error Message"] || data["Note"]) {
                    console.error("Connection failed:", data["Error Message"] || data["Note"]);
                    resolve(false);
                } else {
                    console.log("Connection established.");
                    resolve(true);
                }
            })
            .catch(error => {
                console.error("Connection error:", error);
                resolve(false);
            });
    });
}

// Function to fetch real-time price from Alpha Vantage
function fetchRealTimePrice() {
    return new Promise((resolve, reject) => {
        const alphaVantageSymbol = alphaVantageSymbols[market];
        if (!alphaVantageSymbol) {
            reject(new Error(`Invalid market symbol: ${market}`));
            return;
        }

        const url = `/api/global-quote/${alphaVantageSymbol}`;

        fetch(url)
            .then(response => response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`))
            .then(data => {
                const globalQuote = data["Global Quote"];
                if (globalQuote && globalQuote["05. price"]) {
                    currentPrice = parseFloat(globalQuote["05. price"]);
                    resolve(currentPrice);
                } else {
                    console.warn("Invalid price received:", data);
                    resolve(null); // Resolve with null to potentially retry
                }
            })
            .catch(error => {
                console.error("Error fetching real-time price:", error);
                reject(error);
            });
    });
}

// --- Trading Logic ---

function startTrade(direction) {
    if (App.activeTrade) return;

    tradeDirection = direction;
    initialTradePrice = currentPrice; // Use the globally updated currentPrice
    updateStartPriceDisplay(initialTradePrice);
    App.activeTrade = true;
    App.balance -= App.wager;
    updateBalanceDisplay();
    localStorage.setItem("TheTradingGame", JSON.stringify(App));

    // Get total duration in seconds
    timer = (App.duration.hour * 3600) + (App.duration.minute * 60) + App.duration.second;
    startCountdown();
    updateTradeButtons();
}

function endTrade() {
    if (!App.activeTrade) return;

    clearInterval(countdownTimer);
    const priceChange = currentPrice - initialTradePrice;
    const win = (tradeDirection === 'buy' && priceChange > 0) || (tradeDirection === 'sell' && priceChange < 0);
    const payout = win ? App.wager * 2 : 0;
    App.balance += payout;
    App.activeTrade = false;
    tradeDirection = null; // Reset trade direction
    initialTradePrice = 0; //Reset initial price
    updateStartPriceDisplay(""); // Clear start price
    updateBalanceDisplay();

    // Add trade to history
    App.history.unshift({
        market: market,
        direction: tradeDirection,
        wager: App.wager,
        duration: timer,
        result: win ? 'win' : 'loss',
        payout: payout
    });

    localStorage.setItem("TheTradingGame", JSON.stringify(App));
    updateTradeButtons();
    updateTradingHistory();
    updateWinRate();
}

// --- Countdown Timer ---

function startCountdown() {
    clearInterval(countdownTimer); // Clear any existing timer

    countdownTimer = setInterval(() => {
        if (timer <= 0) {
            endTrade();
        } else {
            timer--;
            updateDurationDisplay();
        }
    }, 1000);
}

function updateDurationDisplay() {
    const hours = Math.floor(timer / 3600);
    const minutes = Math.floor((timer % 3600) / 60);
    const seconds = timer % 60;

    document.getElementById('durH').textContent = `${String(hours).padStart(2, '0')}h:`;
    document.getElementById('durM').textContent = `${String(minutes).padStart(2, '0')}m:`;
    document.getElementById('durS').textContent = `${String(seconds).padStart(2, '0')}s`;
}

// --- Button Handlers ---

function updateTradeButtons() {
    const buyButton = document.getElementById('buy');
    const sellButton = document.getElementById('sell');
    const wagerButton = document.getElementById('wager');
    const durationButton = document.getElementById('duration');

    if (App.activeTrade) {
        buyButton.setAttribute('data-active', 'false');
        sellButton.setAttribute('data-active', 'false');
        wagerButton.setAttribute('data-active', 'false');
        durationButton.setAttribute('data-active', 'false');
    } else {
        buyButton.setAttribute('data-active', 'true');
        sellButton.setAttribute('data-active', 'true');
        wagerButton.setAttribute('data-active', 'true');
        durationButton.setAttribute('data-active', 'true');
    }
}

// --- Initialization ---

// Initialize TradingView Widget
function initTradingView() {
    const widgetContainer = document.getElementById('tradingview_0b60e');
    if (!widgetContainer) return;

    // Clear any existing content
    widgetContainer.innerHTML = '';

    // Create the widget container elements
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100vh - 200px)';  // Adjust height as needed
    widgetDiv.style.width = '100%';

    const copyrightDiv = document.createElement('div');
    copyrightDiv.className = 'tradingview-widget-copyright';
    copyrightDiv.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

    // Append elements to container
    widgetContainer.appendChild(widgetDiv);
    widgetContainer.appendChild(copyrightDiv);

    // Initialize TradingView widget with correct symbol
    new TradingView.widget({
        container_id: widgetDiv.id,
        autosize: true,
        symbol: marketSymbols[market] || 'BINANCE:BTCUSD',
        timezone: "Asia/Kuala_Lumpur",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        withdateranges: true,
        range: "6M",
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: false,
        studies: [
            "STD;Average%1Directional%1Index",
            "STD;MACD"
        ],
        container: widgetDiv,
        height: "100%",
        width: "100%"
    });
}

// --- History and Win Rate ---
function updateTradingHistory() {
  const historyList = document.getElementById('tradingHistory');
  historyList.innerHTML = ''; // Clear existing list

  App.history.forEach(trade => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-none', 'flex', 'justify-between', 'mb-2');

    const resultClass = trade.result === 'win' ? 'text-[#019b6b]' : 'text-[#e8453a]';
    const resultText = trade.result === 'win' ? '+ $' + formatNumberWithCommas(trade.wager) : '- $' + formatNumberWithCommas(trade.wager);

    listItem.innerHTML = `
      <div class="flex flex-col">
        <span>${trade.market}</span>
        <span class="text-xs opacity-60">${trade.direction}</span>
      </div>
      <div class="flex flex-col text-right">
        <span class="${resultClass}">${resultText}</span>
        <span class="text-xs opacity-60">${trade.duration}s</span>
      </div>
    `;
    historyList.appendChild(listItem);
  });
}

function updateWinRate() {
  const wins = App.history.filter(trade => trade.result === 'win').length;
  const totalTrades = App.history.length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 100;
  document.getElementById('winrate').textContent = `${winRate.toFixed(0)}%`;
}

// --- Event Listeners and Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    initTradingView();
    updateBalanceDisplay();
    updateTradeButtons();
    updateDurationDisplay();
    updateTradingHistory();
    updateWinRate();

    // Fetch initial price and start updating it periodically
    fetchRealTimePrice()
        .then(price => {
            updatePriceDisplay(price);
            setInterval(() => {
                fetchRealTimePrice()
                    .then(updatePriceDisplay)
                    .catch(error => console.error("Failed to update price:", error));
            }, 5000); // Update every 5 seconds
        })
        .catch(error => console.error("Failed to fetch initial price:", error));

    // Button event listeners
    document.getElementById('buy').addEventListener('click', () => startTrade('buy'));
    document.getElementById('sell').addEventListener('click', () => startTrade('sell'));
    document.getElementById('wager').addEventListener('click', () => {
        // Cycle through wager amounts: 100, 250, 500, back to 100
        App.wager = App.wager === 100 ? 250 : (App.wager === 250 ? 500 : 100);
        document.getElementById('wager').textContent = App.wager;
        localStorage.setItem("TheTradingGame", JSON.stringify(App)); // Save wager
    });

    document.getElementById('duration').addEventListener('click', () => {
        // Cycle through durations: 5s, 15s, 1m, 5m, 15m, 1h
        const currentDuration = App.duration;

        if (currentDuration.second === 5) {
            App.duration = { hour: 0, minute: 0, second: 15 };
        } else if (currentDuration.second === 15) {
            App.duration = { hour: 0, minute: 1, second: 0 };
        } else if (currentDuration.minute === 1) {
            App.duration = { hour: 0, minute: 5, second: 0 };
        } else if (currentDuration.minute === 5) {
            App.duration = { hour: 0, minute: 15, second: 0 };
        } else if (currentDuration.minute === 15) {
            App.duration = { hour: 1, minute: 0, second: 0 };
        } else {
            App.duration = { hour: 0, minute: 0, second: 5 }; // Back to 5s
        }
        updateDurationDisplay();
        localStorage.setItem("TheTradingGame", JSON.stringify(App)); // Save wager
    });

    document.getElementById('modalHistory').addEventListener('beforematch', () => {
        updateTradingHistory();
        updateWinRate();
    });
});
