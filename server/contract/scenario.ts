/*
 * 기준선이 차례로 보내는 요청.
 *
 * 화면이 실제로 부르는 길을 라우터마다 한 번 이상 지나가게 짰습니다. 읽기를 먼저 하고,
 * 쓰기는 뒤에 몰아 두었습니다 — 쓰기가 앞 단계의 결과를 바꾸면 기준선이 흔들립니다.
 * 앞 단계의 응답에서 번호를 받아 뒤 단계에 쓰는 것은 capture 로 합니다.
 *
 * as 는 로그인한 계정입니다. 토큰은 서버가 로그인 응답으로 준 것만 씁니다.
 */
import { ACCOUNTS, JPEG_DATA_URL, PNG_BYTES } from './fixture.js';

/** 단계 사이에 넘기는 값. 로그인해서 받은 토큰과, 앞 단계 응답에서 받아 둔 번호들입니다. */
interface Ctx {
    /** as 에 적는 이름 → 토큰 */
    tokens: Record<string, string>;
    emoticonV?: string;
    postId?: number;
    commentId?: number;
    reviewId?: number;
    petId?: number;
    vaccinationId?: number;
}

/**
 * capture 가 응답에서 꺼내는 칸. 응답 전체의 모양은 기준선(golden.json)이 봅니다.
 * 한 응답에 이 칸이 다 있는 것은 아니고, 단계마다 자기 응답에 있는 칸만 읽습니다.
 */
interface CapturedBody {
    token: string;
    postId: number;
    commentId: number;
    petId: number;
    vaccinationId: number;
    emoticons: { v: string }[];
    reviews: { review_id: number }[];
}

type Capture = (body: CapturedBody, ctx: Ctx) => void;

/** 요청 본문. JSON.stringify 로 보내므로 값이 undefined 인 칸은 빠집니다. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

/** 기준선의 한 단계. name 이 golden.json 의 step 이 됩니다. */
interface Step {
    name: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string | ((ctx: Ctx) => string);
    as?: string;
    body?: Json | ((ctx: Ctx) => Json);
    capture?: Capture;
}

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();
const SEOUL = { swLat: '37.4', swLng: '126.8', neLat: '37.7', neLng: '127.2' };
const PNG_DATA_URL = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;
const NEW_ACCOUNT = {
    username: '새회원',
    email: 'new@contract.test',
    password: 'new-password-1',
    phone: '010-3333-4444',
    address: '서울특별시 마포구 월드컵북로 1',
    agreed: true,
};

const login = (account: keyof typeof ACCOUNTS) => ({ email: ACCOUNTS[account].email, password: ACCOUNTS[account].password });
const keepToken = (name: string): Capture => (body, ctx) => { ctx.tokens[name] = body.token; };

