"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, browserSupabase } from "@/lib/client/guest";
import { labelForPhase, visibleSeconds } from "@/lib/game/timing";
import type { PrivatePrompt, RoomSnapshot } from "@/lib/game/types";
import { LiveStage } from "@/components/LiveStage";
import { AudioCues } from "@/components/AudioCues";

type RequestError = Error & { status?: number };
const activePhases = ["countdown", "playing"];

export function RoomView({ code }: { code: string }) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [joinRequired, setJoinRequired] = useState(false);
  const [name, setName] = useState("");
  const [spectator, setSpectator] = useState(false);
  const [prompt, setPrompt] = useState<PrivatePrompt | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [clockOffset, setClockOffset] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await api<RoomSnapshot>(`/rooms/${code}`);
      setSnapshot(response);
      setClockOffset(Date.parse(response.serverNow) - Date.now());
      setJoinRequired(false);
      setError("");
    } catch (err) {
      const requestError = err as RequestError;
      if (requestError.status === 403) {
        setJoinRequired(true);
      } else {
        setError(requestError.message || "Unable to load room");
      }
    }
  }, [code]);

  useEffect(() => {
    setName(localStorage.getItem("riotcue-name") ?? "");
    void refresh();
    const clockId = window.setInterval(() => setClock(Date.now()), 200);
    const pollId = window.setInterval(() => void refresh(), 3000);
    return () => { window.clearInterval(clockId); window.clearInterval(pollId); };
  }, [refresh]);

  // Refresh at authoritative phase deadlines as well as on realtime events.
  const activeDeadline = snapshot?.room.phase === "countdown"
    ? snapshot.room.countdown_ends_at
    : snapshot?.room.phase === "playing" ? snapshot.room.round_ends_at : null;
  useEffect(() => {
    if (!activeDeadline) return;
    const delay = Math.max(100, Date.parse(activeDeadline) - (Date.now() + clockOffset) + 120);
    const timerId = window.setTimeout(() => void refresh(), Math.min(delay, 2147483647));
    return () => window.clearTimeout(timerId);
  }, [activeDeadline, clockOffset, refresh]);

  const roomId = snapshot?.room.id;
  useEffect(() => {
    if (!roomId) return;
    const db = browserSupabase();
    const channel = db.channel(`riotcue-room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => void refresh())
      .subscribe();
    return () => { void db.removeChannel(channel); };
  }, [roomId, refresh]);

  const room = snapshot?.room;
  const isActor = Boolean(snapshot && room?.actor_id === snapshot.me);
  const isHost = Boolean(snapshot && room?.host_id === snapshot.me);
  const self = snapshot?.members.find(m => m.user_id === snapshot.me);
  const actor = snapshot?.members.find(m => m.user_id === room?.actor_id);
  const playing = Boolean(room && activePhases.includes(room.phase));

  useEffect(() => {
    let valid = true;
    if (!isActor || !playing || !room) {
      setPrompt(null);
      return;
    }
    void api<PrivatePrompt>(`/rooms/${code}/prompt`).then(data => {
      if (valid) setPrompt(data);
    }).catch(() => { if (valid) setPrompt(null); });
    return () => { valid = false; };
  }, [code, isActor, playing, room?.round_no, room?.phase]);

  const scoreboard = useMemo(() =>
    [...(snapshot?.members ?? [])].filter(m => m.role !== "spectator")
      .sort((a,b) => b.score - a.score || a.joined_at.localeCompare(b.joined_at)),
    [snapshot?.members]
  );

  const seconds = room?.phase === "countdown"
    ? visibleSeconds(room.countdown_ends_at, clock + clockOffset)
    : room?.phase === "playing"
      ? visibleSeconds(room.round_ends_at, clock + clockOffset)
      : 0;
  const timer = `${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError("");
    try {
      await api(`/rooms/${code}/join`, {
        method: "POST", body: JSON.stringify({ name, spectator })
      });
      localStorage.setItem("riotcue-name", name.trim());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join");
    } finally { setPending(false); }
  }

  async function action(kind: "start" | "next" | "win") {
    setPending(true); setError("");
    try {
      await api(`/rooms/${code}/action`, {
        method: "POST", body: JSON.stringify({ action: kind })
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Game action failed");
      await refresh();
    } finally { setPending(false); }
  }

  async function share() {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
      setError("Invite link copied. Send it to your crew!");
    } catch {
      setError(`Share this link: ${link}`);
    }
  }

  if (joinRequired) {
    return (
      <div className="room-shell">
        <div className="join-card panel">
          <p className="eyebrow">YOU'VE BEEN SUMMONED</p>
          <h1>JOIN <em>THE RIOT.</em></h1>
          <p>Room <strong>{code}</strong> is calling. Bring your best bad acting.</p>
          <form onSubmit={join}>
            <label htmlFor="player-name">YOUR STAGE NAME</label>
            <input id="player-name" value={name} onChange={e=>setName(e.target.value)} maxLength={32} required placeholder="Your legendary name" />
            <label className="toggle-label">
              <input type="checkbox" checked={spectator} onChange={e=>setSpectator(e.target.checked)} />
              WATCH ONLY (NO ACTING REQUIRED)
            </label>
            <button type="submit" className="button button-primary" disabled={pending}>
              {pending ? "JOINING..." : "ENTER THE PARTY →"}
            </button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </div>
    );
  }

  if (!snapshot || !room) {
    return <div className="room-shell loading"><h2>LOADING YOUR CREW...</h2>{error && <p className="error">{error}</p>}</div>;
  }

  return (
    <div className="room-shell">
      <section className="room-top">
        <div>
          <p className="eyebrow">WELCOME TO THE RIOT</p>
          <h1 className="room-title">PARTY <em>IN PROGRESS.</em></h1>
        </div>
        <div className="room-code">
          <span>ROOM CODE</span>
          <strong>{room.code}</strong>
          <button onClick={() => void share()} aria-label="Copy party invite link">COPY INVITE ↗</button>
        </div>
      </section>

      <div className="game-layout">
        <section className="game-main">
          <div className={`game-status phase-${room.phase}`}>
            <div className="status-header">
              <span>ROUND {room.round_no || "—"} / {room.total_rounds}</span>
              <span>{labelForPhase(room.phase)}</span>
            </div>
            <AudioCues phase={room.phase} seconds={seconds} />
            <div className="countdown" aria-live="off">
              {room.phase === "countdown" ? (
                <><span className="countdown-icon">🚀</span><strong>{seconds}</strong><small>LAUNCH IN</small></>
              ) : room.phase === "playing" ? (
                <><strong>{timer}</strong><small>SECONDS TO NAIL IT</small></>
              ) : room.phase === "won" ? (
                <><span className="outcome-icon">✦</span><strong>NAILED IT!</strong><small>+10 POINTS · THE CROWD GOES WILD</small></>
              ) : room.phase === "expired" ? (
                <><span className="outcome-icon">💥</span><strong>BOOM!</strong><small>TIME'S UP · NEXT ROUND!</small></>
              ) : room.phase === "finished" ? (
                <><span className="outcome-icon">🏆</span><strong>FINAL SCORES</strong><small>THAT WAS GLORIOUS.</small></>
              ) : (
                <><span className="outcome-icon">⚡</span><strong>GET READY</strong><small>THE HOST LAUNCHES THE GAME</small></>
              )}
            </div>
            <p className="actor-line">
              {actor ? `ON STAGE: ${actor.display_name}` : "WAITING FOR THE FIRST ACTOR"}
            </p>
            {room.public_answer && (
              <div className="reveal">THE ANSWER WAS <strong>{room.public_answer}</strong></div>
            )}
          </div>

          {isActor && playing && (
            <div className="secret-card">
              <span>🔒 ACTOR'S EYES ONLY</span>
              <strong>{prompt?.round_no === room.round_no ? prompt.prompt : "GETTING YOUR SECRET CUE..."}</strong>
              <small>ACT IT OUT. NO WORDS. NO SPOILERS.</small>
            </div>
          )}

          <LiveStage code={room.code} />
          <div className="action-bar">
            {room.phase === "lobby" && isHost && (
              <button className="button button-primary" onClick={() => void action("start")} disabled={pending}>🚀 LAUNCH FIRST ROUND</button>
            )}
            {room.phase === "playing" && (isHost || isActor) && (
              <button className="button button-win" onClick={() => void action("win")} disabled={pending}>✓ GOT IT! +10 POINTS</button>
            )}
            {["won", "expired"].includes(room.phase) && isHost && (
              <button className="button button-primary" onClick={() => void action("next")} disabled={pending}>
                {room.round_no >= room.total_rounds ? "REVEAL FINAL SCORES →" : "LAUNCH NEXT ROUND →"}
              </button>
            )}
            {self?.role === "spectator" && <span className="hint">WATCH-ONLY MODE · ENJOY THE SHOW</span>}
            {!isHost && room.phase === "lobby" && <span className="hint">WAITING FOR THE HOST TO LAUNCH...</span>}
            {error && <p role="status" className="hint">{error}</p>}
          </div>
        </section>

        <aside className="score-panel">
          <h2>THE LEADERBOARD <span>↗</span></h2>
          <p className="panel-intro">Every round is somebody's moment.</p>
          <ol className="score-list">
            {scoreboard.map((member, index) => (
              <li key={member.user_id} className={member.user_id===room.actor_id ? "active-score" : ""}>
                <span className="rank">{String(index+1).padStart(2,"0")}</span>
                <div><strong>{member.display_name}</strong><small>{member.role==="host"?"HOST":member.user_id===room.actor_id?"ON STAGE":"PLAYER"}</small></div>
                <b>{member.score}</b>
              </li>
            ))}
          </ol>
          <div className="spectator-info">
            <span>◉ LIVE CREW</span>
            <strong>{snapshot.members.length}</strong>
            <small>{snapshot.members.filter(m=>m.role==="spectator").length} spectators</small>
          </div>
          <div className="rule-box">
            <strong>PARTY RULES</strong>
            <p>The actor sees a secret cue. Everyone else shouts guesses. Host or actor taps <b>GOT IT!</b> to lock the win.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
