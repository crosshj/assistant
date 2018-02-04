var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = require('../auth/config');

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
    var partsWithoutAttachment = 0;
    s.on('data', function (d) {
        //console.log(Object.keys(d.payload))
        //console.log(d.payload.body)
        allParts = allParts.concat(d.payload.parts);
    });
    s.on('end', function(){
        console.log(`--- stream ended, allparts.length = ${allParts.length} `);
        allParts.forEach(part => {
            if(part.filename){
                console.log(`\t${part.filename}`);
            } else {
                partsWithoutAttachment++;
            }
        });
        console.log(`--- done with filenames, parts without attachments: ${partsWithoutAttachment}`);
    })
}


getMessages();
