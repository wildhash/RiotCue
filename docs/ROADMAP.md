# RiotCue — Development Roadmap

## Milestone 1 · Multiplayer foundation (in repo)
- [x] Anonymous sessions, one-click rooms and invitations
- [x] 60/90/custom round duration and round count
- [x] Actor-only prompts in a database table without public RLS policies
- [x] Server-owned countdown and round deadlines
- [x] Transactional win/timeout and no duplicate awards
- [x] Room / roster Supabase Realtime subscriptions with polling fallback
- [x] Watch-only spectators and scoreboard
- [x] LiveKit access tokens scoped to room and spectator role
- [x] Opt-in synthesized countdown, win and timeout sounds
- [x] Responsive branded UI
- [ ] Validate full two-browser flow against a configured Supabase instance
- [ ] Browser E2E tests (Playwright) and integration tests for SQL functions
- [ ] Production deployment and secrets configuration

## Milestone 2 · Automatic AI referee
- [ ] Explicit microphone consent and clear voice-processing notice
- [ ] Speech-to-text from consenting participants, not spectators by default
- [ ] Server-verifiable guess candidates; never send secret to guessers
- [ ] Confidence threshold, fuzzy normalization, synonyms and adjudication UI
- [ ] Refractory period and idempotency to avoid double-triggering
- [ ] Store no raw audio by default; configurable retention and consent
- [ ] Performance tests with noise, accents, cross-talk and latency

## Milestone 3 · Party polish
- [ ] Team mode, actor rotation settings, and guest moderation
- [ ] Synchronized particle confetti and explosion canvas effects
- [ ] Sound effects volume/mute, reduced-motion support
- [ ] Party energy meter with transparent privacy controls
- [ ] Private lobby moderation, host handoff and reconnection
- [ ] Optional curated prompts and content filters
- [ ] Presence/typing indicators without using camera for scoring
- [ ] Mobile camera ergonomics and bandwidth adaptation

## Production gates
1. Threat model room codes, anonymous identities, prompts, JWTs and RLS.
2. Add IP/guest rate limits, flood controls, room expiry, cleanup and quotas.
3. Verify SQL atomicity with simultaneous win requests and delayed sync.
4. Test client clocks with skew and network partitions.
5. Limit LiveKit publishing and recording; show privacy/consent controls.
6. Never claim voice-based wins before an end-to-end STT evaluator passes.
