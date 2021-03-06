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
function cbify(fn){
    const callbacked = (cb, args) => {
        console.log(args);
        const output = fn(...args);
        cb(null, output);
    };
    return function(arguments){
        return (callback) => callbacked(callback, arguments);
    }
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
                fs.writeFile(`./px/${part.filename}`, new Buffer(attachment, 'base64'), 'utf8', ()=>{
                    console.log(`${part.filename} written`);
                });
                //callback(part.filename, part.mimeType, attachment);
            } catch(e) {
                console.log(`error parsing attachment body => ${part.filename}`);
                //callback(part.filename, part.mimeType, null);
            }
        };
        //TODO: NO DUPES
        request(options, cb);
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

function getMessageText(message){
    //console.log(Object.keys(message.payload));
    const bodyData = sop(message, 'payload/body/data') || sop(message, 'body/data');
    //console.log(message);
    const body = decode64(bodyData);
    const $ = cheerio.load(body);
    //const bodyText = $('body').text().replace(/\n|\t/g,'');
    const bodyText = 'TODO: message text placeholder';
    return bodyText;
}

function resolveMessageOrPart(item, messageId){
    const messageMime = item.mimeType || item.payload.mimeType;
    const messageBodySize = sop(item, 'payload/body/size');
    const messageParts = sop(item, 'payload/parts') || item.parts;

    const resolvify = function(){
        resolved.push(cbify(resolveMessageOrPart)(arguments));
    };
    const dunnoify = function(text){
        resolved.push(cbify(function(x){return x;})([text]));
    };

    var resolved = [];
    switch (true) {
        case (messageMime.includes('multipart/mixed')):
        case (messageMime.includes('multipart/alternative')):
        case (messageMime.includes('multipart/related')):
        {
            //resolved.push('TODO: handle multipart/mixed');
            if(!messageParts){
                dunnoify(`TODO: handle ${messageMime} with no parts`);
                //console.log(item);
                break;
            }
            messageParts.forEach(part => resolvify(part, messageId));
            break;
        }
        case (messageMime.includes('application/')):
        case (messageMime.includes('image/')): {
            //TODO: save this
            dunnoify(item.filename);
            break;
        }
        case (messageMime.includes('text')): {
            resolved.push(cbify(getMessageText)([item]));
            break;
        }
        default: {
            dunnoify(`-- mime type not handled : ${JSON.stringify({messageMime, messageId})}`);
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
        getAttachments(config.userId, message);

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
    console.log(resolved[0]);
    // console.log(resolved[0][0]((err, data)=>{
    //     console.log({err, data});
    // }))

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
}


main();
