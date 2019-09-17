const recognize = require('./processor')({
	fetchers: require('./fetchers'),
	converters: require('./converters')
});

const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
// const bodyParser = require('body-parser');
// const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3423;

function timer(start) {
	if ( !start ) return process.hrtime();
	var end = process.hrtime(start);
	return Math.round((end[0]*1000) + (end[1]/1000000));
}


app.use(fileUpload());

app.get('/', (req, res) => {
	const index =
`
<html>
<body>
	<script>
	function OnSubmitForm(){
		const token = document.tokenForm.token.value;
		document.location = "/translate/" + token;
		//document.tokenForm.token.setAttribute('disabled', true);
		return false;
	}
	</script>
	<pre>
POST /translate -> post a wave file, returns translate token
GET  /translate/:token -> returns a status or a translation
	</pre>
	<form
		ref='uploadForm'
		id='uploadForm'
		action='/translate'
		method='post'
		encType="multipart/form-data">
			<input type="file" name="sampleFile" />
			<input type='submit' value='Upload!' />
	</form>
	<form
		name='tokenForm'
		ref='tokenForm'
		id='tokenForm'
		action='/translate'
		method='get'
		onsubmit="return OnSubmitForm();"
	>
			<input type="text" name="token" />
			<input type='submit' value='Get Translation!' />
	</form>
</body>
</html>
`;

	res.send(index);
});

app.post('/translate', (req, res, next) => {
	//TODO: should return status of NOT READY when server is not up
	const sampleFile = req.files.sampleFile;
	const result = {
		status: 'not implemented',
		token: sampleFile.name
	};
	sampleFile.mv(`./tmp/${sampleFile.name}`, function(err) {
    if (err){
			return next(err);
		}
		res.json(result);
		const queue = [`local-file:./tmp/${sampleFile.name}`];
		const translateTimer = timer();
		recognize(queue, (err, data) => {
			if(err){
					return console.log({ err, data });
			}
			console.log(`\n${data.protocol} handler:\n   ${data.location}`);
			const { protocol, location, buffer } = data;
			const { hypstr, bestScore, prob } = data;
			// TODO: this would be stored some place for /translate to retrieve later
			if(hypstr){
				const filename = (() => {
					const slashSplit = location.split('/');
					return slashSplit[slashSplit.length -1].replace('.wav', '');
				})();
				console.log(`${/*Converter output:*/''}${filename}:\n${hypstr}\n`);
				console.log(`Took ${timer(translateTimer)}ms\n`)
			}
			const translateFileName = `./tmp/${sampleFile.name}.translate.json`;
			const translateFileContents = JSON.stringify(Object.assign({},
				data,
				{ time: timer(translateTimer) }
			), null, 2);
			fs.writeFile(translateFileName, translateFileContents, (err) => {
				if (err) throw err;
				console.log(`${translateFileName} written to file`);
			});
		});
  });
});

app.get('/translate/:token', (req, res) => {
	const translateFileName = `./tmp/${req.params.token}.translate.json`;
	fs.readFile(translateFileName, 'utf8', (err, result) => {
		res.json(err || JSON.parse(result));
	});
});

app.listen(port, () => {
	console.log(`\ntest voice recognition server running at http://localhost:${port}\n`);
});

