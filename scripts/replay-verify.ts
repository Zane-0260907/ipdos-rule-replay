import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { RulesRegistryService } from '../src/rules/rules-registry.service';
import { ReplayService } from '../src/replay/replay.service';

const file = process.argv[2];
if (!file) throw new Error('Usage: npm run replay:verify -- <export.json>');
const bundle: unknown = JSON.parse(readFileSync(file, 'utf8'));
console.log(
  JSON.stringify(
    new ReplayService(new RulesRegistryService()).verifyExport(bundle),
    null,
    2,
  ),
);
