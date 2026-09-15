# Barista Study 개발 지침

## 프로젝트 위치

- 프로젝트 루트는 `D:\Projects\barista-study`이다.
- 모든 생성 및 수정은 이 폴더 내부에서만 수행한다.
- `D:\Projects` 아래의 다른 프로젝트는 수정하지 않는다.

## 제품 목표

- 바리스타 필기시험을 공부하는 무료 정적 웹 앱이다.
- 현재 제공 등급은 바리스타 2급이다.
- 향후 바리스타 1급을 같은 학습 엔진에 데이터 추가만으로 연결할 수 있어야 한다.
- 최종 배포 대상은 GitHub Pages이며 운영비가 들지 않는 구조를 유지한다.

## 기술 제약

- HTML, CSS, Vanilla JavaScript만 사용한다.
- 외부 프레임워크, 서버, 데이터베이스, 외부 API를 사용하지 않는다.
- 개인 학습 기록은 브라우저 `localStorage`를 사용한다.
- HTML, CSS, JavaScript와 문제 데이터를 분리한다.
- 모바일 우선 반응형 UI와 충분한 터치 영역을 유지한다.
- 과도한 애니메이션이나 불필요하게 화려한 디자인을 피한다.

## 데이터 중심 구조

기본 계층은 다음과 같다.

`시험 등급 → 학습 섹션 → 문제 → 학습/채점/오답 기록`

- 시험과 섹션 UI는 `data/exams.json`을 기준으로 생성한다.
- 시험 등급 또는 섹션을 HTML이나 등급 전용 JavaScript 로직에 하드코딩하지 않는다.
- 문제 데이터는 `data/questions/` 아래에서 시험별 JSON 파일로 관리한다.
- 학습 기록에는 반드시 exam ID를 포함하여 등급별 기록이 섞이지 않게 한다.

## 현재 안정 ID

- Exam ID: `barista_level_2`
- 문제 파일: `data/questions/level2.json`
- Section IDs:
  - `coffee_theory`
  - `espresso_extraction`
  - `milk_steaming`
  - `hot_menu`
  - `iced_menu`
  - `espresso_menu`
  - `coffee_machine`
  - `grinder`

이 ID들은 문제 데이터, 선택 상태, 오답 기록과 통계에서 동일하게 사용하며 임의로 변경하지 않는다.

## 주요 파일

- `index.html`: 앱 화면 구조
- `style.css`: 모바일 우선 반응형 스타일
- `app.js`: 데이터 로드와 공통 UI 로직
- `data/exams.json`: 시험 및 섹션 메타데이터
- `data/questions/level2.json`: 바리스타 2급 문제은행
- `source/UCEI_KCA_바리스타2급_시험문제.txt`: 2급 문제은행 구축 참고 원문

## 개발 원칙

- 사용자가 지정한 이번 작업 범위를 임의로 확장하지 않는다.
- 2급 전용 문제풀이 엔진을 만들지 않는다.
- 새 등급은 `data/exams.json` 등록과 새 문제 JSON 추가로 확장 가능하게 유지한다.
- 기존 파일을 수정하기 전에 현재 내용을 확인하고, 진행 중인 다른 작업을 보존한다.
- 변경 후 JSON 구문, JavaScript 구문, 데이터 ID, 브라우저 콘솔 오류와 모바일 레이아웃을 확인한다.

## 로컬 실행 참고

`fetch()`로 JSON을 읽으므로 `index.html`을 파일로 직접 여는 대신 프로젝트 루트에서 로컬 정적 웹 서버를 실행해 테스트한다.

예: `python -m http.server 8765 --bind 127.0.0.1`
