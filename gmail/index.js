var passport = require('passport');
var Gmail = require('node-gmail-api');
var googleAuth = require("passport-google-oauth");
var config = require('../auth/config');

/*
example - https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials

*/

function getMessages() {
    var accessToken = config.accessToken;
    var gmail = new Gmail(accessToken);

    // in:T S O
    const query = new Buffer('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==', 'base64').toString('binary');

    var s = gmail.messages(query, {format: 'full', max: 100});
    s.on('data', function (d) {
        //console.log(Object.keys(d.payload))
        //console.log(d.payload.body)
        console.log(d.payload.parts);
    });
}


getMessages();
