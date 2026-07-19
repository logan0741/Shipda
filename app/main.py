from fastapi import FastAPI

app = FastAPI(
    title="Shipda API",
    description="FastAPI server for the Shipda project.",
    version="0.1.0",
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Shipda API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
