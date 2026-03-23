"use client";

import styles from "./Header.module.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import SearchFiltersBar, { SortButton } from "@/components/SearchFiltersBar";
import { useLeadModalStore } from "@/stores/useLeadModalStore";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";

export default function Header() {
  const { mapSide, paneDominance, setMapSide, setPaneDominance } = useTheme();
  const pathname = usePathname();
  const isSearchPage = pathname?.startsWith("/search");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [neighborhoodsOpen, setNeighborhoodsOpen] = useState(false);
  const [neighborhoodsMobileOpen, setNeighborhoodsMobileOpen] = useState(false);
  const openLeadModal = useLeadModalStore((s) => s.open);
  const neighborhoodsMenuRef = useRef<HTMLDivElement | null>(null);

  const neighborhoods = [
    { label: "Grand Rapids", href: "/grand-rapids" },
    { label: "Ada", href: "/ada" },
    { label: "Byron Center", href: "/byron-center" },
    { label: "Caledonia", href: "/caledonia" },
    { label: "East Grand Rapids", href: "/east-grand-rapids" },
    { label: "Grandville", href: "/grandville" },
    { label: "Kentwood", href: "/kentwood" },
    { label: "Rockford", href: "/rockford" },
    { label: "Wyoming", href: "/wyoming" },
  ];
  // Keep in sync with apps/web/next.config.js neighborhoodSlugs

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Search", href: "/search" },
    { label: "Buy Smarter", href: "/buy" },
    { label: "Sell with Clarity", href: "/sell" },
    { label: "Build", href: "/build" },
    { label: "About", href: "/about" },
  ];

  const isNeighborhoodPath = (path?: string | null) => {
    if (!path) return false;
    if (path === "/neighborhoods") return true;
    return neighborhoods.some((n) => n.href === path);
  };

  const isActive = (href: string) => pathname === href || (href === "/neighborhoods" && isNeighborhoodPath(pathname));

  const navLinkClass = (href: string) =>
    [styles.navLink, isActive(href) ? styles.isActive : ""].join(" ").trim();

  const mainNavItems = navItems.filter((item) => item.label !== "About");
  const aboutNavItem = navItems.find((item) => item.label === "About");

  const pillClasses = (active: boolean) =>
    [
      "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors",
      active
        ? "bg-primary text-white border-primary"
        : "border-white/70 text-slate-800 bg-white/80 hover:bg-white",
    ].join(" ");

  useEffect(() => {
    if (!neighborhoodsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!neighborhoodsMenuRef.current) return;
      if (!neighborhoodsMenuRef.current.contains(e.target as Node)) {
        setNeighborhoodsOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNeighborhoodsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [neighborhoodsOpen]);

  useEffect(() => {
    setNeighborhoodsOpen(false);
    setNeighborhoodsMobileOpen(false);
    setFiltersOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFiltersOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [filtersOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [mobileOpen]);

  return (
    <header className="flex shrink-0 flex-col">
      <nav className={styles.topNav}>
        <div className={styles.topNavInner}>
          <Link href="/" className={styles.topNavBrand} onClick={() => setMobileOpen(false)}>
            <Image
              src="/assets/img/bw-home-group-logo.webp"
              alt="Brandon Wilcox Home Group"
              width={44}
              height={44}
              className={styles.topNavLogo}
              priority
            />
            <span className={styles.topNavBrandText}>Brandon Wilcox Home Group</span>
          </Link>

          <div className={styles.topNavLinks}>
            {mainNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            <span className="relative" ref={neighborhoodsMenuRef}>
              <button
                type="button"
                className={navLinkClass("/neighborhoods")}
                aria-haspopup="true"
                aria-expanded={neighborhoodsOpen}
                aria-controls="neighborhoods-menu"
                onClick={() => setNeighborhoodsOpen((prev) => !prev)}
              >
                Neighborhoods
              </button>
              {neighborhoodsOpen && (
                <div
                  id="neighborhoods-menu"
                  className="absolute left-1/2 top-10 z-50 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-lg"
                >
                  <ul className="space-y-1">
                    {neighborhoods.map((n) => (
                      <li key={n.href}>
                        <Link
                          href={n.href}
                          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100"
                          onClick={() => setNeighborhoodsOpen(false)}
                        >
                          {n.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </span>
            {aboutNavItem && (
              <Link href={aboutNavItem.href} className={navLinkClass(aboutNavItem.href)}>
                {aboutNavItem.label}
              </Link>
            )}
            <button
              type="button"
              onClick={() =>
                openLeadModal({ intent: "talk-to-brandon", entrySource: "header-nav-desktop" })
              }
              className={styles.navLink}
            >
              Contact
            </button>
          </div>

          <button
            type="button"
            className={styles.topNavToggle}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={`${styles.mobileNav} ${mobileOpen ? styles.mobileNavOpen : ""}`}>
        <div className={styles.mobileNavBackdrop} onClick={() => setMobileOpen(false)} />
        <div className={styles.mobileNavInner}>
          <button
            type="button"
            className={styles.mobileNavClose}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
          <ul className={styles.mobileNavList}>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={navLinkClass(item.href)}
                  onClick={() => {
                    setMobileOpen(false);
                    setNeighborhoodsMobileOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className={`${styles.navLink} flex w-full items-center justify-between`}
                aria-expanded={neighborhoodsMobileOpen}
                aria-controls="mobile-neighborhoods-list"
                onClick={() => setNeighborhoodsMobileOpen((prev) => !prev)}
              >
                <span>Neighborhoods</span>
                <span aria-hidden="true">{neighborhoodsMobileOpen ? "−" : "+"}</span>
              </button>
              {neighborhoodsMobileOpen && (
                <ul id="mobile-neighborhoods-list" className="mt-1 space-y-1 pl-4">
                  {neighborhoods.map((n) => (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className="block rounded-md px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
                        onClick={() => {
                          setMobileOpen(false);
                          setNeighborhoodsMobileOpen(false);
                        }}
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li>
              <button
                type="button"
                className={styles.navLink}
                onClick={() => {
                  openLeadModal({ intent: "talk-to-brandon", entrySource: "header-nav-mobile" });
                  setMobileOpen(false);
                }}
              >
                Contact
              </button>
            </li>
          </ul>
        </div>
      </div>

      {isSearchPage && (
        <>
          <div className="mt-16 w-full border-b border-border bg-primary-accent py-2 text-slate-900 lg:mt-0">
            <div className="mx-auto hidden w-full max-w-[1920px] items-center gap-3 px-4 sm:px-6 lg:flex lg:flex-nowrap lg:px-6">
              <div className="flex-1 min-w-0">
                <SearchFiltersBar />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <SortButton />
                <button
                  type="button"
                  onClick={() =>
                    openLeadModal({ intent: "get-details", entrySource: "header-search-cta" })
                  }
                  className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:brightness-95"
                >
                  Plan a tour
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMapMenuOpen((prev) => !prev)}
                    className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-full border border-white/60 bg-white/80 text-primary transition hover:bg-white"
                    aria-label="Map layout controls"
                  >
                    <span className="block h-0.5 w-4 bg-primary" />
                    <span className="block h-0.5 w-4 bg-primary" />
                    <span className="block h-0.5 w-4 bg-primary" />
                  </button>
                  {mapMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl">
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Map location
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={pillClasses(mapSide === "left")}
                            onClick={() => setMapSide("left")}
                          >
                            Left
                          </button>
                          <button
                            type="button"
                            className={pillClasses(mapSide === "right")}
                            onClick={() => setMapSide("right")}
                          >
                            Right
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Panel size
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className={pillClasses(paneDominance === "left")}
                            onClick={() => setPaneDominance("left")}
                          >
                            Left 60%
                          </button>
                          <button
                            type="button"
                            className={pillClasses(paneDominance === "right")}
                            onClick={() => setPaneDominance("right")}
                          >
                            Right 60%
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mx-auto flex w-full max-w-[1920px] items-center gap-2 px-4 sm:px-6 lg:hidden">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="h-10 rounded-full bg-white px-4 text-sm font-semibold text-primary shadow-sm transition hover:brightness-95"
              >
                Filters
              </button>
              <div className="hidden md:block">
                <SortButton />
              </div>
            </div>
          </div>
          {filtersOpen && (
            <div className="fixed inset-0 z-[70] lg:hidden">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setFiltersOpen(false)}
              />
              <div
                className="pointer-events-none absolute inset-0 p-2 sm:p-3"
              >
                <div
                  className="pointer-events-auto h-full overflow-y-auto overflow-x-hidden rounded-xl bg-white shadow-xl"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Filters"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white p-4">
                    <h2 className="text-lg font-semibold text-text-main">Filters</h2>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="h-10 w-10 rounded-full border border-border text-lg font-semibold text-text-main"
                      aria-label="Close filters"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4">
                    <SearchFiltersBar layout="drawer" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </header>
  );
}
