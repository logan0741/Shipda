"""상품 저장소.

실제 저장은 db.py(SQLite)가 맡고, 여기서는 화면이 쓰는 형태의 dict로 오간다.
중첩 결과(hscode_result, cbm_result, logistics)는 JSON 컬럼에 통째로 넣는다.

호출부는 dict를 그대로 고친 뒤 save() 또는 touch()를 불러 반영한다.
dict만 고치고 저장하지 않으면 DB에 남지 않는다.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import db
from catalog import APPROVED, PRE_REVIEW, find_ruling, format_hs_code, split_hs_code

KST = timezone(timedelta(hours=9))

now_iso = db.now_iso

_JSON_FIELDS = ("hscode_result", "cbm_result", "logistics")


# ---------------------------------------------------------------- 마커(운송장)

MARKER_SIZE_MM = 50  # 기준자 역할을 하는 마커 한 변의 실제 인쇄 크기


def marker_pattern(product_id: str) -> list[list[int]]:
    """product_id에서 결정적으로 6x6 마커 비트 패턴을 만든다.

    바깥 테두리는 항상 채우고(검출용 쿼드), 안쪽 4x4만 데이터 비트로 쓴다.
    같은 product_id면 항상 같은 패턴이 나오므로 출력물과 인식 결과가 일치한다.
    """
    digest = hashlib.sha256(product_id.encode("utf-8")).digest()
    grid = [[1] * 6 for _ in range(6)]
    for row in range(4):
        for col in range(4):
            bit = (digest[row * 4 + col] >> 3) & 1
            grid[row + 1][col + 1] = bit
    # 방향 판별용 기준점 — 좌상단 내부는 항상 0, 우하단 내부는 항상 1
    grid[1][1] = 0
    grid[4][4] = 1
    return grid


def marker_payload(product: dict[str, Any]) -> dict[str, Any]:
    pid = product["product_id"]
    return {
        "marker_id": pid[:8].upper(),
        "marker_size_mm": MARKER_SIZE_MM,
        "pattern": marker_pattern(pid),
        "waybill": {
            "product_name": product["product_name"],
            "destination_country": product.get("destination_country") or "-",
            "origin": product.get("origin") or "담양",
            "issued_at": product["created_at"],
            "tracking_no": f"SHD-{pid[:4].upper()}-{pid[4:8].upper()}",
        },
        # 기능명세서 호환 필드 — 앱은 pattern으로 직접 렌더링하므로 참고용
        "marker_image_url": f"/product/{pid}/marker.svg",
    }


# ---------------------------------------------------------------- 상품 CRUD


def _to_row(product: dict[str, Any]) -> tuple[Any, ...]:
    return (
        product["product_name"],
        product["destination_country"],
        product["origin"],
        product["status"],
        product["created_at"],
        product["updated_at"],
        product["finalized_at"],
        db.dumps(product["hscode_result"]),
        db.dumps(product["cbm_result"]),
        db.dumps(product["logistics"]),
        product["cbm_attempts"],
        product["product_id"],
    )


def _from_row(row: Any) -> dict[str, Any]:
    product = dict(row)
    for field in _JSON_FIELDS:
        product[field] = db.loads(product[field])
    return product


def create_product(product_name: str, destination_country: str | None) -> dict[str, Any]:
    pid = str(uuid.uuid4())
    ts = now_iso()
    product = {
        "product_id": pid,
        "product_name": product_name.strip(),
        "destination_country": (destination_country or "").strip() or None,
        "origin": "담양",
        "status": "draft",
        "created_at": ts,
        "updated_at": ts,
        "finalized_at": None,
        "hscode_result": None,
        "cbm_result": None,
        "logistics": None,
        "cbm_attempts": 0,
    }
    db.execute(
        "INSERT INTO products (product_id, product_name, destination_country, origin, status,"
        " created_at, updated_at, finalized_at, hscode_result, cbm_result, logistics, cbm_attempts)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            pid,
            product["product_name"],
            product["destination_country"],
            product["origin"],
            product["status"],
            product["created_at"],
            product["updated_at"],
            product["finalized_at"],
            None,
            None,
            None,
            0,
        ),
    )
    db.log_event(
        "product.create",
        f"화물 등록: {product['product_name']}",
        pid,
        {"destination_country": product["destination_country"]},
    )
    return product


def get_product(product_id: str) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM products WHERE product_id = ?", (product_id,))
    return _from_row(row) if row else None


def save(product: dict[str, Any]) -> None:
    """dict의 현재 내용을 DB에 반영한다."""
    db.execute(
        "UPDATE products SET product_name = ?, destination_country = ?, origin = ?, status = ?,"
        " created_at = ?, updated_at = ?, finalized_at = ?, hscode_result = ?, cbm_result = ?,"
        " logistics = ?, cbm_attempts = ? WHERE product_id = ?",
        _to_row(product),
    )


def touch(product: dict[str, Any]) -> None:
    """수정 시각을 올리고 저장한다. draft 상태면 진행중으로 승격한다."""
    product["updated_at"] = now_iso()
    if product["status"] == "draft":
        product["status"] = "in_progress"
    save(product)


def list_products(limit: int = 5, offset: int = 0) -> tuple[list[dict[str, Any]], int]:
    rows = db.query(
        "SELECT * FROM products ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    total_row = db.query_one("SELECT COUNT(*) AS n FROM products")
    total = int(total_row["n"]) if total_row else 0
    return [_from_row(row) for row in rows], total


def summarize(product: dict[str, Any]) -> dict[str, Any]:
    """리스트 카드용 축약 표현."""
    hs = product.get("hscode_result") or {}
    return {
        "product_id": product["product_id"],
        "product_name": product["product_name"],
        "destination_country": product.get("destination_country"),
        "hs_code": format_hs_code(hs.get("hs_code")),
        "hs_status": hs.get("status"),
        "cbm": (product.get("cbm_result") or {}).get("cbm"),
        "status": product["status"],
        "created_at": product["created_at"],
    }


# ---------------------------------------------------------------- HS Code


def build_hscode_result(
    product_name: str,
    *,
    ingredients: list[dict[str, Any]] | None = None,
    food_type: str | None = None,
    storage_method: str | None = None,
    input_method: str = "ai",
    ratios_missing: bool = False,
) -> dict[str, Any]:
    ruling = find_ruling(product_name)

    result_ingredients = ingredients if ingredients is not None else ruling["ingredients"]
    status = ruling["status"]
    confidence = ruling["confidence"]
    reasoning = ruling["reasoning"]
    review_note = ruling.get("review_note", "")

    # 기능명세서 3.3 예외처리 — 원재료 함량 정보가 없으면 판정 상태를 강등한다
    if ratios_missing and status == APPROVED:
        status = PRE_REVIEW
        review_note = "표시사항에서 원재료 함량(%)을 읽지 못했습니다. 함량 확인 후 확정이 필요합니다."

    return {
        "hs_code": ruling["hs_code"],
        "hs_code_formatted": format_hs_code(ruling["hs_code"]),
        "hs_code_parts": split_hs_code(ruling["hs_code"]),
        "status": status,
        "confidence": confidence,
        "reasoning": reasoning,
        "review_note": review_note,
        "ingredients": result_ingredients,
        "food_type": food_type or ruling["food_type"],
        "storage_method": storage_method or ruling["storage_method"],
        "label": ruling["label"],
        "alternatives": [
            {**alt, "hs_code_formatted": format_hs_code(alt["hs_code"])}
            for alt in ruling["alternatives"]
        ],
        "input_method": input_method,
    }


def build_manual_hscode_result(
    ingredients: list[dict[str, Any]],
    food_type: str,
    storage_method: str,
) -> dict[str, Any]:
    """기능명세서 3.3 — 수동 입력은 AI 판정 없이 '검토 필요'로 저장한다."""
    return {
        "hs_code": None,
        "hs_code_formatted": None,
        "hs_code_parts": None,
        "status": "review_required",
        "confidence": None,
        "reasoning": "사용자 직접 입력 - AI 판정 미수행",
        "review_note": "직접 입력한 내용은 자동 판정하지 않습니다. 관세사 검토 또는 사전심사를 신청하세요.",
        "ingredients": ingredients,
        "food_type": food_type,
        "storage_method": storage_method,
        "label": None,
        "alternatives": [],
        "input_method": "manual",
    }


# ---------------------------------------------------------------- CBM

# 시연 시나리오 고정 치수 — 600 x 450 x 400 mm = 0.108 CBM
DEMO_DIMENSIONS = {"width_mm": 600, "depth_mm": 450, "height_mm": 400}


def calc_cbm(width_mm: float, depth_mm: float, height_mm: float) -> float:
    return round(width_mm * depth_mm * height_mm / 1_000_000_000, 4)


def build_cbm_result(
    width_mm: float,
    depth_mm: float,
    height_mm: float,
    weight_kg: float | None,
    input_method: str = "ai",
) -> dict[str, Any]:
    return {
        "width_mm": width_mm,
        "depth_mm": depth_mm,
        "height_mm": height_mm,
        "cbm": calc_cbm(width_mm, depth_mm, height_mm),
        "weight_kg": weight_kg,
        "input_method": input_method,
    }


# ---------------------------------------------------------------- 시드 데이터


def _seed() -> None:
    """홈/이력 화면이 비어 보이지 않도록 완료된 화물 몇 건을 미리 넣는다.

    DB에 이미 데이터가 있으면 건너뛴다. 재시작할 때마다 늘어나면 안 된다.
    """
    existing = db.query_one("SELECT COUNT(*) AS n FROM products")
    if existing and int(existing["n"]) > 0:
        return

    seeds = [
        ("여수 돌산갓김치", "일본", 3, True),
        ("나주 배즙", "베트남", 8, True),
        ("장흥 표고버섯 스낵", "미국", 15, False),
    ]
    for name, country, days_ago, finalized in seeds:
        product = create_product(name, country)
        created = datetime.now(KST) - timedelta(days=days_ago)
        product["created_at"] = created.isoformat(timespec="seconds")
        product["updated_at"] = product["created_at"]
        product["hscode_result"] = build_hscode_result(name)
        product["cbm_result"] = build_cbm_result(480, 320, 260, 12.5)
        if finalized:
            product["status"] = "completed"
            product["finalized_at"] = product["created_at"]
        else:
            product["status"] = "in_progress"
        save(product)

    db.log_event("db.seed", f"시드 화물 {len(seeds)}건 생성")


_seed()
