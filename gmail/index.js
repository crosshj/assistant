var passport = require('passport');
var Gmail = require('node-gmail-api');
var gapi= require('googleapis');
var config = require('../auth/config');
const cheerio = require('cheerio');
var _ = require('lodash');

/*

example:

https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials


*/
var accessToken = config.accessToken;
var gmail = new Gmail(accessToken);

function decode64(string){
    return new Buffer(string, 'base64').toString('binary');
}

function getAttachments(userId, message, callback) {
    var parts = message.payload.parts;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.filename && part.filename.length > 0) {
        var attachId = part.body.attachmentId;
        const getConfig = {
            'id': attachId,
            'messageId': message.id,
            'userId': userId
        };
        console.log(getConfig);
        callback();
        // var request = gapi.client.gmail.users.messages.attachments.get(getConfig);
        // request.execute(function(attachment) {
        //     callback(part.filename, part.mimeType, attachment);
        // });
        }
    }
}

function getMessages() {


    // in:T S O
    const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');

    var s = gmail.messages(query, {format: 'full', max: 100});
    var allMessages = [];
    var partsWithoutAttachment = [];
    s.on('data', function (message) {
        //console.log(Object.keys(d.payload))
        //console.log(d.payload.body)
        allMessages = allMessages.concat(message);
    });
    s.on('end', function(){
        console.log(`--- stream ended, allMessages.length = ${allMessages.length} `);
        allMessages.forEach(message => {
            //https://developers.google.com/gmail/api/v1/reference/users/messages/attachments/get
            getAttachments(config.userId, message, (filename, mimeType, attachment) => {
                console.log(`got attachment: ${filename}`);
            });

            message.payload.parts.forEach(part => {
                if(!part.filename){
                    partsWithoutAttachment.push(part);
                }
            });
        });
        console.log(`--- done with filenames, parts without attachments: ${partsWithoutAttachment.length}`);

        //TODO: do this for all, not just one
        var links = [];
        partsWithoutAttachment.forEach(thisPart =>{
            var partParts = thisPart.parts;
            if(partParts && partParts.length){
                partParts.forEach(part => {
                    const body = decode64(part.body.data);
                    const $ = cheerio.load(body);
                
                    $('a').each(function(i, elem) {
                        const linkText = $(this).text();
                        if(linkText.includes('http')){
                            links.push(linkText);
                        }
                    });
                })
            } else {
                //mimeType: text/html
                const body = Buffer.from(thisPart.body.data, 'base64').toString('ascii');
                const $ = cheerio.load(body);
                
                $('a').each(function(i, elem) {
                    const linkText = $(this).text();
                    if(linkText.includes('http')){
                        links.push(linkText);
                    }
                });
            }
        });
        //console.log(links);
        var fs = require('fs');
        fs.writeFile('links.json', JSON.stringify(_.sortBy(_.uniq(links)), null, '\t'), 'utf8', ()=>{
            console.log('file written');
        });

    })
}


getMessages();
