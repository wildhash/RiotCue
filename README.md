# RiotCue

**Camera-on chaos. Secret prompts. Instant wins.**

RiotCue is a browser-based multiplayer party charades game with actor-only prompts, synchronized launch countdowns, live camera/audio via LiveKit, a scoreboard, and dramatic round outcomes.

## MVP

- Anonymous guests via Supabase Auth, no registration form.
- Short room codes, host/player/spectator roles, invite link.
- Server-owned deadlines, private answers, exactly-once scoring.
- 60/90-second or custom rounds; configurable number of rounds.
- Supabase Realtime room updates with periodic synchronization fallback.
- Optional LiveKit video and audio conferencing.
- Manual host/actor **Got it!** confirmation; **automatic speech recognition is not yet implemented**.

## Quick start

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`, then configure Supabase credentials.
3. Execute `supabase/migrations/0001_riotcue.sql` in Supabase SQL Editor.
4. Enable **Anonymous Sign-ins** in Supabase Auth settings.
5. Run `npm run dev` and open http://localhost:3000.
6. Open the room link in a second incognito browser to verify separate guest identities.
7. To enable cameras and microphones, add LiveKit credentials.

**Never expose the service role key or LiveKit API secret in browser variables.**

## Validation

Run `npm test` and `npm run typecheck`; integration with Supabase and LiveKit requires configured cloud services.

## Structure

- `app/api/rooms`: room entry, private prompts, actions and media tokens.
- `lib/server`: authenticated server access.
- `supabase/migrations`: RLS and transactional game state.
- `app/room/[code]`: synchronized multiplayer experience.
- `components/LiveStage.tsx`: optional LiveKit stage.
- `docs/BUILD_PROMPT.md`: comprehensive implementation starter prompt.

## Limits

Voice-based guess detection, teams, browser E2E coverage, moderation, and durable histories are not yet implemented. Configure rate limits, abuse controls, and service quotas before a public launch.

MIT licensed.
