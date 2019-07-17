const recognize = require('./processor')({
    fetchers: [],
    converters: []
});

const queue = [
    'local-file:./2014-06-04_20-09-05.wav',
    'local-folder:./',
    'network-file:\\\\DISKSTATION210J\\msi-wind\\[]_AUDIO_RECORDINGS\\141215_0126\\2014-06-04_20-09-05.wav',
    'network-folder:\\\\DISKSTATION210J\\msi-wind\\[]_AUDIO_RECORDINGS\\141215_0126',
    'url:https://192.168.1.173:5001/fbdownload/2014-06-04_20-09-05.wav?k=9fJH0dJw',
    'dropbox-file:/apps/Easy Voice Recorder/2019-07-16_08-58-20.wav',
    'dropbox-folder:/apps/Easy Voice Recorder/',
];

recognize(queue, (err, data) => {
    if(err){
        console.log({ err, data });
        return;
    }
    console.log(`\n${data.protocol} handler:\n   ${data.location}`)
});