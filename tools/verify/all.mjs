#!/usr/bin/env node
/**
 * verify:all
 *
 * Run every verify gate in order and report them together. The exit code is
 * the worst exit code of the set, so one failing gate fails the run.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const gates = ['tokens', 'cascade', 'hex', 'misuse', 'ladder', 'voice'];

let worst = 0;
for (const name of gates) {
  const res = spawnSync(process.execPath, [join(here, `${name}.mjs`)], { stdio: 'inherit' });
  if (res.status && res.status > worst) worst = res.status;
}
process.exit(worst);
