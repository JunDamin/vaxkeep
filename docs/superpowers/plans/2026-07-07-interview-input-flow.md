# 인터뷰형 입력 흐름 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 정적 폼을 "결과는 항상 위에 고정, 질문은 아래로 하나씩" 인터뷰형으로 바꿔, 나이만 답해도 즉시 결과가 나오고 이후 답변마다 결과가 실시간 갱신되게 한다.

**Architecture:** 회귀를 막기 위해 **DOM-as-state**: 기존 입력 요소(age·chips·birth·travel·region)를 그대로 두고 (1) `showResult`를 화면전환 없는 `renderResultInPlace()`로 분리, (2) 입력을 "질문 카드"로 재배치해 한 번에 하나만 노출, (3) 모든 입력 변경 시 `liveUpdate()`로 결과 영역만 다시 그림. 규칙엔진·페이스메이커·여행·유행경보·AI설명 로직은 불변.

**Tech Stack:** 단일 `index.html`(바닐라 JS), 검증은 `node --check` + 추출 엔진 페르소나 스모크.

## Global Constraints
- 단일 파일 `index.html`. 백엔드/DB 없음(무서버 정적). 한글 브랜드 "백신 챙겨", 영문 "Vaxkeep".
- 규칙엔진(`VACCINES`)·임상 로직·백신 데이터 **변경 금지**.
- 배포: GitHub Pages(`https://jundamin.github.io/vaxkeep/`). PWA/localStorage/AI(2단계) 흐름 유지.
- 각 태스크 종료 시: 스크립트 `node --check` 통과 + 회귀 페르소나 스모크(결과 불변) 통과.

---

### Task 1: showResult 분리 — 화면전환 없는 렌더 + 라이브 업데이트 훅

**Files:** Modify `index.html` (script: `showResult` 함수)

**Interfaces:**
- Produces: `renderResultInPlace()` — 결과 head/prof/alertBanner/resultBody/travelBox/paceBox/lastResult/aiExplain 를 그림(화면 전환 없음). age 무효면 `false` 반환.
- Produces: `liveUpdate()` — age 유효 시 `renderResultInPlace()` 호출, 무효면 결과 영역 비움.
- Consumes(불변): `compute…`은 없음. 기존 `renderGroup/renderPace/renderTravel/activeAlerts/metaOf` 그대로.

- [ ] **Step 1:** `showResult()` 본문에서 `go('result')` 직전까지를 `renderResultInPlace()`로 옮긴다. `renderResultInPlace()`는 age 파싱 실패 시 `return false`(alert 제거), 성공 시 결과를 그리고 `return true`. `showResult()`는 `if(renderResultInPlace()) go('result')` 로 축소(과도기 호환).
- [ ] **Step 2:** `liveUpdate()` 추가:
```js
function liveUpdate(){
  const raw=parseInt(document.getElementById('age').value,10);
  const ok = !isNaN(raw) && raw>=0 && renderResultInPlace();
  document.getElementById('resultArea').style.display = ok ? '' : 'none';
}
```
- [ ] **Step 3:** 검증 — 스크립트 추출 후 `node --check` 통과. 페르소나 스모크(63세 당뇨/생후4개월/임신부29세/만12세) 결과가 리팩터 전과 동일함을 재확인.
- [ ] **Step 4:** Commit `refactor: showResult를 renderResultInPlace + liveUpdate로 분리(동작 불변)`

---

### Task 2: 단일 화면(#app) 재구성 — 요약칩/결과영역/질문영역

**Files:** Modify `index.html` (HTML: `#input`·`#result` 섹션 → 통합 `#app`)

**Interfaces:**
- Produces: DOM 컨테이너 `#summaryBar`, `#resultArea`(기존 result 내부 요소 이동), `#questionArea`(스텝 카드 컨테이너), 진행 UI(`#accuracy`, `#doneBtn`).
- 기존 입력 요소 id 유지: `age/unitChips/genderChips/condChips/histChips/birth/travel/travelRegion/nlText/profiles`.

- [ ] **Step 1:** 홈 시작 버튼 `onclick="go('app')"`로 변경. `#input`·`#result` 섹션을 하나의 `<section id="app">`으로 합친다. 레이아웃: back → `#summaryBar` → `#resultArea`(기존 result-hero/alertBanner/resultBody/travelBox/paceBox/explain버튼/aiExplain/disclaimer 이동, 초기 `display:none`) → `#questionArea`(스텝 카드들) → `#accuracy` → `#doneBtn`("이대로 충분해요"→ 결과로 스크롤).
- [ ] **Step 2:** 기존 입력 필드(age/gender/cond/hist/birth/travel)를 `#questionArea` 안의 `.step` 카드로 감싼다: `<div class="step" data-step="age|gender|cond|hist|travel">…</div>`. NL 박스는 age 스텝 상단에 유지. `.step`은 기본 `display:none`, 활성 1개만 노출(Task 3에서 제어).
- [ ] **Step 3:** CSS 추가: `.step{...}`(카드), `.summary-chips`(요약칩 가로 스크롤, 각 칩 ✎), `.accuracy`(미터 바), 활성 스텝 강조.
- [ ] **Step 4:** 검증 — `node --check` 통과, `grep`으로 `id="app"`, `data-step`, `#resultArea`, `#summaryBar` 존재. 화면 마커 확인.
- [ ] **Step 5:** Commit `feat: 입력+결과를 단일 #app 화면으로 통합(스텝 카드 골격)`

---

### Task 3: 인터뷰 오케스트레이션 — 한 번에 하나, 요약칩, 실시간 갱신

