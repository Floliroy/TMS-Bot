require('dotenv').config()

const moment = require('moment')
const basicConsole = console.log
console.log = function(){
    const date = `[${moment(new Date()).format("DD/MM/yyyy - HH:mm:ss")}]`
    Array.prototype.unshift.call(arguments, date)
    basicConsole.apply(this, arguments)
}

const Discord = require('discord.js')
const Ladder = require('./modules/ladder')
const Planning = require('./modules/planning')

const bot = new Discord.Client()
bot.login(process.env.DISCORD_TOKEN)

bot.on('ready', async function(){
    console.log(`LOG: Logged in as ${bot.user.tag}`)
})

bot.on('message', async function(message){
    if(!message.content.startsWith("/") && !message.content.startsWith("!")) return

    if(message.content == "/ladder"){
        Ladder.getImage(message)
    }else if(message.content == "/planning"){
        Planning.getImage(message)
    }else if(message.content == "!set 5" || message.content == "!set5"){
        message.reply("Sadge ...")
    }
})