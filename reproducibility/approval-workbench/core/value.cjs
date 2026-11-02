'use strict';
const {createHash}=require('node:crypto');
function canonical(v){
 if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
 if(typeof v==='number'){if(!Number.isSafeInteger(v))throw Error('Only safe integer numbers are supported');return String(v);}
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
 throw Error('Unsupported JSON value');
}
const digest=v=>createHash('sha256').update(canonical(v)).digest('hex');
const clone=v=>JSON.parse(JSON.stringify(v));
const equal=(a,b)=>canonical(a)===canonical(b);
function integer(v){if(!Number.isSafeInteger(v))throw Error('Expected a safe integer');return v;}
function add(a,b){return integer(integer(a)+integer(b));}
function mul(a,b){return integer(integer(a)*integer(b));}
function ceilDiv(a,b){integer(a);integer(b);if(a<0||b<=0)throw Error('ceilDiv expects nonnegative numerator and positive denominator');return integer(Math.floor(a/b)+(a%b?1:0));}
module.exports={canonical,digest,clone,equal,integer,add,mul,ceilDiv};
