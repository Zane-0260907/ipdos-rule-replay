import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { syntheticSource } from './domain';

export class BusinessStore {
  readonly db: DatabaseSync;
  constructor(readonly filename: string) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=2000;
      CREATE TABLE IF NOT EXISTS source (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id), actor TEXT NOT NULL, body TEXT NOT NULL, UNIQUE(plan_id, actor));
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL UNIQUE REFERENCES plans(id), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS confirmations (actor TEXT NOT NULL, request_key TEXT NOT NULL, request_hash TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id), PRIMARY KEY(actor, request_key));`);
    this.db.prepare('INSERT OR IGNORE INTO source(id,body) VALUES(1,?)').run(JSON.stringify(syntheticSource()));
  }
  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  onModuleDestroy() { this.db.close(); }
}
