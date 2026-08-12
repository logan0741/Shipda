# Shipda 페이지별 기능 정리

앱의 실제 구현 화면 20개를 화면 단위로 정리합니다. [Shipda_기능명세서.md](Shipda_기능명세서.md)가 "무엇을 만들기로 했는지"를 담은 기획 문서라면, 이 문서는 **"지금 코드가 실제로 어떻게 동작하는지"**를 화면별로 담습니다. 새로 합류하는 사람이 화면 하나를 고치기 전에 훑어보는 용도입니다.

- 각 화면의 소스: `app/src/screens/*.tsx`
- API 계약: [API.md](API.md)
- 라우트 이름과 파라미터 원본: [app/src/navigation/types.ts](app/src/navigation/types.ts)

---

## 목차

| 구분 | 화면 |
|---|---|
| 등록 플로우 (12) | 상품 정보 입력 · 운송장 준비 · 박스 촬영 · 체적 결과 · 체적 직접입력 · 모서리 보정 · 표시사항 촬영 · 성분 결과 · 성분 직접입력 · HS Code 결과 · 사전심사 안내 · 등록 내용 확인 |
| 공동물류 플로우 (3) | 집하 안내 · 혼재 대기 현황 · 출고·정산 |
| 탭 / 조회 (5) | 홈 · 분석 이력 · 설정 · 상세 조회 · 운영자 지도 |

---

## 네비게이션 구조

```
RootStack (헤더 없음, 공통 배경색)
├── Tabs (하단 탭 3개 — 항상 노출)
│   ├── HomeTab      → HomeScreen
│   ├── HistoryTab   → HistoryScreen
│   └── SettingsTab  → SettingsScreen
│
├── 등록 플로우 (Tabs 밖의 풀스크린 스택)
│   ProductInfo → Waybill → BoxCapture → CbmResult ⇄ CbmManual
│                                      ↳ CornerAdjust
│              → LabelCapture → IngredientResult ⇄ IngredientManual
│                             → HsCodeResult → PreReviewGuide (모달)
│                                            → Summary
│
├── 공동물류 플로우
│   Summary → Pickup → Consolidation → Shipment → (Tabs로 리셋)
│
└── 조회 / 부가
    Detail(productId)   ← 홈 카드, 이력 카드에서 진입
    Admin                ← 설정 화면 숨김 메뉴에서 진입
```

화물의 진행 상태는 화면이 아니라 `FlowContext`(등록 진행 중) 하나에 모여 있습니다. 화면을 이동해도 사진·치수·판정결과가 유지되는 이유이자, **앱을 완전히 종료하면 등록 중이던 내용이 날아가는** 이유이기도 합니다(서버에 저장된 부분만 남습니다).

상단 진행바(`StepBar`)는 등록 플로우 12개 화면 중 8개에 노출됩니다: 상품(0) → 운송장(1) → 체적(2) → 성분(3) → HS Code(4) → 완료(5). 카메라 화면(박스 촬영, 표시사항 촬영)과 모서리 보정, 사전심사 안내에는 없습니다.

---

# 1부 — 등록 플로우

## 1.1 상품 정보 입력 — `ProductInfoScreen`

| | |
|---|---|
| 파일 | `app/src/screens/ProductInfoScreen.tsx` |
| 라우트 | `ProductInfo` |
| 진입 | 홈 화면 "시작하기" 버튼 |
| StepBar | 0 (상품) |

**목적**: 신규 화물 등록의 최소 입력. 상품명 하나만 필수입니다.

**화면 구성**
- 상품명 텍스트 입력 (자동 포커스)
- 수출 희망국 칩 5개 (일본·중국·미국·베트남·대만 중 선택, 기본값 일본)
- 자주 쓰는 품목 칩 6개 — 누르면 상품명 입력창에 그대로 채워짐

**사용자 액션**

| 액션 | 결과 |
|---|---|
| 상품명 공백으로 [다음] | 인라인 에러 "상품명을 입력해주세요" |
| [다음] | `api.createProduct()` 호출 → 성공 시 `FlowContext.start()`로 새 등록 시작 → Waybill로 이동 |

