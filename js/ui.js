// variables
var version = '1.003-release', currentPrice,
    defaultHash = 'BTCUSDT',
    hash, $val, $this, timer, i;

// about the app
info.onclick = function() {
  Swal.fire({
    html: '<img src="svgs/menulogo.svg" style="isolation:isolate; width: 50%; cursor: pointer;" viewBox="0 0 512 512" onclick="window.open(\'https://github.com/michaelsboost/TheTradingGame/\', \'_blank\')"><br><h1>'+ document.title +'</h1><h5>Version '+ version +'</h5><a href="https://github.com/michaelsboost/TheTradingGame/blob/gh-pages/LICENSE" target="_blank">Open Source License</a>'
  });
  
  $('.swal2-container img').on('dragstart', function(e) { e.preventDefault(); });
};

// add hash from change and reload
window.addEventListener('hashchange', function() {
  location.reload(true);
});

// detect window hash
var hash = window.location.hash;
if (!hash) {
  window.location.hash = defaultHash;
  window.location.href = window.location;
} else {
  hash = hash.substr(1, hash.length);
  
  for (i = 0; i < $('#cryptopairs a').length; i++) {
    $('#cryptopairs a')[i].href = '#' + $('#cryptopairs a')[i].textContent.toString().split('/').join('');
    detectHash = $('#cryptopairs a')[i].href;
    detectHash = detectHash.substr(detectHash.length - hash.length, detectHash.length);
    
    if (detectHash === hash) {
      $('#cryptopairs a')[i].classList.add('blue');
    }
  }

  // ticker chart
  new TradingView.widget({
    "width": "100%",
    "height": "100%",
    "symbol": "BINANCE:" + hash,
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
  watchTicker();
  alert("As of Monday, July 20th, 2022 The Crypto Paper Trader's are no longer under development. Why? The Public API no longer works and I don't have the time to update this project therefore I'm abandoning it. However you can still view it, use it, fork it and do whatever you wish to it.");
}

// open/close the menu
menuicon.onclick = function() {
  $('.chart, .menubar, .trading').hide();
};
closemenu.onclick = function() {
  $('.chart, .menubar, .trading').show();
  $('.video, .videoplayer').html('<iframe src="https://www.youtube.com/embed/b0Cg7Zr5oI0" title="Short svgMotion Showreel" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>');
};
closedialog.onclick = function() {
  $('.dialog').hide();
  $('.video, .videoplayer').html('<iframe src="https://www.youtube.com/embed/b0Cg7Zr5oI0" title="Short svgMotion Showreel" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>');
};

// open items from menu
$('[data-open]').on('click', function() {
  $('.dialog').show();
  $('.dialog .scroll div').hide();
  
  var $this = $(this).attr('data-open');
  if ($this === 'history') {
    // show history
    $('.dialog .tradehistory').show().css({
      'visibility': 'visible',
      'width': 'auto',
      'height': 'auto',
    });
    $('.dialog .tradehistory *').show();
  } else if ($this === 'about') {
    // show about
    $('.dialog .videoplayer').show();
  } else if ($this === 'news') {
    // show news
    $('.dialog .news, .dialog .news .tradingview-widget-container').show();
    $('.dialog .news').css({
      'visibility': 'visible',
      'width': 'auto',
      'height': 'auto',
    });
  } else {
    console.error('Error: Menu item unknown');
    alertify.error('Error: Menu item unknown');
  }
});

// watch the ticker price
function buildTicker() {
  var burl = 'https://api.binance.com/api/v3/ticker/price?symbol=';
  var symbol = hash;
  var url = burl + symbol;
  var ourRequest = new XMLHttpRequest();

  ourRequest.open('GET', url, true)
  ourRequest.onload = function() {
    var str = ourRequest.responseText;
    var strOBJ = JSON.parse(str);
    currentPrice = parseFloat(strOBJ.price);
//    console.log(currentPrice);
  }
  ourRequest.send();
}
function watchTicker() {
  clearTimeout(timer);
  timer = setInterval(buildTicker, 100);
  return false;
}
function stopTicker() {
  clearTimeout(timer);
  return false;
}

// Scroll Cryptocurrency Pairs
(function() {
  function scrollMenu(e) {
    e = window.event || e;
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    document.getElementById('cryptopairs').scrollLeft -= (delta*40); // Multiplied by 40
    return false;
  }
  if (document.getElementById('cryptopairs').addEventListener) {
    // IE9, Chrome, Safari, Opera
    document.getElementById('cryptopairs').addEventListener('mousewheel', scrollMenu, false);
    // Firefox
    document.getElementById('cryptopairs').addEventListener('DOMMouseScroll', scrollMenu, false);
  } else {
    // IE 6/7/8
    document.getElementById('cryptopairs').attachEvent('onmousewheel', scrollMenu);
  }
})();