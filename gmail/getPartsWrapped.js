var sop = require('simple-object-path');
var config = require('../auth/config');
const cheerio = require('cheerio');
const fs = require('fs');
const request = require('request');

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
    const raw = body; //.replace(/\\n/g, '\n');
    return { text: bodyText, raw, filename, messageId };
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

// -----------------------------------------------------------------------------

function getWrapped(item){
    const messageMime = item.mimeType || item.payload.mimeType;
    const messageBodySize = sop(item, 'payload/body/size');
    const messageId = item.parentId;

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

    const asyncGetText = () => {
        const x = { item, messageId };
        function asyncText(callback) {
            return callback(null, getMessageText(item, messageId));
        }
        asyncText.args = x;
        return asyncText;
    };

    var wrapped = undefined;
    switch (true) {
        case (messageMime.includes('text')): {
            wrapped = asyncGetText();
            break;
        }
        case (messageMime.includes('application/')):
        case (messageMime.includes('image/')): {
            wrapped = asyncGetImage();
            break;
        }
        default: {
            const dunno = `-- mime type not handled : ${JSON.stringify({messageMime, messageId})}`;
            wrapped = asyncGetDunno(dunno);
        }
    }
    return wrapped;
}


function getPartsWrapped(parts, callback){
    //console.log(parts[0])
    const results = parts.map(getWrapped);
    //console.log(results[0])
    callback(null, results);
}

module.exports = getPartsWrapped;
