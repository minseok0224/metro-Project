# Design Document

## Overview

지하철 노선 필터링 기능은 사용자가 특정 노선을 선택하면 해당 노선에 속한 역과 연결선만 지도에 표시하는 기능입니다. 이 기능은 복잡한 노선도에서 특정 노선에 집중할 수 있도록 도와주며, 환승역 정보도 함께 제공합니다.

현재 애플리케이션은 Leaflet 기반의 지하철 노선도를 표시하고 있으며, React와 TypeScript로 구현되어 있습니다. 노선 필터링 기능은 기존 코드의 `selectedLine` 상태를 활용하여 구현됩니다.

## Architecture

### Component Structure

```
MetroMapContainer (Container Component)
├── State Management
│   ├── selectedLine: 선택된 노선 ID
│   ├── filteredStations: 필터링된 역 목록
│   └── filteredEdges: 필터링된 연결선 목록
├── Leaflet Map Instance
│   ├── Polyline Layers (노선별 레이어 그룹)
│   ├── Marker Layers (역 마커 레이어 그룹)
│   └── Layer Visibility Control
└── MetroMap (Presentation Component)
    └── Line Selection UI
```

### Data Flow

1. 사용자가 노선 버튼 클릭
2. `highlightLine(lineId)` 함수 호출
3. `selectedLine` 상태 업데이트
4. useEffect에서 `selectedLine` 변경 감지
5. 필터링 로직 실행 (역, 연결선)
6. Leaflet 레이어 가시성 업데이트
7. UI 업데이트 (선택된 노선 강조)

## Components and Interfaces

### 1. State Management

**새로운 상태 추가:**

```typescript
// MetroMapContainer.tsx
const [selectedLine, setSelectedLine] = useState<string | null>(null);
```

**기존 상태 활용:**

- `selectedLine`: 이미 존재하며, 현재는 UI 강조 표시에만 사용됨
- 이를 확장하여 필터링 로직에도 활용

### 2. Layer Management

**Leaflet 레이어 구조 개선:**

```typescript
// 노선별 레이어 그룹 관리
const lineLayers = useRef<Map<string, L.LayerGroup>>(new Map());
const stationLayers = useRef<Map<string, L.LayerGroup>>(new Map());

// 각 노선별로 레이어 그룹 생성
subwayLines.forEach((line) => {
  lineLayers.current.set(line.id, L.layerGroup().addTo(map));
  stationLayers.current.set(line.id, L.layerGroup().addTo(map));
});
```

### 3. Filtering Logic

**필터링 함수:**

```typescript
function applyLineFilter(lineId: string | null) {
  if (!lineId) {
    // 모든 레이어 표시
    lineLayers.current.forEach((layer) => layer.addTo(map));
    stationLayers.current.forEach((layer) => layer.addTo(map));
  } else {
    // 선택된 노선만 표시
    lineLayers.current.forEach((layer, id) => {
      if (id === lineId) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);
      }
    });

    // 역 필터링 (환승역 고려)
    stationLayers.current.forEach((layer, id) => {
      if (id === lineId) {
        layer.addTo(map);
      } else {
        map.removeLayer(layer);
      }
    });

    // 환승역 처리
    stations
      .filter((st) => st.isTransfer && st.lines.includes(lineId))
      .forEach((st) => {
        // 환승역 마커는 항상 표시
        const marker = markersRef.current.get(st.id);
        if (marker && !map.hasLayer(marker)) {
          marker.addTo(map);
        }
      });
  }
}
```

### 4. UI Updates

**노선 버튼 상태 표시:**

```typescript
// MetroMap.tsx
<Button
  type={selectedLine === line.id ? "primary" : "default"}
  onClick={() => {
    // 토글 동작: 같은 노선 클릭 시 필터 해제
    const newLineId = selectedLine === line.id ? null : line.id;
    highlightLine(newLineId);
  }}
  style={{
    backgroundColor: selectedLine === line.id ? line.color : "white",
    color: selectedLine === line.id ? "white" : line.color,
  }}
>
  {line.name}
</Button>
```

## Data Models

### Station Interface (기존)

```typescript
interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[]; // 소속 노선 ID 배열
  isTransfer: boolean; // 환승역 여부
  description: string;
}
```

### SubwayLine Interface (기존)

```typescript
interface SubwayLine {
  id: string;
  name: string;
  color: string;
}
```

### Edge Interface (기존)

```typescript
interface Edge {
  from: string; // 출발역 ID
  to: string; // 도착역 ID
  line: string; // 노선 ID
  weight: number; // 소요시간
}
```

### Layer Reference Structure (새로운)

```typescript
interface LayerReferences {
  lineLayers: Map<string, L.LayerGroup>; // 노선별 Polyline 레이어
  stationLayers: Map<string, L.LayerGroup>; // 노선별 Station 마커 레이어
  transferMarkers: Map<string, L.Marker>; // 환승역 마커 (항상 표시)
}
```

