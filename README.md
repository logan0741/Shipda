# Shipda (쉽다)

수출 경험이 없는 영세 농가·소상공인이 관세사나 물류업체 없이 앱만으로 수출 신고를 준비할 수 있게 돕는 시연용 모바일 앱입니다.

- **HS Code 자동 판정** — 표시사항(원재료·식품유형·보관방법)을 촬영해 품목분류 코드를 산출
- **화물 체적(CBM) 측정** — 운송장 마커를 기준자 삼아 박스 치수를 산출
- **공동물류** — 같은 권역 화물을 묶어 집하·혼재·출고까지 안내

React Native(Expo) 앱과 FastAPI 서버로 구성됩니다. AI 추론은 하지 않고 시연 시나리오의 고정 결과를 돌려주는 **목업 서버**입니다.

---

## 1. 사전 준비물

| 항목 | 버전 | 비고 |
|---|---|---|
| Node.js | 20 이상 (검증: 24.19.0) | 앱 빌드·실행 |
| Python | 3.12 (검증: 3.12.10) | API 서버 |
| Expo Go | **SDK 54 대응 버전 (54.0.x)** | 폰에 설치. 아래 주의사항 필독 |
| 스마트폰 | iOS 또는 Android | 카메라·기울기 센서 사용 |

> **Expo Go 버전이 가장 중요합니다.** 이 프로젝트는 Expo SDK 54를 씁니다. App Store/Play Store의 Expo Go가 SDK 55 이상이면 프로젝트가 안 열리고, SDK 53 이하여도 안 열립니다. Expo Go 앱 버전이 `54.0.x`인지 확인하세요.

