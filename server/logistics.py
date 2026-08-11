"""공동물류(집하 · 혼재 · 출고 정산)와 운영자 화면 데이터.

수치는 앱_시연_시나리오.pdf 화면 7~9 및 운영자 화면을 그대로 재현한다.
날짜만 시연 당일 기준으로 계산해 항상 '이틀 뒤 집하'로 보이게 한다.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

KST = timezone(timedelta(hours=9))
WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]


def _fmt_date(dt: datetime) -> str:
    return f"{dt.month}월 {dt.day}일 ({WEEKDAYS[dt.weekday()]})"


# ---------------------------------------------------------------- 화면 7. 집하 안내


def pickup_info() -> dict[str, Any]:
    arrive = datetime.now(KST) + timedelta(days=2)
    return {
        "region": "광주권 집하소",
        "vehicle": "3호차",
        "date_label": _fmt_date(arrive),
        "date_iso": arrive.date().isoformat(),
        "window_start": "14:20",
        "window_end": "14:50",
        "companion_count": 15,
        "companion_label": "같은 권역 15건",
        "depot": {
            "name": "광주권 집하소",
            "address": "광주광역시 광산구 하남산단6번로",
            "lat": 35.1653,
            "lng": 126.7873,
        },
        "origin": {"name": "담양", "lat": 35.3212, "lng": 126.9882},
        "note": "플랫폼이 같은 권역의 화물을 묶어 집하 동선을 짭니다. 상인에게는 트럭 도착 시각만 통보됩니다.",
    }


# ------------------------------------------------------- 화면 8. 혼재 대기 현황

CONTAINER_CAPACITY_CBM = 33.2  # 20GP 기준 적재 가능 체적
LOADED_CBM = 26.5


def consolidation_status(my_cbm: float | None, storage_method: str | None) -> dict[str, Any]:
    ratio = round(LOADED_CBM / CONTAINER_CAPACITY_CBM * 100, 1)  # 79.8 -> 80%
    frozen = (storage_method or "냉동") in ("냉동", "냉장")
    is_frozen = (storage_method or "냉동") == "냉동"

    if is_frozen:
        freshness = {
            "label": "냉동 · 여유 충분",
            "level": "ample",
            "detail": "냉동 화물은 신선도 마감이 길어 적재율을 채울 때까지 기다릴 수 있습니다.",
        }
    elif frozen:
        freshness = {
            "label": "냉장 · 마감 임박",
            "level": "tight",
            "detail": "냉장 화물은 신선도 마감이 짧아 적재율이 목표에 못 미쳐도 먼저 내보냅니다.",
        }
    else:
        freshness = {
            "label": "상온 · 제한 없음",
            "level": "none",
            "detail": "상온 화물은 신선도 마감의 영향을 받지 않습니다.",
        }

    return {
        "load_ratio": round(ratio),
        "load_ratio_exact": ratio,
        "loaded_cbm": LOADED_CBM,
        "capacity_cbm": CONTAINER_CAPACITY_CBM,
        "companion_count": 14,
        "my_cbm": my_cbm,
        "freshness": freshness,
        "decision": "출고",
        "decision_code": "ship",
        "decision_reason": "적재율 80%로 목표 달성 — 경제적 출고 시점",
        "note": (
            "냉장 화물이 함께 실려 있으면 그 화물의 신선도 마감이 전체 출고 시점을 앞당깁니다. "
            "적재율이 목표에 못 미쳐도 마감이 임박하면 먼저 내보냅니다."
        ),
    }


# ------------------------------------------------------- 화면 9. 출고와 정산

COST_INDIVIDUAL_LCL = 204_900
COST_CONSOLIDATED = 173_600


def shipment_result() -> dict[str, Any]:
    sail = datetime.now(KST) + timedelta(days=3)
    return {
        "container_type": "20GP",
        "load_ratio": 80.0,
        "port": "광양항",
        "sail_date_label": _fmt_date(sail),
        "sail_date_iso": sail.date().isoformat(),
        "cost_individual": COST_INDIVIDUAL_LCL,
        "cost_consolidated": COST_CONSOLIDATED,
        "savings": COST_INDIVIDUAL_LCL - COST_CONSOLIDATED,
        "savings_rate": round(
            (COST_INDIVIDUAL_LCL - COST_CONSOLIDATED) / COST_INDIVIDUAL_LCL * 100, 1
        ),
    }


# ---------------------------------------------------------------- 운영자 화면

# 광주·전남 시군별 거점 좌표와 배정 화물량. 합계 92곳.
_DISTRICTS: list[tuple[str, str, float, float, int]] = [
    # (시군명, 권역, 위도, 경도, 시장 수)
    ("광주 동구", "광주권", 35.1461, 126.9231, 7),
    ("광주 서구", "광주권", 35.1526, 126.8895, 7),
    ("광주 남구", "광주권", 35.1330, 126.9024, 6),
    ("광주 북구", "광주권", 35.1740, 126.9120, 7),
    ("광주 광산구", "광주권", 35.1395, 126.7935, 5),
    ("나주", "광주권", 35.0160, 126.7108, 4),
    ("담양", "광주권", 35.3212, 126.9882, 3),
    ("장성", "광주권", 35.3018, 126.7849, 1),
    ("화순", "광주권", 35.0644, 126.9865, 3),
    ("함평", "광주권", 35.0658, 126.5166, 1),
    ("여수", "동부권", 34.7604, 127.6622, 7),
    ("순천", "동부권", 34.9506, 127.4872, 6),
    ("광양", "동부권", 34.9407, 127.6960, 4),
    ("곡성", "동부권", 35.2820, 127.2921, 2),
    ("구례", "동부권", 35.2026, 127.4633, 2),
    ("고흥", "동부권", 34.6111, 127.2851, 3),
    ("보성", "동부권", 34.7714, 127.0800, 2),
    ("목포", "서부권", 34.8118, 126.3922, 6),
    ("무안", "서부권", 34.9903, 126.4817, 2),
    ("영암", "서부권", 34.8000, 126.6969, 2),
    ("해남", "서부권", 34.5735, 126.5988, 3),
    ("강진", "서부권", 34.6420, 126.7673, 2),
    ("장흥", "서부권", 34.6816, 126.9070, 2),
    ("영광", "서부권", 35.2772, 126.5120, 2),
    ("완도", "서부권", 34.3110, 126.7550, 1),
    ("진도", "서부권", 34.4868, 126.2634, 1),
    ("신안", "서부권", 34.8334, 126.3515, 1),
]

_REGION_DEPOTS = {
    "광주권": {"name": "광주권 집하소", "lat": 35.1653, "lng": 126.7873},
    "동부권": {"name": "순천권 집하소", "lat": 34.9506, "lng": 127.4872},
    "서부권": {"name": "목포권 집하소", "lat": 34.8118, "lng": 126.3922},
}


def _jitter(seed: str, spread: float) -> tuple[float, float]:
    """시장별 좌표를 시군 중심에서 결정적으로 조금씩 흩뜨린다."""
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    dy = (digest[0] / 255 - 0.5) * 2 * spread
    dx = (digest[1] / 255 - 0.5) * 2 * spread
    return dy, dx


def markets() -> list[dict[str, Any]]:
    """전통시장 92곳. 좌표는 시군 중심 기준 합성 데이터(시연용)."""
    out: list[dict[str, Any]] = []
    for district, region, lat, lng, count in _DISTRICTS:
        for n in range(count):
            seed = f"{district}-{n}"
            dy, dx = _jitter(seed, 0.055)
            digest = hashlib.md5(seed.encode("utf-8")).digest()
            cargo = 1 + digest[2] % 9  # 화물량 1~9건 (원 크기)
            out.append(
                {
                    "id": f"{district}-{n + 1}",
                    "name": f"{district} 제{n + 1}시장",
                    "district": district,
                    "region": region,
                    "lat": round(lat + dy, 4),
                    "lng": round(lng + dx, 4),
                    "cargo_count": cargo,
                }
            )
    return out


# 거점 구성별 총 주행거리 비교 (PDF 운영자 화면)
ROUTE_SCENARIOS = [
    {
        "id": "individual",
        "label": "개별 발송",
        "distance_km": 11003,
        "truck_count": None,
        "description": "상인이 각자 항만까지 개별 발송하는 경우",
    },
    {
        "id": "single_depot",
        "label": "단일 거점",
        "distance_km": 2322,
        "truck_count": 11,
        "description": "광주 한 곳으로 모두 모은 뒤 항만으로 보내는 경우",
    },
    {
        "id": "three_region",
        "label": "권역 3분할",
        "distance_km": 1529,
        "truck_count": 9,
        "description": "광주권·동부권·서부권 세 거점으로 나눠 집하하는 경우",
    },
]


def admin_overview() -> dict[str, Any]:
    market_list = markets()
    regions: dict[str, dict[str, Any]] = {}
    for market in market_list:
        bucket = regions.setdefault(
            market["region"],
            {
                "region": market["region"],
                "depot": _REGION_DEPOTS[market["region"]],
                "market_count": 0,
                "cargo_count": 0,
                "market_ids": [],
            },
        )
        bucket["market_count"] += 1
        bucket["cargo_count"] += market["cargo_count"]
        bucket["market_ids"].append(market["id"])

    return {
        "market_total": len(market_list),
        "cargo_total": sum(m["cargo_count"] for m in market_list),
        "markets": market_list,
        "regions": list(regions.values()),
        "scenarios": ROUTE_SCENARIOS,
        "bounds": {"min_lat": 34.20, "max_lat": 35.42, "min_lng": 126.15, "max_lng": 127.80},
        "note": "시장 좌표와 화물량은 시연용 합성 데이터입니다.",
    }


def region_routes(scenario_id: str) -> list[dict[str, Any]]:
    """선택한 거점 구성에 따른 집하 경로(트럭별 방문 순서)."""
    market_list = markets()
    if scenario_id == "single_depot":
        groups = {"전체": market_list}
        depots = {"전체": _REGION_DEPOTS["광주권"]}
    else:
        groups = {}
        for market in market_list:
            groups.setdefault(market["region"], []).append(market)
        depots = dict(_REGION_DEPOTS)

    routes: list[dict[str, Any]] = []
    for key, group in groups.items():
        depot = depots[key]
        # 거점 기준 방위각 순으로 정렬 — 지도에서 부채꼴 모양 동선으로 보인다
        ordered = sorted(
            group,
            key=lambda m: (m["lng"] - depot["lng"], m["lat"] - depot["lat"]),
        )
        routes.append(
            {
                "region": key,
                "depot": depot,
                "stops": [
                    {"id": m["id"], "name": m["name"], "lat": m["lat"], "lng": m["lng"]}
                    for m in ordered
                ],
            }
        )
    return routes
