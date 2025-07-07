const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
require('events').EventEmitter.defaultMaxListeners = 500;

const __path = process.cwd();
const code = require('./pair');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/code', code);
app.use('/pair', (req, res) => res.sendFile(path.join(__path, 'public', 'pair.html')));
app.use('/', (req, res) => res.redirect('/pair'));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ Session server running at http://localhost:` + PORT);
});

module.exports = app;
