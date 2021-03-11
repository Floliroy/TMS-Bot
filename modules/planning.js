const Canvas = require('canvas')

const Discord = require('discord.js')

const CalendarAPI = require('node-google-calendar')
const calendar = new CalendarAPI({
    serviceAcctId: process.env.GOOGLE_EMAIL,
    key: process.env.GOOGLE_TOKEN.replace(/\\n/g, '\n'),
    timezone: "UTC+02:00"
})
const calendarId = "96vc137se36nv127mj97k3gb10@group.calendar.google.com"

const fs = require('fs')
const moment = require('moment')
moment.locale("fr")

function addText(text, x, y, context, eventName){
    let size = eventName ? 40 : 30
    context.font = `${eventName ? "bold " : ""}${size}px sans-serif`
    let width = context.measureText(text).width
    while(width > 240){
        context.font = `${eventName ? "bold " : ""}${size--}px sans-serif`
        width = context.measureText(text).width
    }
    
    context.fillText(text, x - width/2, y)
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf())
    date.setDate(date.getDate() + days)
    return date
}

Array.prototype.orderByDate = function(){
    this.sort(function(a, b){
        return a.start - b.start
    })
}

module.exports = class Planning{
    static async getImage(message){
        message.delete()

        let firstDay = new Date().addDays(1)
        while(firstDay.getDay() != 1){
            firstDay = firstDay.addDays(-1)
        }
        firstDay.setHours(0, 0, 0)

        const params = {
            timeMin: firstDay.toISOString(),
            showDeleted: false,
            singleEvents: true/*,
            maxResults: 2500*/
        }
        const events = await calendar.Events.list(calendarId, params)

        //Analyse events
        let week = new Map()
        for(let numDay=1 ; numDay<=7 ; numDay++){
            let morning = new Array()
            let afternoon = new Array()
            for(let event of events){
                if(new Date(event.start.dateTime).getDay() == numDay || (new Date(event.start.dateTime).getDay() == 0 && numDay == 7)){
                    if(new Date(event.start.dateTime).getHours() <= 13){
                        morning.push({name: event.summary, start: new Date(event.start.dateTime), end: new Date(event.end.dateTime), description: event.description})
                    }else{
                        afternoon.push({name: event.summary, start: new Date(event.start.dateTime), end: new Date(event.end.dateTime), description: event.description})
                    }
                }
            }
            week.set(numDay, {morning: morning, afternoon: afternoon})
        }
        //Create a 1080p canvas
        const canvas = Canvas.createCanvas(1920, 1080)
        const context = canvas.getContext("2d")
        context.fillStyle = "#000000"

        //Add Wallpaper
        context.drawImage(await Canvas.loadImage("./Planning.png"), 0, 0, canvas.width, canvas.height)
        
        //Add week
        context.font = "40px sans-serif"  
        const weekText = `Semaine du ${moment(firstDay).format("LL")} au ${moment(firstDay.addDays(6)).format("LL")}`
        context.fillText(weekText, 0 + context.measureText(weekText).width/2, 125)

        //Add text
        for(let numDay=1 ; numDay<=7 ; numDay++){
            const day = week.get(numDay)
            const x = numDay*270-120
            let cpt
            function fillHalfDay(halfDay, increment){
                switch(halfDay.length){
                    case 1:
                        addText(halfDay[0].name, x, 400+increment, context, true)
                        if(halfDay[0].description != "#NoHour"){
                            addText(`${moment(halfDay[0].start).format("LT")} à ${moment(halfDay[0].end).format("LT")}`, x, 440+increment, context)
                        }
                        break
                    case 2:
                        cpt = 0
                        for(let event of halfDay){
                            addText(event.name, x, 330+cpt*80+increment, context, true)
                            cpt++
                            if(event.description != "#NoHour"){
                                addText(`${moment(event.start).format("LT")} à ${moment(event.end).format("LT")}`, x, 290+cpt*80+increment, context)
                            }
                            cpt++
                        }
                        addText("-", x, 420+increment, context)
                        break
                    case 3:
                        cpt = 0
                        for(let event of halfDay){
                            addText(event.name, x, 310+cpt*50+increment, context, true)
                            cpt++
                            if(event.description != "#NoHour"){
                                addText(`${moment(event.start).format("LT")} à ${moment(event.end).format("LT")}`, x, 300+cpt*50+increment, context)
                            }
                            cpt++
                        }
                        break
                    default:
                        addText("TV Off", x, 420+increment, context, true)
                        break
                }
            }
            day.morning.orderByDate()
            fillHalfDay(day.morning, 0)   
            day.afternoon.orderByDate()
            fillHalfDay(day.afternoon, 390)           
        }

        //Transform to attachment and send it
        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), "planning.png")
        fs.writeFileSync("../../Shared/planning.png", canvas.toBuffer("image/png"))

        message.channel.send(attachment)
    }
}