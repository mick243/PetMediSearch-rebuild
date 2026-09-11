/**
 * 사진을 브라우저에서 미리 줄여 data URL 로 바꿉니다.
 *
 * 파일 서버가 따로 없어서 줄인 JPEG 를 그대로 DB 에 넣습니다(pets.photo, reviews.image).
 * 원본을 올리면 수 MB 가 본문에 실려 요청 상한(server/app.js 의 3mb)에 걸립니다.
 */

/** JPEG 품질. 0.82 면 눈에 띄는 열화 없이 크기가 크게 줄어듭니다. */
const QUALITY = 0.82;

/** 고른 파일을 <img> 로 읽습니다. 성공하든 실패하든 만들어 둔 URL 은 되돌려 놓습니다. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다'));
    };
    img.src = url;
  });
}

/** 주어진 크기의 캔버스에 draw 로 그린 뒤 JPEG data URL 로 뽑습니다. */
function toJpeg(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  draw(ctx);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

/**
 * 가운데를 정방형으로 잘라 size px 로 줄입니다.
 * 동그란 자리에 넣는 사진(반려동물 얼굴)처럼 비율이 정해진 곳에 씁니다.
 */
export async function shrinkToSquareDataUrl(
  file: File,
  size: number
): Promise<string> {
  const img = await loadImage(file);
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  return toJpeg(size, size, (ctx) =>
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  );
}

/**
 * 비율을 유지한 채 긴 변을 maxSide px 로 줄입니다. 원본이 더 작으면 그대로 둡니다.
 * 가로세로가 제각각인 사진(후기에 붙이는 병원 사진 등)에 씁니다.
 */
export async function shrinkToDataUrl(
  file: File,
  maxSide: number
): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  return toJpeg(width, height, (ctx) =>
    ctx.drawImage(img, 0, 0, width, height)
  );
}