**Files:** Modify `index.html` (script)

**Interfaces:**
- Consumes: `liveUpdate()`(Task1), `.step[data-step]`·요약 DOM(Task2), 기존 `selected/segToggle/setChip`.
- Produces: `STEPS=['age','gender','cond','hist','travel']`, `showStep(id)`, `advance()`, `skipStep()`, `editAnswer(id)`, `renderSummary()`, `renderAccuracy()`.

- [ ] **Step 1:** 상태: `let stepIdx=0; const answered=new Set();`. `showStep(id)` = 해당 `.step`만 `display:block`, 나머지 숨김, 활성표시.
- [ ] **Step 2:** `advance()` = 현재 스텝을 `answered`에 추가(travel은 opt-in 제외) → `renderSummary()` → `liveUpdate()` → 다음 `STEPS`로 `stepIdx++`, `showStep`. `skipStep()` = answered 미추가하고 다음으로. age 스텝은 값 있어야 advance(없으면 흔들기/hint).
- [ ] **Step 3:** 각 입력에 실시간 훅: age `input`·unit/gender/cond/hist 칩 클릭·birth/travel/region 변경 시 `liveUpdate()` 호출(이미 답한 뒤 재수정도 즉시 반영). 각 스텝 카드에 `[다음]`(advance)·`[건너뛰기]`(skipStep) 버튼.
- [ ] **Step 4:** `renderSummary()` = `#summaryBar`에 답한 스텝을 칩으로: 예 `만 63세`, `여성`, `만성질환·간질환`, 이력 n개, 여행지. 각 칩 클릭 → `editAnswer(id)`=해당 스텝 다시 `showStep`(값 유지, 수정 후 liveUpdate). `＋조건` 칩으로 남은 스텝/여행 추가 진입.
- [ ] **Step 5:** `renderAccuracy()` = answered 수 기반 미터(나이만=대략, 다 답하면 정확) + 문구. 여행은 opt-in(“＋ 여행 계획 추가” 버튼으로 travel 스텝 노출).
- [ ] **Step 6:** 초기 진입 시 `go('app')`에서 `stepIdx=0; answered.clear(); renderSummary(); showStep('age'); resultArea 숨김`.
- [ ] **Step 7:** 검증 — `node --check`, 페르소나 스모크 불변. 배포 후 수동: 나이만 입력→결과, 칩 답변→즉시 갱신, 요약칩 ✎ 수정→반영.
- [ ] **Step 8:** Commit `feat: 인터뷰형 진행(한 번에 하나·요약칩 수정·실시간 갱신·정확도)`

---

### Task 4: 프로필·자연어 재연결 + 정리

**Files:** Modify `index.html` (script: `applyForm/applyParsed/autofill/saveProfile`, `go`)

**Interfaces:** Consumes `renderSummary/liveUpdate/showStep`(Task3).

- [ ] **Step 1:** `applyForm(p)`·`applyParsed(p)` 끝에 `answered` 재계산(값 있는 스텝 표시) → `renderSummary()` → `liveUpdate()` → `showStep`을 첫 미답 스텝(또는 결과)으로. 프로필 로드/자동채우기 후 결과가 바로 보이게.
- [ ] **Step 2:** 프로필 바(`#profiles`)를 `#app` 상단(summaryBar 근처)에 유지. `saveProfile`·`renderProfiles`·`loadProfile`·`delProfile` 그대로 동작 확인(readForm은 DOM 그대로라 불변).
- [ ] **Step 3:** 과도기 `showResult()`/옛 버튼 잔재 제거, `#result`로의 `go('input'|'result')` 참조를 `go('app')`/스크롤로 정리.
- [ ] **Step 4:** 검증 — `node --check`, 프로필 저장→불러오기→결과 표시, NL 자동채우기(휴리스틱)→결과 표시. 페르소나 스모크 불변.
- [ ] **Step 5:** Commit `feat: 프로필·자연어 입력을 인터뷰 흐름에 연결`

---

### Task 5: 최종 검증 + 배포

**Files:** none(빌드 없음)

- [ ] **Step 1:** 전체 `node --check` + 페르소나 스모크(영유아/청소년/성인/노인/임신부/여행) 결과가 Task 전과 동일함을 표로 확인(회귀 0).
- [ ] **Step 2:** `git push origin main`, Pages 라이브 폴링(200) + 마커(`id="app"`, `summaryBar`, 나이 질문 문구) 확인.
- [ ] **Step 3:** 수동 시나리오: (a)나이만→즉시 결과 (b)질문 하나씩 노출 (c)칩 답변→실시간 갱신 (d)요약칩 ✎ 수정→반영 (e)여행 opt-in (f)프로필 저장/불러오기 (g)AI 설명 버튼 존재.
- [ ] **Step 4:** Commit(있으면) + 사용자 보고.

## Self-Review
- **Spec coverage:** §3 흐름=Task2·3, §4 원칙(한 번에 하나·결과고정·수정·정확도)=Task3, §5 상태=DOM-as-state(§6 허용), §6 분리=Task1, §7 순서=Task3 STEPS, §8 엣지=Task1(age 게이트)·Task3(skip/opt-in), §9 회귀=각 태스크 페르소나 스모크. 누락 없음.
- **Placeholder scan:** 구체 함수·id 명시, TBD 없음.
- **Type consistency:** `renderResultInPlace/liveUpdate/showStep/advance/skipStep/editAnswer/renderSummary/renderAccuracy` 명칭 태스크 간 일치.
