/*
 * 응답 기준선에 쓰는 고정 데이터.
 *
 * 시각은 전부 한국 벽시계로 박아 둡니다. 기준선이 같은 결과를 내려면 데이터가 늘 같아야
 * 하고, 특히 created_at 이 같은 두 행(글 1·2, 후기 3·4)은 ORDER BY 의 동점 처리
 * (CLAUDE.md §2.4)가 지켜지는지 보려고 일부러 넣었습니다.
 *
 * 비밀번호는 이 테스트에서만 쓰는 값입니다. 해시는 적재할 때 만듭니다(비용 4 — 빨리 돌게).
 * 앱은 비용이 얼마든 bcrypt.compare 로 똑같이 확인합니다.
 */
import bcrypt from 'bcrypt';
import type { Connection, ResultSetHeader } from 'mysql2/promise';

/** 로그인해서 토큰을 받을 계정. 시나리오(scenario.ts)가 씁니다. */
const ACCOUNTS = {
    member: { user_id: 7, email: 'member@contract.test', password: 'member-password-1' },
    admin: { user_id: 8, email: 'admin@contract.test', password: 'admin-password-1' },
};

/** 후기·반려동물 사진. 규칙(validate.ts 의 isImageDataUrl)만 맞으면 되는 짧은 값입니다. */
const JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

/** 이모티콘 그림. 서버가 앞머리 8바이트로 PNG 인지 봅니다(imageType.ts). */
const PNG_BYTES = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

const facilities = [
    // id, mgtno, 이름, 종류, lat, lng, 상세상태, 영업상태
    [1, 'F-0001', '강남 행복동물병원', '병원', '37.4979000', '127.0276000', '정상', '영업/정상'],
    [2, 'F-0002', '강남 튼튼동물병원', '병원', '37.5000000', '127.0300000', '정상', '영업/정상'],
    [3, 'F-0003', '마포 초록동물약국', '약국', '37.5563000', '126.9220000', '정상', '영업/정상'],
    [4, 'F-0004', '종로 옛날동물병원', '병원', '37.5700000', '126.9800000', '폐업', '폐업'],
    [5, 'F-0005', '좌표없는동물약국', '약국', null, null, '정상', '영업/정상'],
    [6, 'F-0006', '해운대 바다동물병원', '병원', '35.1631000', '129.1636000', '정상', '영업/정상'],
];

