"""Mock API 전체 엔드포인트 스모크 테스트.

실행: .venv/Scripts/python.exe smoke_test.py
"""

import os
import tempfile
from pathlib import Path

# 시연용 DB를 더럽히지 않도록 임시 파일에 붙는다. main을 import 하기 전에 지정해야 한다.
_TEST_DB = Path(tempfile.gettempdir()) / "shipda_smoke_test.db"
_TEST_DB.unlink(missing_ok=True)
os.environ["SHIPDA_DB"] = str(_TEST_DB)

from fastapi.testclient import TestClient  # noqa: E402

from app import db, main  # noqa: E402

c = TestClient(main.app)
IMG = {"image": ("photo.jpg", b"fake-bytes", "image/jpeg")}


def section(title: str) -> None:
    print(f"\n--- {title} ---")


section("health")
print(c.get("/health").json())

section("화면 1. 상품 등록")
r = c.post(
    "/product/create",
    json={"product_name": "담양 떡갈비 (냉동 밀키트)", "destination_country": "일본"},
)
assert r.status_code == 201, r.text
pid = r.json()["product_id"]
print(r.json())

section("화면 2. 운송장 마커")
m = c.get(f"/product/{pid}/marker").json()
print("marker_id:", m["marker_id"], "| size:", m["marker_size_mm"], "mm")
print("tracking:", m["waybill"]["tracking_no"], "| dest:", m["waybill"]["destination_country"])
assert len(m["pattern"]) == 6 and all(len(row) == 6 for row in m["pattern"])
print("pattern:", "".join(str(b) for row in m["pattern"] for b in row))

section("화면 3. CBM — 각도 미달 실패")
r = c.post(f"/product/{pid}/cbm/predict", files=IMG, data={"device_angle": "22"}).json()
print(r["error_reason"], "|", r["message"], "| attempts:", r["attempts"])
assert r["success"] is False and r["error_reason"] == "angle_invalid"

section("화면 3. CBM — 마커 미인식 / 너무 작음 / 모서리 가림")
for err in ["marker_not_found", "marker_too_small", "edge_occluded"]:
    r = c.post(
        f"/product/{pid}/cbm/predict",
        files=IMG,
        data={"device_angle": "65", "force_error": err},
    ).json()
    print(f"  {err:18s} -> {r['message']}  [action={r['action']}, suggest_manual={r['suggest_manual']}]")
assert r["suggest_manual"] is True, "4회 실패 후 직접 입력 유도되어야 함"

section("화면 3. CBM — 정상 측정")
r = c.post(f"/product/{pid}/cbm/predict", files=IMG, data={"device_angle": "65"}).json()
print(r["dimensions"], "->", r["cbm"], "CBM")
assert r["success"] and r["cbm"] == 0.108, r
assert set(r["overlay"]) == {"marker", "box_top", "box_bottom"}
c.post(
    f"/product/{pid}/cbm/confirm",
    json={"width_mm": 600, "depth_mm": 450, "height_mm": 400, "weight_kg": 11.4},
)

section("화면 4-5. 표시사항 인식 + HS Code 판정")
r = c.post(f"/product/{pid}/hscode/predict", files=IMG).json()
hs = r["hscode_result"]
print("제품명:", r["product_label"])
print("식품유형:", hs["food_type"], "| 보관:", hs["storage_method"])
print("원재료:", ", ".join(f"{i['name']} {i['ratio']}%" for i in hs["ingredients"]))
print("HS Code:", hs["hs_code_formatted"], hs["hs_code_parts"])
print("판정:", hs["status"], f"(신뢰도 {hs['confidence']})")
print("근거:", hs["reasoning"])
for a in hs["alternatives"]:
    print(f"  차순위 {a['hs_code_formatted']}  {a['name']}  {a['confidence']}")
assert hs["hs_code_formatted"] == "1602.50-9000"
assert hs["status"] == "pre_review_recommended"
assert hs["hs_code_parts"] == {"heading": "1602", "subheading": "50", "national": "9000"}

section("화면 4. 예외 — 표시사항 흐림 / 함량 없음")
r = c.post(f"/product/{pid}/hscode/predict", files=IMG, data={"force_error": "text_unreadable"}).json()
print("흐림:", r["message"], "| action:", r["action"])
assert r["action"] == "manual_input"
r = c.post(f"/product/{pid}/hscode/predict", files=IMG, data={"force_error": "ratio_missing"}).json()
print("함량없음: 판정 ->", r["hscode_result"]["status"], "|", r["hscode_result"]["review_note"])

section("화면 4. 인라인 수정 후 재판정")
r = c.post(
    f"/product/{pid}/hscode/revise",
    json={
        "ingredients": [
            {"name": "쇠고기", "ratio": 55},
            {"name": "돼지고기", "ratio": 25},
            {"name": "양파", "ratio": 10},
            {"name": "기타(양념류)", "ratio": 10},
        ],
        "food_type": "식육가공품 (분쇄가공육제품)",
        "storage_method": "냉동",
    },
).json()
print("재판정:", r["hscode_result"]["hs_code_formatted"], r["hscode_result"]["status"])

section("HS Code 수동 입력 경로")
r = c.post(
    f"/product/{pid}/hscode/manual",
    json={
        "ingredients": [{"name": "쇠고기", "ratio": 80}, {"name": "기타", "ratio": 20}],
        "food_type": "식육가공품",
        "storage_method": "냉동",
    },
).json()
print(r["hscode_result"]["status"], "|", r["hscode_result"]["reasoning"])
assert r["hscode_result"]["hs_code"] is None
# 다시 정상 판정으로 되돌려 놓는다
c.post(f"/product/{pid}/hscode/predict", files=IMG)

section("화면 6. 요약 + 공동물류 신청")
s = c.get(f"/product/{pid}/summary").json()
print(s["product_name"], "|", s["hscode_result"]["hs_code_formatted"], "|", s["cbm_result"]["cbm"], "CBM")
r = c.post(f"/product/{pid}/logistics/apply").json()
print("신청 완료:", r["applied"])

section("화면 7. 집하 안내")
p = c.get(f"/product/{pid}/logistics/pickup").json()
print(f"{p['region']} | {p['vehicle']} | {p['date_label']} {p['window_start']}~{p['window_end']} | {p['companion_label']}")

section("화면 8. 혼재 대기 현황")
cs = c.get(f"/product/{pid}/logistics/consolidation").json()
print(f"적재율 {cs['load_ratio']}% ({cs['loaded_cbm']}/{cs['capacity_cbm']} CBM) | 동반 {cs['companion_count']}건")
print(f"신선도: {cs['freshness']['label']} | 판정: {cs['decision']} — {cs['decision_reason']}")
assert cs["load_ratio"] == 80

section("화면 9. 출고와 정산")
sh = c.get(f"/product/{pid}/logistics/shipment").json()
print(f"{sh['container_type']} · 적재율 {sh['load_ratio']}% | {sh['port']} {sh['sail_date_label']}")
print(f"개별 LCL {sh['cost_individual']:,}원 / 공동물류 {sh['cost_consolidated']:,}원 / 절감 {sh['savings']:,}원 ({sh['savings_rate']}%)")
assert sh["savings"] == 31300

section("운영자 화면")
a = c.get("/admin/overview").json()
print("전통시장", a["market_total"], "곳 | 총 화물", a["cargo_total"], "건")
for reg in a["regions"]:
    print(f"  {reg['region']}: 시장 {reg['market_count']}곳, 화물 {reg['cargo_count']}건 -> {reg['depot']['name']}")
for sc in a["scenarios"]:
    print(f"  {sc['label']:10s} {sc['distance_km']:>6,} km  트럭 {sc['truck_count'] or '-'}대")
