// 2단계 AI 층 ① 자연어 입력 파싱 (Vercel serverless · Anthropic SDK)
// "63세 당뇨, 대상포진 안 맞음" 같은 문장 → 구조화된 프로필. 구조적 출력으로 환각/형식오류 차단.
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

const SCHEMA = {
  type: 'object',
  properties: {
    age: { type: ['integer', 'null'], description: '나이 숫자. 없으면 null' },
    unit: { type: 'string', enum: ['year', 'month'], description: '개월 언급이면 month' },
    gender: { type: 'string', enum: ['여', '남', ''] },
    cond: { type: 'array', items: { type: 'string', enum: ['만성질환', '간질환', '면역저하', '임신', '없음'] } },
    hist: { type: 'array', items: { type: 'string', enum: ['독감', '폐렴구균', '대상포진', 'Tdap', 'MMR', '수두', 'A형간염', 'B형간염', 'HPV', '코로나19'] } },
    region: { type: 'string', enum: ['', 'sea', 'sasia', 'ssafrica', 'latam', 'mideast', 'eastasia', 'westdev'] },
    travelDate: { type: ['string', 'null'], description: '여행 출발일 YYYY-MM-DD. 없으면 null' }
  },
  required: ['age', 'unit', 'gender', 'cond', 'hist', 'region', 'travelDate'],
  additionalProperties: false
};

const SYSTEM = `너는 한국어 문장에서 성인 예방접종 프로필 필드를 추출한다.
- 반드시 허용된 enum 값만 사용한다. 문장에 명시되지 않은 조건/이력은 넣지 않는다.
- 나이가 "개월/달"이면 unit=month, "세/살"이면 unit=year.
- 접종이력(hist)은 "맞았다/완료"로 명시된 것만. "안 맞았다"는 넣지 않는다.
- 여행지가 언급되면 region 코드(sea=동남아, sasia=남아시아, ssafrica=사하라이남 아프리카, latam=중남미, mideast=중동, eastasia=동아시아, westdev=북미·서유럽·오세아니아)로 매핑.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
    const msg = await client.messages.create({
      model: 'claude-opus-4-8', // 비용 우선이면 'claude-haiku-4-5'로 교체 가능
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: text }]
    });
    const block = msg.content.find(b => b.type === 'text');
    return res.status(200).json(JSON.parse(block.text));
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
