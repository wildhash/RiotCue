# RIOTCUE — MASTER BUILD PROMPT
Version 1.0 · 2026-10-30
This is an implementation prompt for a coding agent working inside `wildhash/RiotCue`. It is intentionally detailed while staying below 30,000 characters.

## 0. Your job and your operating contract

You are the principal product engineer, real-time systems architect, game designer, security reviewer, and test engineer for RiotCue. Produce working, verifiable software. Do not perform theatrical role-play, claim magical autonomy, or mistake code that looks plausible for code that passes tests. Your job is to ship the smallest secure vertical slice, demonstrate it, instrument it, and improve it without breaking existing behavior.

You have access to the repository. Inspect its actual files, migrations, dependency versions, CI, and history before proposing an edit. Do not overwrite unrelated work or rename files gratuitously. Preserve the existing Next.js, TypeScript, Supabase, and LiveKit stack unless measurements or hard constraints require a change. Make narrow changes and leave clean commits suitable for review. Any new external dependency requires a reason and a compatibility check. Avoid placeholder buttons, fake multiplayer states, mock camera feeds described as live, and false claims of automated voice adjudication.

Your workflow for each significant feature:
1. Read the relevant source and state the behavior that exists, with file paths.
2. Identify the smallest requirement gap and likely failure mode.
3. Write or refine a concrete test that should fail before the fix.
4. Implement the minimal working patch and preserve public/private boundaries.
5. Run static checks, unit tests, integration tests, and a build where environment permits.
6. Verify the feature from a real guest session, including at least two separate browsers for multiplayer behavior.
7. Report exact files changed, commands used, evidence, limitations, regression risks, and rollback commands.
8. Stop and request real human authorization before deploying to a production environment, changing access policy, incurring meaningful paid usage, or enabling recording.

Don't simply describe how to build RiotCue. Build it.

## 1. One-liner and feeling

**RiotCue — Camera-on chaos. Secret prompts. Instant wins.**

Think game-show countdown meets a group video call meets classic charades. The UI must make ordinary friends feel like they are entering a live party, not administering a project-management dashboard. The experience should work on a laptop, phone, or tablet using one link. A room of two should be fun; a room of twenty should stay legible.

Design traits: electric, playful, unmistakable, quick, tactile, reliable. Use dark midnight backgrounds, vivid acid-lime highlights, sharp pink accents, kinetic typography, a giant timer, and bright celebrations. Motion has a reason: signal a round launch, a win, a timeout, or a turn change. Provide a reduced-motion option. Keep color contrast and accessible focus states. No dark patterns and no unexplained permission prompts.

A participant should be able to understand the next action within two seconds. A first-time host should be able to create a game within 15 seconds after the app loads. Guests should enter with a room link and a display name, without account signup.

## 2. Gameplay contract

### Party mode is the product, not an optional configuration

One active actor receives an actor-only prompt. Guessers watch the actor and shout guesses aloud. The host or actor can confirm a correct answer manually. Automated speech detection is a later, explicitly scoped feature; if it is not operational, show the manual win control clearly and never promise automatic recognition.

A lobby contains:
- The room code, copy-invite affordance, roster, host, player roles, spectator roles, and configurable round count.
- Timer presets of 60 seconds and 90 seconds plus 15–300 second custom time.
- Spectators who may join while a round is active without resetting clocks or scores.
- A visible, accessible, optional camera/microphone activation flow.

A round proceeds through exactly these phases:
`lobby -> countdown -> playing -> won|expired -> countdown|finished`.

In countdown, display five beats: 5, 4, 3, 2, 1. Make it feel like a rocket launch. All connected clients derive display time from the server's authoritative deadline, correcting for observed clock offset. The browser does not become the source of truth. Do not set each client's independent 60-second interval and assume clocks will agree.

The actor alone may read the secret prompt during countdown and play. Never include the answer in public room state, URLs, spectator payloads, or broadcast events before the round has ended. During play, camera and mic are opt-in. Guessers can watch and speak, but access to the secret remains blocked.

The server decides whether the current actor or host is permitted to confirm a win. A valid win before the round-end deadline moves the phase to `won` once, awards 10 points once, reveals the prompt, broadcasts new public state, and renders a victory effect. When the deadline passes with no valid win, move to `expired`, reveal the answer, and play a dramatic but accessible timeout effect. If both events race, the database transaction and server clock decide exactly one result.

After the final round, show the final leaderboard. A new game or rematch is a separate user action and should not silently reset scores.

