// 공공데이터 ⑤ 국가예방접종 위탁의료기관(접종처) 프록시
// data.go.kr/15084303 orglist3/getOrgList3 → 선택 시군구의 병의원 목록. 깨진 JSON 대비 정규식 파싱.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const KEY = process.env.DATA_GO_KR_KEY;
  const brtc = req.query.brtc, sgg = req.query.sgg;
  if (!KEY) return res.status(200).json({ connected: false, reason: 'DATA_GO_KR_KEY 미설정', orgs: [] });
  if (!brtc || !sgg) return res.status(400).json({ error: 'brtc, sgg 파라미터 필요' });
  try {
    const p = new URLSearchParams({ serviceKey: KEY, returnType: 'json', pageNo: '1', numOfRows: '100', brtcCd: brtc, sggCd: sgg });
    const t = await (await fetch('https://apis.data.go.kr/1790387/orglist3/getOrgList3?' + p.toString())).text();
    const names = [...t.matchAll(/"orgnm":"([^"]*)"/g)].map(m => m[1]);
    const tels = [...t.matchAll(/"orgTlno":"([^"]*)"/g)].map(m => m[1]);
    const addrs = [...t.matchAll(/"orgAddr":"([^"]*)"/g)].map(m => m[1]);
    const total = (/"totalCount":(\d+)/.exec(t) || [])[1];
    const orgs = names.map((n, i) => ({ name: n, tel: tels[i] || '', addr: addrs[i] || '' }));
    return res.status(200).json({ connected: orgs.length > 0 || (/"resultCode":"00"/.test(t)), count: orgs.length, total: total ? Number(total) : orgs.length, orgs });
  } catch (e) {
    return res.status(200).json({ connected: false, reason: String(e && e.message || e), orgs: [] });
  }
}
