"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Script from "next/script";
import LeadForm from "./LeadForm";
import { useLeadModalStore } from "@/stores/useLeadModalStore";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function LeadModalContainer() {
  const { isOpen, intent, entrySource, listingId, listingAddress, close, setIntent } =
    useLeadModalStore();
  const pathname = usePathname();
  const [shouldLoadRecaptcha, setShouldLoadRecaptcha] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldLoadRecaptcha(true);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => unlockScroll();
  }, [isOpen]);

  useEffect(() => {
    // Close modal on route change to avoid stale context
    close();
  }, [pathname, close]);

  const handleSelectIntent = (selected: "schedule-showing" | "get-details" | "talk-to-brandon") => {
    setIntent(selected);
  };

  const showIntentSelector = !intent;
  const canSchedule = Boolean(listingId);

  return (
    <>
      {RECAPTCHA_SITE_KEY && shouldLoadRecaptcha ? (
        <Script
          id="recaptcha-v3"
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
            RECAPTCHA_SITE_KEY
          )}`}
          strategy="afterInteractive"
        />
      ) : null}
      {isOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
              onClick={close}
            >
              <div
                className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <button
                  type="button"
                  onClick={close}
                  className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/80"
                  aria-label="Close lead form"
                >
                  ✕
                </button>

                {showIntentSelector ? (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-text-main">How can we help?</h2>
                    <div className="grid gap-3">
                      {canSchedule && (
                        <button
                          type="button"
                          onClick={() => handleSelectIntent("schedule-showing")}
                          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left font-semibold hover:bg-slate-50"
                        >
                          Schedule a Showing
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectIntent("get-details")}
                        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left font-semibold hover:bg-slate-50"
                      >
                        Get Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectIntent("talk-to-brandon")}
                        className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left font-semibold hover:bg-slate-50"
                      >
                        Talk to Brandon
                      </button>
                    </div>
                  </div>
                ) : (
                  <LeadForm
                    intent={intent}
                    entrySource={entrySource}
                    listingId={listingId}
                    listingAddress={listingAddress}
                    onSuccess={close}
                    onCancel={close}
                  />
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
