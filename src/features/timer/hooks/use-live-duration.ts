"use client";

import { useSyncExternalStore } from "react";

let cachedNow = Date.now();

function subscribeTick(callback: () => void): () => void {
  cachedNow = Date.now();
  const id = setInterval(() => {
    cachedNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(id);
}

const noopSubscribe = () => () => {};
const getSnapshot = () => cachedNow;
const getServerSnapshot = () => 0;

export function useLiveDuration(startTimeIso: string | undefined): number {
  const now = useSyncExternalStore(
    startTimeIso ? subscribeTick : noopSubscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!startTimeIso) return 0;
  const started = new Date(startTimeIso).getTime();
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
