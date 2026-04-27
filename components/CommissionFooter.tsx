'use client';

export default function CommissionFooter() {
  return (
    <section
      id="commission-footer"
      className="px-4 md:px-8 py-8 md:py-10"
      style={{ borderBottom: '0.5px solid var(--border)' }}
    >
      <div className="grid gap-6 md:gap-10 md:grid-cols-[1fr_auto] md:items-end">

        <div>
          <div
            className="font-mono uppercase mb-3"
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
            className="text-[20px] md:text-[22px]"
            style={{
              fontWeight: 600,
              lineHeight: 1.3,
              color: 'var(--text)',
              marginBottom: 8,
              letterSpacing: '-0.01em',
            }}
          >
            Build one of these for your team.
          </h2>
          <p
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--muted)',
              lineHeight: 1.6,
              maxWidth: 560,
            }}
          >
            A scoped, production-ready tool inside your business in two weeks.
            Your workflow, your users, ours to ship.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="https://cal.com/browsergroup/20min"
            target="_blank"
            rel="noopener noreferrer"
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
            How it works
          </a>
        </div>

      </div>
    </section>
  );
}
