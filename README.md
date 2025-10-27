# 🚇 OpenSG Metro City

![지하철 노선도](https://github.com/user-attachments/assets/eda60ebe-e6a5-4a84-a97e-e6874acaab4e)
React + TypeScript + Leaflet 기반의 인터랙티브 지하철 노선도 애플리케이션

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
- [프로젝트 구조](#-프로젝트-구조)
- [문서](#-문서)
- [개발 가이드](#-개발-가이드)

## 🎯 프로젝트 소개

OpenSG Metro City는 가상의 도시 지하철 노선도를 시각화하고, 최단 경로를 탐색할 수 있는 웹 애플리케이션입니다. Leaflet 지도 라이브러리를 활용하여 인터랙티브한 사용자 경험을 제공하며, Dijkstra 알고리즘을 통해 최적의 경로를 계산합니다.

### 특징

- 🗺️ 인터랙티브한 지하철 노선도 시각화
- 🔍 출발지/도착지 기반 최단 경로 탐색
- ⏱️ 소요 시간 및 환승 정보 제공
- 🎨 노선별 필터링 및 하이라이트
- 📍 환승역 강조 표시
- 📝 검색 이력 관리

## ✨ 주요 기능

### 1. 경로 탐색

- 출발역과 도착역을 선택하여 최단 경로 계산
- 정차역 수, 환승 횟수, 예상 소요 시간 표시
- 경로를 지도에 시각적으로 표시 (빨간색 하이라이트)
- 진행 방향 화살표 표시

### 2. 노선 필터링

- 특정 노선만 선택하여 보기
- 선택되지 않은 노선은 반투명 처리
- 전체 노선도 보기 모드

### 3. 역 정보

- 각 역의 상세 정보 표시
- 소속 노선 정보
- 환승역 여부 표시

### 4. 검색 이력

- 최근 검색한 경로 저장
- 이력에서 빠른 재검색
- 이력 삭제 기능

## 🛠 기술 스택

### Core

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구

### UI/UX

- **Ant Design** - UI 컴포넌트 라이브러리
- **Leaflet** - 지도 시각화
- **React-Leaflet** - React용 Leaflet 래퍼

### 알고리즘

- **Dijkstra** - 최단 경로 탐색

### 개발 도구

- **ESLint** - 코드 품질 관리
- **TypeScript ESLint** - TypeScript 린팅

## 🚀 시작하기

### 필수 요구사항

- Node.js 18.x 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>

# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 📁 프로젝트 구조

```
src/
├── Components/          # React 컴포넌트
│   ├── MetroMapContainer.tsx    # 컨테이너 컴포넌트 (로직)
│   ├── MetroMap.tsx             # 프레젠테이셔널 컴포넌트 (UI)
│   └── SearchHistoryCard.tsx    # 검색 이력 UI
├── hooks/              # 커스텀 훅
│   ├── useMetroMap.ts           # 지도 관리 훅
│   └── useRouteState.ts         # 경로 상태 관리 훅
├── utils/              # 유틸리티 함수
│   ├── pathfinding.ts           # Dijkstra 알고리즘
│   ├── mapHelpers.ts            # 지도 헬퍼 함수
│   └── constants.ts             # 상수 정의
├── data/               # 데이터 정의
│   ├── types.ts                 # TypeScript 타입
│   ├── stations.ts              # 역 데이터
│   ├── subwayLines.ts           # 노선 데이터
│   └── edges.ts                 # 연결 데이터
├── App.tsx             # 메인 앱 컴포넌트
└── main.tsx            # 엔트리 포인트
```

### 아키텍처 패턴

이 프로젝트는 **관심사의 분리(Separation of Concerns)** 원칙을 따릅니다:

- **Components**: UI 렌더링 담당
  - Container: 비즈니스 로직과 상태 관리
  - Presentational: 순수 UI 렌더링
- **Hooks**: 재사용 가능한 로직 캡슐화
- **Utils**: 순수 함수와 헬퍼
- **Data**: 데이터 정의와 타입

## 📚 문서

프로젝트를 더 깊이 이해하기 위한 상세 문서:

### 필독 문서

- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - 문서 가이드 (여기서 시작!)
- **[CODE_REVIEW.md](./CODE_REVIEW.md)** - 프로젝트 구조 개요
- **[FEATURE_MAPPING.md](./FEATURE_MAPPING.md)** - 기능별 코드 위치

### 상세 문서

- **[DETAILED_CODE_REVIEW.md](./DETAILED_CODE_REVIEW.md)** - 파일별 코드 분석
- **[ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)** - 아키텍처 다이어그램
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - 빠른 참조 가이드

### 심화 문서

- **[HOOKS_DEEP_DIVE.md](./HOOKS_DEEP_DIVE.md)** - React 훅 상세 설명
- **[USEEFFECT_TIMING_EXPLAINED.md](./USEEFFECT_TIMING_EXPLAINED.md)** - useEffect 타이밍
- **[IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)** - 구현 세부사항

## 🔧 개발 가이드

### 새로운 역 추가

`src/data/stations.ts`에 역 정보 추가:

```typescript
{
  id: "S99",
  name: "새역",
  lat: 100,
  lng: 50,
  lines: ["1"],
  isTransfer: false,
  description: "새로운 역입니다"
}
```

### 새로운 노선 추가

1. `src/data/subwayLines.ts`에 노선 정의
2. `src/data/edges.ts`에 연결 정보 추가
3. 역 데이터에 노선 ID 추가

### 경로 탐색 알고리즘 수정

`src/utils/pathfinding.ts`의 `dijkstraWithTransfers` 함수 참조

### 스타일 커스터마이징

- 역 마커 스타일: `src/utils/constants.ts`
- 노선 색상: `src/data/subwayLines.ts`
- UI 컴포넌트: `src/Components/` 내 각 파일

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 👥 제작

Recruitment Task Project

## 참고

- [Leaflet](https://leafletjs.com/) - 오픈소스 지도 라이브러리
- [Ant Design](https://ant.design/) - React UI 프레임워크
- [React](https://react.dev/) - UI 라이브러리
