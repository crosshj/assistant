var ps = require('pocketsphinx').ps;

var config = new ps.Decoder.defaultConfig();

const models = {
	standard: () => {
		modeldir = __dirname + "/pocketsphinx/model/en-us/"
		config.setString("-hmm", modeldir + "en-us");
		config.setString("-dict", modeldir + "cmudict-en-us.dict");
		config.setString("-lm", modeldir + "en-us.lm.bin");
		//config.setString("-lm", modeldir + "en-70k-0.2.lm");
		//config.setString("-remove_noise", "no");  //causes crash
		//config.setString("-logfn", "/dev/null");
	},
	fastCustom: () => {
		modeldir = __dirname + "/training/";
		config.setString("-hmm", modeldir + "en-us-adapt");
		config.setString("-dict", modeldir + "cmudict-en-us.dict");
		config.setString("-lm", modeldir + "en-us.lm.bin");
		config.setString("-mllr", modeldir + "mllr_matrix");
	},
	slowCustom: () => {
		modeldir = __dirname + "/training/";
		config.setString("-hmm", modeldir + "en-us-adapt");
		config.setString("-dict", modeldir + "cmudict-en-us.dict");
		config.setString("-lm", modeldir + "en-70k-0.2.lm");
		config.setString("-mllr", modeldir + "mllr_matrix");
	}
};


const modelToUse = 'slowCustom';
(models[modelToUse] || models['standard'])();

console.log(`--- converting using ${modelToUse} model`);
config.setString("-logfn", "/dev/null");

var decoder = new ps.Decoder(config);

module.exports = (buffer, callback) => {
	//console.log('Converting...');
	decoder.startUtt();
	decoder.processRaw(buffer, false, false);
	decoder.endUtt();
	const { prob, bestScore, hypstr } = decoder.hyp();
	callback(undefined, { prob, bestScore, hypstr });
};