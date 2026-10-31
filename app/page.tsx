"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/guest";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [custom, setCustom] = useState("120");
  const [rounds, setRounds] = useState(5);
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError("");
    try {
      const chosen = duration === "custom" ? Number(custom) : Number(duration);
      const result = await api<{code:string}>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name, duration: chosen, rounds })
      });
      localStorage.setItem("riotcue-name", name.trim());
      router.push(`/room/${result.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create room");
    } finally { setPending(false); }
  }

  function joinExisting(event: React.FormEvent) {
    event.preventDefault();
    router.push(`/room/${joinCode.toUpperCase().trim()}`);
  }

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">THE PARTY DOESN'T WAIT</p>
        <h1>ACT LOUD.<br /><em>GUESS WILD.</em></h1>
        <p className="subline">Secret prompts. Live cameras. A rocket countdown. One ridiculously good time.</p>
        <div className="hero-pills">
          <span>5 · 4 · 3 · 2 · 1</span><span>NO ACCOUNTS</span><span>INSTANT WINS</span>
        </div>
      </section>
      <section className="home-grid">
        <form onSubmit={createRoom} className="panel">
          <div className="panel-head"><span>01</span><h2>HOST THE CHAOS</h2></div>
          <label htmlFor="host-name">YOUR STAGE NAME</label>
          <input id="host-name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Captain Chaos" maxLength={32} required />
          <label htmlFor="duration">ROUND TIMER</label>
          <select id="duration" value={duration} onChange={e=>setDuration(e.target.value)}>
            <option value="60">60 seconds · Fast and fierce</option>
            <option value="90">90 seconds · Extra drama</option>
            <option value="custom">Custom timer</option>
          </select>
          {duration === "custom" && (
            <input aria-label="Custom timer in seconds" type="number" min={15} max={300} value={custom} onChange={e=>setCustom(e.target.value)} />
          )}
          <label htmlFor="rounds">NUMBER OF ROUNDS</label>
          <input id="rounds" type="number" min={1} max={30} value={rounds} onChange={e=>setRounds(Number(e.target.value))} required />
          <button disabled={pending} className="button button-primary" type="submit">
            {pending ? "LAUNCHING..." : "CREATE THE PARTY →"}
          </button>
          {error && <p role="alert" className="error">{error}</p>}
        </form>
        <form onSubmit={joinExisting} className="panel panel-alt">
          <div className="panel-head"><span>02</span><h2>CRASH THE PARTY</h2></div>
          <p>Got a room code? Jump into the action, or watch the glorious disaster unfold.</p>
          <label htmlFor="join-code">SIX-CHARACTER ROOM CODE</label>
          <input id="join-code" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={6} minLength={6} placeholder="R1OTC2" required />
          <button className="button button-secondary" type="submit">JOIN THE CREW →</button>
          <div className="callout">No signups. No downloads. Just your favorite people being ridiculous.</div>
        </form>
      </section>
    </div>
  );
}
