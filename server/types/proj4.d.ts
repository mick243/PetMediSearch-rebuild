/*
 * proj4 2.12 는 타입 선언을 싣지 않습니다. 이 서버가 쓰는 두 가지만 적어 둡니다
 * (scripts/syncData.ts 가 공공데이터의 TM 좌표를 위경도로 옮길 때).
 *
 * proj4 를 올려 스스로 타입을 싣는 판이 되면 이 파일은 지웁니다 — 두 선언이 겹쳐 오류가 납니다.
 */
declare module 'proj4' {
    interface Proj4 {
        /** 좌표 배열을 넣으면 옮긴 좌표 배열이 나옵니다. [x, y] → [경도, 위도]. */
        (from: string, to: string, point: number[]): number[];
        defs(name: string, definition: string): void;
    }
    const proj4: Proj4;
    export default proj4;
}
