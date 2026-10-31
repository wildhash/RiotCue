"use client";

import { useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { api } from "@/lib/client/guest";

type MediaToken = { enabled: false } | { enabled: true; token: string; url: string };

export function LiveStage({ code }: { code: string }) {
  const [media, setMedia] = useState<MediaToken | null>(null);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    setConnecting(true); setError("");
    try {
      const response = await api<MediaToken>(`/rooms/${code}/livekit`);
      setMedia(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera connection failed");
    } finally { setConnecting(false); }
  }

  if (media?.enabled) {
    return (
      <div className="stage live-stage">
        <LiveKitRoom
          serverUrl={media.url} token={media.token} connect
          audio={false} video={false}
          onError={err=>setError(err.message)}
          data-lk-theme="default"
        >
          <VideoConference />
        </LiveKitRoom>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }
  return (
    <div className="stage camera-placeholder">
      <span className="stage-symbol" aria-hidden="true">◉</span>
      <strong>THE STAGE IS YOURS</strong>
      <p>Cameras and microphones are opt-in. Enable LiveKit for the full live experience.</p>
      {media?.enabled === false ? (
        <span className="hint">LiveKit is not configured yet. The multiplayer game still works.</span>
      ) : (
        <button onClick={connect} disabled={connecting} className="button button-secondary">
          {connecting ? "CONNECTING..." : "ENABLE LIVE STAGE"}
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
