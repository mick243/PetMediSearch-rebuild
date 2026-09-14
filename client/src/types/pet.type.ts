export interface Vaccination {
  vaccination_id: number;
  pet_id: number;
  name: string;
  /** YYYY-MM-DD */
  due_date: string;
  /**
   * HH:MM. 시각을 모르는 일정이 대부분이라 비어 있는 것이 정상입니다.
   * 서버가 TIME 컬럼을 'HH:MM:SS' 로 보내므로 화면에서는 앞 다섯 글자만 씁니다.
   */
  due_time: string | null;
  done: 0 | 1 | boolean;
}

export interface Pet {
  pet_id: number;
  user_id: number;
  name: string;
  /** 게시판 카테고리와 같은 표(강아지·고양이·포유류…). 없을 수 있음 */
  category_id: number | null;
  category_name: string | null;
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | string | null;
  /** 축소된 JPEG data URL. 없으면 분류 이모지로 대신합니다. */
  photo: string | null;
  created_at: string;
  vaccinations: Vaccination[];
}

/** 등록·수정 폼에서 보내는 값 */
export interface PetInput {
  name: string;
  category_id: number | null;
  breed: string;
  birth_date: string;
  weight_kg: string;
  photo: string | null;
}

export interface FavoriteFacility {
  facility_id: number;
  created_at: string;
  bplcnm: string;
  type: string;
  rdnwhladdr: string | null;
  sitewhladdr: string | null;
  sitetel: string | null;
  lat: number | null;
  lng: number | null;
  dtlstatenm: string | null;
}
