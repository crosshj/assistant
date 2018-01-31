const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const passport = require('passport');
const googleAuth = require("passport-google-oauth");

const config = require('./config');

const app = express()
const port = 3421;

passport.use(new googleAuth.OAuth2Strategy.Strategy({
    clientID: config.googleApp.clientId,
    clientSecret: config.googleApp.clientSecret,
    callbackURL: config.baseUrl + '/google/callback',
    passReqToCallback   : true
}
, function(request, accessToken, refreshToken, profile, done) {
    //TODO: would first do something special here
    console.log({ accessToken, refreshToken });
    done(null, profile);
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});

//app.use(bodyParser);
//app.use(cookieParser);
app.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {}
}));
app.use(passport.initialize());
app.use(passport.session());

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
        {
            failureRedirect: '/login',
            successRedirect: '/return'
        }
));

app.get('/return', (req, res) => res.json(req.user));

app.get('/', (req, res) => res.send('TODO: root'));

app.listen(port, () => console.log(`auth server running on ${port}`));