**API**: `POST /product/create`

**주고받는 상태**: `FlowContext`를 이 화면에서 **초기화**합니다(`start()`). 여기서 받은 `product_id`가 이후 모든 화면의 기준이 됩니다.

---

## 1.2 운송장 준비 — `WaybillScreen`

| | |
|---|---|
| 파일 | `app/src/screens/WaybillScreen.tsx` |
| 라우트 | `Waybill` |
| 진입 | 상품 정보 입력 → [다음] |
| StepBar | 1 (운송장) |

**목적**: CBM 측정의 기준자 역할을 하는 마커(운송장)를 발급하고 출력 안내.

**화면 구성**
- 마커 미리보기 (6×6 비트 패턴을 SVG로 직접 렌더링, `MarkerView` 컴포넌트)
- "왜 운송장을 붙이나요?" 설명 카드
- 3단계 안내: 실제 크기로 출력 → 박스 윗면에 부착 → 접히거나 가려지지 않게

**사용자 액션**

| 액션 | 결과 |
|---|---|
| [운송장 출력하기] | `expo-print`로 시스템 인쇄 대화상자 호출. 프린터가 없으면 "PDF로 저장한 뒤 출력해도 됩니다" 안내 |
| [다음 : 박스 촬영] | BoxCapture로 이동 (인쇄 여부와 무관하게 진행 가능) |

**API**: `GET /product/{id}/marker` — 화면 진입 시 자동 호출, `FlowContext.marker`가 이미 있으면 재요청하지 않음

**주의**: 인쇄 취소도 예외로 잡히므로(`catch`), 사용자가 대화상자를 닫기만 해도 실패 알림이 뜹니다. 실제 인쇄 실패와 구분되지 않습니다.

---

## 1.3 박스 촬영 — `BoxCaptureScreen`

| | |
|---|---|
| 파일 | `app/src/screens/BoxCaptureScreen.tsx` |
| 라우트 | `BoxCapture` |
| 진입 | 운송장 준비 → [다음], 또는 체적 결과 화면 [다시 촬영] |
| StepBar | 없음 (전체화면 카메라) |

**목적**: 박스 사진 한 장으로 치수·체적을 측정. 실시간 카메라 뷰 위에 UI를 얹은 전체화면 구성입니다.

**화면 구성**
- `CameraView` 전체화면 (뒷면 카메라)
- 각도 게이지(`AngleGauge`) — 기기 기울기를 원형 다이얼로 표시, 60~70도 범위를 초록 구간으로 표기
- 촬영 프레임(`CaptureFrame`) — 각도가 맞으면 초록 테두리 + "각도 맞음" 뱃지
- 하단: 직접 입력 버튼 / 셔터 / (빈 자리)

**핵심 로직 — 각도 판정**

`expo-sensors`의 `DeviceMotion`을 120ms 간격으로 구독해 중력 벡터에서 기울기를 계산합니다.

```
tilt = asin(-z / |g|) × 180/π
```

`z` 부호를 반전시킨 이유: 카메라가 바닥을 향할 때 중력의 z 성분이 음수로 들어오기 때문입니다. 반전하지 않으면 "내려다볼수록 각도가 낮아지는" 반대 결과가 나옵니다. 이 부호는 실기기로 검증되지 않은 상태입니다 — [HANDOVER.md](HANDOVER.md) 5.2절 참고.

셔터는 `enforceAngle`(설정에서 끌 수 있음)이 꺼져 있거나 각도가 60~70도 범위(`ANGLE_MIN`~`ANGLE_MAX`, `components/AngleGauge.tsx`)에 있을 때만 활성화됩니다.

**사용자 액션**

| 액션 | 결과 |
|---|---|
| [직접 입력] (측면 버튼) | CbmManual로 즉시 이동, 촬영하지 않음 |
| [셔터] | 촬영 → 분석 중 화면(`Analyzing`) → `predictCbm` 호출 |

**분기**

| 서버 응답 | 처리 |
|---|---|
| `success: true` | `dimensions` 저장 → CbmResult로 `replace` |
| `action: "manual_corners"` | CornerAdjust로 `replace` (모서리 가림) |
| 그 외 실패 | 하단에 경고 배너 표시, 같은 화면에 머무름. `attempts >= 3`이면 "직접 입력하기" 문구 강조 |

