# Event Signing Keys (public)

- gateway_ed25519.pub — fingerprint: SHA256:jLD73c+SbFrdgBYGRginxalG6Nq29TMN77+Csjh+bww gateway@edenos (ED25519)
- executor_codex_ed25519.pub — fingerprint: SHA256:YGOyN+tFKtiPfh95yDjOIWvZ2aJImqgKdg8pCSymA9A executor-codex@edenos (ED25519)
- executor_cursor_ed25519.pub — fingerprint: SHA256:V+lKtXFyJNchh6ysxWvm4ABfUvpwpZKk6uNH226MCEY executor-cursor@edenos (ED25519)
- ci_ed25519.pub — fingerprint: SHA256:6KW4am4E7T0v3uw4YCo2muJpixyPQ4cSZAyBv3nhX7Q ci@edenos (ED25519)
- gateway_kms_pubkey.pem — KMS ECDSA P-256 key ID: f8f32267-e04d-4046-83f2-ee30844a915f (AWS KMS)

Policy: producers rotate keys every 90 days; old public keys remain listed until all events signed by them age out of retention.
