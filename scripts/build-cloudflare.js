'use strict';
const fs=require('node:fs');
const headers=require('../vercel.json').headers[0].headers;
fs.writeFileSync('public/_headers','/*\n'+headers.map(({key,value})=>`  ${key}: ${value}`).join('\n')+'\n');
