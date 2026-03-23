"use client";

import Link from "next/link";
import brand from "@/lib/brand";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const compliance = brand.compliance;

  return (
    <footer className="mt-8 w-full bg-primary text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Your Agent
            </p>
            <div>
              <p className="text-lg font-bold">{brand.agentName ?? brand.brandName}</p>
              <p className="text-sm text-white/80">Licensed REALTOR®</p>
              {compliance?.brokerLicense && (
                <p className="text-sm text-white/80">License #{compliance.brokerLicense}</p>
              )}
            </div>
            <div className="text-sm text-white/90">
              {brand.contact.phone && (
                <p>
                  <a
                    href={`tel:+1${brand.contact.phone.replace(/\D/g, "")}`}
                    className="inline-flex items-center py-1 hover:underline"
                  >
                    {brand.contact.phone}
                  </a>
                </p>
              )}
              <p>
                <a
                  href={`mailto:${brand.contact.email}`}
                  className="inline-flex items-center py-1 hover:underline"
                  aria-label={`Email ${brand.agentName ?? brand.brandName}`}
                >
                  Email {brand.agentName?.split(" ")[0] ?? "Us"}
                </a>
              </p>
            </div>
          </div>

          {compliance?.brokerageName && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                Brokerage
              </p>
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/85">
                  <p className="font-semibold">Licensed under {compliance.brokerageName}</p>
                  {brand.contact.address && <p>{brand.contact.address}</p>}
                  {compliance.brokerageEmail && (
                    <p>
                      <a
                        href={`mailto:${compliance.brokerageEmail}`}
                        className="hover:underline"
                        aria-label={`Email ${compliance.brokerageName} office`}
                      >
                        Email {compliance.brokerageName} Office
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-4 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p>© {currentYear} {brand.brandName}. All rights reserved.</p>
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
            {compliance?.equalHousingLogo && (
              /* eslint-disable-next-line @next/next/no-img-element -- Static local footer badge */
              <img
                src="/assets/img/realtor.webp"
                alt="Realtor / Equal Housing"
                width={919}
                height={451}
                className="h-8 w-auto opacity-80"
              />
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
