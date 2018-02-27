var passport = require('passport');
var Gmail = require('node-gmail-api');
var config = require('../auth/config');
const cheerio = require('cheerio');
var _ = require('lodash');
var request = require('request');
var fs = require('fs');
var sop = require('simple-object-path');

var async = require('async');
var asyncTree = require('async-tree');

var accessToken = config.accessToken;
var gmail = new Gmail(accessToken);

function decode64(string){
    //return new Buffer(string, 'base64').toString('ascii');
    return new Buffer(string, 'base64').toString('binary');
}

// wrap synchronous code to be handled by async lib
function callbackify(fn){
    return function(args, cb){
        const output = fn(...args);
        cb(null, output);
    }
}

function getAttachment(part, userId, message, callback){
    if(!part.filename || part.filename.length <= 0){
        return;
    }
    
    var attachId = part.body.attachmentId;
    //https://developers.google.com/gmail/api/v1/reference/users/messages/attachments/get
    const url = `https://www.googleapis.com/gmail/v1/users/${userId}/messages/${message.id}/attachments/${attachId}`;
    //console.log(Object.keys(part));
    //console.log(`---- ${part.filename}`);
    var options = {
        url,
        headers: {
            'Authorization': `Bearer ${config.accessToken}`
        }
    };

    const cb = (err, res, body) => {
        try{
            const bodyObj = JSON.parse(body);
            const attachment = bodyObj
                ? bodyObj.data
                : undefined;
            //attachment && console.log({ attachmentLength: attachment.length});
            if(!fs.existsSync('./px')){
                callback('./px not found, no attachments will be saved');
                return;
            }

            fs.writeFile(`./px/${part.filename}`, new Buffer(attachment, 'base64'), 'utf8', (err)=>{
                callback(err, `${part.filename} written`);
                return;
            });
            //callback(part.filename, part.mimeType, attachment);
        } catch(e) {
            console.log(`error parsing attachment body => ${part.filename}`);
            //callback(part.filename, part.mimeType, null);
        }
    };
    //TODO: NO DUPES
    request(options, cb);
}

function getAttachments(userId, message) {
    if(!sop(message, 'payload/parts')){
        return;
    }
    if(!fs.existsSync('./px')){
        //console.log('./px not found, no attachments will be saved');
        return;
    }
    message.payload.parts.forEach(part => {
        getAttachment(part, userId, message, (err, data) => console.log({err, data}));
    });
}

function getLinks(partsWithoutAttachment){
    var links = [];
    partsWithoutAttachment.forEach(thisPart =>{
        var partParts = thisPart.parts;
        if(partParts && partParts.length){
            partParts.forEach(part => {
                if(!sop(part, `body/data`)){
                    console.log(Object.keys(part));
                    return;
                }
                const body = decode64(part.body.data);
                const $ = cheerio.load(body);
            
                $('a').each(function(i, elem) {
                    const linkText = $(this).text();
                    if(linkText.includes('http')){
                        links.push(linkText);
                    }
                });
            })
        } else {
            //mimeType: text/html
            const body = Buffer.from(thisPart.body.data, 'base64').toString('ascii');
            const $ = cheerio.load(body);
            
            $('a').each(function(i, elem) {
                const linkText = $(this).text();
                if(linkText.includes('http')){
                    links.push(linkText);
                }
            });
        }
    });
    return links;
}

function getMessageText(message, messageId){
    //console.log(Object.keys(message.payload));
    const filename = `${messageId}-${message.partId}.html`;
    //console.log(filename);
    const bodyData = sop(message, 'payload/body/data') || sop(message, 'body/data');
    //console.log(message);
    const body = decode64(bodyData);
    const $ = cheerio.load(body);
    //const bodyText = $('body').text().replace(/\n|\t/g,'');
    const bodyText = 'TODO: message text placeholder';

    if(fs.existsSync('./px')){
        fs.writeFile(`./px/${filename}`, body, 'utf8', ()=>{
            console.log(`--- ${filename} written`);
        });
    }

    return { text: bodyText, raw: body, filename, messageId };
}

