import prisma from '../db/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { decimalToString, facilityTypeLabel, timestampToKst } from '../db/format.js';

/*
 * 즐겨찾기 저장소. 컨트롤러(controller/favorites.ts)는 HTTP 만 다루고 DB 는 여기서만 만집니다.
 *
 * 돌려주는 모양은 mysql2 때의 응답과 같습니다(contract/golden.json 의 "즐겨찾기").
 * 키 이름 · 순서 · 타입을 바꾸면 기준선이 깨집니다 — 일부러 바꾸는 단계(5단계)에서만 바꿉니다.
 */

/** 시설 정보가 붙은 즐겨찾기 한 줄. 화면(client/src/pages/Favorites.tsx)이 받는 모양입니다. */
interface FavoriteRow {
    facility_id: number;
    created_at: string | null;
    bplcnm: string;
    type: '병원' | '약국';
    rdnwhladdr: string | null;
    sitewhladdr: string | null;
    sitetel: string | null;
    lat: string | null;
    lng: string | null;
    dtlstatenm: string | null;
}

/** 넣기의 결과. 이미 있던 것도 "넣었다" 로 답하므로 둘을 구분하지 않습니다. */
type AddResult = 'added' | 'no-such-facility';

async function listFavorites(userId: number): Promise<FavoriteRow[]> {
    /*
     * 정렬은 created_at 만 봅니다. 동점 처리(CLAUDE.md §2.4)가 없는 것은 mysql2 때와 같게
     * 두려는 것입니다 — 이 단계는 응답을 바꾸지 않습니다. 쪽으로 나누는 5단계에서 붙입니다.
     */
    const rows = await prisma.favoriteFacility.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        select: {
            facility_id: true,
            created_at: true,
            facility: {
                select: { bplcnm: true, type: true, rdnwhladdr: true, sitewhladdr: true, sitetel: true, lat: true, lng: true, dtlstatenm: true },
            },
        },
    });
    return rows.map(({ facility_id, created_at, facility }) => ({
        facility_id,
        created_at: timestampToKst(created_at),
        bplcnm: facility.bplcnm,
        type: facilityTypeLabel(facility.type),
        rdnwhladdr: facility.rdnwhladdr,
        sitewhladdr: facility.sitewhladdr,
        sitetel: facility.sitetel,
        lat: decimalToString(facility.lat, 7),
        lng: decimalToString(facility.lng, 7),
        dtlstatenm: facility.dtlstatenm,
    }));
}

/**
 * 즐겨찾기 추가. 이미 있으면 그대로 성공입니다(같은 별을 두 번 눌러도 오류가 아닙니다).
 *
 * 중복은 미리 조회하지 않고 기본키 제약이 낸 오류(P2002)를 받습니다(CLAUDE.md §2.8).
 * 없는 시설 번호는 외래 키 오류(P2003)로 옵니다.
 */
async function addFavorite(userId: number, facilityId: number): Promise<AddResult> {
    try {
        await prisma.favoriteFacility.create({ data: { user_id: userId, facility_id: facilityId } });
        return 'added';
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') return 'added';
            if (error.code === 'P2003') return 'no-such-facility';
        }
        throw error;
    }
}

/** 즐겨찾기 해제. 없던 것을 빼도 성공입니다 — 누른 뒤의 상태는 같습니다. */
async function removeFavorite(userId: number, facilityId: number): Promise<void> {
    await prisma.favoriteFacility.deleteMany({ where: { user_id: userId, facility_id: facilityId } });
}

/** 함수를 객체 하나로 묶어 내보냅니다. 테스트가 t.mock.method 로 한 함수씩 바꿔 끼울 수 있습니다(ESM 이름 내보내기는 바꿀 수 없음). */
const favorites = { listFavorites, addFavorite, removeFavorite };

export default favorites;
export type { FavoriteRow, AddResult };