**API**: `POST /product/{id}/cbm/predict` — `image`, `device_angle`(측정된 각도, 없으면 65 기본값), `force_error`(설정의 강제 오류 주입값)

**주고받는 상태**: `boxPhotoUri`, `boxOverlay`를 `FlowContext`에 저장(성공 실패 무관하게 사진은 저장).

> **참고**: 이 화면은 한때 서버 OpenCV로 실시간 상자 윤곽을 검출해 셔터 게이팅에 추가하는 기능이 있었으나 실물 환경에서 정확도 부족으로 철회했습니다. 현재는 각도 조건만 사용합니다.

---

## 1.4 체적 측정 결과 — `CbmResultScreen`

| | |
|---|---|
| 파일 | `app/src/screens/CbmResultScreen.tsx` |
| 라우트 | `CbmResult` |
| 진입 | 박스 촬영 성공, 또는 모서리 보정 완료 |
| StepBar | 2 (체적) |

**목적**: AI가 산출한 치수·체적을 확인하고, 사진으로는 잴 수 없는 무게를 추가 입력받아 확정.

**화면 구성**
- 촬영 사진 미리보기 + 마커/박스 윤곽 오버레이(`BoxOverlay`, `boxOverlay` 좌표 기반 SVG)
- "마커 인식됨" 뱃지
- 가로·세로·높이 3분할 표시
- 계산된 체적(CBM) 큰 숫자
- 무게 입력 (필수, 소수 가능)

**사용자 액션**

| 액션 | 결과 |
|---|---|
| 무게 미입력으로 [확인] | 인라인 에러 |
| [다시 촬영] | BoxCapture로 `replace` |
| [확인] | `confirmCbm` 호출(`input_method: "ai"` 고정) → 성공 시 LabelCapture로 이동 |

**API**: `POST /product/{id}/cbm/confirm`

**주고받는 상태**: 진입 시 `FlowContext.dimensions`가 없으면(직접 URL 접근 등 비정상 경로) 에러 배너만 표시하고 아무 것도 하지 않습니다 — 뒤로가기 외 탈출구가 없다는 점에 주의.

---

## 1.5 체적 직접 입력 — `CbmManualScreen`

| | |
|---|---|
| 파일 | `app/src/screens/CbmManualScreen.tsx` |
| 라우트 | `CbmManual` (파라미터 `{ reason?: string }`) |
| 진입 | 박스 촬영 화면의 [직접 입력], 체적 측정 실패 배너의 [직접 입력하기], 카메라 권한 거부 화면 |
| StepBar | 2 (체적) |

**목적**: AI 측정을 건너뛰고 줄자로 잰 값을 직접 입력. 가로·세로·높이 입력 즉시 체적을 실시간 계산해 미리 보여줍니다.

**화면 구성**
- `route.params.reason`이 있으면 "사진으로 측정하지 못했어요" 경고 배너(실패 사유 포함), 없으면 일반 안내 배너
- 가로/세로/높이/무게 입력 4개
- 계산된 체적 카드(네이비 톤)

**사용자 액션**: 4개 필드가 모두 양수로 채워져야 [저장하고 계속] 활성화. `api.manualCbm()` 호출 → 성공 시 LabelCapture로 이동.

**API**: `POST /product/{id}/cbm/manual` — `input_method: "manual"`로 고정 저장됨

---

## 1.6 모서리 직접 지정 — `CornerAdjustScreen`

| | |
|---|---|
| 파일 | `app/src/screens/CornerAdjustScreen.tsx` |
| 라우트 | `CornerAdjust` |
| 진입 | 박스 촬영에서 `action: "manual_corners"` (모서리 가림) |
| StepBar | 없음 |

**목적**: 박스 모서리 일부가 가려져 자동 인식이 실패했을 때, 사용자가 손가락으로 네 모서리를 직접 지정해 재계산.

