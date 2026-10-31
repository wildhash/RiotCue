"use client";

import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/lib/game/types";

function note(ctx: AudioContext, freq: number, delay: number, length: number, wave: OscillatorType = "sine") {
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(0.11, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
}

function boom(ctx: AudioContext) {
  const duration = 0.7;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < channel.length; i++) {
    const t = i / ctx.sampleRate;
    channel[i] = (Math.random() * 2 - 1) * Math.exp(-6 * t);
  }
  const source = ctx.createBufferSource();
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass"; lowpass.frequency.value = 400;
  const gain = ctx.createGain();
  gain.gain.value = 0.28;
  source.buffer = buffer;
  source.connect(lowpass).connect(gain).connect(ctx.destination);
  source.start();
}

export function AudioCues({ phase, seconds }: { phase: Phase; seconds: number }) {
  const [enabled, setEnabled] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const previous = useRef<string | null>(null);

  async function toggle() {
    if (!enabled) {
      const audio = ctx.current ?? new AudioContext();
      ctx.current = audio;
      await audio.resume();
      setEnabled(true);
    } else {
      setEnabled(false);
    }
  }

  useEffect(() => {
    if (!enabled || !ctx.current) return;
    const key = phase === "countdown" ? `countdown-${seconds}` : phase;
    if (previous.current === key) return;
    previous.current = key;
    const audio = ctx.current;
    if (phase === "countdown" && seconds >= 1 && seconds <= 5) {
      note(audio, seconds === 1 ? 880 : 440, 0, .15, "square");
    }
    if (phase === "playing") note(audio, 1046, 0, .42, "sawtooth");
    if (phase === "won") {
      note(audio, 523, 0, .16);
      note(audio, 659, .14, .18);
      note(audio, 784, .28, .18);
      note(audio, 1046, .43, .40);
    }
    if (phase === "expired") boom(audio);
  }, [enabled, phase, seconds]);

  useEffect(() => () => { void ctx.current?.close(); ctx.current = null; }, []);

  return (
    <button type="button" className="sound-toggle" onClick={() => void toggle()}>
      {enabled ? "◖ SOUND ON" : "◌ ENABLE SOUND"}
    </button>
  );
}
