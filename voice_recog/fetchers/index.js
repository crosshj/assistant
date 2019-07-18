const fs = require('fs');

/*
    all fetchers ultimately fetch a buffer
*/


// TODO: other fetchers should ultimately pass this with fetched file
function localFile(protocol, location, callback){
    fs.readFile(location, (err, buffer) => {
        callback(err, { protocol, location, buffer })
    });
}

module.exports = {
    'local-file': localFile
};