**화면 구성**
- 촬영된 사진 위에 `PanResponder` 기반 드래그 가능한 핸들 4개(①②③④, 시계 방향)
- 핸들 위치를 잇는 반투명 사각형 오버레이(SVG `Polygon`)
- 초기 위치는 서버의 `DEMO_OVERLAY.box_top` 좌표

**사용자 액션**

| 액션 | 결과 |
|---|---|
| 핸들 드래그 | 실시간으로 사각형 갱신 (0.02~0.98 범위로 클램프) |
| [처음 위치로] | 초기 좌표로 리셋 |
| [이 모서리로 계산] | `predictCbm` 재호출 → 성공 시 CbmResult로 `replace` |

**API**: `POST /product/{id}/cbm/predict`

> **수정 이력 (2026-08-12)**: 재계산 호출의 `device_angle`이 `35`로 하드코딩되어 있었습니다. 서버의 각도 검증 기준이 이전에 30도에서 60도로 상향되었을 때(체적 측정 각도 정책 변경) 이 호출부가 갱신되지 않아, **모서리를 아무리 정확히 맞춰도 항상 `angle_invalid`로 실패하는 상태**였습니다. `ANGLE_MIN`~`ANGLE_MAX`의 중간값(`BoxCaptureScreen`과 동일한 폴백 패턴)을 넘기도록 고쳤습니다.

---

## 1.7 표시사항 촬영 — `LabelCaptureScreen`

| | |
|---|---|
| 파일 | `app/src/screens/LabelCaptureScreen.tsx` |
| 라우트 | `LabelCapture` |
| 진입 | 체적 확정 완료 (AI 측정 또는 직접 입력 모두 이 화면으로 합류) |
| StepBar | 없음 (전체화면 카메라) |

**목적**: 포장 뒷면의 원재료·함량 표시사항을 촬영해 HS Code 판정의 입력으로 사용.

**화면 구성**
- `CameraView` 전체화면
- 점선 가이드 프레임("표시사항 전체가 네모 안에 들어오게")
- 각도 게이팅 없음 — 박스 촬영과 달리 셔터가 항상 활성화

**사용자 액션**

| 액션 | 결과 |
|---|---|
| [직접 입력] | IngredientManual로 즉시 이동 |
| [셔터] | 촬영 → 분석 중 화면 → `predictHsCode` 호출 |

**분기**

| 서버 응답 | 처리 |
|---|---|
| `success: false` 또는 `action: "manual_input"` | IngredientManual로 `replace` (표시사항 인식 실패 경로) |
| `hscode_result` 있음 | `FlowContext.hs`에 저장 → IngredientResult로 `replace` |

**API**: `POST /product/{id}/hscode/predict` — `image`, `force_error`(설정의 `hsForceError`)

---

## 1.8 표시사항 확인 — `IngredientResultScreen`

| | |
|---|---|
| 파일 | `app/src/screens/IngredientResultScreen.tsx` |
| 라우트 | `IngredientResult` |
| 진입 | 표시사항 촬영 성공 |
| StepBar | 3 (성분) |

**목적**: AI가 읽은 원재료·함량·식품유형·보관방법을 확인하고, 틀린 부분을 인라인으로 고칠 수 있는 화면.

**화면 구성**
- 원재료 함량 없는 항목이 있으면 경고 배너
- 제품명 / 식품유형 / 보관방법 카드 — 평시엔 읽기 전용, [수정] 누르면 편집 모드
- 편집 모드: 식품유형 텍스트 입력, 보관방법 세그먼트(상온/냉장/냉동)
- 원재료 리스트 — 편집 모드에서 이름·함량 인라인 입력, 삭제(✕), 추가 가능
- 함량 합계 표시(100%가 아니면 주황색 경고 텍스트)

**사용자 액션**

| 액션 | 결과 |
|---|---|
| 헤더 우측 연필 아이콘 또는 [수정] | 편집 모드 진입 |
| [취소] | 원래 값으로 되돌리고 편집 모드 종료 (서버 호출 없음) |
| [수정 내용 저장] | `reviseHsCode` 호출 → 응답으로 HS Code **재판정**됨 |
| [확인 : HS Code 판정] | 편집 없이 바로 HsCodeResult로 이동 |

