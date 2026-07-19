# Windows pip 및 conda 초기 설정 가이드

Windows에서 `pip` 설치가 실패하거나 `conda activate shipda`가 안 될 때 확인하는 절차입니다.

## 현재 오류 원인

아래 오류는 conda가 설치되지 않았다는 뜻이 아니라, 현재 PowerShell이 conda 명령을 찾지 못한다는 뜻입니다.

```text
conda : 'conda' 용어가 cmdlet, 함수, 스크립트 파일 또는 실행할 수 있는 프로그램 이름으로 인식되지 않습니다.
```

그 상태에서 아래 명령을 실행하면 conda 환경이 아니라 전역 Python에 설치됩니다.

```powershell
pip install -r requirements.txt
```

실제 로그에서는 `pip`가 아래 Python 3.8 환경을 사용하고 있었습니다.

```text
C:\Users\logan\AppData\Local\Programs\Python\Python38
```

Shipda는 conda 환경 `shipda`, Python 3.11 기준으로 맞춥니다.

## 1. conda 설치 위치 확인

PowerShell에서 아래 명령을 실행합니다.

```powershell
Test-Path "$env:USERPROFILE\anaconda3\Scripts\conda.exe"
Test-Path "$env:USERPROFILE\miniconda3\Scripts\conda.exe"
```

`True`가 나오면 해당 위치에 conda가 설치되어 있습니다.

현재 PC 기준 Anaconda 경로:

```text
C:\Users\logan\anaconda3
```

## 2. PowerShell에서 즉시 conda 활성화

PowerShell에서 `conda`가 인식되지 않으면 먼저 conda hook을 실행합니다.

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
```

정상 확인:

```powershell
python --version
python -m pip --version
```

정상이라면 아래처럼 `shipda` 환경 경로가 보여야 합니다.

```text
Python 3.11.x
...\anaconda3\envs\shipda\Lib\site-packages\pip
```

## 3. PowerShell conda 영구 초기화

매번 hook 명령을 치지 않으려면 한 번만 초기화합니다.

```powershell
$env:PYTHONIOENCODING="utf-8"
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" init powershell
```

초기화 후 PowerShell을 완전히 닫고 새 PowerShell을 엽니다.

```powershell
conda activate shipda
```

초기화 후에도 `conda`가 안 잡히면 아래 방식으로 계속 실행합니다.

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
```

## 4. cmd에서 conda 활성화

`cmd`에서는 아래 명령을 사용합니다.

```cmd
C:\Users\logan\anaconda3\condabin\conda.bat activate shipda
```

프로젝트로 이동:

```cmd
cd /d C:\Project\Shipda
```

확인:

```cmd
python --version
python -m pip --version
```

## 5. shipda 환경이 없을 때 생성

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" create -y -n shipda python=3.11 pip
```

환경 목록 확인:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" env list
```

## 6. 패키지 설치

반드시 `shipda` 환경을 활성화한 뒤 설치합니다.

```powershell
conda activate shipda
cd C:\Project\Shipda
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

PowerShell에서 `conda activate`가 안 되면:

```powershell
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
cd C:\Project\Shipda
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

활성화 없이 바로 설치:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python -m pip install -r requirements.txt
```

## 7. 설치 확인

체크 전에 설치를 먼저 해야 합니다.

```powershell
python -m pip install -r requirements.txt
python scripts/check_requirements.py
```

활성화 없이 확인:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python -m pip install -r requirements.txt
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python scripts/check_requirements.py
```

`[MISSING] fastapi` 또는 `[MISSING] uvicorn`이 뜨면 아직 현재 Python 환경에 패키지가 설치되지 않은 상태입니다.

체크 출력에서 아래 경로를 확인합니다.

```text
Python executable: ...\anaconda3\envs\shipda\python.exe
```

다른 경로가 나오면 `shipda` 환경이 아닌 Python으로 체크하고 있는 것입니다.

## 8. 서버 실행

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

활성화 없이 실행:

```powershell
& "$env:USERPROFILE\anaconda3\Scripts\conda.exe" run -n shipda python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

확인 URL:

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

## 9. 하지 말아야 할 명령

아래 명령은 잘못된 명령입니다.

```powershell
pip conda activate shipda
```

`conda activate`는 pip 명령이 아닙니다.

아래 명령도 conda 환경이 활성화되지 않은 상태에서는 사용하지 않습니다.

```powershell
pip install -r requirements.txt
```

대신 항상 아래처럼 실행합니다.

```powershell
python -m pip install -r requirements.txt
```

## 10. 빠른 해결 순서

현재 PC에서 바로 해결하려면 PowerShell에 아래 순서대로 입력합니다.

```powershell
cd C:\Project\Shipda
& "$env:USERPROFILE\anaconda3\shell\condabin\conda-hook.ps1"
conda activate shipda
python --version
python -m pip --version
python -m pip install -r requirements.txt
python scripts/check_requirements.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
