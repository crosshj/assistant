const express = require('express');
const passport = require('passport');
const googleAuth = require("passport-google-oauth");

const config = require('./config');

const app = express()
const port = 3421;

passport.use(new googleAuth.OAuth2Strategy.Strategy({
    clientID: config.googleApp.clientId,
    clientSecret: config.googleApp.clientSecret,
    callbackURL: config.baseUrl + '/callback',
    passReqToCallback   : true
}
, function(request, accessToken, refreshToken, profile, done) {
    //TODO: would first do something special here
    done(undefined, {user: profile.id});
}));

// google auth initiate
app.get('/google', passport.authenticate(
    'google',
    //TODO: dynamic scopes?
    { scope: [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.profile.emails.read'
    ]}
));

// google auth callback
app.get( '/google/callback', 
    passport.authenticate(
        'google', 
        { failureRedirect: '/login' },
        function(req, res) {
            // TODO: success, do something special
            res.redirect('/return');
        }
));

app.get('/return', (req, res) => res.send(`TODO: go back to where started, userid = ${req.user}`))

app.get('/', (req, res) => res.send('TODO: root'));

app.listen(port, () => console.log(`auth server running on ${port}`));
