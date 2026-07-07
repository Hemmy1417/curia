"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { CuriaWordmark } from "./Logo";
import { ConnectButton } from "./ConnectButton";

const links = [
  { href: "/",         label: "Home" },
  { href: "/docket",   label: "Docket" },
  { href: "/new",      label: "New round" },
  { href: "/chambers", label: "Chambers" },
  { href: "/record",   label: "Record" },
];

export function Nav() {
  const path = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = drawerOpen ? "hidden" : previous || "";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path?.startsWith(href);

  return (
    <>
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: "rgba(240, 244, 249, 0.85)",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        <nav className="mx-auto max-w-6xl px-5 h-[64px] flex items-center gap-4">
          <Link href="/" className="hover:opacity-80 transition-opacity shrink-0">
            <CuriaWordmark size="sm" />
          </Link>

          {/* Desktop links — Material pill nav */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                  style={{
                    color: active ? "var(--primary)" : "var(--ink-soft)",
                    background: active ? "var(--primary-soft)" : "transparent",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ConnectButton />
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                color: "var(--ink)",
              }}
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              {drawerOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            className="md:hidden fixed inset-0 z-40 animate-fade-in"
            style={{ background: "rgba(27, 28, 30, 0.3)", backdropFilter: "blur(4px)" }}
          />
          <aside
            id="mobile-drawer"
            className="md:hidden fixed right-3 top-[72px] z-40 w-[78%] max-w-[300px] animate-slide-in card p-2"
            style={{ boxShadow: "0 12px 32px rgba(11,87,208,0.18)" }}
          >
            <ul className="flex flex-col">
              {links.map((l) => {
                const active = isActive(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="block px-4 py-3 rounded-2xl text-sm font-semibold transition-colors"
                      style={{
                        color: active ? "var(--primary)" : "var(--ink-soft)",
                        background: active ? "var(--primary-soft)" : "transparent",
                      }}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="hairline my-1" />
            <div className="px-4 py-2 text-[10px] text-muted">
              Adjudicated on GenLayer · Studionet
            </div>
          </aside>
        </>
      )}
    </>
  );
}
