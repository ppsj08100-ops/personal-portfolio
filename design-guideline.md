# 박서진 Personal Portfolio — Design Guideline

- 분석 대상: [Naya Studio Dubai / Cube Studio](https://naya-studio-dubai.webflow.io/)
- 작성일: 2026-10-13, Asia/Seoul
- 목적: 레퍼런스의 시각적 원리와 구현 방식을 분석하고 박서진의 개인 포트폴리오에 적용할 기준을 정한다.
- 조사 방법: 공개 HTML, 외부·인라인 CSS, 인라인 JavaScript, Webflow 인터랙션 정의, Three.js 갤러리 코드 분석. Chrome에서 Desktop 1440×1000, Tablet 834×1112, Mobile 390×844 화면을 확인하고 메뉴의 Enter·Escape 동작을 점검했다.
- 범위: 홈 페이지 중심 분석이다. 전체 브라우저·실기기 검증, 스크린리더 감사, 성능 벤치마크를 수행한 문서는 아니다. 모바일은 브라우저 에뮬레이션으로 확인했다.

> **값의 구분**: **확인**은 원본 코드·화면에서 확인한 사실, **추출**은 화면 이미지에서 분석한 대표값, **권장**은 개인 포트폴리오용 설계 제안이다. 권장 수치와 예제 코드는 원본의 실제 구현값으로 해석하지 않는다. 색상 사용 비율은 원본에 정의되어 있지 않으므로 별도의 권장 비율을 제시한다.

## 1. Design Concept — 디자인 스타일, 분위기, 핵심 키워드 5개

### 1.1 레퍼런스의 디자인 스타일 [확인·해석]

어두운 공간에 큰 얇은 타이포그래피와 초현실적인 자연 이미지를 배치한 몰입형 브랜드 사이트다. 첫 화면의 거울 큐브, 보랏빛 식물, 깊은 블루 풍경이 시선을 모은다. 이어지는 대형 문장과 오브젝트는 화면을 전시 공간처럼 사용한다.

텍스트의 크기 대비가 매우 크다. 제목은 화면 너비에 가깝게 확장하고, 설명과 내비게이션은 작은 대문자로 배치한다. 서비스·강점 섹션에서는 왼쪽 라벨, 좁은 설명 칼럼, 넓게 비운 영역을 조합한다. 배경의 노이즈·블러·빛 번짐, 반투명 카드, 가는 선과 원형 장식이 전체 톤을 연결한다.

### 1.2 핵심 키워드 — 정확히 5개

| 키워드 | 레퍼런스의 표현 | 개인 포트폴리오 적용 |
| --- | --- | --- |
| **Immersive / 몰입** | 화면을 채우는 풍경과 오브젝트, 긴 스크롤 장면 | 첫 화면에 대표 비주얼 하나를 집중 배치 |
| **Surreal / 초현실** | 자연과 거울·큐브의 비현실적인 결합 | 직접 제작한 추상 오브젝트 또는 작업 화면의 공간적 재구성 |
| **Editorial / 편집적** | 큰 제목과 작은 설명, 비대칭 칼럼 | 프로젝트 제목·역할·성과에 분명한 위계 부여 |
| **Ethereal / 몽환** | 블루·퍼플 빛, 블러, 얇은 글자 | 배경과 섹션 연결부에 제한적으로 사용 |
| **Kinetic / 움직임** | 텍스트 등장, 드래그, 깊이 변화 | 탐색을 돕는 짧은 모션과 한 가지 대표 인터랙션 |

### 1.3 적용 원칙 [권장]

- 대형 영문 제목 + 읽기 쉬운 한글 설명 + 대표 작업 이미지의 조합을 기본 문법으로 삼는다.
- 한 화면의 주인공은 제목 또는 이미지 하나로 정한다. 모든 요소를 동시에 움직이지 않는다.
- 채용 담당자나 협업자가 이름·전문 분야·대표 작업을 빠르게 찾을 수 있게 한다.
- 작업물의 실제 색을 살리고, 몽환적인 배경은 소개·전환·문의 영역에 집중한다.
- 레퍼런스의 꽃·큐브를 그대로 반복하기보다 박서진의 작업 방식에서 고유 모티프를 만든다.

근거: [레퍼런스 홈](https://naya-studio-dubai.webflow.io/), [원본 스타일시트](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css).

## 2. Color System — 주요 색상 HEX, 사용 비율, 역할

### 2.1 원본 UI 색상 [확인]

| 색상 | HEX | 역할·사용 위치 | 해석 |
| --- | --- | --- | --- |
| Black | `#000000` | body 배경, 어두운 전환 화면, 그라디언트 끝점 | UI의 기본 바탕 |
| White | `#FFFFFF` | 제목, 기본 텍스트, 아이콘 | 검정 위 주요 정보 |
| White 33% | `#FFFFFF54` | 낮은 강조의 텍스트·버튼 테두리 등 | 8자리 HEX의 마지막 두 자리는 알파값 |
| White 25% | `#FFFFFF40` | 작은 화면의 버튼 테두리 등 | 반투명 경계 |
| White 15% | `#FFFFFF26` | 원형 내비게이션 테두리 등 | 가는 장식선 |
| White 6% → 2% | `#FFFFFF0F` → `#FFFFFF05` | 서비스 카드의 투명 그라디언트 | 배경이 비치는 유리 질감 |
| Focus blue | `#4D65FF` | 인라인 CSS의 일부 `:focus-visible` 표시 | 브랜드 대표색이 아니라 포커스 스타일 |

원본 CSS에 포함된 Webflow 기본 버튼색 `#3898EC` 등을 사이트의 주요 브랜드색으로 분류하지 않는다. 공통 스타일시트에는 홈에서 사용하지 않는 스타일도 포함되어 있다.

### 2.2 이미지의 대표 색감 [추출]

| 계열 | 대표 HEX | 역할 |
| --- | --- | --- |
| Deep navy | `#091221` | 히어로 풍경의 어두운 공간감 |
| Atmospheric blue | `#36589E` | 물·반사면·풍경의 푸른 빛 |
| Floral purple | `#9F74C0` | 식물과 반사면의 보라색 포인트 |

1440×1000 히어로 캡처에서 네이비·블루·퍼플에 해당하는 픽셀을 RGB 조건으로 분류한 뒤 각 채널의 중앙값을 구했다. 그라디언트·노이즈·이미지 프레임에 따라 달라지는 **분위기 대표값**이며, 사이트가 선언한 CSS 토큰이나 공식 팔레트가 아니다.

### 2.3 박서진 포트폴리오 팔레트와 사용 비율 [권장]

아래는 한 화면의 시각적 비중을 설계할 때 참고할 목표 비율이다. 원본의 실제 픽셀 점유율을 측정한 값이 아니다. 이미지 자체의 다양한 색은 이 비율에서 제외한다.

| 토큰 | HEX | 권장 비율 | 역할 |
| --- | --- | --- | --- |
| `--color-bg` | `#000000` | 70% | 전체 배경과 넓은 여백 |
| `--color-surface` | `#111315` | 10% | 카드·메뉴·설명 패널의 면 |
| `--color-text` | `#FFFFFF` | 8% | 제목·핵심 정보 |
| `--color-muted` | `#B8BCC7` | 2% | 역할·연도·보조 설명 |
| `--color-blue` | `#36589E` | 3% | 장식·배경의 깊이, 본문색으로 사용하지 않음 |
| `--color-accent` | `#B6A0E3` | 7% | 브랜드 포인트, 활성 상태, 포커스 |
| **합계** | — | **100%** | 초기 화면 구성 가이드 |

퍼플은 이미지에서 추출한 색보다 밝게 조정해 어두운 면 위의 작은 텍스트·포커스에도 활용할 수 있도록 한다. 테두리는 장식용 `rgba(255,255,255,.15)`와 조작 요소 식별용 색을 분리한다. 필요한 버튼 경계에 장식용 선만 사용하지 않는다.

```css
:root {
  --color-bg: #000000;
  --color-surface: #111315;
  --color-text: #FFFFFF;
  --color-muted: #B8BCC7;
  --color-blue: #36589E;
  --color-accent: #B6A0E3;
  --color-line-decorative: rgba(255, 255, 255, .15);
}
```

근거: [원본 CSS](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css), 히어로 렌더링 및 픽셀 분석.

## 3. Typography — 폰트 패밀리, 크기, 굵기, 행간, 자간

### 3.1 폰트 패밀리 [확인]

| 폰트 | 원본 로딩 정의 | 사용 방식 |
| --- | --- | --- |
| `Helvetica Neue` | WOFF2: Thin 100, Roman 400, Medium 500 | 대부분의 제목·본문·UI |
| `Carl Brown` | WOFF2: Regular 400 | 제목 속 일부 글자, 곡선이 강조된 장식적 타이포 |
| `Arial, sans-serif` | 시스템 대체 글꼴 | 웹폰트 로드 실패 시 fallback |

body는 기본적으로 `text-transform: uppercase`다. 장식적 글자는 제목 전체에 무작정 적용하지 않고 일부 글자에 섞는다. H1에는 CSS상 200, 버튼에는 600이 요청되지만, 해당 굵기의 개별 폰트 파일은 위 로딩 목록에서 확인되지 않았다. CSS 요청 굵기와 제공된 폰트 굵기를 구분한다.

### 3.2 원본 기본 타이포 스케일 [확인]

아래는 해당 클래스의 **기본 규칙**이다. modifier 클래스·애니메이션·부모 스타일에 따라 개별 요소는 달라질 수 있다. Desktop 환산값은 뷰포트 너비 1440px 기준이다.

| 역할 / selector | Desktop 크기 | 1440px 환산 | 991px 이하 크기 | 굵기 | 행간 | 자간 |
| --- | --- | --- | --- | --- | --- | --- |
| 히어로 `.h1.has--weight-light` | `7.3vw` | 105.12px | `15vw` | CSS 200 | 79% | 0 |
| 대형 제목 `.heading-large` | `13.54vw` | 194.98px | `14.93vw` | 100 | 76% | `-0.02em` |
| 중형 제목 `.heading-medium` | `7.3vw` | 105.12px | `10.66vw` | 100 | 80% | 기본 normal |
| 소형 제목 `.heading-small` | `2.9vw` | 41.76px | `6.4vw` | 100 | 86% | 기본 normal |
| 작은 UI `.text-small` | `.73vw` | 10.51px | `3.2vw` | 400 | 110.6% | 기본 normal |
| 중간 텍스트 `.text-medium` | `1.25vw` | 18px | `4.53vw` | 상속 400 | 115% | 기본 normal |
| 큰 텍스트 `.text-large` | `1.71vw` | 24.62px | `5.33vw` | 상속 400 | 115% | 기본 normal |

`text-style-h1: 52.3vw`나 장식용 `.h1.masked-text: 54vw` 같은 매우 큰 선언도 있지만, 실제 첫 화면의 브랜드 제목은 `.h1.has--weight-light`다. 큰 선언을 그대로 히어로 제목 규격으로 사용하지 않는다.

### 3.3 개인 포트폴리오 타이포 기준 [권장]

영문 display는 사용권을 확보한 얇은 산세리프, 한글은 Pretendard 또는 동등한 가독성의 한글 글꼴을 사용한다. Carl Brown을 배포하려면 사용권을 확인하고, 대체 시에는 별도의 고유 타이포 모티프를 만든다. 실제 사용할 파일에 있는 굵기로 스케일을 정한다.

| 용도 | Desktop | Tablet | Mobile | 굵기 | 행간 | 자간 |
| --- | --- | --- | --- | --- | --- | --- |
| 영문 Hero | 104–160px | 72–104px | 48–64px | 200–300 | 0.95 | `-0.04em` |
| 영문 Section title | 80–128px | 56–80px | 36–52px | 200–300 | 1.0 | `-0.03em` |
| 한글 제목 | 40–56px | 32–40px | 28–32px | 500 | 1.25 | `-0.025em` |
| Project title | 24–32px | 24–28px | 22–24px | 400–500 | 1.25 | `-0.02em` |
| 한글 본문 | 16–18px | 16–18px | 16px | 400 | 1.6 | `-0.01em` |
| UI / Metadata | 14px | 14px | 14px | 400–500 | 1.4 | 0–`0.04em` |

- 원본의 약 10.5px UI, 0.76 제목 행간은 분위기 분석값이다. 실제 설명·조작 요소에 그대로 적용하지 않는다.
- 한글에 영문 display의 0.8 이하 행간을 적용하면 줄이 겹치기 쉽다. 언어별 행간을 분리한다.
- 순수 `vw` 대신 `clamp()`를 사용해 큰 모니터와 좁은 화면에서 최대·최소 크기를 제한한다.
- 한글 본문은 40–55자 안팎의 줄 길이를 목표로 하고, 영문 장식 대문자는 제목·라벨에 집중한다.

```css
.hero-title {
  font-size: clamp(3rem, 10vw, 10rem);
  font-weight: 300;
  line-height: .95;
  letter-spacing: -.04em;
}
.body-copy {
  font-size: 1rem;
  line-height: 1.6;
  letter-spacing: -.01em;
  text-transform: none;
}
```

근거: [원본 CSS의 @font-face 및 heading/text 규칙](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css).

## 4. Layout System — Container, Grid, Section Spacing, Alignment

### 4.1 레퍼런스 레이아웃 수치 [확인]

| 항목 | Desktop | 991px 이하 | 용도 |
| --- | --- | --- | --- |
| `.container` | max-width `100vw`, 좌우 `3.125vw` | max-width 제한 제거, 좌우 `4.8vw` | Desktop 1440에서 좌우 45px, Mobile 390에서 약 18.72px |
| `.layout` | `11.25vw 17.18vw 1fr` | `32vw 1fr` | 라벨·설명·메인 콘텐츠의 비대칭 Grid |
| `.layout` 행 간격 | `6.8vw` | `21.33vw` | 정보 그룹 사이 간격 |
| `.form-block` | `1fr 1fr`, 열 간격 `6.25vw`, 행 간격 `3.1vw` | 세로 Flex, 간격 `10.66vw` | 문의 입력부 |
| `.padding-block` | 상단 `15.625vw` | 상단 `32vw` | 큰 섹션 간격 |
| `.padding-block.is--small` | 상단 `9.375vw` | 상단 `21.33vw` | 작은 섹션 간격 |
| `.padding-block.is--medium` | 상단 `9.375vw` | 상단 `32vw` | 작은 화면에서 넓어진 간격 |

1440px에서 큰 섹션 간격은 225px, 작은 간격은 135px다. 390px에서는 각각 124.8px, 약 83.2px다. 간격용 클래스와 섹션의 전체 높이는 다르다.

원본 전체가 12칼럼 Grid로 선언된 것은 아니다. 실제 `.layout`은 3열 비대칭 구조이며 갤러리와 모션 장면은 별도 레이아웃을 사용한다. 서비스 배경에는 `height: 300vw`, sticky 배경과 큰 음수 margin이 있어 긴 스크롤을 만든다.

### 4.2 정렬 원리 [확인·해석]

- 첫 브랜드 제목과 소개의 대형 문장은 중앙 정렬을 사용한다.
- 서비스·문의 제목은 줄마다 좌우 위치를 바꿔 계단처럼 배치한다.
- 설명문은 좁은 칼럼에 두고, 나머지 공간은 이미지 또는 여백으로 남긴다.
- Desktop 갤러리는 3D 공간을, 작은 화면은 좌우로 이어지는 카드를 사용한다.
- 원·십자·가는 세로선이 섹션 사이의 시각적 기준점 역할을 한다.

### 4.3 개인 포트폴리오 레이아웃 [권장]

| 항목 | Desktop ≥992px | Tablet 768–991px | Mobile ≤767px |
| --- | --- | --- | --- |
| Container | 최대 1440px, 좌우 48–64px | 좌우 32px | 좌우 20px |
| 설계 Grid | 12열, gutter 24px | 8열, gutter 20px | 4열, gutter 16px |
| Section 간격 | 144–192px | 96–128px | 72–96px |
| 콘텐츠 그룹 간격 | 48–64px | 32–48px | 24–32px |
| 본문 영역 | 약 560–680px 이내 | 화면에 맞춰 제한 | 가용 너비 전체 |
| 대표 작업 목록 | 2열 또는 큰 카드+보조 카드 | 2열 또는 가로 스크롤 | 1열 기본, 선택적으로 scroll-snap |

이 12/8/4열 체계는 **재해석 제안**이다. Hero의 배경은 full bleed로 두고 텍스트와 조작 요소는 container 안에 둔다. 모바일의 본문·프로젝트 제목에는 음수 margin으로 인한 잘림을 허용하지 않는다. 고정 헤더용 `scroll-margin-top`을 확보한다.

```css
.container { width: min(100% - 6rem, 90rem); margin-inline: auto; }
.section { padding-block: clamp(4.5rem, 10vw, 12rem); }
[id] { scroll-margin-top: 6rem; }
@media (max-width: 991px) {
  .container { width: calc(100% - 4rem); }
}
@media (max-width: 767px) {
  .container { width: calc(100% - 2.5rem); }
}
```

근거: [원본 CSS의 container/layout/padding-block/form-block 규칙](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css).

## 5. Components — Header, Button, Project Card, Navigation, Footer

### 5.1 Header

**원본 [확인]**: `.navbar`는 fixed, `z-index: 9998`, 투명 배경이다. Desktop 상단 padding은 `3.125vw`, 하단은 `3vw`. 왼쪽 갤러리·전화 링크, 오른쪽 사운드·메뉴를 배치한다. HTML에 언어 드롭다운도 있으나 실제 노출은 스타일·상태에 따라 달라진다. 작은 화면 캡처에서는 메뉴 중심으로 단순화됐다. Webflow에는 스크롤 방향에 따른 표시·숨김 정의가 있고, 별도 JS는 스크롤에 따라 backdrop blur를 변화시킨다.

**개인 적용 [권장]**: 왼쪽 `PARK SEOJIN`, 오른쪽 `WORK / ABOUT / CONTACT`와 메뉴 버튼. 높이 Desktop 80–96px, Mobile 64–72px. 스크롤 이후 반투명 검정 면을 더해 대비를 유지한다. 키보드 포커스가 헤더 안에 있으면 자동 숨김을 중지한다.

### 5.2 Button

**원본 [확인]**: 투명 pill 형태, 흰색 텍스트와 얇은 선, 작은 방향 아이콘의 조합이다.

| 속성 | Desktop | 991px 이하 |
| --- | --- | --- |
| border | `.1vw solid #FFFFFF54` | `.24vw solid #FFFFFF40` |
| radius | `2vw` | `8vw` |
| min-width | `9.73vw` | `37.8vw` |
| padding (상/우/하/좌) | `1.5 / 2 / 1.4 / 1.65vw` | `5.75 / 7.2 / 5.5 / 5.3vw` |
| gap | `.64vw` | `3.3vw` |
| hover | 좌 padding `2.18vw`, 우 `1.54vw` | 개별 적용 상태에 따라 달라짐 |

CSS padding 전환은 `.8s`; 텍스트·화살표·SVG 연출은 별도 코드와 Webflow 인터랙션이 함께 담당한다.

**개인 적용 [권장]**: `작업 보기`, `연락하기`처럼 결과가 명확한 라벨. 높이 48–56px, radius 999px, 좌우 padding 24px, 텍스트 14–16px. hover는 화살표 4px 이동·면 밝기 변화로 표현하고 focus에도 같은 강조를 제공한다. 이동은 `<a>`, 상태 변경은 `<button>`으로 만든다.

### 5.3 Project Card

**원본 [확인]**: 작업 이미지 아래에 이름과 연도를 좌우 배치한다. Desktop의 실제 메인 갤러리는 Three.js로 이미지와 라벨을 곡면 카드로 렌더링한다. DOM `.project-image`의 기본 `10vw`는 3D 갤러리의 실제 화면 카드 너비와 동일하지 않다. 991px 이하에서는 DOM 이미지 너비 `79.2vw`, radius `6.4vw`와 Swiper를 사용한다. Mobile 390에서 이미지 너비는 약 309px이며 다음 카드 일부가 보인다.

**개인 적용 [권장]**: 이미지 → 제목 → 분야·역할·연도 → 상세 페이지로 연결되는 카드. 기본은 의미 있는 HTML 목록으로 만들고, WebGL은 선택적 시각 레이어로 추가한다. 비율은 작업 화면에 따라 4:3 또는 3:2로 통일한다. 전체 카드 링크에 명확한 이름을 부여하고, 프로젝트 정보는 hover 전에도 보이게 한다.

### 5.4 Navigation

**원본 [확인]**: 메뉴는 viewport를 덮는 fixed 레이어다. Desktop `.menu-container`는 너비 `72vw`, 높이 `100vh`. 작은 화면은 너비 100%, 높이 `230vw`, 큰 위쪽 padding과 세로 스크롤을 사용한다. 갤러리·후기에는 겹치는 원형 이전/다음 조작 요소가 있다. Desktop 작업 갤러리의 canvas에는 pointer drag가 연결되어 있다.

**개인 적용 [권장]**: 메뉴 항목은 `Work / About / Approach / Contact`의 4개로 정리한다. 열린 메뉴의 현재 상태를 `aria-expanded`로 알리고 Escape 닫기·초기 포커스·포커스 복귀를 구현한다. 배경 상호작용을 막는 모달 메뉴라면 dialog 패턴과 focus trap을 적용한다. 갤러리는 드래그 외에도 이전/다음 버튼과 키보드로 탐색할 수 있어야 한다.

### 5.5 Footer

**원본 [확인]**: 브랜드명, 연락처, 짧은 브랜드 문구, 소셜 아이콘, 저작권·제작 크레딧으로 구성된다. Desktop은 가로 배치, 991px 이하 `.footer-inner`는 세로, `.footer-bottom`은 `column-reverse`다. 원형 선 장식을 반복한다. 상단 브랜드 표기는 Cube Studio, 하단은 Naya Studio로 혼재한다.

**개인 적용 [권장]**: `박서진 / PARK SEOJIN`을 일관되게 사용하고 실제 이메일·포트폴리오 링크만 넣는다. 확인되지 않은 소셜 링크와 `href="#"` 빈 링크는 넣지 않는다. 저작권 연도는 배포 시점에 맞추고, 이름 → 연락처 → 추가 링크 → 저작권 순으로 모바일 읽기 순서를 유지한다.

근거: [홈 DOM·인라인 코드](https://naya-studio-dubai.webflow.io/), [컴포넌트 CSS](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css), [Three.js 갤러리 코드](https://18dccfa619686586.cdn.express/naya-carousel-copy.js).

## 6. Hero Design — 카피 구조, 타이포그래피, 이미지 배치

### 6.1 레퍼런스 Hero 구조 [확인]

Hero는 첫 화면과 그 뒤 소개 장면을 함께 포함한다. 첫 화면의 브랜드 제목은 `CUBE / STUDIO`, 뒤의 대형 메시지는 `DESIGN THAT BLOOMS INTO EMOTION`이다. 그 아래 짧은 소개와 서비스로 이어지는 안내를 둔다.

| 요소 | Desktop | Tablet·Mobile |
| --- | --- | --- |
| 첫 비주얼 `.hero-content` | `height: 100svh`, overflow hidden | `height: 159vw`, max-height `159vw` |
| 479px 이하 추가 규칙 | — | max-height `218vw`로 변경; height 자체는 여전히 `159vw` |
| 제목 위치 | top `3.7vw`, left `35vw`, 중앙 정렬 | top `6.5vw`, left `4.8vw`, 왼쪽 정렬 |
| 제목 폭 | `7ch` | 기본 폭 규칙 유지 |
| 이미지 `.hero-image` | absolute, width `100vw`, height 100%, cover | 세로 화면에 맞춰 crop |
| object-position | `50% 0%` | `49.4% 40%` |
| 보조 요소 | 아래쪽 원형 선과 스크롤 안내 | 원형 선과 안내를 축소 배치 |

1440×1000에서 제목은 상단 중앙, 큐브는 화면 중앙 아래에 놓인다. 390×844에서는 제목이 좌상단으로 이동하고 첫 비주얼 높이는 약 620px여서 다음 소개 제목의 일부도 보인다. 모든 모바일 Hero가 정확히 100vh라고 해석하면 안 된다.

### 6.2 개인 Hero 카피 구조 [권장·가안]

| 단계 | 예시 | 목적 |
| --- | --- | --- |
| Identity / H1 | `PARK / SEOJIN` + 한글 이름 | 누구의 포트폴리오인지 명확히 전달 |
| Role | 실제 전문 분야 한 줄 | 디자이너·퍼블리셔 등 확인된 역할 표시 |
| Positioning | `감각적인 화면을, 명확한 경험으로.` | 작업 관점 제안; 본인의 방향에 맞춰 확정 |
| Supporting copy | 대표 역량을 설명하는 한글 1–2문장 | 실제 수행 가능한 범위를 구체화 |
| Primary CTA | `대표 작업 보기` | Work 섹션으로 이동 |
| Secondary CTA | `연락하기` | Contact 섹션으로 이동 |

첫 화면 안에 이름·분야·작업 진입점을 함께 보여준다. 긴 철학 문장은 다음 소개 섹션으로 옮긴다. 예시 카피는 박서진의 실제 경력·전문 분야가 확인되기 전까지 가안이다.

### 6.3 이미지와 타이포 배치 [권장]

- Desktop: 상단 이름 또는 좌측 제목, 중앙·우측 대표 오브젝트. 제목과 밝은 이미지 영역이 겹치지 않게 한다.
- Tablet: 제목을 좌상단으로 정리하고 오브젝트를 중앙으로 이동한다. 가로 화면도 확인한다.
- Mobile: 이름 → 분야·소개 → CTA → 이미지의 읽기 순서를 유지한다. 이미지의 피사체 위치를 모바일용으로 따로 조정한다.
- 오브젝트는 직접 만든 모노그램, 레이어, 유리 패널, 작업 화면 중 하나로 정한다. 주요 프로젝트를 보여주는 대안도 가능하다.
- 대표 이미지에는 명시적 크기를 주고 우선 로드한다. 첫 화면 아래 이미지는 지연 로드한다. 동영상은 poster를 제공한다.

근거: [홈 Hero DOM](https://naya-studio-dubai.webflow.io/), [hero-content/hero-image/H1 CSS](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css).

## 7. Motion & Interaction — Hover, Scroll, Transition, GSAP 구현 방식

### 7.1 원본의 실제 기술 분담 [확인]

| 구현 | 역할 |
| --- | --- |
| Webflow IX2 | 메뉴 열기·닫기, 헤더 표시·숨김, 카드 스크롤, 버튼·아이콘 hover, 커서 추적 등 |
| GSAP 3.12.2 + ScrollTrigger | 제목·문단 등장과 일부 로딩·사운드 UI 연출 |
| SplitType 0.3.4 | 제목의 단어, 문단의 줄, 링크의 글자 분리 |
| Lenis | 992px 이상에서 부드러운 스크롤 |
| Swiper | 991px 이하 작업 갤러리, 후기 슬라이드 |
| Three.js 0.152.2 | Desktop 곡면 작업 갤러리, 깊이맵 기반 이미지 parallax |
| CSS + IntersectionObserver | 링크 글자 opacity, SVG 선 그리기, 비디오 로딩·재생 제어 |

Draggable 스크립트가 로드되지만, 확인한 3D 작업 갤러리는 자체 pointer 이벤트로 회전한다. 갤러리를 GSAP Draggable 기반이라고 단정하지 않는다. Lenis·Swiper 일부 URL은 버전이 고정되어 있지 않아 실제 로딩 버전을 소스 URL만으로 확정할 수 없다.

### 7.2 동작별 확인값

| 동작 | 원본 구현·설정 | 개인 적용 지침 [권장] |
| --- | --- | --- |
| 제목 등장 | `[letters-blur-in]`을 **words**로 분리. blur `.8vw`, opacity 0, scale .95 → 정상. duration 1.8s, `power1.inOut`, stagger 총 .4s, start `top 85%` | 0.7–1.0s, blur 최대 6px. 제목 전체가 늦게 읽히지 않게 함 |
| 문단 등장 | `[animate-p]`를 lines로 분리. opacity 0 → 1, .8s, `power1.in`, stagger .15s, start `top 100%` | 본문은 블러 없이 0.4–0.6s. 한글 자동 줄 분할은 resize 때 복구·재계산 |
| 링크 hover | 글자를 chars로 분리. 시작 글자와 거리 비례 delay .1s, opacity .4, transition .4s. 복귀는 거리×.08s, .5s | 읽기 대비를 유지하며 underline·아이콘 이동을 함께 사용 |
| 버튼 hover | padding .8s 전환 + Webflow 아이콘·SVG 연출 | padding 대신 내부 아이콘 transform, .2–.3s |
| SVG draw | path 길이 계산, stroke-dashoffset. 기본 delay .6s, duration 1.4s | 중요한 정보와 분리된 장식에만 적용 |
| Smooth scroll | Desktop만 Lenis: duration 1.2, lerp .1, wheelMultiplier .7, smoothTouch false, rAF 호출 | 기본 스크롤 유지 우선. 적용 시 ScrollTrigger와 업데이트를 연결 |
| 이미지 parallax | Desktop WebGL shader: 원본+깊이맵, 마우스 위치에 따른 UV 이동. xThreshold 20, yThreshold 35 | 한 장면에 제한, offscreen·reduce에서 정지 |
| 작업 갤러리 | Desktop: 곡면 plane을 원형 배치. pointer 이동량으로 회전, lerp .1, 드래그 속도에 따른 wave 변형 | 의미 있는 HTML 작업 목록과 병행, 자동 회전 정지 기능 제공 |
| 작은 화면 갤러리 | Swiper: loop true, slidesPerView auto, spaceBetween 20px, speed 500ms | 조작 버튼·키보드와 일반 링크를 제공 |
| 후기 | Desktop creative effect, speed 800ms, allowTouchMove false. 작은 화면은 기본 스와이프 500ms | 실제 후기가 있을 때만 사용, 고정 카드도 가능 |
| 페이지 전환 | `[transition-link]` 클릭 시 검정 overlay와 page 상태 변경, 2400ms 후 이동 | 250–450ms. 외부 링크·새 탭·수정 키 클릭은 가로채지 않음 |
| 로딩 | sessionStorage로 최초 방문 구분, 숫자 연출 3.5s와 여러 지연 단계 | 콘텐츠를 먼저 표시. 필요한 로딩 상태는 실제 준비 상태와 연결 |
| 사운드 | OFF/ON 토글, 클릭 후 Audio 재생, loop | 선택 사항. 사용자 동작 후 재생하고 토글 상태를 알림 |

제목 속 장식 글자와 **등장 애니메이션의 분리 단위**는 다르다. 함수 이름은 letters이지만 실제 GSAP 제목 분리는 words다. 서비스 카드 등 큰 스크롤 장면은 Webflow의 `SCROLLING_IN_VIEW` 정의를 함께 분석해야 한다.

### 7.3 개인 포트폴리오 GSAP 구현 예시 [권장]

원본의 완전 복제 코드가 아니라, 접근성과 반응형 분기를 포함한 시작 예시다. GSAP·ScrollTrigger가 import되어 있고, 의미 있는 HTML에 `.reveal`, `.hero-visual`, `.hero`가 있을 때 사용한다. CSS 기본 상태에서는 콘텐츠가 보여야 한다.

```js
gsap.registerPlugin(ScrollTrigger);
const media = gsap.matchMedia();

media.add({
  desktop: '(min-width: 992px)',
  mobile: '(max-width: 991px)',
  reduce: '(prefers-reduced-motion: reduce)',
}, (context) => {
  const { desktop, reduce } = context.conditions;
  const elements = gsap.utils.toArray('.reveal');
  const visual = document.querySelector('.hero-visual');

  if (reduce) {
    gsap.set(elements, { clearProps: 'opacity,transform,filter' });
    if (visual) gsap.set(visual, { clearProps: 'transform' });
    return;
  }

  elements.forEach((element) => {
    gsap.from(element, {
      opacity: 0,
      y: 20,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: element,
        start: 'top 88%',
        once: true,
      },
    });
  });

  if (desktop && visual) {
    gsap.to(visual, {
      yPercent: -6,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
      },
    });
  }
});

// 컴포넌트·페이지를 해제할 때 호출한다.
function destroyMotion() {
  media.revert();
}
```

Lenis를 추가한다면 Lenis scroll 이벤트에서 `ScrollTrigger.update`를 호출하고 GSAP ticker 또는 자체 rAF 중 하나로 구동한다. 중복 루프를 만들지 않는다. 레이아웃에 영향을 주는 이미지·폰트 준비 후 `ScrollTrigger.refresh()`를 호출한다. WebGL, Audio, Swiper, 이벤트 리스너는 GSAP context만으로 해제되지 않으므로 각각 정리한다.

근거: [홈 인라인 JS](https://naya-studio-dubai.webflow.io/), [Webflow 인터랙션 정의](https://cdn.prod.website-files.com/679742110fb07950530154b3/js/webflow.05662b10.1c8b4e2efead7231.js), [갤러리 구현](https://18dccfa619686586.cdn.express/naya-carousel-copy.js), [GSAP matchMedia 공식 문서](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

## 8. Responsive Design — Desktop, Tablet, Mobile별 레이아웃 변경

### 8.1 원본 breakpoint [확인]

주요 분기는 **992px 이상 / 991px 이하**다. CSS에는 767px·479px 이하 보정과 1280px·1440px 이상 규칙도 있다. Tablet이 Desktop을 단순 축소한 형태가 아니라, 대부분 Mobile 계열의 규칙을 공유한다.

| 요소 | Desktop ≥992px | Tablet 768–991px | Mobile ≤767px |
| --- | --- | --- | --- |
| Container | 좌우 3.125vw | 좌우 4.8vw | 좌우 4.8vw |
| H1 | 중앙, 7.3vw | 좌측, 15vw | 좌측, 15vw |
| 대형 제목 | 13.54vw | 14.93vw | 14.93vw |
| 기본 작은 텍스트 | .73vw | 3.2vw | 3.2vw |
| 내용 Grid | 비대칭 3열 | 32vw + 1fr 2열 | 같은 기본 2열, 세부 위치 재배치 |
| Hero 첫 비주얼 | 100svh | 159vw | 159vw; 479px 이하 max-height 보정 |
| 서비스 카드 | 기본 너비 29.5vw, radius 2vw | 79.2vw, radius 6.4vw | 같은 규칙 |
| 작업물 | Three.js 3D 갤러리 | Swiper 가로 갤러리 | Swiper 가로 갤러리 |
| 드래그 커서·깊이맵 | 활성 | 비활성 | 비활성 |
| Lenis | 활성 | 비활성 | 비활성 |
| 문의 | 2열 Grid | 세로 Flex | 세로 Flex |
| Footer | 가로 Flex | 세로, 하단 역순 | 세로, 하단 역순 |

Tablet 834px에서 H1은 125.1px, 기본 `.text-small`은 약 26.69px다. Mobile 390px에서는 각각 58.5px, 12.48px다. 원본의 공유 `vw` 규칙 때문에 Tablet의 일부 UI가 상당히 커진다. 개인 사이트는 Tablet용 상한을 따로 정한다.

### 8.2 개인 사이트 반응형 지침 [권장]

- Desktop: 이미지·타이포의 대비와 비대칭 구조를 유지하되 주요 작업 진입을 짧게 만든다.
- Tablet: 제목 72–104px, UI 14px로 제한한다. 포인터 hover가 없을 때도 메타데이터가 항상 보이게 한다.
- Mobile: 본문 16px, UI 14px 이상, 단일 읽기 흐름. 작업 목록은 1열을 기본으로 하고 갤러리를 선택하면 scroll-snap과 버튼을 병행한다.
- 3D 갤러리를 기본 작업 목록 위에 추가하는 방식이면 WebGL 실패·작은 화면·reduce에도 HTML 목록이 남는다.
- Hero는 모바일 주소창을 고려한 `svh` 또는 콘텐츠 기반 min-height를 사용하고, CTA가 화면 밖으로 밀리지 않게 한다.
- `hover: hover`와 `pointer: fine`인 환경에서만 커서 추적·hover 전용 장식을 켠다.
- breakpoint 변경 시 기존 Swiper·WebGL·모션을 정리하고 필요한 구현만 다시 초기화한다. 원본 일부 3D 모듈은 최초 로드 너비에서만 분기하므로 resize 대응을 별도로 설계한다.

### 8.3 구현 후 확인할 화면 [권장]

| 크기 | 확인 항목 |
| --- | --- |
| 1920×1080 / 1440×900 | 제목 최대 크기, 긴 줄, container 상한 |
| 1024×768 / 992px·991px 경계 | 갤러리·메뉴·모션 전환 |
| 834×1112 / 768×1024 | Tablet 글자 상한, 세로·가로 방향 |
| 390×844 / 360×800 / 320px 너비 | 한글 줄바꿈, CTA, 가로 넘침 |
| 200% 확대 / 키보드·터치 | 콘텐츠 손실, 겹침, 포커스 가림 |

이 표는 향후 구현 검증 기준이다. 이번 분석에서 모두 시험한 크기 목록이 아니다.

근거: [원본 미디어 쿼리](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css), [홈 JS의 width 분기](https://naya-studio-dubai.webflow.io/), 1440·834·390px 렌더링.

## 9. Accessibility — 텍스트 대비, 포커스, 키보드 조작, 모션 감소 설정

### 9.1 확인한 상태와 한계

| 항목 | 레퍼런스에서 확인한 내용 | 개인 사이트의 개선 지침 [권장] |
| --- | --- | --- |
| 기본 대비 | 흰색/검정은 21:1. 이미지 위 글자는 배경 프레임에 따라 달라짐 | 밝은 이미지 위에는 안정적인 어두운 면·그라디언트 확보 |
| 낮은 강조 텍스트 | `.has--low-opacity`의 `#FFFFFF54`는 검정 위 합성 시 `#545454` 상당, 약 2.77:1 | 작은 의미 있는 텍스트에는 `#B8BCC7` 사용 |
| 폰트 크기 | 1440에서 기본 UI 약 10.51px, 390에서 약 12.48px | UI 14px, 본문 16px을 디자인 목표로 사용 |
| Focus CSS | `*[tabindex]:focus-visible`와 file input에 `#4D65FF` 2px outline·2px offset | 모든 링크·버튼·입력에 공통 focus-visible 적용 |
| 메뉴 키보드 | Chrome 1440 테스트: Enter로 열림. 포커스가 body로 이동. Escape 후에도 메뉴가 열린 상태 | 메뉴 내부 초기 포커스, Escape 닫기, 닫은 뒤 토글로 복귀 |
| 메뉴 상태 전달 | 테스트한 `.menu-button`은 `<a href="#">`, role·aria-expanded 없음 | 실제 button과 aria-controls·aria-expanded 사용 |
| 작업 갤러리 | Desktop 주요 표현이 canvas, pointer 드래그·자동 회전 중심 | 동일 작업의 HTML 링크 목록, 버튼·키보드 경로, 회전 정지 |
| 비디오 | autoplay·loop·muted 요소 다수, 컨트롤을 숨기는 CSS 존재 | 지속되는 장식 모션의 정지 기능·정적 poster 제공 |
| 모션 감소 | Webflow 런타임 일부는 reduced-motion 처리 코드가 있으나 IX2 처리는 body의 `data-wf-ix-vacation` 존재 여부를 조건으로 사용. 현재 body에 해당 속성 없음. 별도 GSAP·Lenis·Three.js 코드에는 reduce 분기를 확인하지 못함 | 모든 모션 계층에서 동일한 reduce 정책 적용 |

위 결과는 부분 점검이다. 사이트 전체가 WCAG를 준수하거나 위반한다는 인증·종합 판정으로 사용하지 않는다. Webflow 기본 처리만으로 사용자 정의 모션까지 모두 감소한다고 가정하지 않는다.

### 9.2 대비 기준과 팔레트 검증

일반 텍스트는 최소 **4.5:1**, 큰 텍스트는 최소 **3:1**을 목표로 한다. WCAG의 큰 텍스트 기준은 일반 글꼴 약 24 CSS px 또는 굵은 글꼴 약 18.67px 이상이다. 얇은 display 글꼴은 명목 대비를 만족해도 약해 보이므로 더 높은 대비·충분한 굵기를 확보한다. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

| 조합 | 계산 대비 | 적용 |
| --- | --- | --- |
| `#FFFFFF` / `#000000` | 21.00:1 | 주요 텍스트 |
| `#B8BCC7` / `#111315` | 약 9.80:1 | 보조 설명·메타데이터 |
| `#B6A0E3` / `#111315` | 약 8.09:1 | 브랜드 텍스트·포커스 |
| 원본 `#FFFFFF54` / 검정 합성 | 약 2.77:1 | 의미 있는 작은 글자에 부적합 |

계산은 sRGB 상대 휘도 공식과 지정된 단색 배경 기준이다. 실제 이미지·그라디언트·반투명 레이어가 겹치면 최종 합성 배경으로 다시 확인한다. 입력 오류·활성 상태는 색 외에도 문구·아이콘·선으로 표시한다.

### 9.3 조작·문서 구조 지침 [권장]

- 페이지 언어는 `lang="ko"`, 주요 영문 구절은 필요 시 `lang="en"`으로 구분한다.
- `header / nav / main / section / footer`, 한 개의 H1과 순서가 맞는 H2·H3를 사용한다. 시각적 줄바꿈을 위해 여러 H2로 한 문장을 쪼개지 않는다.
- 작업을 설명하는 이미지에는 목적에 맞는 alt, 장식 이미지에는 빈 alt를 사용한다. 장식 canvas는 접근성 트리에서 숨기고 같은 정보의 HTML을 제공한다.
- 글자를 여러 span으로 나눠도 접근 가능한 이름은 정상 문장으로 유지한다. 장식 복제본에는 aria-hidden을 적용한다.
- 메뉴·갤러리·사운드 토글을 키보드로 조작할 수 있게 한다. 사운드 토글은 aria-pressed와 명확한 이름을 사용한다.
- 폼은 placeholder 외에 label을 연결한다. 오류는 필드와 연결하고 제출 결과는 status로 안내한다.
- 클릭 영역은 내부 디자인 기준으로 44×44px 이상을 권장한다. WCAG 2.2 AA의 24×24px 최소 기준 및 간격·예외와 구분한다. [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- 스킵 링크를 제공하고 fixed header가 포커스를 가리지 않게 한다. 배경을 막는 메뉴에는 focus trap, 일반 내비게이션에는 자연스러운 Tab 순서를 사용한다.

```css
:where(a, button, input, textarea, select):focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .decorative-loop { animation: none; }
  .interactive-decor { transition: none; }
}
```

CSS만으로 GSAP·WebGL·Lenis가 멈추지는 않는다. reduce에서는 parallax·자동 회전·부드러운 스크롤·반복 장식을 초기화하지 않고, 동영상은 정적 poster로 대체한다. 사용자 설정 변경에도 반응해야 한다. 모션을 꺼도 작업 탐색·메뉴·콘텐츠가 정상 작동해야 한다.

근거: [원본 DOM·인라인 CSS/JS](https://naya-studio-dubai.webflow.io/), [Webflow 런타임](https://cdn.prod.website-files.com/679742110fb07950530154b3/js/webflow.05662b10.1c8b4e2efead7231.js), 키보드 부분 점검, W3C 공식 설명 문서.

## 10. Personal Branding — 레퍼런스를 개인 브랜드에 맞게 재해석할 방법

### 10.1 브랜드 방향 [권장·가안]

**박서진의 시각적 감각과 실제 작업 역량이 함께 드러나는 포트폴리오**를 목표로 한다. 이름 외의 전문 분야·경력·성과는 확인되지 않았으므로 아래 구성은 가안이며 실제 자료에 맞춰 확정한다.

| 레퍼런스 요소 | 개인 브랜드로 바꿀 방법 | 전달할 의미 |
| --- | --- | --- |
| 자연·꽃·공간 연출 | 직접 만든 이미지 또는 대표 작업 화면 | 실제 결과물을 통해 감각을 보여줌 |
| 거울 큐브·깊이 | 레이어·프레임·모노그램 중 한 가지 | 관점, 구성, 구현 과정 |
| 장식적인 O | 이름·이니셜 PSJ에서 출발한 고유 그래픽 | 식별 가능한 서명 |
| 서비스 4종 | 실제 역량 3–4개와 관련 작업 링크 | 무엇을 수행할 수 있는지 명확히 전달 |
| 3D 작업 갤러리 | 대표 프로젝트 3–5개의 탐색 가능한 목록 | 결과물의 접근성과 비교 가능성 |
| 후기·장점 | 실제 역할·과정·검증 결과 | 근거가 있는 신뢰 형성 |
| 이벤트 문의 | 협업·채용 연락 경로 | 다음 행동을 쉽게 연결 |

### 10.2 권장 페이지 순서

| 순서 | 섹션 | 필수 내용 |
| --- | --- | --- |
| 01 | Hero | 이름, 실제 분야, 대표 비주얼, Work·Contact CTA |
| 02 | Selected Work | 대표 프로젝트 3–5개, 역할·기간·분야 |
| 03 | About | 소개, 작업 관점, 확인된 경험 |
| 04 | Approach / Capabilities | 강점 3개와 작업에서의 근거 |
| 05 | Contact | 실제 이메일, 필요 시 이력서·외부 포트폴리오 |
| 06 | Footer | 이름, 링크, 저작권 |

레퍼런스는 분위기와 서비스 설명을 긴 스크롤로 먼저 보여준다. 개인 포트폴리오는 대표 작업을 앞에 배치해 평가자가 결과물을 빨리 볼 수 있게 한다. 실제 후기가 없다면 후기 섹션을 만들지 않는다.

### 10.3 프로젝트 상세 페이지의 정보 기준

| 항목 | 작성 내용 |
| --- | --- |
| Overview | 작업 목적·대상·기간·개인/팀 프로젝트 여부 |
| My Role | 본인이 맡은 범위와 팀 기여 구분 |
| Problem | 해결하려던 문제 또는 디자인 목표 |
| Decision | 레이아웃·타이포·인터랙션을 선택한 이유 |
| Process | 핵심 탐색·수정 과정과 전후 비교 |
| Result | 최종 화면, 동작, 확인한 결과 |
| Evidence | 실제 링크·검증 내용·근거가 있는 지표 |
| Reflection | 다음에 개선할 점 |

기술 스택은 실제 사용한 것만 적고 역할과 연결한다. 수치 성과가 없으면 확인한 개선점과 검증 방법을 설명한다. 존재하지 않는 고객·경력·성과를 예시 문구로 채우지 않는다.

### 10.4 브랜드 일관성 기준

- 표기: 한글 `박서진`, 영문 `PARK SEOJIN`을 기본 가안으로 통일한다. 실제 선호 영문 표기가 있으면 전체에 반영한다.
- 컬러: 검정·흰색 기반에 밝은 퍼플 하나를 서명색으로 사용한다. 프로젝트 고유 색은 유지한다.
- 모티프: 레이어 또는 프레임 한 가지를 Hero·구분선·프로젝트 이미지에 반복한다. 큐브·꽃·원을 모두 브랜드 모티프로 채택하지 않는다.
- 문장: 소개는 짧고 구체적으로, 케이스 스터디는 판단과 근거가 보이게 쓴다.
- 모션: 대표 장면 하나 + 짧은 등장·hover를 공통 문법으로 삼는다. Reduce와 모바일에서는 정보 구조가 그대로 남는다.

### 10.5 구현 우선순위와 완료 기준

| 단계 | 작업 | 완료 기준 |
| --- | --- | --- |
| 1 | 이름·분야·프로젝트·연락처 확정 | 가안과 실제 정보 구분 완료 |
| 2 | 정적 구조·반응형·토큰 | 모션 없이 모든 콘텐츠·링크 사용 가능 |
| 3 | Hero·대표 작업의 시각 품질 | 타이포 위계·이미지 crop·대비 확인 |
| 4 | Hover·GSAP 등장 | 모바일·키보드·reduce에서 정상 사용 |
| 5 | 선택적 3D·미디어 | 실패 시 대체 콘텐츠, 정지·해제 구현 |
| 6 | 최종 점검 | 320px~대형 화면, 확대, 포커스, 실제 링크 확인 |

### 분석 자료와 검증 범위

| 자료 | 확인한 항목 |
| --- | --- |
| [레퍼런스 홈](https://naya-studio-dubai.webflow.io/) | DOM, 제목·폼·링크 구조, 인라인 모션·스타일 |
| [외부 CSS](https://cdn.prod.website-files.com/679742110fb07950530154b3/css/naya-studio-dubai.webflow.shared.c44151af9.css) | 폰트, 색, 레이아웃, 컴포넌트, breakpoint |
| [Webflow JS](https://cdn.prod.website-files.com/679742110fb07950530154b3/js/webflow.05662b10.1c8b4e2efead7231.js) | 인터랙션 정의, 기본 reduced-motion 처리 조건 |
| [Three.js 갤러리 JS](https://18dccfa619686586.cdn.express/naya-carousel-copy.js) | 곡면 카드, 라벨, pointer 회전, wave 변형 |
| [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) | 권장 반응형·모션 감소 예제의 근거 |
| [W3C 텍스트 대비](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 대비 기준과 얇은 글꼴 고려 |
| [W3C 조작 영역](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | 최소 조작 크기 기준과 예외 |

실제 확인: Desktop·Tablet·Mobile의 Hero, 소개·서비스·작업물·문의·Footer 관련 화면 및 코드, Desktop 3D 갤러리, 작은 화면 Swiper, 메뉴 Enter·Escape 부분 점검. 일부 지연 로드 이미지의 DOM 로딩 여부는 시점에 따라 달랐으며, 이를 사이트 전체의 로딩 실패로 판정하지 않았다. 완전한 스크린리더·전체 키보드·실기기·성능 검증은 향후 구현 검증 항목이다.
