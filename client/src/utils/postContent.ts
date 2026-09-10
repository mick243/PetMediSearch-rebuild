/**
 * 목록에 쓸 대표 이미지와 미리보기를 글 본문에서 뽑습니다.
 *
 * 글에 이미지 컬럼이 따로 없고 본문이 react-quill 이 만든 HTML 이라,
 * 본문의 첫 <img> 를 대표 이미지로 씁니다. 이미지가 없으면 null 이고,
 * 목록은 그때 썸네일 칸 자체를 그리지 않습니다.
 */

/** img src 로 허용할 스킴. javascript: 같은 건 걸러냅니다. */
const ALLOWED_SRC = /^(https?:\/\/|data:image\/|\/)/i;

/**
 * DOMParser 로 파싱만 합니다.
 * 이 문서는 화면에 붙지 않아 스크립트가 실행되거나 리소스를 받아오지 않습니다.
 */
function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** 본문 첫 이미지의 주소. 없으면 null. */
export function firstImage(content?: string): string | null {
  if (!content) return null;
  const src = parse(content).querySelector('img')?.getAttribute('src')?.trim();
  if (!src) return null;
  return ALLOWED_SRC.test(src) ? src : null;
}

/** 태그를 걷어낸 본문 텍스트. 미리보기용이라 공백은 한 칸으로 눌러둡니다. */
export function excerpt(content?: string): string {
  if (!content) return '';
  return (parse(content).body.textContent || '').replace(/\s+/g, ' ').trim();
}

/** 상세·댓글에서 쓰는 절대 시각. 목록의 "3일 전"과 달리 정확한 때를 보여줍니다. */
export function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 목록에 쓰는 상대 날짜. "3일 전" 수준이면 충분합니다. */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso.replace(' ', 'T')).getTime();
  if (Number.isNaN(then)) return '';

  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  if (day < 31) return `${Math.floor(day / 7)}주 전`;
  return new Date(then).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}