## Error Handling

### 1. 잘못된 노선 ID 처리

```typescript
function highlightLine(lineId: string | null) {
  if (lineId && !subwayLines.find((l) => l.id === lineId)) {
    console.warn(`Invalid line ID: ${lineId}`);
    return;
  }
  setSelectedLine(lineId);
}
```

### 2. 레이어 누락 처리

```typescript
function applyLineFilter(lineId: string | null) {
  try {
    // 필터링 로직
  } catch (error) {
    console.error("Failed to apply line filter:", error);
    // 전체 보기로 복구
    setSelectedLine(null);
  }
}
```

### 3. 경로 탐색 실패 처리

```typescript
// 필터링된 노선으로 경로를 찾을 수 없는 경우
if (!result && selectedLine) {
  setInfoText(
    `선택된 노선(${selectedLine})으로는 경로를 찾을 수 없습니다. ` +
      `전체 노선으로 검색하려면 '전체 보기'를 클릭하세요.`
  );
}
```

## Testing Strategy

### 1. Unit Tests

**필터링 로직 테스트:**

- 특정 노선 선택 시 해당 노선의 역만 반환되는지 확인
- 환승역이 올바르게 포함되는지 확인
- 필터 해제 시 모든 역이 반환되는지 확인

**예시:**

```typescript
describe("Line Filtering", () => {
  it("should filter stations by selected line", () => {
    const filtered = filterStationsByLine(stations, "1");
    expect(filtered.every((st) => st.lines.includes("1"))).toBe(true);
  });

  it("should include transfer stations", () => {
    const filtered = filterStationsByLine(stations, "1");
    const transferStations = filtered.filter((st) => st.isTransfer);
    expect(transferStations.length).toBeGreaterThan(0);
  });
});
```

### 2. Integration Tests

**컴포넌트 통합 테스트:**

- 노선 버튼 클릭 시 상태가 올바르게 업데이트되는지 확인
- 레이어 가시성이 올바르게 변경되는지 확인
- 토글 동작이 정상적으로 작동하는지 확인

### 3. E2E Tests (Manual)

**사용자 시나리오 테스트:**

1. 1호선 선택 → 1호선 역만 표시되는지 확인
2. 환승역 클릭 → 모든 노선 정보가 팝업에 표시되는지 확인
3. 같은 노선 다시 클릭 → 필터가 해제되고 전체 노선이 표시되는지 확인
4. 필터링 상태에서 경로 탐색 → 선택된 노선 내에서만 경로가 탐색되는지 확인
5. 전체 보기 버튼 클릭 → 필터가 해제되는지 확인

## Implementation Notes

### 1. 레이어 구조 리팩토링

현재 코드는 모든 Polyline과 Marker를 직접 map에 추가하고 있습니다. 필터링 기능을 위해서는 노선별로 레이어를 그룹화해야 합니다.

**변경 전:**

```typescript
L.polyline([...], { color: line.color }).addTo(map);
```

**변경 후:**

```typescript
const lineLayer = lineLayers.current.get(line.id);
L.polyline([...], { color: line.color }).addTo(lineLayer);
```

### 2. 환승역 특별 처리

환승역은 여러 노선에 속하므로, 필터링 시에도 표시되어야 합니다. 환승역 마커는 별도의 레이어에 추가하거나, 필터링 로직에서 특별히 처리해야 합니다.

**구현 방법:**

- 환승역 마커를 별도의 레이어 그룹에 추가
- 필터링 시 환승역 레이어는 항상 표시
- 환승역의 팝업에는 모든 노선 정보 표시

### 3. 경로 탐색 필터링

경로 탐색 시 선택된 노선만 사용하도록 Dijkstra 알고리즘을 수정해야 합니다.

**구현 방법:**

```typescript
function buildGraph(selectedLine: string | null) {
  // 기존 그래프 빌드 로직
  // selectedLine이 있으면 해당 노선의 edge만 사용
  const filteredEdges = selectedLine
    ? edges.filter((e) => e.line === selectedLine || e.line.includes("-"))
    : edges;

  // 그래프 빌드
}
```

### 4. 성능 최적화

- 레이어 가시성 변경은 레이어 제거/추가보다 `setStyle({ opacity: 0 })`이 더 효율적일 수 있음
- 하지만 명확성을 위해 `addTo` / `removeLayer` 사용 권장
- 필요시 성능 측정 후 최적화

### 5. UI/UX 고려사항

- 선택된 노선은 버튼 색상으로 명확히 표시
- 필터링 상태를 지도 상단에 텍스트로도 표시 (예: "1호선 필터링 중")
- 전체 보기 버튼은 항상 접근 가능하도록 배치
- 필터링 중에는 다른 노선의 역이 흐리게 표시되는 것도 고려 가능 (선택사항)
