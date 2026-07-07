// 2단계 공공데이터 ④ 인플루엔자 유행 경보 (best-effort)
// ⚠️ 질병청 인플루엔자 의사환자분율(ILI)의 공식 실시간 REST API는 확인되지 않음.
// 기본: 절기(시즌) 규칙으로 판단. FLU_CSV_URL(질병청 표본감시 CSV 직링크)을 넣으면 실시간 파싱 시도 → 실패 시 시즌 폴백.
function seasonFlu() {
  const mo = new Date().getMonth(); // 0=1월
  const active = (mo >= 9 || mo <= 1); // 10~2월
  return { active, level: active ? '유행 시즌' : '정상', source: 'season' };
}
// CSV에서 인플루엔자 최신 의사환자분율을 추정(스키마 미공개 → 방어적 휴리스틱). 못 찾으면 null.
function parseFluCSV(text) {
  try {
    const rows = text.split(/\r?\n/).filter(Boolean).map(l => l.split(','));
    if (rows.length < 2) return null;
    const header = rows[0].map(h => h.replace(/"/g, '').trim());
    const iliCol = header.findIndex(h => /의사환자|ILI|분율|율/.test(h));
    const dzCol = header.findIndex(h => /질병|감염병|명/.test(h));
    for (let i = rows.length - 1; i > 0; i--) {
      const r = rows[i].map(c => c.replace(/"/g, '').trim());
      const isFlu = dzCol >= 0 ? /인플루엔자|독감/.test(r[dzCol]) : r.some(c => /인플루엔자|독감/.test(c));
      if (!isFlu) continue;
      const raw = iliCol >= 0 ? r[iliCol] : r.find(c => /^\d+(\.\d+)?$/.test(c));
      const rate = raw != null ? parseFloat(raw) : NaN;
      if (!isNaN(rate)) return { rate };
    }
    return null;
  } catch (e) { return null; }
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const url = process.env.FLU_CSV_URL;
  if (!url) return res.status(200).json({ flu: seasonFlu() });
  try {
    const r = await fetch(url);
    const parsed = parseFluCSV(await r.text());
    if (parsed == null) return res.status(200).json({ flu: seasonFlu(), note: 'CSV 파싱 실패 → 시즌 폴백' });
    const threshold = Number(process.env.FLU_THRESHOLD) || 5.0; // 절기 유행기준(대략) — 실제 CSV 확인 후 조정
    const active = parsed.rate >= threshold;
    return res.status(200).json({ flu: { active, level: active ? '주의보' : '정상', rate: parsed.rate, source: 'kdca-csv' } });
  } catch (e) {
    return res.status(200).json({ flu: seasonFlu(), note: 'fetch 실패 → 시즌 폴백', error: String(e && e.message || e) });
  }
}
