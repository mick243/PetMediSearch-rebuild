/*
 * Google Gemini 제공자. 지금 켜져 있는 것입니다 (.env 의 AI_PROVIDER=gemini).
 *
 * 세 제공자는 모두 같은 모양을 내보냅니다 — ../index.js 가 그중 하나를 고릅니다.
 *   name            문자열
 *   model()         쓰는 모델 이름
 *   isConfigured()  키가 있어 부를 수 있는가
 *   generateJson({ system, user, schema, maxOutputTokens }) → { text, model }
 *
 * SDK 는 @google/genai 입니다. 옛 @google/generative-ai 는 더 이상 갱신되지 않습니다.
 */
const { GoogleGenAI, Type } = require('@google/genai');

/**
 * 기본 모델. 'gemini-flash-latest' 는 그때의 flash 계열 최신을 가리키는 별칭이라
 * 이름이 사라져 갑자기 400 이 나는 일이 없습니다. 답이 흔들리지 않아야 하면
 * .env 의 GEMINI_MODEL 에 구체 모델(예: gemini-2.5-flash)을 못박으세요.
 */
const DEFAULT_MODEL = 'gemini-flash-latest';

/** 요약 한 번에 30초. 이보다 오래 걸리면 낡은 요약을 그대로 두는 편이 낫습니다. */
const TIMEOUT_MS = 30_000;

const apiKey = () => (process.env.GEMINI_API_KEY || '').trim();
const model = () => (process.env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
const isConfigured = () => apiKey().length > 0;

/*
 * 키를 읽는 시점을 부를 때로 늦춥니다. 모듈을 require 하는 순간 만들면 테스트나
 * 키 없는 환경에서도 클라이언트가 만들어집니다.
 */
let client = null;
const getClient = () => {
    if (!client) client = new GoogleGenAI({ apiKey: apiKey() });
    return client;
};

/** 보통 JSON Schema → Gemini 의 Schema. 우리가 쓰는 종류만 옮깁니다. */
const TYPES = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
    object: Type.OBJECT,
};

const toGeminiSchema = (schema) => {
    const type = TYPES[schema.type];
    if (!type) throw new Error(`Gemini 스키마로 옮길 수 없는 type 입니다: ${schema.type}`);

    const out = { type };
    if (schema.description) out.description = schema.description;
    if (schema.items) out.items = toGeminiSchema(schema.items);
    if (schema.properties) {
        out.properties = Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)])
        );
    }
    if (schema.required) out.required = schema.required;
    return out;
};

const generateJson = async ({ system, user, schema, maxOutputTokens = 1024 }) => {
    const response = await getClient().models.generateContent({
        model: model(),
        contents: user,
        config: {
            systemInstruction: system,
            responseMimeType: 'application/json',
            responseSchema: toGeminiSchema(schema),
            // 요약은 창의성이 아니라 일관성이 필요합니다. 같은 후기면 비슷한 답이 나와야 합니다.
            temperature: 0.3,
            maxOutputTokens,
            httpOptions: { timeout: TIMEOUT_MS },
        },
    });

    /*
     * 요청 자체가 막히면 후보가 없고 blockReason 만 옵니다. text 는 undefined 라
     * 그대로 두면 "본문이 없습니다" 로 뭉개져 원인을 알 수 없습니다.
     * 응답 본문은 로그에 남기지 않습니다 (CLAUDE.md §2.11).
     */
    const blocked = response.promptFeedback?.blockReason;
    if (blocked) throw new Error(`Gemini 가 요청을 막았습니다: ${blocked}`);

    const text = response.text;
    if (!text) throw new Error('Gemini 응답에 본문이 없습니다.');

    return { text, model: response.modelVersion || model() };
};

module.exports = { name: 'gemini', model, isConfigured, generateJson, toGeminiSchema };
