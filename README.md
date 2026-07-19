# Shipda

FastAPI 기반 서버 프로젝트입니다.

## 핵심 주의사항

이 프로젝트는 `shipda` conda 환경의 Python 3.11 기준으로 실행합니다.

아래처럼 전역 Python 3.8의 `pip`로 설치하면 버전 충돌이 날 수 있습니다.

```powershell
pip install -r requirements.txt
```

항상 conda 환경을 활성화한 뒤 아래처럼 설치합니다.

```powershell
python -m pip install -r requirements.txt
```

## PowerShell에서 conda가 안 잡힐 때

`conda activate shipda`에서 아래 오류가 나면 PowerShell이 conda를 아직 모르는 상태입니다.

```text
conda : 'conda' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다.
```

현재 PC처럼 Anaconda가 `C:\Users\logan\anaconda3`에 설치되어 있다면 PowerShell에서 먼저 아래 명령을 실행합니다.

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
```

정상 활성화 확인:

```powershell
python --version
python -m pip --version
```

정상이라면 Python 경로가 `anaconda3\envs\shipda` 아래로 나와야 합니다.

## conda 영구 초기화

PowerShell을 열 때마다 위 hook 명령을 치기 싫다면 한 번만 초기화합니다.

```powershell
$env:PYTHONIOENCODING="utf-8"
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" init powershell
```

그 다음 PowerShell을 완전히 닫고 새로 엽니다.

```powershell
conda activate shipda
```

그래도 안 되면 아래 hook 방식을 계속 사용하면 됩니다.

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
```

## cmd에서 실행하는 방법

PowerShell 대신 `cmd`에서는 아래 방식이 안정적으로 동작합니다.

```cmd
C:\Users\logan\anaconda3\condabin\conda.bat activate shipda
cd /d C:\Project\Shipda
python --version
python -m pip --version
```

## 패키지 설치

```powershell
conda activate shipda
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

`conda activate`가 안 되는 PowerShell에서는:

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

활성화 없이 바로 설치해야 하면:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python -m pip install -r requirements.txt
```

## 패키지 설치 확인

```powershell
python scripts/check_requirements.py
```

활성화 없이 확인:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python scripts/check_requirements.py
```

## 서버 실행

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

활성화 없이 실행:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 확인 URL

- API: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- Swagger docs: http://127.0.0.1:8000/docs
