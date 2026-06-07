#!/usr/bin/env node
// PreToolUse guard. Place at ~/.claude/hooks/guard-paths.mjs.
// Exits 2 if Claude is about to touch a file outside $CLAUDE_PROJECT_DIR.

import { resolve } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR;
const rawPaths = process.env.CLAUDE_FILE_PATHS ?? "";

if (!projectDir) {
  // No project dir means we don't know what's "inside". Fail closed.
  console.error("guard-paths: CLAUDE_PROJECT_DIR not set; denying write.");
  process.exit(2);
}

const projectRoot = resolve(projectDir) + "/";
const paths = rawPaths.split(/\s+/).filter(Boolean);

if (paths.length === 0) {
  // Nothing to check. Don't block tool calls that don't carry a path.
  process.exit(0);
}

const offenders = paths.filter((p) => {
  const abs = resolve(p) + "/";
  return !abs.startsWith(projectRoot) && !(resolve(p) === resolve(projectDir));
});

if (offenders.length > 0) {
  console.error("guard-paths: DENIED — path(s) outside project root:");
  for (const o of offenders) {
    console.error(`  ${resolve(o)}`);
  }
  console.error(`  project root: ${resolve(projectDir)}`);
  process.exit(2);
}

process.exit(0);
