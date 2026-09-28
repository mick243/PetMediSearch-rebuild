/*
 * server/.env 를 읽습니다. 환경변수를 읽는 모듈은 맨 위에서 이것을 먼저 import 합니다.
 *
 * ESM 은 import 한 모듈을 전부 평가한 뒤에야 본문을 돌립니다. 그래서 예전처럼 첫 줄에서
 * dotenv.config() 를 불러도, 그 파일이 import 한 모듈(예: push.ts 의 VAPID 키)은 이미 빈
 * 환경변수로 평가된 뒤입니다. 모듈로 만들어 import 순서에 올려야 먼저 돕니다.
 *
 * 이미 있는 환경변수는 덮지 않습니다(dotenv 기본값). compose 나 테스트가 넘긴 값이 이깁니다.
 * 예전에는 앱은 실행한 디렉터리의 .env 를, 스크립트는 server/.env 를 읽었습니다. 이제 둘 다
 * server/.env 입니다.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { SERVER_ROOT } from './paths.js';

dotenv.config({ path: path.join(SERVER_ROOT, '.env') });
