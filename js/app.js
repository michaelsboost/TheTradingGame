// variables
var txt, num, minNum, commas, priceNow,
    countDownTimer, timeleft = 5, payback = 80,
    rememberTxt = '5s', activeTrade = false,
    direction = 'up', openTrade, closeTrade;

// localStorage
function rememberData() {
  localStorage.setItem('currentBalance', balance.textContent);
  localStorage.setItem('currentWager', wager.textContent);

  localStorage.setItem('currentBet', bet.textContent);
  var inMilliSec = parseInt(parseInt(bet.textContent) * 1000);
  $('#bet').attr('data-int', inMilliSec);
  
  localStorage.setItem('pastTrades', $('.tradehistory').html());
  rememberTime();
}
function setData() {
  if (localStorage.getItem('currentBalance')) {
    balance.textContent = localStorage.getItem('currentBalance');
  }
  if (localStorage.getItem('currentWager')) {
    wager.textContent = localStorage.getItem('currentWager');
  }
  if (localStorage.getItem('currentBet')) {
    bet.textContent = localStorage.getItem('currentBet');
    var inMilliSec = parseInt(parseInt(bet.textContent) * 1000);
    $('#bet').attr('data-int', inMilliSec);
  }
  if (localStorage.getItem('pastTrades')) {
    $('.tradehistory').html(localStorage.getItem('pastTrades'));
    if ($('.trade').is(':visible')) {
      $('.tradehistory').removeClass('red');
      WinLossPerc();
    } else {
      winpercent.textContent = '0%';
      winpercent.removeAttribute('class');
      $('.tradehistory').addClass('red');
    }
  }
}
setData();

// win percent
winpercent.onclick = function() {
  var allTrades  = $('.grid .tradehistory .trade').length;
  var winTrades  = $('.grid .tradehistory .trade[data-result=win]').length;
  var lossTrades = $('.grid .tradehistory .trade[data-result=loss]').length;
  if (allTrades === 0) {
    Swal.fire({
      html: "<h1>Win Percentage</h1><span>You are 0% profitable.<br><br><br>All trades have a 80% payback.<br>You would owe approximately $0 in taxes.</span>"
    });
    return false;
  }
  
  num = parseInt(winTrades / allTrades * 100);
  var tradeVals = []
  var taxNum = parseInt(winTrades / allTrades * 100);

  for(i = 0; i < $('.grid .tradehistory .trade[data-result=win] .win').length; i++) {
    var str = $('.grid .tradehistory .trade[data-result=win] .win')[i].textContent;
    str = str.substr(1);
    tradeVals.push(parseInt(str));
  }
  
  var sum = tradeVals.reduce(add, 0);
  function add(accumulator, a) {
    return accumulator + a;
  }
  
  sum = parseInt(parseInt(sum) / 2);
  commas = sum.toLocaleString('en-US');
  commas = sum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  Swal.fire({
    html: "<h1>Win Percentage</h1><span>You are " + num + "% profitable.<br>You've won "+ winTrades +" out of "+ allTrades +" total trades.<br><br><br>All trades have a 80% payback.<br>You would owe approximately $"+ commas +" in taxes.</span>"
  });
};

// change your balance
balance.onclick  = function() {
  if (!activeTrade) {
    Swal.fire({
      title: "Are you sure you wish to reset your balance?",
      text: "This will erase everything!",
      input: "number",
      inputValue: 1000,
      inputAttributes: {
        min: '1'
      }
    }).then((result) => {
      if (result.value) {
        // first reset the balance
        num = result.value;
        commas = num.toLocaleString('en-US');
        commas = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        this.textContent = '$' + commas;
        
        // calculate 25% of the users balance
        var newWager = parseInt(parseInt(num) * .25);
        newWager = newWager.toLocaleString('en-US');
        newWager = newWager.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        wager.textContent = "$" + newWager;
        
        winpercent.textContent = '0%';
        winpercent.removeAttribute('class');

        // now clear the history
        $('.tradehistory').addClass('red').html('<h1 class="nohistory">No Trade History</h1>');
        localStorage.clear();
        localStorage.setItem('currentBalance', balance.textContent);
      }
    });
  } else {
    Swal.fire({
      title: "Cannot Change Balance",
      text: "You cannot change your balance in the middle of a trade.",
      icon: "warning"
    })
  }
};
balance.onchange = function() {
  num = this.textContent;
  commas = num.toLocaleString('en-US');
  commas = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  this.textContent = '$' + commas;
  rememberData();
};

