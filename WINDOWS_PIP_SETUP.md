# Windows pip 초기 설정 가이드

Windows 환경에서 `pip` 명령어가 안 되거나 패키지 설치가 실패할 때 처음부터 확인하는 방법입니다.

이 프로젝트는 conda 환경 `shipda`를 기준으로 합니다. 다만 사용자의 PC 상태에 따라 Python 기본 설치 방식과 conda 방식이 다를 수 있으므로 둘 다 정리합니다.

## 1. 먼저 확인할 것

`cmd`를 새로 열고 아래 명령어를 실행합니다.

```cmd
python --version
pip --version
where python
where pip
```

`python` 또는 `pip`가 인식되지 않으면 PATH 설정이 안 되었거나 Python 설치가 제대로 안 된 상태입니다.

Windows에서는 `pip` 대신 아래처럼 실행하는 것이 더 안정적입니다.

```cmd
python -m pip --version
python -m pip install -r requirements.txt
```

Python Launcher가 설치되어 있다면 아래 명령도 사용할 수 있습니다.

```cmd
py --version
py -m pip --version
py -m pip install -r requirements.txt
```

## 2. Python을 새로 설치하는 경우

공식 사이트에서 Windows용 Python을 설치합니다.

https://www.python.org/downloads/windows/

설치 화면에서 반드시 아래 옵션을 체크합니다.

```text
Add python.exe to PATH
```

설치 후 기존 `cmd` 창을 닫고 새 `cmd` 창을 엽니다.

설치 확인:

```cmd
python --version
python -m pip --version
```

pip 업그레이드:

```cmd
python -m pip install --upgrade pip
```

## 3. pip가 없다고 나오는 경우

아래 명령으로 pip를 다시 활성화합니다.

```cmd
python -m ensurepip --upgrade
python -m pip install --upgrade pip
```

`py` 명령은 되는데 `python` 명령이 안 되면 아래처럼 실행합니다.

```cmd
py -m ensurepip --upgrade
py -m pip install --upgrade pip
```

## 4. conda 환경을 사용하는 경우

Anaconda 또는 Miniconda가 설치되어 있다면 `Anaconda Prompt`를 열거나, conda가 PATH에 잡힌 `cmd`를 사용합니다.

conda 확인:

```cmd
conda --version
conda env list
```

`shipda` 환경이 없다면 생성합니다.

```cmd
conda create -n shipda python=3.11 pip
```

환경 활성화:

```cmd
conda activate shipda
```

프로젝트 폴더로 이동:

```cmd
cd /d C:\Project\Shipda
```

패키지 설치:

```cmd
python -m pip install -r requirements.txt
```

설치 확인:

```cmd
python --version
python -m pip --version
python -m pip show fastapi
python -m pip show uvicorn
```

## 5. Shipda 서버 실행

`shipda` 환경이 활성화된 상태에서 실행합니다.

```cmd
cd /d C:\Project\Shipda
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

브라우저에서 확인합니다.

```text
http://127.0.0.1:8000
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

## 6. 자주 발생하는 문제

### 'pip' is not recognized

`pip` 명령이 PATH에 없는 상태입니다. 아래 명령을 사용합니다.

```cmd
python -m pip install -r requirements.txt
```

그래도 안 되면 Python 설치 시 `Add python.exe to PATH`를 체크했는지 확인하고 Python을 재설치합니다.

### 'python' is not recognized

Python이 설치되지 않았거나 PATH에 등록되지 않은 상태입니다.

해결 방법:

```cmd
py --version
py -m pip --version
```

`py`도 안 되면 Python을 다시 설치합니다.

### conda가 인식되지 않음

일반 `cmd`가 아니라 `Anaconda Prompt`에서 실행합니다.

또는 Anaconda 설치 경로가 아래와 비슷한지 확인합니다.

```text
C:\Users\사용자명\anaconda3
C:\Users\사용자명\miniconda3
```

### 설치 중 권한 오류가 남

전역 Python에 설치하지 말고 conda 환경 또는 venv 환경을 사용합니다.

conda 권장:

```cmd
conda activate shipda
python -m pip install -r requirements.txt
```

venv를 사용할 경우:

```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 여러 Python이 설치되어 충돌함

현재 어떤 Python과 pip를 쓰는지 확인합니다.

```cmd
where python
where pip
python -m pip --version
```

설치할 때는 `pip install ...` 대신 항상 아래 방식으로 실행합니다.

```cmd
python -m pip install -r requirements.txt
```

## 7. 권장 실행 순서

처음 설정하는 팀원은 아래 순서대로 실행하면 됩니다.

```cmd
conda --version
conda create -n shipda python=3.11 pip
conda activate shipda
cd /d C:\Project\Shipda
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