async function loadFixture(db: Connection) {
    const hash = (password: string) => bcrypt.hash(password, 4);

    for (const [id, mgtno, name, type, lat, lng, detail, state] of facilities) {
        await db.query<ResultSetHeader>(
            `INSERT INTO medical_facilities
               (id, mgtno, bplcnm, sitewhladdr, rdnwhladdr, sitetel, x, y, lat, lng,
                apvpermymd, dcbymd, dtlstatenm, trdstatenm, type, lastmodts)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, mgtno, name, `지번 주소 ${id}`, `도로명 주소 ${id}`, `02-000-000${id}`,
                '200000.000000', '450000.000000', lat, lng,
                '2020-01-01', detail === '폐업' ? '2025-12-31' : null, detail, state, type,
                '2026-09-01 00:00:00',
            ],
        );
    }

    // 1~6 은 createTables.sql 의 시드 계정입니다(이메일 없음, 로그인 불가).
    await db.query<ResultSetHeader>(
        `INSERT INTO users (user_id, username, email, password, phone, address, role, created_at, terms_agreed_at)
         VALUES (?, '테스트회원', ?, ?, '01011112222', '서울특별시 중구 세종대로 110', 'user',
                 '2026-09-01 09:00:00', '2026-09-01 09:00:00.000'),
                (?, '테스트관리자', ?, ?, '01033334444', '서울특별시 중구 세종대로 110', 'admin',
                 '2026-09-01 09:00:00', '2026-09-01 09:00:00.000')`,
        [
            ACCOUNTS.member.user_id, ACCOUNTS.member.email, await hash(ACCOUNTS.member.password),
            ACCOUNTS.admin.user_id, ACCOUNTS.admin.email, await hash(ACCOUNTS.admin.password),
        ],
    );
    // 탈퇴한 계정. 탈퇴가 남기는 모양 그대로입니다(auth.ts 의 withdraw).
    await db.query<ResultSetHeader>(
        `INSERT INTO users (user_id, username, role, token_version, created_at, deleted_at)
         VALUES (9, '탈퇴한 사용자', 'user', 1, '2026-09-01 09:00:00', '2026-09-10 12:00:00.000')`,
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO posts (post_id, category_id, user_id, title, content, created_at, updated_at, deleted_at) VALUES
           (1, 2, 7, '산책 코스 추천', '<p>한강 산책로가 좋아요</p>', '2026-09-05 10:00:00', '2026-09-05 10:00:00', NULL),
           (2, 3, 8, '고양이 사료 질문', ?, '2026-09-05 10:00:00', '2026-09-05 10:00:00', NULL),
           (3, 2, 7, '예방접종 후기', '<p>접종 잘 끝났어요</p>', '2026-09-06 08:30:00', '2026-09-06 08:30:00', NULL),
           (4, 2, 8, '지워진 글', '<p>삭제됨</p>', '2026-09-07 08:30:00', '2026-09-07 08:30:00', '2026-09-08 09:00:00.000'),
           (5, 2, NULL, '작성자 없는 글', '<p>작성자 행이 지워진 글</p>', '2026-09-04 10:00:00', '2026-09-04 10:00:00', NULL)`,
        [`<p>어떤 사료가 좋을까요?</p><p><img src="${JPEG_DATA_URL}"></p>`],
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO comments (comment_id, post_id, user_id, content, parent_comment_id, created_at, deleted_at) VALUES
           (1, 1, 8, '좋은 정보 감사합니다', NULL, '2026-09-05 11:00:00', NULL),
           (2, 1, 7, '도움이 됐다니 다행이에요', 1, '2026-09-05 11:05:00', NULL),
           (3, 1, 8, '[emoticon:1] 다음에도 부탁해요', 2, '2026-09-05 11:10:00', NULL),
           (4, 1, 7, '지워진 원댓글', NULL, '2026-09-05 12:00:00', '2026-09-05 12:30:00.000'),
           (5, 1, 8, '원댓글이 지워진 답글', 4, '2026-09-05 12:10:00', NULL),
           (6, 1, 7, '마지막 원댓글', NULL, '2026-09-05 13:00:00', NULL),
           (7, 3, 8, '접종 어디서 하셨어요?', NULL, '2026-09-06 09:00:00', NULL),
           (8, 4, 7, '지워진 글의 댓글', NULL, '2026-09-07 09:00:00', '2026-09-08 09:00:00.000')`,
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO reviews (review_id, user_id, facility_id, rating, review_content, images, created_at, deleted_at) VALUES
           (1, 7, 1, 5, '친절해요', NULL, '2026-09-02 10:00:00', NULL),
           (2, 8, 1, 4, '대기가 조금 길어요', ?, '2026-09-02 11:00:00', NULL),
           (3, 7, 1, 3, '보통이에요', NULL, '2026-09-03 10:00:00', NULL),
           (4, 8, 1, 5, '설명이 자세해요', NULL, '2026-09-03 10:00:00', NULL),
           (5, 7, 1, 2, '주차가 불편해요', NULL, '2026-09-04 10:00:00', NULL),
           (6, 8, 1, 1, '지워진 후기', NULL, '2026-09-04 11:00:00', '2026-09-04 12:00:00.000'),
           (7, 7, 3, 4, '약 설명을 잘 해 주세요', NULL, '2026-09-05 10:00:00', NULL)`,
        [JSON.stringify([JPEG_DATA_URL])],
    );

    // 살아 있는 후기 수(5)와 review_count 가 같아, 목록을 열어도 다시 만들지 않습니다.
    await db.query<ResultSetHeader>(
        `INSERT INTO review_summaries
           (facility_id, summary, good, caution, review_count, last_review_id, provider, model, updated_at)
         VALUES (1, '친절하고 설명이 자세하다는 평이 많습니다.', ?, ?, 5, 5, 'stub', 'fixture', '2026-09-05 00:00:00')`,
        [JSON.stringify(['친절함', '설명이 자세함']), JSON.stringify(['대기 시간', '주차'])],
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO favorite_facilities (user_id, facility_id, created_at) VALUES
           (7, 1, '2026-09-06 10:00:00'),
           (7, 3, '2026-09-06 11:00:00')`,
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO pets (pet_id, user_id, name, category_id, breed, birth_date, weight_kg, photo, created_at) VALUES
           (1, 7, '콩이', 2, '말티즈', '2020-05-01', 3.20, ?, '2026-09-01 10:00:00'),
           (2, 7, '나비', 3, NULL, NULL, NULL, NULL, '2026-09-01 11:00:00'),
           (3, 8, '초코', 2, '푸들', NULL, 4.00, NULL, '2026-09-01 12:00:00')`,
        [JPEG_DATA_URL],
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO pet_vaccinations (vaccination_id, pet_id, name, due_date, due_time, done) VALUES
           (1, 1, '종합백신 2차', '2026-10-01', '10:30:00', 0),
           (2, 1, '광견병', '2026-08-15', NULL, 1),
           (3, 2, '심장사상충', '2026-10-01', NULL, 0)`,
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO push_subscriptions (subscription_id, user_id, endpoint, p256dh, auth, created_at)
         VALUES (1, 7, 'https://push.example.test/sub/1', 'fixture-p256dh', 'fixture-auth', '2026-09-01 12:00:00')`,
    );

    await db.query<ResultSetHeader>(
        `INSERT INTO emoticons (emoticon_id, name, mime, data, created_by, created_at)
         VALUES (1, '웃음', 'image/png', ?, 8, '2026-09-01 08:00:00')`,
        [PNG_BYTES],
    );
}

export { loadFixture, ACCOUNTS, JPEG_DATA_URL, PNG_BYTES };
