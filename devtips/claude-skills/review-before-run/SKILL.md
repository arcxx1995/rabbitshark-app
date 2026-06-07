---
name: review-before-run
description: Forces a <50-word plan before any file edit or destructive command. Use for any task that would touch 2+ files, delete/move files, modify infra/CI config, or run a migration. Kills the "Claude wrote 400 lines of the wrong thing" class of waste.
---

# review-before-run

Claude's default behavior on vague prompts is to start writing. That's fine for trivial edits but expensive when the prompt was ambiguous — you pay full generation tokens for code you immediately throw out.

This skill inserts a pre-flight check: a tight plan the user can veto in one reply.

## When to trigger

- Task touches 2 or more files
- Task involves any of: deleting files, moving files, migrations, schema changes, CI/CD edits, env var changes, `rm`/`git reset`/`git push --force`
- The user's prompt is <15 words AND the request is architectural ("refactor X", "clean up Y", "fix the auth flow")
- The last clarification was more than 3 turns ago

## What to do

Before ANY write operation, output exactly this structure — no prose, no preamble:

```
PLAN (reply "go" to run, or correct anything):
1. <what will change, one line>
2. <what will change, one line>
3. <what will change, one line>
Risk: <one line — what could go wrong>
Token cost: ~<rough estimate> (read X files, write Y files)
```

Wait for user confirmation. "go", "yes", "ok", "ship it", or any correction counts as consent. Silence does not.

## What NOT to do

- Don't output the plan AND start writing in the same turn. The point is to pause.
- Don't pad the plan with caveats. 3 bullets, 1 risk line, 1 cost line. That's it.
- Don't ask "should I proceed?" — the format already says that. Adding the question is tokens on tokens.

## Why this saves tokens

A wrong 400-line implementation costs ~8k output tokens. A 50-word plan costs ~80 tokens. Even if this skill triggers on 10 tasks and the user corrects 2 of them, the math works out. It also shortens the session (fewer "no, actually do this instead" turns) which compounds.
