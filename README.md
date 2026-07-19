# Shipda

FastAPI 기반 서버 프로젝트입니다.

## 개발 환경

conda 환경 이름은 `shipda`입니다.

```powershell
conda activate shipda
pip install -r requirements.txt
```

## 서버 실행

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 확인

- API: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- Swagger docs: http://127.0.0.1:8000/docs
