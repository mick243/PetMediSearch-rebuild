import 'styled-components';
import { AppTheme } from './style/theme';

/**
 * styled-components 의 theme 타입.
 * 이 선언이 없어 지금까지 theme 이 any 로 추론됐고, 토큰 오타가 잡히지 않았습니다.
 */
declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
