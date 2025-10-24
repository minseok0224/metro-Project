# Design Document

## Overview

MetroMapContainer 컴포넌트의 리팩토링은 관심사 분리(Separation of Concerns) 원칙에 따라 다음과 같은 구조로 재구성됩니다:

1. **데이터 레이어**: 역, 노선, 연결 정보를 별도 파일로 분리
2. **비즈니스 로직 레이어**: 경로 탐색 알고리즘을 유틸리티 모듈로 분리
3. **UI 레이어**: Leaflet 지도 관련 로직을 Custom Hook으로 분리
4. **상태 관리 레이어**: 애플리케이션 상태를 Custom Hook으로 분리
5. **프레젠테이션 레이어**: 간소화된 컴포넌트

이를 통해 각 모듈의 책임을 명확히 하고, 테스트 용이성과 코드 재사용성을 향상시킵니다.

## Architecture

### 디렉토리 구조

```
src/
├── Components/
│   ├── MetroMapContainer.tsx (간소화됨)
│   ├── MetroMap.tsx (기존 유지)
│   └── SearchHistoryCard.tsx (기존 유지)
├── data/
│   ├── stations.ts (역 데이터)
│   ├── subwayLines.ts (노선 데이터)
│   ├── edges.ts (연결 정보)
│   └── types.ts (공통 타입 정의)
├── hooks/
│   ├── useMetroMap.ts (지도 초기화 및 렌더링)
│   └── useRouteState.ts (경로 탐색 상태 관리)
└── utils/
    ├── pathfinding.ts (경로 탐색 알고리즘)
    ├── mapHelpers.ts (지도 UI 헬퍼 함수)
    └── constants.ts (상수 정의)
```

### 데이터 흐름

```
[데이터 파일] → [Custom Hooks] → [Container 컴포넌트] → [Presentation 컴포넌트]
                      ↓
                [유틸리티 함수]
```

## Components and Interfaces

### 1. 데이터 레이어

#### `src/data/types.ts`

공통 타입 정의를 export합니다.

```typescript
export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  isTransfer: boolean;
  description: string;
}

export interface SubwayLine {
  id: string;
  name: string;
  color: string;
}

export interface Edge {
  from: string;
  to: string;
  line: string;
  weight: number;
}

export type RouteHistoryItem = {
  from: Station;
  to: Station;
};
```

#### `src/data/stations.ts`

역 정보를 export합니다.

```typescript
import type { Station } from "./types";

export const stations: Station[] = [
  // 기존 stations 배열 내용
];
```

#### `src/data/subwayLines.ts`

노선 정보를 export합니다.

```typescript
import type { SubwayLine } from "./types";

export const subwayLines: SubwayLine[] = [
  // 기존 subwayLines 배열 내용
];
```

#### `src/data/edges.ts`

연결 정보와 상수를 export합니다.

```typescript
import type { Edge } from "./types";

export const EDGE_STOP_MIN = 4;
export const EDGE_TRANSFER_MIN = 2;

export const edges: Edge[] = [
  // 기존 edges 배열 내용
];
```

### 2. 비즈니스 로직 레이어

#### `src/utils/pathfinding.ts`

경로 탐색 알고리즘을 제공합니다.

```typescript
import type { Station, Edge } from "../data/types";

export type NodeKey = string; // `${stationId}@${lineId}`

export interface PathfindingResult {
  minutes: number;
  stops: number;
  transfers: number;
  coords: [number, number][];
  transferStationIds: string[];
  path: NodeKey[];
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>;
}

export function buildGraph(
  stations: Station[],
  edges: Edge[]
): {
  adj: Map<NodeKey, Array<{ to: NodeKey; cost: number }>>;
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>;
};

export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,
  edgeTransferMin: number
): PathfindingResult | null;
```

**주요 기능:**

- `buildGraph`: Edge 리스트를 기반으로 그래프 구조 생성
- `dijkstraWithTransfers`: Dijkstra 알고리즘을 사용한 최단 경로 탐색
- 환승역 추출 및 통계 계산
- 경로 좌표 배열 생성

### 3. UI 헬퍼 레이어

#### `src/utils/mapHelpers.ts`

Leaflet 지도 관련 UI 헬퍼 함수를 제공합니다.

```typescript
import L from "leaflet";
import type { Station } from "../data/types";

export function createStationLabel(
  station: Station,
  color: string,
  isTransfer?: boolean,
  isStart?: boolean,
  isEnd?: boolean
): L.DivIcon;

export function highlightTransferLabels(transferStationIds: string[]): void;

export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void;

export function setInfoText(text: string): void;
```

