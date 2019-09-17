const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis')(session)
const passport = require('passport');
const path = require('path');

const config = require('./config');

const app = express()
const port = process.env.PORT || 3421;

//TODO: should this be enabled only for specific domains?
const cors = require('cors');
app.use(cors());

app.use(express.static('static'));

/*

example:

https://github.com/mstade/passport-google-oauth2/tree/master/example

https://developers.google.com/identity/protocols/OAuth2

https://console.developers.google.com/apis/credentials


*/


passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});


// GOOGLE ----------------------------------------------------------------------
const googleAuth = require("passport-google-oauth");

const googleAuthConfig = {
  clientID: config.googleApp.clientId,
  clientSecret: config.googleApp.clientSecret,
  callbackURL: config.baseUrl + '/google/callback',
  passReqToCallback: true
};
const googleAuthCallback = (request, accessToken, refreshToken, profile, done) => {
  //TODO: would first do something special here
  console.log({ accessToken, refreshToken });
  const user = Object.assign({}, profile, { accessToken, refreshToken })
  done(null, user);
};
const googleStrategy = new googleAuth.OAuth2Strategy.Strategy(googleAuthConfig, googleAuthCallback);
passport.use(googleStrategy);


// AUTH0 -----------------------------------------------------------------------

var auth0Auth = require('passport-auth0');

const auth0Config = {
  domain: config.auth0.domain,
  clientID: config.auth0.clientId,
  clientSecret: config.auth0.clientSecret,
  callbackURL: config.baseUrl + '/auth0/callback'
};
const auth0Callback = function (accessToken, refreshToken, extraParams, profile, done) {
  // accessToken is the token to call Auth0 API (not needed in the most cases)
  // extraParams.id_token has the JSON Web Token
  // profile has all the information from the user
  return done(null, profile);
};
const auth0Strategy = new auth0Auth(auth0Config, auth0Callback);
passport.use(auth0Strategy);

// -----------------------------------------------------------------------------

//app.use(bodyParser);
//app.use(cookieParser);
app.use(session({
  secret: config.sessionSecret,
  name: 'gAuthSess',
  store: new RedisStore({
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
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/tasks'
    ],
    accessType: 'offline',
    prompt: 'consent'
  }
));

// google auth callback
app.get('/google/callback',
  passport.authenticate(
    'google',
    {
      failureRedirect: '/login',
      successRedirect: '/return'
    }
  ));

app.get('/auth0',
  passport.authenticate('auth0', {}),
  //   function (req, res) {
  //     res.redirect("/");
  //   }
);

app.get('/auth0/callback',
  passport.authenticate(
    'auth0',
    {
      failureRedirect: '/login',
      successRedirect: '/return'
      //TODO: need to set redirectTo in server session where auth0 is being used
    }
  ));

app.get('/return', (req, res) => {
  if (req.session.redirectTo) {
    const returnUrl = req.session.redirectTo;
    delete req.session.redirectTo;
    console.log(`Return to: ${returnUrl}`);
    return res.redirect(returnUrl);
  }
  res.json({ user: req.user, session: req.session });
});

app.get('/', (req, res) =>
  res.sendFile(
    path.join(__dirname, 'static/index.htm')
  )
);

app.listen(port, () => console.log(`auth server running on ${port}`));
