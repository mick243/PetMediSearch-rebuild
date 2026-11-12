/*
 * 요약 제공자가 지켜야 할 모양. providers/ 의 넷이 모두 이것을 내보내고, index.ts 가 그중
 * 하나를 고릅니다. 예전에는 gemini 파일 머리의 주석으로만 적혀 있던 약속입니다.
 */

/** 모델에게 돌려받을 JSON 의 모양. reviewSummaryPrompt.ts 의 SUMMARY_SCHEMA 가 이 꼴입니다. */
export interface JsonSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema;
    maxItems?: number;
    maxLength?: number;
    additionalProperties?: boolean;
}

export interface GenerateJsonInput {
    system: string;
    user: string;
    schema?: JsonSchema;
    maxOutputTokens?: number;
}

export interface GenerateJsonOutput {
    /** 모델이 돌려준 JSON 문자열. 읽는 쪽(parseSummary)이 형식을 다시 봅니다. */
    text: string;
    /** 실제로 답한 모델 이름. 별칭을 줬으면 풀린 이름이 옵니다. */
    model: string;
}

export interface SummaryProvider {
    name: string;
    model: () => string;
    isConfigured: () => boolean;
    /** 꺼져 있을 때 그 까닭. 서버가 뜰 때 한 줄로 찍힙니다(index.ts 의 describe). */
    disabledReason?: string;
    generateJson: (input: GenerateJsonInput) => Promise<GenerateJsonOutput>;
}
