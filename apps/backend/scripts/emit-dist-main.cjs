'use strict';
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(
  path.join(dist, 'main.js'),
  "require('./app/main');\n",
);
