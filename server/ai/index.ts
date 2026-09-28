/*
 * AI 제공자 고르기.
 *
 * 후기 요약은 Gemini·Anthropic(Claude)·OpenAI 어느 것으로도 만들 수 있게 해 두고,
 * .env 의 AI_PROVIDER 하나로 고릅니다. 지금 켜져 있는 것은 gemini 이고 나머지 둘은
 * providers/ 안에 구현이 주석으로 들어 있습니다 (켜는 법은 각 파일 머리에).
 *
 * 부르는 쪽(controller/reviewSummary.ts)은 제공자가 무엇인지 모릅니다. 바꿔도
 * 그쪽은 손대지 않습니다. 단, 후기 본문이 나가는 사업자가 바뀌므로 개인정보처리방침
 * 3장은 함께 고쳐야 합니다 (CLAUDE.md §4.11).
 *
 * 키가 없으면 기능만 꺼집니다. 후기 목록은 summary: null 로 그대로 나갑니다 —
 * VAPID 키가 없을 때 알림만 꺼지는 것과 같은 방식입니다.
 */

import gemini from './providers/gemini.js';
import anthropic from './providers/anthropic.js';
import openai from './providers/openai.js';
import stub from './providers/stub.js';
import type { SummaryProvider } from './provider.js';

/*
 * 넷을 모두 불러 둡니다. 꺼져 있는 둘(anthropic · openai)은 SDK 를 부르지 않는 "꺼진 상태" 만
 * 내보내서, SDK 가 설치돼 있지 않아도 서버가 뜹니다. 켜는 법(SDK 설치 포함)은 각 파일 머리에.
 *
 * 예전에는 필요할 때 require 했습니다. ESM 에서 그렇게 하려면 import() 가 되어 isEnabled()
 * 를 부르는 쪽까지 전부 async 가 됩니다.
 */
const PROVIDERS: Record<string, SummaryProvider> = {
    gemini,
    anthropic,
    openai,
    // 개발용. 키 없이 화면만 볼 때. 운영에서는 켜지지 않습니다.
    stub,
};

const DEFAULT_PROVIDER = 'gemini';

const providerName = () => (process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();

const getProvider = (): SummaryProvider => {
    const name = providerName();
    const provider = PROVIDERS[name];
    if (!provider) {
        throw new Error(`AI_PROVIDER 값이 올바르지 않습니다: "${name}" (gemini | anthropic | openai)`);
    }
    return provider;
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
    let provider: SummaryProvider;
    try {
        provider = getProvider();
    } catch (error) {
        return `꺼짐 — ${(error as Error).message}`;
    }
    if (provider.isConfigured()) return `${provider.name} (${provider.model()})`;
    return `꺼짐 — ${provider.disabledReason || `${provider.name} 키가 없습니다`}`;
};

export { getProvider, isEnabled, describe, providerName };
