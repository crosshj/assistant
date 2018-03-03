var sop = require('simple-object-path');
var _ = require('lodash');


function resolveMessageOrPart(item, messageId){
    const messageMime = item.mimeType || item.payload.mimeType;
    const messageParts = sop(item, 'payload/parts') || item.parts;
    const messageHeaders = item.headers || sop(item, 'part/headers');
    var resolved = [];
   
    if(messageParts){
        messageParts.forEach(part => {
            resolved.push(resolveMessageOrPart(part, messageId));
        });
        return resolved;
    }

    const isQuoted = messageHeaders && messageHeaders.some(header => {
        return header.name === 'Content-Transfer-Encoding'
            && header.value === 'quoted-printable'
    });
    if(isQuoted){
        return resolved;
    }
    const output = Object.assign({parentId: messageId},  item)
    resolved.push(output);

    return resolved;
}

function getParts(allMessages, callback){
    const resolved = [];
    allMessages.forEach(message => {
        resolved.push(resolveMessageOrPart(message, message.id));
    });
    const flatResolved = _.flattenDeep(resolved);
    callback(null, flatResolved)
}

module.exports = getParts;
