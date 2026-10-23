# BEYOND THE SURFACE

## DEEPER 포트폴리오 챗봇

오른쪽 아래 `ASK DEEPER` 버블에서 대표 작업, 딥디크 기여 내용, 사용 도구, 소개와 연락 방법을 질문할 수 있습니다. 추천 질문과 직접 입력을 모두 지원하며 답변의 링크는 사이트 내 해당 작업으로 이동합니다. 이 안내 기능은 API 키 없이 동작합니다.

자유로운 AI 대화는 `api/chat.js`에서 AI SDK와 Vercel AI Gateway를 통해 스트리밍합니다. 현재 키가 없으면 연결 전임을 알리고 포트폴리오 안내를 계속 제공합니다. 모델 답변이나 문의 전송 성공을 흉내 내지 않습니다.

AI를 연결하려면 `.env.example`을 `.env.local`로 복사하고 `AI_GATEWAY_API_KEY`를 설정한 뒤 개발 서버를 다시 시작합니다. 선택 항목 `AI_GATEWAY_MODEL`로 모델을 바꿀 수 있습니다. 키에는 `VITE_` 접두사를 붙이지 마세요. Vite 개발·프리뷰 서버에서는 같은 `/api/chat` 엔드포인트를 사용하며, Vercel 배포 시 프로젝트 환경 변수에 서버 키를 등록합니다. 정적 파일만 호스팅하는 환경에서는 기본 안내 기능만 동작합니다. 키 발급은 [Vercel AI Gateway 설정 문서](https://vercel.com/docs/ai-gateway/getting-started)를 참고하세요.

사이트 정보와 기본 답변은 `src/portfolio-chat-knowledge.js`, 화면과 동작은 `src/portfolio-chat.js`와 `src/portfolio-chat.css`에서 수정할 수 있습니다. 대화는 현재 열린 페이지 메모리에만 유지하며 브라우저 저장소에 기록하지 않습니다.

**박서진 · Park Seojin | UI/UX · Web · Visual Design Portfolio**

화면에 보이는 결과와 그 뒤의 생각을 함께 소개하는 개인 포트폴리오입니다. 디자인 기획, 사용자 조사, 화면 설계, 웹 구현, 영상 작업을 하나의 스크롤 경험으로 연결합니다.

바다의 수면에서 깊은 곳으로 내려가는 흐름을 따라 작업 방식과 프로젝트를 만나도록 구성했습니다. 별빛과 수면, 해양 생물, 난파선, 기포 등의 시각 요소에 스크롤 애니메이션과 인터랙션을 더했습니다.

[GitHub 저장소](https://github.com/ppsj08100-ops/personal-portfolio) · [디자인 가이드](design-guideline.md)

## 목차

- [사이트 구성](#사이트-구성)
- [프로젝트와 콘텐츠](#프로젝트와-콘텐츠)
- [주요 인터랙션과 이용 방법](#주요-인터랙션과-이용-방법)
- [기술 스택](#기술-스택)
- [로컬에서 실행하기](#로컬에서-실행하기)
- [빌드 결과 확인하기](#빌드-결과-확인하기)
- [프로젝트 구조](#프로젝트-구조)
- [내용을 수정하려면](#내용을-수정하려면)
- [정적 사이트로 배포하기](#정적-사이트로-배포하기)
- [자주 확인할 사항](#자주-확인할-사항)
- [현재 구현 범위](#현재-구현-범위)

## 사이트 구성

처음 방문했다면 아래 순서로 살펴보면 작업 결과와 제작 과정을 함께 이해할 수 있습니다.

| 구간 | 볼 수 있는 내용 |
| --- | --- |
| **BEYOND THE SURFACE** | 메인 비주얼, 메뉴, 별빛·수면 모션을 통해 포트폴리오의 분위기를 소개합니다. |
| **INSIGHT / INTRODUCTION** | 디자인에 대한 관점과 자기소개를 해양 장면과 함께 전달합니다. |
| **MY APPROACH** | `Concept & Story → Detail & Balance → Refine & Flow`의 세 단계로 작업 접근법을 설명합니다. |
| **SEOJIN / DIVE INTO MY WORK** | 역량 소개에서 작품 소개로 이어지며, 수면 아래로 잠수하는 전환을 보여줍니다. |
| **DIPTYQUE** | 팀 프로젝트의 결과물, 담당 작업, 협업, 사용자 조사와 기획 자료를 소개합니다. |
| **DIESEL / REPETTO** | 서로 다른 브랜드 분위기에 맞춘 개인 UI 디자인 작업을 소개합니다. |
| **SHORT-FORM CONTENTS** | 짧은 영상 콘텐츠 세 편을 탭으로 전환하며 볼 수 있습니다. |
| **TOOLS & SKILLS / ABOUT / PERSONAL MOMENTS** | 사용하는 도구, 경험과 일하는 태도, 일상 사진과 영상을 소개합니다. |
| **CONTACT / FOOTER** | 연락 폼 UI와 하단 정보를 제공합니다. 실제 전송 기능의 상태는 [현재 구현 범위](#현재-구현-범위)를 참고하세요. |

## 프로젝트와 콘텐츠

### DIPTYQUE — 브랜드 웹 리뉴얼 팀 프로젝트

딥디크의 향과 이야기를 에디토리얼 레이아웃과 웹 인터랙션으로 풀어낸 작업입니다. 완성 화면과 함께 그 화면이 만들어진 과정을 소개합니다.

- **결과물:** 프로젝트 개요, 브랜드 경험, 타이포그래피와 모션, 리뉴얼 방향, 에디토리얼 디자인
- **참여 과정:** 담당 작업 소개와 팀 협업 내용
- **기획 자료:** 린 캔버스, 시장·브랜드 조사, 사용자 인터뷰와 분석, 문제 정의, 메뉴트리와 구조 설계, 무드보드, 와이어프레임과 UI 컴포넌트
- **살펴보는 방법:** 프로젝트 장면을 스크롤로 탐색하고, 상세 보기와 자료 탭에서 설명 및 이미지를 확인합니다.

[DIPTYQUE 프로젝트 웹사이트](https://mbc-teamproject-alpha.vercel.app/)

### DIESEL / REPETTO — 개인 UI 디자인

두 브랜드의 서로 다른 시각적 성격을 바탕으로 제작한 **Figma 메인 페이지 UI 디자인**입니다. 각 작업의 콘셉트와 디자인 결과를 포트폴리오 안에서 확인할 수 있습니다.

| 작업 | 소개 범위 |
| --- | --- |
| **DIESEL** | 강한 인상과 대담한 화면 구성을 중심으로 한 브랜드 메인 UI |
| **REPETTO** | 우아한 분위기와 브랜드 이미지를 중심으로 한 메인 UI |

### 영상과 일상 기록

- **SHORT-FORM CONTENTS:** `성경김 곱창김`, `SOIR DE LUNE`, `DIESEL WEBSITE HERO` 영상
- **Personal Moments:** 사진과 영상을 함께 배치한 개인 갤러리. 데스크톱에서는 입체적인 회전형 갤러리로, 작은 화면에서는 가로 탐색형 갤러리로 감상할 수 있습니다.

## 주요 인터랙션과 이용 방법

| 기능 | 이용 방법과 동작 |
| --- | --- |
| **스크롤 연출** | 세로 스크롤에 맞춰 텍스트, 수면, 기포, 해양 장면과 프로젝트 화면이 전환됩니다. |
| **메뉴** | 메뉴 버튼으로 열고 닫을 수 있으며, 열린 메뉴에서 `Tab`으로 이동하고 `Esc`로 닫을 수 있습니다. |
| **프로젝트 자료 탭** | 탭을 클릭하거나 탭에 초점을 둔 상태에서 `←` / `→`, `Home` / `End`로 자료를 탐색할 수 있습니다. |
| **숏폼 콘텐츠** | 영상 탭으로 콘텐츠를 선택합니다. 화면 밖으로 나가거나 브라우저 탭이 숨겨지면 재생을 일시정지합니다. |
| **개인 갤러리** | 드래그, 이전·다음 버튼, 갤러리에 초점을 둔 상태의 `←` / `→`로 탐색합니다. 입체 갤러리에서는 일시정지 버튼 또는 `Space`로 자동 회전을 제어할 수 있습니다. |
| **사운드** | 기본값은 꺼짐이며, 사용자가 `SOUND`를 켰을 때 배경 사운드가 시작됩니다. |
| **모션 감소 설정** | 운영체제·브라우저의 `prefers-reduced-motion` 설정에 따라 여러 장면의 움직임과 영상 자동재생을 줄입니다. |

입체 갤러리는 화면 너비가 992px 이상이고 모션이 허용될 때 표시됩니다. 작은 화면, 모션 감소 설정, WebGL을 사용할 수 없는 환경에서는 HTML 기반 가로 갤러리로 콘텐츠를 보여줍니다.

## 기술 스택

| 기술 | 이 프로젝트에서의 역할 |
| --- | --- |
| **HTML5** | 페이지 콘텐츠, 섹션, 메뉴, 대화상자와 폼 구조 |
| **CSS3** | 반응형 레이아웃, 공통 디자인 토큰, 시각 효과와 상태 표현 |
| **JavaScript · ES Modules** | 섹션별 초기화, 사용자 입력, 미디어와 화면 상태 제어 |
| **Vite 8** | 개발 서버, 모듈 처리와 배포용 빌드 |
| **GSAP 3 · ScrollTrigger** | 스크롤 진행에 따른 애니메이션, 장면 전환과 타이밍 제어 |
| **Three.js** | Personal Moments의 WebGL 기반 입체 갤러리와 이미지·영상 표현 |

실행 스크립트와 의존성은 [package.json](package.json), 설치 버전은 [package-lock.json](package-lock.json)에서 확인할 수 있습니다.

## 로컬에서 실행하기

### 1. 준비

- **Node.js 22.12.0 이상**과 npm을 설치합니다. 현재 Vite의 전체 Node.js 지원 범위는 `^20.19.0 || >=22.12.0`입니다.
- 저장소를 복제하려면 Git이 필요합니다.
- 현재 프런트엔드를 실행하거나 빌드하는 데 별도 환경변수나 API 키는 필요하지 않습니다.

### 2. 저장소 복제

```bash
git clone https://github.com/ppsj08100-ops/personal-portfolio.git
cd personal-portfolio
```

이미 프로젝트를 내려받았다면 해당 폴더를 터미널에서 열고 다음 단계부터 진행합니다. 아래 명령은 모두 `package.json`이 있는 **프로젝트 최상위 폴더**에서 실행합니다.

### 3. 의존성 설치와 개발 서버 실행

```bash
npm ci
npm run dev
```

`npm ci`는 `package-lock.json`에 기록된 버전에 맞춰 의존성을 설치합니다. 서버가 시작되면 터미널의 `Local` 주소를 브라우저에서 여세요. 기본 주소는 `http://localhost:5173`이며, 해당 포트가 사용 중이면 다른 포트가 표시될 수 있습니다.

코드를 저장하면 개발 서버가 변경 내용을 반영합니다. 서버를 종료하려면 터미널에서 `Ctrl+C`를 누릅니다.

## 빌드 결과 확인하기

```bash
npm run build
npm run preview
```

빌드가 성공하면 `dist/`에 배포용 파일이 생성됩니다. `npm run preview`가 표시하는 주소에서 개발 소스가 아닌 **실제 빌드 결과**를 확인할 수 있습니다. 기본 미리보기 주소는 `http://localhost:4173`입니다.

| 명령 | 용도 |
| --- | --- |
| `npm ci` | 잠금 파일을 기준으로 의존성 설치 |
| `npm run dev` | 수정 내용을 확인하는 개발 서버 실행 |
| `npm run build` | `dist/`에 배포용 결과물 생성 |
| `npm run preview` | 생성된 `dist/`를 로컬에서 미리보기 |

빌드 성공은 코드와 자산을 묶을 수 있다는 확인입니다. 배포 전에는 메뉴, 프로젝트 상세 보기, 영상, 갤러리와 모바일 화면도 브라우저에서 확인하세요.

## 프로젝트 구조

아래는 수정할 때 자주 찾게 되는 파일과 폴더를 중심으로 정리한 구조입니다.

```text
personal-portfolio/
├── index.html                  # 페이지 콘텐츠와 섹션 구조
├── package.json                # 실행 명령과 의존성
├── package-lock.json           # 설치 버전 잠금 파일
├── portfolio-tokens.css        # 공통 색상·타이포그래피·간격 등의 토큰
├── design-guideline.md         # 디자인 방향과 참고 기준
├── README.md                   # 프로젝트 소개와 사용 안내
├── public/                     # 경로를 유지해 제공하는 정적 자산
│   ├── images/                 # 배경, 프로젝트 목업, 프로필 이미지
│   ├── videos/                 # 프로젝트, 숏폼, 개인 갤러리 영상
│   ├── icons/                  # 도구와 UI 아이콘
│   └── fonts/                  # 폰트와 관련 라이선스 문서
└── src/
    ├── main.js                 # CSS 로드와 섹션별 기능 초기화
    ├── style.css               # 기본 스타일
    ├── hero*.js                # 메인 장면, 별빛과 메뉴·사운드 제어
    ├── insight-*.js            # 해양 장면과 생물·빛·기포 연출
    ├── design-process.*        # MY APPROACH의 세 단계 장면
    ├── ocean-*.js              # 수면·잠수 전환과 관련 효과
    ├── project-*.js            # 프로젝트 장면, 상세 보기와 기획 자료
    ├── short-form.js           # 숏폼 탭과 영상 재생 제어
    ├── portfolio-gallery.js    # 개인 갤러리와 WebGL·HTML 대체 표시
    ├── contact-form.js         # 문의 폼 검증과 안내
    └── footer-content.js       # 하단 연락처와 링크 데이터
```

페이지는 `index.html`에서 `/src/main.js`를 불러오는 방식으로 시작합니다. `main.js`는 섹션별 CSS와 JavaScript를 연결하고, 갤러리 렌더러는 동적 import로 별도 로드합니다. 위의 `*.js` 표기는 관련 파일을 묶어 표현한 것이며, 개별 섹션의 CSS도 `src/`에 있습니다.

## 내용을 수정하려면

| 바꾸고 싶은 내용 | 먼저 확인할 위치 |
| --- | --- |
| 소개 문구, 섹션 순서, 프로젝트 제목과 외부 링크 | [index.html](index.html) |
| 공통 색상, 글꼴 크기, 간격 | [portfolio-tokens.css](portfolio-tokens.css)와 해당 섹션의 CSS |
| 기능 초기화와 CSS·JS 연결 | [src/main.js](src/main.js) |
| 프로젝트 상세 보기와 장면 구성 | [src/project-overview.js](src/project-overview.js), [src/project-case.js](src/project-case.js) |
| 조사·인터뷰·설계 자료 탭 | `src/project-research.js`, `project-interviews.js`, `project-definition.js`, `project-structure.js`, `project-visual.js`, `project-screens.js` |
| 숏폼 영상·개인 갤러리의 이미지와 포스터 | `index.html`의 해당 항목과 `public/videos/`, `public/images/` |
| 도구와 역량 설명 | [src/tools-skills.js](src/tools-skills.js)와 `index.html` |
| 하단 이메일·SNS 링크 | [src/footer-content.js](src/footer-content.js) |
| 문의 폼의 검증·전송 동작 | [src/contact-form.js](src/contact-form.js) |

### 이미지와 영상을 바꿀 때

`public/` 안의 파일은 코드에서 `public`을 제외한 경로로 참조합니다.

```html
<!-- 실제 파일: public/images/profile/moment-film-poster.jpg -->
<img src="/images/profile/moment-film-poster.jpg" alt="개인 영상의 포스터" />
```

파일을 교체하거나 이름을 바꾸면 HTML, CSS 또는 JavaScript에서 사용하는 경로도 함께 수정하세요. 영상은 파일 경로뿐 아니라 포스터 이미지와 `<source>`의 형식도 확인해야 합니다. 배포 환경에서 누락되지 않도록 파일명 대소문자를 정확히 맞춥니다.

디자인 의도를 확인할 때는 [design-guideline.md](design-guideline.md)를, 실제 적용 값을 바꿀 때는 공통 토큰과 섹션별 스타일을 함께 참고하세요.

## 정적 사이트로 배포하기

이 프로젝트는 Vite로 빌드한 정적 파일을 호스팅하는 방식입니다. Vercel 등의 호스팅 서비스에서 사용할 기본 값은 다음과 같습니다.

| 항목 | 값 |
| --- | --- |
| 프로젝트 루트 | `package.json`이 있는 저장소 최상위 폴더 |
| 프레임워크 프리셋 | Vite |
| 설치 명령 | `npm ci` |
| 빌드 명령 | `npm run build` |
| 배포할 출력 폴더 | `dist` |

현재 이미지·영상·폰트 경로는 사이트 루트(`/`)를 기준으로 작성되어 있습니다. `/personal-portfolio/`와 같은 하위 경로에 배포하려면 Vite의 기본 경로 설정과 코드의 정적 자산 경로를 함께 점검해야 합니다.

`dist/`는 빌드로 다시 생성할 수 있어 Git 추적에서 제외합니다. `.env*`, `node_modules/`, `.vercel/`, `artifacts/`, `output/`도 [.gitignore](.gitignore)에 따라 제외하며, 사이트에 사용하는 이미지·영상은 `public/`에 보관합니다.

## 자주 확인할 사항

| 상황 | 확인할 내용 |
| --- | --- |
| `npm` 또는 `node` 명령을 찾을 수 없음 | Node.js와 npm 설치 여부를 확인하고 터미널을 다시 엽니다. |
| 설치·빌드 중 Node 버전 관련 오류 | `node -v`로 버전을 확인하고 위의 Vite 지원 범위에 맞춥니다. |
| `package.json`을 찾을 수 없음 | `src/`나 이미지 폴더가 아닌 프로젝트 최상위에서 명령을 실행했는지 확인합니다. |
| HTML 파일을 직접 열었을 때 화면이 정상적으로 나오지 않음 | `npm run dev` 또는 빌드 후 `npm run preview`로 실행합니다. |
| 배포 후 이미지·영상이 보이지 않음 | 파일이 Git에 포함됐는지, 경로와 대소문자가 맞는지, 사이트가 루트 경로에 배포됐는지 확인합니다. |
| 갤러리가 입체 화면 대신 가로 목록으로 보임 | 화면 크기, 모션 감소 설정, WebGL 지원에 따른 대체 표시일 수 있습니다. |
| 영상이나 사운드가 자동으로 시작되지 않음 | 브라우저 재생 정책과 모션 설정을 확인합니다. 사운드는 `SOUND`를 눌러 켜야 합니다. |

## 현재 구현 범위

- **문의 폼:** 필수 입력값을 검사하고, 실제로 전송되지 않았다는 안내를 표시합니다. 문의를 저장하거나 이메일로 발송하는 서버는 연결되어 있지 않습니다.
- **하단 연락처:** `src/footer-content.js`의 이메일과 SNS 주소는 현재 등록 예정 상태입니다. 실제 주소를 넣으면 해당 데이터에 맞춰 표시됩니다.
- **개인 디자인 작업:** DIESEL과 REPETTO의 소개 범위는 Figma로 제작한 메인 페이지 UI 디자인입니다.

## 작성자와 참고 문서

**박서진 · Park Seojin** — UI/UX · Web · Visual Design

- [디자인 가이드](design-guideline.md): 디자인 방향과 참고 기준
- [공통 디자인 토큰](portfolio-tokens.css): 구현에 사용하는 공통 시각 속성
- [폰트 폴더](public/fonts/): 사용 폰트와 `*-OFL.txt` 라이선스 문서
