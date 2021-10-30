#!/usr/bin/env node

require('dotenv').config();
const pm2 = require('pm2');
const readLastLines = require('read-last-lines');
const fs = require("fs")

let command = process.argv[2]

//commands
switch(command) {
  case "help":
    help();
    break;
  case "start":
    start();
    break;
  case "logs":
    logs();
    break;
  case "restart":
    restart();
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
  default:
    help();
}

function status(){
  pm2.list('frontend', (err, data) => {
    if (err) console.log(err)
    else {
      let id = 0
      for (i in data){
        if (data[i].name == 'frontend') id = data[i].pm_id
      }
      console.log(`Oracle frontend status:`, data[id].pm2_env.status.toUpperCase())
    }
  })
}

function help(){
  console.log(`Commands: \n\nstart \nstop \nrestart \nlogs \nstatus\n\nUse: frontend command`)
}

function logs(){
  pm2.list('frontend', (err, data) => {
    if(err) console.log(err);
    let id = 0
    for (i in data){
      if (data[i].name == 'frontend') id = data[i].pm_id
    }
    console.log(data[id].pm2_env.pm_out_log_path)
    console.log(data[id].pm2_env.pm_err_log_path)
    let logs = ''
    readLastLines.read(data[id].pm2_env.pm_err_log_path, 15)
      .then((lines) => {
        logs += lines
        return readLastLines.read(data[id].pm2_env.pm_out_log_path, 15)
      })
      .then((lines) => {
        logs += lines
        console.log(logs)
        console.log("\nFor live logs, please use command: pm2 logs frontend")
        process.exit(0)
      })
  })
}

function start(){
  pm2.start('index.js', {name: 'frontend'}, (err, proc) => {
    if (err) console.log(err)
    else {
      console.log(`Starting the oracle...`);
      setTimeout(() => { logs() }, 1500)
    }
  })
}

function restart(){
  pm2.restart('frontend', (err, proc) => {
    if (err) console.log(err)
    else console.log(`Restarting the oracle...`)
    process.exit(0)
  })
}

function stop(){
  pm2.stop('frontend', (err, proc) => {
    if (err) console.log(err)
    else console.log(`Shutting down the oracle...`)
    process.exit(0)
  })
}
