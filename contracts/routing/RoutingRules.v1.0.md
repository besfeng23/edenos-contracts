# Routing Rules v1.0

## Inputs
- `services_touched`
- `infra_changes`
- `estimated_files_changed`
- `labels`
- `tenant.policies`
- `budget`

## Decision Tree
1. If `labels.force_executor` exists → respect if allowed.
2. If `infra_changes=true` → cursor.
3. If `services_touched ≥ 2` → cursor.
4. If `estimated_files_changed ≤ 5` AND `services_touched ≤ 1` → codex.
5. Else → cursor.
6. If macro disabled or budget exceeded → downgrade or queue.

## Scenarios
- Micro, 3 files, 1 service → codex.
- Macro, schema bump → cursor.
- 1 service, 12 files → cursor.
- Explicit override codex, 8 files → codex (if allowed).
- Budget exceeded macro → queued.
- Executor crash → reassign lease, resume.

**Approved by: ____________ (name/date)**
