var Gmail = require('node-gmail-api');
var config = require('../auth/config');
var accessToken = config.accessToken;


function getMessages({query}, callback){
    var gmail = new Gmail(accessToken);
    //var s = gmail.messages(query, {format: 'full'});
    var s = gmail.messages(query, {format: 'full', max: 100});
    var allMessages = [];

    s.on('data', function (message) {
        allMessages = allMessages.concat(message);
    });

    s.on('end', function(){
        callback(null, allMessages)
    });

    s.on('error', function(err){
        callback(
            err.toString().includes('Invalid Credentials')
                ? 'Error: Invalid Credentials'
                : err
        );
    });
}

module.exports = getMessages;
