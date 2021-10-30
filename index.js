var express =  require("express");
var app = express();
var bodyParser = require("body-parser");
var toobusy = require('node-toobusy');
var serveStatic = require('serve-static')
var path = require('path')
const rateLimit = require("express-rate-limit");
require('dotenv').config();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(function(req, res, next) {
  if (toobusy()) res.status(503).send("I'm busy right now, sorry.");
  else next();
});
app.disable('x-powered-by');
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
app.use(serveStatic(path.join(__dirname, 'frontend')))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(limiter);
app.set('view engine', 'ejs');

var tokenPlatforms = ''
var platformConfig = require("./platforms.json").platforms

function prepareTokenPlatforms(){
  tokenPlatforms = ''
  for (i in platformConfig){
    tokenPlatforms += `<li>
    <a href="${platformConfig[i].url}" target="_blank">
    <i class="metismenu-icon fa ${platformConfig[i].fa_icon}"></i>
      ${platformConfig[i].name}
      </a>
    </li>`
  }
}

app.get('/', async (req, res) => {
  await prepareTokenPlatforms()
  res.render('index', {
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    tokenDecimals: process.env.HIVE_TOKEN_PRECISION,
    tokenContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
    tokenPlatforms: tokenPlatforms,
    color: process.env.COLOR,
    functionName: process.env.ETHEREUM_CONTRACT_FUNCTION
  })
})

app.get('/verify', async (req, res) => {
  await prepareTokenPlatforms()
  res.render('verify', {
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    tokenDecimals: process.env.HIVE_TOKEN_PRECISION,
    tokenContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
    tokenPlatforms: tokenPlatforms,
    hiveDepositAddress: process.env.HIVE_ACCOUNT,
    color: process.env.COLOR
  })
})

app.get('/faq', async (req, res) => {
  await prepareTokenPlatforms()
  res.render('faq', {
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    tokenDecimals: process.env.HIVE_TOKEN_PRECISION,
    tokenContractAddress: process.env.ETHEREUM_CONTRACT_ADDRESS,
    tokenPlatforms: tokenPlatforms,
    hiveDepositAddress: process.env.HIVE_ACCOUNT,
    contactLink: process.env.CONTACT_LINK,
    color: process.env.COLOR
  })
})

app.use('/price', require('./api/price.js'))
app.use('/status', require('./api/status.js'));

app.listen(8080)