**API**: `POST /product/{id}/hscode/revise` — 수정한 원재료로 HS Code를 다시 계산합니다. 함량이 `null`인 항목이 하나라도 있으면 판정 상태가 자동 강등됩니다.

**주의**: "수정 내용 저장"은 화면 이동 없이 같은 화면에 머물며 편집 모드만 닫습니다. 다음 화면으로 가려면 별도로 [확인 : HS Code 판정]을 눌러야 합니다.

---

## 1.9 원재료 직접 입력 — `IngredientManualScreen`

| | |
|---|---|
| 파일 | `app/src/screens/IngredientManualScreen.tsx` |
| 라우트 | `IngredientManual` |
| 진입 | 표시사항 촬영의 [직접 입력], 또는 인식 실패 자동 전환 |
| StepBar | 3 (성분) |

**목적**: AI 인식을 거치지 않고 원재료·함량·식품유형·보관방법을 처음부터 입력.

**화면 구성**
- 경고 배너 "직접 입력한 내용은 자동 판정하지 않고 '검토 필요'로 저장됩니다"
- 원재료 행 2개로 시작(추가/삭제 가능), 이름+함량(%) 입력
- 함량 합계 실시간 표시 — **100% ±0.5 오차 이내**여야 저장 가능
- 식품유형 텍스트, 보관방법 세그먼트(기본값 냉동)

**사용자 액션**: 이름 있는 행이 1개 이상, 식품유형 비어있지 않음, 함량 합계 100%에 가까움 — 세 조건을 모두 만족해야 [저장하고 계속] 활성화.

**API**: `POST /product/{id}/hscode/manual` → 응답은 **항상** `status: "review_required"`, `hs_code: null`. 저장 후 HsCodeResult로 `replace`.

---

## 1.10 HS Code 판정 — `HsCodeResultScreen`

| | |
|---|---|
| 파일 | `app/src/screens/HsCodeResultScreen.tsx` |
| 라우트 | `HsCodeResult` |
| 진입 | 성분 결과 확인 완료, 또는 성분 직접 입력 완료 |
| StepBar | 4 (HS Code) |

**목적**: 최종 HS Code와 판정 근거를 제시하고, 저신뢰도일 때 대안을 제공하는 이 플로우의 핵심 화면.

**화면 구성**
- 신뢰도 50% 미만이면 위험 배너("신뢰도가 낮아요")
- 직접 입력으로 `hs_code`가 없는 경우 경고 배너
- `HsCodeDisplay` — 코드를 4자리(heading)·2자리(subheading)·4자리(national)로 나눠 표시 + 판정 상태 뱃지 + 신뢰도
- 판정 근거 텍스트 + 상태별 색상의 보충 설명(`review_note`)
- 차순위 후보 리스트(있는 경우) — 각 항목에 코드·품명·신뢰도

**사용자 액션**

| 액션 | 결과 |
|---|---|
| 차순위 후보 탭 | `selectHsCode` 호출 → 성공 시 현재 화면의 결과가 그 코드로 교체됨(이동 없음). 선택한 코드는 `input_method: "manual"`, 상태는 `review_required`로 강제 전환 |
| [관세청 품목분류 사전심사 신청 안내] | `status !== "approved"`일 때만 노출. PreReviewGuide로 이동 |
| [사진 다시 촬영] | 저신뢰도일 때만 노출. LabelCapture로 이동 |
| [이 코드로 진행] | Summary로 이동 |

**API**: `POST /product/{id}/hscode/select`

---

## 1.11 사전심사 신청 안내 — `PreReviewGuideScreen`

| | |
|---|---|
| 파일 | `app/src/screens/PreReviewGuideScreen.tsx` |
| 라우트 | `PreReviewGuide` (모달 프레젠테이션) |
| 진입 | HS Code 판정 화면의 [사전심사 신청 안내] |
| StepBar | 없음 |

**목적**: 관세청 품목분류 사전심사 절차를 안내하는 순수 정보성 화면. 서버 API를 호출하지 않습니다.