assert a["market_total"] == 92
routes = c.get("/admin/routes?scenario=three_region").json()["routes"]
print("경로:", [(r["region"], len(r["stops"])) for r in routes])
print("단일거점 경로:", [(r["region"], len(r["stops"])) for r in c.get("/admin/routes?scenario=single_depot").json()["routes"]])

section("품목별 판정 (PDF '다른 품목 결과 예시')")
expected = {
    "여수 돌산갓김치": ("2005.99-1000", "approved"),
    "고추장": ("2103.90-1030", "approved"),
    "일반 배추김치": ("2005.99-1000", "approved"),
    "나주 배즙": ("2009.89-1090", "pre_review_recommended"),
    "담양 한과": ("1905.90-1050", "review_required"),
    "장흥 표고버섯 스낵": ("2003.90-1000", "approved"),
}
LABELS = {"approved": "신고 가능", "pre_review_recommended": "사전심사 권장", "review_required": "검토 필요"}
for name, (want_code, want_status) in expected.items():
    p = c.post("/product/create", json={"product_name": name}).json()["product_id"]
    h = c.post(f"/product/{p}/hscode/predict", files=IMG).json()["hscode_result"]
    ok = h["hs_code_formatted"] == want_code and h["status"] == want_status
    print(f"  {'OK ' if ok else 'X  '}{name:16s} {h['hs_code_formatted']}  {LABELS[h['status']]}")
    assert ok, f"{name}: got {h['hs_code_formatted']} {h['status']}, want {want_code} {want_status}"

section("홈 / 이력")
print("recent:", [i["product_name"] for i in c.get("/product/recent?limit=5").json()["items"]])
h = c.get("/product/history?page=1&limit=20").json()
print("history total:", h["total_count"])

section("집하 배정이 화물에 저장되는가")
first = c.get(f"/product/{pid}/logistics/pickup").json()
second = c.get(f"/product/{pid}/logistics/pickup").json()
assert first == second, "같은 화물은 항상 같은 집하 배정이 나와야 함"
stored = c.get(f"/product/{pid}/summary").json()["logistics"]["pickup"]
assert stored["depot"]["name"] == first["depot"]["name"], stored
print("저장된 집하소:", stored["depot"]["name"], "|", stored["date_label"], stored["window_start"])
print("좌표:", stored["origin"], "->", stored["depot"]["lat"], stored["depot"]["lng"])

section("기록 (DB)")
events = c.get(f"/admin/logs/events?product_id={pid}&limit=50").json()["items"]
kinds = [e["kind"] for e in events]
print("이 화물의 업무 로그:", len(events), "건")
for e in reversed(events[:6]):
    print(f"  {e['created_at'][11:19]}  {e['kind']:<20} {e['message']}")
for expected in ("product.create", "cbm.confirm", "hscode.predict", "logistics.apply"):
    assert expected in kinds, f"{expected} 로그가 없음: {kinds}"

requests_log = c.get("/admin/logs/requests?limit=5").json()["items"]
assert requests_log, "접근 로그가 비어 있음"
print("최근 요청:", f"{requests_log[0]['method']} {requests_log[0]['path']}",
      f"{requests_log[0]['status_code']}", f"{requests_log[0]['duration_ms']}ms")

stats = c.get("/admin/logs/stats").json()
print(f"DB: products {stats['products']} / events {stats['events']}"
      f" / requests {stats['request_logs']} / {stats['db_size_bytes']:,} bytes")

section("재시작해도 남는가")
db._conn.close()          # 연결을 끊고
db._conn = None           # 새로 열어서 (= 프로세스 재시작과 같은 상황)
again = db.query_one("SELECT product_name FROM products WHERE product_id = ?", (pid,))
assert again is not None, "재연결 후 화물이 사라짐"
print("재연결 후 조회:", again["product_name"])

print("\n=== 전체 통과 ===")
