'use strict';
const {DatabaseSync}=require('node:sqlite');
const {mkdirSync}=require('node:fs');
const {dirname}=require('node:path');
const {randomUUID}=require('node:crypto');
const {canonical,digest,clone,equal}=require('./value.cjs');
const {matches}=require('./predicate.cjs');
class FactStore{
 constructor(filename){
  this.filename=filename;if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});this.db=new DatabaseSync(filename);this.depth=0;this.resetStats();
  this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1000;
   CREATE TABLE IF NOT EXISTS meta(id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, generation TEXT NOT NULL, journal_floor INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS facts(table_name TEXT NOT NULL,row_key TEXT NOT NULL,body TEXT NOT NULL,versions TEXT NOT NULL,birth_rev INTEGER NOT NULL,row_rev INTEGER NOT NULL,PRIMARY KEY(table_name,row_key));
   CREATE TABLE IF NOT EXISTS changes(seq INTEGER PRIMARY KEY,table_name TEXT NOT NULL,row_key TEXT NOT NULL,before_body TEXT,after_body TEXT,changed_fields TEXT NOT NULL);
   CREATE INDEX IF NOT EXISTS changes_table_seq ON changes(table_name,seq);
   CREATE INDEX IF NOT EXISTS changes_key_seq ON changes(table_name,row_key,seq);
   CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY,workflow TEXT NOT NULL,context TEXT NOT NULL,intent_revision INTEGER NOT NULL,status TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,revision INTEGER NOT NULL,contract_hash TEXT NOT NULL,body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS previews(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,actor TEXT NOT NULL,body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL,clause_id TEXT NOT NULL,actor TEXT NOT NULL,snapshot_id TEXT NOT NULL REFERENCES snapshots(id),body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS approval_heads(draft_id TEXT NOT NULL,clause_id TEXT NOT NULL,actor TEXT NOT NULL,approval_id TEXT NOT NULL REFERENCES approvals(id),PRIMARY KEY(draft_id,clause_id,actor));
   CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,draft_id TEXT NOT NULL UNIQUE,body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS outcomes(actor TEXT NOT NULL,request_key TEXT NOT NULL,request_hash TEXT NOT NULL,receipt_id TEXT NOT NULL REFERENCES receipts(id),PRIMARY KEY(actor,request_key));`);
  this.db.prepare('INSERT OR IGNORE INTO meta VALUES(1,0,?,0)').run(randomUUID());
  for(const t of ['snapshots','previews','approvals','receipts'])for(const op of ['UPDATE','DELETE'])this.db.exec(`CREATE TRIGGER IF NOT EXISTS immutable_${t}_${op} BEFORE ${op} ON ${t} BEGIN SELECT RAISE(ABORT,'immutable evidence ledger'); END;`);
 }
 resetStats(){this.stats={keyReads:0,scanReads:0,rowsRead:0,eventsRead:0};}
 meta(){return this.db.prepare('SELECT revision,generation,journal_floor FROM meta WHERE id=1').get();}
 get(table,key){this.stats.keyReads++;const row=this.db.prepare('SELECT * FROM facts WHERE table_name=? AND row_key=?').get(table,key);if(row)this.stats.rowsRead++;return row?this.decode(row):null;}
 decode(row){return {table:row.table_name,key:row.row_key,body:JSON.parse(row.body),versions:JSON.parse(row.versions),birth:row.birth_rev,rowVersion:row.row_rev};}
 all(table){const rows=this.db.prepare('SELECT * FROM facts WHERE table_name=? ORDER BY row_key').all(table);this.stats.rowsRead+=rows.length;return rows.map(r=>this.decode(r));}
 scan(table,predicate){this.stats.scanReads++;return this.all(table).filter(r=>matches(predicate,r.body));}
 eventsSince(revision,table){const rows=table?this.db.prepare('SELECT * FROM changes WHERE seq>? AND table_name=? ORDER BY seq').all(revision,table):this.db.prepare('SELECT * FROM changes WHERE seq>? ORDER BY seq').all(revision);this.stats.eventsRead+=rows.length;return rows.map(r=>({seq:r.seq,table:r.table_name,key:r.row_key,before:r.before_body?JSON.parse(r.before_body):null,after:r.after_body?JSON.parse(r.after_body):null,fields:JSON.parse(r.changed_fields)}));}
 keyEpoch(table,key){return this.db.prepare('SELECT coalesce(max(seq),0) AS rev FROM changes WHERE table_name=? AND row_key=?').get(table,key).rev;}
 tableRevision(table){return this.db.prepare('SELECT coalesce(max(seq),0) AS rev FROM changes WHERE table_name=?').get(table).rev;}
 membershipEpoch(table,predicate){let epoch=0;for(const e of this.eventsSince(0,table))if(matches(predicate,e.before?.body)!==matches(predicate,e.after?.body))epoch=e.seq;return epoch;}
 transact(fn){if(this.depth)throw Error('Nested authority transaction refused');this.db.exec('BEGIN IMMEDIATE');this.depth=1;try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}finally{this.depth=0;}}
 put(table,key,body,{insertOnly=false}={}){
  if(!this.depth)return this.transact(()=>this.put(table,key,body,{insertOnly}));
  if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(table)||typeof key!=='string'||!key.length||key.length>180)throw Error('Invalid fact identity');
  if(!body||Array.isArray(body)||typeof body!=='object')throw Error('Fact object required');canonical(body);
  const before=this.get(table,key);if(insertOnly&&before)throw Error('DUPLICATE_KEY');
  const names=[...new Set([...Object.keys(before?.body||{}),...Object.keys(body)])].sort();
  for(const f of names)if(!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(f))throw Error('Invalid fact field');
  const changed=names.filter(f=>Object.hasOwn(before?.body||{},f)!==Object.hasOwn(body,f)||(Object.hasOwn(body,f)&&!equal(before?.body[f]??null,body[f])));
  if(before&&!changed.length)return before;
  const seq=this.meta().revision+1,versions={...(before?.versions||{})};for(const f of changed)versions[f]=seq;
  const after={table,key,body:clone(body),versions,birth:before?.birth??seq,rowVersion:seq};
  this.db.prepare('INSERT INTO facts VALUES(?,?,?,?,?,?) ON CONFLICT(table_name,row_key) DO UPDATE SET body=excluded.body,versions=excluded.versions,birth_rev=excluded.birth_rev,row_rev=excluded.row_rev').run(table,key,JSON.stringify(body),JSON.stringify(versions),after.birth,seq);
  this.db.prepare('INSERT INTO changes VALUES(?,?,?,?,?,?)').run(seq,table,key,before?JSON.stringify(before):null,JSON.stringify(after),JSON.stringify(changed));
  this.db.prepare('UPDATE meta SET revision=? WHERE id=1').run(seq);return after;
 }
 patch(table,key,changes){const before=this.get(table,key);if(!before)throw Error('FACT_NOT_FOUND');return this.put(table,key,{...before.body,...changes});}
 delete(table,key){if(!this.depth)return this.transact(()=>this.delete(table,key));const before=this.get(table,key);if(!before)throw Error('FACT_NOT_FOUND');const seq=this.meta().revision+1;this.db.prepare('DELETE FROM facts WHERE table_name=? AND row_key=?').run(table,key);this.db.prepare('INSERT INTO changes VALUES(?,?,?,?,?,?)').run(seq,table,key,JSON.stringify(before),null,JSON.stringify(Object.keys(before.body)));this.db.prepare('UPDATE meta SET revision=? WHERE id=1').run(seq);}
 snapshot(){const meta=this.meta(),facts=this.db.prepare('SELECT * FROM facts ORDER BY table_name,row_key').all().map(r=>this.decode(r));this.stats.rowsRead+=facts.length;return {...meta,facts};}
 createDraft(id,workflow,context){this.db.prepare('INSERT INTO drafts VALUES(?,?,?,1,?)').run(id,workflow,JSON.stringify(context),'open');}
 draft(id){const row=this.db.prepare('SELECT * FROM drafts WHERE id=?').get(id);if(!row)throw Error('DRAFT_NOT_FOUND');return {...row,context:JSON.parse(row.context)};}
 close(){this.db.close();}
}
module.exports={FactStore};
