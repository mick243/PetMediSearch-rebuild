/*
 * 개발용 가짜 제공자. 키 없이 저장 흐름과 화면 카드만 볼 때 씁니다 (AI_PROVIDER=stub).
 *
 * 운영(NODE_ENV=production)에서는 켜지지 않습니다 — 진짜 요약처럼 보이는 가짜 글이
 * 사용자에게 나가면 안 됩니다. 글 자체에도 임시라고 써 둡니다.
 */
const isConfigured = () => process.env.NODE_ENV !== 'production';

const generateJson = async ({ user }) => {
    // 프롬프트에 적힌 건수를 그대로 돌려줘 몇 건을 봤는지는 맞게 보이게 합니다.
    const shown = /shown="(\d+)"/.exec(user)?.[1] ?? '?';
    return {
        text: JSON.stringify({
            summary: `(개발용 임시 요약) 후기 ${shown}건을 읽은 것처럼 만든 글입니다. 실제 모델을 쓰려면 .env 에 GEMINI_API_KEY 를 채우고 AI_PROVIDER=gemini 로 두세요.`,
            good: ['임시 항목 — 실제 요약이 아닙니다'],
            caution: [],
        }),
        model: 'stub',
    };
};

module.exports = {
    name: 'stub',
    model: () => 'stub',
    isConfigured,
    disabledReason: '운영에서는 쓸 수 없습니다',
    generateJson,
};
