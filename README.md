# 백신 챙겨 (Vaxkeep)

성인·가족 예방접종 결정 도우미 — 흩어진 지침을 **당신의 상황 하나로** 정리해 '지금 챙길 백신 + 앞으로의 일정'을 보여주는 PWA.

**라이브:** https://jundamin.github.io/vaxkeep/ · **저장소:** https://github.com/JunDamin/vaxkeep

> 철학: 정보를 **더하지** 않고 **덜어내서**, 입력 → 한 화면 결정 → 접종 페이스메이커.

## 기능
- **개인 결정 리스트** — 나이·성별·기저질환·이력 → 지금/앞으로/완료 + 무료/유료 + 접종처 링크 (국가예방접종 17종)
- **접종 페이스메이커** — 다음 접종일 계산·타임라인 + `.ics` 캘린더 등록 + 앱 내 알림
- **상황 인지** — 독감 유행 시즌 우선순위(🔥), 면역 형성 시간, 여행지(권역)별 필수 백신(황열·수막구균 등)
- **가족 프로필** — localStorage(기기에만 저장, 서버 전송 없음)
- **PWA** — 설치·오프라인
- **AI 층(2단계)** — 자연어 입력 파싱 + 개인화 설명(RAG 근거). 아래 배포 시 활성화.

## 1단계 실행/배포 (정적 · 무서버)
`index.html` + PWA 파일들. GitHub Pages/Netlify/Vercel 정적 호스팅에 그대로 배포. 현재 Pages로 배포됨.

## 2단계 — AI 층 배포 (serverless)
자연어 파싱·개인화 설명은 Claude API 키를 숨겨야 해 **serverless 함수**가 필요합니다. `api/parse.js`·`api/explain.js`(Anthropic SDK)가 준비돼 있습니다.

1. 이 저장소를 [Vercel](https://vercel.com/new)에 import (또는 `npx vercel`).
2. 환경변수 **`ANTHROPIC_API_KEY`** 추가 (Anthropic 콘솔에서 발급).
3. 배포되면 API URL이 나옵니다(예: `https://vaxkeep-xxxx.vercel.app`).
4. `index.html`의 `const AI_API = ''` 를 그 URL로 바꿔 재배포 → 자연어 자동채우기·"쉬운 말로 설명" 이 LLM으로 동작.

- 모델: `claude-opus-4-8` (비용 우선이면 `api/*.js`에서 `claude-haiku-4-5`로 교체 가능).
- 프론트는 API 미설정 시 **휴리스틱 파서로 자동 폴백**하므로 정적 사이트도 계속 작동합니다.
- CORS 허용돼 있어 프론트(Pages)와 API(Vercel)를 분리 운영해도 됩니다.

## 백신 규칙 (⚠️ 임상 감수 필요)
질병청 국가예방접종 표준일정 + 대한감염학회(KSID) 권고를 규칙으로 요약(2025–2026 기준). 연령·조건·간격·무료 대상의 최종 기준은 [예방접종도우미](https://nip.kdca.go.kr)·[국가건강정보포털](https://health.kdca.go.kr)에서 검증하세요.

## 공공데이터
예방접종도우미(지침·위탁의료기관 딥링크), 국가건강정보포털(RAG 근거), 질병청 예방접종정보 개방 API(data.go.kr/15084296), 감염병 표본감시(독감 시즌·2단계 실시간).

## 면책
참고용 비진단 정보. 최종 접종 판단·무료 대상은 의료진·관할 보건소와 상담하세요.