// change your wager
wager.onclick = function() {
  num = balance.textContent.toString();
  num = num.split('\n').join('').replace(/ /g, '');
  num = num.substr(1).replace(/,/g, '');
  num = parseInt(num);
  
  // calculate 10% of the users balance
  minNum = parseInt((10 / 100) * num);
  
  Swal.fire({
    title: "What's your wager?",
    input: "number",
    inputValue: minNum,
    inputPlaceholder: minNum,
    inputAttributes: {
      min: '1',
      max: num
    }
  }).then((result) => {
    if (result.value) {
      num = result.value;
      commas = num.toLocaleString('en-US');
      commas = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      this.textContent = '$' + commas;
      rememberData();
    }
  });
};

// time bet
bet.onclick  = function() {
  txt = this.textContent.toString().toLowerCase();
  txt = txt.split('\n').join('').replace(/ /g, '');
  
  if (txt === '5s') {
    this.textContent = '15s';
  } else if (txt === '15s') {
    this.textContent = '30s';
  } else if (txt === '30s') {
    this.textContent = '1m';
  } else if (txt === '1m') {
    this.textContent = '5m';
  } else if (txt === '5m') {
    this.textContent = '15m';
  } else if (txt === '15m') {
    this.textContent = '30m';
  } else if (txt === '30m') {
    this.textContent = '1h';
  } else if (txt === '1h') {
    this.textContent = '5s';
  } else {
    alertify.error('Error: Bet Undetectable!');
  }
  
  rememberTime();
  rememberTxt = bet.textContent;
  this.onchange();
};
bet.onchange = function() {
  var inMilliSec = parseInt(parseInt(this.textContent) * 1000);
  $(this).attr('data-int', inMilliSec);
  rememberData();
  return false;
};
bet.onchange();

function rememberTime() {
  txt = bet.textContent.toString().toLowerCase();
  txt = txt.split('\n').join('').replace(/ /g, '');
  
  if (txt === '5s') {
    timeleft = 5;
  } else if (txt === '15s') {
    timeleft = 15;
  } else if (txt === '30s') {
    timeleft = 30;
  } else if (txt === '1m') {
    timeleft = 60;
  } else if (txt === '5m') {
    timeleft = 300;
  } else if (txt === '15m') {
    timeleft = 900;
  } else if (txt === '30m') {
    timeleft = 1800;
  } else if (txt === '1h') {
    timeleft = 3600;
  }
}
function startOver() {
  balance.textContent = "$1,000";
  wager.textContent = "$250";
  winpercent.textContent = "0%";
      
  // now clear the history
  $('.tradehistory').addClass('red').html('<h1 class="nohistory">No Trade History</h1>');
  $('.tradingflex a').removeAttr('disabled');
  localStorage.clear();
}
function checkAcct() {
  WinLossPerc();
  
  if (parseInt(balance.textContent) <= 0) {
    Swal.fire({
      title: "OOPS!!!",
      text: "Looks like you lost all your cash. Luckily this isn't real money. Click OK when you're ready to try again.",
      icon: "error"
    }).then((result) => {
      startOver();
    })
  }
  return false;
}
function wonTrade() {
  // remove no trade history
  $('.tradehistory').removeClass('red');
  $('.nohistory').remove();
  
  // grab the balance
  num = balance.textContent.toString();
  num = num.split('\n').join('').replace(/ /g, '');
  num = num.substr(1).replace(/,/g, '');
  currentBal = parseInt(num);
  
  // grab the wager
  num = wager.textContent.toString();
  num = num.split('\n').join('').replace(/ /g, '');
  num = num.substr(1).replace(/,/g, '');
  currentWager = parseInt(num);
  
  // current wager has 80% payback
  currentWager = parseInt(currentWager / 100 * payback);
  
  time = new Date().toLocaleString();
  
  // add new trade
  $('.tradehistory').append('<div class="trade" data-result="win"><div><div class="currency"><i class="fa fa-btc"></i> '+ $('#cryptopairs a.blue').text() +'</div><div><i class="fa fa-envelope-open green"></i> '+ openTrade +'</div><div class="bet"><i class="fa fa-arrow-'+ direction +'"></i> $'+ parseInt(currentBal) +'</div></div><div><div class="time">'+ time +' <i class="fa fa-clock-o"></i></div><div>'+ closeTrade +' <i class="fa fa-envelope green"></i></div><div class="win">+'+ parseInt(currentWager) +' <i class="fa fa-usd"></i></div></div></div>');
  
  // apply new balance
  balance.textContent = parseInt(currentWager + currentBal);
  balance.onchange();
  WinLossPerc();
}
function lostTrade() {
  // remove no trade history
  $('.tradehistory').removeClass('red');
  $('.nohistory').remove();
  
  // grab the balance
  num = balance.textContent.toString();
  num = num.split('\n').join('').replace(/ /g, '');
  num = num.substr(1).replace(/,/g, '');
  currentBal = parseInt(num);
  
  // grab the wager
  num = wager.textContent.toString();
  num = num.split('\n').join('').replace(/ /g, '');
  num = num.substr(1).replace(/,/g, '');
  currentWager = parseInt(num);
  num = parseInt(currentBal - currentWager);
  
  time = new Date().toLocaleString();
  
  // add new trade
  $('.tradehistory').append('<div class="trade" data-result="loss"><div><div class="currency"><i class="fa fa-btc"></i> '+ $('#cryptopairs a.blue').text() +'</div><div><i class="fa fa-envelope-open red"></i> '+ openTrade +'</div><div class="bet"><i class="fa fa-arrow-'+ direction +'"></i> $'+ parseInt(currentBal) +'</div></div><div><div class="time">'+ time +' <i class="fa fa-clock-o"></i></div><div>'+ closeTrade +' <i class="fa fa-envelope red"></i></div><div class="loss">-'+ parseInt(currentWager) +' <i class="fa fa-usd"></i></div></div></div>');
  
  // apply new balance
  balance.textContent = num;
  
  // update wager to new balance
  if (currentWager >= num) {
    commas = num.toLocaleString('en-US');
    commas = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    wager.textContent = '$' + commas;
  
    // check and see if user didnt blow the account
    checkAcct();
  }
  balance.onchange();
  WinLossPerc();
}
function WinLossPerc() {
  var allTrades  = $('.grid .tradehistory .trade').length;
  var winTrades  = $('.grid .tradehistory .trade[data-result=win]').length;
  var lossTrades = $('.grid .tradehistory .trade[data-result=loss]').length;
  num = parseInt(winTrades / allTrades * 100);
  
  winpercent.textContent = num + '%';
  
  if (num > 50) {
    winpercent.className = 'green';
  } else {
    winpercent.className = 'red';
  }
  rememberData();
}

