export type ThemeName = 'light' | 'dark';

export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonScheme = 'normal' | 'positive' | 'negative';

export type InputSize = 'small' | 'medium' | 'large';

interface Props {
  name: ThemeName;
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

export const lightTheme: Props = {
  name: 'light',
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
      color: 'black',
      backgroundColor: '#E3E3E3',
      hoverTxtColor: 'white',
      hoverBgColor: '#575757',
    },
    positive: {
      color: 'black',
      backgroundColor: '#E3E3E3',
      hoverTxtColor: 'white',
      hoverBgColor: '#c6cdbe',
    },
    negative: {
      color: 'black',
      backgroundColor: '#E3E3E3',
      hoverTxtColor: 'white',
      hoverBgColor: '#cdbebe',
    },
  },
  borderRadius: {
    default: '16px',
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

export const darkTheme: Props = {
  ...lightTheme,
  name: 'dark',
};

export const getTheme = (themeName: ThemeName): Props => {
  switch (themeName) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
  }
};
