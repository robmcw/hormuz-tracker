'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY     = 'hormuz-commission-modal-dismissed-at';
const SCROLL_TRIGGER  = 0.35;        // fire at 35% of page scrolled
const MIN_DELAY_MS    = 8_000;       // don't fire before 8s on page
const TIME_FALLBACK_MS = 15_000;     // fire after 15s of foreground dwell, even without scroll
const COOLDOWN_MS     = 60 * 60_000; // re-show 1h after dismissal

export default function CommissionModal() {
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const force = new URLSearchParams(window.location.search).has('cta');
    if (force) { setOpen(true); return; }

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    if (dismissedAt && Date.now() - dismissedAt < COOLDOWN_MS) return;

    let fired = false;
    let foregroundMs = 0;
    let lastTick = Date.now();
    const startedAt = Date.now();

    const fire = () => {
      if (fired) return;
      fired = true;
      setOpen(true);
      window.removeEventListener('scroll', onScroll);
      clearInterval(dwellTimer);
    };

    const onScroll = () => {
      if (fired) return;
      const scrolled = window.scrollY;
      const height   = document.documentElement.scrollHeight - window.innerHeight;
      const ratio    = height > 0 ? scrolled / height : 0;
      if (ratio >= SCROLL_TRIGGER && Date.now() - startedAt >= MIN_DELAY_MS) fire();
    };

    // Foreground-only dwell timer: only counts time while the tab is visible,
    // so a backgrounded tab doesn't accumulate seconds and ambush the user.
    const dwellTimer = setInterval(() => {
      if (fired) return;
      const now = Date.now();
      if (document.visibilityState === 'visible') {
        foregroundMs += now - lastTick;
      }
      lastTick = now;
      if (foregroundMs >= TIME_FALLBACK_MS) fire();
    }, 1000);

    const onVisibility = () => { lastTick = Date.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(dwellTimer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  if (!mounted || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commission-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: 'rgba(3,8,16,0.78)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 200ms ease-out',
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] p-6 sm:p-10 md:p-11"
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 6,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.08)',
          animation: 'modalIn 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-[4px] transition-colors"
          style={{ color: 'var(--faint)', background: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(221,234,245,0.06)';
            e.currentTarget.style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--faint)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1 L13 13 M13 1 L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div
          className="font-mono uppercase mb-5"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            color: 'var(--warning-text)',
          }}
        >
          Browser · 2-week product accelerator
        </div>

        <h2
          id="commission-modal-title"
          className="text-[20px] sm:text-[24px]"
          style={{
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--text)',
            marginBottom: 20,
            letterSpacing: '-0.01em',
          }}
        >
          This prototype was built in a single sprint, by one developer, using only public data.
          <br />
          <span style={{ color: 'var(--warning-text)' }}>
            In two weeks, with yours, we&apos;d ship something your team could actually use on Monday.
          </span>
        </h2>

        <p
          style={{
            fontSize: 15,
            color: 'var(--muted)',
            lineHeight: 1.65,
            marginBottom: 28,
          }}
        >
          The 2-week accelerator is what this <em style={{ fontStyle: 'italic', color: 'var(--text)' }}>isn&apos;t</em>:
          your workflow mapped, your problem scoped, your users in the room while we iterate, and production
          handoff to your team. Custom underwriter co-pilots. Internal intel dashboards. Broker-facing
          submission triage. One sharp workflow, shipped.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <a
            href="https://calendar.app.google/PeHDxggJAjXRudgs6"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-flex items-center gap-2 font-mono uppercase transition-transform"
            style={{
              fontSize: 12,
              letterSpacing: '0.12em',
              padding: '13px 22px',
              background: 'var(--warning-text)',
              color: '#08111e',
              borderRadius: 4,
              fontWeight: 700,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Book a 20-min call →
          </a>
          <a
            href="https://www.browserlondon.com/2-week-product-accelerator/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="inline-flex items-center font-mono uppercase transition-colors"
            style={{
              fontSize: 12,
              letterSpacing: '0.12em',
              padding: '13px 20px',
              background: 'transparent',
              color: 'var(--text)',
              border: '0.5px solid var(--border)',
              borderRadius: 4,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Find out more
          </a>
        </div>

        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: 'var(--faint)',
            letterSpacing: '0.04em',
            borderTop: '0.5px solid var(--border)',
            paddingTop: 14,
          }}
        >
          Or email{' '}
          <a
            href="mailto:hello@browsergroup.com?subject=Re%3A%20Hormuz%20prototype"
            style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
          >
            hello@browsergroup.com
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
