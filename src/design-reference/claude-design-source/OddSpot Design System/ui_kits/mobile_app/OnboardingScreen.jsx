function OnboardingScreen({ onStart }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: TOKENS.bg,
      backgroundImage: `
        radial-gradient(circle at 76% 14%, rgba(0,229,204,0.16), transparent 30%),
        radial-gradient(circle at 15% 88%, rgba(0,229,204,0.10), transparent 35%)
      `,
      display: "flex", flexDirection: "column",
      padding: "40px 24px 80px",
      color: TOKENS.fg,
      fontFamily: "'Space Mono', monospace",
      overflow: "hidden",
    }}>
      {/* CRT scanline */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(0,229,204,0.03) 3px, rgba(0,229,204,0.03) 4px)",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
        <BrandTag>sys://oddspot</BrandTag>
        <BrandTag>v0.1.0 · beta</BrandTag>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 24, position: "relative", zIndex: 1 }}>
        <EyeMark size={96} />
        <BrandTag glow>B-Grade Spot Explorer</BrandTag>
        <div>
          <h1 style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 38, fontWeight: 700, lineHeight: 1.1,
            margin: 0, color: TOKENS.fg,
            textShadow: `0 0 32px rgb(${TOKENS.accentRgb} / 0.25)`,
          }}>
            發現台灣城市裡<br/>那些說不清楚的地方。
          </h1>
          <p style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 14, color: TOKENS.muted, marginTop: 16, lineHeight: 1.7, letterSpacing: "0.04em",
          }}>
            不是觀光導覽。也不是打卡點。<br/>只是你附近那些「誰會特地來啊」的地方。
          </p>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <Button variant="accent" onClick={onStart} icon={<Icon.ArrowR />} style={{ width: "100%" }}>
          Start / 開始探索
        </Button>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: TOKENS.muted, textAlign: "center", marginTop: 14 }}>
          Softly catastrophic · Made in Taiwan
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen });
