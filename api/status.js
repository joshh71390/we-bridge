const express = require('express')
var router = express.Router();
const axios = require('axios');
const Web3 = require('web3');

let tokenABI = require("./abi.js")
const web3 = new Web3(process.env.ETHEREUM_ENDPOINT);


router.get("/", async (req, res) => {
  var maxAmount = process.env.MAX_AMOUNT < 0 ? undefined : process.env.MAX_AMOUNT
  res.status(200).json({
    deposit: process.env.HIVE_ACCOUNT,
    minAmount: Number(process.env.MIN_AMOUNT),
    maxAmount: Number(process.env.MAX_AMOUNT),
    contract: process.env.ETHEREUM_CONTRACT_ADDRESS,
    fee: await getFee(),
    hive_token_balance: await getBalance(),
    eth_token_balance: parseFloat(await getSupply()).toFixed(process.env.ETHEREUM_TOKEN_PRECISION),
    token_price_in_eth: await getHETokenPriceInEth(),
    token_symbol: process.env.TOKEN_SYMBOL,
    decimals: process.env.HIVE_TOKEN_PRECISION,
    method: process.env.ETHEREUM_CONTRACT_FUNCTION
  })
})

async function getSupply(){
  if (process.env.ETHEREUM_CONTRACT_FUNCTION == 'mint'){
    let contract = new web3.eth.Contract(tokenABI.ABI, process.env.ETHEREUM_CONTRACT_ADDRESS);
    let totalSupply = await contract.methods.totalSupply().call()
    return totalSupply / 10**process.env.HIVE_TOKEN_PRECISION;
  } else {
    let contract = new web3.eth.Contract(tokenABI.ABI, process.env.ETHEREUM_CONTRACT_ADDRESS);
    let totalSupply = await contract.methods.totalSupply().call()
    let teamTokens = 0
    let addresses = process.env.OTHER_ADDRESSES.split(",")
    for (i in addresses){
      teamTokens += Number(await contract.methods.balanceOf(addresses[i]).call())
    }
    return (totalSupply - teamTokens) / 10**process.env.HIVE_TOKEN_PRECISION;
  }
}

async function getFee(){
  return new Promise(async (resolve, reject) => {
    let address = '0x1F979d06B999D058A6A950452260beaCf2F9d903'
    let amount = 0 * Math.pow(10, process.env.ETHEREUM_TOKEN_PRECISION)
    let gasPrice = await getRecomendedGasPrice()
    let contract = new web3.eth.Contract(tokenABI.ABI, process.env.ETHEREUM_CONTRACT_ADDRESS);
    let estimatedGasFee = await caculateTransactionFee(contract, address, amount, gasPrice)
    let hiveEngineTokenPriceInEther = await getHETokenPriceInEth() //get HE token price in ETH
    let estimatedTransactionFeeInHETokens = parseFloat(estimatedGasFee.etherValue / hiveEngineTokenPriceInEther).toFixed(process.env.HIVE_TOKEN_PRECISION)
    resolve(Number(estimatedTransactionFeeInHETokens))
  })
}

async function caculateTransactionFee(contract, address, amount, gasPrice){
  return new Promise(async (resolve, reject) => {
    let contractFunction = contract.methods[process.env.ETHEREUM_CONTRACT_FUNCTION](address, amount);
    let estimatedGas = await contractFunction.estimateGas({ from: process.env.ETHEREUM_ADDRESS });
    let wei = parseFloat(estimatedGas * gasPrice * 1000000000).toFixed(0)
    let etherValue = Web3.utils.fromWei(wei.toString(), 'ether');
    resolve({
      etherValue: etherValue,
      estimatedGas: estimatedGas
    })
  })
}

function getRecomendedGasPrice(){
  return new Promise((resolve, reject) => {
    axios
      .get(`https://ethgasstation.info/api/ethgasAPI.json?api-key=${process.env.ETH_GAS_STATON_API_KEY}`)
      .then(response => {
        let speed = process.env.ETH_FEE_SPEED
        if (response.data[speed]) resolve(response.data[speed] / 10)
        else reject("data_incorrect")
      })
      .catch(err => {
        reject(err)
      });
  })
}

function getBalance(){
  return new Promise((resolve, reject) => {
    axios.post('https://api.hive-engine.com/rpc/contracts', {
      "jsonrpc": "2.0",
      "method": "find",
      "params": {
        "contract": "tokens",
        "table": "balances",
        "query": {
           "symbol": process.env.TOKEN_SYMBOL,
           "account": process.env.HIVE_ACCOUNT
        }
      },
      "id": 1
    })
    .then(function (response) {
      if (response.data.result.length == 0) resolve(0)
      else resolve(Number(response.data.result[0].balance))
    })
    .catch(function (error) {
      resolve('error')
      console.log(error);
    });
  })
}

async function getHETokenPriceInEth(){
  let hiveEtherRate = await getHiveEtherRate()
  let hiveHETokenRate = await getHiveHETokenRate()
  let etherHETokenRate = parseFloat(hiveEtherRate * hiveHETokenRate).toFixed(8)
  return etherHETokenRate;
}

function getHiveEtherRate(){
  return new Promise((resolve, reject) => {
    axios
      .get('https://api.coingecko.com/api/v3/coins/hive')
      .then((result) => {
        resolve(result.data.market_data.current_price.eth)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function getHiveHETokenRate(){
  return new Promise((resolve, reject) => {
    let url = 'https://api.hive-engine.com/rpc/contracts'
    let params = { 'contract': 'market', 'table': 'buyBook', 'query': { 'symbol': process.env.TOKEN_SYMBOL }, 'limit': 1000, 'offset': 0, 'indexes': [] }
    let request_body = { 'jsonrpc': '2.0', 'id': 1, 'method': 'find', 'params': params }
    axios
      .post(url, request_body)
      .then(async (result) => {
        let price = result.data.result
        resolve(price[price.length - 1].price)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

module.exports = router;
