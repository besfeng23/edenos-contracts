# Task Envelope v1.0

**Purpose:** One instruction = one immutable envelope. If it's not in an envelope, it doesn't exist.

## Fields
- `run_id` — ULID, immutable, unique systemwide.
- `parent_id` — ULID of upstream task, optional.
- `tenant` — slug `[a-z0-9-]{2,32}`.
- `intent` — enum: `micro` | `macro`.
- `scope` — object with:
  - `repos`: array of `{owner, name, branch?}`.
  - `paths`: array of globs.
  - `services_touched`: integer ≥ 0.
  - `infra_changes`: boolean.
- `slo` — object:
  - `max_latency_s`, `heartbeat_s`, `rollout_policy`, `auto_rollback`.
- `budget` — `{agent_minutes_max, ci_minutes_max, cloud_spend_max_usd}`.
- `auth_ref` — opaque handle to short-lived creds.
- `inputs` — JSON or YAML spec of the actual ask.
- `labels` — map<string,string>.
- `idempotency_key` — hash of `{tenant,intent,scope,inputs}`.
- `ttl_s` — integer, must be ≥ 60.
- `submitted_by` — `{type: 'human'|'edenos'|'automation', subject: string}`.
- `submitted_at` — RFC3339 timestamp.

## Invariants
- Immutable once accepted.
- `intent=macro` requires `services_touched ≥ 2` OR `infra_changes=true`.
- Duplicate `idempotency_key` within TTL must map to the original `run_id`.
- No PII in `inputs`.

## Rejection Rules
- Missing `tenant`, `intent`, or `inputs`.
- Bad heartbeat (`heartbeat_s > max_latency_s / 2`).
- Zero budgets.
- `ttl_s < 60`.

**Approved by: ____________ (name/date)**
