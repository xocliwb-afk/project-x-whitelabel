"use client";

type LockState = {
  count: number;
  prevHtmlOverflowX: string;
  prevBodyOverflowX: string;
  prevHtmlOverflow: string;
  prevBodyOverflow: string;
};

const state: LockState = {
  count: 0,
  prevHtmlOverflowX: "",
  prevBodyOverflowX: "",
  prevHtmlOverflow: "",
  prevBodyOverflow: "",
};

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (state.count === 0) {
    const html = document.documentElement;
    const body = document.body;
    state.prevHtmlOverflowX = html.style.overflowX;
    state.prevBodyOverflowX = body.style.overflowX;
    state.prevHtmlOverflow = html.style.overflow;
    state.prevBodyOverflow = body.style.overflow;
    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
  }
  state.count += 1;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  if (state.count === 0) return;
  state.count -= 1;
  if (state.count === 0) {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflowX = state.prevHtmlOverflowX;
    body.style.overflowX = state.prevBodyOverflowX;
    html.style.overflow = state.prevHtmlOverflow;
    body.style.overflow = state.prevBodyOverflow;
  }
}
