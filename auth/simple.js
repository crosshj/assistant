const express = require('express')
const app = express()

app.get('/', (req, res) => res.send('Hello World!'))

app.listen(3421, () => console.log('Example app listening on port 3421!'))
