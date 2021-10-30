var deposit_account;
var min_amount;
var max_amount;
var fee;
var symbol;
var decimals;
var eth_method;
var contract;

function getConfig(){
  $.ajax({
    url : '/status',
    type : 'GET',
    dataType:'json',
    success : function(data) {
      deposit_account = data.deposit
      min_amount = data.minAmount
      max_amount = data.maxAmount
      fee = data.fee
      symbol = data.token_symbol
      decimals = data.decimals
      eth_method = data.method
      contract = data.contract
    },
    error : function(request,error){
        alert("Failed to get data from server :(");
    }
  });
}

async function isEthereumAddressCorrect(){
  await getConfig()
  var web3 = new Web3(Web3.givenProvider || "ws://localhost:8546");
  try {
    let raw_address = document.getElementById("eth").value
    const address = web3.utils.toChecksumAddress(raw_address)
    document.getElementById("invalid_eth_address").innerHTML = ''
    processHiveDeposit(address)
  } catch(e) {
    console.error('Invalid ethereum address:', e.message)
    document.getElementById("invalid_eth_address").innerHTML = 'Please provide a valid Ethereum address.'
  }
}

async function processHiveDeposit(address){
  let symbol = document.getElementById("symbol").innerText
  Swal.fire({
    text: 'How much '+symbol+' would you like to deposit?',
    input: 'text',
  }).then(async function(result) {
    if (!isNaN(result.value)) {
      Swal.fire({
        text: 'What is your username?',
        input: 'text',
      }).then(async function(username) {
        const amount = parseFloat(result.value).toFixed(decimals)
        if (amount > max_amount || amount < min_amount) alert("Max amount is "+max_amount+" and min amount is "+min_amount)
        else {
          Swal.fire({text: 'You will receive a minimum of '+(Number(amount) - Number(fee) - (Number(amount) * 0.0025))+' W'+symbol+' (part of the fee might be refunded)! If amount is less than 0, it will be refunded.', showCancelButton: true,}).then((isConfirmed) => {
            if (isConfirmed.isConfirmed){
              if(window.hive_keychain) {
                requestKeychain(amount, address, username.value)
              } else {
                requestHiveSigner(amount, address)
              }
            }
          })
        }
      })
    } else alert("use numbers")
  })
}

function requestKeychain(amount, address, username){
  let json = {
    contractName: 'tokens',
    contractAction: 'transfer',
    contractPayload: {
      symbol: symbol,
      to: deposit_account,
      quantity: parseFloat(amount).toFixed(decimals),
      memo: address
    }
  }
  json = JSON.stringify(json)
  hive_keychain.requestCustomJson(username, 'ssc-mainnet-hive', 'Active', json, symbol+' transfer', function(response) {
  	console.log(response);
  });
}

function requestHiveSigner(amount, address){
  let symbol = document.getElementById("symbol").innerText
  Swal.fire({
    text: 'What is you HIVE username?',
    input: 'text'
  }).then(function(result) {
    let json = {
      contractName: 'tokens',
      contractAction: 'transfer',
      contractPayload: {
        symbol: symbol,
        to: deposit_account,
        quantity: parseFloat(amount).toFixed(decimals),
        memo: address
      }
    }
    json = JSON.stringify(json)
    let domain = location.protocol + "//" + location.host
    let url = `https://hivesigner.com/sign/custom-json?authority=active&required_auths=["${result.value}"]&required_posting_auths=[]&id=ssc-mainnet-hive&json=${encodeURIComponent(json)}&redirect_uri=`+domain
  	var win = window.open(url, '_blank');
    win.focus();
  })
}