**주요 기능:**

- `createStationLabel`: 역 마커용 DivIcon 생성
- `highlightTransferLabels`: 환승역 라벨 하이라이트
- `highlightStationCircles`: 출발/도착역 원형 마커 하이라이트
- `setInfoText`: 정보 패널 텍스트 업데이트

#### `src/utils/constants.ts`

상수 정의를 제공합니다.

```typescript
export const LABEL_GAP = 14;
export const TRANSFER_MARKER_SIZE = 24;
export const NORMAL_MARKER_SIZE = 18;
export const TRANSFER_BORDER_WIDTH = 6;
export const NORMAL_BORDER_WIDTH = 4;

export const LABEL_OFFSETS: Record<string, { x?: number; y?: number }> = {
  "비즈니스 파크": { x: 4, y: 8 },
};

export const LEFT_ALIGNED_STATIONS = [
  "테크밸리",
  "대학로",
  "메트로 센터",
  "산업단지",
  "항만터미널",
  "시청역",
];
```

### 4. Custom Hooks 레이어

#### `src/hooks/useRouteState.ts`

경로 탐색 관련 상태를 관리합니다.

```typescript
import { useState } from "react";
import type { Station, RouteHistoryItem } from "../data/types";

export interface UseRouteStateReturn {
  startStation: Station | null;
  endStation: Station | null;
  routeHistory: RouteHistoryItem[];
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  addToHistory: (from: Station, to: Station) => void;
  removeFromHistory: (item: RouteHistoryItem) => void;
  selectHistoryItem: (item: RouteHistoryItem) => void;
}

export function useRouteState(): UseRouteStateReturn;
```

**주요 기능:**

- 출발역/도착역 상태 관리
- 경로 이력 관리 (최대 4개, 중복 제거)
- 이력 아이템 선택 시 출발/도착역 설정

#### `src/hooks/useMetroMap.ts`

Leaflet 지도 초기화 및 렌더링을 담당합니다.

```typescript
import { useRef, useEffect } from "react";
import L from "leaflet";
import type { Station, SubwayLine, Edge } from "../data/types";
import type { PathfindingResult } from "../utils/pathfinding";

export interface UseMetroMapProps {
  stations: Station[];
  subwayLines: SubwayLine[];
  edges: Edge[];
  startStation: Station | null;
  endStation: Station | null;
  onStationSelect: (station: Station, role: "start" | "end") => void;
  onMapClick: () => void;
}

export interface UseMetroMapReturn {
  mapContainerRef: React.RefObject<HTMLDivElement>;
  drawRoute: (result: PathfindingResult) => void;
  clearRoute: () => void;
  updateInfoText: (text: string) => void;
}

export function useMetroMap(props: UseMetroMapProps): UseMetroMapReturn;
```

**주요 기능:**

- 지도 초기화 (CRS.Simple, 타일 레이어)
- 노선 Polyline 렌더링
- 역 마커 생성 및 이벤트 핸들러 등록
- 경로 레이어 및 화살표 레이어 관리
- 정보 컨트롤 패널 관리
- 클린업 로직

### 5. 컴포넌트 레이어

#### `src/Components/MetroMapContainer.tsx` (리팩토링 후)

간소화된 컨테이너 컴포넌트입니다.

