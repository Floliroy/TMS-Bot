const {Tft} = require('riotgames-gg')
const tft = new Tft({region: "EUW", apikey: process.env.RIOT_TOKEN})

const Discord = require('discord.js')

const Canvas = require('canvas')

const summoners = new Array(
    ["TMS ACKK", "TFT ACKK"], ["TMS Shacøvid", "TFT Shacøvid"], ["TMS Aaron", "TMS Aaron TFT"], ["TMS Rakluuhr"], ["TMS Konogan"], ["TMS Gazalhi"],
    ["TMS Frobei"], ["TMS Sirutop"], ["TMS Zyguan"], ["TMS Floliroy"], ["TMS Zel"], ["TMS Verigular"], ["TMS Tragoedia"], ["TMS ZepStyle"],  ["TMS Wazzy"],
    ["TMS cripito"], ["TMS Strelok"], ["TMS Naiirod", "TMS NairodTV"], ["TMS Crazy Genius", "Crazy Genius TV"], ["TMS bellae"], ["TMS DobliiX", "DobliiX TFT"]
)

const tierShortcuts = new Map()
tierShortcuts.set("CHALLENGER", {name: "Chall", points:2400})
tierShortcuts.set("GRANDMASTER",{name: "GM",    points:2400})
tierShortcuts.set("MASTER",     {name: "Master",points:2400})
tierShortcuts.set("DIAMOND",    {name: "D",     points:2000})
tierShortcuts.set("PLATINUM",   {name: "P",     points:1600})
tierShortcuts.set("GOLD",       {name: "G",     points:1200})
tierShortcuts.set("SILVER",     {name: "S",     points:800})
tierShortcuts.set("BRONZE",     {name: "B",     points:400})
tierShortcuts.set("IRON",       {name: "F",     points:0})
const rankShortcuts = new Map()
rankShortcuts.set("I",  {name: "1", points:300})
rankShortcuts.set("II", {name: "2", points:200})
rankShortcuts.set("III",{name: "3", points:100})
rankShortcuts.set("IV", {name: "4", points:0})

Array.prototype.orderByElo = function(){
    this.sort(function(a, b){
        return getEloByRank(b.rank) - getEloByRank(a.rank)
    })
}
Map.prototype.getPoints = function(name){
    for(let elem of this.values()){
        if(elem.name == name){
            return elem.points
        }
    }
}

function isMasterPlus(tier){
    return tier == "CHALLENGER" || tier == "GRANDMASTER" || tier == "MASTER" || 
        tier == "Chall" || tier == "GM" || tier == "Master" || tier == "M/GM/Chall"
}

function getEloByRank(rank){
    const args = rank.split(" ")
    const tier = args[0].replace(/\d+/g,'')
    const lps = parseInt(args[1].replace(/\D/g,''))

    if(isMasterPlus(tier)){
        return tierShortcuts.getPoints(tier) + lps
    }else{
        return tierShortcuts.getPoints(tier) + rankShortcuts.getPoints(args[0].replace(/\D/g,'')) + lps
    }
}

async function entriesByName(name){
    try{
        return await tft.League.entriesByName(encodeURI(name))
    }catch(err){
        if(err.response && err.response.status == 429){
            return await entriesByName(name)
        }else{
            return null
        }
    }
}

async function getTftSummonerByName(name) {
    const response = await entriesByName(name)
    const summoner = response[0]
    if(!summoner || summoner.queueType == "RANKED_TFT_TURBO"){
        if(summoner.queueType && summoner.queueType == "RANKED_TFT_TURBO") console.log(response)
        return null
    }
    
    const div = isMasterPlus(summoner.tier) ? "" : rankShortcuts.get(summoner.rank).name
    const rank = `${tierShortcuts.get(summoner.tier).name}${div} ${summoner.leaguePoints}LP`
    return {name: name, rank: rank}
}

function addText(text, x, y, maxWidth, context){
    let size = 40
    context.font = `${size}px LemonMilk`
    let width = context.measureText(text).width
    while(width > maxWidth){
        context.font = `${size--}px LemonMilk`
        width = context.measureText(text).width
    }
    
    context.shadowColor = "black"
    context.shadowBlur = 7
    context.lineWidth = 3
    context.strokeText(text, x - width/2, y)
    context.shadowBlur = 0
    context.fillStyle = "white"
    context.fillText(text, x - width/2, y)
}

module.exports = class Ladder{
    static async getImage(message){
        message.delete()

        const canvas = Canvas.createCanvas(1920, 1080)
        Canvas.registerFont("lemon-milk.otf", { family: "LemonMilk"})
        const context = canvas.getContext("2d")
        
        context.drawImage(await Canvas.loadImage("./Ladder.png"), 0, 0, canvas.width, canvas.height)
    
        let players = new Array()
        for await(let names of summoners){
            let playersIntern = new Array()
            for await(let name of names){
                const player = await getTftSummonerByName(name)
                if(player){
                    playersIntern.push(player)
                }
            }
            playersIntern.orderByElo()
            if(playersIntern[0]){
                players.push(playersIntern[0])
            }
        }
        players.orderByElo()
    
        addText(players[0].name, 960, 300, 245, context)
        addText(players[0].rank, 960, 350, 245, context)
        
        addText(players[1].name, 710, 400, 245, context)
        addText(players[1].rank, 710, 450, 245, context)
    
        addText(players[2].name, 1210, 500, 245, context)
        addText(players[2].rank, 1210, 550, 245, context)
    
        for(let i=3 ; i<8 ; i++){
            addText(players[i].name, -680+i*330, 850, 300, context)
            addText(players[i].rank, -680+i*330, 900, 300, context)
        }
    
        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), "ladder.png")
        message.member.createDM().then(function(DMChannel){
            DMChannel.send(attachment).then(() => console.log(`Ladder Sended to ${message.author.tag}`))
        })

    }
}