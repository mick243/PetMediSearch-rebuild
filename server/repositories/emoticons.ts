import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { renumberReplacements } from '../emoticonToken.js';

/*
 * 이모티콘 저장소. 이 표만 다른 표와 다르게 다룹니다:
 *
 * - content_hash 는 DB 가 data 에서 만드는 생성 컬럼이라 INSERT 는 raw SQL 입니다. Prisma 의
 *   모델 API 로는 그 칸을 비워 둘 수 없습니다(schema.prisma 의 설명).
 * - 지우면 뒤 번호를 한 칸씩 당기고 댓글의 [emoticon:N] 도 옮겨 적습니다. 잠금(FOR UPDATE)과
 *   ORDER BY 가 붙은 UPDATE 는 raw SQL 로만 됩니다.
 */

interface EmoticonListRow {
    emoticon_id: number;
    name: string;
    /** 그림의 지문(content_hash). 주소의 ?v= 에 실어 캐시가 번호를 헷갈리지 않게 합니다. */
    v: string;
}

interface EmoticonImage {
    mime: string;
    data: Buffer;
    content_hash: string;
}

/** 그림은 싣지 않고 id · 이름 · 지문만. 스티커 30개를 목록에 실으면 그것만으로 1MB 가 넘습니다. */
async function list(): Promise<EmoticonListRow[]> {
    const rows = await prisma.emoticon.findMany({ orderBy: { emoticon_id: 'asc' }, select: { emoticon_id: true, name: true, content_hash: true } });
    return rows.map(({ content_hash, ...r }) => ({ ...r, v: content_hash }));
}

async function image(id: number): Promise<EmoticonImage | null> {
    // data 는 전역 omit 이라 select 로 명시해 읽습니다.
    const row = await prisma.emoticon.findUnique({ where: { emoticon_id: id }, select: { mime: true, data: true, content_hash: true } });
    if (!row) return null;
    // Prisma 의 Bytes 는 Uint8Array 입니다. express 의 res.send 는 Buffer 만 바이트로 보냅니다.
    return { mime: row.mime, data: Buffer.from(row.data), content_hash: row.content_hash };
}

/**
 * 등록. 지문은 DB 가 만들어 내는 값이라 넣은 뒤 다시 읽습니다 — 여기서 직접 계산해 넣으면
 * 두 곳이 어긋날 수 있고, 어긋나면 방금 올린 관리자 화면만 그림을 못 담아 두게 됩니다.
 * 같은 커넥션(트랜잭션)에서 LAST_INSERT_ID() 를 읽어야 다른 요청의 번호가 섞이지 않습니다.
 */
async function create(name: string, mime: string, bytes: Buffer, adminId: number): Promise<{ emoticon_id: number; v: string }> {
    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO emoticons (name, mime, data, created_by) VALUES (${name}, ${mime}, ${bytes}, ${adminId})`;
        const [{ id }] = await tx.$queryRaw<Array<{ id: bigint | number }>>`SELECT LAST_INSERT_ID() AS id`;
        const emoticon_id = Number(id);
        const row = await tx.emoticon.findUnique({ where: { emoticon_id }, select: { content_hash: true } });
        return { emoticon_id, v: row?.content_hash ?? '' };
    });
}

/**
 * 지운 뒤 댓글에 남은 표시를 옮겨 적는 SQL.
 *
 * 먼저 할 것을 안쪽에 둡니다 — REPLACE 는 안에서 바깥으로 풀리므로, 규칙의 순서가
 * 곧 중첩 순서입니다 (규칙과 순서의 이유는 emoticonToken.ts 에 적어 두었습니다).
 * 자리표시자로 넘겨서 번호가 SQL 문장에 직접 박히지 않게 합니다.
 */
const rewriteCommentsSql = (removedId: number, shiftedIds: number[]) => {
    const values: string[] = [];
    let expr = 'content';

    renumberReplacements(removedId, shiftedIds).forEach(([from, to]) => {
        expr = `REPLACE(${expr}, ?, ?)`;
        values.push(from, to);
    });

    return { sql: `UPDATE comments SET content = ${expr} WHERE content LIKE '%[emoticon:%'`, values };
};

/**
 * 삭제. 지운 자리를 비워 두지 않고 뒤엣것을 한 칸씩 당깁니다(1,2,3,4 에서 2를 지우면 1,2,3).
 * 그래서 다른 표와 달리 deleted_at 을 쓰지 않고 진짜로 지웁니다 — 지운 행을 남겨 두면
 * 그 행이 id 를 계속 차지해 당길 수가 없습니다.
 *
 * 당기면 이미 올라간 댓글의 [emoticon:N] 이 전부 어긋나므로, 같은 트랜잭션에서 댓글의 표시도
 * 함께 옮겨 적습니다. 관리자가 어쩌다 한 번 하는 일이라 댓글 표를 한 번 훑는 비용은 받아들입니다.
 */
async function remove(id: number): Promise<boolean> {
    const count = await prisma.$transaction(async (tx) => {
        // 번호를 새로 매기는 동안 다른 요청이 끼어들면 안 됩니다. 표가 수십 행이라 통째로 잠가도 부담이 없습니다.
        const rows = await tx.$queryRaw<Array<{ emoticon_id: number }>>`SELECT emoticon_id FROM emoticons ORDER BY emoticon_id FOR UPDATE`;
        const ids = rows.map((r) => r.emoticon_id);
        if (!ids.includes(id)) return null;

        const shifted = ids.filter((each) => each > id);
        const rewrite = rewriteCommentsSql(id, shifted);
        await tx.$executeRawUnsafe(rewrite.sql, ...rewrite.values);

        await tx.emoticon.delete({ where: { emoticon_id: id } });

        // 작은 번호부터 당겨야 합니다. 3을 2로 옮긴 다음에야 4가 3으로 갈 자리가 생깁니다. 순서가 없으면 중간에 기본키가 겹칩니다.
        if (shifted.length > 0) {
            await tx.$executeRaw`UPDATE emoticons SET emoticon_id = emoticon_id - 1 WHERE emoticon_id > ${id} ORDER BY emoticon_id`;
        }
        return ids.length;
    });
    if (count === null) return false;

    /*
     * 다음에 올릴 것이 빈 번호를 이어받게 합니다. 이걸 빼먹으면 1,2,3 에서 하나 지워 1,2 가 된 다음
     * 새로 올린 것이 4가 되어 방금 메운 자리가 도로 벌어집니다.
     * ALTER 는 스스로 커밋하므로 트랜잭션 밖에서 합니다.
     *
     * 앱 DB 계정이 ALTER 를 가진 표는 여기 하나뿐입니다(scripts/createDbUser.ts).
     * 앱이 다른 표에 DDL 을 쓰게 되면 그 권한 목록도 같이 고쳐야 합니다.
     */
    await prisma.$executeRaw(Prisma.raw(`ALTER TABLE emoticons AUTO_INCREMENT = ${count}`));
    return true;
}

/** 함수를 객체 하나로 묶어 내보냅니다. 테스트가 t.mock.method 로 한 함수씩 바꿔 끼울 수 있습니다(ESM 이름 내보내기는 바꿀 수 없음). */
const emoticons = { list, image, create, remove };

export default emoticons;
export type { EmoticonListRow, EmoticonImage };
