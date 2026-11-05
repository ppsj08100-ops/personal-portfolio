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
| **SELECTED WORKS / WORK CHAPTERS** | 팀·개인·숏폼의 세 작업군을 안내합니다. SELECTED WORKS에는 옆으로 흐르는 파도와 글자별 휩쓸림을 적용하고, 각 작업군은 큰 제목과 여백으로 소개합니다. 돌고래·물고기 네 마리·가오리·해마 두 마리는 제거했습니다. 작은 항로 표시는 현재 작업군을 밝게 표시합니다. |
| **DIPTYQUE** | 팀 프로젝트의 결과물, 담당 작업, 협업, 사용자 조사와 기획 자료를 소개합니다. |
| **DIESEL / REPETTO** | 물에 잠긴 난파선의 선장 작업실에서 두 개인 UI 작업을 소개합니다. 한 개의 선장 의자와 해도 책상으로 개인 작업의 분위기를 만들고, 같은 공간에서 작품을 전환합니다. |
| **SHORT-FORM CONTENTS** | 물에 잠긴 난파선의 선실 안에서 세 영상을 소개합니다. 영사기는 해초가 걸린 낡은 선반 위에 자연스러운 크기로 놓입니다. 성경김과 SOIR DE LUNE은 가로·세로가 같은 세로형 프레임을 공유합니다. |
| **TOOLS & SKILLS / ABOUT / PERSONAL MOMENTS** | 사용하는 도구, 경험과 일하는 태도, 일상 사진과 영상을 소개합니다. |
| **CONTACT / FOOTER** | 연락 폼 UI와 하단 정보를 제공합니다. 실제 전송 기능의 상태는 [현재 구현 범위](#현재-구현-범위)를 참고하세요. |

## 프로젝트와 콘텐츠

### DIPTYQUE — 브랜드 웹 리뉴얼 팀 프로젝트

딥디크의 향과 이야기를 에디토리얼 레이아웃과 웹 인터랙션으로 풀어낸 작업입니다. 완성 화면과 함께 그 화면이 만들어진 과정을 소개합니다.

- **결과물:** 프로젝트 개요, 브랜드 경험, 타이포그래피와 모션, 리뉴얼 방향, 에디토리얼 디자인
- **참여 과정:** 담당 작업 소개와 팀 협업 내용
- **기획 자료:** 린 캔버스, 시장·브랜드 조사, 사용자 인터뷰와 분석, 문제 정의, 메뉴트리와 구조 설계, 무드보드, 와이어프레임과 UI 컴포넌트
- **살펴보는 방법:** Intro–07의 설명은 각 전시 화면에서 바로 읽을 수 있습니다. 이어지는 기획 영역은 깊은 바닷속 유적이 실제 장표 화면을 받치는 일곱 전시로 구성되며, 자료 탭과 크게 보기에서 원본 내용을 확인합니다.

[DIPTYQUE 프로젝트 웹사이트](https://mbc-teamproject-alpha.vercel.app/)

### DIESEL / REPETTO — 개인 UI 디자인

두 브랜드의 서로 다른 시각적 성격을 바탕으로 제작한 **Figma 메인 페이지 UI 디자인**입니다. 전체 화면 크기의 PERSONAL PROJECTS 도입부 뒤에서 Diesel과 Repetto를 각각 한 페이지로 만나며, 하나의 공통 스테이지 안에서 옆으로 전환합니다.

전시 배경은 바다에 잠긴 선장의 개인 작업실입니다. 선미 창 너머의 바닷물, 해초가 걸린 목재 벽, 한 개의 의자와 넓은 해도 책상으로 구성했습니다. 배경만 짙은 남색·청회색·은청색으로 조정해 사이트의 일러스트와 연결합니다. 두 작업은 같은 방향으로 책상 위에서 크게 보여주고, 설명과 역할은 왼쪽에서 읽습니다. 작업 원본의 색과 비율은 유지하며 확대 보기와 Figma 링크를 제공합니다. 작은 화면에서는 세로 구도의 선실 배경과 제목 → 결과물 → 설명·역할 → 링크 순서를 사용합니다.

| 작업 | 소개 범위 |
| --- | --- |
| **DIESEL** | 흑백 비주얼과 대형 타이포그래피를 사용한 가로 메인 화면. 왼쪽 설명과 오른쪽 결과물로 구성하며, 화면 높이에 맞춰 데스크톱 기준 최대 900px로 표시합니다. |
| **REPETTO** | 핑크·아이보리와 세리프 타이포그래피를 사용한 세로 원본을 Diesel과 같은 크기의 16:9 프레임에 전시합니다. 원본을 변형하지 않고 좌우를 아이보리 여백으로 채우며, 왼쪽 설명과 오른쪽 결과물로 구성합니다. |

담당 작업은 비주얼 콘셉트·컬러·타이포그래피, 정보 구조·콘텐츠 레이아웃, Figma 메인 페이지 UI 디자인으로 정리했습니다. 두 작업 모두 화면을 누르거나 `화면 크게 보기`를 선택하면 원본 비율로 확대할 수 있으며, 각 작품의 Figma 원본 링크도 제공합니다.

### 영상과 일상 기록

- **SHORT-FORM CONTENTS:** `성경김 곱창김`, `SOIR DE LUNE`, `DIESEL WEBSITE HERO` 영상
- **Personal Moments:** 짙은 남색 배경에 사진과 영상을 함께 배치한 개인 갤러리. 동굴 배경과 전환 중 바위 이미지는 제거하고, 카드 이동·접점 기포·갤러리 인터랙션은 유지합니다. PERSONAL MOMENTS 제목 글자만 숨기고, 제목의 측정 크기·여백과 갤러리 위치는 그대로 유지합니다. 데스크톱에서는 입체적인 회전형 갤러리로, 작은 화면에서는 가로 탐색형 갤러리로 감상할 수 있습니다.

## 주요 인터랙션과 이용 방법

| 기능 | 이용 방법과 동작 |
| --- | --- |
| **스크롤 연출** | 세로 스크롤에 맞춰 텍스트, 수면, 기포, 해양 장면과 프로젝트 화면이 전환됩니다. |
| **MY APPROACH · 타륜과 세 가지 산호** | [탬버린즈 O HAND 전시](https://www.tamburins.com/kr/exhibition/ohand/)의 중앙 전시·왼쪽 설명·희미한 다음 장면 비례를 바닷속 장면으로 해석했습니다. 부채·사슴뿔·로제트 산호를 크게 뒤에 깔고 투명도를 낮췄으며, 산호와 타륜은 앞뒤 장면과 같은 남색·은청색 팔레트로 맞췄습니다. 큰 타륜은 가로 정중앙·프레임 맨 아래에서 절반만 보입니다. 타륜 회전각과 산호 전환이 연결되고, 떠나는 산호는 45도로 기울며 사라집니다. 작은 영문 분류·한글 제목·본문과 사이트의 둥근 테두리 버튼을 사용하며, 스크롤·드래그·클릭·키보드·해시 이동을 유지합니다. 기포는 정해진 경로를 따라 일정한 속도로 상승하고 화면 밖·숨긴 탭에서는 멈춥니다. 프레임은 화면 전체를 채우고, 마지막에는 실제 다음 바다 화면이 아래에서 조금 겹쳐 보입니다. 짧은 화면과 모션 감소에서는 정적인 장면과 전체 내용을 제공합니다. |
| **세 제목 · 파도에 녹는 획** | SELECTED WORKS, SKILLS & TOOLS, ABOUT ME를 Julius Sans One 400·같은 반응형 글자 크기·자간·두 줄 배치·중앙 위치로 통일했습니다. 앰퍼샌드도 같은 크기입니다. 글자는 제자리에 있고, 모래 없는 남색 파도가 닿는 획부터 실제 포말 질감으로 풀려 사라집니다. 배경과 전경은 같은 사진·같은 파도 경계를 사용하며, 글자 획과 빈 공간 사이로 물이 이어집니다. 회전·이동·단단한 글자 잔상을 제거했습니다. 역스크롤에서 동일하게 복원되며 모션 감소에서는 실제 제목과 배경을 정적으로 표시합니다. |
| **작업군 도입과 항로 표시** | SELECTED WORKS의 남색 파도가 각 글자의 위치에 닿으면 움직이지 않는 획부터 포말에 섞여 사라집니다. 기존 첫 프로젝트 진입과 TEAM → DIPTYQUE 연결은 유지합니다. 개인 작업 앞에는 `02 PERSONAL PROJECTS`, 영상 앞에는 `03 SHORT-FORM CONTENTS`가 있으며 두 소개 섹션의 화면 높이와 제목 크기는 유지합니다. 돌고래·네 마리 물고기·가오리·해마 두 마리의 생성·애니메이션·이미지 요청은 제거했습니다. 작은 항로 표시는 현재 분류를 표시합니다. |
| **PERSONAL / SHORT-FORM 소개 크기** | PERSONAL PROJECTS와 SHORT-FORM CONTENTS는 기존 전체 화면 크기와 Julius 제목 크기를 유지합니다. 동물 연출만 제거하고, 원래 설명과 분류 표시를 남깁니다. |
| **ABOUT ME** | ABOUT / ME 두 줄로 정리하고 나머지 두 제목과 같은 서체·크기·간격을 사용합니다. 다음 카드 화면 상단은 부드럽게 이어지며, 카드가 상단에 고정되면 연결 마스크가 해제되어 기존 네 카드와 탐색을 가리지 않습니다. |
| **개인 작업 · 난파선의 선장실** | 낮고 굽은 목재 선체와 들보, 선미 창, 파손된 선체 밖의 바다, 선장 외투·모자가 걸린 의자, 해도·나침반·육분의·두루마리로 공간을 새로 그렸습니다. 본문·미리보기 바깥의 하단과 가장자리에 항해 도구가 보이도록 배치했습니다. PC·모바일에 각각 맞는 구도이며, 남색·은청색 판화 질감을 유지하면서 중간 밝기를 살려 방의 정체가 묻히지 않게 했습니다. 실제 Diesel·Repetto 원본 색·비율·확대 보기·Figma 링크는 유지합니다. |
| **개인 작업 확대 보기** | 두 작품이 하나의 대화상자를 공유하며 가로·세로 원본 비율을 유지합니다. 모바일에서는 화면을 밀거나 확대 영역에 초점을 두고 방향키로 디자인을 살펴볼 수 있습니다. 보이는 `닫기` 버튼, `Esc`, 바깥 영역 클릭으로 닫으며, 열기 전 버튼으로 초점이 돌아갑니다. 닫을 때 원래 페이지의 스크롤 상태를 복원하고, 대화상자에서도 해당 Figma 원본을 열 수 있습니다. |
| **숏폼 · 난파선의 영사기** | 원형 창과 낡은 목재 벽, 해초가 있는 잠긴 선실을 배경으로 사용합니다. 영사기는 선반 위의 적당한 크기로 장면에 포함합니다. 데스크톱·모바일 배경 모두 실사 목재·금속 질감을 가는 은청색 판화 선과 해칭으로 다시 그렸으며, 짙은 남색·청회색 팔레트로 사이트의 바다 일러스트와 맞췄습니다. 영사기 렌즈 위치와 실제 빛줄기 인터랙션은 유지합니다. 진입 시 렌즈 점등 → 부드러운 빛 → 영상 공개 순서로 나타나며, 재생 시 주변 조명이 낮아집니다. 선실의 윤곽과 원형 창 조명은 부드러운 남색으로 낮춰 선장실과 같은 보정을 사용합니다. 성경김과 SOIR DE LUNE의 프레임은 너비·높이·비율이 모두 같으며, 향수의 정사각형 원본은 가운데를 기준으로 좌우를 잘라 채웁니다. DIESEL은 가로형 원본 비율을 유지합니다. 제목·제작 의도·길이·포맷은 각 영상과 동일한 폭으로 바로 아래에 정렬합니다. 기존 작품 선택·스크롤·키보드·직접 링크 탐색과 DIESEL 상세 기획 설명을 유지하며, 모션 감소에서는 전체 장면을 정적으로 표시합니다. |
| **Better Together → Lean Canvas** | 조개 아래에서 시작하는 낡은 돌계단을 따라 더 깊은 해저 바닥으로 내려갑니다. 위·중간·아래까지 13개 디딤판과 수직 단차가 이어지고, 발치의 얕은 퇴적토와 빛의 감쇠가 하단 바닥으로 연결합니다. 물빛이 짙어지고 안개가 옅어진 뒤 낮은 돌 받침과 목업이 제자리에서 차례로 드러납니다. 전환은 스크롤을 되돌리면 같은 상태로 돌아갑니다. 문어와 팔 모션은 제거했습니다. 모션 감소·일반 문서 보기에는 전환 오버레이 없이 전체 콘텐츠를 표시합니다. |
| **딥디크 기획 전시 01–07** | 낮은 돌 받침과 부서진 기둥, 도시 외벽, 누운 석상 머리, 바닥에 놓인 손등, 쓰러진 열주, 깨진 문양석, 분수대가 실제 자료 화면을 받칩니다. 일곱 장면의 공통 해저 바닥과 조형물을 짙은 남색·은청색으로 보정하고, 먼 유적과 바닥의 흰 조명을 낮춰 위층보다 깊고 고요한 수심을 표현했습니다. 발치의 옅은 퇴적토와 물안개가 조형물 가장자리를 배경으로 연결합니다. 색 보정은 배경·소품에만 적용해 원본 장표의 색과 글자는 유지합니다. 기기의 접점·비율, 상단과 같은 Julius 영문·Pretendard 한글 타이포그래피, 자료 탭·크게 보기·원본 링크를 유지하며 작은 화면과 모션 감소에서도 전체 콘텐츠를 제공합니다. |
| **메뉴** | 메뉴 버튼으로 열고 닫을 수 있으며, 열린 메뉴에서 `Tab`으로 이동하고 `Esc`로 닫을 수 있습니다. |
| **프로젝트 자료 탭** | 탭을 클릭하거나 탭에 초점을 둔 상태에서 `←` / `→`, `Home` / `End`로 자료를 탐색할 수 있습니다. |
| **숏폼 콘텐츠** | 영상 탭으로 콘텐츠를 선택합니다. 화면 밖으로 나가거나 브라우저 탭이 숨겨지면 재생을 일시정지합니다. |
| **DIPTYQUE 첫 페이지 전환** | INTRO에서 01로 넘어갈 때 반짝이는 곡선 경계 대신 선이 없는 곧은 수직 리빌을 사용합니다. 실제 프로젝트 화면·스크롤·역스크롤과 페이지 선택은 유지합니다. |
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
    ├── personal-brand-*.js     # 두 개인 작업의 가로 전환, 반사와 확대 보기
    ├── short-form.js           # 숏폼 3장 가로 전환과 영상 재생 제어
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
| 팀·개인·숏폼 도입과 물고기·항로 표시 | [src/work-chapters.js](src/work-chapters.js), [src/work-chapters.css](src/work-chapters.css), [src/work-team-fish.js](src/work-team-fish.js), [src/work-team-fish.css](src/work-team-fish.css), [src/work-personal-manta.js](src/work-personal-manta.js), [src/work-personal-manta.css](src/work-personal-manta.css), [src/work-film-seahorses.js](src/work-film-seahorses.js), [src/work-film-seahorses.css](src/work-film-seahorses.css), [src/work-water-atmosphere.js](src/work-water-atmosphere.js), [src/ocean-descent.js](src/ocean-descent.js) |
| Diesel·Repetto의 전시 배치·배경·가로 전환·반사·확대 보기 | [src/personal-brand-archive.css](src/personal-brand-archive.css), [src/personal-brand-gallery.js](src/personal-brand-gallery.js), [src/personal-brand-surface.js](src/personal-brand-surface.js), [src/personal-brand-archive.js](src/personal-brand-archive.js), [src/personal-brand-archive-dialog.css](src/personal-brand-archive-dialog.css), `index.html`의 `#personal-brand-gallery` |
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
- **개인 디자인 작업:** DIESEL과 REPETTO의 소개 범위는 Figma로 제작한 메인 페이지 UI 디자인입니다. 각 작품의 한 페이지 전시, 가로 전환, 원본 비율 확대 보기와 Figma 링크를 제공합니다.

## 작성자와 참고 문서

**박서진 · Park Seojin** — UI/UX · Web · Visual Design

- [디자인 가이드](design-guideline.md): 디자인 방향과 참고 기준
- [공통 디자인 토큰](portfolio-tokens.css): 구현에 사용하는 공통 시각 속성
- [폰트 폴더](public/fonts/): 사용 폰트와 `*-OFL.txt` 라이선스 문서

### 숏폼 난파선 선실 배경

- PC: `public/images/short-form-shipwreck-room-v3.png`
- 모바일: `public/images/short-form-shipwreck-room-mobile-v3.png`
- 제작: 내장 Imagegen. 낡은 선실과 선반 위의 해초 덮인 영사기를 하나의 배경으로 그렸습니다. 색 조정은 배경 레이어에만 SVG 색상 필터와 CSS로 적용합니다. 그림자 색은 `#020b1d`, 중간 색은 청회색, 밝은 부분은 은청색으로 연결하며 실제 영상에는 적용하지 않습니다.
- 전체 프롬프트: `artifacts/short-form-projector/room-prompts-v3.txt`

### 개인 작업 · 선장 작업실 이미지

- PC: `public/images/personal-captains-study-v1.png`
- 모바일: `public/images/personal-captains-study-mobile-v1.png`
- 제작: 내장 Imagegen. 배경에만 남색·은청색 색상 필터를 적용했습니다.
- 프롬프트: `artifacts/personal-captains-study/prompts.txt`
