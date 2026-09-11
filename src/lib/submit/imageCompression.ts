export const MAX_SUBMIT_PHOTOS = 3;
export const MAX_SUBMIT_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_SUBMIT_IMAGE_DATA_URL_LENGTH = 500_000;

// 錯誤用代碼丟出，顯示文字由投稿頁依語系翻譯（submitPage.imageErrors.*）
export type ImageCompressionErrorCode =
  | "readFailed"
  | "unsupportedType"
  | "tooLarge"
  | "compressUnavailable"
  | "stillTooLarge";

export class ImageCompressionError extends Error {
  code: ImageCompressionErrorCode;

  constructor(code: ImageCompressionErrorCode) {
    super(code);
    this.name = "ImageCompressionError";
    this.code = code;
  }
}

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
      reject(new ImageCompressionError("readFailed"));
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
    throw new ImageCompressionError("unsupportedType");
  }
  if (file.size > MAX_SUBMIT_PHOTO_BYTES) {
    throw new ImageCompressionError("tooLarge");
  }

  const image = await readImage(file);
  const canvas = document.createElement("canvas");
  const { width, height } = getScaledSize(image.naturalWidth, image.naturalHeight);
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new ImageCompressionError("compressUnavailable");
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
    throw new ImageCompressionError("stillTooLarge");
  }

  return dataUrl;
}
