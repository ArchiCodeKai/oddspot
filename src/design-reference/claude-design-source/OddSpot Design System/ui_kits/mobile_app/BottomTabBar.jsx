function BottomTabBar({ active, onChange }) {
  const tabs = [
    { key: "map", label: "Map", icon: <Icon.Map /> },
    { key: "swipe", label: "Swipe", icon: <Icon.Swipe /> },
    { key: "submit", label: "Submit", icon: <Icon.Plus /> },
  ];
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      background: TOKENS.panelGlass,
      backdropFilter: "blur(18px)",
      borderTop: `1px solid ${TOKENS.lineStrong}`,
      paddingBottom: 14,
      zIndex: 20,
    }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: "10px 0 6px", position: "relative",
            color: isActive ? TOKENS.accent : TOKENS.muted,
            transition: "color 180ms",
            minHeight: 44,
          }}>
            {isActive && <div style={{ position: "absolute", top: 0, width: 40, height: 1, background: TOKENS.accent, boxShadow: `0 0 8px rgb(${TOKENS.accentRgb} / 0.7)` }} />}
            {t.icon}
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { BottomTabBar });
