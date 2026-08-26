# Shipda 프로젝트 — 이어받아 작업해줘

먼저 `README.md` 와 `INTEGRATION.md` 를 읽어봐. 구조가 거기 적혀 있어.

---

## 무엇을 만드는가

수출을 처음 하는 광주·전남 농가를 위한 앱이야.
**사진 한 장으로 HS Code(수출 신고용 품목 번호)를 찾아준다.**

해커톡 본선이 곧이라 시간이 없어. 안전하게, 작은 단위로 고쳐줘.

---

## 폴더 구조

```
Shipda/
  app/      Expo(React Native) 앱
    src/screens/     화면 20개
    src/state/       FlowContext.tsx, productKind.ts
    src/api/client.ts
  server/   FastAPI + SQLite
    app/main.py        엔드포인트
    app/store.py       응답 조립
    app/catalog_ai.py  ← HS Code 판정 엔진 (핵심)
    app/catalog.py     상수·포맷 함수만
  model/    모델 파일 (server 옆)
    item_model.pkl            이미지 분류기 (32MB)
    hsk_master.csv            관세율표 2,100행
    contract_fresh.py         원물 진입점
    hs_fresh.py               상태→호 매핑
    train_item_classifier.py  분류기 학습·추론
    contract.py               가공식품 진입점
    hs_matcher.py             가공식품 검색
    hs_rules.py               HS 통칙 규칙
    hs_confidence.py          신뢰도 판정
    nutrition_parser.py       표시사항 파싱
    ocr_engine.py             OCR
```

---

## 판정이 어떻게 도는가

`server/app/catalog_ai.py` 의 `find_ruling()` 이 전부야.

```
사진 ─→ OCR ─┬─ 표시사항이면      → 원재료·함량 → HS 통칙   (가공식품)
             └─ 글자 없고 색 있으면 → 품목 인식 → 상태 선택   (원물)

어느 쪽도 안 되면 → hs_code: null (판정 불가)
```

**중요한 설계 원칙 — 함부로 바꾸지 마.**

1. **가짜 코드를 지어내지 않는다.** 판정 못 하면 `hs_code: null` 을 준다.
   통관은 틀리면 화물이 폐기되므로, 확신에 찬 오답이 가장 위험하다.

2. **OCR을 먼저 돌린다.** 순서를 뒤집으면 안 된다.
   품목 분류기는 5품목만 배워서 '모른다'를 말하지 못한다.
   실측에서 표시사항 사진과 흰 이미지가 모두 '무화과 0.66'으로 나왔다.

3. **채도로 원물 사진을 거른다.** 원물은 채도 57~73, 문서·흰 배경은 0.
   분류기에 넣기 전에 이 검사를 통과해야 한다.

4. **확신 못 하면 사용자에게 묻는다.** Top-1 87.4%인데 Top-2는 94.9%다.
   `alternatives` 에 후보를 담아 사용자가 고르게 한다.

---

## 지금 상태

**되는 것**
- 원물 5품목(딸기·배·수박·무화과·멜론) 사진 → HS Code. 폰에서 확인 완료.
- 가공식품 표시사항 → HS Code. EasyOCR 붙어 있음.
- 상품명 입력을 없앴다. 사진에서 품목명을 얻는다.
  등록 시 `촬영 대기 화물` 로 만들고, 판정 후 `resolve_product_name()` 이 바꾼다.

**성능 (공개 데이터셋 기준)**
- 품목 인식 Top-1 87.4%, Top-2 94.9% (5품목 1,583장)
- 품목+상태 → 코드: 검증 17개 조합 전부 정답
- 가공식품 상품명 기준 6/6, 표시사항 기준 4/4

**안 된 것 / 아는 한계**
- 폰으로 직접 찍은 사진에서는 정확도가 떨어진다. 실사진 검증을 못 했다.
- 평가 규모가 작다(품목 5개, 조합 17개).

---

## 지금 해야 할 일 (우선순위 순)

### 1. 촬영 순서 바꾸기

지금은 상자를 먼저 찍는데, 물품을 먼저 찍는 게 맞다.

```
현재   운송장 → 상자 촬영 → 체적 → 물품 촬영 → 원재료 → HS Code
원하는 운송장 → 물품 촬영 → 원재료 → HS Code → 상자 촬영 → 체적
```

화면 파일 구조는 두고, 각 화면이 `navigation.navigate/replace` 로
부르는 대상만 바꾸면 된다. `navigation/types.ts` 는 건드리지 마.

### 2. 출발지를 사용자 입력으로

`담양` 이 하드코딩된 곳이 있으면 다 찾아서,
등록 화면(`ProductInfoScreen.tsx`)에서 입력한 값을 쓰도록 고쳐줘.
`src/state/productKind.ts` 에 `setOrigin/getOrigin` 이 이미 있다.

### 3. 실사진 대응

폰으로 찍은 사진에서 수박이 딸기로 나온다.
학습 데이터가 공개 데이터셋이라 배경·조명이 달라서 그렇다.

`model/train_item_classifier.py` 의 `augment()` 에
**밝기·대비 변화, 약한 블러, JPEG 압축 흉내**를 추가해줘.
색상(H)은 건드리면 안 된다 — 색이 품목을 가르는 주 신호다.

그 뒤 재학습:
```
cd hscode
python train_item_classifier.py --data ./data --out item_model.pkl --features v2
copy item_model.pkl ..\\Shipda\\model\\item_model.pkl
```

---

## 확인 도구 (server/ 에 있음)

```
python check_model.py                      모델이 붙었는지 단계별 확인
python check_model.py "사진.jpg"            사진으로 실제 판정까지
python check_label.py "표시사항.jpg"        OCR→파싱→코드 단계별
python eval_real.py "폴더"                  품목별 폴더로 정확도 채점
```

무엇을 고치든 **`check_model.py` 로 회귀 확인**부터 해줘.

---

## 실행

```
터미널 1:  cd server && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
터미널 2:  cd app && npx expo start -c
```

둘 다 켜져 있어야 한다.

---

## 부탁

- 고치기 전에 무엇을 바꿀지 먼저 말해줘.
- 한 번에 하나씩. 고치고 확인하고 다음으로.
- 위 '설계 원칙' 4가지는 유지해줘. 정확도를 올리려고
  판정 불가를 없애거나 추측으로 코드를 채우면 안 된다.
