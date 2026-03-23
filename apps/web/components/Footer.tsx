"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const teamEmail = ["Brandon", "bwhomegroup.com"] as const;
  const brokerEmail = ["office", "616realty.com"] as const;
  const openEmail = (parts: readonly [string, string]) => {
    window.location.href = `mailto:${parts[0]}@${parts[1]}`;
  };

  return (
    <footer className="mt-8 w-full bg-primary text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Your Agent
            </p>
            <div>
              <p className="text-lg font-bold">Brandon Wilcox</p>
              <p className="text-sm text-white/80">Licensed REALTOR®</p>
              <p className="text-sm text-white/80">Licensed Builder #242300064</p>
            </div>
            <div className="text-sm text-white/90">
              <p>
                <a href="tel:+16163085359" className="inline-flex items-center py-1 hover:underline">
                  616-308-5359
                </a>
              </p>
              <p>
                <a
                  href="#"
                  className="inline-flex items-center py-1 hover:underline"
                  aria-label="Email Brandon Wilcox"
                  onClick={(e) => {
                    e.preventDefault();
                    openEmail(teamEmail);
                  }}
                >
                  Email Brandon
                </a>
              </p>
              <p>
                <Link href="/" className="inline-flex items-center py-1 hover:underline">
                  bwhomegroup.com
                </Link>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Brokerage
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://616realty.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Static local footer logo; keep <img> to avoid any layout/behavior drift in lint-only cleanup */}
                <img
                  src="/assets/img/logo (for non-white backgrounds).webp"
                  alt="616 Realty"
                  width={85}
                  height={48}
                  className="h-12 w-auto shrink-0 opacity-80 transition hover:opacity-100"
                />
              </a>
              <div className="text-sm text-white/85">
                <p className="font-semibold">Licensed under 616 Realty</p>
                <p>1171 Plainfield Ave NE</p>
                <p>Grand Rapids, MI 49503</p>
                <p>
                  <a
                    href="#"
                    className="hover:underline"
                    aria-label="Email 616 Realty office"
                    onClick={(e) => {
                      e.preventDefault();
                      openEmail(brokerEmail);
                    }}
                  >
                    Email 616 Realty Office
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-4 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p>© {currentYear} Brandon Wilcox Home Group. All rights reserved.</p>
            <p>Each office is independently owned and operated.</p>
          </div>
          <div className="flex flex-col items-start gap-3 text-xs md:flex-row md:items-center md:gap-6">
            <div className="flex gap-3 text-white">
              <Link href="/privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms-of-use" className="hover:underline">
                Terms of Use
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- Static local footer badge; keep <img> to avoid any layout/behavior drift in lint-only cleanup */}
            <img
              src="/assets/img/realtor.webp"
              alt="Realtor / Equal Housing"
              width={919}
              height={451}
              className="h-8 w-auto opacity-80"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
