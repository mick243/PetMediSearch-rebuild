/**
 * PWA 아이콘(PNG)을 만듭니다.
 *
 *   node scripts/makeIcons.mjs
 *
 * 왜 코드로 굽는가:
 *   화면 아이콘은 favicon.svg 하나로 되지만, 두 곳은 PNG 여야 합니다.
 *     - 푸시 알림의 icon — 크롬이 SVG 를 그려 주지 않습니다
 *     - iOS 홈 화면(apple-touch-icon) — PNG 만 받습니다
 *   이미지 도구를 새로 깔지 않으려고, 같은 모양(발바닥)을 숫자로 그려
 *   PNG 로 바로 씁니다. 색과 모양을 바꾸려면 아래 상수만 고치고 다시 돌리면 됩니다.
 *
 * favicon.svg 와 같은 색을 씁니다. 한쪽을 바꾸면 다른 쪽도 바꾸세요.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** style/theme.ts 의 color.bg · color.primary 와 같은 값입니다. */
const BACKGROUND = [0xf5, 0xf5, 0xf5];
const INK = [0x57, 0x57, 0x57];

/** 한 픽셀을 이만큼 잘게 나눠 평균을 냅니다. 가장자리 계단을 없애는 가장 싼 방법입니다. */
const SUPERSAMPLE = 4;

/**
 * 발바닥 모양. 좌표는 0~1 의 비율이라 어느 크기로도 같은 그림이 나옵니다.
 * 발가락 넷과 발바닥 하나입니다.
 */
const TOES = [
  { x: 0.3, y: 0.36, r: 0.093 },
  { x: 0.425, y: 0.28, r: 0.1 },
  { x: 0.575, y: 0.28, r: 0.1 },
  { x: 0.7, y: 0.36, r: 0.093 },
];
const PAD = { x: 0.5, y: 0.62, rx: 0.2, ry: 0.16 };

const isInk = (x, y) => {
  for (const toe of TOES) {
    const dx = x - toe.x;
    const dy = y - toe.y;
    if (dx * dx + dy * dy <= toe.r * toe.r) return true;
  }
  const dx = (x - PAD.x) / PAD.rx;
  const dy = (y - PAD.y) / PAD.ry;
  return dx * dx + dy * dy <= 1;
};

/** CRC-32. PNG 의 청크마다 붙습니다. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, body, tail]);
};

const toPng = (size) => {
  /*
   * 각 줄 앞에 필터 바이트 0(필터 없음)이 붙습니다. 이걸 빠뜨리면 뷰어마다
   * 다르게 깨지는데, 원인이 보이지 않아 찾기 어렵습니다.
   */
  const raw = Buffer.alloc(size * (1 + size * 3));
  let at = 0;
  for (let py = 0; py < size; py += 1) {
    raw[at] = 0;
    at += 1;
    for (let px = 0; px < size; px += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size;
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size;
          if (isInk(x, y)) hits += 1;
        }
      }
      const weight = hits / (SUPERSAMPLE * SUPERSAMPLE);
      for (let ch = 0; ch < 3; ch += 1) {
        raw[at] = Math.round(BACKGROUND[ch] * (1 - weight) + INK[ch] * weight);
        at += 1;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 채널당 8비트
  ihdr[9] = 2; // 트루컬러(RGB)
  // 10~12: 압축·필터·인터레이스 방식. 규격에 값이 하나씩뿐이라 0 입니다.

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
for (const size of [192, 512]) {
  const file = join(publicDir, `icon-${size}.png`);
  const png = toPng(size);
  writeFileSync(file, png);
  console.log(`icon-${size}.png  ${png.length} bytes`);
}
