// Fail fast with an exact line/column when the inline app script has invalid JavaScript.
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i.exec(html);
if(!m)throw new Error('inline script not found');
try{new vm.Script(m[1],{filename:'index-inline.js'});console.log('index inline syntax: OK');}
catch(e){console.error(e&&e.stack||e);process.exit(1);}