**화면 구성**
- 안내 문구(잘못된 코드 신고 시 리스크)
- 신청 대상 코드 카드 (`FlowContext.hs`에서 읽음)
- 3단계 절차 카드: 신청서 작성 → 견본 제출 → 심사 결과 회신(30일 이내)
- 각주: "실제 신청 요건은 관세청 공지를 따름" (시연용 요약 고지)

**사용자 액션**: [관세법령정보포털 열기] — `Linking.openURL()`로 외부 브라우저 이동(`unipass.customs.go.kr`). [확인] — 뒤로가기.

---

## 1.12 등록 내용 확인 — `SummaryScreen`

| | |
|---|---|
| 파일 | `app/src/screens/SummaryScreen.tsx` |
| 라우트 | `Summary` |
| 진입 | HS Code 판정 화면의 [이 코드로 진행] |
| StepBar | 5 (완료) |

**목적**: HS Code와 체적 결과를 한 화면에 모아 최종 확인. 등록 플로우의 마지막 단계이자 공동물류 플로우의 시작점.

**화면 구성**
- 네이비 히어로 카드 — 상품명, 수출 희망국
- HS Code 섹션 — 코드·상태 뱃지·판정 근거·식품유형·보관, [수정하러 가기] → LabelCapture로 이동
- 체적 섹션 — CBM 값·치수·무게, 수동 입력이면 "직접 입력" 태그, [수정하러 가기] → BoxCapture로 이동
- 출발지 카드(담양 → 권역 공동물류 고정 문구)

**사용자 액션**: [공동물류 신청] — `applyLogistics` 호출. 이 시점에 화물의 `status`가 `completed`로 전환되고 집하 배정이 저장됩니다.

**API**: `POST /product/{id}/logistics/apply` → 성공 시 Pickup으로 이동

---

# 2부 — 공동물류 플로우

## 2.1 집하 안내 — `PickupScreen`

| | |
|---|---|
| 파일 | `app/src/screens/PickupScreen.tsx` |
| 라우트 | `Pickup` |
| 진입 | 등록 내용 확인 화면의 [공동물류 신청], 또는 화물 상세 조회의 [수출 절차 보기] |

**목적**: 공동물류 신청 시 배정된 집하소·차량·일시를 안내.

**화면 구성**
- 히어로 카드 — 집하 예정일·시간대
- 권역·차량·동반 화물 건수
- **간이 지도**(`PickupMap`, SVG 자체 구현) — 출발지(주황 원)와 집하소(네이비 사각형)를 점선으로 연결. 위경도를 캔버스 좌표로 정규화 투영(사방 0.05도 여유). 외부 지도 API 없음
- 집하소 주소
- "어떻게 정해지나요?" 설명 카드

**API**: `GET /product/{id}/logistics/pickup` — 이미 신청된 화물은 신청 시점에 저장된 배정을 그대로 돌려받습니다(재조회해도 값이 바뀌지 않음).

**사용자 액션**: [혼재 대기 현황 보기] → Consolidation.

---

## 2.2 혼재 대기 현황 — `ConsolidationScreen`

| | |
|---|---|
| 파일 | `app/src/screens/ConsolidationScreen.tsx` |
| 라우트 | `Consolidation` |
| 진입 | 집하 안내 화면 |

**목적**: 컨테이너 적재율과 출고 시점 판단을 보여줌.

**화면 구성**
- 적재율 게이지(`LoadGauge`) — 적재된 CBM / 컨테이너 용량(20GP 33.2 CBM)
- 동반 화물 건수, 내 화물의 신선도 여유 칩(냉동=여유충분/녹색, 냉장=마감임박/주황, 상온=제한없음/중립)
- 판정 카드 — "출고" 또는 "대기", 판정 사유
- 신선도 설명 카드
- "출고 시점은 이렇게 정합니다" 안내

**API**: `GET /product/{id}/logistics/consolidation` — 화물의 `cbm_result.cbm`과 `hscode_result.storage_method`를 서버에 전달해 계산.

**사용자 액션**: [출고·정산 결과 보기] → Shipment.

---

## 2.3 출고 · 정산 — `ShipmentScreen`

| | |
|---|---|
| 파일 | `app/src/screens/ShipmentScreen.tsx` |
| 라우트 | `Shipment` |
| 진입 | 혼재 대기 현황 화면 |

