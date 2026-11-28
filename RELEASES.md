# PickArena app releases

Releases go v1.0, v1.1, v1.2 … and match the website / owner console version.

To release v1.N:
1. Set `"version": "1.N.0"` in `app.json` (the Account screen shows it as `v1.N`).
2. Build with EAS (`eas build -p android --profile production`); the store build number increases automatically.
3. Merge to main and tag `v1.N` with a GitHub release listing what changed.

## v1.0
First public release: clubs, predictions with virtual diamonds, live video, history, notifications, referrals, Player ID on Account, and club controls (close predictions / set winner) for owners and match agents.
