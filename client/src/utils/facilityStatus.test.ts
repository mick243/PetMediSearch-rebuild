import { describe, it, expect } from 'vitest';
import { isHiddenFacility } from './facilityStatus';

/*
 * 원본의 실제 짝(전국 31,493건): 정상 ↔ 영업/정상, 폐업 ↔ 폐업,
 * 말소 · 행정처분 ↔ 취소/말소/만료/정지/중지, 휴업 ↔ 휴업.
 */
describe('isHiddenFacility', () => {
  it('정상 영업 중인 시설은 남긴다', () => {
    expect(
      isHiddenFacility({ dtlstatenm: '정상', trdstatenm: '영업/정상' })
    ).toBe(false);
  });

  it('폐업 · 말소 · 휴업은 거른다', () => {
    expect(isHiddenFacility({ dtlstatenm: '폐업', trdstatenm: '폐업' })).toBe(
      true
    );
    expect(
      isHiddenFacility({
        dtlstatenm: '말소',
        trdstatenm: '취소/말소/만료/정지/중지',
      })
    ).toBe(true);
    expect(isHiddenFacility({ dtlstatenm: '휴업', trdstatenm: '휴업' })).toBe(
      true
    );
  });

  it('상세 상태가 처음 보는 값이어도 영업 상태 묶음으로 거른다', () => {
    // 전국 데이터에 실제로 있는 짝입니다(2곳).
    expect(
      isHiddenFacility({
        dtlstatenm: '행정처분',
        trdstatenm: '취소/말소/만료/정지/중지',
      })
    ).toBe(true);
  });

  it('두 칸 중 한쪽만 닫혔다고 해도 거른다', () => {
    // 원본이 두 칸을 다르게 채우는 날을 대비한 그물입니다.
    expect(isHiddenFacility({ dtlstatenm: '정상', trdstatenm: '휴업' })).toBe(
      true
    );
    expect(
      isHiddenFacility({ dtlstatenm: '말소', trdstatenm: '영업/정상' })
    ).toBe(true);
  });

  it('상태를 알 수 없으면 남긴다', () => {
    // 원본에 상세상태가 빈 행이 1건 있습니다(영업/정상).
    expect(isHiddenFacility({ dtlstatenm: '', trdstatenm: '영업/정상' })).toBe(
      false
    );
    expect(isHiddenFacility({ dtlstatenm: '정상' })).toBe(false);
  });
});