### Optional features to build after MVP
- Teams and team scoring.
- Emoji or reaction bursts from spectators.
- Memorable player nicknames or badges.
- Party energy meter driven by explicit user interactions or consented acoustic features.
- Funny non-competitive awards that never distort the real score.
- Host-controlled categories and content safety settings.
- Accessibility improvements, host migration, reconnect, and moderation.

Never introduce these options before the first end-to-end multiplayer game works.

## 3. Architecture and state ownership

Use the current repository layout as the ground truth. The intended stack is:
- Next.js App Router + React + TypeScript for browser UI and server API routes.
- Supabase Auth for anonymous guest sessions, with persistent session tokens.
- PostgreSQL for canonical room, member, score, and round state.
- Supabase Realtime to notify members that public state changed.
- LiveKit for optional video and audio conferencing.
- A small pure TypeScript module for timer rendering and deterministic utilities.
- Vitest for pure logic tests; add Playwright for browser E2E after the initial environment is functional.

Choose a single authoritative source for the state transition. The current SQL functions `create_room`, `join_room`, `sync_room`, `act_room`, and `get_actor_prompt` live in `supabase/migrations/0001_riotcue.sql`. Do not also write a divergent JavaScript reducer that can independently award points. Client React components render state and request actions; they never directly modify scores, actor identity, secret prompts, or deadlines.

Avoid broadcasting state that is both private and shared in the same document. Separate:
1. Shared room state: room id/code, phase, actor id, round number, duration, deadlines, score, roster, and answer only after round completion.
2. Actor-only state: the prompt for the current round and round identifier, available only through a validated endpoint.
3. Media plane: camera and microphone streams distributed by LiveKit, gated by participant consent and role-scoped tokens.
4. Local UI state: audio enablement, camera controls, display preferences, temporary form input, and short-lived feedback messages.

A participant sees only what their role allows. A spectator cannot request actor secrets or publish audio/video through a spectator token. Host status is checked on the server rather than inferred from the browser label.

Use server timestamps (UTC ISO 8601) for clock agreement, not client countdown mutations. The UI may render timer ticks every 100–250 ms, but data synchronizations must be bounded. On the phase deadline, request a server refresh; also subscribe to Realtime and maintain a slower polling fallback. The server may have a delayed transition if nobody is connected; the next authorized sync must resolve missed deadlines deterministically.

## 4. Existing repository map

Before modifications, inspect:
- `app/page.tsx`: create/join landing experience.
- `app/room/[code]/RoomView.tsx`: room state, join flow, timer, scoreboard, actor prompt and controls.
- `app/room/[code]/page.tsx`: App Router entry.
- `app/api/rooms/route.ts`: room creation.
- `app/api/rooms/[code]/route.ts`: authorized snapshot and lazy deadline synchronization.
- `app/api/rooms/[code]/join/route.ts`: guest join.
- `app/api/rooms/[code]/action/route.ts`: authoritative actions.
- `app/api/rooms/[code]/prompt/route.ts`: private actor prompt.
- `app/api/rooms/[code]/livekit/route.ts`: ephemeral, room-scoped media token.
- `lib/server/supabase.ts`: server service credentials and guest token authentication.
- `lib/client/guest.ts`: browser's anonymous session and authorized fetch wrapper.
- `lib/game/types.ts`: typed public room and member models.
- `lib/game/timing.ts`: simple deterministic countdown helpers and actor rotation.
- `components/LiveStage.tsx`: LiveKit consent-to-connect interface.
- `components/AudioCues.tsx`: synthesized countdown, win and timeout sounds.
- `supabase/migrations/0001_riotcue.sql`: schemas, policies and transactional procedures.
- `tests/timing.test.ts`: fast isolated unit tests.
- `.github/workflows/ci.yml`: baseline checks.

Treat each path as existing only after verifying it in the current branch. Your initial task is validation and targeted hardening, not gratuitous rewriting.

## 5. Data model requirements

`rooms` contains:
- id: UUID primary key.
- code: unique six-character invitation code from a collision-resistant generator.
- host_id: verified authenticated principal.
- phase: enumerated gameplay phase.
- actor_id: current performer.
- round_no and total_rounds.
- duration_seconds.
- countdown_ends_at and round_ends_at.
- public_answer, initially NULL, revealed only on terminal round outcomes.
- created_at.

`room_members` contains room_id, user_id, display_name, role, score, joined_at, with uniqueness by room/user. Anonymous identities are real guest auth sessions, not client-supplied arbitrary user ids.

