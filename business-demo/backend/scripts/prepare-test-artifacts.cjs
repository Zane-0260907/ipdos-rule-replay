const { mkdirSync } = require('node:fs');
const { resolve } = require('node:path');
// Node opens reporter output before loading test files and their hooks.
mkdirSync(resolve(__dirname, '../../artifacts'), { recursive: true });
