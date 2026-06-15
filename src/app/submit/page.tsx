"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { getCategoryOptions, getDifficultyLabel } from "@/lib/i18n/spotMeta";
import { compressSubmitImage, MAX_SUBMIT_PHOTOS } from "@/lib/submit/imageCompression";
import { parseGoogleMapsInput } from "@/lib/submit/googleMapsPaste";

const emptySubmitForm = {
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
};

export default function SubmitPage() {
  const router = useRouter();
  const { user } = useSession();
  // 跟 next-auth 的回傳形態對齊（避免下游邏輯重寫）
  const session = user ? { user } : null;
  const tMeta = useTranslations("spotMeta");

  const [form, setForm] = useState(emptySubmitForm);
  const [mapPaste, setMapPaste] = useState("");
  const [mapPasteStatus, setMapPasteStatus] = useState("");
  const [compressedPhotoDataUrls, setCompressedPhotoDataUrls] = useState<string[]>([]);
  const [photoStatus, setPhotoStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const categoryOptions = getCategoryOptions(tMeta);
  const difficultyOptions = ["easy", "medium", "hard"].map((value) => ({
    value,
    label: getDifficultyLabel(tMeta, value),
  }));

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

  function handleMapPasteParse() {
    const parsed = parseGoogleMapsInput(mapPaste);
    if (!parsed) {
      setMapPasteStatus("尚未讀到座標。短網址請先打開後複製完整 Google Maps 網址或座標。");
      return;
    }

    setForm((prev) => ({
      ...prev,
      lat: String(Number(parsed.lat.toFixed(6))),
      lng: String(Number(parsed.lng.toFixed(6))),
    }));
    setMapPasteStatus(`已帶入座標 ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_SUBMIT_PHOTOS);
    e.target.value = "";
    if (files.length === 0) return;

    setError("");
    setPhotoStatus("壓縮中...");

    try {
      const compressed = await Promise.all(files.map((file) => compressSubmitImage(file)));
      setCompressedPhotoDataUrls(compressed);
      setPhotoStatus(`已壓縮 ${compressed.length} 張照片，送出時會上傳到雲端並送審。`);
    } catch (photoError) {
      setCompressedPhotoDataUrls([]);
      setPhotoStatus("");
      setError(photoError instanceof Error ? photoError.message : "照片處理失敗，請重新選擇");
    }
  }

  function handleRemovePhoto(index: number) {
    const nextPhotos = compressedPhotoDataUrls.filter((_, photoIndex) => photoIndex !== index);
    setCompressedPhotoDataUrls(nextPhotos);
    setPhotoStatus(nextPhotos.length > 0 ? `已壓縮 ${nextPhotos.length} 張照片，送出時會上傳到雲端並送審。` : "");
  }

  function resetForm() {
    setForm(emptySubmitForm);
    setMapPaste("");
    setMapPasteStatus("");
    setCompressedPhotoDataUrls([]);
    setPhotoStatus("");
  }

  async function uploadSubmitPhoto(dataUrl: string, index: number) {
    const photoBlob = await fetch(dataUrl).then((response) => response.blob());
    const formData = new FormData();
    formData.append("file", photoBlob, `spot-photo-${index + 1}.jpg`);

    const res = await fetch("/api/uploads/spots", {
      method: "POST",
      body: formData,
    });
    const payload = await res.json();

    if (!payload.success || !payload.data?.url) {
      throw new Error(payload.error ?? "照片上傳失敗");
    }

    return payload.data.url as string;
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
      const imageUrls = compressedPhotoDataUrls.length > 0
        ? await Promise.all(compressedPhotoDataUrls.map((dataUrl, index) => uploadSubmitPhoto(dataUrl, index)))
        : [];

      if (imageUrls.length > 0) {
        setPhotoStatus("照片已上傳，正在送出審核。");
      }

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
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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
        <div
          className="px-3 py-2 text-[10px] uppercase tracking-[0.28em]"
          style={{
            border: "1px solid var(--line)",
            color: "var(--accent)",
            boxShadow: "0 0 18px rgb(var(--accent-rgb) / 0.16)",
          }}
        >
          archive://pending
        </div>
        <h2 className="text-white text-lg font-medium">投稿成功！</h2>
        <p className="text-zinc-400 text-sm text-center">
          你的景點已送出審核，通過後會出現在地圖上。
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              setSuccess(false);
              resetForm();
            }}
            className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-xs"
          >
            繼續投稿
          </button>
          <button
            onClick={() => router.push("/submissions")}
            className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-xs"
          >
            查看投稿狀態
          </button>
          <button
            onClick={() => router.push("/map")}
            className="px-4 py-2 text-sm bg-white text-zinc-900 rounded-xs font-medium"
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
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
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
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">分類 *</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
              required
            >
              <option value="">選擇分類</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">Google Maps 貼上（選填）</label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                value={mapPaste}
                onChange={(e) => setMapPaste(e.target.value)}
                placeholder="貼上座標或 Google Maps 網址"
                className="min-w-0 bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="button"
                onClick={handleMapPasteParse}
                className="px-3 py-2.5 text-xs font-bold tracking-[0.16em] uppercase border border-zinc-700 text-zinc-300 rounded-xs hover:border-zinc-500 hover:text-white"
              >
                解析
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              支援一般座標、Google Maps `@lat,lng`、`q=` 與 `ll=` 格式。
            </p>
            {mapPasteStatus && (
              <p className="text-xs" style={{ color: mapPasteStatus.startsWith("已") ? "var(--accent)" : "var(--muted)" }}>
                {mapPasteStatus}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">GPS 座標 *</label>
            <div className="flex gap-2">
              <input
                name="lat"
                value={form.lat}
                onChange={handleChange}
                placeholder="緯度（例：25.0478）"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                required
              />
              <input
                name="lng"
                value={form.lng}
                onChange={handleChange}
                placeholder="經度（例：121.5319）"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                required
              />
            </div>
            <p className="text-xs text-zinc-600">
              可手動填寫，也可用上方貼上欄位自動帶入。
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">地址（選填）</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="例：台北市萬華區某某路123號"
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">到達難度</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
            >
              {difficultyOptions.map((opt) => (
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
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
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
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">建議造訪時間（選填）</label>
            <input
              name="recommendedTime"
              value={form.recommendedTime}
              onChange={handleChange}
              placeholder="例：深夜、日落時分、平日下午"
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-400">照片（選填，最多 3 張）</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
              className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xs px-3 py-3 text-sm text-zinc-300 file:mr-3 file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-zinc-900 file:rounded-xs"
            />
            <p className="text-xs text-zinc-600">
              系統會先壓縮照片，再上傳到雲端儲存並送審。
            </p>
            {photoStatus && (
              <p className="text-xs" style={{ color: "var(--accent)" }}>
                {photoStatus}
              </p>
            )}
            {compressedPhotoDataUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {compressedPhotoDataUrls.map((src, index) => (
                  <div
                    key={`${src.slice(0, 32)}-${index}`}
                    className="relative aspect-square overflow-hidden border border-zinc-800 rounded-xs bg-zinc-900"
                  >
                    <img
                      src={src}
                      alt={`投稿照片預覽 ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      aria-label={`移除第 ${index + 1} 張照片`}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center border border-zinc-700 bg-zinc-950/80 text-xs text-zinc-300 rounded-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-white text-zinc-900 rounded-xs font-medium text-sm disabled:opacity-50 mt-1"
          >
            {submitting ? "送出中..." : "送出審核"}
          </button>
        </form>
      </div>
    </div>
  );
}