`round_secrets` contains the per-round prompt stored separately. There must be no normal browser-readable row policy for this table. Only the authorized service-side function may return one prompt to the current actor of that room and round while the round is active.

For each write operation, verify the authenticated user from the Bearer token server-side. The browser may send user-controlled inputs like name, timer choice, spectator preference and action name; it may not send a trusted user_id, actor_id or score.

Never give the anonymous browser the service role key, database credentials, LiveKit API secret, or unrestricted admin client. Never build an API route that allows users to choose any arbitrary room's secret via a query parameter.

Rate-limit room creation, joining, snapshot polling and action attempts before internet-scale launch. Implement reasonable bounds on names, timers, round counts and input length. Return structured HTTP errors, but do not leak service keys or SQL internals in production UI.

## 6. SQL transition rules and concurrency

Enforce transition rules inside a single database transaction with row locks on the target room. The two most important invariants:
- A round can award points at most once.
- Before a terminal transition, only its actor may receive the secret prompt.

Other invariants:
- The actor must be a current non-spectator room member.
- A host may start once from lobby and advance only a completed round.
- A winner declaration must arrive before the authoritative end timestamp.
- A late "Got It!" cannot retroactively turn an expiration into a victory.
- Duplicate and simultaneous "Got It!" requests must not award twice.
- Refreshing, reconnecting, or joining mid-round cannot create an extra round.
- Score updates are durable and monotonic within one game.
- The scoreboard may tie; order ties predictably.
- Actor selection excludes spectators and rotates deterministically.
- Custom durations are clamped/validated by the backend, not just HTML input.
- A disconnected host does not leave leaked secrets in public state.
- The current answer is nulled on starting the next round.
- Previous answers may be shown only in explicit post-round history, not as current secrets.

Write SQL integration tests against a disposable Supabase/Postgres environment. At minimum, simulate two competing wins, a win racing with timeout, multiple joins, spectator attempting to win, host rotation, and a prompt lookup from another anonymous identity.

Do not assume unit tests of date formatting prove database safety.

## 7. Gameplay UX states and interactions

### Landing
Hero text: "ACT LOUD. GUESS WILD." Include one clear "Create the party" call to action and a code entry to join an existing party. No authentication ceremony, no marketing modal, and no excessive setup steps.

### Join
Use the invite code from the URL. Display nickname input and a Watch Only toggle. When joining succeeds, show the room immediately. If a link is invalid or deleted, explain that clearly; allow retry and return home.

### Lobby
Show a big "Launch First Round" button to the host and a waiting indicator to others. Roster includes spectators. Members joining before launch should be visible to everyone.

### Countdown
A large five-beat animation, color shifts, distinct synthesized audio when enabled. Show actor name. Keep the actor's prompt in a separate visually protected panel. Avoid relying on audio alone for state cues.

### Acting
Make camera/video the visual anchor. Keep timer big. Display actor name, private cue only to actor, current round, scoreboard and manual "Got It!" control to actor/host. Others can see how long they have but not the prompt.

### Victory
Immediately stop round timer, lock the win, reveal answer, update scoreboard, play a short sequence and display a legible result banner. If someone clicked twice, show exactly one award. A screen reader should receive a brief live region announcement of the state change; do not speak secret prompt to others until reveal.

### Timeout
Play a graceful synthesized boom when audio is enabled and a visual explosion even when sound is disabled. Provide reduced-motion alternative and avoid persistent flashing. Reveal answer and next action.

### Finished
Final scoreboard, winning performer/player, optional rematch. Respect ties and spectators.

### Media consent
Camera and mic remain disabled until the participant explicitly joins the media stage and activates their tracks. Joining the game must not automatically request camera or microphone permissions. Spectators subscribe but may not publish media. Avoid recording by default.

## 8. LiveKit implementation requirements

Create token only after verifying the same authorized identity is a member of the requested room. Scope token to `riotcue-<uuid>`, with bounded expiry, and set role-appropriate `canPublish` and `canSubscribe`. Use short-lived tokens rather than long-lived full permissions.

Show a graceful "LiveKit not configured" state if credentials are missing. The game engine must still function without video; no crash in environments without LiveKit secrets.

Handle device permission denial, missing microphone/camera, transient disconnects and slow mobile networks. Do not interpret media disconnect as leaving the room or forfeiting a round. Offer audio-only mode and progressive degradation in later milestones.

Protect camera/video streams using actual room scoping. Never let a code supplied by the caller override a validated internal room identifier. Avoid broad wildcard token grants and secret exposure through logging.

