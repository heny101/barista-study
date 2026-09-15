# Barista Study

바리스타 필기시험을 공부하는 모바일 우선 정적 웹 앱입니다. 현재 바리스타 2급 문제은행 205문제를 제공하며, HTML/CSS/Vanilla JavaScript만 사용합니다.

## 실행 방법

JSON 데이터를 `fetch()`로 불러오므로 `index.html`을 파일로 직접 열지 말고 정적 웹 서버에서 실행하세요.

```powershell
cd D:\Projects\barista-study
python -m http.server 8765 --bind 127.0.0.1
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다.

## 로컬 테스트

앱을 연 뒤 시험 선택, 단원 학습, 여러 단원 학습, 모의 평가 시험, 오답노트와 새로고침 후 기록 유지를 확인합니다. JavaScript와 JSON의 기본 구문은 다음처럼 점검할 수 있습니다.

```powershell
node --check app.js
Get-Content data\exams.json -Raw | ConvertFrom-Json | Out-Null
Get-Content data\questions\level2.json -Raw | ConvertFrom-Json | Out-Null
```

## GitHub Pages 배포

프로젝트를 GitHub 저장소의 기본 브랜치에 올린 뒤 저장소의 **Settings → Pages**에서 **Deploy from a branch**를 선택하고, 기본 브랜치의 `/ (root)` 폴더를 지정합니다. 모든 앱 경로는 저장소 하위 경로에서도 동작하도록 상대 경로를 사용합니다.

## 학습 기록

개인 학습 기록은 서버로 전송하지 않고 현재 브라우저의 `localStorage`에 저장합니다.

- 일반 학습 기록: `baristaStudy.learningRecords.v1`
- 오답노트: `baristaStudy.wrongNotes.v1`

브라우저 데이터 삭제, 시크릿 모드 종료 또는 다른 브라우저·기기로 이동하면 기록이 유지되지 않을 수 있습니다.
