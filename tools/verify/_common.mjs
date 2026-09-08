/**
 * Shared helpers for tools/verify/*.mjs.
 *
 * Zero dependencies. Node standard library only. Each verify script imports
 * walkFiles, readText, ansi, Reporter and REPO_ROOT from here.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Yield every file under `root` whose path passes `matchFn`.
 * Build output and dependency folders are skipped.
 */
export function* walkFiles(root, matchFn) {
  const SKIP = new Set(['node_modules', 'dist', 'build', '.git', 'coverage', '.vite']);
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        stack.push(full);
      } else if (e.isFile() && matchFn(full)) {
        yield full;
      }
    }
  }
}

export function readText(path) {
  return readFileSync(path, 'utf8');
}

export const ansi = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** Repo root, resolved from this file's location. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Strip the repo root prefix so findings print a short path. */
export function rel(path) {
  return path.replace(`${REPO_ROOT}/`, '');
}

/**
 * Collect findings, then print them and set the exit code.
 * Usage:
 *   const r = new Reporter('hex');
 *   r.add({ file, line, message });
 *   r.finalize();
 */
export class Reporter {
  constructor(name) {
    this.name = name;
    this.findings = [];
  }

  add(finding) {
    this.findings.push(finding);
  }

  finalize() {
    const { name, findings } = this;
    if (findings.length === 0) {
      console.log(`${ansi.green('PASS')} verify:${name} (no findings)`);
      process.exit(0);
    }
    const plural = findings.length === 1 ? '' : 's';
    console.log(
      `${ansi.red('FAIL')} verify:${name} ${ansi.dim(`(${findings.length} finding${plural})`)}`,
    );
    for (const f of findings) {
      const loc = f.line != null ? `${f.file}:${f.line}` : f.file;
      console.log(`  ${ansi.yellow(loc)}  ${f.message}`);
    }
    process.exit(1);
  }
}