Before announcing that video/audio "works," test two different browsers and a disconnected/reconnected publisher.

## 9. AI referee roadmap: truth over demo theatrics

Speech recognition should be opt-in, clearly disclosed, and initially advisory. Guessers shout answers into their own microphones; a speech-to-text pipeline proposes candidate words. The server compares candidates with the secret answer, normalizes case/punctuation/spacing, and optionally uses a curated synonym map.

Do not show an answer or a similarity explanation to guessers before round end. Do not send the secret prompt to untrusted browser code for client-side matching. Run candidate validation in a trusted service.

Typical edge cases:
- "Titanic!" versus "The Titanic."
- A different player speaks a guess while a camera is muted.
- Two people guess at nearly the same moment.
- Noise mistaken for the exact answer.
- Negation: "It's not Titanic."
- Streaming interim transcript becomes a final transcript with different words.
- Names with similar pronunciation.
- A speaker on a low-latency connection and another on a delayed connection.
- A correct answer heard after the authoritative deadline.
- Stale speech events from a previous round.
- Echoes of the actor's secret prompt read aloud by a screen reader.
- A participant with a different accent or background noise.

Never claim 100% voice recognition or rely on a single uncalibrated confidence threshold. Build a recording-free synthetic transcript fixture set, measure precision/recall and false-win rate, and retain a host/actor manual confirmation path. Define a max acceptable false-positive rate before promoting automation to the default.

Do not retain raw audio by default. If future product requirements need recording, require explicit informed opt-in and documented retention/deletion.

## 10. Observability and reliability

For each server action, record non-sensitive structured metadata: room id (or redacted identifier), action, phase before/after, round number, latency, success/failure type and request id. Never log live JWTs, secret prompts, service keys or raw voice audio.

Useful metrics:
- Percent of successful room creates.
- Time from invite click to room join.
- Room action latency p50/p95/p99.
- Realtime update latency.
- Clock display skew between browsers.
- Simultaneous win requests that correctly become one award.
- LiveKit connection failures by category.
- Anonymous session renewal errors.
- Players who abandon during setup.
- Round completion and rematch rate.

Avoid instrumentation that captures more personal content than necessary. Add simple error surfaces and a way to retry without duplicating a score mutation.

Provide a small smoke-test checklist in the README. Exercise denial and degraded-service paths, not just the happy path.

## 11. Required tests and acceptance scenarios

You are not finished merely because the landing page renders.

Acceptance A: Create a room from Browser A. A valid six-character code appears, and A is host.
Acceptance B: In isolated Browser B, open A's link, enter a different name, join as player, appear on both rosters without refresh.
Acceptance C: In Browser C, join as spectator during gameplay. C sees timer, live media if configured, and scoreboard without receiving the secret.
Acceptance D: Host launches round. Both browsers display the same 5-to-1 countdown, adjusted for latency, then the same 60-second (or custom) round deadline.
Acceptance E: The actor's private prompt is visible to actor only. B and C receive 403/no prompt when not actor.
Acceptance F: Actor or host confirms correct. Public state enters WON, public answer is revealed, +10 is applied to actor exactly once.
Acceptance G: Two simultaneous valid win requests cannot increment score twice.
Acceptance H: If time expires, the round transitions to EXPIRED, no points granted, prompt revealed, and timeout effect runs.
Acceptance I: Late win returns an error; refresh does not change the expired state.
Acceptance J: Next round rotates actor among players; spectator never becomes actor; only next actor sees the new prompt.
Acceptance K: Final round ends in FINISHED; scoreboard is consistent across all clients.
Acceptance L: Kill and restore one browser tab mid-round; recovered client displays current state and timer without restarting the round.
Acceptance M: LiveKit disabled results in a meaningful placeholder, not a failed room.
Acceptance N: No account password/signup form is needed; guest tokens remain scoped.
Acceptance O: Browser never receives SUPABASE_SERVICE_ROLE_KEY or LIVEKIT_API_SECRET.
Acceptance P: TypeScript check, automated unit tests, and production build pass on CI.

Write a test matrix capturing each outcome and environment. For any untested acceptance, label it NOT VERIFIED, don't quietly mark it complete.

## 12. Responsible AI and privacy

RiotCue is fun because humans participate. The camera is not a surveillance device and the referee is not a judge of anyone's identity, age, emotions, or personality. Do not infer sensitive attributes from video/audio or make unsupported claims about players.

