var fs = require('fs');

var ps = require('pocketsphinx').ps;

modeldir = __dirname + "/pocketsphinx/model/en-us/"

var config = new ps.Decoder.defaultConfig();
config.setString("-hmm", modeldir + "en-us");
config.setString("-dict", modeldir + "cmudict-en-us.dict");
config.setString("-lm", modeldir + "en-us.lm.bin");
//config.setString("-logfn", "/dev/null");
var decoder = new ps.Decoder(config);

const fileToRead = "./recordings/sample.wav";
const testFile = __dirname + "/pocketsphinx/test/data/goforward.raw";

fs.readFile(fileToRead, function(err, data) {
    if (err) throw err;
    decoder.startUtt();
    decoder.processRaw(data, false, false);
		decoder.endUtt();
		const { prob, bestScore, hypstr } = decoder.hyp();
    console.log({ prob, bestScore, hypstr })
});