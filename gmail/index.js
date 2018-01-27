var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = {
    googleApp: {
        clientId: '',
        clientSecret: ''
    }
};

function auth(callback){
    passport.use(new GoogleStrategy({
        clientID: config.googleApp.clientId
        , clientSecret: config.googleApp.clientSecret
        , userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
        , callbackURL: config.baseurl + '/oauth2callback'
    }
    , callback));
}

function main(){
    auth(getMessages);
}

function getMessages(accessToken, refreshToken, profile, done) {
    var gmail = new Gmail(accessToken);
    var s = gmail.messages('label:inbox', {format: 'raw'});
    s.on('data', function (d) {
        console.log(d.snippet)
    });
}


main();
