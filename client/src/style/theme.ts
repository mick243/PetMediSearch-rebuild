export type ThemeName = 'light' | 'dark';

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonScheme = 'normal' | 'positive' | 'negative';

export type InputSize = 'small' | 'medium' | 'large';

/**
 * 디자인 토큰.
 *
 * 기존에는 색이 30개 파일에 163곳 하드코딩돼 있었고 theme 에는 색 정의가 없었습니다.
 * 쓰던 색감을 그대로 토큰으로 옮겨, 앞으로는 여기서만 바꾸면 되도록 했습니다.
 */
export const color = {
  /** 페이지 배경. 기존 body 의 순수 `gray` 를 팔레트에 있던 밝은 회색으로 */
  bg: '#f5f5f5',
  /** 카드·패널 표면 */
  surface: '#ffffff',
  surfaceMuted: '#f0f0f0',

  border: '#e3e3e3',
  borderStrong: '#d0d0d0',

  text: '#333333',
  /** 보조 텍스트. 기존 #9e9e9e 는 흰 배경 대비 2.9:1 로 WCAG AA 미달이라 조정 */
  textMuted: '#767676',
  textInverse: '#ffffff',

  /** 기본 강조 — 기존에 가장 많이 쓰인 색 */
  primary: '#575757',
  primaryHover: '#464646',
  /** 포인트(세이지) */
  accent: '#c6cdbe',
  /** 상태 */
  success: '#5ba95b',
  danger: '#e44c4c',
  dangerSoft: '#cdbebe',
} as const;

/** 4px 배수 간격 */
export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const;

export const radius = {
  sm: '8px',
  default: '16px',
  pill: '999px',
} as const;

/**
 * 그림자.
 * 기존 `0 5px 10px rgba(0,0,0,0.4)` 는 불투명도가 높아 낡은 인상을 줬습니다.
 * 옅게 두 겹으로 쌓아 깊이를 표현합니다.
 */
export const shadow = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 2px 4px rgba(0, 0, 0, 0.06), 0 12px 28px rgba(0, 0, 0, 0.12)',
} as const;

/**
 * 폰트.
 * 손글씨(Garam)를 UI 전체에 쓰면 가독성이 떨어져서 로고·제목 전용으로 두고,
 * 본문·버튼·입력은 본문용 산세리프를 씁니다.
 */
export const font = {
  display: "'Garam', cursive",
  body: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Malgun Gothic', sans-serif",
} as const;

export interface AppTheme {
  name: ThemeName;
  color: typeof color;
  space: typeof space;
  radius: typeof radius & { default: string };
  shadow: typeof shadow;
  font: typeof font;
  button: {
    [key in ButtonSize]: {
      fontSize: string;
      padding: string;
    };
  };
  buttonScheme: {
    [key in ButtonScheme]: {
      color: string;
      backgroundColor: string;
      hoverTxtColor?: string;
      hoverBgColor?: string;
    };
  };
  borderRadius: {
    default: string;
  };
  input: {
    [key in InputSize]: {
      fontSize: string;
      padding: string;
      width: string;
      height: string;
    };
  };
}

export const lightTheme: AppTheme = {
  name: 'light',
  color,
  space,
  radius,
  shadow,
  font,
  button: {
    small: {
      fontSize: '12px',
      padding: '8px 12px',
    },
    medium: {
      fontSize: '16px',
      padding: '10px 20px',
    },
    large: {
      fontSize: '22px',
      padding: '8px 20px',
    },
  },
  buttonScheme: {
    normal: {
      color: color.text,
      backgroundColor: color.border,
      hoverTxtColor: color.textInverse,
      hoverBgColor: color.primary,
    },
    positive: {
      color: color.text,
      backgroundColor: color.border,
      hoverTxtColor: color.text,
      hoverBgColor: color.accent,
    },
    negative: {
      color: color.text,
      backgroundColor: color.border,
      hoverTxtColor: color.text,
      hoverBgColor: color.dangerSoft,
    },
  },
  borderRadius: {
    default: radius.default,
  },
  input: {
    small: {
      fontSize: '8px',
      padding: '4px 8px',
      width: '200px',
      height: '20px',
    },
    medium: {
      fontSize: '14px',
      padding: '8px 10px',
      width: '250px',
      height: '20px',
    },
    large: {
      fontSize: '16px',
      padding: '10px 12px',
      width: '300px',
      height: '50px',
    },
  },
};

export const darkTheme: AppTheme = {
  ...lightTheme,
  name: 'dark',
};

export const getTheme = (themeName: ThemeName): AppTheme => {
  switch (themeName) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
  }
};
