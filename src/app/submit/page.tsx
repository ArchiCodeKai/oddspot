"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import { getCategoryOptions, getDifficultyLabel } from "@/lib/i18n/spotMeta";
import { compressSubmitImage, ImageCompressionError, MAX_SUBMIT_PHOTOS } from "@/lib/submit/imageCompression";
import { isGoogleMapsShortUrl, parseGoogleMapsInput } from "@/lib/submit/googleMapsPaste";

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

type SubmitCoords = {
  lat: number;
  lng: number;
};

// 貼上狀態：ok 決定顏色（成功 accent、其他 muted），不靠字串開頭判斷
type MapPasteStatus = {
  text: string;
  ok: boolean;
};

const SubmitLocationMapPreview = dynamic(
  () => import("@/components/submit/SubmitLocationMapPreview").then((mod) => mod.SubmitLocationMapPreview),
  {
    ssr: false,
    loading: () => <LocationPreviewSkeleton />,
  }
);

export default function SubmitPage() {
  const router = useRouter();
  const { user } = useSession();
  // 跟 next-auth 的回傳形態對齊（避免下游邏輯重寫）
  const session = user ? { user } : null;
  const tMeta = useTranslations("spotMeta");
  const tSubmit = useTranslations("submitPage");

  const [form, setForm] = useState(emptySubmitForm);
  const [mapPaste, setMapPaste] = useState("");
  const [mapPasteStatus, setMapPasteStatus] = useState<MapPasteStatus | null>(null);
  const [sourceCoords, setSourceCoords] = useState<SubmitCoords | null>(null);
  const [locationPreviewResetKey, setLocationPreviewResetKey] = useState(0);
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
        <p className="text-zinc-300 text-center">{tSubmit("loginRequired")}</p>
        <button
          onClick={() => router.push("/map")}
          className="text-sm text-zinc-500 underline"
        >
          {tSubmit("backToMap")}
        </button>
      </div>
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function applyParsedCoordinates(lat: number, lng: number) {
    const nextCoords = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };
    setForm((prev) => ({
      ...prev,
      lat: String(nextCoords.lat),
      lng: String(nextCoords.lng),
    }));
    setSourceCoords(nextCoords);
    setLocationPreviewResetKey((current) => current + 1);
    setMapPasteStatus({ text: tSubmit("statusParsed", { lat: lat.toFixed(6), lng: lng.toFixed(6) }), ok: true });
  }

  function handleLocationPreviewChange(coords: { lat: number; lng: number }) {
    setForm((prev) => ({
      ...prev,
      lat: String(coords.lat),
      lng: String(coords.lng),
    }));
    setMapPasteStatus({ text: tSubmit("statusAdjusted", { lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) }), ok: true });
  }

  function handleResetLocationPreview() {
    if (!sourceCoords) return;

    setForm((prev) => ({
      ...prev,
      lat: String(sourceCoords.lat),
      lng: String(sourceCoords.lng),
    }));
    setLocationPreviewResetKey((current) => current + 1);
    setMapPasteStatus({ text: tSubmit("statusReset", { lat: sourceCoords.lat.toFixed(6), lng: sourceCoords.lng.toFixed(6) }), ok: true });
  }

  async function resolveGoogleMapsShortLink(value: string) {
    setMapPasteStatus({ text: tSubmit("statusResolving"), ok: false });
    try {
      const res = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const payload = await res.json();

      if (!payload.success || !payload.data) {
        setMapPasteStatus({ text: payload.error ?? tSubmit("statusNoCoordsFull"), ok: false });
        return;
      }

      applyParsedCoordinates(payload.data.lat, payload.data.lng);
    } catch {
      setMapPasteStatus({ text: tSubmit("statusResolveFailed"), ok: false });
    }
  }

  async function handleMapPasteChange(value: string) {
    setMapPaste(value);
    if (!value.trim()) {
      setMapPasteStatus(null);
      setSourceCoords(null);
      return;
    }

    const parsed = parseGoogleMapsInput(value);
    if (parsed) {
      applyParsedCoordinates(parsed.lat, parsed.lng);
      return;
    }

    if (isGoogleMapsShortUrl(value)) {
      await resolveGoogleMapsShortLink(value);
      return;
    }

    setMapPasteStatus({ text: tSubmit("statusNoCoords"), ok: false });
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_SUBMIT_PHOTOS);
    e.target.value = "";
    if (files.length === 0) return;

    setError("");
    setPhotoStatus(tSubmit("photoCompressing"));

    try {
      const compressed = await Promise.all(files.map((file) => compressSubmitImage(file)));
      setCompressedPhotoDataUrls(compressed);
      setPhotoStatus(tSubmit("photoCompressed", { count: compressed.length }));
    } catch (photoError) {
      setCompressedPhotoDataUrls([]);
      setPhotoStatus("");
      setError(
        photoError instanceof ImageCompressionError
          ? tSubmit(`imageErrors.${photoError.code}`)
          : tSubmit("errPhoto")
      );
    }
  }

  function handleRemovePhoto(index: number) {
    const nextPhotos = compressedPhotoDataUrls.filter((_, photoIndex) => photoIndex !== index);
    setCompressedPhotoDataUrls(nextPhotos);
    setPhotoStatus(nextPhotos.length > 0 ? tSubmit("photoCompressed", { count: nextPhotos.length }) : "");
  }

  function resetForm() {
    setForm(emptySubmitForm);
    setMapPaste("");
    setMapPasteStatus(null);
    setSourceCoords(null);
    setLocationPreviewResetKey(0);
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
      throw new Error(payload.error ?? tSubmit("errUpload"));
    }

    return payload.data.url as string;
  }

  // 投稿未完成時清掉已上傳的孤兒圖片（best-effort，不阻斷錯誤回報）
  async function cleanupUploadedPhotos(urls: string[]) {
    const valid = urls.filter(Boolean);
    if (valid.length === 0) return;
    try {
      await fetch("/api/uploads/spots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: valid }),
      });
    } catch (err) {
      console.error("清理已上傳照片失敗", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (!form.name || !form.category || isNaN(lat) || isNaN(lng)) {
      setError(tSubmit("errRequired"));
      setSubmitting(false);
      return;
    }

    // 依 index 就地填入，部分上傳成功後若有失敗，仍能在 catch 清理已成功的圖
    const uploadedUrls: string[] = [];

    try {
      if (compressedPhotoDataUrls.length > 0) {
        await Promise.all(
          compressedPhotoDataUrls.map(async (dataUrl, index) => {
            uploadedUrls[index] = await uploadSubmitPhoto(dataUrl, index);
          })
        );
        setPhotoStatus(tSubmit("photoUploaded"));
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
          imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        // 投稿被後端拒絕（重複 / 每日上限 / 驗證等）→ 清掉已上傳的孤兒圖
        await cleanupUploadedPhotos(uploadedUrls);
        setError(data.error ?? tSubmit("errSubmit"));
        return;
      }

      setSuccess(true);
    } catch {
      // 照片上傳中途失敗或網路錯誤 → 清掉已成功上傳的孤兒圖
      await cleanupUploadedPhotos(uploadedUrls);
      setError(tSubmit("errNetwork"));
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
        <h2 className="text-white text-lg font-medium">{tSubmit("successTitle")}</h2>
        <p className="text-zinc-400 text-sm text-center">
          {tSubmit("successDescription")}
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => {
              setSuccess(false);
              resetForm();
            }}
            className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-xs"
          >
            {tSubmit("continueSubmit")}
          </button>
          <button
            onClick={() => router.push("/submissions")}
            className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-xs"
          >
            {tSubmit("viewSubmissions")}
          </button>
          <button
            onClick={() => router.push("/map")}
            className="px-4 py-2 text-sm bg-white text-zinc-900 rounded-xs font-medium"
          >
            {tSubmit("backToMap")}
          </button>
        </div>
      </div>
    );
  }

  const previewLat = Number(form.lat);
  const previewLng = Number(form.lng);
  const hasLocationPreview = Number.isFinite(previewLat) && Number.isFinite(previewLng);
  const canResetLocation = sourceCoords !== null && hasLocationPreview;

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
          <h1 className="text-lg font-medium">{tSubmit("title")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-300">{tSubmit("pasteLabel")}</label>
            <div className="relative">
              <input
                value={mapPaste}
                onChange={(e) => handleMapPasteChange(e.target.value)}
                placeholder={tSubmit("pastePlaceholder")}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-3 pr-16 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              {canResetLocation && (
                <button
                  type="button"
                  onClick={handleResetLocationPreview}
                  aria-label={tSubmit("resetCoords")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] border border-zinc-700 bg-zinc-950/90 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  {tSubmit("resetShort")}
                </button>
              )}
            </div>
            {mapPasteStatus && (
              <p className="text-xs" style={{ color: mapPasteStatus.ok ? "var(--accent)" : "var(--muted)" }}>
                {mapPasteStatus.text}
              </p>
            )}
            {hasLocationPreview && (
              <SubmitLocationMapPreview
                lat={previewLat}
                lng={previewLng}
                resetKey={locationPreviewResetKey}
                onLocationChange={handleLocationPreviewChange}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("nameLabel")}</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={tSubmit("namePlaceholder")}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("nameEnLabel")}</label>
            <input
              name="nameEn"
              value={form.nameEn}
              onChange={handleChange}
              placeholder={tSubmit("nameEnPlaceholder")}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("categoryLabel")}</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
              required
            >
              <option value="">{tSubmit("categoryPlaceholder")}</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <details className="group rounded-xs border border-zinc-800 bg-zinc-950/40">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm text-zinc-400">
              <span>{tSubmit("advancedCoords")}</span>
              <span className="text-xs text-zinc-600 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-zinc-800 px-3 py-3">
              <div className="flex gap-2">
                <input
                  name="lat"
                  value={form.lat}
                  onChange={handleChange}
                  placeholder={tSubmit("latPlaceholder")}
                  className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <input
                  name="lng"
                  value={form.lng}
                  onChange={handleChange}
                  placeholder={tSubmit("lngPlaceholder")}
                  className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {tSubmit("coordsHint")}
              </p>
            </div>
          </details>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("addressLabel")}</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder={tSubmit("addressPlaceholder")}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("difficultyLabel")}</label>
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
            <label className="text-sm text-zinc-400">{tSubmit("descriptionLabel")}</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder={tSubmit("descriptionPlaceholder")}
              rows={3}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("legendLabel")}</label>
            <textarea
              name="legend"
              value={form.legend}
              onChange={handleChange}
              placeholder={tSubmit("legendPlaceholder")}
              rows={2}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-zinc-400">{tSubmit("timeLabel")}</label>
            <input
              name="recommendedTime"
              value={form.recommendedTime}
              onChange={handleChange}
              placeholder={tSubmit("timePlaceholder")}
              className="bg-zinc-900 border border-zinc-800 rounded-xs px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-zinc-400">{tSubmit("photosLabel", { max: MAX_SUBMIT_PHOTOS })}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
              className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xs px-3 py-3 text-sm text-zinc-300 file:mr-3 file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-zinc-900 file:rounded-xs"
            />
            <p className="text-xs text-zinc-600">
              {tSubmit("photosHint")}
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
                      alt={tSubmit("photoPreviewAlt", { index: index + 1 })}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      aria-label={tSubmit("photoRemove", { index: index + 1 })}
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
            {submitting ? tSubmit("submitting") : tSubmit("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}

function LocationPreviewSkeleton() {
  const t = useTranslations("submitPage");
  return (
    <div
      className="relative overflow-hidden rounded-xs border border-zinc-800 bg-zinc-950 px-3 py-3"
      aria-label={t("previewLoading")}
    >
      <div className="absolute inset-0 opacity-70">
        <div className="h-full w-full bg-[linear-gradient(90deg,rgba(113,113,122,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(113,113,122,0.18)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "rgb(var(--accent-rgb) / 0.08)",
          boxShadow: "0 0 32px rgb(var(--accent-rgb) / 0.2)",
        }}
      />
      <div className="relative flex min-h-24 items-center justify-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border"
          style={{
            borderColor: "rgb(var(--accent-rgb) / 0.72)",
            color: "var(--accent)",
            background: "rgb(var(--background-rgb) / 0.82)",
            boxShadow: "0 0 18px rgb(var(--accent-rgb) / 0.18)",
          }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--accent)" }} />
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3 border-t border-zinc-800 pt-2 text-[11px] text-zinc-500">
        <span>{t("previewLoadingLabel")}</span>
        <span className="text-right font-mono text-zinc-400">Mapbox</span>
      </div>
    </div>
  );
}
