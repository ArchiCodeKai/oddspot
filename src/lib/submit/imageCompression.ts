export const MAX_SUBMIT_PHOTOS = 3;
export const MAX_SUBMIT_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_SUBMIT_IMAGE_DATA_URL_LENGTH = 500_000;

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_DIMENSION = 1280;
const MIN_JPEG_QUALITY = 0.5;

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("圖片讀取失敗，請換一張照片"));
    };
    image.src = objectUrl;
  });
}

function getScaledSize(width: number, height: number) {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressSubmitImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("只支援 JPG、PNG 或 WebP 圖片");
  }
  if (file.size > MAX_SUBMIT_PHOTO_BYTES) {
    throw new Error("單張照片不能超過 8MB");
  }

  const image = await readImage(file);
  const canvas = document.createElement("canvas");
  const { width, height } = getScaledSize(image.naturalWidth, image.naturalHeight);
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("瀏覽器無法壓縮這張圖片");
  }

  context.fillStyle = "#111111";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_SUBMIT_IMAGE_DATA_URL_LENGTH && quality > MIN_JPEG_QUALITY) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > MAX_SUBMIT_IMAGE_DATA_URL_LENGTH) {
    throw new Error("照片壓縮後仍太大，請選擇尺寸較小的圖片");
  }

  return dataUrl;
}