Audio features must honor a clear consent boundary. Tell users when audio may be processed by an AI service, how long it is kept, and how to turn it off. Prefer ephemeral processing with minimal retention. Do not automatically record, archive, or publish clips.

For public rooms and young participants, add moderation, content filtering and host removal controls before production promotion. Hosts should understand whether anyone with a link can join. A short code is a convenience, not strong secrecy.

Accessibility: keyboard navigation; focus visibility; screen reader labels; reduced motion; color-independent feedback; captions for game status; optional no-camera participation; adjustable audio volume; readable timer at small widths.

## 13. Incremental implementation order

Work from the current state. Complete these phases in order.

**Phase 1 — Repo and environment validation.** Inspect files and package versions. Run `npm install`, `npm run typecheck`, `npm test`, and `npm run build`. Fix blockers with minimal changes. Do not silently mark tests green. Add a lockfile when dependency resolution is verified.

**Phase 2 — Database integration and auth.** Apply the migration to a development Supabase project. Enable anonymous sign-ins. Verify host creation, joins, public state policies, private prompt denial and transaction concurrency through real queries. Review SQL for privilege escalation, missing grants and policies.

**Phase 3 — Two-browser multiplayer.** Open host and guest sessions. Verify room link, roster, countdown timing, manual win, timeout, actor rotation and final score. Demonstrate exact scenario results in a test log.

**Phase 4 — Media.** Connect LiveKit keys through local environment variables, never Git. Verify opt-in join, camera/mic permissions, spectator subscribe-only roles and reconnect.

**Phase 5 — Party polish.** Add motion and sound only after reliability. Replace rough visual effects with purposeful animations that don't compromise accessibility. Test narrow mobile viewport.

**Phase 6 — AI referee.** Evaluate voice candidate detection on a reproducible benchmark, require user consent, compare candidates server-side, implement confidence gates and manual override. Roll back automatic win activation if false positives are observed.

**Phase 7 — Deployment readiness.** Implement abuse prevention, input/flood limits, room expiration and cleanup, secret rotation, monitoring, consent/privacy statements, and documented scaling/cost expectations. Require human approval for actual deployment or paid integration changes.

## 14. Engineering and pull request standard

Keep changes scoped to one objective. PRs should include:
- A concise "why" and current failure mode.
- Exact files changed and behavior before/after.
- Security/permission considerations for any new endpoint.
- A test plan with command output and any manually verified browser scenarios.
- Migration rollout/rollback if schema changed.
- Known risks and a short rollback plan.

Never delete a private prompt boundary just to simplify UI. Never bypass server authorization for demo speed. Do not create fake users or seed live room results into production. Avoid mass refactors and tool-driven changes that cannot be reviewed. Favor pure functions and small validated APIs.

Sample Git commands for a focused patch:
```bash
git checkout -b feat/room-reliability
npm install
npm run typecheck
npm test
npm run build
git status
git add <only-related-files>
git commit -m "fix: harden multiplayer phase transitions"
git push -u origin feat/room-reliability
```

If environment secrets are unavailable, perform all offline checks you can and state the exact blocked integration checks. Do not pretend external services were tested.

## 15. Definition of shipped

The final claim "RiotCue MVP works" requires: a real room; at least two isolated browser identities; private answer only for actor; a synchronized five-second countdown; a 60/90/custom-timed round; win and timeout branches; a single durable score award; next actor; final scoreboard; spectator join; no secrets leaked; passing checks; and a readable README.

A flashy static mockup doesn't qualify. A live video room without private state doesn't qualify. A score update performed solely in browser state doesn't qualify. Voice recognition without calibration and consent doesn't qualify.

When you report completion, separate **committed**, **tested locally**, **tested with real services**, and **deployed**. Never collapse these into one status.

## 16. Immediate starting assignment for the next coding agent

Begin with repository inspection and CI. Check the actual GitHub Actions result of `RiotCue CI` and fix any TypeScript or dependency incompatibility, if present. Add/verify package-lock.json. Then set up a disposable Supabase test project and prove with two anonymous sessions that:
1. the host starts a room,
2. guest joins,
3. spectator cannot access private prompt,
4. countdown transitions to playing at the server's deadline,
5. two concurrent win actions award exactly 10 points total,
6. timeouts are final and ignore stale wins,
7. actor rotation excludes spectators,
8. room subscriptions update all browser windows.

Deliver a small PR with tests and a status table. Do not begin AI voice work until these properties are proved. Keep the experience fast, fun, and unmistakably RiotCue.