const steps: Step[] = [
    // ── 읽기: 로그인 없이 ─────────────────────────────────────
    { name: '상태 확인', path: '/health' },
    { name: '시설: 서울 범위의 병원', path: `/facilities?${qs({ type: '병원', ...SEOUL, limit: '10' })}` },
    { name: '시설: 서울 범위 전체(폐업 포함)', path: `/facilities?${qs({ ...SEOUL, onlyOpened: 'false', limit: '10' })}` },
    { name: '시설: 검색어', path: `/facilities?${qs({ keyword: '강남 동물병원', limit: '10' })}` },
    { name: '시설: 종류가 틀림', path: `/facilities?${qs({ type: '동물병원' })}` },
    { name: '시설 격자', path: `/facilities/clusters?${qs({ ...SEOUL, precision: '1' })}` },
    { name: '분류 목록', path: '/category' },
    { name: '통합 목록 1쪽', path: '/category?category=1&limit=2&page=1' },
    { name: '통합 목록 2쪽', path: '/category?category=1&limit=2&page=2' },
    { name: '강아지 목록', path: '/category?category=2' },
    { name: '글 상세', path: '/posts/1' },
    { name: '지워진 글 상세', path: '/posts/4' },
    { name: '댓글 1쪽', path: '/comments/1?page=1&limit=2' },
    { name: '댓글 2쪽', path: '/comments/1?page=2&limit=2' },
    { name: '시설 후기 1쪽(요약 포함)', path: '/reviews/facility/1?page=1&limit=3' },
    { name: '시설 후기 2쪽', path: '/reviews/facility/1?page=2&limit=3' },
    { name: '후기 사진', path: '/reviews/2/images' },
    { name: '후기 없는 시설', path: '/reviews/facility/2' },
    {
        name: '이모티콘 목록',
        path: '/emoticons',
        capture: (body, ctx) => { ctx.emoticonV = body.emoticons[0].v; },
    },
    { name: '이모티콘 그림', path: (ctx) => `/emoticons/1/image?v=${ctx.emoticonV}` },
    { name: '푸시 공개키(설정 없음)', path: '/push/key' },

    // ── 로그인 ───────────────────────────────────────────────
    { name: '로그인 실패', method: 'POST', path: '/auth/login', body: { ...login('member'), password: 'not-the-password' } },
    { name: '로그인(회원)', method: 'POST', path: '/auth/login', body: login('member'), capture: keepToken('member') },
    { name: '로그인(관리자)', method: 'POST', path: '/auth/login', body: login('admin'), capture: keepToken('admin') },
    { name: '토큰 없이 내 정보', path: '/auth/me' },

    // ── 읽기: 로그인해서 ─────────────────────────────────────
    { name: '내 정보', as: 'member', path: '/auth/me' },
    { name: '내가 쓴 글', as: 'member', path: '/mypage/posts' },
    { name: '내가 쓴 후기', as: 'member', path: '/mypage/reviews' },
    { name: '내가 쓴 댓글', as: 'member', path: '/mypage/comments' },
    { name: '즐겨찾기', as: 'member', path: '/favorites' },
    { name: '반려동물', as: 'member', path: '/pets' },
    { name: '푸시 구독 여부', as: 'member', path: `/push/subscriptions?${qs({ endpoint: 'https://push.example.test/sub/1' })}` },

    // ── 쓰기: 글 · 댓글 ──────────────────────────────────────
    {
        name: '글 쓰기', as: 'member', method: 'POST', path: '/posts',
        body: { category_id: 2, title: '새 글', content: '<p>새 글 본문</p>' },
        capture: (body, ctx) => { ctx.postId = body.postId; },
    },
    { name: '새 글 상세', path: (ctx) => `/posts/${ctx.postId}` },
    {
        name: '글 고치기', as: 'member', method: 'PUT', path: (ctx) => `/posts/${ctx.postId}`,
        body: { title: '고친 글', content: '<p>고친 본문</p>' },
    },
    { name: '고친 글 상세', path: (ctx) => `/posts/${ctx.postId}` },
    {
        name: '댓글 쓰기', as: 'member', method: 'POST', path: '/comments',
        body: (ctx) => ({ post_id: ctx.postId, content: '첫 댓글', parent_comment_id: null }),
        capture: (body, ctx) => { ctx.commentId = body.commentId; },
    },
    {
        name: '답글 쓰기', as: 'admin', method: 'POST', path: '/comments',
        body: (ctx) => ({ post_id: ctx.postId, content: '관리자 답글', parent_comment_id: ctx.commentId }),
    },
    { name: '댓글 고치기', as: 'member', method: 'PUT', path: (ctx) => `/comments/${ctx.commentId}`, body: { content: '고친 댓글' } },
    { name: '새 글의 댓글', path: (ctx) => `/comments/${ctx.postId}` },
    { name: '댓글: 글 번호가 틀림', as: 'member', method: 'POST', path: '/comments', body: { post_id: 'abc', content: '번호가 틀린 댓글' } },
    { name: '댓글: 없는 글', as: 'member', method: 'POST', path: '/comments', body: { post_id: 999999, content: '없는 글의 댓글' } },
    { name: '관리자가 댓글 스레드 지우기', as: 'admin', method: 'DELETE', path: (ctx) => `/comments/${ctx.commentId}` },
    { name: '스레드를 지운 뒤 댓글', path: (ctx) => `/comments/${ctx.postId}` },

    // ── 쓰기: 후기 · 즐겨찾기 ───────────────────────────────
    {
        name: '후기 쓰기', as: 'member', method: 'POST', path: '/reviews',
        body: { facility_id: 2, rating: 4, review_content: '깨끗해요', images: [JPEG_DATA_URL] },
    },
    {
        name: '후기 쓴 뒤 시설 후기', path: '/reviews/facility/2',
        capture: (body, ctx) => { ctx.reviewId = body.reviews[0].review_id; },
    },
    {
        name: '후기 고치기(사진은 그대로)', as: 'member', method: 'PUT', path: (ctx) => `/reviews/${ctx.reviewId}`,
        body: { rating: 5, review_content: '아주 깨끗해요' },
    },
    { name: '고친 후기의 사진', path: (ctx) => `/reviews/${ctx.reviewId}/images` },
    { name: '후기 지우기', as: 'member', method: 'DELETE', path: (ctx) => `/reviews/${ctx.reviewId}` },
    { name: '후기 지운 뒤 시설 후기', path: '/reviews/facility/2' },
    { name: '즐겨찾기 넣기', as: 'member', method: 'POST', path: '/favorites/2' },
    { name: '즐겨찾기 다시 넣기', as: 'member', method: 'POST', path: '/favorites/2' },
    { name: '없는 시설 즐겨찾기', as: 'member', method: 'POST', path: '/favorites/999999' },
    { name: '즐겨찾기 넣은 뒤', as: 'member', path: '/favorites' },
    { name: '즐겨찾기 빼기', as: 'member', method: 'DELETE', path: '/favorites/2' },

    // ── 쓰기: 반려동물 · 일정 ───────────────────────────────
    {
        name: '반려동물 등록', as: 'member', method: 'POST', path: '/pets',
        body: { name: '보리', category_id: 2, breed: '진돗개', birth_date: '2021-03-03', weight_kg: 12.5, photo: JPEG_DATA_URL },
        capture: (body, ctx) => { ctx.petId = body.petId; },
    },
    {
        name: '일정 추가', as: 'member', method: 'POST', path: (ctx) => `/pets/${ctx.petId}/vaccinations`,
        body: { name: '종합백신', due_date: '2026-11-01', due_time: '14:00' },
        capture: (body, ctx) => { ctx.vaccinationId = body.vaccinationId; },
    },
    { name: '일정 완료', as: 'member', method: 'PATCH', path: (ctx) => `/pets/vaccinations/${ctx.vaccinationId}`, body: { done: true } },
    {
        name: '일정 고치기', as: 'member', method: 'PUT', path: (ctx) => `/pets/vaccinations/${ctx.vaccinationId}`,
        body: { name: '종합백신 3차', due_date: '2026-11-02', due_time: '' },
    },
    {
        name: '반려동물 고치기', as: 'member', method: 'PUT', path: (ctx) => `/pets/${ctx.petId}`,
        body: { name: '보리', category_id: 3, breed: null, birth_date: null, weight_kg: null, photo: null },
    },
    { name: '반려동물 추가한 뒤', as: 'member', path: '/pets' },
    { name: '일정 지우기', as: 'member', method: 'DELETE', path: (ctx) => `/pets/vaccinations/${ctx.vaccinationId}` },
    { name: '반려동물 지우기', as: 'member', method: 'DELETE', path: (ctx) => `/pets/${ctx.petId}` },
    { name: '남의 반려동물 지우기', as: 'member', method: 'DELETE', path: '/pets/3' },

    // ── 쓰기: 푸시 · 내 정보 ────────────────────────────────
    {
        name: '푸시 구독', as: 'member', method: 'POST', path: '/push/subscriptions',
        body: { endpoint: 'https://push.example.test/sub/2', keys: { p256dh: 'p256dh-2', auth: 'auth-2' } },
    },
    { name: '푸시 구독 끄기', as: 'member', method: 'DELETE', path: '/push/subscriptions', body: { endpoint: 'https://push.example.test/sub/2' } },
    { name: '이름 바꾸기', as: 'member', method: 'PATCH', path: '/auth/me', body: { username: '바뀐회원' } },

    // ── 관리자: 이모티콘 · 글 삭제 ──────────────────────────
    { name: '이모티콘 등록(회원)', as: 'member', method: 'POST', path: '/emoticons', body: { name: '회원 그림', image: PNG_DATA_URL } },
    { name: '이모티콘 등록(관리자)', as: 'admin', method: 'POST', path: '/emoticons', body: { name: '새 얼굴', image: PNG_DATA_URL } },
    { name: '이모티콘 지우기(관리자)', as: 'admin', method: 'DELETE', path: '/emoticons/1' },
    { name: '이모티콘 지운 뒤 목록', path: '/emoticons' },
    { name: '이모티콘 지운 뒤 댓글', path: '/comments/1?page=1&limit=5' },
    { name: '관리자가 글 지우기', as: 'admin', method: 'DELETE', path: (ctx) => `/posts/${ctx.postId}` },
    { name: '지운 글 상세', path: (ctx) => `/posts/${ctx.postId}` },

    // ── 가입 · 비밀번호 · 탈퇴 ──────────────────────────────
    { name: '가입', method: 'POST', path: '/auth/signup', body: NEW_ACCOUNT, capture: keepToken('newbie') },
    { name: '같은 이메일로 가입', method: 'POST', path: '/auth/signup', body: NEW_ACCOUNT },
    { name: '새 계정 내 정보', as: 'newbie', path: '/auth/me' },
    {
        name: '비밀번호 바꾸기', as: 'newbie', method: 'PATCH', path: '/auth/me/password',
        body: { currentPassword: NEW_ACCOUNT.password, newPassword: 'new-password-2' },
        capture: (body, ctx) => { ctx.tokens.newbieOld = ctx.tokens.newbie; ctx.tokens.newbie = body.token; },
    },
    { name: '비밀번호 바꾼 뒤 이전 토큰', as: 'newbieOld', path: '/auth/me' },
    { name: '탈퇴', as: 'newbie', method: 'DELETE', path: '/auth/me' },
    {
        name: '탈퇴한 계정으로 로그인', method: 'POST', path: '/auth/login',
        body: { email: NEW_ACCOUNT.email, password: 'new-password-2' },
    },
];

export { steps };
export type { Ctx, CapturedBody, Step };
