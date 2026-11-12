/*
 * server/ 디렉터리 위치.
 *
 * tsx 로 소스를 돌리면 이 파일은 server/ 에 있고, 빌드한 것을 돌리면 server/dist/ 에 있습니다.
 * 예전에는 파일마다 __dirname 을 기준으로 .env · data · public 을 찾았는데, 빌드하면 그 기준이
 * 한 단계 안쪽(dist)으로 들어가 전부 못 찾게 됩니다. 여기 한 곳에서 맞춥니다.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = import.meta.dirname;

/** 빌드한 것(dist)을 돌리고 있는지. */
export const RUNNING_BUILT = path.basename(here) === 'dist';

/** server/ 의 절대 경로. 빌드했든 안 했든 같은 곳입니다. */
export const SERVER_ROOT = RUNNING_BUILT ? path.dirname(here) : here;

/**
 * 이 모듈이 `node 파일` 로 직접 실행됐는지 (예전의 require.main === module).
 * 스크립트가 테스트에서 import 될 때는 main() 을 돌리지 않으려고 씁니다.
 */
export const isMain = (moduleUrl: string): boolean =>
    process.argv[1] !== undefined && moduleUrl === pathToFileURL(path.resolve(process.argv[1])).href;