function resolveMessageOrPart(item, messageId){
    const messageMime = item.mimeType || item.payload.mimeType;
    const messageBodySize = sop(item, 'payload/body/size');
    const messageParts = sop(item, 'payload/parts') || item.parts;

    const asyncGetDunno = dunno => {
        const x = {
            messageId,
            text: dunno
        };
        return function asyncDunno(callback){ return callback(null, x); };
    };
    const asyncGetImage = () => {
        const x = {
            part: item,
            userId: config.userId,
            message: { id: messageId },
            text: item.filename
        };
        function asyncImage(callback){
            getAttachment(x.part, x.userId, x.message, callback);
        };
        asyncImage.args = x;
        return asyncImage;
    };

    // const dunno = item.filename;
    //resolved.push(asyncDunno(dunno));
    const asyncGetText = () => {
        const x = { item, messageId };
        function asyncText(callback) {
            return callback(null, getMessageText(item, messageId));
        }
        asyncText.args = x;
        return asyncText;
    };


    var resolved = [];
    switch (true) {
        case (messageMime.includes('text')): {
            //TODO: don't push quoted text
            const isQuoted = item.headers && item.headers.reduce((all, one)=>{
                return all || one.name === 'Content-Transfer-Encoding'
                    || one.value === 'quoted-printable'
            }, false);
            if(isQuoted){
                break;
            }
            resolved.push(asyncGetText());
            break;
        }
        case (messageMime.includes('multipart/mixed')): {
            //resolved.push('TODO: handle multipart/mixed');
            if(!messageParts){
                const dunno = 'TODO: handle multipart/mixed with no parts';
                resolved.push(asyncGetDunno(dunno));
                //console.log(item);
                break;
            }
            messageParts.forEach(part => {
                resolved.push(resolveMessageOrPart(part, messageId));
            });
            break;
        }
        case (messageMime.includes('multipart/alternative')): {
            //resolved.push('TODO: handle multipart/alternative');
            if(!messageParts){
                const dunno = 'TODO: handle multipart/alternative with no parts';
                resolved.push(asyncGetDunno(dunno));
                //console.log(item);
                break;
            }
            messageParts.forEach(part => {
                resolved.push(resolveMessageOrPart(part, messageId));
            });
            break;
        }
        case (messageMime.includes('multipart/related')): {
            if(!messageParts){
                const dunno = 'TODO: handle multipart/related with no parts';
                resolved.push(asyncGetDunno(dunno));
                //console.log(item);
                break;
            }
            messageParts.forEach(part => {
                resolved.push(resolveMessageOrPart(part, messageId));
            });
            break;
        }
        case (messageMime.includes('application/')):
        case (messageMime.includes('image/')): {
            resolved.push(asyncGetImage());
            //console.log(item);
            break;
        }
        default: {
            resolved.push(`-- mime type not handled : ${JSON.stringify({messageMime, messageId})}`);
        }
    }
    return resolved;
}

function processMessages(allMessages){
    var partsWithoutAttachment = [];
    console.log(`--- stream ended, allMessages.length = ${allMessages.length} `);
    const resolved = [];
    allMessages.forEach(message => {
        //TODO: all messages will be parsed based on mime type?
        resolved.push(resolveMessageOrPart(message, message.id));

        // gets all attachments (does not consider if has text to save)
        //getAttachments(config.userId, message);

        if(!sop(message, 'payload/parts')){
            return;
        }

        // does not have attachment, could have text to save
        message.payload.parts.forEach(part => {
            if(!part.filename){
                partsWithoutAttachment.push(part);
            }
        });
    });

    //console.log(resolved);
    const flatResolved = _.flattenDeep(resolved);
    //console.log(flatResolved.map((x, i) => `${i}: ${x.name}`));
    const testWhich = 4;
    flatResolved[testWhich]((err, data)=>{
        console.log(flatResolved[testWhich].name);
        console.log(flatResolved[testWhich].args);
        if(err){
            return console.log({err});
        }
        console.log(data);
    });


    // get links from all messages
    console.log(`--- done with filenames, parts without attachments: ${partsWithoutAttachment.length}`);

    const links = getLinks(partsWithoutAttachment);
    //console.log(links);
    if(!fs.existsSync('./px')){
        //console.log('./px not found, links file will not be saved');
        return;
    }
    fs.writeFile('lnks.json', JSON.stringify(_.sortBy(_.uniq(links)), null, '\t'), 'utf8', ()=>{
        console.log('--- lnks file written');
    });
}

function main() {
    // in:T S O
    //const query = decode64('aW46VHJhc2ggU3BlY2lhbCBPZmZlcg==');
    const query = 'to:note@chimpjuice.com OR to:note@crosshj.com';

    //var s = gmail.messages(query, {format: 'full'});
    var s = gmail.messages(query, {format: 'full', max: 100});
    var allMessages = [];

    s.on('data', function (message) {
        allMessages = allMessages.concat(message);
    });

    s.on('end', function(){
        processMessages(allMessages)
    });

    s.on('error', function(err){
        console.log(
            err.toString().includes('Invalid Credentials')
                ? 'Error: Invalid Credentials'
                : err
        );
    });
}


console.log('--- app starting up');
main();