```typescript
import { useEffect, useState } from "react";
import MetroMap from "./MetroMap";
import { stations } from "../data/stations";
import { subwayLines } from "../data/subwayLines";
import { edges, EDGE_STOP_MIN, EDGE_TRANSFER_MIN } from "../data/edges";
import { useRouteState } from "../hooks/useRouteState";
import { useMetroMap } from "../hooks/useMetroMap";
import { dijkstraWithTransfers } from "../utils/pathfinding";

const MetroMapContainer = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  const {
    startStation,
    endStation,
    routeHistory,
    setStartStation,
    setEndStation,
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  } = useRouteState();

  const { mapContainerRef, drawRoute, clearRoute, updateInfoText } =
    useMetroMap({
      stations,
      subwayLines,
      edges,
      startStation,
      endStation,
      onStationSelect: (station, role) => {
        if (role === "start") {
          setStartStation(station);
          updateInfoText(
            `출발지: <b>${station.name}</b> 선택됨 — 도착지를 선택하세요`
          );
        } else {
          setEndStation(station);
          updateInfoText(
            `도착지: <b>${station.name}</b> 선택됨 — 출발지를 선택하세요`
          );
        }
      },
      onMapClick: () => {
        setStartStation(null);
        setEndStation(null);
        clearRoute();
        updateInfoText("출발지/도착지를 선택하세요");
        setSelectedLine(null);
        setSelectedStation(null);
      },
    });

  // 경로 계산 로직
  useEffect(() => {
    if (!startStation || !endStation) return;

    const result = dijkstraWithTransfers(
      startStation,
      endStation,
      stations,
      edges,
      EDGE_STOP_MIN,
      EDGE_TRANSFER_MIN
    );

    if (!result) {
      updateInfoText("경로를 찾지 못했습니다.");
      clearRoute();
      return;
    }

    drawRoute(result);
    addToHistory(startStation, endStation);

    // 경로 정보 텍스트 생성
    const { minutes, stops, transfers, path, nodeMeta } = result;
    // ... (기존 로직)
  }, [startStation, endStation]);

  return (
    <MetroMap
      mapContainerRef={mapContainerRef}
      selectedStation={selectedStation}
      selectedLine={selectedLine}
      subwayLines={subwayLines}
      stations={stations}
      transferStations={stations.filter((s) => s.isTransfer)}
      routeHistory={routeHistory}
      startStation={startStation}
      endStation={endStation}
      setStartStation={setStartStation}
      setEndStation={setEndStation}
      onHistoryClick={selectHistoryItem}
      onRemoveHistory={removeFromHistory}
      zoomToStation={(station) => {
        if (station) {
          // mapRef를 통한 줌 로직은 useMetroMap에서 제공하는 함수로 대체
          setSelectedStation(station);
        } else {
          setSelectedStation(null);
        }
      }}
      highlightLine={setSelectedLine}
      resetView={() => {
        // mapRef를 통한 리셋 로직은 useMetroMap에서 제공하는 함수로 대체
        setSelectedStation(null);
        setSelectedLine(null);
      }}
    />
  );
};

export default MetroMapContainer;
```

**주요 변경사항:**

- 600줄 → 약 150줄로 축소
- 데이터는 import로 가져옴
- 비즈니스 로직은 유틸리티 함수 호출
- 지도 관련 로직은 useMetroMap hook 사용
- 상태 관리는 useRouteState hook 사용

## Data Models

### Station

역 정보를 나타내는 모델입니다.

```typescript
interface Station {
  id: string; // 역 고유 ID (예: "101")
  name: string; // 역 이름 (예: "메트로 센터")
  lat: number; // 위도 좌표
  lng: number; // 경도 좌표
  lines: string[]; // 소속 노선 ID 배열 (예: ["1", "2"])
  isTransfer: boolean; // 환승역 여부
  description: string; // 역 설명
}
```

### SubwayLine

노선 정보를 나타내는 모델입니다.

```typescript
interface SubwayLine {
  id: string; // 노선 ID (예: "1")
  name: string; // 노선 이름 (예: "1호선")
  color: string; // 노선 색상 (예: "#0052A4")
}
```

### Edge

역 간 연결 정보를 나타내는 모델입니다.

```typescript
interface Edge {
  from: string; // 출발역 ID
  to: string; // 도착역 ID
  line: string; // 노선 ID (환승의 경우 "1-2" 형식)
  weight: number; // 소요 시간 (분)
}
```

### NodeKey

그래프 노드를 식별하는 키입니다.

```typescript
type NodeKey = string; // 형식: "${stationId}@${lineId}"
```

각 역은 소속된 노선별로 별도의 노드를 가지며, 환승은 같은 역의 서로 다른 노선 노드 간 연결로 표현됩니다.

## Error Handling

### 경로 탐색 실패

- `dijkstraWithTransfers` 함수가 `null`을 반환하면 "경로를 찾지 못했습니다" 메시지 표시
- 경로 레이어 및 화살표 레이어 초기화
- 환승역 하이라이트 제거

### 데이터 무결성

- `buildGraph` 함수에서 nodeMeta에 없는 노드 참조 시 console.warn 출력
- 경로 복원 시 nodeMeta에 없는 키 발견 시 console.error 출력 및 방어 처리 (continue)
- 빈 경로 배열 처리

### 지도 초기화 실패

- `mapContainerRef.current`가 null인 경우 지도 초기화 스킵
- useEffect cleanup에서 모든 레이어 및 컨트롤 제거

### UI 업데이트 실패

- DOM 요소를 찾지 못한 경우 조용히 실패 (optional chaining 사용)
- 존재하지 않는 역/노선 ID 참조 시 필터링으로 처리

## Testing Strategy

### 단위 테스트

#### 1. 경로 탐색 알고리즘 (`pathfinding.ts`)

