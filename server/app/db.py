"""SQLite 저장소.

시연 중 등록한 화물과 서버에서 일어난 일이 재시작 후에도 남아야 하므로
프로세스 메모리 대신 파일 DB에 넣는다. 파일 하나라 별도 설치나 계정이 없다.

테이블 셋
  products      화물 한 건의 현재 상태 (중첩 결과는 JSON 컬럼)
  events        업무 로그. 무슨 일이 언제 일어났는지 append-only로 쌓는다
  request_logs  HTTP 접근 로그. 어떤 요청이 얼마나 걸렸는지

journal_mode는 기본값(DELETE)을 쓴다. WAL은 -wal/-shm 파일을 남기는데
이 폴더가 OneDrive 동기화 대상이라 굳이 파일을 늘리지 않는다.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

KST = timezone(timedelta(hours=9))

# 환경변수로 위치를 바꿀 수 있게 둔다 (테스트에서 임시 파일을 쓰기 위함).
# 기본 위치는 이 파일이 아니라 server/ 루트를 기준으로 잡는다 — app/ 서브패키지로
# 옮겨지기 전부터 server/shipda.db에 쌓여있던 데이터를 그대로 이어서 쓰기 위함이다.
DB_PATH = Path(os.environ.get("SHIPDA_DB") or Path(__file__).resolve().parent.parent / "shipda.db")

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None

_SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    product_id          TEXT PRIMARY KEY,
    product_name        TEXT NOT NULL,
    destination_country TEXT,
    origin              TEXT NOT NULL DEFAULT '담양',
    status              TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    finalized_at        TEXT,
    hscode_result       TEXT,
    cbm_result          TEXT,
    logistics           TEXT,
    cbm_attempts        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

CREATE TABLE IF NOT EXISTS events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    kind       TEXT NOT NULL,
    product_id TEXT,
    message    TEXT NOT NULL,
    payload    TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(id DESC);
CREATE INDEX IF NOT EXISTS idx_events_product ON events(product_id);

CREATE TABLE IF NOT EXISTS request_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL,
    method      TEXT NOT NULL,
    path        TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_request_created ON request_logs(id DESC);
"""


def now_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def connect() -> sqlite3.Connection:
    """프로세스 하나가 스레드 여러 개로 요청을 처리하므로 연결을 공유하고 락으로 감싼다."""
    global _conn
    if _conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA foreign_keys = ON")
        _conn.executescript(_SCHEMA)
        _conn.commit()
    return _conn


def execute(sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Cursor:
    conn = connect()
    with _lock:
        cursor = conn.execute(sql, params)
        conn.commit()
        return cursor


def query(sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    conn = connect()
    with _lock:
        return conn.execute(sql, params).fetchall()


def query_one(sql: str, params: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    rows = query(sql, params)
    return rows[0] if rows else None


# ---------------------------------------------------------------- JSON 컬럼


def dumps(value: Any) -> str | None:
    return None if value is None else json.dumps(value, ensure_ascii=False)


def loads(value: str | None) -> Any:
    return None if value is None else json.loads(value)


# ---------------------------------------------------------------- 로그


def log_event(
    kind: str,
    message: str,
    product_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    """업무 로그 한 줄. 실패해도 본 기능을 막지 않는다."""
    try:
        execute(
            "INSERT INTO events (created_at, kind, product_id, message, payload)"
            " VALUES (?, ?, ?, ?, ?)",
            (now_iso(), kind, product_id, message, dumps(payload)),
        )
    except sqlite3.Error:
        pass


def log_request(method: str, path: str, status_code: int, duration_ms: float) -> None:
    try:
        execute(
            "INSERT INTO request_logs (created_at, method, path, status_code, duration_ms)"
            " VALUES (?, ?, ?, ?, ?)",
            (now_iso(), method, path, status_code, round(duration_ms, 1)),
        )
    except sqlite3.Error:
        pass


def recent_events(limit: int = 50, product_id: str | None = None) -> list[dict[str, Any]]:
    if product_id:
        rows = query(
            "SELECT * FROM events WHERE product_id = ? ORDER BY id DESC LIMIT ?",
            (product_id, limit),
        )
    else:
        rows = query("SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,))

    return [
        {
            "id": row["id"],
            "created_at": row["created_at"],
            "kind": row["kind"],
            "product_id": row["product_id"],
            "message": row["message"],
            "payload": loads(row["payload"]),
        }
        for row in rows
    ]


def recent_requests(limit: int = 50) -> list[dict[str, Any]]:
    rows = query("SELECT * FROM request_logs ORDER BY id DESC LIMIT ?", (limit,))
    return [dict(row) for row in rows]


def stats() -> dict[str, Any]:
    def count(table: str) -> int:
        row = query_one(f"SELECT COUNT(*) AS n FROM {table}")
        return int(row["n"]) if row else 0

    return {
        "db_path": str(DB_PATH),
        "db_size_bytes": DB_PATH.stat().st_size if DB_PATH.exists() else 0,
        "products": count("products"),
        "events": count("events"),
        "request_logs": count("request_logs"),
    }
