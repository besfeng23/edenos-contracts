# Rejection Matrix v1.0

| Condition | Action | Code |
|-----------|--------|------|
| Missing tenant/intent/inputs | Reject | 400 |
| ttl_s < 60 | Reject | 400 |
| Zero budget | Reject | 422 |
| Macro intent without services_touched or infra_changes | Reject | 422 |
| Invalid heartbeat vs latency | Reject | 422 |

**Approved by: ____________ (name/date)**
