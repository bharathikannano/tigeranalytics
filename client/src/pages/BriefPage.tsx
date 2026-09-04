// ─────────────────────────────────────────────────────────────────────────────
// BriefPage.tsx — Loads PROJECT_BRIEF.html (served from /public) inside a
//                 full-viewport iframe, identical to ArchitecturePage pattern.
// ─────────────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  return (
    <div className="flex-1 w-full flex flex-col" style={{ background: '#070c18' }}>
      <iframe
        src="/brief.html"
        title="Project Brief — Deliverables"
        className="w-full flex-1 border-0"
        style={{ minHeight: 'calc(100vh - 64px)' }}
      />
    </div>
  );
}
