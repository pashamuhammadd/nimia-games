/** Shared placeholder for the three tabs this Phase 0/1 slice deliberately
 * ships without real data yet (Services, Orders, Partner — see
 * docs/TELEGRAM.md's roadmap §19: those are Phase 2 "Read-only core",
 * built on top of the auth bridge this pass delivers). Home and Account
 * are real (they ARE the auth bridge's own UI), the other three are
 * honest "coming soon" screens rather than fake/hardcoded data, so
 * there's nothing here that looks done but isn't. */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="page">
      <h1 className="greeting">{title}</h1>
      <div className="card coming-soon">
        <p style={{ margin: 0 }}>{description}</p>
        <p className="hint">Coming in the next update.</p>
      </div>
    </div>
  );
}
