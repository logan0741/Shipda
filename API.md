# Shipda API 설계

프론트엔드(Expo 앱)와 백엔드(FastAPI) 사이의 계약을 정의합니다. **AI는 별도 서비스로 분리되어 있지 않습니다** — 백엔드가 같은 프로세스에서 모델을 직접 불러 씁니다. 이 문서의 "AI 계층" 절에서 그 구조를 설명합니다.

- 서버 소스: [server/app/main.py](server/app/main.py)
- 프론트 타입 소스: [app/src/api/types.ts](app/src/api/types.ts), [app/src/api/client.ts](app/src/api/client.ts)
- 실행 중 대화형 문서: `http://<서버>:8000/docs` (FastAPI가 자동 생성하는 Swagger UI)

이 문서와 실제 코드가 어긋나면 **코드가 맞습니다.** 이 문서는 설계 의도와 전체 그림을 보여주기 위한 것이고, 정확한 필드 타입은 위 두 파일이 원본입니다.

---

## 1. 전체 구조

```
┌─────────────────┐        HTTP / multipart         ┌───────────────────────┐
│   Expo 앱         │ ──────────────────────────────▶ │   FastAPI 서버          │
│  (React Native)  │ ◀────────────────────────────── │ (server/app/main.py)  │
└─────────────────┘             JSON                 └───────────┬───────────┘
                                                                   │
                                                        ┌──────────┴───────────┐
                                                        │  app/store.py        │  화물 상태 CRUD
                                                        │  app/catalog_ai.py   │  HS Code 판정 (= AI 계층 진입점)
                                                        │  app/catalog.py      │  판정 상태 상수·코드 포맷
                                                        │  app/logistics.py    │  집하·혼재·출고·운영자 데이터
                                                        │  app/db.py           │  SQLite 영속화 + 로그
                                                        └─────┬────────────┬───┘
                                                              │            │
                                          ┌───────────────────┴──┐   ┌─────┴─────────────────┐
                                          │  shipda.db (SQLite)  │   │  model/               │
                                          └───────────────────────┘   │  품목 분류기·OCR·통칙  │
                                                                      │  관세율표 2,100행      │
                                                                      └───────────────────────┘
```

세 계층입니다.

