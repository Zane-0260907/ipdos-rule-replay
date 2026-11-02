'use strict';
const fields=p=>p.op==='and'||p.op==='or'?[...new Set(p.args.flatMap(fields))]:[p.field];
function validate(p,depth=0){
 if(!p||depth>12)throw Error('Predicate outside finite grammar');
 if(['and','or'].includes(p.op)){if(!Array.isArray(p.args)||!p.args.length||p.args.length>16)throw Error('Invalid predicate arity');p.args.forEach(x=>validate(x,depth+1));return;}
 if(!['eq','ne','lt','lte','gt','gte','isNull','notNull'].includes(p.op)||!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(p.field))throw Error('Unsupported predicate');
 if(!['isNull','notNull'].includes(p.op)&&!['string','number','boolean'].includes(typeof p.value)&&p.value!==null)throw Error('Predicate literal required');
}
function truth(p,row){
 if(!row)return false;
 if(p.op==='and'){const x=p.args.map(a=>truth(a,row));return x.includes(false)?false:x.includes(null)?null:true;}
 if(p.op==='or'){const x=p.args.map(a=>truth(a,row));return x.includes(true)?true:x.includes(null)?null:false;}
 const v=row[p.field],nil=v===null||v===undefined;
 if(p.op==='isNull')return nil;if(p.op==='notNull')return !nil;
 if(nil||p.value===null)return null;
 if(p.op==='eq')return typeof v===typeof p.value&&v===p.value;
 if(p.op==='ne')return typeof v!==typeof p.value||v!==p.value;
 if(typeof v!==typeof p.value||!['number','string'].includes(typeof v))return null;
 return ({lt:()=>v<p.value,lte:()=>v<=p.value,gt:()=>v>p.value,gte:()=>v>=p.value})[p.op]();
}
const matches=(p,row)=>truth(p,row)===true;
module.exports={fields,validate,truth,matches};
