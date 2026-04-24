function SpotCard({ spot, style, onDragEnd, dragging }) {
  const Glyph = CATEGORY_GLYPHS[spot.category];
  return (
    <div style={{
      position: "absolute", inset: 0,
      borderRadius: 2, overflow: "hidden",
      background: TOKENS.panel,
      border: `1px solid ${TOKENS.line}`,
      boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 32px rgb(${TOKENS.accentRgb} / 0.08)`,
      cursor: dragging ? "grabbing" : "grab",
      ...style,
    }}>
      {/* Hero block — monochrome, category glyph front & center as placeholder */}
      <div style={{ height: "52%", width: "100%", position: "relative", background: spot.hero }}>
        {/* Giant centered glyph */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color: TOKENS.accent, opacity: 0.55,
          filter: `drop-shadow(0 0 20px rgb(${TOKENS.accentRgb} / 0.4))`,
        }}>
          {Glyph && <Glyph size={96} />}
        </div>
        {/* Scanlines */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(0,229,204,0.04) 3px, rgba(0,229,204,0.04) 4px)",
        }} />
        {/* Noise */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
          opacity: 0.08, mixBlendMode: "screen",
        }} />
        {/* Corner code */}
        <div style={{ position: "absolute", top: 10, left: 10, fontFamily: "var(--font-brand, monospace)", fontSize: 9, letterSpacing: "0.22em", color: TOKENS.accent, opacity: 0.7 }}>
          {CATEGORY_CODES[spot.category]} · #{spot.id.padStart(3, "0")}
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(to bottom, transparent, ${TOKENS.panel})` }} />
      </div>
      <div style={{ height: "48%", padding: "16px 20px 20px", background: TOKENS.panel }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          <CategoryBadge category={spot.category} />
          <StatusBadge status={spot.status} />
          <span style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 10, color: TOKENS.muted, letterSpacing: "0.12em", alignSelf: "center", textTransform: "uppercase" }}>
            {DIFFICULTY_LABELS[spot.difficulty]}
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: TOKENS.fg, margin: 0 }}>
          {spot.name}
        </h2>
        <p style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 11, color: TOKENS.muted, margin: "4px 0 0", letterSpacing: "0.04em" }}>
          {spot.nameEn}
        </p>
        <p style={{ fontFamily: "var(--font-content, sans-serif)", fontSize: 13, color: TOKENS.muted, margin: "14px 0 0", lineHeight: 1.7, letterSpacing: "0.04em", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {spot.description}
        </p>
      </div>
    </div>
  );
}

function SwipeActionBar({ onSkip, onAddToTrip, onSave, tripCount }) {
  /* all three buttons use the same monochrome treatment — differentiate by icon + label only */
  const btn = (onClick, children, label, emphasis = false) => (
    <button onClick={onClick} style={{
      position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
      background: "transparent",
      border: "none", cursor: "pointer", padding: "4px 10px",
      color: emphasis ? TOKENS.accent : TOKENS.muted,
      transition: "color 180ms",
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 2,
        border: `1px solid ${emphasis ? TOKENS.accent : TOKENS.lineStrong}`,
        background: emphasis ? `rgb(${TOKENS.accentRgb} / 0.08)` : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: emphasis ? `0 0 16px rgb(${TOKENS.accentRgb} / 0.25)` : "none",
      }}>
        {children}
      </span>
      <span style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase" }}>{label}</span>
    </button>
  );
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-around",
      padding: "10px 20px",
      background: TOKENS.panelGlass, backdropFilter: "blur(18px)",
      border: `1px solid ${TOKENS.line}`, borderRadius: 2,
      boxShadow: `0 0 24px rgb(${TOKENS.accentRgb} / 0.08)`,
    }}>
      {btn(onSkip, <Icon.Close size={20} />, "Skip")}
      {btn(onAddToTrip, (<>
        <Icon.Plus size={20} />
        {tripCount > 0 && <span style={{ position: "absolute", top: 0, right: 4, fontSize: 8, fontFamily: "var(--font-brand, monospace)", fontWeight: 700, color: TOKENS.accent, background: TOKENS.bg, padding: "1px 4px", borderRadius: 2, border: `1px solid ${TOKENS.accent}` }}>{tripCount}</span>}
      </>), `Trip · ${tripCount}/5`, true)}
      {btn(onSave, <Icon.Heart size={20} />, "Save")}
    </div>
  );
}