- `buildGraph` 함수 테스트
  - 정상적인 그래프 구조 생성 확인
  - 환승 edge 처리 확인
  - nodeMeta 정확성 확인
- `dijkstraWithTransfers` 함수 테스트
  - 단일 노선 경로 탐색
  - 환승 포함 경로 탐색
  - 경로가 없는 경우 null 반환 확인
  - 통계 계산 정확성 (stops, transfers, minutes)
  - 환승역 ID 추출 정확성

#### 2. UI 헬퍼 함수 (`mapHelpers.ts`)

- `createStationLabel` 함수 테스트
  - 일반역 라벨 생성
  - 환승역 라벨 생성
  - 출발/도착역 스타일 적용
  - 라벨 위치 오프셋 적용
- `highlightTransferLabels` 함수 테스트
  - DOM 조작 정확성 (jsdom 환경)
- `highlightStationCircles` 함수 테스트
  - DOM 조작 정확성 (jsdom 환경)

#### 3. Custom Hooks

- `useRouteState` 테스트
  - 출발/도착역 설정
  - 이력 추가 (중복 제거, 최대 4개 제한)
  - 이력 삭제
  - 이력 아이템 선택
- `useMetroMap` 테스트
  - 지도 초기화 확인
  - 경로 그리기 확인
  - 경로 초기화 확인
  - 정보 텍스트 업데이트 확인

### 통합 테스트

#### 1. 컴포넌트 통합

- MetroMapContainer 렌더링 테스트
- 역 선택 시 상태 업데이트 확인
- 경로 계산 및 표시 확인
- 이력 관리 기능 확인

#### 2. 데이터 무결성

- stations, subwayLines, edges 데이터 일관성 확인
- 모든 edge의 from/to가 유효한 역 ID인지 확인
- 모든 역의 lines가 유효한 노선 ID인지 확인

### 수동 테스트

#### 1. 기능 테스트

- 역 클릭 시 팝업 표시
- 출발지/도착지 선택
- 경로 계산 및 시각화
- 경로 이력 클릭
- 노선 하이라이트
- 환승역 하이라이트
- 전체 보기 버튼

#### 2. UI/UX 테스트

- 반응형 레이아웃
- 스크롤 동작
- 버튼 인터랙션
- 색상 및 스타일 일관성

#### 3. 성능 테스트

- 경로 계산 속도
- 지도 렌더링 성능
- 메모리 누수 확인

## Design Decisions and Rationales

### 1. 데이터 분리

**결정:** 역, 노선, 연결 정보를 별도 파일로 분리

**근거:**

- 데이터 수정 시 비즈니스 로직에 영향 없음
- 데이터 파일만 교체하여 다른 지하철 노선도 적용 가능
- 타입 안정성 향상 (types.ts에서 중앙 관리)

### 2. 경로 탐색 알고리즘 분리

**결정:** pathfinding.ts로 알고리즘 로직 분리

**근거:**

- UI와 독립적으로 알고리즘 테스트 가능
- 다른 프로젝트에서 재사용 가능
- 알고리즘 개선 시 UI 코드 수정 불필요

### 3. Custom Hook 사용

**결정:** useMetroMap, useRouteState로 로직 분리

**근거:**

- React의 관심사 분리 패턴 준수
- 컴포넌트 복잡도 감소
- 로직 재사용 가능
- 테스트 용이성 향상

### 4. UI 헬퍼 함수 분리

**결정:** mapHelpers.ts로 UI 관련 함수 분리

**근거:**

- 순수 함수로 구현하여 테스트 용이
- 코드 가독성 향상
- 재사용 가능

### 5. 상수 분리

**결정:** constants.ts로 매직 넘버 및 설정값 분리

**근거:**

- 설정 변경 시 한 곳에서 관리
- 코드 가독성 향상
- 유지보수 용이

### 6. 타입 중앙 관리

**결정:** types.ts에서 모든 타입 정의

**근거:**

- 타입 일관성 보장
- import 경로 단순화
- 타입 변경 시 영향 범위 명확

### 7. Ref 관리

**결정:** useMetroMap hook 내부에서 모든 ref 관리

**근거:**

- 컴포넌트에서 Leaflet API 직접 접근 불필요
- 캡슐화를 통한 추상화 수준 향상
- 메모리 누수 방지 (cleanup 로직 중앙 관리)

### 8. 경로 이력 관리

**결정:** useRouteState에서 이력 관리 로직 포함

**근거:**

- 출발/도착역 상태와 밀접하게 연관
- 중복 제거 및 최대 개수 제한 로직 캡슐화
- 컴포넌트 코드 간소화
