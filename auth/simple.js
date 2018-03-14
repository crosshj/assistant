const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require( 'connect-redis' )( session )
const passport = require('passport');
const googleAuth = require("passport-google-oauth");

const config = require('./config');

const app = express()
const port = process.env.PORT || 3421;

/*

example:

https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials


*/


passport.serializeUser(function(user, done) {
    done(null, user);
});
  
passport.deserializeUser(function(user, done) {
    done(null, user);
});

const passAuthConfig = {
    clientID: config.googleApp.clientId,
    clientSecret: config.googleApp.clientSecret,
    callbackURL: config.baseUrl + '/google/callback',
    passReqToCallback   : true
};
const passAuthCallback = (request, accessToken, refreshToken, profile, done) => {
    //TODO: would first do something special here
    console.log({ accessToken, refreshToken });
    const user = Object.assign({}, profile, {accessToken, refreshToken})
    done(null, user);
};
passport.use(new googleAuth.OAuth2Strategy.Strategy(passAuthConfig, passAuthCallback));


//app.use(bodyParser);
//app.use(cookieParser);
app.use(session({
    secret: config.sessionSecret,
    name: 'gAuthSess',
    store:  new RedisStore({
		host: 'redis',
		port: 6379
	}),
    resave: false,
    saveUninitialized: true,
    cookie: {
        path: '/',
        domain: '.crosshj.com'
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// google auth initiate
app.get('/google', passport.authenticate(
    'google',
    //TODO: dynamic scopes?
    {
        scope: [
            'https://www.googleapis.com/auth/plus.login',
            'https://www.googleapis.com/auth/plus.profile.emails.read',
            'https://www.googleapis.com/auth/gmail.readonly'
        ],
        accessType: 'offline',
        prompt : 'consent'
    }
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

app.get('/return', (req, res) => {
    if(req.session.redirectTo){
        const returnUrl = req.session.redirectTo;
        delete req.session.redirectTo;
        return res.redirect(returnUrl);
    }
    res.json({ user: req.user, session: req.session });
});

app.get('/', (req, res) => res.send('TODO: root omg'));

app.listen(port, () => console.log(`auth server running on ${port}`));
