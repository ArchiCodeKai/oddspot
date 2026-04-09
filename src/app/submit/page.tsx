"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CATEGORY_OPTIONS } from "@/lib/constants/categories";

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "容易（任何人都能去）" },
  { value: "medium", label: "中等（需要一點努力）" },
  { value: "hard", label: "困難（需要特別準備）" },
];

export default function SubmitPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [form, setForm] = useState({
    name: "",
    nameEn: "",
    description: "",
    category: "",
    lat: "",
    lng: "",
    address: "",
    difficulty: "easy",
    recommendedTime: "",
    legend: "",
    imageUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-500 text-sm">載入中...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6">
        <p className="text-zinc-300 text-center">投稿景點需要先登入</p>
        <button
          onClick={() => router.push("/map")}
          className="text-sm text-zinc-500 underline"
        >
          回到地圖
        </button>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!form.name || !form.category || isNaN(lat) || isNaN(lng)) {
      setError("名稱、分類、緯度、經度為必填");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          nameEn: form.nameEn || undefined,
          description: form.description || undefined,
          category: form.category,
          lat,
          lng,
          address: form.address || undefined,
          difficulty: form.difficulty,
          recommendedTime: form.recommendedTime || undefined,
          legend: form.legend || undefined,
          imageUrl: form.imageUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error ?? "投稿失敗");
        return;
      }

      setSuccess(true);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6">
        <div className="text-4xl">🗺️</div>
        <h2 className="text-white text-lg font-medium">投稿成功！</h2>
        <p className="text-zinc-400 text-sm text-center">
          你的景點已送出審核，通過後會出現在地圖上。
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              setSuccess(false);
              setForm({ name: "", nameEn: "", description: "", category: "", lat: "", lng: "", address: "", difficulty: "easy", recommendedTime: "", legend: "", imageUrl: "" });
            }}
            className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-lg"
          >
            繼續投稿
          </button>
          <button
            onClick={() => router.push("/map")}
            className="px-4 py-2 text-sm bg-white text-zinc-900 rounded-lg font-medium"
          >
            回到地圖
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/map")}
            className="text-zinc-500 hover:text-zinc-300"
          >
            ←
          </button>
          <h1 className="text-lg font-medium">投稿奇特景點</h1>
        </div>

        <p className="text-zinc-500 text-sm mb-6">
          發現了什麼奇怪的地方？分享給大家！投稿審核通過後會出現在地圖上。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">景點名稱 *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="例：萬華地下神秘廟宇"
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">英文名稱（選填）</label>
            <input
              name="nameEn"
              value={form.nameEn}
              onChange={handleChange}
              placeholder="e.g. Wanhua Underground Temple"
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">分類 *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
              required
            >
              <option value="">選擇分類</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">GPS 座標 *</label>
            <div className="flex gap-2">
              <input
                name="lat"
                value={form.lat}
                onChange={handleChange}
                placeholder="緯度（例：25.0478）"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                required
              />
              <input
                name="lng"
                value={form.lng}
                onChange={handleChange}
                placeholder="經度（例：121.5319）"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                required
              />
            </div>
            <p className="text-xs text-zinc-600">
              在 Google Maps 上長按地點，即可複製座標
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">地址（選填）</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="例：台北市萬華區某某路123號"
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">到達難度</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">景點描述（選填）</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="描述這個地方有什麼特別的..."
              rows={3}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">傳說或故事（選填）</label>
            <textarea
              name="legend"
              value={form.legend}
              onChange={handleChange}
              placeholder="這個地方有什麼奇怪的故事或傳說嗎？"
              rows={2}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">建議造訪時間（選填）</label>
            <input
              name="recommendedTime"
              value={form.recommendedTime}
              onChange={handleChange}
              placeholder="例：深夜、日落時分、平日下午"
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">圖片網址（選填）</label>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://..."
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-white text-zinc-900 rounded-lg font-medium text-sm disabled:opacity-50 mt-1"
          >
            {submitting ? "送出中..." : "送出審核"}
          </button>
        </form>
      </div>
    </div>
  );
}