**목적**: 등록 플로우 전체의 종착점. 출고 완료를 알리고 개별 발송 대비 절감액을 제시한 뒤 홈으로 복귀.

**화면 구성**
- 완료 히어로 — 체크 아이콘, "출고 완료", 상품명
- 컨테이너 종류·적재율, 선적항·선적일
- 물류비 비교 막대그래프 — 개별 LCL vs 공동물류
- 절감액 카드(금액 + 절감률)

**진입 시 자동 동작**: `api.shipment()` 조회와 **동시에** `api.finalize()`를 호출합니다(`.catch(() => undefined)`로 실패를 무시). Summary 단계에서 이미 `applyLogistics`로 `completed` 처리가 되어있어 사실상 중복 호출이지만, 방어적으로 한 번 더 확정합니다.

**API**: `GET /product/{id}/logistics/shipment`, `POST /product/{id}/finalize`

**사용자 액션**: [메인으로] — `FlowContext.reset()` + 네비게이션 스택을 `Tabs`로 완전히 리셋(`CommonActions.reset`). 뒤로가기로 정산 화면에 돌아올 수 없게 만드는 의도적 처리입니다.

---

# 3부 — 탭 / 조회

## 3.1 홈 — `HomeScreen`

| | |
|---|---|
| 파일 | `app/src/screens/HomeScreen.tsx` |
| 라우트 | `HomeTab` (탭) |

**목적**: 서비스 진입점. 새 등록 시작과 최근 등록 상품 확인.

**화면 구성**
- 네이비 히어로 — "쉽다 / 수출을 쉽고 빠르게"(상태바 이 화면에서만 밝은 글자로 전환)
- 시작 카드 — [시작하기] 버튼
- 최근 등록 상품 최대 5건, 카드형(상품명·날짜·HS Code·CBM·상태 칩)
- 목록이 5건 초과면 "전체 보기" → 이력 탭으로 이동

**동작**: 화면에 포커스될 때마다(`useFocusEffect`) 목록을 다시 불러옵니다 — 다른 화면에서 등록을 마치고 돌아오면 자동 갱신.

**API**: `GET /product/recent?limit=5`

**사용자 액션**: [시작하기] → `FlowContext.reset()` 후 ProductInfo로 이동. 카드 탭 → Detail로 이동.

---

## 3.2 분석 이력 — `HistoryScreen`

| | |
|---|---|
| 파일 | `app/src/screens/HistoryScreen.tsx` |
| 라우트 | `HistoryTab` (탭) |

**목적**: 등록한 화물 전체를 최신순으로 조회.

**화면 구성**: 카드형 리스트(상품명·날짜·목적국·HS Code·상태), 당겨서 새로고침, 20건씩 페이지네이션(더 보기 버튼).

**API**: `GET /product/history?page=&limit=20`

**사용자 액션**: 카드 탭 → Detail로 이동.

---

## 3.3 설정 — `SettingsScreen`

| | |
|---|---|
| 파일 | `app/src/screens/SettingsScreen.tsx` |
| 라우트 | `SettingsTab` (탭) |

**목적**: 일반 사용자용 설정 메뉴 4개 + **시연 전용 숨김 제어판**.

**화면 구성 (평시)**
- 프로필(사업자명 "전남 농원")
- 알림 설정 / 사업자 정보 관리 / 언어 설정 / 고객센터 — 4개 항목 전부 "시연 범위에 포함되지 않은 기능입니다" 알림만 뜨는 자리표시자

**시연 설정 (숨김)**: 프로필 영역을 **0.7초 길게 누르면** 열립니다.

| 항목 | 기능 |
|---|---|
| 촬영 각도 게이팅 | 끄면 60~70도 조건 없이 아무 각도에서나 촬영 |
| 체적 측정 강제 결과 | `marker_not_found` / `marker_too_small` / `angle_invalid` / `edge_occluded` 중 선택해 다음 CBM 촬영을 그 결과로 강제 |
| HS Code 판정 강제 결과 | `text_unreadable` / `ratio_missing` 강제 |
| 서버 주소 | 자동 감지된 API 주소를 직접 덮어쓰기, 자동 감지로 복원 가능 |
| 공동물류 운영 현황 | Admin 화면으로 이동 |

