# Event Taxonomy v1.0

## Common Event Header
- `event_id`, `run_id`, `event_type`, `tenant`, `occurred_at`, `producer`, `signature`, `trace_id`, `span_id`, `version`.

## Event Types
- `TASK_ACCEPTED`
- `ROUTED_EXECUTOR`
- `LEASE_GRANTED`
- `EXEC_STARTED`
- `EXEC_HEARTBEAT`
- `PR_OPENED`
- `CHECKS_PASSED` | `CHECKS_FAILED`
- `DEPLOY_STARTED`
- `DEPLOY_SUCCEEDED` | `DEPLOY_FAILED`
- `TASK_COMPLETED`
- `TASK_FAILED`
- `LEASE_EXPIRED`
- `TASK_EXPIRED`
- `BUDGET_EXCEEDED`

## State Machine
```mermaid
stateDiagram-v2
    [*] --> TASK_ACCEPTED
    TASK_ACCEPTED --> ROUTED_EXECUTOR
    ROUTED_EXECUTOR --> LEASE_GRANTED
    LEASE_GRANTED --> EXEC_STARTED
    EXEC_STARTED --> EXEC_HEARTBEAT
    EXEC_STARTED --> PR_OPENED
    PR_OPENED --> CHECKS_PASSED
    PR_OPENED --> CHECKS_FAILED
    CHECKS_PASSED --> DEPLOY_STARTED
    DEPLOY_STARTED --> DEPLOY_SUCCEEDED
    DEPLOY_STARTED --> DEPLOY_FAILED
    TASK_COMPLETED --> [*]
    TASK_FAILED --> [*]
    TASK_EXPIRED --> [*]
```

## Timing
Heartbeat late if now > last_heartbeat + 1.5 * heartbeat_s.

Lease expires at 2 * heartbeat_s.

**Approved by: ____________ (name/date)**
