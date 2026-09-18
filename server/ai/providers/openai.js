/*
 * OpenAI 제공자 — 지금은 꺼져 있습니다. 구현은 아래 주석 블록 안에 있습니다.
 *
 * 켜는 법
 *   1. cd server && npm install openai
 *   2. 아래 "실제 구현" 블록의 주석을 풀고, 맨 아래 "꺼진 상태" module.exports 를 지웁니다.
 *   3. .env 에 OPENAI_API_KEY 를 채우고 AI_PROVIDER=openai 로 바꿉니다.
 *      (.env.example 에 자리가 주석으로 있습니다)
 *   4. client/src/pages/Privacy.tsx 3장 표의 "시설 후기 요약" 행에서 사업자를
 *      OpenAI 로 고칩니다 (CLAUDE.md §4.11).
 *
 * 주석을 풀기 전에 모델 이름과 Responses API 의 현재 형식을 공식 문서에서 한 번
 * 확인하세요. 이 블록은 실행해 보지 않은 코드입니다.
 *
 * 내보내는 모양은 gemini.js 와 같습니다: name · model() · isConfigured() · generateJson().
 */

/* ── 실제 구현 ─────────────────────────────────────────────────────────────

const OpenAI = require('openai');

// 다른 모델을 쓰려면 .env 의 OPENAI_MODEL 로 바꿉니다.
const DEFAULT_MODEL = 'gpt-5';

const apiKey = () => (process.env.OPENAI_API_KEY || '').trim();
const model = () => (process.env.OPENAI_MODEL || '').trim() || DEFAULT_MODEL;
const isConfigured = () => apiKey().length > 0;

let client = null;
const getClient = () => {
    // 키는 부를 때 읽습니다. 모듈 로드 시점에 만들면 키 없는 환경에서도 만들어집니다.
    if (!client) client = new OpenAI({ apiKey: apiKey(), timeout: 30_000 });
    return client;
};

const generateJson = async ({ system, user, schema, maxOutputTokens = 1024 }) => {
    const response = await getClient().responses.create({
        model: model(),
        instructions: system,
        input: user,
        // strict 는 모든 속성이 required 이고 additionalProperties 가 false 여야 합니다.
        // SUMMARY_SCHEMA(../reviewSummaryPrompt.js)가 그 조건을 맞춰 두었습니다.
        text: { format: { type: 'json_schema', name: 'review_summary', schema, strict: true } },
        max_output_tokens: maxOutputTokens,
    });

    const text = response.output_text;
    if (!text) throw new Error('OpenAI 응답에 본문이 없습니다.');

    return { text, model: response.model || model() };
};

module.exports = { name: 'openai', model, isConfigured, generateJson };

── 실제 구현 끝 ──────────────────────────────────────────────────────────── */

// ── 꺼진 상태 ── 위 블록을 풀면 이 부분은 지웁니다.
module.exports = {
    name: 'openai',
    model: () => (process.env.OPENAI_MODEL || '').trim() || 'gpt-5',
    isConfigured: () => false,
    disabledReason: 'server/ai/providers/openai.js 의 주석을 풀고 openai 를 설치해야 합니다',
    generateJson: async () => {
        throw new Error('OpenAI 제공자가 꺼져 있습니다. server/ai/providers/openai.js 의 주석을 푸세요.');
    },
};