1. **프론트엔드** — Expo 앱. 화면 20개, 서버 응답을 그대로 렌더링. 비즈니스 로직을 갖지 않습니다.
2. **백엔드** — FastAPI. 엔드포인트, 저장, 로그를 담당합니다.
3. **AI 계층** — 별도 서버가 아니라 **백엔드가 같은 프로세스에서 불러 쓰는 `model/` 패키지**입니다. 아래 [6절](#6-ai-계층-왜-별도-서비스가-아닌가)에서 자세히 설명합니다.

---

## 2. 공통 규약

### 2.1 기본

| 항목 | 값 |
|---|---|
| Base URL | `http://<서버 IP>:8000` |
| 인증 | 없음 (시연용, CORS `*` 전체 허용) |
| 요청 본문 | JSON (사진 업로드는 `multipart/form-data`) |
| 응답 본문 | JSON |
| 날짜 형식 | ISO 8601, KST(+09:00) 고정 — 예: `2026-08-12T14:20:00+09:00` |

### 2.2 리소스 식별자

모든 화물은 `product_id`(UUID v4 문자열)로 식별합니다. 경로에 `{product_id}`가 있는 엔드포인트는 먼저 존재 여부를 확인하고, 없으면 **404**를 돌려줍니다.

```json
{ "detail": "상품을 찾을 수 없습니다." }
```

### 2.3 판정 상태 3단계

HS Code 결과의 `status` 필드는 항상 아래 셋 중 하나입니다. 프론트엔드는 이 값만으로 뱃지 색을 결정합니다(서버가 색을 내려주지 않습니다).

| 값 | 의미 | 앱에서의 색 |
|---|---|---|
| `approved` | 신고 가능 | 녹색 |
| `pre_review_recommended` | 사전심사 권장 | 주황 |
| `review_required` | 검토 필요 | 빨강 |

### 2.4 입력 출처 (`input_method`)

HS Code·CBM 결과 모두 `input_method: "ai" | "manual"`을 포함합니다. AI 자동 판정 결과인지 사용자가 직접 입력했는지 구분하기 위함입니다.

### 2.5 표준 오류 형태

| 상태 코드 | 상황 |
|---|---|
| `404` | `product_id`가 존재하지 않음 |
| `409` | 아직 없는 결과를 다음 단계에서 요구 (예: HS Code 판정 전 후보 선택 시도) |
| `422` | 요청 검증 실패 (Pydantic) — 상품명 공백, 필수 필드 누락 등 |

```json
{ "detail": "사람이 읽을 수 있는 한국어 메시지" }
```

### 2.6 예외 시뮬레이션 (`force_error`)

사진을 받는 두 엔드포인트(`cbm/predict`, `hscode/predict`)는 `force_error` 폼 필드로 실패 상황을 의도적으로 재현할 수 있습니다. 시연 중 "AI가 실패하면 어떻게 되는지"를 원하는 타이밍에 보여주기 위한 장치입니다. 값 목록은 `GET /demo/scenarios`가 내려줍니다.

---

## 3. 백엔드 API 전체 목록

### 3.1 상품 등록

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/health` | 헬스체크 |
| `GET` | `/product/recent?limit=5` | 홈 화면 최근 등록 목록 |
| `GET` | `/product/history?page=1&limit=20` | 이력 화면 페이지네이션 목록 |
| `POST` | `/product/create` | 신규 화물 등록 |

**`POST /product/create`**

```json
// 요청
{ "product_name": "담양 떡갈비 (냉동 밀키트)", "destination_country": "일본" }

// 응답 201
{
  "product_id": "682d34a3-2f86-4e06-8a32-094ee5c9ea8c",
  "product_name": "담양 떡갈비 (냉동 밀키트)",
  "destination_country": "일본",
  "created_at": "2026-08-12T09:10:00+09:00"
}
```

`product_name`이 공백뿐이면 `422`.

**`GET /product/recent`, `GET /product/history` 공통 응답**

```json
{
  "items": [
    {
      "product_id": "...",
      "product_name": "담양 떡갈비 (냉동 밀키트)",
      "destination_country": "일본",
      "hs_code": "1602.50-9000",
      "hs_status": "pre_review_recommended",
      "cbm": 0.108,
      "status": "in_progress",
      "created_at": "..."
    }
  ],
  "total_count": 10
}
```

`status`는 화물의 진행 단계입니다: `draft`(생성 직후) → `in_progress`(측정·판정 진행 중) → `completed`(등록 확정 또는 공동물류 신청).

---

### 3.2 운송장 / 마커

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/product/{id}/marker` | CBM 측정용 기준자 마커 발급 |

```json
{
  "marker_id": "682D34A3",
  "marker_size_mm": 50,
  "pattern": [[1,1,1,1,1,1], [1,0,1,0,1,1], ...],
  "waybill": {
    "product_name": "담양 떡갈비 (냉동 밀키트)",
    "destination_country": "일본",
    "origin": "담양",
    "issued_at": "...",
    "tracking_no": "SHD-682D-34A3"
  },
  "marker_image_url": "/product/{id}/marker.svg"
}
```

`pattern`은 6×6 이진 그리드입니다. `product_id`의 SHA-256 해시에서 결정적으로 생성되므로 **같은 화물은 항상 같은 패턴**이 나옵니다. 바깥 테두리는 항상 1(검출용 쿼드), 좌상단 내부는 항상 0, 우하단 내부는 항상 1(방향 판별 기준점)입니다. 앱은 이 비트 배열을 직접 SVG로 렌더링합니다 — `marker_image_url`은 기능명세서 호환용 필드일 뿐 실제로 쓰이지 않습니다.

---

### 3.3 체적(CBM) 측정

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/product/{id}/cbm/predict` | 박스 사진 → 치수·체적 산출 |
| `POST` | `/product/{id}/cbm/manual` | 치수 직접 입력 → 체적 자동 계산 |
| `POST` | `/product/{id}/cbm/confirm` | 무게까지 포함해 최종 확정 저장 |

**`POST /product/{id}/cbm/predict`** — `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | Y | 박스 사진 (서버는 받기만 하고 저장하지 않음) |
| `device_angle` | float | N (기본 65.0) | 촬영 시 기기 기울기(도). 60 미만이면 자동으로 `angle_invalid` 처리 |
| `force_error` | string | N | `marker_not_found` \| `marker_too_small` \| `angle_invalid` \| `edge_occluded` |

```json
// 실패 응답
{
  "success": false,
  "dimensions": null,
  "cbm": null,
  "error_reason": "angle_invalid",
  "message": "조금 더 위에서 찍어주세요",
  "guidance": "각도가 60도보다 낮으면 박스 윗면이 눌려 가로·세로가 부정확해집니다.",
  "action": "retake",
  "attempts": 1,
  "suggest_manual": false
}
```

`attempts`는 화물별 누적 실패 횟수이고, **3회 이상 실패하면 `suggest_manual: true`**가 되어 앱이 직접 입력 버튼을 강조 표시합니다. `edge_occluded`는 `action: "manual_corners"`로 내려가 모서리 직접 지정 화면으로 분기합니다.

```json
// 성공 응답
{
  "success": true,
  "dimensions": { "width_mm": 600, "depth_mm": 450, "height_mm": 400 },
  "cbm": 0.108,
  "error_reason": null,
  "action": "confirm",
  "attempts": 0,
  "suggest_manual": false,
  "device_angle": 65,
  "overlay": {
    "marker": [[0.44,0.38], [0.6,0.365], [0.63,0.425], [0.465,0.44]],
    "box_top": [[0.28,0.34], [0.72,0.30], [0.84,0.46], [0.36,0.52]],
    "box_bottom": [[0.28,0.60], [0.72,0.56], [0.84,0.72], [0.36,0.78]]
  }
}
```

`overlay`는 0~1 정규화 좌표의 사각형 4점씩(마커·박스 윗면·박스 아랫면) — 앱이 촬영 이미지 위에 윤곽선을 그리는 데 씁니다. `cbm = width_mm × depth_mm × height_mm / 1,000,000,000`으로 계산됩니다.

**`POST /product/{id}/cbm/manual`**

```json
// 요청
{ "width_mm": 500, "depth_mm": 400, "height_mm": 350, "weight_kg": 10 }

// 응답
{ "cbm": 0.07, "cbm_result": { "width_mm": 500, ..., "input_method": "manual" } }
```

**`POST /product/{id}/cbm/confirm`** — AI 예측 또는 수동 입력 후 무게까지 포함해 최종 저장합니다. `input_method`를 명시적으로 넘겨 출처를 남깁니다.

```json
// 요청
{ "width_mm": 600, "depth_mm": 450, "height_mm": 400, "weight_kg": 12.5, "input_method": "ai" }

// 응답
{ "cbm_result": { "width_mm": 600, "depth_mm": 450, "height_mm": 400, "cbm": 0.108, "weight_kg": 12.5, "input_method": "ai" } }
```

---

### 3.4 HS Code 판정

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/product/{id}/hscode/predict` | 표시사항 사진 → HS Code 판정 |
| `POST` | `/product/{id}/hscode/manual` | 원재료 직접 입력 (AI 판정 없이 저장) |
| `POST` | `/product/{id}/hscode/revise` | 인식 결과를 고친 뒤 재판정 |
| `POST` | `/product/{id}/hscode/select` | 차순위 후보 중 하나를 직접 선택 |

**`POST /product/{id}/hscode/predict`** — `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `image` | file | Y | 원물 사진 또는 표시사항 사진 (`kind`에 따라 다름) |
| `kind` | string | N | `fresh` \| `processed`. 앱 등록 화면에서 고른 화물 종류 |
| `force_error` | string | N | `text_unreadable` \| `ratio_missing` |

**`kind`가 사진 처리 경로를 정합니다.** 모르는 값이나 누락은 `auto`로 처리합니다(422를 내지 않습니다).

| 값 | 서버 동작 |
|---|---|
| `fresh` | OCR을 돌리지 않고 품목 분류기에만 넣습니다. 원물에는 표시사항이 없고, 배경 글자를 잘못 읽어 가공식품으로 새는 것을 막습니다 |
| `processed` | 사진을 OCR에 넣어 표시사항(원재료·함량)을 읽고 HS 통칙을 적용합니다 |
| `auto` | 글자를 먼저 읽어보고 표시사항이면 가공식품, 아니면 원물로 판단합니다 |

```json
// 성공 응답
{
  "success": true,
  "action": "confirm",
  "product_label": "담양 떡갈비",
  "ingredients": [
    { "name": "쇠고기", "ratio": 55.0 },
    { "name": "돼지고기", "ratio": 25.0 }
  ],
  "food_type": "식육가공품 (분쇄가공육제품)",
  "storage_method": "냉동",
  "hscode_result": {
    "hs_code": "1602509000",
    "hs_code_formatted": "1602.50-9000",
    "hs_code_parts": { "heading": "1602", "subheading": "50", "national": "9000" },
    "status": "pre_review_recommended",
    "confidence": 0.72,
    "reasoning": "HS 제16류 주1 — 육류 함량 80%가 20%를 초과하므로 제16류(육류 조제품)로 분류함",
    "review_note": "관세율표에서 이 코드의 품명이 '기타'라 문언만으로 확정할 근거가 약함",
    "ingredients": [ ... ],
    "food_type": "식육가공품 (분쇄가공육제품)",
    "storage_method": "냉동",
    "label": "담양 떡갈비",
    "alternatives": [
      { "hs_code": "1602501000", "hs_code_formatted": "1602.50-1000", "name": "밀폐용기에 넣은 것", "confidence": 0.18 }
    ],
    "input_method": "ai"
  }
}
```

**원물(`kind=fresh`)의 응답도 형태가 같습니다.** 다만 `ingredients`는 품목 자신 한 줄(`[{"name": "딸기", "ratio": 100.0}]`)이고, `alternatives`에는 차순위 코드가 아니라 **상태별 후보**가 옵니다. 신선 딸기와 냉동 딸기는 같은 사진이지만 세번이 다르므로(0810.10 / 0811.10), 사진으로 정할 수 없는 상태를 사용자가 `POST /hscode/select`로 고르게 하는 구조입니다.

```json
"alternatives": [
  { "hs_code": "0811100000", "name": "냉동 — 초본류 딸기", "confidence": 0.0 },
  { "hs_code": "0813409000", "name": "건조 — 기타", "confidence": 0.0 }
]
```

**판정하지 못하면 코드를 지어내지 않습니다.** 관세율표에서 세번을 특정하지 못하면 `hs_code: null`로 내리고 앱을 직접 입력 화면으로 보냅니다. 잘못된 세번으로 신고하면 통관이 거부되어 화물이 폐기되므로, 확신에 찬 오답이 가장 위험합니다.

```json
{
  "success": false,
  "error_reason": "not_classified",
  "message": "품목을 자동으로 판정하지 못했습니다.",
  "guidance": "자동 판정하지 못했습니다. ... 원재료를 직접 입력하거나 관세청 품목분류 사전심사를 신청하세요.",
  "action": "manual_input",
  "hscode_result": { "hs_code": null, "status": "review_required", ... }
}
```

`force_error=text_unreadable`이면 `hscode_result: null`과 함께 `action: "manual_input"`을 내려 앱이 직접 입력 화면으로 자동 전환하게 합니다. `force_error=ratio_missing`이면 판정은 하되 각 재료의 `ratio`를 `null`로 비우고, 아래 규칙에 따라 상태를 강등합니다.

> **예외 규칙**: 원재료 함량 정보가 없으면 원래 `approved`였어도 `pre_review_recommended`로 강제 강등하고 `review_note`에 사유를 채웁니다. (기능명세서 3.3)

**`POST /product/{id}/hscode/manual`**

```json
// 요청
{
  "ingredients": [{ "name": "고추", "ratio": 60 }, { "name": "소금", "ratio": 40 }],
  "food_type": "양념류",
  "storage_method": "상온"
}

// 응답
{
  "hscode_result": {
    "hs_code": null,
    "status": "review_required",
    "confidence": null,
    "reasoning": "사용자 직접 입력 - AI 판정 미수행",
    "input_method": "manual",
    ...
  }
}
```

**항상 `review_required`로 고정됩니다.** AI 판정을 거치지 않았기 때문입니다.

**`POST /product/{id}/hscode/revise`** — 화면에서 인라인으로 표시사항을 고친 뒤 같은 상품명으로 재판정합니다. 요청 형태는 `manual`과 같고, 응답은 `predict`와 같은 `hscode_result`를 돌려줍니다.

**`POST /product/{id}/hscode/select`** — 차순위 후보 리스트 중 하나를 사용자가 직접 골랐을 때. 판정 결과가 아직 없으면 `409`, 후보 목록에 없는 코드면 `422`.

```json
// 요청
{ "hs_code": "1602501000" }

// 응답 — status는 review_required로 강제 전환됨
{ "hscode_result": { "hs_code": "1602501000", "status": "review_required", "input_method": "manual", "reasoning": "사용자가 차순위 후보(밀폐용기에 넣은 것)를 직접 선택함", ... } }
```

---

### 3.5 결과 요약 / 확정

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/product/{id}/summary` | HS Code + CBM 통합 결과 |
| `POST` | `/product/{id}/finalize` | 등록 확정 |

```json
// GET summary
{
  "product_id": "...",
  "product_name": "...",
  "destination_country": "일본",
  "origin": "담양",
  "status": "in_progress",
  "created_at": "...",
  "finalized_at": null,
  "hscode_result": { ... } ,
  "cbm_result": { ... },
  "logistics": null
}
```

```json
// POST finalize
{ "status": "completed", "finalized_at": "2026-08-12T09:20:00+09:00" }
```

---

### 3.6 공동물류

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/product/{id}/logistics/apply` | 공동물류 신청 |
| `GET` | `/product/{id}/logistics/pickup` | 집하 정보 조회 |
| `GET` | `/product/{id}/logistics/consolidation` | 혼재(컨테이너 적재) 대기 현황 |
| `GET` | `/product/{id}/logistics/shipment` | 출고 일정 및 비용 정산 |

**`POST /product/{id}/logistics/apply`** — 신청 시점에 배정된 집하 정보를 화물에 **영구 저장**합니다. 신청과 동시에 `status: "completed"`로 전환됩니다.

```json
{
  "applied": true,
  "pickup": {
    "region": "광주권 집하소",
    "vehicle": "3호차",
    "date_label": "8월 14일 (금)",
    "date_iso": "2026-08-14",
    "window_start": "14:20",
    "window_end": "14:50",
    "companion_count": 15,
    "companion_label": "같은 권역 15건",
    "depot": { "name": "광주권 집하소", "address": "광주광역시 광산구 하남산단6번로", "lat": 35.1653, "lng": 126.7873 },
    "origin": { "name": "담양", "lat": 35.3212, "lng": 126.9882 },
    "note": "..."
  }
}
```

**`GET /product/{id}/logistics/pickup`** — 이미 신청한 화물은 신청 시점에 저장된 배정을 그대로 돌려줍니다(**두 번 조회해도 같은 값**). 아직 신청 전이면 그 시점 기준으로 예정 배정을 즉석 계산해 보여줍니다.

**`GET /product/{id}/logistics/consolidation`** — 저장된 `cbm_result.cbm`과 `hscode_result.storage_method`를 반영해 적재율과 출고 판단을 계산합니다.

```json
{
  "load_ratio": 80,
  "load_ratio_exact": 79.8,
  "loaded_cbm": 26.5,
  "capacity_cbm": 33.2,
  "companion_count": 14,
  "my_cbm": 0.108,
  "freshness": { "label": "냉동 · 여유 충분", "level": "ample", "detail": "..." },
  "decision": "출고",
  "decision_code": "ship",
  "decision_reason": "적재율 80%로 목표 달성 — 경제적 출고 시점",
  "note": "..."
}
```

**`GET /product/{id}/logistics/shipment`**

```json
{
  "container_type": "20GP",
  "load_ratio": 80.0,
  "port": "광양항",
  "sail_date_label": "8월 15일 (토)",
  "sail_date_iso": "2026-08-15",
  "cost_individual": 204900,
  "cost_consolidated": 173600,
  "savings": 31300,
  "savings_rate": 15.3
}
```

---

### 3.7 운영자 화면

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/admin/overview` | 전통시장 92곳 + 권역별 집계 + 거점 시나리오 3종 |
| `GET` | `/admin/routes?scenario=` | 시나리오별 집하 경로 (`single_depot` \| `three_region`) |

`overview`는 지도에 뿌릴 시장 좌표(`markets`), 권역별 집하소와 집계(`regions`), 거점 구성 비교(`scenarios`: 개별발송/단일거점/권역3분할의 총 주행거리·트럭 대수), 지도 투영에 쓰는 위경도 범위(`bounds`)를 포함합니다. 좌표는 위경도를 등장방형(equirectangular) 투영으로 그리는 자체 SVG 지도용이며, 외부 지도 API를 쓰지 않습니다.

---

### 3.8 기록 조회 (내부용)

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/admin/logs/events?product_id=&limit=` | 업무 로그 (무슨 일이 언제 일어났는지) |
| `GET` | `/admin/logs/requests?limit=` | HTTP 접근 로그 |
| `GET` | `/admin/logs/stats` | DB 파일 위치와 테이블별 적재량 |

모든 요청은 미들웨어가 자동으로 `request_logs`에 남깁니다(이 세 엔드포인트 자체는 제외). 업무 로그는 주요 상태 변경 지점(`product.create`, `cbm.predict`, `cbm.confirm`, `cbm.manual`, `hscode.predict`, `hscode.revise`, `hscode.manual`, `hscode.select`, `product.finalize`, `logistics.apply`, `db.seed`)마다 명시적으로 기록됩니다. 앱 화면에서는 쓰이지 않고, 시연 중 디버깅이나 운영 확인용입니다.

```json
// GET /admin/logs/events?limit=3
{
  "items": [
    {
      "id": 42,
      "created_at": "...",
      "kind": "logistics.apply",
      "product_id": "...",
      "message": "공동물류 신청: 광주권 집하소 / 8월 14일 (금) 14:20",
      "payload": { "depot": "광주권 집하소", "date": "2026-08-14", "vehicle": "3호차" }
    }
  ]
}
```

---

### 3.9 시연 보조

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/demo/scenarios` | 설정 화면에서 강제 오류를 선택할 수 있는 옵션 목록 |

```json
{
  "cbm": [
    { "id": null, "label": "정상 인식" },
    { "id": "marker_not_found", "label": "운송장이 화면에 다 들어오게 찍어주세요" },
    { "id": "marker_too_small", "label": "조금 더 가까이서 찍어주세요" },
    { "id": "angle_invalid", "label": "조금 더 위에서 찍어주세요" },
    { "id": "edge_occluded", "label": "박스 모서리 일부가 가려졌어요" }
  ],
  "hscode": [
    { "id": null, "label": "정상 인식" },
    { "id": "text_unreadable", "label": "표시사항을 읽지 못했어요" },
    { "id": "ratio_missing", "label": "원재료 함량이 없음" }
  ]
}
```

---

## 4. 프론트엔드 — API 클라이언트 계층

앱은 서버와 직접 `fetch`하지 않고 [app/src/api/client.ts](app/src/api/client.ts)의 `api` 객체를 통해서만 통신합니다. 화면 컴포넌트는 엔드포인트 경로나 HTTP 메서드를 모릅니다.

```
화면 컴포넌트
   │  api.predictCbm(id, uri, angle, forceError)
   ▼
src/api/client.ts   ─ baseUrl 결정, fetch, 에러를 ApiError로 변환
   │
   ▼
src/api/types.ts    ─ 요청/응답 TypeScript 타입 (본 문서 3절과 1:1 대응)
```

### 4.1 서버 주소 자동 감지

`detectBaseUrl()`이 Expo 개발 서버의 `hostUri`(예: `100.115.85.81:8081`)에서 IP를 뽑아 `http://<IP>:8000`을 만듭니다. 폰이 Expo Go로 번들을 내려받는 주소와 API 서버가 같은 PC에 있다는 전제입니다. 자동 감지가 실패하면(예: `localhost`로 잡히는 웹 프리뷰) Android는 `10.0.2.2`, 그 외는 `localhost`로 대체합니다. 설정 화면의 숨김 메뉴에서 수동으로 덮어쓸 수도 있습니다.

### 4.2 에러 처리

모든 실패는 `ApiError`(HTTP status + 서버 `detail` 메시지)로 통일해 던집니다. 네트워크 자체가 끊겼을 때는 status `0`과 함께 "PC에서 서버가 실행 중인지, 폰과 PC가 같은 Wi-Fi인지 확인해주세요" 안내를 붙입니다. 화면은 이 하나의 에러 타입만 처리하면 됩니다.

### 4.3 사진 업로드

`photoPart(uri)`가 카메라 URI를 `{uri, name, type: 'image/jpeg'}` 형태로 감싸 `FormData`에 담습니다. `predictCbm`, `predictHsCode` 두 함수만 `multipart/form-data`를 쓰고 나머지는 전부 JSON입니다.

### 4.4 상태 관리와의 연결

서버 응답은 화면 로컬 state가 아니라 `FlowContext`(등록 진행 중인 화물의 사진·치수·판정결과)에 쌓입니다. 화면을 이동해도 이전 단계 결과가 유지되는 이유입니다. 등록이 끝나거나 취소되면 `reset()`으로 비웁니다.

---

## 5. 백엔드 — 저장 계층

```
app/main.py (엔드포인트)
   │  product["hscode_result"] = result
   │  store.touch(product)          ← 상태 갱신 + DB 저장을 한 번에
   ▼
app/store.py (dict ↔ SQL 변환)
   │  save(product)
   ▼
app/db.py (SQLite 연결, 스키마, 로그)
   ▼
shipda.db
```

엔드포인트 핸들러는 `product`를 평범한 dict처럼 다루다가, 변경이 끝나면 `store.touch(product)`(수정시각 갱신 + `draft`→`in_progress` 승격 + 저장을 한 번에) 또는 `store.save(product)`(그대로 저장만)를 호출합니다. 호출을 빼먹으면 메모리상의 dict만 바뀌고 DB에는 반영되지 않습니다 — 새 엔드포인트를 추가할 때 주의할 지점입니다.

`hscode_result`, `cbm_result`, `logistics` 세 필드는 중첩 구조라 SQLite에는 JSON 텍스트 컬럼으로 저장하고, 읽고 쓸 때 `app/store.py`가 자동으로 직렬화/역직렬화합니다.

---

## 6. AI 계층 — 왜 별도 서비스가 아닌가

**HS Code 판정은 실제 모델이 합니다.** 다만 별도 추론 서버를 두지 않고, FastAPI가 같은 프로세스에서 `model/` 패키지를 불러 씁니다. 진입점은 [server/app/catalog_ai.py](server/app/catalog_ai.py)입니다.

```
POST /hscode/predict (사진 + kind)
   │
   ▼
store.build_hscode_result()
   │
   ▼
catalog_ai.find_ruling(product_name, image_path, kind)
   │
   ├── kind=fresh ─────▶ model/contract_fresh.py  FreshService
   │                       사진 → 품목 인식(item_model.pkl) → 상태별 호 결정
   │
   └── kind=processed ─▶ model/ocr_engine.py      표시사항 OCR (easyocr)
                         model/nutrition_parser.py 원재료·함량 파싱
                         model/contract.py        HSCodeService (BM25 + HS 통칙)
```

**두 갈래로 나눈 이유.** 원물은 관세율표에 품목명이 그대로 있어 상태(신선/냉동/건조)만 정하면 되지만, 가공품은 원재료 함량으로 류가 갈립니다. 떡갈비는 이름에 '떡'이 들어가서 검색만 하면 베이커리류로 가는데, 제16류 주1(육류 20% 초과)을 적용해야 조제육류로 갑니다. 그래서 규칙 레이어(`hs_rules.py`)가 따로 필요합니다.

**모델이 '모른다'고 말하지 못하는 문제에 대비한 방어 장치가 셋 있습니다.** 품목 분류기는 학습한 품목 중 하나를 반드시 답하도록 되어 있어, 흰 이미지도 표시사항 사진도 그중 하나로 답하는 일이 실측에서 나왔습니다.

| 장치 | 위치 | 하는 일 |
|---|---|---|
| 채도 검사 | `_looks_like_produce()` | 평균 채도가 낮으면(문서·빈 이미지) 분류기에 넣지 않음 |
| 표시사항 판별 | `_looks_like_label()` | 글자가 읽혔다고 표시사항으로 단정하지 않고, 표시사항에만 나오는 항목명이 있는지 확인 |
| 어휘 사전 검사 | `_has_food_vocabulary()` | 아는 식품 낱말이 하나도 없으면 BM25 검색을 아예 시도하지 않음 (점수·신뢰도로는 걸러지지 않았음) |

셋 중 어디서도 통과하지 못하면 `hs_code: null`로 내려 직접 입력이나 사전심사로 안내합니다. **가짜 코드를 지어내지 않는 것이 이 계층의 첫 번째 원칙입니다.**

**의존성과 성능.** 관세율표 2,100행과 모델 32MB를 요청마다 읽으면 느리므로 프로세스당 한 번만 만들어 재사용합니다(읽기 전용이라 동시 요청에 안전). 모델을 못 불러오면 서버는 뜨지만 모든 화물이 판정 불가로 내려갑니다 — `server/smoke_test.py` 첫 섹션이 이를 알려주고, `server/check_model.py`로 단계별 진단을 할 수 있습니다.

**사진은 저장하지 않습니다.** 모델이 파일 경로를 받으므로 임시 파일에 썼다가 판정이 끝나면 지웁니다.

### 6.1 CBM은 여전히 목업입니다

`POST /product/{id}/cbm/predict`는 실제 컴퓨터 비전 없이 `app/store.py`의 `DEMO_DIMENSIONS`(고정값 600×450×400mm)를 돌려줍니다. `device_angle`만 실제로 검사해 각도 조건을 재현합니다.

> 참고: 이 프로젝트는 한때 서버 측 OpenCV로 실시간 상자 윤곽 검출을 구현했다가 실물 환경에서 정확도가 부족해 철회했습니다. 자세한 경위는 [Shipda_기능명세서.md](Shipda_기능명세서.md)의 "변경 이력 5"를 참고하세요.

### 6.2 시연 재현성은 `force_error`로 확보합니다

판정이 실제 모델로 바뀌면서 "같은 상품명이면 항상 같은 결과"라는 보장은 사라졌습니다. 대신 실패 상황을 원하는 타이밍에 재현하는 것은 `force_error` 파라미터가 그대로 담당합니다(2.6절).

---

## 7. 엔드포인트 요약표

| Method | Path | 인증 | 화물 필요 |
|---|---|---|---|
| GET | `/health` | - | - |
| GET | `/product/recent` | - | - |
| GET | `/product/history` | - | - |
| POST | `/product/create` | - | - |
| GET | `/product/{id}/marker` | - | Y |
| POST | `/product/{id}/cbm/predict` | - | Y |
| POST | `/product/{id}/cbm/manual` | - | Y |
| POST | `/product/{id}/cbm/confirm` | - | Y |
| POST | `/product/{id}/hscode/predict` | - | Y |
| POST | `/product/{id}/hscode/manual` | - | Y |
| POST | `/product/{id}/hscode/revise` | - | Y |
| POST | `/product/{id}/hscode/select` | - | Y |
| GET | `/product/{id}/summary` | - | Y |
| POST | `/product/{id}/finalize` | - | Y |
| POST | `/product/{id}/logistics/apply` | - | Y |
| GET | `/product/{id}/logistics/pickup` | - | Y |
| GET | `/product/{id}/logistics/consolidation` | - | Y |
| GET | `/product/{id}/logistics/shipment` | - | Y |
| GET | `/admin/overview` | - | - |
| GET | `/admin/routes` | - | - |
| GET | `/admin/logs/events` | - | - |
| GET | `/admin/logs/requests` | - | - |
| GET | `/admin/logs/stats` | - | - |
| GET | `/demo/scenarios` | - | - |

인증이 전부 "-"인 것은 시연용 설계이지 실수가 아닙니다. 실서비스 전환 시 가장 먼저 채워야 할 빈칸입니다.
