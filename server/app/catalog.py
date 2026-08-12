"""품목별 HS Code 판정 카탈로그.

시연 시나리오(앱_시연_시나리오.pdf)에 나온 판정 결과를 그대로 재현한다.
상품명에 포함된 키워드로 매칭하며, 매칭되는 항목이 없으면 기본 판정을 돌려준다.
"""

from typing import Any

# 판정 상태 3단계 (기능명세서 6.3)
APPROVED = "approved"                      # 신고 가능 (녹색)
PRE_REVIEW = "pre_review_recommended"      # 사전심사 권장 (주황)
REVIEW_REQUIRED = "review_required"        # 검토 필요 (빨강)


RULINGS: list[dict[str, Any]] = [
    {
        # 시연 메인 시나리오 — 담양 떡갈비
        "keywords": ["떡갈비", "갈비", "밀키트"],
        "label": "담양 떡갈비",
        "food_type": "식육가공품 (분쇄가공육제품)",
        "storage_method": "냉동",
        "ingredients": [
            {"name": "쇠고기", "ratio": 55.0},
            {"name": "돼지고기", "ratio": 25.0},
            {"name": "양파", "ratio": 10.0},
            {"name": "기타(양념류)", "ratio": 10.0},
        ],
        "hs_code": "1602509000",
        "status": PRE_REVIEW,
        "confidence": 0.72,
        "reasoning": "HS 제16류 주1 — 육류 함량 80%가 20%를 초과하므로 제16류(육류 조제품)로 분류함",
        "review_note": (
            "관세율표에서 이 코드의 품명이 '기타'라 문언만으로 확정할 근거가 약하고, "
            "같은 문언을 가진 행이 여럿이라 검색만으로는 구분되지 않습니다. "
            "확신하지 않고 사전심사를 안내합니다."
        ),
        "alternatives": [
            {"hs_code": "1602501000", "name": "밀폐용기에 넣은 것", "confidence": 0.18},
            {"hs_code": "1602499000", "name": "돼지고기 조제품 기타", "confidence": 0.07},
        ],
    },
    {
        "keywords": ["갓김치", "돌산"],
        "label": "여수 돌산갓김치",
        "food_type": "절임식품 (김치류)",
        "storage_method": "냉장",
        "ingredients": [
            {"name": "갓", "ratio": 72.0},
            {"name": "고춧가루", "ratio": 12.0},
            {"name": "마늘", "ratio": 8.0},
            {"name": "천일염", "ratio": 8.0},
        ],
        "hs_code": "2005991000",
        "status": APPROVED,
        "confidence": 0.94,
        "reasoning": "제20류 — 초산 처리하지 않고 조제·저장 처리한 기타 채소로 분류함 (김치)",
        "review_note": "관세율표 품명이 '김치'로 명시되어 있어 문언으로 확정됩니다.",
        "alternatives": [
            {"hs_code": "2005999000", "name": "기타 채소 조제품", "confidence": 0.04},
        ],
    },
    {
        "keywords": ["배추김치", "김치"],
        "label": "일반 배추김치",
        "food_type": "절임식품 (김치류)",
        "storage_method": "냉장",
        "ingredients": [
            {"name": "배추", "ratio": 78.0},
            {"name": "고춧가루", "ratio": 10.0},
            {"name": "무", "ratio": 6.0},
            {"name": "마늘·생강", "ratio": 6.0},
        ],
        "hs_code": "2005991000",
        "status": APPROVED,
        "confidence": 0.96,
        "reasoning": "제20류 — 초산 처리하지 않고 조제·저장 처리한 기타 채소로 분류함 (김치)",
        "review_note": "관세율표 품명이 '김치'로 명시되어 있어 문언으로 확정됩니다.",
        "alternatives": [
            {"hs_code": "2005999000", "name": "기타 채소 조제품", "confidence": 0.03},
        ],
    },
    {
        "keywords": ["고추장"],
        "label": "고추장",
        "food_type": "조미식품 (고추장)",
        "storage_method": "상온",
        "ingredients": [
            {"name": "고춧가루", "ratio": 30.0},
            {"name": "찹쌀", "ratio": 28.0},
            {"name": "메주가루", "ratio": 22.0},
            {"name": "천일염", "ratio": 20.0},
        ],
        "hs_code": "2103901030",
        "status": APPROVED,
        "confidence": 0.93,
        "reasoning": "제2103호 — 소스와 소스용 조제품 중 고추장으로 국내세분 분류함",
        "review_note": "국내세분에 '고추장' 항목이 별도로 존재하여 확정됩니다.",
        "alternatives": [
            {"hs_code": "2103901090", "name": "기타 장류", "confidence": 0.05},
        ],
    },
    {
        "keywords": ["배즙", "나주", "즙"],
        "label": "나주 배즙",
        "food_type": "음료류 (과채주스)",
        "storage_method": "상온",
        "ingredients": [
            {"name": "배 착즙액", "ratio": 95.0},
            {"name": "정제수", "ratio": 5.0},
        ],
        "hs_code": "2009891090",
        "status": PRE_REVIEW,
        "confidence": 0.68,
        "reasoning": "제2009호 — 발효하지 않고 주정을 첨가하지 않은 기타 단일 과실 주스로 분류함",
        "review_note": (
            "당도(Brix)와 농축 여부에 따라 세번이 갈리는 품목입니다. "
            "표시사항만으로는 농축 환원 여부를 확정할 수 없어 사전심사를 권장합니다."
        ),
        "alternatives": [
            {"hs_code": "2009891010", "name": "농축한 것", "confidence": 0.21},
            {"hs_code": "2202999000", "name": "기타 비알코올 음료", "confidence": 0.08},
        ],
    },
    {
        "keywords": ["한과", "유과", "약과"],
        "label": "담양 한과",
        "food_type": "과자류 (유탕처리제품)",
        "storage_method": "상온",
        "ingredients": [
            {"name": "찹쌀", "ratio": 52.0},
            {"name": "물엿", "ratio": 24.0},
            {"name": "식용유지", "ratio": 14.0},
            {"name": "튀밥·깨", "ratio": 10.0},
        ],
        "hs_code": "1905901050",
        "status": REVIEW_REQUIRED,
        "confidence": 0.41,
        "reasoning": "제1905호 — 베이커리 제품 중 기타로 분류되나, 제조방식(유탕/유과)에 따라 세번이 달라짐",
        "review_note": (
            "곡물 팽화품(제1904호)과 베이커리 제품(제1905호) 사이에서 다투어지는 품목입니다. "
            "표시사항의 정보만으로는 확정할 수 없어 관세사 검토가 필요합니다."
        ),
        "alternatives": [
            {"hs_code": "1904101000", "name": "곡물 팽화제품", "confidence": 0.33},
            {"hs_code": "1905909000", "name": "기타 베이커리 제품", "confidence": 0.19},
        ],
    },
    {
        "keywords": ["표고", "버섯", "스낵"],
        "label": "장흥 표고버섯 스낵",
        "food_type": "농산가공식품 (건조농산물)",
        "storage_method": "상온",
        "ingredients": [
            {"name": "건표고버섯", "ratio": 88.0},
            {"name": "식용유지", "ratio": 8.0},
            {"name": "정제소금", "ratio": 4.0},
        ],
        "hs_code": "2003901000",
        "status": APPROVED,
        "confidence": 0.91,
        "reasoning": "제2003호 — 초산 처리하지 않고 조제·저장 처리한 버섯류로 분류함",
        "review_note": "버섯 함량이 압도적이어서 제2003호로 확정됩니다.",
        "alternatives": [
            {"hs_code": "0712390000", "name": "건조 버섯", "confidence": 0.06},
        ],
    },
]


