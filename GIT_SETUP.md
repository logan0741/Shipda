# Git 설치 및 cmd 설정 방법

Windows `cmd` 기준 Git 설치와 기본 설정 방법입니다.

## 1. Git 설치

아래 공식 사이트에서 Windows용 Git을 다운로드합니다.

https://git-scm.com/download/win

설치 중 선택 항목은 대부분 기본값을 사용하면 됩니다.

중요한 옵션:

```text
Git from the command line and also from 3rd-party software
```

설치가 끝나면 기존 `cmd` 창을 닫고 새 `cmd` 창을 엽니다.

설치 확인:

```cmd
git --version
```

## 2. Git 기본 정보 설정

커밋에 사용할 이름과 이메일을 설정합니다.

```cmd
git config --global user.name "이름"
git config --global user.email "이메일@example.com"
```

기본 브랜치 이름을 `main`으로 설정합니다.

```cmd
git config --global init.defaultBranch main
```

Windows 줄바꿈 처리를 설정합니다.

```cmd
git config --global core.autocrlf true
```

설정 확인:

```cmd
git config --global --list
```

## 3. Shipda 프로젝트에서 Git 사용

프로젝트 폴더로 이동합니다.

```cmd
cd /d C:\Project\Shipda
```

현재 상태 확인:

```cmd
git status
```

변경 파일 추가:

```cmd
git add .
```

커밋 생성:

```cmd
git commit -m "Initial FastAPI project setup"
```

## 4. GitHub 원격 저장소 연결

GitHub에서 빈 repository를 만든 뒤, repository 주소를 연결합니다.

```cmd
git remote add origin https://github.com/사용자명/저장소명.git
```

원격 저장소 확인:

```cmd
git remote -v
```

처음 push:

```cmd
git push -u origin main
```

이미 `origin`이 등록되어 있으면 주소를 수정합니다.

```cmd
git remote set-url origin https://github.com/사용자명/저장소명.git
```

## 5. 자주 쓰는 명령어

```cmd
git status
git add .
git commit -m "커밋 메시지"
git pull
git push
```
