# 아키텍처 다이어그램

## 📐 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자 (User)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ 클릭, 입력
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Components (UI Layer)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          MetroMapContainer.tsx (Container)           │   │
│  │  - 상태 관리 (selectedStation, selectedLine)         │   │
│  │  - 이벤트 핸들러 (handleStationSelect)               │   │
│  │  - 경로 탐색 로직 (useEffect)                        │   │
│  └────────────┬─────────────────────────┬────────────────┘   │
│               │                         │                    │
│               ↓                         ↓                    │
│  ┌────────────────────┐   ┌────────────────────────────┐   │
│  │   MetroMap.tsx     │   │ SearchHistoryCard.tsx      │   │
│  │  (Presentational)  │   │  (Presentational)          │   │
│  │  - UI 렌더링       │   │  - 검색 UI                 │   │
│  │  - 노선 버튼       │   │  - 이력 UI                 │   │
│  └────────────────────┘   └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Hooks (Logic Layer)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              useMetroMap.ts                          │   │
│  │  - Leaflet 지도 초기화                               │   │
│  │  - 노선/역 렌더링                                    │   │
│  │  - 경로 그리기 (drawRoute)                           │   │
│  │  - 노선 필터링                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              useRouteState.ts                        │   │
│  │  - 출발지/도착지 상태                                │   │
│  │  - 경로 이력 관리                                    │   │
│  │  - 이력 추가/삭제                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Utils (Helper Layer)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              pathfinding.ts                          │   │
│  │  - Dijkstra 알고리즘                                 │   │
│  │  - 최단 경로 계산                                    │   │
│  │  - 통계 계산 (시간, 환승)                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              mapHelpers.ts                           │   │
│  │  - Label 생성 (createStationLabel)                  │   │
│  │  - 하이라이트 (highlightStationCircles)             │   │
│  │  - 정보 텍스트 업데이트 (setInfoText)               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              constants.ts                            │   │
│  │  - UI 상수 (크기, 간격, 위치)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data (Data Layer)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  types.ts  │  stations.ts  │  subwayLines.ts  │      │   │
│  │  edges.ts  │                                          │   │
│  │  - 타입 정의                                         │   │
│  │  - 역 데이터                                         │   │
│  │  - 노선 데이터                                       │   │
│  │  - 연결 데이터                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 기능별 데이터 흐름

### 1. 역 이름 Label 표시

```
data/stations.ts
    │ (역 데이터)
    ↓
hooks/useMetroMap.ts
    │ (지도 초기화 시)
    ↓
utils/mapHelpers.ts
    │ createStationLabel()
    ↓
utils/constants.ts
    │ (스타일 상수)
    ↓
Leaflet Map
    │ (화면에 표시)
    ↓
사용자
```

### 2. 출발지/도착지 선정

```
사용자 클릭
    ↓
hooks/useMetroMap.ts
    │ (팝업 표시)
    │ 버튼 클릭 이벤트
    ↓
Components/MetroMapContainer.tsx
    │ handleStationSelect()
    ↓
hooks/useRouteState.ts
    │ setStartStation()
    │ setEndStation()
    ↓
utils/mapHelpers.ts
    │ highlightStationCircles()
    ↓
DOM 업데이트
    │ (마커 색상 변경)
    ↓
사용자
```

### 3. 경로 탐색 및 표시

```
hooks/useRouteState.ts
    │ (출발지/도착지 상태 변경)
    ↓
Components/MetroMapContainer.tsx
    │ useEffect 트리거
    ↓
utils/pathfinding.ts
    │ dijkstraWithTransfers()
    │ - 그래프 구조 생성
    │ - 최단 경로 계산
    │ - 통계 계산
    ↓
PathfindingResult
    │ { minutes, stops, transfers, coords, ... }
    ↓
┌─────────────┴─────────────┐
│                           │
↓                           ↓
hooks/useMetroMap.ts        Components/MetroMapContainer.tsx
│ drawRoute()               │ updateInfoText()
│ - Polyline 그리기         │ - 경로 정보 생성
│ - 화살표 추가             │
↓                           ↓
utils/mapHelpers.ts         utils/mapHelpers.ts
│ highlightTransferLabels() │ setInfoText()
↓                           ↓
Leaflet Map                 정보 패널
│                           │
└─────────────┬─────────────┘
              ↓
            사용자
```

### 4. 노선 필터링

```
사용자 클릭 (노선 버튼)
    ↓
Components/MetroMap.tsx
    │ highlightLine(lineId)
    ↓
Components/MetroMapContainer.tsx
    │ 토글 로직
    │ setSelectedLine()
    ↓
hooks/useMetroMap.ts
    │ useEffect 트리거
    │ (selectedLine 변경 감지)
    ↓
polylinesRef.current
    │ forEach((polyline) => {
    │   if (선택된 노선)
    │     opacity: 0.8
    │   else
    │     opacity: 0.15
    │ })
    ↓
markersRef.current
    │ forEach((marker) => {
    │   if (선택된 노선의 역)
    │     opacity: 1
    │   else
    │     opacity: 0.2
    │ })
    ↓
Leaflet Map 업데이트
    ↓
사용자
```

---

## 🎯 컴포넌트 계층 구조

