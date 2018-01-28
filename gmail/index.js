var passport = require('passport');
var Gmail = require('node-gmail-api');
var googleAuth = require("passport-google-oauth");
var config = require('./config');

/*
example - https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials

*/

function auth(callback){
    console.log('------ auth');
    passport.use(new googleAuth.OAuth2Strategy.Strategy({
        clientID: config.googleApp.clientId
        , clientSecret: config.googleApp.clientSecret
        , userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
        , callbackURL: config.baseurl + '/callback'
    }
    , callback));
}

function main(){
    auth(getMessages);
}

function getMessages(accessToken, refreshToken, profile, done) {
    console.log('------ getMessages');
    var gmail = new Gmail(accessToken);
    var s = gmail.messages('label:inbox', {format: 'raw'});
    s.on('data', function (d) {
        console.log(d.snippet)
    });
}


main();
