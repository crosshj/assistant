var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = require('../auth/config');
const cheerio = require('cheerio');
var _ = require('lodash');
var request = require('request');
var fs = require('fs');

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

function getAttachments(userId, message) {
    message.payload.parts.forEach(part => {
        if(!part.filename || part.filename.length <= 0){
            return;
        }
        
        var attachId = part.body.attachmentId;
        //https://developers.google.com/gmail/api/v1/reference/users/messages/attachments/get
        const url = `https://www.googleapis.com/gmail/v1/users/${userId}/messages/${message.id}/attachments/${attachId}`;
        //console.log(Object.keys(part));
        //console.log(`---- ${part.filename}`);
        var options = {
            url,
            headers: {
                'Authorization': `Bearer ${config.accessToken}`
            }
        };

        const cb = (err, res, body) => {
            try{
                const bodyObj = JSON.parse(body);
                const attachment = bodyObj
                    ? bodyObj.data
                    : undefined;
                //attachment && console.log({ attachmentLength: attachment.length});
                fs.writeFile(`./px/${part.filename}`, new Buffer(attachment, 'base64'), 'utf8', ()=>{
                    console.log(`${part.filename} written`);
                });
                //callback(part.filename, part.mimeType, attachment);
            } catch(e) {
                console.log(`error parsing attachment body => ${part.filename}`);
                //callback(part.filename, part.mimeType, null);
            }
        };
        //TODO: NO DUPES
        request(options, cb);
    });
}

function getMessages() {
    // in:T S O
    const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');

    var s = gmail.messages(query, {format: 'full', max: 100});
    var allMessages = [];
    var partsWithoutAttachment = [];

    s.on('data', function (message) {
        allMessages = allMessages.concat(message);
    });

    s.on('end', function(){
        console.log(`--- stream ended, allMessages.length = ${allMessages.length} `);
        allMessages.forEach(message => {
            getAttachments(config.userId, message);

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
        fs.writeFile('lnks.json', JSON.stringify(_.sortBy(_.uniq(links)), null, '\t'), 'utf8', ()=>{
            console.log('--- lnks file written');
        });

    })
}


getMessages();