async function displayDetails(){
  let username = document.getElementById("hive").value
  let isCorrect = await verifyHiveUsername(username)
  if (isCorrect != 'found') alert('Please verify your Hive username is correct!')
  else {
    var html = `<div class="row">
      <div class="col-md-2">
      </div>
      <div class="col-md-8">
        <div class="main-card mb-3 card">
          <div class="card-body"><h4 class="card-title">Deposit details</h4>
            <button class="mt-1 btn" onClick='requestMetaMask("${username}")'><img srcset="/assets/images/metamask.png 10x"></button>
          </div>
        </div>
      </div>
      <div class="col-md-2">
      </div>
    </div>`
    document.getElementById('deposit_data').innerHTML = html
  }
}

function verifyHiveUsername(username){
  return new Promise((resolve, reject) => {
    hive.api.getAccounts([username], function(err, result) {
      if (err) resolve('error')
      else if (result.length == 0) resolve('not_found')
      else resolve('found')
    });
  })
}

// document.addEventListener('DOMContentLoaded', async function() {
//   await getConfig()
//   if (localStorage.getItem("disclaimer") != 'true'){
//     Swal.fire({
//       title: 'Disclaimer',
//       html: "This app is still in beta, use at your own risk!<br><small>You will not see this message again</small>",
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#3085d6',
//       cancelButtonColor: '#d33',
//       confirmButtonText: 'I understand!'
//     }).then((result) => {
//       if (result.value) {
//         localStorage.setItem("disclaimer", 'true');
//       } else {
//         window.location.href = "http://hive.io";
//       }
//     })
//   }
// }, false);

async function requestMetaMask(username){
  let symbol = document.getElementById("symbol").innerText
  if (typeof window.ethereum !== 'undefined') {
    let accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    Swal.fire({
      text: 'How much W'+symbol+' would you like to send?',
      input: 'text'
    }).then(function(result) {
      if (!isNaN(result.value)) {
        const amount = parseFloat(result.value).toFixed(3)
        sendTx(account, amount, username)
      } else alert("use numbers")
    })
  } else {
    alert("MetaMask is not installed!")
  }
}

async function sendTx(account, amount, username){
  await getConfig()
  let eth_method = document.getElementById("function").innerText
  let decimals = document.getElementById("tokenDecimals").innerText
  let function_name = 'convertTokenWithBurn';
  let contract = document.getElementById('contract').innerText
  console.log(contract)
  if (!contract) contract = '0x73A9fb46e228628f8f9BB9004eCa4f4F529D3998' //LEO contract
  if (eth_method == 'mint') function_name = 'convertTokenWithBurn'
  if (eth_method == 'transfer') function_name = 'convertTokenWithTransfer'
  let abiArray = await getAbiArray()
  const Web3 = window.Web3;
  const web3 = new Web3(window.web3.currentProvider);
  var contractObject = new web3.eth.Contract(abiArray, contract);
  let tokenAmount = amount * Math.pow(10, decimals)
  console.log(amount, decimals)
  const contractFunction = contractObject.methods[function_name](tokenAmount, username);
  const functionAbi = contractFunction.encodeABI();
  const transactionParameters = {
    nonce: '0x00', // ignored by MetaMask
    to: contract, // Required except during contract publications.
    from: account, // must match user's active address.
    data: functionAbi, // Optional, but used for defining smart contract creation and interaction.
    chainId: 1, // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
    gas: '0x186A0'
  };
  console.log(transactionParameters, contract)
  // txHash is a hex string
  // As with any RPC call, it may throw an error
  const txHash = await ethereum.request({
    method: 'eth_sendTransaction',
    params: [transactionParameters],
  });
  alert("Transaction sent! Please note it will be processed after 12 confirmations. Hash: "+ txHash)
}

function getAbiArray(){
  return [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"MinterAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"MinterRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"account","type":"address"}],"name":"PauserRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"string","name":"username","type":"string"}],"name":"convertToken","type":"event"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"addPauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"username","type":"string"}],"name":"convertTokenFromWithBurn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"username","type":"string"}],"name":"convertTokenWithBurn","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"username","type":"string"}],"name":"convertTokenWithTransfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isMinter","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"isOwner","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"pause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"removeMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"removePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceMinter","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renouncePauser","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"unpause","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}]
}
