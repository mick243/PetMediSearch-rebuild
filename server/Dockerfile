# PetMediSearch API 서버 이미지.
#
# 두 단계로 나눕니다. bcrypt 가 네이티브 모듈이라 설치할 때 컴파일 도구가 필요할
# 수 있는데, 그 도구를 최종 이미지까지 들고 가면 크기도 커지고 공격 면도 넓어집니다.

# ---------- 1단계: 의존성 설치 ----------
FROM node:22-slim AS deps

# bcrypt 에 미리 빌드된 바이너리가 없을 때를 대비합니다.
# 있으면 그냥 내려받고 끝나므로 이 도구들은 쓰이지 않습니다.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# package.json 만 먼저 복사합니다. 소스만 바뀌면 이 층은 캐시가 그대로 쓰입니다.
COPY package*.json ./

# npm ci 는 package-lock.json 그대로 설치합니다 (install 과 달리 잠금 파일을 고치지 않음).
RUN npm ci --omit=dev

# ---------- 2단계: 실행 ----------
FROM node:22-slim AS runtime

# 컨테이너 안 시각을 한국 시간으로 맞춥니다. 로그의 시각과 사람이 보는 시각이 같아야
# 장애를 따라가기 쉽습니다. DB 에 넣는 값은 애플리케이션이 만든 Date 를 쓰므로 함께 맞습니다.
ENV TZ=Asia/Seoul
ENV NODE_ENV=production

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# .env 는 이미지에 넣지 않습니다(.dockerignore). 실행할 때 넘깁니다.
# 비밀값이 이미지에 박히면 이미지를 받을 수 있는 사람이 곧 비밀값을 가진 사람이 됩니다.

# 공식 이미지에 있는 비특권 사용자로 내려갑니다. root 로 돌릴 이유가 없습니다.
USER node

EXPOSE 8081

# 컨테이너가 "떠 있는지" 가 아니라 "쓸 수 있는지" 를 봅니다.
# /health 는 DB 에 실제로 쿼리를 던져 보고 답합니다.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8081)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# npm start 를 거치지 않고 node 를 직접 띄웁니다.
# npm 을 거치면 SIGTERM 이 node 까지 전달되지 않아 정상 종료가 동작하지 않습니다.
CMD ["node", "app.js"]
