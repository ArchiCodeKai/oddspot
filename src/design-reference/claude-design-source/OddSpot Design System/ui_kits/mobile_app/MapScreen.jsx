function MapScreen({ onOpenSpot }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const selected = SAMPLE_SPOTS.find(s => s.id === selectedId);

  const pinPositions = {
    "1": { x: 72, y: 22 },
    "2": { x: 38, y: 45 },
    "3": { x: 22, y: 28 },
    "4": { x: 58, y: 62 },
    "5": { x: 44, y: 78 },
    "6": { x: 82, y: 48 },
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "#040c0a", overflow: "hidden" }}>
      {/* Map canvas — subtle dark teal/black, not washed-out */}
      <div style={{
        position: "absolute", inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,229,204,0.04), transparent 60%),
          linear-gradient(to bottom right, #081612, #040c0a 70%)
        `,
      }}>
        {/* Grid pattern */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke={TOKENS.accent} strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Fake roads / contours */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M 0 30 Q 30 22, 55 35 T 100 40" stroke={TOKENS.muted} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M 20 0 Q 35 40, 45 70 T 60 100" stroke={TOKENS.muted} strokeWidth="0.3" fill="none" opacity="0.4" />
          <path d="M 100 65 Q 60 70, 30 88" stroke={TOKENS.muted} strokeWidth="0.3" fill="none" opacity="0.4" />
        </svg>
      </div>

      {/* Atmosphere layer — noise + vignette */}
      <SceneBg variant="map" />

      {/* Top-right control cluster */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <button style={{
          background: TOKENS.panelGlass, backdropFilter: "blur(16px)",
          border: `1px solid ${TOKENS.line}`, borderRadius: 2,
          padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
          color: TOKENS.muted, cursor: "pointer",
        }}>
          <Icon.Filter size={14} />
          <span style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>Filter · 8</span>
        </button>
      </div>

      {/* Top-left brand tag */}
      <div style={{ position: "absolute", top: 18, left: 18, zIndex: 10 }}>
        <BrandTag>sys://oddspot / map</BrandTag>
      </div>

      {/* User location */}
      <div style={{ position: "absolute", left: "50%", top: "52%", transform: "translate(-50%, -50%)", zIndex: 5 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: TOKENS.accent, boxShadow: `0 0 0 6px rgb(${TOKENS.accentRgb} / 0.2), 0 0 0 12px rgb(${TOKENS.accentRgb} / 0.1), 0 0 20px ${TOKENS.accent}` }} />
      </div>

      {/* Pins — monochrome, differentiated by glyph */}
      {SAMPLE_SPOTS.map(s => {
        const pos = pinPositions[s.id];
        if (!pos) return null;
        const Glyph = CATEGORY_GLYPHS[s.category];
        const isSel = selectedId === s.id;
        return (
          <button key={s.id} onClick={() => setSelectedId(s.id)} style={{
            position: "absolute", left: `${pos.x}%`, top: `${pos.y}%`,
            transform: `translate(-50%, -100%) scale(${isSel ? 1.15 : 1})`,
            background: "transparent", border: "none", cursor: "pointer", padding: 0, zIndex: isSel ? 8 : 6,
            transition: "transform 180ms",
            filter: isSel ? `drop-shadow(0 0 10px rgb(${TOKENS.accentRgb} / 0.9))` : `drop-shadow(0 0 5px rgb(${TOKENS.accentRgb} / 0.45))`,
          }}>
            <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
              <path d="M14 2 C20 2, 25 7, 25 13 C25 20, 14 32, 14 32 C14 32, 3 20, 3 13 C3 7, 8 2, 14 2 Z"
                    fill="#040c0a" stroke={TOKENS.accent} strokeWidth="1.5" />
              {/* Glyph is rendered by a nested container so we control color */}
              <foreignObject x="5" y="3" width="18" height="18">
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ color: TOKENS.accent, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Glyph && <Glyph size={12} />}
                </div>
              </foreignObject>
            </svg>
          </button>
        );
      })}

      {/* Spot popup */}
      {selected && (
        <div style={{
          position: "absolute", bottom: 88, left: 16, right: 16, zIndex: 15,
          background: TOKENS.panelGlass, backdropFilter: "blur(20px)",
          border: `1px solid ${TOKENS.lineStrong}`, borderRadius: 2,
          padding: 14, boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 32px rgb(${TOKENS.accentRgb} / 0.1)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 2, background: selected.hero, flexShrink: 0,
                border: `1px solid ${TOKENS.line}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: TOKENS.accent,
              }}>
                {(() => { const G = CATEGORY_GLYPHS[selected.category]; return G ? <G size={24} /> : null; })()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                  <CategoryBadge category={selected.category} />
                </div>
                <div style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 14, fontWeight: 700, color: TOKENS.fg, lineHeight: 1.2 }}>
                  {selected.name}
                </div>
                <div style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, color: TOKENS.muted, letterSpacing: "0.08em", marginTop: 3 }}>
                  {selected.distanceKm} KM · {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedId(null)} style={{ background: "transparent", border: "none", color: TOKENS.muted, cursor: "pointer", padding: 4 }}>
              <Icon.Close size={16} />
            </button>
          </div>
          <button onClick={() => onOpenSpot(selected.id)} style={{
            marginTop: 12, width: "100%",
            background: "transparent", color: TOKENS.accent,
            border: `1px solid ${TOKENS.accent}`,
            borderRadius: 2, padding: "10px 14px", cursor: "pointer",
            fontFamily: "var(--font-brand, monospace)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            View detail <Icon.ChevR />
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MapScreen });
