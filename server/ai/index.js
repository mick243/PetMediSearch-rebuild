/*
 * AI 제공자 고르기.
 *
 * 후기 요약은 Gemini·Anthropic(Claude)·OpenAI 어느 것으로도 만들 수 있게 해 두고,
 * .env 의 AI_PROVIDER 하나로 고릅니다. 지금 켜져 있는 것은 gemini 이고 나머지 둘은
 * providers/ 안에 구현이 주석으로 들어 있습니다 (켜는 법은 각 파일 머리에).
 *
 * 부르는 쪽(controller/reviewSummary.js)은 제공자가 무엇인지 모릅니다. 바꿔도
 * 그쪽은 손대지 않습니다. 단, 후기 본문이 나가는 사업자가 바뀌므로 개인정보처리방침
 * 3장은 함께 고쳐야 합니다 (CLAUDE.md §4.11).
 *
 * 키가 없으면 기능만 꺼집니다. 후기 목록은 summary: null 로 그대로 나갑니다 —
 * VAPID 키가 없을 때 알림만 꺼지는 것과 같은 방식입니다.
 */

/*
 * 필요할 때 require 합니다. 위에서 셋을 한 번에 require 하면 쓰지 않는 제공자의
 * SDK 가 없을 때도 서버가 뜨지 않습니다.
 */
const PROVIDERS = {
    gemini: () => require('./providers/gemini'),
    anthropic: () => require('./providers/anthropic'),
    openai: () => require('./providers/openai'),
    // 개발용. 키 없이 화면만 볼 때. 운영에서는 켜지지 않습니다.
    stub: () => require('./providers/stub'),
};

const DEFAULT_PROVIDER = 'gemini';

const providerName = () => (process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();

const getProvider = () => {
    const name = providerName();
    const load = PROVIDERS[name];
    if (!load) {
        throw new Error(`AI_PROVIDER 값이 올바르지 않습니다: "${name}" (gemini | anthropic | openai)`);
    }
    return load();
};

/** 지금 설정으로 요약을 만들 수 있는가. 키가 없거나 제공자가 꺼져 있으면 false. */
const isEnabled = () => {
    try {
        return getProvider().isConfigured();
    } catch {
        return false;
    }
};

/** 서버가 뜰 때 한 줄 찍는 용도. 키 값은 절대 넣지 않습니다. */
const describe = () => {
    let provider;
    try {
        provider = getProvider();
    } catch (error) {
        return `꺼짐 — ${error.message}`;
    }
    if (provider.isConfigured()) return `${provider.name} (${provider.model()})`;
    return `꺼짐 — ${provider.disabledReason || `${provider.name} 키가 없습니다`}`;
};

module.exports = { getProvider, isEnabled, describe, providerName };
