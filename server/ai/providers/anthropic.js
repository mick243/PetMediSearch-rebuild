/*
 * Anthropic(Claude) 제공자 — 지금은 꺼져 있습니다. 구현은 아래 주석 블록 안에 있습니다.
 *
 * 켜는 법
 *   1. cd server && npm install @anthropic-ai/sdk zod
 *   2. 아래 "실제 구현" 블록의 주석을 풀고, 맨 아래 "꺼진 상태" module.exports 를 지웁니다.
 *   3. .env 에 ANTHROPIC_API_KEY 를 채우고 AI_PROVIDER=anthropic 으로 바꿉니다.
 *      (.env.example 에 자리가 주석으로 있습니다)
 *   4. client/src/pages/Privacy.tsx 3장 표의 "시설 후기 요약" 행에서 사업자를
 *      Anthropic 으로 고칩니다. 후기 본문이 외부로 나가는 곳이 바뀌는 것이라
 *      문서도 같이 바뀌어야 합니다 (CLAUDE.md §4.11).
 *
 * 내보내는 모양은 gemini.js 와 같습니다: name · model() · isConfigured() · generateJson().
 */

/* ── 실제 구현 ─────────────────────────────────────────────────────────────

const { Anthropic } = require('@anthropic-ai/sdk');
const { z } = require('zod');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');

// 다른 모델을 쓰려면 .env 의 ANTHROPIC_MODEL 로 바꿉니다. 날짜 접미사는 붙이지 않습니다.
const DEFAULT_MODEL = 'claude-opus-5';

const apiKey = () => (process.env.ANTHROPIC_API_KEY || '').trim();
const model = () => (process.env.ANTHROPIC_MODEL || '').trim() || DEFAULT_MODEL;
const isConfigured = () => apiKey().length > 0;

let client = null;
const getClient = () => {
    // 키는 부를 때 읽습니다. 모듈 로드 시점에 만들면 키 없는 환경에서도 만들어집니다.
    if (!client) client = new Anthropic({ apiKey: apiKey(), timeout: 30_000 });
    return client;
};

// SUMMARY_SCHEMA(../reviewSummaryPrompt.js)와 같은 모양. 이 SDK 는 zod 로 형식을 받습니다.
// 두 곳이 어긋나면 화면이 기대하는 키가 빠지므로 저쪽을 고치면 여기도 고칩니다.
const SummarySchema = z.object({
    summary: z.string(),
    good: z.array(z.string()),
    caution: z.array(z.string()),
});

const generateJson = async ({ system, user, maxOutputTokens = 1024 }) => {
    const response = await getClient().messages.parse({
        model: model(),
        max_tokens: maxOutputTokens,
        system,
        messages: [{ role: 'user', content: user }],
        output_config: {
            // 요약은 깊은 추론이 필요 없습니다. 생각은 켜 둔 채(기본) 깊이만 낮춥니다.
            effort: 'low',
            format: zodOutputFormat(SummarySchema),
        },
    });

    // 안전 분류기가 요청을 거절하면 HTTP 200 에 stop_reason 만 refusal 로 옵니다.
    if (response.stop_reason === 'refusal') {
        throw new Error(`Claude 가 요청을 거절했습니다: ${response.stop_details?.category ?? '사유 없음'}`);
    }
    if (!response.parsed_output) throw new Error('Claude 응답을 형식대로 읽지 못했습니다.');

    return { text: JSON.stringify(response.parsed_output), model: response.model };
};

module.exports = { name: 'anthropic', model, isConfigured, generateJson };

── 실제 구현 끝 ──────────────────────────────────────────────────────────── */

// ── 꺼진 상태 ── 위 블록을 풀면 이 부분은 지웁니다.
module.exports = {
    name: 'anthropic',
    model: () => (process.env.ANTHROPIC_MODEL || '').trim() || 'claude-opus-5',
    isConfigured: () => false,
    disabledReason: 'server/ai/providers/anthropic.js 의 주석을 풀고 @anthropic-ai/sdk 를 설치해야 합니다',
    generateJson: async () => {
        throw new Error('Anthropic 제공자가 꺼져 있습니다. server/ai/providers/anthropic.js 의 주석을 푸세요.');
    },
};
