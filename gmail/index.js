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


function main() {
    // in:T S O
    //const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');
    const query = 'to:note@chimpjuice.com OR to:note@crosshj.com';

    
    async.waterfall([
        callback => getMessages({query}, callback),
        getParts,
        getPartsWrapped,
        getResults
    ], (err, results) => {
        if(err){
            return console.log({err});
        }
        const which = 10;
        console.log(results[which]((e,r)=>{ console.log({e,r})}))
    });
}


console.log('--- app starting up');
main();
