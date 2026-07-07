// 2단계 AI 층 ② 개인화 설명 생성 (Vercel serverless · Anthropic SDK)
// 규칙 엔진이 계산한 '사실'만 근거로 쉬운 말 설명 생성 → 환각 방지 + 국가건강정보포털 근거 안내(RAG 자리).
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM = `너는 성인·가족 예방접종을 쉬운 말로 설명하는 따뜻한 도우미다.
규칙:
1) 아래 제공된 '사실'(규칙 엔진 계산 결과)만 사용한다. 새로운 의학적 사실·수치·백신을 절대 지어내지 않는다(환각 금지).
2) 지금 챙길 것 → 앞으로 챙길 것 순서로, 각 백신을 왜 맞아야 하는지 1~2문장씩 쉽고 다정하게 설명한다.
3) 전체 5~8문장 이내. 전문용어는 풀어서.
4) 마지막에 반드시: "최종 접종 판단과 무료 대상은 의료진·관할 보건소와 상담하세요. 질환·백신 근거는 국가건강정보포털(health.kdca.go.kr)에서 확인할 수 있어요." 로 마무리한다.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { profile, now = [], later = [], done = [] } = req.body || {};
    const facts = { 프로필: profile, 지금: now, 앞으로: later, 완료: done };
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // 비용 우선이면 'claude-haiku-4-5'
      max_tokens: 900,
      system: SYSTEM,
      messages: [{ role: 'user', content: '다음 사실만 근거로 설명해 줘:\n' + JSON.stringify(facts, null, 2) }]
    });
    const block = msg.content.find(b => b.type === 'text');
    return res.status(200).json({ text: block ? block.text : '' });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
