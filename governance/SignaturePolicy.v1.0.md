# Signature Policy v1.0

- All events must be signed using Ed25519.
- Signature format: Detached JWS equivalent; EdenOS verifies `(payload, signature, public key)` with key from governance/keys/public.
- Required headers in event body: event_id, run_id, event_type, tenant, occurred_at, producer, version.
- Unsigned or unverifiable events are quarantined and excluded from dashboards.
- Rotation: keys rotate every 90 days. Public fingerprints updated prior to rotation. Overlap period: 14 days.

**Approved by: ____________ (name/date)**
