"use client";

import { useEffect, useRef } from "react";

type UseLongPressArgs = {
  onLongPress: () => void;
  onCancel?: () => void;
  thresholdMs?: number;
  moveThresholdPx?: number;
};

type LongPressHandlers = {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: (e: PointerEvent) => void;
  onPointerLeave: (e: PointerEvent) => void;
};

export function useLongPress({
  onLongPress,
  onCancel,
  thresholdMs = 300,
  moveThresholdPx = 12,
}: UseLongPressArgs): LongPressHandlers {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const triggeredRef = useRef(false);

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    startRef.current = { x: e.clientX, y: e.clientY };
    triggeredRef.current = false;
    clear();
    timerRef.current = window.setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, thresholdMs);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "touch" || !startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > moveThresholdPx) {
      clear();
      onCancel?.();
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    if (!triggeredRef.current) {
      onCancel?.();
    }
    clear();
    startRef.current = null;
    triggeredRef.current = false;
  };

  const handlePointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    clear();
    startRef.current = null;
    triggeredRef.current = false;
    onCancel?.();
  };

  useEffect(() => {
    return () => clear();
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
  };
}
