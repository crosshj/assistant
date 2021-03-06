var async = require('async');
var asyncTree = require('async-tree');
var sop = require('simple-object-path');
const formidable = require('express-formidable');
const request = require('request');
var config = require('../auth/config');
var getMessages = require('./getMessages');
var getParts = require('./getParts');
var getPartsWrapped = require('./getPartsWrapped');
var getResults = require('./getResults');

if(config.proxy){
    process.env.HTTPS_PROXY = config.proxy;
    process.env.HTTP_PROXY = config.proxy;
}

function getEmail(query, token, callback){
    async.waterfall([
        callback => getMessages({query, token}, callback),
        getParts,
        getPartsWrapped,
        getResults
    ], (err, results) => {
        if(err){
            return callback({ getEmailError: err });
        }
        const which = 28;
        results[which](callback);
    });
}

// -----------------------------------------------------------------------------

const express = require('express');
// const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require( 'connect-redis' )( session )

const app = express()
const port = process.env.PORT || 3423;

app.use(formidable());

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

function ensureToken(req, res, next) {
    res.header('Cache-Control', 'no-cache');
    const token = sop(req.session, 'passport/user/accessToken');
    if(!token){
        const redirectUrl = 'https://auth.crosshj.com/google';
        const redirectTo = 'https://assistant.crosshj.com' + req.originalUrl;
        req.session && (req.session.redirectTo = redirectTo);
        if(res.noRedirect){
            next();
            return;
        }
        return res.redirect(redirectUrl);
    }
    res.locals.token = token;
    next();
}

//TODO: make web UI fit with backend somehow
app.get('/*', (req, res, next) => {
	//console.log('\n', req.path, '\n')
	const pathToRequest = req.path.includes('/shared/')
		? '/..' + req.path
		: req.path;
	var newurl = 'https://crosshj.com/experiments/assist' + pathToRequest;
	request(newurl)
	.on('response', (res)	=> {
		//console.log(res.headers);
	})
	.on('error', (err) => {
		//console.log('err')
	})
	.pipe(res);
});


app.protect = ensureToken;

app.get('/', ensureToken, (req, res) => {
    // TODO: other reasons why google session fails, should redirect
    // TODO: use many auth methods; redirect to auth chooser (first time?)
    // TODO: dynamic query (and results transform)

    // in:T S O
    //const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');
    const query = 'to:note@chimpjuice.com OR to:note@crosshj.com';
    const token = res.locals.token;

    getEmail(query, token, (error, response ) => {
        if(error){
            const redirectUrl = 'https://auth.crosshj.com/google';
            var redirectTo = 'https://assistant.crosshj.com' + req.originalUrl;
            req.session.redirectTo = redirectTo;
            return res.redirect(redirectUrl);
        }
        res.json({status: 'it worked!'} || response);
    });
});

const keepRoutes = require('./keep/routes');
keepRoutes(app);


app.listen(port, () => console.log(`assistant server running at http://localhost:${port}`));
