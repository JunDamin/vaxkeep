// 2단계 공공데이터 ③ 질병청 예방접종정보 API 프록시 (실제 live 연동)
// data.go.kr/15084296 getCondVcnCd → 대상감염병 코드·명칭(XML) → JSON. Decoding 키 사용(이중 인코딩 회피).
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const KEY = process.env.DATA_GO_KR_KEY;
  if (!KEY) return res.status(200).json({ connected: false, reason: 'DATA_GO_KR_KEY 미설정' });
  try {
    // Decoding 키 + URLSearchParams → +,/,= 를 올바르게 인코딩(이중 인코딩 방지)
    const p = new URLSearchParams({ ServiceKey: KEY, numOfRows: '100', pageNo: '1' });
    const r = await fetch('https://apis.data.go.kr/1790387/vcninfo/getCondVcnCd?' + p.toString());
    const xml = await r.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
      const b = m[1];
      const cd = (/<cd>([\s\S]*?)<\/cd>/.exec(b) || [])[1] || '';
      const nm = (/<cdNm>([\s\S]*?)<\/cdNm>/.exec(b) || [])[1] || '';
      return { cd: cd.trim(), name: nm.trim() };
    });
    const rc = (/<resultCode>([\s\S]*?)<\/resultCode>/.exec(xml) || [])[1];
    const connected = items.length > 0 && (rc === undefined || rc === '00');
    return res.status(200).json(connected
      ? { connected: true, count: items.length, items }
      : { connected: false, reason: '응답 파싱 실패/키 문제', sample: xml.slice(0, 240) });
  } catch (e) {
    return res.status(200).json({ connected: false, reason: String(e && e.message || e) });
  }
}
