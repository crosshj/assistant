var async = require('async');
var asyncTree = require('async-tree');

var config = require('../auth/config');

var getMessages = require('./getMessages');
var getParts = require('./getParts');
var getPartsWrapped = require('./getPartsWrapped');
var getResults = require('./getResults');

if(config.proxy){
    process.env.HTTPS_PROXY = config.proxy;
    process.env.HTTP_PROXY = config.proxy;
}

// in:T S O
//const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');
const query = 'to:note@chimpjuice.com OR to:note@crosshj.com';

function getEmail(){
    async.waterfall([
        callback => getMessages({query}, callback),
        getParts,
        getPartsWrapped,
        getResults
    ], (err, results) => {
        if(err){
            return console.log({err});
        }
        const which = 28;
        results[which](
            (e,r) => {
                console.log({e,r});
            }
        );
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

app.get('/', (req, res) => {
    console.log('-- requesting assistant');
    console.log({ user: req.user });
    return res.json(req.user || { user: 'not found'});
});

app.listen(port, () => console.log(`assistant server running on ${port}`));

