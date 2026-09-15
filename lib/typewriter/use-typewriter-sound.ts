"use client";

import { useEffect, useRef, useState } from "react";

type Sound = "key" | "space" | "return" | "bell" | "paper" | "stamp" | "send";

export function useTypewriterSound() {
  const [enabled, setEnabled] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);
  const enabledRef = useRef(true);

  useEffect(() => () => { void contextRef.current?.close().catch(() => {}); }, []);

  function play(kind: Sound) {
    if (!enabledRef.current) return;
    try {
      const context = contextRef.current ?? new AudioContext();
      if (!contextRef.current) {
        contextRef.current = context;
        const master = context.createGain();
        master.gain.value = 0.36;
        master.connect(context.destination);
        masterRef.current = master;
        const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        noiseRef.current = buffer;
      }
      if (context.state === "suspended") void context.resume().catch(() => setUnavailable(true));
      const master = masterRef.current!;
      const now = context.currentTime;
      const noise = (delay: number, duration: number, frequency: number, volume: number) => {
        const source = context.createBufferSource();
        source.buffer = noiseRef.current;
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = frequency;
        filter.Q.value = 0.75;
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(volume, now + delay + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
        source.connect(filter).connect(gain).connect(master);
        source.start(now + delay);
        source.stop(now + delay + duration);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      };
      const tone = (delay: number, duration: number, frequency: number, volume: number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + delay);
        gain.gain.setValueAtTime(volume, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
        oscillator.connect(gain).connect(master);
        oscillator.start(now + delay);
        oscillator.stop(now + delay + duration);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      };
      if (kind === "key" || kind === "space") {
        noise(0, 0.045, kind === "key" ? 2400 + Math.random() * 600 : 1000, 0.5);
        tone(0.003, 0.065, kind === "key" ? 175 : 95, 0.21);
        noise(0.032, 0.035, 3700, 0.18);
      } else if (kind === "bell") {
        tone(0, 0.8, 2350, 0.15); tone(0, 0.48, 3520, 0.06);
      } else if (kind === "return") {
        for (let i = 0; i < 7; i++) noise(i * 0.035, 0.04, 900 + i * 130, 0.2);
        tone(0.22, 0.08, 110, 0.2);
      } else if (kind === "paper") {
        noise(0, 0.45, 1450, 0.35); noise(0.18, 0.28, 2600, 0.2);
      } else if (kind === "stamp") {
        noise(0, 0.12, 650, 0.55); tone(0, 0.12, 80, 0.3);
      } else {
        noise(0, 0.7, 1500, 0.3);
        [523.25, 659.25, 783.99].forEach((frequency, i) => tone(0.25 + i * 0.16, 0.9, frequency, 0.1));
      }
    } catch { setUnavailable(true); }
  }

  function toggle() {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    const context = contextRef.current;
    if (context && masterRef.current) masterRef.current.gain.setTargetAtTime(next ? 0.36 : 0, context.currentTime, 0.01);
    if (next) play("key");
  }

  return { enabled, unavailable, play, toggle };
}
