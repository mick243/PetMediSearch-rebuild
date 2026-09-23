/*
 * 로그인한 뒤 돌아갈 자리.
 *
 * 로그인이 필요한 자리에서 막힌 사람을 `/login?next=...` 로 보내고, 로그인이
 * 끝나면 그 자리로 되돌립니다. 예전에는 글을 다 써서 등록을 누르면 "로그인 후
 * 댓글을 남길 수 있습니다" 알림만 뜨고 그대로 멈춰 있었습니다. 스스로 로그인을
 * 찾아가면 보던 글도, 쓰던 글도 사라졌습니다.
 *
 * 소셜 로그인은 카카오·네이버·구글로 나갔다가 /oauth/... 로 돌아오므로 주소의
 * ?next= 가 중간에 사라집니다. 그래서 값을 sessionStorage 에 옮겨 두고 돌아왔을
 * 때 꺼내 씁니다. sessionStorage 는 탭 단위라 다른 탭의 로그인과 섞이지 않습니다
 * (oauthState 와 같은 이유).
 */

const KEY = 'after_login_next';

/**
 * 우리 앱 안의 자리인지 봅니다.
 *
 * 바깥 주소를 그대로 믿으면, 로그인 링크에 `?next=https://남의사이트` 를 붙여
 * 보낸 뒤 로그인 직후 그리로 튕겨 보낼 수 있습니다(open redirect). 우리 화면으로
 * 시작하는 값만 받습니다 — `//남의사이트` 는 브라우저가 외부 주소로 읽으므로 같이 막습니다.
 */
export function isSafeNext(value: string | null): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  // 백슬래시를 슬래시로 읽는 브라우저가 있어 `/\\남의사이트` 도 막습니다.
  if (value.includes('\\')) return false;
  return true;
}

/** 지금 자리를 `next` 로 쓸 값으로 만듭니다. 쿼리스트링까지 살립니다. */
export function nextFrom(location: {
  pathname: string;
  search: string;
}): string {
  return `${location.pathname}${location.search}`;
}

/** 로그인 화면에 도착했을 때 한 번 부릅니다. 돌아갈 자리가 없으면 남은 값을 치웁니다. */
export function rememberNext(value: string | null): void {
  try {
    if (isSafeNext(value)) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 브라우저에서도 로그인 자체는 되게 둡니다. 홈으로 갑니다.
  }
}

/** 로그인이 끝났을 때 부릅니다. 한 번 쓰면 지웁니다. */
export function takeNext(): string | null {
  try {
    const saved = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return isSafeNext(saved) ? saved : null;
  } catch {
    return null;
  }
}
