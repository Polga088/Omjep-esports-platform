# OMJEP Cursor Prompt Template

GO — [TITLE]

## Objective
[What must be achieved]

## Context
[Current state, verified facts, previous decisions]

## Scope
Allowed files:
- [file 1]
- [file 2]

Forbidden:
- backend/auth/routes/proxy/deploy unless explicitly listed
- unrelated UI
- .turbo logs
- tsbuildinfo
- generated files unless required

## Business Rules
- [rule 1]
- [rule 2]
- [rule 3]

## Implementation
Do:
1. [step]
2. [step]
3. [step]

Do not:
- [forbidden action]
- [forbidden action]

## Validation
Run:
```bash
[pnpm build/test command]
