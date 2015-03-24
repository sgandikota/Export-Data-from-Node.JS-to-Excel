/**
 * Created with JetBrains WebStorm.
 * User: sgandikota
 * Date: 2/28/14
 * Time: 11:42 AM
 * To change this template use File | Settings | File Templates.
 */
//include all the imports required here
var express=require('express')
    ,https=require('https')
    ,http=require('http')
    ,mongoose=require('mongoose')
    ,async=require('async')
    ,mail = require('mail')
    ,mailer=require('mailer')
    ,dateutils= require('date-utils')
    ,request = require('request')
    ,response=require('response')
    ,moment=require('moment')


var app = express();

// Load configurations
var env = process.env.NODE_ENV || 'development'
    , config = require('./config/config')[env]

// Mongo db connection
mongoose.connect(config.db, function(err)
{
    if (err) throw err;
});

mongoose.connection.on("open", function() {
    console.log('Connected to MongoDB!');
});

http.createServer(app).listen(8000, function(){
    console.log("server listening on port 8000" );
    ProcessWMStatusforLast24hrs(request, response);
});

process.on('uncaughtException', function (err) {
    console.log(err);
});

//Process the data from loadlog table to format the html string
function ProcessWMStatusforLast24hrs(req,res)
{

    var Schema = mongoose.Schema;
    var LoadLogSchema = new Schema({
        status : String,
        module : String,
        loaddate : Date
    },{ collection : 'loadlog' })

    var vOutput ;
    var Story  = mongoose.model('loadlog', LoadLogSchema);
    var isoyesterday = Date.today();
    var dt = new Date();
    var dd = dt.getDate();
    var mm = dt.getMonth();
    var yy = dt.getFullYear();
    mm = mm;
    var sdate = new Date(yy, mm, dd);

    console.log('Fetching records for the Date: ' + sdate);

    Story
        .find({'loaddate':{ $gt:sdate}})
        .exec(function (err, story) {
            if (err)
            {
                console.log('Error');
                var vErrorMessage = '<html><b>' + 'Error processsing the Loadlog.' + '</b></html>';
                PrepareEmailNotification(vOutput,req,res);
           }
           else
           {
                var vCount = story.length;
                if (vCount > 0)
                {
                    var ProcessedItems=[];
                    async.forEach(story,processLoadLog)
                    function processLoadLog(eachLoadlog,loadlogCallback)
                    {
                        var vItem='<tr style=\"border: 1px solid black">';
                        vItem += '<td style=\"border: 1px solid black">' + eachLoadlog.module + '</td>';
                        vItem +='<td style=\"border: 1px solid black">' + eachLoadlog.status + '</td>';
                        vItem += '<td style=\"border: 1px solid black">' + moment(eachLoadlog.loaddate).format('MMMM Do YYYY, h:mm:ss a') + '</td>';
                        vItem +='</tr>';
                        ProcessedItems.push(vItem)
                    }
                    var vTRItem='<tr style=\"border: 1px solid black">';
                    vTRItem += '<td style=\"border: 1px solid black; text-align: center;"><b>' + "Module" + '</b></td>';
                    vTRItem +='<td style=\"border: 1px solid black; text-align: center;"><b>' + "Status" + '</b></td>';
                    vTRItem += '<td style=\"border: 1px solid black; text-align: center;"><b>' + "Load Date" + '</b></td>';
                    vTRItem +='</tr>';
                    vOutput = '<html><table style=\"border: 1px solid black">' + vTRItem +  ProcessedItems +  '</table></html>';
                    console.log(vOutput);
                    PrepareEmailNotification(vOutput,req,res);
               }
               else
               {
                   console.log('No Records were found matching the condition loaddate > ' + isoyesterday.toString());
                   vOutput="There are no records processed from the date: " + isoyesterday.toString();
                   PrepareEmailNotification(vOutput,req,res);
               }
            }
        })
}

//Sending the email
function PrepareEmailNotification(htmlStr,req,res)
{
    console.log("Coming to this Send WM Mail") ;
    // setup e-mail data with unicode symbols
     var mailOptions =
    {
        from: "", // sender address
        to:"",   //req.session.user.email , // list of receivers
        //cc:req.session.user.mgremail,
        subject:"Status email",
        html: htmlStr,
        brainStormFlag:true
    }
    SendEmail(req,res,mailOptions);
}


//Sending Email to the DL
var mailer=require('./mailer')
var nodemailer = require("nodemailer");
function SendEmail (req, res, mailOptions)
{
    console.log('coming to mailTo')
    if(mailOptions.brainStormFlag){
        mailer.smtpTransport.sendMail(mailOptions, function(error, response){
            if(error)
                console.log(mailOptions +"   "+error)
            else
            {
                console.log("Message sent: " + response.message);
            }
        });
    }
}
// create reusable transport method (opens pool of SMTP connections)
module.exports.smtpTransport = nodemailer.createTransport("SMTP",{
    host: " ", // hostname
    port: 25 // port for secure SMTP
});

