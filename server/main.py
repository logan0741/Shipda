"""Shipda Mock API 서버.

기능명세서(Shipda_기능명세서.md)의 엔드포인트 10개 + 시연 시나리오(PDF)의
공동물류·집하·혼재·정산·운영자 화면용 확장 엔드포인트를 제공한다.

AI 추론은 하지 않고, 시연 시나리오의 고정 결과를 돌려준다.
`force_error` 파라미터로 예외 처리 화면을 의도적으로 띄울 수 있다.

실행:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import time
from typing import Annotated, Any, Literal

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
import logistics
import store
from catalog import format_hs_code

app = FastAPI(title="Shipda Mock API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 분석 중 로딩 화면을 보여주기 위한 인위적 지연(초)
ANALYZE_DELAY = 1.6


@app.middleware("http")
async def record_request(request: Request, call_next: Any) -> Response:
    """모든 요청을 request_logs에 남긴다. 로그 자체를 읽는 요청은 제외한다."""
    started = time.perf_counter()
    response = await call_next(request)
    if not request.url.path.startswith("/admin/logs"):
        db.log_request(
            request.method,
            request.url.path,
            response.status_code,
            (time.perf_counter() - started) * 1000,
        )
    return response


def _get_or_404(product_id: str) -> dict[str, Any]:
    product = store.get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")
    return product


# ============================================================ 상품 등록


class CreateProductBody(BaseModel):
    product_name: str = Field(min_length=1)
    destination_country: str | None = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "shipda-mock-api"}


@app.get("/product/recent")
def recent_products(limit: int = Query(5, ge=1, le=50)) -> dict[str, Any]:
    items, total = store.list_products(limit=limit)
    return {"items": [store.summarize(p) for p in items], "total_count": total}


@app.get("/product/history")
def product_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    items, total = store.list_products(limit=limit, offset=(page - 1) * limit)
    return {"items": [store.summarize(p) for p in items], "total_count": total}


@app.post("/product/create", status_code=201)
def create_product(body: CreateProductBody) -> dict[str, Any]:
    name = body.product_name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="상품명을 입력해주세요.")
    product = store.create_product(name, body.destination_country)
    return {
        "product_id": product["product_id"],
        "product_name": product["product_name"],
        "destination_country": product["destination_country"],
        "created_at": product["created_at"],
    }


# ============================================================ 운송장 / 마커


@app.get("/product/{product_id}/marker")
def get_marker(product_id: str) -> dict[str, Any]:
    product = _get_or_404(product_id)
    return store.marker_payload(product)


# ============================================================ 화면 3. CBM 측정

CBM_ERRORS: dict[str, dict[str, str]] = {
    "marker_not_found": {
        "message": "운송장이 화면에 다 들어오게 찍어주세요",
        "guidance": "박스 윗면의 운송장 전체가 사진 안에 들어와야 크기를 잴 수 있습니다.",
        "action": "retake",
    },
    "marker_too_small": {
        "message": "조금 더 가까이서 찍어주세요",
        "guidance": "운송장이 너무 작게 찍히면 기준 길이의 오차가 커집니다.",
        "action": "retake",
    },
    "angle_invalid": {
        "message": "조금 더 위에서 찍어주세요",
        "guidance": "각도가 60도보다 낮으면 박스 윗면이 눌려 가로·세로가 부정확해집니다.",
        "action": "retake",
    },
    "edge_occluded": {
        "message": "박스 모서리 일부가 가려졌어요",
        "guidance": "네 모서리를 손가락으로 직접 지정하면 그대로 계산할 수 있습니다.",
        "action": "manual_corners",
    },
}

# 정상 인식 시 촬영 이미지 위에 그릴 윤곽선 (0~1 정규화 좌표)
DEMO_OVERLAY = {
    "marker": [[0.440, 0.380], [0.600, 0.365], [0.630, 0.425], [0.465, 0.440]],
    "box_top": [[0.280, 0.340], [0.720, 0.300], [0.840, 0.460], [0.360, 0.520]],
    "box_bottom": [[0.280, 0.600], [0.720, 0.560], [0.840, 0.720], [0.360, 0.780]],
}


@app.post("/product/{product_id}/cbm/predict")
async def predict_cbm(
    product_id: str,
    image: Annotated[UploadFile, File()],
    device_angle: Annotated[float, Form()] = 65.0,
    force_error: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    product = _get_or_404(product_id)
    await image.read()  # 업로드는 받되 저장하지 않는다 (시연용)
    await asyncio.sleep(ANALYZE_DELAY)

    product["cbm_attempts"] = product.get("cbm_attempts", 0) + 1

    reason: str | None = None
    if force_error in CBM_ERRORS:
        reason = force_error
    elif device_angle < 60:
        reason = "angle_invalid"

    if reason:
        info = CBM_ERRORS[reason]
        store.save(product)  # 실패 횟수도 기록으로 남긴다
        db.log_event(
            "cbm.predict.fail",
            f"체적 측정 실패: {info['message']}",
            product_id,
            {"reason": reason, "device_angle": device_angle, "attempts": product["cbm_attempts"]},
        )
        return {
            "success": False,
            "dimensions": None,
            "cbm": None,
            "error_reason": reason,
            "message": info["message"],
            "guidance": info["guidance"],
            "action": info["action"],
            "attempts": product["cbm_attempts"],
            # 기능명세서 3.4 — 3회 이상 연속 실패 시 직접 입력을 강조한다
            "suggest_manual": product["cbm_attempts"] >= 3,
        }

    dims = store.DEMO_DIMENSIONS
    product["cbm_attempts"] = 0
    store.touch(product)
    db.log_event(
        "cbm.predict",
        f"체적 측정 성공: {store.calc_cbm(**dims)} CBM",
        product_id,
        {"dimensions": dims, "device_angle": device_angle},
    )
    return {
        "success": True,
        "dimensions": dims,
        "cbm": store.calc_cbm(**dims),
        "error_reason": None,
        "message": None,
        "guidance": None,
        "action": "confirm",
        "attempts": 0,
        "suggest_manual": False,
        "device_angle": device_angle,
        "overlay": DEMO_OVERLAY,
    }


class CbmManualBody(BaseModel):
    width_mm: float = Field(gt=0)
    depth_mm: float = Field(gt=0)
    height_mm: float = Field(gt=0)
    weight_kg: float | None = Field(default=None, ge=0)


@app.post("/product/{product_id}/cbm/manual")
def manual_cbm(product_id: str, body: CbmManualBody) -> dict[str, Any]:
    product = _get_or_404(product_id)
    result = store.build_cbm_result(
        body.width_mm, body.depth_mm, body.height_mm, body.weight_kg, input_method="manual"
    )
    product["cbm_result"] = result
    product["cbm_attempts"] = 0
    store.touch(product)
    db.log_event("cbm.manual", f"체적 직접 입력: {result['cbm']} CBM", product_id, result)
    return {"cbm": result["cbm"], "cbm_result": result}


class CbmConfirmBody(BaseModel):
    width_mm: float = Field(gt=0)
    depth_mm: float = Field(gt=0)
    height_mm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    input_method: Literal["ai", "manual"] = "ai"


@app.post("/product/{product_id}/cbm/confirm")
def confirm_cbm(product_id: str, body: CbmConfirmBody) -> dict[str, Any]:
    """무게 입력까지 마친 CBM 결과를 확정 저장한다."""
    product = _get_or_404(product_id)
    result = store.build_cbm_result(
        body.width_mm, body.depth_mm, body.height_mm, body.weight_kg, body.input_method
    )
    product["cbm_result"] = result
    store.touch(product)
    db.log_event(
        "cbm.confirm",
        f"체적 확정: {result['cbm']} CBM ({body.input_method})",
        product_id,
        result,
    )
    return {"cbm_result": result}


# ============================================================ 화면 4-5. HS Code

HSCODE_ERRORS: dict[str, dict[str, str]] = {
    "text_unreadable": {
        "message": "표시사항을 읽지 못했어요",
        "guidance": "글자가 흔들리거나 빛이 반사되면 인식되지 않습니다. 원재료를 직접 입력해 주세요.",
        "action": "manual_input",
    },
}


@app.post("/product/{product_id}/hscode/predict")
async def predict_hscode(
    product_id: str,
    image: Annotated[UploadFile, File()],
    force_error: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    product = _get_or_404(product_id)
    await image.read()
    await asyncio.sleep(ANALYZE_DELAY)

    if force_error == "text_unreadable":
        info = HSCODE_ERRORS["text_unreadable"]
        return {
            "success": False,
            "error_reason": "text_unreadable",
            "message": info["message"],
            "guidance": info["guidance"],
            "action": info["action"],
            "hscode_result": None,
        }

    ratios_missing = force_error == "ratio_missing"
    result = store.build_hscode_result(
        product["product_name"], ratios_missing=ratios_missing
    )
    if ratios_missing:
        result["ingredients"] = [
            {"name": item["name"], "ratio": None} for item in result["ingredients"]
        ]

    product["hscode_result"] = result
    store.touch(product)
    db.log_event(
        "hscode.predict",
        f"HS Code 판정: {result['hs_code_formatted']} ({result['status']})",
        product_id,
        {"confidence": result["confidence"], "ratios_missing": ratios_missing},
    )
    return {
        "success": True,
        "error_reason": None,
        "message": None,
        "guidance": None,
        "action": "confirm",
        "product_label": result["label"],
        "ingredients": result["ingredients"],
        "food_type": result["food_type"],
        "storage_method": result["storage_method"],
        "hscode_result": result,
    }


class Ingredient(BaseModel):
    name: str
    ratio: float | None = None


class HsManualBody(BaseModel):
    ingredients: list[Ingredient]
    food_type: str
    storage_method: str


@app.post("/product/{product_id}/hscode/manual")
def manual_hscode(product_id: str, body: HsManualBody) -> dict[str, Any]:
    product = _get_or_404(product_id)
    result = store.build_manual_hscode_result(
        [i.model_dump() for i in body.ingredients], body.food_type, body.storage_method
    )
    product["hscode_result"] = result
    store.touch(product)
    db.log_event(
        "hscode.manual",
        "HS Code 직접 입력 (자동 판정 미수행)",
        product_id,
        {"food_type": body.food_type, "storage_method": body.storage_method},
    )
    return {"hscode_result": result}


class HsReviseBody(BaseModel):
    """화면 4의 인라인 [수정] — 고친 표시사항으로 다시 판정한다."""

    ingredients: list[Ingredient]
    food_type: str
    storage_method: str


@app.post("/product/{product_id}/hscode/revise")
async def revise_hscode(product_id: str, body: HsReviseBody) -> dict[str, Any]:
    product = _get_or_404(product_id)
    await asyncio.sleep(0.8)
    ratios_missing = any(i.ratio is None for i in body.ingredients)
    result = store.build_hscode_result(
        product["product_name"],
        ingredients=[i.model_dump() for i in body.ingredients],
        food_type=body.food_type,
        storage_method=body.storage_method,
        ratios_missing=ratios_missing,
    )
    product["hscode_result"] = result
    store.touch(product)
    db.log_event(
        "hscode.revise",
        f"표시사항 수정 후 재판정: {result['hs_code_formatted']} ({result['status']})",
        product_id,
        {"ratios_missing": ratios_missing},
    )
    return {"hscode_result": result}


class HsSelectBody(BaseModel):
    """차순위 후보를 사용자가 직접 고른 경우."""

    hs_code: str


@app.post("/product/{product_id}/hscode/select")
def select_hscode(product_id: str, body: HsSelectBody) -> dict[str, Any]:
    product = _get_or_404(product_id)
    result = product.get("hscode_result")
    if not result:
        raise HTTPException(status_code=409, detail="판정 결과가 아직 없습니다.")

    chosen = next(
        (a for a in result["alternatives"] if a["hs_code"] == body.hs_code), None
    )
    if chosen is None:
        raise HTTPException(status_code=422, detail="후보 목록에 없는 코드입니다.")

    from catalog import split_hs_code

    result = {
        **result,
        "hs_code": chosen["hs_code"],
        "hs_code_formatted": format_hs_code(chosen["hs_code"]),
        "hs_code_parts": split_hs_code(chosen["hs_code"]),
        "confidence": chosen["confidence"],
        "status": "review_required",
        "reasoning": f"사용자가 차순위 후보({chosen['name']})를 직접 선택함",
        "review_note": "자동 판정보다 신뢰도가 낮은 후보를 선택했습니다. 사전심사를 권장합니다.",
        "input_method": "manual",
    }
    product["hscode_result"] = result
    store.touch(product)
    db.log_event(
        "hscode.select",
        f"차순위 후보 직접 선택: {result['hs_code_formatted']}",
        product_id,
        {"name": chosen["name"], "confidence": chosen["confidence"]},
    )
    return {"hscode_result": result}


# ============================================================ 화면 6. 결과 요약


@app.get("/product/{product_id}/summary")
def get_summary(product_id: str) -> dict[str, Any]:
    product = _get_or_404(product_id)
    return {
        "product_id": product["product_id"],
        "product_name": product["product_name"],
        "destination_country": product["destination_country"],
        "origin": product["origin"],
        "status": product["status"],
        "created_at": product["created_at"],
        "finalized_at": product["finalized_at"],
        "hscode_result": product["hscode_result"],
        "cbm_result": product["cbm_result"],
        "logistics": product["logistics"],
    }


@app.post("/product/{product_id}/finalize")
def finalize(product_id: str) -> dict[str, Any]:
    product = _get_or_404(product_id)
    product["status"] = "completed"
    product["finalized_at"] = store.now_iso()
    product["updated_at"] = product["finalized_at"]
    store.save(product)
    db.log_event("product.finalize", "등록 확정", product_id)
    return {"status": "completed", "finalized_at": product["finalized_at"]}


# ============================================================ 화면 7-9. 공동물류


@app.post("/product/{product_id}/logistics/apply")
def apply_logistics(product_id: str) -> dict[str, Any]:
    product = _get_or_404(product_id)
    pickup = logistics.pickup_info()
    product["logistics"] = {
        "applied": True,
        "applied_at": store.now_iso(),
        "stage": "pickup",
        # 신청 시점의 집하 배정을 그대로 보관한다. 나중에 조회해도 같은 값이 나와야 한다.
        "pickup": pickup,
    }
    product["status"] = "completed"
    product["finalized_at"] = product["logistics"]["applied_at"]
    store.save(product)
    db.log_event(
        "logistics.apply",
        f"공동물류 신청: {pickup['depot']['name']} / {pickup['date_label']} {pickup['window_start']}",
        product_id,
        {"depot": pickup["depot"]["name"], "date": pickup["date_iso"], "vehicle": pickup["vehicle"]},
    )
    return {"applied": True, "pickup": pickup}


@app.get("/product/{product_id}/logistics/pickup")
def get_pickup(product_id: str) -> dict[str, Any]:
    """신청 때 저장해 둔 집하 배정을 돌려준다. 아직 신청 전이면 예정 배정을 계산해 보여준다."""
    product = _get_or_404(product_id)
    stored = (product.get("logistics") or {}).get("pickup")
    return stored or logistics.pickup_info()


@app.get("/product/{product_id}/logistics/consolidation")
def get_consolidation(product_id: str) -> dict[str, Any]:
    product = _get_or_404(product_id)
    cbm = (product.get("cbm_result") or {}).get("cbm")
    storage = (product.get("hscode_result") or {}).get("storage_method")
    return logistics.consolidation_status(cbm, storage)


@app.get("/product/{product_id}/logistics/shipment")
def get_shipment(product_id: str) -> dict[str, Any]:
    _get_or_404(product_id)
    return logistics.shipment_result()


# ============================================================ 운영자 화면


@app.get("/admin/overview")
def admin_overview() -> dict[str, Any]:
    return logistics.admin_overview()


@app.get("/admin/routes")
def admin_routes(
    scenario: Literal["single_depot", "three_region"] = "three_region",
) -> dict[str, Any]:
    return {"scenario": scenario, "routes": logistics.region_routes(scenario)}


# ============================================================ 기록 조회


@app.get("/admin/logs/events")
def admin_events(
    limit: int = Query(50, ge=1, le=500),
    product_id: str | None = None,
) -> dict[str, Any]:
    """업무 로그. 어떤 화물에 무슨 일이 있었는지 최신순으로."""
    return {"items": db.recent_events(limit=limit, product_id=product_id)}


@app.get("/admin/logs/requests")
def admin_requests(limit: int = Query(50, ge=1, le=500)) -> dict[str, Any]:
    """HTTP 접근 로그."""
    return {"items": db.recent_requests(limit=limit)}


@app.get("/admin/logs/stats")
def admin_stats() -> dict[str, Any]:
    """DB 위치와 테이블별 적재량."""
    return db.stats()


# ============================================================ 시연 보조


@app.get("/demo/scenarios")
def demo_scenarios() -> dict[str, Any]:
    """설정 화면의 '시연 모드'에서 예외 화면을 강제로 띄우기 위한 목록."""
    return {
        "cbm": [
            {"id": None, "label": "정상 인식"},
            *[
                {"id": key, "label": value["message"]}
                for key, value in CBM_ERRORS.items()
            ],
        ],
        "hscode": [
            {"id": None, "label": "정상 인식"},
            {"id": "text_unreadable", "label": "표시사항을 읽지 못했어요"},
            {"id": "ratio_missing", "label": "원재료 함량이 없음"},
        ],
    }