function buildTimer() {
  if(timeleft <= 0){
    clearInterval(countDownTimer);
    bet.textContent = rememberTxt;
  } else {
    bet.textContent = timeleft;
  }
  timeleft -= 1;
}
function watchTimer() {
  clearTimeout(countDownTimer);
  countDownTimer = setInterval(buildTimer, 1000);
  return false;
}
function stopTimer() {
  clearTimeout(countDownTimer);
  bet.textContent = rememberTxt;
  rememberTime();
  return false;
}

// bid long
bidhigh.onclick = function() {
  direction = 'up';
  
  if (!activeTrade) {
    if (!currentPrice) {
      alertify.error("Sorry :( Unable to get the price. Try again!");
      return false;
    }
    priceNow = currentPrice;
    $('.tradingflex a').attr('disabled', true);
    activeTrade = true;
    watchTimer();
    openTrade = priceNow;
    console.log('Long at price ' + openTrade);
//    alertify.log('Long at ' + openTrade);
    setTimeout(function() {
      closeTrade = currentPrice;
      console.log('Closed at price ' + closeTrade);
//      alertify.log('Closed at ' + closeTrade);
      
      if (priceNow < currentPrice) {
        alertify.success('Yay! You Won! Keep it up!');
        stopTimer();
        wonTrade();
        activeTrade = false;
      } else {
        stopTimer();
        lostTrade();
        alertify.error('Oh No! You Lost! Better luck next time.');
        activeTrade = false;
      }
      $('.tradingflex a').removeAttr('disabled');
    }, parseInt($('#bet').attr('data-int')))
  } else {
    Swal.fire({
      title: "Error",
      text: "Cannot place more than 1 trade at a time.",
      icon: "error"
    });
  }
};

// bid short
bidlow.onclick = function() {
  direction = 'down';
  
  if (!activeTrade) {
    if (!currentPrice) {
      alertify.error("Sorry :( Unable to get the price. Try again!");
      return false;
    }
    priceNow = currentPrice;
    $('.tradingflex a').attr('disabled', true);
    activeTrade = true;
    watchTimer();
    openTrade = priceNow;
    console.log('Shorting at price ' + openTrade);
//    alertify.log('Shorting at ' + openTrade);
    setTimeout(function() {
      closeTrade = currentPrice;
      console.log('Closed at price ' + closeTrade);
//      alertify.log('Closed at ' + closeTrade);
      
      if (priceNow > currentPrice) {
        alertify.success('Yay! You Won! Keep it up!');
        stopTimer();
        wonTrade();
        activeTrade = false;
      } else {
        stopTimer();
        lostTrade();
        alertify.error('Oh No! You Lost! Better luck next time.');
        activeTrade = false;
      }
      $('.tradingflex a').removeAttr('disabled');
    }, parseInt($('#bet').attr('data-int')))
  } else {
    Swal.fire({
      title: "Error",
      text: "Cannot place more than 1 trade at a time.",
      icon: "error"
    });
  }
};
