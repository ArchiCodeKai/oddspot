"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

export function RandomSpotButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/spots?lat=${TAIPEI_CENTER.lat}&lng=${TAIPEI_CENTER.lng}&radius=20`
      );
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const spots = data.data;
        const pick = spots[Math.floor(Math.random() * spots.length)];
        router.push(`/spots/${pick.id}`);
      }
    } catch (e) {
      console.error("隨機景點載入失敗", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 28px",
        border: "1px solid rgba(0,229,204,0.18)",
        borderRadius: "2px",
        fontSize: "0.78rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--muted)",
        background: "transparent",
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.2s ease",
        opacity: loading ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (loading) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,204,0.4)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,204,0.18)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
      }}
    >
      {loading ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              border: "1.5px solid var(--muted)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          搜尋中
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 3 21 3 21 8" />
            <line x1="4" y1="20" x2="21" y2="3" />
            <polyline points="21 16 21 21 16 21" />
            <line x1="15" y1="15" x2="21" y2="21" />
          </svg>
          隨機景點
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
