var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = require('../auth/config');
const cheerio = require('cheerio');

/*

example:

https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials


*/

function getMessages() {
    var accessToken = config.accessToken;
    var gmail = new Gmail(accessToken);

    // in:T S O
    const query = new Buffer('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==', 'base64').toString('binary');

    var s = gmail.messages(query, {format: 'full', max: 100});
    var allParts = [];
    var partsWithoutAttachment = [];
    s.on('data', function (d) {
        //console.log(Object.keys(d.payload))
        //console.log(d.payload.body)
        allParts = allParts.concat(d.payload.parts);
    });
    s.on('end', function(){
        console.log(`--- stream ended, allparts.length = ${allParts.length} `);
        allParts.forEach(part => {
            if(part.filename){
                //https://developers.google.com/gmail/api/v1/reference/users/messages/attachments/get
            //TODO: fetch attachment here
                console.log(`\t${part.filename}`);
            } else {
                partsWithoutAttachment.push(part);
            }
        });
        console.log(`--- done with filenames, parts without attachments: ${partsWithoutAttachment.length}`);

        //TODO: do this for all, not just one
        var thisPart = partsWithoutAttachment[2];
        var partParts = thisPart.parts;
        if(partParts && partParts.length){
            partParts.forEach(part => {
                console.log(part.body.data)
            })
        } else {
            //mimeType: text/html
            const body = Buffer.from(thisPart.body.data, 'base64').toString('ascii');
            const $ = cheerio.load(body);
            var links = [];
            $('a').each(function(i, elem) {
                const linkText = $(this).text();
                if(linkText.includes('http')){
                    links.push(linkText);
                }
            });
            console.log(links);
        }

    })
}


getMessages();
