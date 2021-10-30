function getConfig(cb){
  $.ajax({
    url : '/status',
    type : 'GET',
    dataType:'json',
    success : function(data) {
      cb(data.deposit, data.contract, data.hive_token_balance, data.eth_token_balance, data.token_price_in_eth)
    },
    error : function(request,error){
        alert("Failed to get data from server :(");
    }
  });
}


async function getBalance(){
  getConfig((account, contract, hive_balance, eth_balance, price) => {
    let number_hive = hive_balance.toString().split('.')
    let number_eth = eth_balance.toString().split('.')
    document.getElementById("hive_balance").innerHTML = numberWithCommas(number_hive[0]) + '<small>.'+number_hive[1].split(" ")[0]+'</small>'
    document.getElementById("hive_account").innerHTML = '<a href="https://hiveblocks.com/@'+account+'" target="_blank">@'+account+'</a>'
    document.getElementById("whive_balance").innerHTML = numberWithCommas(number_eth[0]) + '<small>.'+number_eth[1].split(" ")[0]+'</small>'
    document.getElementById('eth_addresses').innerHTML += '<li class="list-group-item"><a href="https://etherscan.io/address/'+contract+'" target="_blank">'+contract+'</a></li>'
    getPrice(contract, price, eth_balance)
  })
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function getPrice(balance, priceInEth, eth_balance){
  $.ajax({
    url : 'https://api.coingecko.com/api/v3/coins/ethereum',
    type : 'GET',
    dataType:'json',
    success : function(data) {
      let value = (data.market_data.current_price.usd * priceInEth * eth_balance).toString()
      value = parseFloat(value).toFixed(3).split(".")
      document.getElementById("price").innerHTML =numberWithCommas(value[0]) + '<small>.'+value[1].slice(0, 3)+'</small>'
    },
    error : function(request,error){
        alert("Failed to get data from server :(");
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  getBalance()
}, false);
