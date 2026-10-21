import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const BASE_COMMIT = 'a52137f904f78eaebd546d9808503b26e3b10549';
export const BASE_REGISTRY_SHA256 =
  'f3b8bc988ed6687f9a9e95d29080dead73e2eceb01082b4dc12489a60205656a';

// Exact public source captured with git show BASE_COMMIT:path. This makes the
// comparison available in a clean source archive without private .git metadata.
export function readBaselineRegistry(): string {
  const bytes = readFileSync('test-support/baseline-rules-registry.ts.txt');
  if (
    createHash('sha256').update(bytes).digest('hex') !== BASE_REGISTRY_SHA256
  ) {
    throw new Error('Bundled baseline registry checksum mismatch');
  }
  return bytes.toString('utf8');
}
