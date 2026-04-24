function DetailScreen({ spotId, onBack }) {
  const spot = SAMPLE_SPOTS.find(s => s.id === spotId) || SAMPLE_SPOTS[0];
  const Glyph = CATEGORY_GLYPHS[spot.category];
  return (
    <div style={{ position: "absolute", inset: 0, background: TOKENS.bg, overflowY: "auto" }}>
      {/* Hero — monochrome gradient + giant glyph placeholder */}
      <div style={{ height: 320, position: "relative", background: spot.hero, overflow: "hidden" }}>
        {/* Giant centered glyph (photo stand-in until real imagery lands) */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: TOKENS.accent, opacity: 0.5,
          filter: `drop-shadow(0 0 30px rgb(${TOKENS.accentRgb} / 0.5))`,
        }}>
          {Glyph && <Glyph size={140} />}
        </div>
        {/* Horizontal scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(0,229,204,0.04) 3px, rgba(0,229,204,0.04) 4px)",
        }} />
        {/* Noise */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          opacity: 0.10, mixBlendMode: "screen",
        }} />
        {/* Bottom fade into page bg */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(4,12,10,0.35) 0%, transparent 35%, transparent 55%, ${TOKENS.bg} 100%)` }} />

        <button onClick={onBack} style={{
          position: "absolute", top: 16, left: 16, zIndex: 10,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          border: `1px solid rgb(${TOKENS.accentRgb} / 0.25)`,
          color: TOKENS.accent, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><Icon.Back size={18} /></button>
        <div style={{ position: "absolute", top: 22, right: 20 }}>
          <BrandTag>OddSpot / spot #{spot.id.padStart(3, "0")}</BrandTag>
        </div>
        <div style={{ position: "absolute", bottom: 28, left: 20, fontFamily: "var(--font-brand, monospace)", fontSize: 10, letterSpacing: "0.22em", color: TOKENS.accent, opacity: 0.8 }}>
          {CATEGORY_CODES[spot.category]} · placeholder imagery
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 24px 120px", marginTop: -24, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <CategoryBadge category={spot.category} />
          <StatusBadge status={spot.status} />
        </div>
        <h1 style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: TOKENS.fg, margin: 0 }}>
          {spot.name}
        </h1>
        <p style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 12, color: TOKENS.muted, margin: "6px 0 0", letterSpacing: "0.08em" }}>
          {spot.nameEn}
        </p>

        {/* meta strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, margin: "24px 0", padding: "14px 0", borderTop: `1px solid ${TOKENS.line}`, borderBottom: `1px solid ${TOKENS.line}` }}>
          {[
            ["Distance", `${spot.distanceKm} KM`],
            ["Difficulty", DIFFICULTY_LABELS[spot.difficulty]],
            ["Time", "~30 MIN"],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: TOKENS.muted }}>{k}</div>
              <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 14, color: TOKENS.fg, marginTop: 4, letterSpacing: "0.04em", fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>

        <section>
          <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: TOKENS.muted, marginBottom: 10 }}>
            Description
          </div>
          <p style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 15, color: TOKENS.fg, lineHeight: 1.8, letterSpacing: "0.04em", margin: 0 }}>
            {spot.description}
          </p>
        </section>

        {spot.legend && (
          <section style={{ marginTop: 28, padding: 16, background: TOKENS.panel, border: `1px solid ${TOKENS.line}`, borderRadius: 2, position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 2,
              background: "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(0,229,204,0.025) 3px, rgba(0,229,204,0.025) 4px)",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: TOKENS.accent, marginBottom: 10 }}>
                Local Legend · 在地傳說
              </div>
              <p style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 14, color: TOKENS.fg, lineHeight: 1.7, margin: 0, letterSpacing: "0.04em" }}>
                {spot.legend}
              </p>
            </div>
          </section>
        )}

        <section style={{ marginTop: 28 }}>
          <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: TOKENS.muted, marginBottom: 10 }}>
            Location
          </div>
          <div style={{ padding: 14, background: TOKENS.panelLight, border: `1px solid ${TOKENS.line}`, borderRadius: 2, fontFamily: "var(--font-brand, monospace)" }}>
            <div style={{ fontSize: 11, color: TOKENS.muted, letterSpacing: "0.12em" }}>→ {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</div>
          </div>
        </section>

        <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
          <Button variant="accent" icon={<Icon.External />} style={{ flex: 1 }}>Google Maps</Button>
          <Button variant="primary" icon={<Icon.Heart size={16} filled />} style={{ flex: 1 }}>Save</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DetailScreen });