```
App.tsx
  │
  └─ MetroMapContainer.tsx (Container)
       │
       ├─ useRouteState() ────────────┐
       │   - startStation              │
       │   - endStation                │
       │   - routeHistory              │
       │   - addToHistory()            │
       │                               │
       ├─ useMetroMap() ──────────────┤
       │   - mapContainerRef           │
       │   - drawRoute()               │
       │   - clearRoute()              │
       │   - updateInfoText()          │
       │                               │
       └─ MetroMap.tsx (Presentational)│
            │                          │
            ├─ SearchHistoryCard.tsx   │
            │   - 검색 UI              │
            │   - 이력 UI              │
            │                          │
            ├─ 노선 목록 카드          │
            │   - 노선 버튼            │
            │                          │
            ├─ 환승역 목록 카드        │
            │   - 환승역 버튼          │
            │                          │
            ├─ 역 정보 카드            │
            │   - 선택된 역 상세       │
            │                          │
            └─ 지도 컨테이너           │
                - Leaflet Map ─────────┘
```

---

## 📦 모듈 의존성 그래프

```
Components/
  MetroMapContainer ──┬──> hooks/useRouteState
                      ├──> hooks/useMetroMap
                      ├──> utils/pathfinding
                      └──> data/stations, subwayLines, edges

  MetroMap ───────────┬──> Components/SearchHistoryCard
                      └──> data/types

hooks/
  useMetroMap ────────┬──> utils/mapHelpers
                      ├──> utils/constants
                      └──> data/types

  useRouteState ──────┴──> data/types

utils/
  pathfinding ────────┬──> data/types
                      └──> (순수 함수, 의존성 없음)

  mapHelpers ─────────┬──> utils/constants
                      └──> data/types

  constants ──────────┴──> (상수만, 의존성 없음)

data/
  stations ───────────┬──> data/types
  subwayLines ────────┤
  edges ──────────────┤
  types ──────────────┴──> (기본 타입, 의존성 없음)
```

---

## 🔍 상태 관리 흐름

```
┌─────────────────────────────────────────────────────────┐
│                    Global State (없음)                   │
│  이 프로젝트는 Redux나 Context API를 사용하지 않습니다   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              MetroMapContainer (Local State)             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  selectedStation: Station | null                  │  │
│  │  selectedLine: string | null                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│              useRouteState (Custom Hook State)           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  startStation: Station | null                     │  │
│  │  endStation: Station | null                       │  │
│  │  routeHistory: RouteHistoryItem[]                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│              useMetroMap (Refs, No State)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  mapRef: L.Map                                    │  │
│  │  markersRef: Map<string, L.Marker>               │  │
│  │  polylinesRef: Map<string, L.Polyline>           │  │
│  │  routeLayerRef: L.LayerGroup                     │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**왜 Global State가 없나요?**

- 프로젝트 규모가 작아서 Props Drilling 문제가 없음
- 커스텀 훅으로 상태 로직을 재사용
- 컴포넌트 계층이 깊지 않음 (최대 3단계)

---

## 🎨 UI 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        전체 화면                             │
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │              │                                      │   │
│  │  사이드 패널  │          지도 영역                   │   │
│  │  (350px)     │                                      │   │
│  │              │  ┌────────────────────────────────┐  │   │
│  │ ┌──────────┐ │  │  정보 패널 (우측 상단)         │  │   │
│  │ │ 검색/이력 │ │  │  - 출발지 → 도착지            │  │   │
│  │ └──────────┘ │  │  - 정차역, 환승, 시간         │  │   │
│  │              │  └────────────────────────────────┘  │   │
│  │ ┌──────────┐ │                                      │   │
│  │ │ 노선도   │ │         Leaflet Map                  │   │
│  │ │ 전체보기 │ │         - 노선 Polyline              │   │
│  │ └──────────┘ │         - 역 마커 + Label            │   │
│  │              │         - 경로 하이라이트            │   │
│  │ ┌──────────┐ │         - 진행 방향 화살표           │   │
│  │ │ 지하철   │ │                                      │   │
│  │ │ 노선     │ │                                      │   │
│  │ │ (스크롤) │ │                                      │   │
│  │ └──────────┘ │                                      │   │
│  │              │                                      │   │
│  │ ┌──────────┐ │                                      │   │
│  │ │ 주요     │ │                                      │   │
│  │ │ 환승역   │ │                                      │   │
│  │ │ (스크롤) │ │                                      │   │
│  │ └──────────┘ │                                      │   │
│  │              │                                      │   │
│  │ ┌──────────┐ │                                      │   │
│  │ │ 역 정보  │ │                                      │   │
│  │ │ (조건부) │ │                                      │   │
│  │ └──────────┘ │                                      │   │
│  │              │  ┌────────────────────────────────┐  │   │
│  │              │  │  범례 (하단)                   │  │   │
│  │              │  │  - 노선별 색상                 │  │   │
│  │              │  └────────────────────────────────┘  │   │
│  └──────────────┴──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💾 데이터 구조

### Station (역)

```typescript
{
  id: "S1",
  name: "금융가",
  lat: 100,
  lng: 50,
  lines: ["1"],           // 소속 노선 (배열)
  isTransfer: false,      // 환승역 여부
  description: "설명"
}
```

### Edge (연결)

```typescript
{
  from: "S1",             // 출발역 ID
  to: "S2",               // 도착역 ID
  line: "1",              // 노선 ID (또는 "1-2" 환승)
  weight: 3               // 소요 시간 (분)
}
```

### PathfindingResult (경로 결과)

```typescript
{
  minutes: 20,            // 총 소요 시간
  stops: 4,               // 정차역 수
  transfers: 1,           // 환승 횟수
  coords: [[100,50], ...],// 경로 좌표
  transferStationIds: [], // 환승역 ID 목록
  path: ["S1@1", ...],    // 노드 경로
  nodeMeta: Map           // 노드 메타데이터
}
```

---

이 다이어그램들을 참고하면 프로젝트의 전체 구조를 한눈에 파악할 수 있습니다! 🎯