폰과 PC가 **같은 네트워크**에 있어야 합니다. 공유기가 다르면 아래 [7. 네트워크가 다를 때](#7-네트워크가-다를-때)를 보세요.

---

## 2. 내려받기

```bash
git clone <저장소 주소> uk2
```

```bash
cd uk2
```

> 현재 이 프로젝트는 원격 저장소에 올라가 있지 않습니다. 폴더를 그대로 복사해 받았다면 이 단계는 건너뛰고 `uk2` 폴더로 이동하세요.

---

## 3. API 서버 설치 (터미널 1)

```bash
cd server
```

```bash
python -m venv .venv
```

```bash
.venv\Scripts\python.exe -m pip install --upgrade pip
```

```bash
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

설치가 되었는지 확인합니다.

```bash
.venv\Scripts\python.exe smoke_test.py
```

마지막 줄에 `=== 전체 통과 ===`가 나오면 정상입니다. 이 테스트는 임시 DB를 쓰므로 실제 데이터에 영향이 없습니다.

---

## 4. API 서버 실행 (터미널 1)

```bash
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

아래처럼 나오면 성공입니다.

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

- `--host 0.0.0.0`은 **필수**입니다. `127.0.0.1`로 띄우면 폰에서 접속하지 못합니다.
- `--reload`는 코드 수정 시 자동 재시작합니다. **시연 당일에는 빼는 걸 권합니다** — 파일이 바뀔 때마다 재시작되며 진행 중이던 요청이 끊길 수 있습니다.

브라우저에서 확인:

```bash
curl http://localhost:8000/health
```

---

## 5. 앱 설치 (터미널 2)

새 터미널을 엽니다.

```bash
cd uk2\app
```

```bash
npm install
```

타입 검사로 확인합니다.

```bash
npm run typecheck
```

아무 출력 없이 끝나면 정상입니다.

---

## 6. 앱 실행 (터미널 2)

```bash
npx expo start --lan
```

터미널에 QR 코드가 뜹니다.

- **iOS**: 기본 카메라 앱으로 QR을 찍으면 Expo Go가 열립니다
- **Android**: Expo Go 앱 안의 스캐너로 찍습니다

첫 실행은 번들링에 15초쯤 걸립니다(약 1,000개 모듈). 이후에는 캐시로 빨라집니다.

QR이 안 찍히면 Expo Go에서 URL을 직접 입력해도 됩니다.

```
exp://<PC의 LAN IP>:8081
```

---

## 7. 네트워크가 다를 때

폰과 PC가 다른 공유기에 있거나 PC에 무선 랜카드가 없으면 QR을 찍어도 연결되지 않습니다(`The Internet connection appears to be offline`). [Tailscale](https://tailscale.com)을 양쪽에 설치하고 같은 계정으로 로그인한 뒤, Tailscale IP를 지정해 실행하세요.

```bash
$env:REACT_NATIVE_PACKAGER_HOSTNAME="<PC의 Tailscale IP>"
```

```bash
npx expo start --lan
```

앱은 Expo 개발 서버 주소에서 PC의 IP를 뽑아 API 주소(`http://<그 IP>:8000`)를 자동으로 만듭니다. 따라서 이 환경변수를 지정하면 API 연결도 함께 해결됩니다.

---

## 8. Windows에서 자주 막히는 곳

**`npx`를 찾을 수 없음**

Node를 방금 설치했다면 이미 열려 있던 터미널은 PATH를 갱신받지 못합니다. 터미널을 새로 열거나, 그 창에서 아래 한 줄을 먼저 실행하세요.

```bash
$env:Path += ";C:\Program Files\nodejs"
```

근본적으로는 재부팅하면 해결됩니다.

**`npx.ps1 파일을 로드할 수 없습니다` (PSSecurityException)**

PowerShell 실행 정책이 `.ps1` 스크립트를 막고 있습니다. 확장자를 명시하면 우회됩니다.

```bash
npx.cmd expo start --lan
```

**긴 명령이 깨져서 실행됨**

명령이 화면에서 여러 줄로 접힌 상태로 붙여넣으면 줄이 섞입니다. 위 명령들은 모두 한 줄에 들어가도록 짧게 나눠 두었으니 **한 블록씩** 실행하세요.

**`Need to install the following packages: expo@…` 프롬프트**

`app` 폴더가 아닌 곳에서 `npx expo`를 실행했다는 뜻입니다. `n`을 눌러 취소하고 `cd uk2\app` 후 다시 실행하세요.

---

## 9. 시연용 숨김 설정

앱 **설정 탭 → 프로필 영역(농/전남 농원)을 0.7초 길게 누르면** 시연 설정이 열립니다.

| 항목 | 용도 |
|---|---|
| 촬영 각도 게이팅 | 끄면 60~70도 조건을 무시하고 아무 각도에서나 촬영 |
| 체적 측정 강제 결과 | 마커 미인식·너무 작음·각도 미달·모서리 가림을 의도적으로 발생 |
| HS Code 강제 결과 | 표시사항 흐림·함량 없음을 의도적으로 발생 |
| 서버 주소 | 자동 감지가 실패할 때 직접 입력 |
| 공동물류 운영 현황 | 운영자 지도 화면 진입 |

---

## 10. 데이터와 기록

SQLite 파일 하나에 저장됩니다. 별도 DB 설치나 계정이 필요 없습니다.

```
server/shipda.db
```

| 테이블 | 내용 |
|---|---|
| `products` | 화물의 현재 상태 (HS Code·체적·물류 결과는 JSON 컬럼) |
| `events` | 업무 로그. 언제 무슨 일이 있었는지 |
| `request_logs` | HTTP 접근 로그 |

첫 실행 시 홈·이력 화면이 비어 보이지 않도록 시드 화물 3건이 자동 생성됩니다. DB에 데이터가 있으면 건너뜁니다.

기록 확인:

```bash
curl http://localhost:8000/admin/logs/stats
```

```bash
curl http://localhost:8000/admin/logs/events?limit=20
```

DB를 초기화하려면 서버를 끄고 `server/shipda.db` 파일을 지우면 됩니다. 위치를 바꾸려면 `SHIPDA_DB` 환경변수를 지정하세요.

---

## 11. 프로젝트 구조

```
uk2/
├── app/                        Expo 앱 (React Native + TypeScript)
│   ├── App.tsx                 진입점. Provider 3개로 감싼다
│   ├── app.json                Expo 설정 (권한 문구, apiPort)
│   └── src/
│       ├── api/                서버 통신 (client.ts, types.ts)
│       ├── components/         공용 UI, 아이콘, 게이지, 지도
│       ├── navigation/         스택 + 하단 탭 구성
│       ├── screens/            화면 20개
│       ├── state/              FlowContext(등록 진행), SettingsContext(시연 설정)
│       ├── format.ts           날짜·신뢰도·상태 표시 포맷
│       └── theme.ts            색·간격·판정 상태 매핑
├── server/                     FastAPI 목업 서버
│   ├── main.py                 엔드포인트 전체
│   ├── db.py                   SQLite 연결·스키마·로그
│   ├── store.py                화물 저장소
│   ├── catalog.py              HS Code 판정 규칙
│   ├── logistics.py            집하·혼재·출고·운영자 데이터
│   └── smoke_test.py           전체 엔드포인트 점검
├── Shipda_기능명세서.md          기능 명세 + 변경 이력
├── HANDOVER.md                 현재까지의 작업 현황과 다음 과제
└── README.md                   이 문서
```

---

## 12. 화면 흐름

```
홈 → 상품 정보 입력 → 운송장(마커) 준비 → 박스 촬영 → 체적 결과
   → 표시사항 촬영 → 성분 결과 → HS Code 결과 → 등록 내용 확인
   → 공동물류 신청 → 집하 안내 → 혼재 대기 → 출고·정산
```

AI 판정이 실패하거나 신뢰도가 낮으면 **모든 단계에서 직접 입력 경로**로 빠질 수 있습니다. 하단 탭은 홈 / 분석 이력 / 설정 세 개입니다.

---

## 13. 자주 쓰는 명령

앱 타입 검사:

```bash
npm run typecheck
```

앱 번들 확인 (실기기 없이 빌드만 검증):

```bash
npx expo export --platform ios --output-dir dist
```

서버 전체 점검:

```bash
.venv\Scripts\python.exe smoke_test.py
```

API 문서 (서버 실행 중):

```
http://localhost:8000/docs
```