DEFAULT_RULING: dict[str, Any] = {
    "label": "기타 가공식품",
    "food_type": "기타 가공품",
    "storage_method": "상온",
    "ingredients": [
        {"name": "주원료", "ratio": 70.0},
        {"name": "부원료", "ratio": 20.0},
        {"name": "기타", "ratio": 10.0},
    ],
    "hs_code": "2106909099",
    "status": REVIEW_REQUIRED,
    "confidence": 0.38,
    "reasoning": "제2106호 — 따로 분류되지 않은 조제 식료품으로 잠정 분류함",
    "review_note": (
        "표시사항만으로는 주된 성상을 확정할 수 없습니다. "
        "원재료와 가공방식을 직접 확인한 뒤 재판정하거나 사전심사를 신청하세요."
    ),
    "alternatives": [
        {"hs_code": "2008999000", "name": "기타 조제 과실·견과", "confidence": 0.22},
        {"hs_code": "2005999000", "name": "기타 채소 조제품", "confidence": 0.15},
    ],
}


def find_ruling(product_name: str) -> dict[str, Any]:
    """상품명 키워드로 판정 결과를 찾는다. 키워드가 긴 것부터 우선 매칭."""
    name = (product_name or "").replace(" ", "")
    best: tuple[int, dict[str, Any]] | None = None
    for ruling in RULINGS:
        for keyword in ruling["keywords"]:
            if keyword.replace(" ", "") in name:
                score = len(keyword)
                if best is None or score > best[0]:
                    best = (score, ruling)
    return best[1] if best else DEFAULT_RULING


def format_hs_code(raw: str | None) -> str | None:
    """10자리 HSK를 '0000.00-0000' 형식으로 변환."""
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) != 10:
        return raw
    return f"{digits[0:4]}.{digits[4:6]}-{digits[6:10]}"


def split_hs_code(raw: str | None) -> dict[str, str] | None:
    """시연 화면 5의 호/소호/국내세분 분해 표시용."""
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) != 10:
        return None
    return {
        "heading": digits[0:4],       # 호 — 국제 공통
        "subheading": digits[4:6],    # 소호 — 국제 공통
        "national": digits[6:10],     # 국내세분 — 관세청 신고
    }