function SwipeScreen({ onOpenSpot }) {
  const [index, setIndex] = React.useState(0);
  const [tripCount, setTripCount] = React.useState(0);
  const [drag, setDrag] = React.useState({ x: 0, active: false });
  const [toast, setToast] = React.useState(null);
  const startX = React.useRef(0);
  const current = SAMPLE_SPOTS[index];
  const next = SAMPLE_SPOTS[index + 1];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const advance = () => {
    setDrag({ x: 0, active: false });
    setTimeout(() => setIndex(i => i + 1), 180);
  };

  const onSkip = () => { setDrag({ x: -600, active: false }); setTimeout(advance, 200); };
  const onSave = () => { setDrag({ x: 600, active: false }); setTimeout(advance, 200); };
  const onAddToTrip = () => {
    if (tripCount >= 5) { showToast("今日行程已達上限（5 個地點）"); return; }
    setTripCount(c => c + 1);
    onSave();
  };

  const onPointerDown = (e) => { startX.current = e.clientX; setDrag({ x: 0, active: true }); };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    setDrag({ x: e.clientX - startX.current, active: true });
  };
  const onPointerUp = () => {
    if (Math.abs(drag.x) > 100) { drag.x > 0 ? onSave() : onSkip(); }
    else setDrag({ x: 0, active: false });
  };

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(180deg, #051512 0%, #040c0a 65%)",
      display: "flex", flexDirection: "column", paddingTop: 20, paddingBottom: 88,
    }}>
      <SceneBg variant="swipe" />

      {/* Top bar */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px 16px" }}>
        <button style={{ background: "transparent", border: "none", color: TOKENS.muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <Icon.Filter />
          <span style={{ fontFamily: "var(--font-brand, monospace)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Filter</span>
        </button>
        <BrandTag>sys://oddspot / swipe</BrandTag>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: i < tripCount ? TOKENS.accent : "transparent",
              border: i < tripCount ? "none" : `1px solid ${TOKENS.line}`,
              boxShadow: i < tripCount ? `0 0 6px rgb(${TOKENS.accentRgb} / 0.6)` : "none",
              transition: "all 180ms",
            }} />
          ))}
        </div>
      </div>

      {/* Card stack */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "center" }}
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
        {current ? (
          <div style={{ position: "relative", width: "100%", maxWidth: 340, height: "min(500px, 72%)" }}>
            {next && <SpotCard spot={next} style={{ transform: "scale(0.95) translateY(12px)", opacity: 0.6 }} />}
            <div onPointerDown={onPointerDown} style={{
              position: "absolute", inset: 0,
              transform: `translateX(${drag.x}px) rotate(${drag.x * 0.05}deg)`,
              transition: drag.active ? "none" : "transform 260ms cubic-bezier(0.32,0.72,0,1)",
              touchAction: "none",
            }}>
              <SpotCard spot={current} dragging={drag.active} />
              {drag.x < -30 && (
                <div style={{ position: "absolute", left: 20, top: 50, padding: "6px 12px", border: `2px solid ${TOKENS.muted}`, color: TOKENS.muted, fontFamily: "var(--font-brand, monospace)", fontWeight: 700, fontSize: 16, letterSpacing: "0.2em", transform: "rotate(-15deg)", opacity: Math.min(1, Math.abs(drag.x)/120) }}>SKIP</div>
              )}
              {drag.x > 30 && (
                <div style={{ position: "absolute", right: 20, top: 50, padding: "6px 12px", border: `2px solid rgb(${TOKENS.accentRgb} / 0.8)`, color: TOKENS.accent, fontFamily: "var(--font-brand, monospace)", fontWeight: 700, fontSize: 16, letterSpacing: "0.2em", transform: "rotate(15deg)", opacity: Math.min(1, drag.x/120), textShadow: `0 0 12px rgb(${TOKENS.accentRgb} / 0.7)` }}>SAVE</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", color: TOKENS.muted, fontFamily: "var(--font-content, sans-serif)" }}>
            <EyeMark size={64} blinking={false} />
            <p style={{ marginTop: 20, fontSize: 15 }}>附近景點已全部看完</p>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>All nearby spots explored</p>
            <Button variant="accent" style={{ marginTop: 24 }} onClick={() => setIndex(0)}>Reset / 重新開始</Button>
          </div>
        )}
      </div>

      {/* Action bar */}
      {current && (
        <div style={{ position: "relative", zIndex: 2, padding: "0 20px 12px" }}>
          <SwipeActionBar onSkip={onSkip} onAddToTrip={onAddToTrip} onSave={onSave} tripCount={tripCount} />
        </div>
      )}

      {toast && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 50,
          padding: "14px 20px", background: TOKENS.panelGlass, backdropFilter: "blur(16px)",
          border: `1px solid ${TOKENS.lineStrong}`, borderRadius: 2,
          fontFamily: "var(--font-content, sans-serif)", fontSize: 14, color: TOKENS.fg,
          boxShadow: `0 0 24px rgb(${TOKENS.accentRgb} / 0.1)`,
        }}>{toast}</div>
      )}
    </div>
  );
}

Object.assign(window, { SpotCard, SwipeActionBar, SwipeScreen });
