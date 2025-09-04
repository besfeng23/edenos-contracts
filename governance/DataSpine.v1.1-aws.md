# Data Spine v1.1 (AWS)

## DynamoDB (hot ops)
- Tables:
  - edenos_tasks (PK: run_id)
  - edenos_leases (PK: run_id)
  - edenos_heartbeats (PK: run_id, SK: ts, TTL: ttl_epoch 7d)
  - edenos_budgets (PK: tenant)

## S3 (artifacts + lake)
- Artifacts: s3://edenos-artifacts-<account>-<region>/<tenant>/<run_id>/{diffs|logs|snapshots|manifests}/
- Lake: s3://edenos-lake-<account>-<region>/{events|costs}/dt=YYYY-MM-DD/*.json

## Glue/Athena (history/analytics)
- DB: edenos_events
- Tables: events (json, partition dt), costs (json, partition dt)

## CloudWatch Logs → Firehose → S3
- Delivery stream: edenos-logs-to-s3 → s3://edenos-lake-.../logs/dt=YYYY-MM-DD/

**Approved by: ____________ (name/date)**
