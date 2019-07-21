const recognize = require('./processor')({
    fetchers: require('./fetchers'),
    converters: require('./converters')
});

const queue = [
		'local-file:./converters/sphinx/training/arctic_0001.wav',
		'local-file:./converters/sphinx/training/arctic_0002.wav',
		'local-file:./converters/sphinx/training/arctic_0003.wav',
		'local-file:./converters/sphinx/training/arctic_0004.wav',
		'local-file:./converters/sphinx/training/arctic_0005.wav',
		'local-file:./converters/sphinx/training/arctic_0006.wav',
		'local-file:./converters/sphinx/training/arctic_0007.wav',
		'local-file:./converters/sphinx/training/arctic_0008.wav',
		'local-file:./converters/sphinx/training/arctic_0009.wav',
		'local-file:./converters/sphinx/training/arctic_0010.wav',
		'local-file:./converters/sphinx/training/arctic_0011.wav',
		'local-file:./converters/sphinx/training/arctic_0012.wav',
		'local-file:./converters/sphinx/training/arctic_0013.wav',
		'local-file:./converters/sphinx/training/arctic_0014.wav',
		'local-file:./converters/sphinx/training/arctic_0015.wav',
		'local-file:./converters/sphinx/training/arctic_0016.wav',
		'local-file:./converters/sphinx/training/arctic_0017.wav',
		'local-file:./converters/sphinx/training/arctic_0018.wav',
		'local-file:./converters/sphinx/training/arctic_0019.wav',
		'local-file:./converters/sphinx/training/arctic_0020.wav',


		// Shaw, those twelve beige hooks are joined if I patch a young,
		// gooey mouth.
		'local-file:./converters/sphinx/training/arctic_shaw-mouth.wav',

		// Are those shy Eurasian footwear, cowboy chaps,
		// or jolly earthmoving headgear?
		'local-file:./converters/sphinx/training/arctic_shy-footwear.wav',

		// With tenure, Suzie’d have all the more leisure for yachting,
		// but her publications are no good.
		'local-file:./converters/sphinx/training/arctic_suzie-yacht.wav',

		// The beige hue on the waters of the loch impressed all,
		// including the French queen, before she heard that symphony
		// again, just as young Arthur wanted.
		'local-file:./converters/sphinx/training/arctic_symphony-again.wav',

		'local-file:./recordings/sample.wav',

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
		//console.log(`\n${data.protocol} handler:\n   ${data.location}`);
    const { protocol, location, buffer } = data;
    if(buffer){
        console.log(JSON.stringify({
            handler: protocol,
            location: location,
            buffer: buffer.slice(0, 20).toString() + '...'
        }, null, '   '));
		}
		const { hypstr, bestScore, prob } = data;
		if(hypstr){
			const filename = (() => {
				const slashSplit = location.split('/');
				return slashSplit[slashSplit.length -1].replace('.wav', '');
			})();
			console.log(`${/*Converter output:*/''}${filename}:\n${hypstr}\n`);
		}
});