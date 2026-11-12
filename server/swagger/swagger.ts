import '../loadEnv.js';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import swaggereJsdoc from 'swagger-jsdoc';
const BASE_URL = process.env.URL;

const options = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            version: "1.0.0",
            title: "Pet Medi Search",
            description:
                "반려동물 병원 및 약국 조회 서비스",
        },
        tags: [
            {
                name: "Categories",
                description: "카테고리 조회, 카테고리별 게시글 조회 api",
            },
            {
                name: "Posts",
                description: "게시글 조회, 등록, 수정, 삭제 api",
            },
            {
                name: "Comments",
                description: "댓글 조회, 등록, 수정, 삭제 api",
            },
        ],
        servers: [
            {
                url: BASE_URL,
            },
        ],
    },
    /*
     * 라우터 파일의 JSDoc 주석으로 문서를 만듭니다. 이 파일 위치를 기준으로 찾아서, 실행한 디렉터리가
     * 어디든 같은 파일을 봅니다(예전에는 "./routes/*.js" 라 server/ 밖에서 띄우면 문서가 비었습니다).
     * 소스(.ts)로 돌 때와 빌드한 것(.js)으로 돌 때를 둘 다 받습니다.
     */
    apis: [path.join(import.meta.dirname, "..", "routes", "*.{ts,js}")],
}
const specs = swaggereJsdoc(options)

export { swaggerUi, specs };