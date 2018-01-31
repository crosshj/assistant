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
    console.log('------ getMessages');
    var accessToken = config.accessToken;
    var gmail = new Gmail(accessToken);
    var s = gmail.messages('label:inbox', {format: 'raw'});
    s.on('data', function (d) {
        console.log(d.snippet)
    });
}


getMessages();