`SettingsContext`가 이 상태를 앱 전역에 들고 있고, 카메라 화면들이 `useSettings()`로 읽어 `force_error` 파라미터에 반영합니다.

---

## 3.4 화물 상세 조회 — `DetailScreen`

| | |
|---|---|
| 파일 | `app/src/screens/DetailScreen.tsx` |
| 라우트 | `Detail` (파라미터 `{ productId: string }`) |
| 진입 | 홈 카드, 이력 카드 |

**목적**: 특정 화물의 전체 판정·측정·물류 결과를 조회 전용으로 표시.

**화면 구성**
- 네이비 헤더 카드(상품명·상태 칩·출발지→목적국·등록일시)
- 신뢰도 60% 미만이면 경고/위험 배너
- HS Code 섹션 — 색상 박스에 코드·신뢰도 바, 판정 근거, 원재료 요약
- 차순위 후보 리스트(있으면)
- 체적 섹션
- 공동물류 신청 정보(신청됐으면)

**API**: `GET /product/{id}/summary`

**사용자 액션**: 공동물류가 이미 신청된 화물이면 [수출 절차 보기] 버튼이 하단에 노출됩니다. 이 버튼은 **`FlowContext`를 이 화물로 다시 채운 뒤**(`start()` + `patch()`) Pickup으로 이동합니다 — 등록 플로우 밖에서 진입했어도 물류 화면이 정상 동작하게 하기 위한 처리입니다.

---

## 3.5 운영자 지도 — `AdminScreen`

| | |
|---|---|
| 파일 | `app/src/screens/AdminScreen.tsx` |
| 라우트 | `Admin` |
| 진입 | 설정 화면의 숨김 메뉴 [공동물류 운영 현황] |

**목적**: 개별 화물이 아니라 **플랫폼 전체**의 공동물류 효과를 보여주는 운영자용 화면. 기능명세서 원문에는 없고 시연 시나리오(PDF)에서 추가된 화면입니다.

**화면 구성**
- 통계 3개 — 전통시장 수(92), 총 화물 건수, 필요 차량 대수
- 거점 구성 시나리오 탭(개별발송 / 단일거점 / 권역3분할)
- **`RegionMap`** — 광주·전남 지도. 위경도를 등장방형 투영하되 `cos(위도)`로 경도를 축소해 비율을 보정(집하 안내 화면의 간이 지도와 달리 이쪽은 시장 92곳을 흩뿌려야 해서 비율 정확도가 필요). 원 크기는 화물량, 색은 권역
- 선택한 시나리오의 총 이동거리·트럭 대수 하이라이트 카드
- 권역별 집하 현황 테이블
- 시나리오 비교 테이블(탭과 별개로 여기서도 전환 가능)

**API**: `GET /admin/overview`(진입 시 1회), `GET /admin/routes?scenario=`(시나리오 전환마다). `individual`(개별발송) 시나리오는 거점이 없어 경로 API를 호출하지 않습니다.

---

## 부록 — 화면이 공통으로 쓰는 것

- **`Screen` / `Body` / `Footer` / `AppHeader`** (`components/ui.tsx`) — 거의 모든 화면의 뼈대. `Footer`는 하단 안전영역과 키보드 표시 여부에 따라 패딩을 자동 조절합니다.
- **`FlowContext`** — 등록 진행 중인 화물 하나의 임시 상태(사진 URI, 치수, 판정 결과). 화면 이동 간 전달 수단이며 서버 저장과는 별개입니다.
- **`SettingsContext`** — 시연 제어 전역 상태.
- **`Analyzing`** — 사진 분석 중 로딩 화면(박스 촬영·표시사항 촬영·모서리 재계산에서 공용).
- **판정 상태 3색 매핑**(`theme.ts`의 `statusTheme()`) — `approved`/`pre_review_recommended`/`review_required` → 색상. 이 함수 하나만 거치면 앱 전체에서 색이 일관됩니다.
