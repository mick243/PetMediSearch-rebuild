/*
 * 시설 검색의 조건과 정렬을 만드는 함수들.
 *
 * app.js 에 있던 것을 옮겼습니다. app.js 는 require 하는 순간 서버를 띄우기
 * 때문에 그 안의 함수는 테스트에서 부를 수가 없었습니다. 규칙이 까다로운
 * ("춘천 소망병원" 이 "강원특별자치도 춘천시 … 소망동물병원" 에 걸려야 하는)
 * 코드라 따로 확인할 수 있어야 합니다.
 */

/**
 * 지역명 검색어를 실제 저장된 표기로 확장합니다.
 *
 * 주소는 공공데이터 원본 표기(예: "세종특별자치시")로 저장돼 있어서
 * 사람들이 흔히 쓰는 "세종시" 로는 LIKE 매칭이 되지 않았습니다.
 * ("세종"+"시" 가 연속되지 않으므로 부분 문자열로 잡히지 않음)
 */
const REGION_ALIASES = {
  '세종시': '세종특별자치시',
  '세종특별시': '세종특별자치시',
  '강원도': '강원특별자치도',
  '전라북도': '전북특별자치도',
  '전북도': '전북특별자치도',
  '제주도': '제주특별자치도',
  '제주시': '제주특별자치도 제주시',
};

/** 검색어를 [원본, 별칭] 형태로 확장합니다. 별칭이 없으면 원본만. */
function expandKeyword(keyword) {
  const trimmed = String(keyword).trim();
  const alias = REGION_ALIASES[trimmed];
  return alias ? [trimmed, alias] : [trimmed];
}

/** LIKE 의 와일드카드(% _ \)를 글자 그대로 찾도록 막습니다. */
function escapeLike(text) {
  return String(text).replace(/[\\%_]/g, '\\$&');
}

/** 검색어를 공백으로 나눕니다. "춘천 소망병원" -> ["춘천", "소망병원"] */
function tokenize(keyword) {
  return String(keyword).trim().split(/\s+/).filter(Boolean);
}

/**
 * 상호에서 중간 낱말이 빠진 경우를 잡는 느슨한 패턴.
 *
 * "소망병원" -> "%소%망%병%원%" 이 되어 "소망동물병원" 에 걸립니다.
 * 사람들이 "동물"·"의료재단" 같은 중간 낱말을 빼고 치기 때문에 필요합니다.
 * 한 글자짜리는 그냥 부분 문자열과 같아져서 만들지 않습니다.
 */
function loosePattern(token) {
  const chars = [...token];
  if (chars.length < 2) return null;
  return `%${chars.map(escapeLike).join('%')}%`;
}

/**
 * 검색 조건. 공백으로 나눈 토큰을 모두 만족해야 합니다(AND).
 *
 * 한 토큰은 둘 중 하나로 맞으면 통과합니다.
 *   1) 상호·주소 어딘가에 그대로 들어 있음   ("춘천" -> "강원특별자치도 춘천시 ...")
 *   2) 상호에 글자가 순서대로 들어 있음      ("소망병원" -> "소망동물병원")
 *
 * 2번은 느슨해서 상호에만 겁니다. 주소까지 열어주면 "강원" 이 "강...원" 으로
 * 엉뚱한 곳에 붙습니다. 주소는 행정구역이 붙어 있는 표기라 1번으로 충분합니다.
 * ("춘천" 은 "춘천시" 의 부분 문자열)
 */
function keywordClause(keyword, values) {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return '';

  const perToken = tokens.map((token) => {
    const parts = [];

    expandKeyword(token).forEach((variant) => {
      parts.push('(bplcnm LIKE ? OR rdnwhladdr LIKE ? OR sitewhladdr LIKE ?)');
      const like = `%${escapeLike(variant)}%`;
      values.push(like, like, like);
    });

    const loose = loosePattern(token);
    if (loose) {
      parts.push('bplcnm LIKE ?');
      values.push(loose);
    }

    return `(${parts.join(' OR ')})`;
  });

  return ` AND ${perToken.join(' AND ')}`;
}

/**
 * 검색 적합도. 큰 값이 먼저 옵니다.
 *
 * 느슨한 조건을 열어 준 만큼, 검색어가 상호에 그대로 들어 있는 쪽을 위로 올립니다.
 * 검색 결과의 첫 줄로 지도를 옮기기 때문에 순서가 곧 "어디로 가는지" 입니다.
 */
function keywordScoreExpr(keyword, values) {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return null;

  const parts = tokens.map((token) => {
    const like = `%${escapeLike(token)}%`;
    const loose = loosePattern(token);

    // 상호에 그대로 > 상호에 글자만 순서대로 > 주소에 그대로
    if (loose) {
      values.push(like, loose, like);
      return '(bplcnm LIKE ?) * 3 + (bplcnm LIKE ?) * 2 + (rdnwhladdr LIKE ?)';
    }
    values.push(like, like);
    return '(bplcnm LIKE ?) * 3 + (rdnwhladdr LIKE ?)';
  });

  return `(${parts.join(' + ')})`;
}


module.exports = {
    REGION_ALIASES,
    expandKeyword,
    escapeLike,
    tokenize,
    loosePattern,
    keywordClause,
    keywordScoreExpr,
};
