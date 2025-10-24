# 기능별 코드 위치 매핑

이 문서는 각 기능이 어디에 구현되어 있는지 정확히 알려줍니다.

---

## 📍 기능 1: 역 이름 Label 표시

**요구사항:** 지도에서 무슨 역인지 알기 어려워요 → 지도에 역의 이름을 Label로 표시

### 구현 위치

#### 1️⃣ `utils/mapHelpers.ts` - Label 생성 함수

```typescript
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean = false
): L.DivIcon;
```

**역할:**

- Leaflet DivIcon을 생성하여 역 이름을 HTML로 표시
- 환승역은 큰 원, 일반역은 작은 원으로 구분
- 역 이름을 텍스트로 표시

**핵심 코드:**

```typescript
html: `
  <div class="station-label-root">
    <div style="...원형 마커..."></div>
    <span class="label-text">${station.name}</span>
  </div>
`;
```

#### 2️⃣ `utils/constants.ts` - Label 스타일 상수

```typescript
export const LABEL_GAP = 14;                    // 마커와 텍스트 사이 간격
export const TRANSFER_MARKER_SIZE = 24;         // 환승역 마커 크기
export const NORMAL_MARKER_SIZE = 18;           // 일반역 마커 크기
export const LEFT_ALIGNED_STATIONS = [...];     // 왼쪽 정렬 역 목록
export const LABEL_OFFSETS = {...};             // 역별 위치 조정
```

**역할:**

- Label의 크기, 간격, 위치를 상수로 관리
- 특정 역의 Label 위치를 미세 조정

#### 3️⃣ `hooks/useMetroMap.ts` - Label 적용

```typescript
// 역 마커 생성 부분 (라인 145-150)
stations.forEach((station) => {
  const line = subwayLines.find((l) => station.lines[0] === l.id);
  const color = line ? line.color : "#666";

  const marker = L.marker([station.lat, station.lng], {
    icon: createStationLabel(station, color, station.isTransfer),
  }).addTo(map);
});
```

**역할:**

- 각 역마다 `createStationLabel` 함수를 호출하여 Label 생성
- 지도에 마커 추가

---

## 📍 기능 2: 출발지/도착지 선정

**요구사항:** 어떻게 가야 하는지 경로를 알고 싶어요 → 역을 클릭 시 출발지 및 도착지를 선정할 수 있게 기능 추가

### 구현 위치

#### 1️⃣ `hooks/useRouteState.ts` - 상태 관리

```typescript
export function useRouteState() {
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);

  return {
    startStation,
    endStation,
    setStartStation,
    setEndStation,
    // ...
  };
}
```

**역할:**

- 출발역과 도착역 상태를 관리
- 상태 변경 함수 제공

#### 2️⃣ `hooks/useMetroMap.ts` - 팝업 UI 생성

```typescript
// 팝업 HTML 생성 (라인 160-175)
const popupHtml = `
  <div style="text-align:center;">
    <h3>${station.name}</h3>
    <div style="margin-top:8px;">
      <button data-role="start">출발지</button>
      <button data-role="end">도착지</button>
    </div>
  </div>
`;

marker.bindPopup(popupHtml);
```

**역할:**

- 역 마커 클릭 시 팝업 표시
- 출발지/도착지 선택 버튼 제공

#### 3️⃣ `hooks/useMetroMap.ts` - 버튼 이벤트 처리

```typescript
// 팝업 이벤트 핸들러 (라인 180-195)
marker.on("popupopen", (e) => {
  const btnStart = container?.querySelector('button[data-role="start"]');
  const btnEnd = container?.querySelector('button[data-role="end"]');

  btnStart?.addEventListener("click", () => {
    onStationSelect(station, "start"); // 출발지로 설정
    marker.closePopup();
  });

  btnEnd?.addEventListener("click", () => {
    onStationSelect(station, "end"); // 도착지로 설정
    marker.closePopup();
  });
});
```

**역할:**

- 버튼 클릭 시 `onStationSelect` 콜백 호출
- 팝업 닫기

#### 4️⃣ `Components/MetroMapContainer.tsx` - 콜백 처리

```typescript
// 역 선택 핸들러 (라인 26-35)
const handleStationSelect = useCallback(
  (station: Station, role: "start" | "end") => {
    if (role === "start") {
      setStartStation(station);
    } else {
      setEndStation(station);
    }
  },
  [setStartStation, setEndStation]
);
```

**역할:**

- 역할(start/end)에 따라 적절한 상태 업데이트
- `useMetroMap`에 전달

#### 5️⃣ `utils/mapHelpers.ts` - 시각적 하이라이트

```typescript
export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void {
  // 출발역: 빨간색 테두리
  if (stationIds.start) {
    startCircle.style.borderColor = "#ff3b30";
  }

  // 도착역: 초록색 테두리
  if (stationIds.end) {
    endCircle.style.borderColor = "#00c853";
  }
}
```

**역할:**

- 출발역은 빨간색, 도착역은 초록색으로 하이라이트
- DOM 직접 조작

---

## 📍 기능 3: 경로 텍스트 표시

**요구사항:** 지도 우측 상단에 텍스트로 경로 표시 기능 추가

### 구현 위치

#### 1️⃣ `hooks/useMetroMap.ts` - 정보 패널 생성

```typescript
// 정보 컨트롤 패널 생성 (라인 95-105)
const infoControl = new L.Control({ position: "topright" });
(infoControl as L.Control).onAdd = () => {
  const div = L.DomUtil.create("div", "trip-info");
  div.style.cssText = `
    background: rgba(255,255,255,0.95);
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    font-size: 13px;
    color: #333;
    min-width: 220px;
  `;
  div.innerHTML = "출발지/도착지를 선택하세요";
  return div;
};
infoControl.addTo(map);
```

**역할:**

- Leaflet Control을 사용하여 우측 상단에 정보 패널 생성
- 초기 메시지 표시

#### 2️⃣ `utils/mapHelpers.ts` - 텍스트 업데이트 함수

```typescript
export function setInfoText(text: string): void {
  const el = document.querySelector<HTMLDivElement>(".trip-info");
  if (el) el.innerHTML = text;
}
```

**역할:**

- 정보 패널의 텍스트를 업데이트하는 헬퍼 함수
- HTML 형식 지원

#### 3️⃣ `hooks/useMetroMap.ts` - 업데이트 함수 노출

```typescript
const updateInfoText = useCallback((text: string) => {
  setInfoText(text);
}, []);

return {
  mapContainerRef,
  drawRoute,
  clearRoute,
  updateInfoText, // 외부에서 사용 가능
};
```

**역할:**

- `setInfoText`를 래핑하여 메모이제이션
- 컴포넌트에서 사용할 수 있도록 반환

#### 4️⃣ `Components/MetroMapContainer.tsx` - 경로 정보 표시

```typescript
// 경로 탐색 후 정보 업데이트 (라인 80-120)
useEffect(() => {
  if (!startStation || !endStation) return;

  const result = dijkstraWithTransfers(...);

  if (!result) {
    updateInfoText("경로를 찾지 못했습니다.");
    return;
  }

  const { minutes, stops, transfers, path, nodeMeta } = result;

  // 경로 스테이션 이름 추출
  let stationNames: string[] = [];
  for (let i = 0; i < path.length; i++) {
    // 출발지, 도착지, 환승역만 추출
    // ...
  }

  const routeText = stationNames.join(" → ");
  updateInfoText(`
    출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
    정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
    경로: <b>${routeText}</b>
  `);
}, [startStation, endStation]);
```

**역할:**

- 경로 탐색 결과를 받아서 정보 텍스트 생성
- 출발지, 도착지, 정차역, 환승 횟수, 소요 시간 표시
- 주요 경유지 표시

---

## 📍 기능 4: 경로 하이라이트 및 화살표

**요구사항:** 노선에 이동 경로를 하이라이트 및 화살표를 표시해주는 기능 추가

### 구현 위치

#### 1️⃣ `hooks/useMetroMap.ts` - 경로 그리기 함수

```typescript
const drawRoute = useCallback((result: PathfindingResult) => {
  if (!mapRef.current) return;

  const map = mapRef.current;
  const { coords, transferStationIds } = result;

  // 경로 레이어 초기화
  if (!routeLayerRef.current) {
    routeLayerRef.current = L.layerGroup().addTo(map);
  } else {
    routeLayerRef.current.clearLayers();
  }
```

**역할:**

- 경로 탐색 결과를 받아서 지도에 그리기
- 레이어 그룹으로 관리하여 쉽게 추가/제거

#### 2️⃣ `hooks/useMetroMap.ts` - 경로 Polyline 그리기

```typescript
// 경로 Polyline 그리기 (라인 250-260)
L.polyline(coords, {
  color: "#ff3b30", // 빨간색
  weight: 10, // 두께
  opacity: 0.95, // 불투명도
  lineCap: "round", // 끝 모양
  lineJoin: "round", // 연결 모양
}).addTo(routeLayerRef.current);
```

**역할:**

- 경로 좌표를 연결하는 빨간색 선 그리기
- 기존 노선보다 두껍고 진하게 표시

#### 3️⃣ `hooks/useMetroMap.ts` - 진행방향 화살표 그리기

```typescript
// 진행방향 화살표 그리기 (라인 262-290)
for (let i = 0; i < coords.length - 1; i++) {
  const a = coords[i];
  const b = coords[i + 1];

  // 각도 계산
  const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
  const angleDeg = (angleRad * 180) / Math.PI;

  // 각 구간에 2개의 화살표 (40%, 80% 지점)
  [0.4, 0.8].forEach((t) => {
    const pos: [number, number] = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];

    const arrowIcon = L.divIcon({
      className: "route-arrow",
      html: `<div style="
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 12px solid #ffffff;
          transform: rotate(${angleDeg}deg);
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.8));
        "></div>`,
      iconSize: [14, 12],
      iconAnchor: [7, 6],
    });

    L.marker(pos, { icon: arrowIcon }).addTo(arrowLayerRef.current!);
  });
}
```

**역할:**

- 각 경로 구간마다 진행 방향 화살표 표시
- 삼각형 모양의 흰색 화살표
- 각도를 계산하여 진행 방향으로 회전

#### 4️⃣ `utils/mapHelpers.ts` - 환승역 하이라이트

```typescript
export function highlightTransferLabels(transferStationIds: string[]): void {
  // 모든 라벨 초기화
  const ALL = document.querySelectorAll<HTMLSpanElement>(
    ".station-label .label-text"
  );
  ALL.forEach((el) => (el.style.color = "#222"));

  // 환승역만 빨간색으로 강조
  transferStationIds.forEach((sid) => {
    const label = document.querySelector<HTMLSpanElement>(
      `.station-label-root[data-station-id="${sid}"] .label-text`
    );
    if (label) label.style.color = "#ff3b30";
  });
}
```

**역할:**

- 경로 상의 환승역 이름을 빨간색으로 강조
- DOM 직접 조작

#### 5️⃣ `Components/MetroMapContainer.tsx` - 경로 그리기 호출

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;

  const result = dijkstraWithTransfers(...);

  if (result) {
    drawRoute(result);  // 경로 그리기 함수 호출
    // ...
  }
}, [startStation, endStation]);
```

**역할:**

- 출발지와 도착지가 설정되면 경로 탐색 후 그리기

---

## 📍 기능 5: 특정 노선 하이라이트

**요구사항:** 특정 노선만 보고 싶을 때가 있어요 → 화면 우측 사이드에 있는 지하철 노선에서 특정 호선 클릭 시 해당 호선 하이라이트 기능 추가

### 구현 위치

#### 1️⃣ `Components/MetroMapContainer.tsx` - 노선 선택 상태

```typescript
const [selectedLine, setSelectedLine] = useState<string | null>(null);
```

**역할:**

- 현재 선택된 노선 ID를 저장
- `null`이면 전체 보기

#### 2️⃣ `Components/MetroMap.tsx` - 노선 버튼 UI

```typescript
// 노선 목록 카드 (라인 180-220)
<Card title='🚉 지하철 노선'>
  <Space direction='vertical'>
    {subwayLines.map((line) => (
      <Button
        key={line.id}
        block
        type={selectedLine === line.id ? "primary" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          highlightLine(line.id); // 노선 선택
        }}
        style={{
          borderColor: line.color,
          backgroundColor: selectedLine === line.id ? line.color : "white",
          color: selectedLine === line.id ? "white" : line.color,
        }}
      >
        <strong>{line.name}</strong>
      </Button>
    ))}
  </Space>
</Card>
```

**역할:**

- 각 노선을 버튼으로 표시
- 선택된 노선은 해당 노선 색상으로 강조
- 클릭 시 `highlightLine` 콜백 호출

#### 3️⃣ `Components/MetroMapContainer.tsx` - 토글 로직

```typescript
highlightLine={(lineId) => {
  // 같은 노선을 다시 클릭하면 해제 (토글)
  if (selectedLine === lineId) {
    setSelectedLine(null);
  } else {
    setSelectedLine(lineId);
  }
}}
```

**역할:**

- 노선 버튼 클릭 시 토글 동작
- 같은 노선 클릭 → 전체 보기로 전환
- 다른 노선 클릭 → 해당 노선으로 전환

#### 4️⃣ `hooks/useMetroMap.ts` - Polyline 참조 저장

```typescript
const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());

// 노선 렌더링 시 참조 저장 (라인 115-135)
subwayLines.forEach((line) => {
  const lineEdges = edges.filter((e) => e.line === line.id);
  lineEdges.forEach((edge, idx) => {
    // ...
    const polyline = L.polyline(...).addTo(map);

    // Ref에 저장 (나중에 필터링할 때 사용)
    polylinesRef.current.set(`${line.id}-${idx}`, polyline);
  });
});
```

**역할:**

- 모든 노선 Polyline을 Map에 저장
- 나중에 opacity를 조정할 수 있도록 참조 유지

#### 5️⃣ `hooks/useMetroMap.ts` - 필터링 로직

```typescript
// 선택된 노선에 따라 필터링 (라인 58-85)
useEffect(() => {
  if (!selectedLine) {
    // 전체 보기: 모든 노선과 역을 표시
    polylinesRef.current.forEach((polyline) => {
      polyline.setStyle({ opacity: 0.8 });
    });
    markersRef.current.forEach((marker) => {
      marker.setOpacity(1);
    });
  } else {
    // 특정 노선만 표시
    polylinesRef.current.forEach((polyline, key) => {
      const lineId = key.split("-")[0];
      if (lineId === selectedLine) {
        polyline.setStyle({ opacity: 0.8 }); // 선택된 노선: 정상
      } else {
        polyline.setStyle({ opacity: 0.15 }); // 나머지: 흐리게
      }
    });

    markersRef.current.forEach((marker, stationId) => {
      const station = stations.find((s) => s.id === stationId);
      if (station && station.lines.includes(selectedLine)) {
        marker.setOpacity(1); // 선택된 노선의 역: 정상
      } else {
        marker.setOpacity(0.2); // 나머지 역: 흐리게
      }
    });
  }
}, [selectedLine, stations]);
```

**역할:**

- `selectedLine` 상태가 변경되면 실행
- 선택된 노선과 해당 역만 정상 opacity
- 나머지는 흐리게 표시 (opacity 낮춤)

---

## 📍 기능 6: 소요 시간 계산 및 표시

**요구사항:** 역과 역 사이에 시간이 얼마나 걸리는지 알고 싶어요 → 임의로 경로 산정 규칙을 세워서 지도 우측 상단에 경로와 같이 표시

### 구현 위치

#### 1️⃣ `data/edges.ts` - 시간 규칙 정의

```typescript
export const EDGE_STOP_MIN = 4; // 역 간 이동 시간 (분)
export const EDGE_TRANSFER_MIN = 5; // 환승 시간 (분)

export const edges: Edge[] = [
  { from: "S1", to: "S2", line: "1", weight: 3 }, // weight = 소요 시간
  { from: "S2", to: "S3", line: "1", weight: 4 },
  // 환승 edge
  { from: "S5", to: "S5", line: "1-2", weight: 5 }, // 환승 시간
];
```

**역할:**

- 각 구간의 소요 시간을 `weight`로 정의
- 일반 이동과 환승 시간을 상수로 관리

#### 2️⃣ `utils/pathfinding.ts` - 최단 경로 계산

```typescript
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,      // 역 간 이동 시간
  edgeTransferMin: number   // 환승 시간
): PathfindingResult | null {
```

**역할:**

- Dijkstra 알고리즘으로 최단 경로 탐색
- `weight` 값을 비용으로 사용

#### 3️⃣ `utils/pathfinding.ts` - 통계 계산

```typescript
// 통계 계산 (라인 100-130)
let transfers = 0;
let stops = 0;
const transferStationIds: string[] = [];

for (let i = 1; i < path.length; i++) {
  const a = nodeMeta.get(path[i - 1]);
  const b = nodeMeta.get(path[i]);

  // 같은 역, 다른 노선 = 환승
  if (a.stationId === b.stationId && a.lineId !== b.lineId) {
    transfers++;
    transferStationIds.push(a.stationId);
  }
  // 다른 역, 같은 노선 = 정차
  else if (a.lineId === b.lineId && a.stationId !== b.stationId) {
    stops++;
  }
}

// 총 소요 시간 계산
const minutes = stops * edgeStopMin + transfers * edgeTransferMin;

return {
  minutes, // 총 소요 시간
  stops, // 정차역 수
  transfers, // 환승 횟수
  coords, // 경로 좌표
  transferStationIds, // 환승역 ID 목록
  path,
  nodeMeta,
};
```

**역할:**

- 경로를 분석하여 정차역 수와 환승 횟수 계산
- 공식: `총 시간 = (정차역 수 × 4분) + (환승 횟수 × 5분)`
- 환승역 목록 추출

#### 4️⃣ `Components/MetroMapContainer.tsx` - 결과 표시

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;

  const result = dijkstraWithTransfers(
    startStation,
    endStation,
    stations,
    edges,
    EDGE_STOP_MIN, // 4분
    EDGE_TRANSFER_MIN // 5분
  );

  if (!result) {
    updateInfoText("경로를 찾지 못했습니다.");
    return;
  }

  const { minutes, stops, transfers } = result;

  updateInfoText(`
    출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
    정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
    경로: <b>${routeText}</b>
  `);
}, [startStation, endStation]);
```

**역할:**

- 경로 탐색 결과를 받아서 정보 텍스트 생성
- 정차역 수, 환승 횟수, 총 소요 시간을 우측 상단에 표시

---

## 📊 기능별 파일 요약표

| 기능                          | 주요 파일                          | 역할                      |
| ----------------------------- | ---------------------------------- | ------------------------- |
| **1. 역 이름 Label**          | `utils/mapHelpers.ts`              | Label 생성 함수           |
|                               | `utils/constants.ts`               | Label 스타일 상수         |
|                               | `hooks/useMetroMap.ts`             | Label 적용                |
| **2. 출발지/도착지 선정**     | `hooks/useRouteState.ts`           | 상태 관리                 |
|                               | `hooks/useMetroMap.ts`             | 팝업 UI 및 이벤트         |
|                               | `Components/MetroMapContainer.tsx` | 콜백 처리                 |
|                               | `utils/mapHelpers.ts`              | 시각적 하이라이트         |
| **3. 경로 텍스트 표시**       | `hooks/useMetroMap.ts`             | 정보 패널 생성            |
|                               | `utils/mapHelpers.ts`              | 텍스트 업데이트 함수      |
|                               | `Components/MetroMapContainer.tsx` | 경로 정보 생성            |
| **4. 경로 하이라이트/화살표** | `hooks/useMetroMap.ts`             | 경로 그리기, 화살표 생성  |
|                               | `utils/mapHelpers.ts`              | 환승역 하이라이트         |
|                               | `Components/MetroMapContainer.tsx` | 경로 그리기 호출          |
| **5. 특정 노선 하이라이트**   | `Components/MetroMapContainer.tsx` | 노선 선택 상태, 토글 로직 |
|                               | `Components/MetroMap.tsx`          | 노선 버튼 UI              |
|                               | `hooks/useMetroMap.ts`             | 필터링 로직               |
| **6. 소요 시간 계산**         | `data/edges.ts`                    | 시간 규칙 정의            |
|                               | `utils/pathfinding.ts`             | 최단 경로 계산, 통계      |
|                               | `Components/MetroMapContainer.tsx` | 결과 표시                 |

---

## 🔄 데이터 흐름 다이어그램

### 경로 탐색 전체 플로우

```
1. 사용자가 역 클릭
   ↓
2. useMetroMap.ts
   - 팝업 표시
   - 출발지/도착지 버튼 클릭
   ↓
3. MetroMapContainer.tsx
   - handleStationSelect 실행
   - setStartStation / setEndStation
   ↓
4. useRouteState.ts
   - startStation / endStation 상태 업데이트
   ↓
5. MetroMapContainer.tsx (useEffect 트리거)
   - dijkstraWithTransfers 호출
   ↓
6. pathfinding.ts
   - 최단 경로 계산
   - 정차역, 환승, 시간 계산
   - PathfindingResult 반환
   ↓
7. MetroMapContainer.tsx
   - drawRoute 호출
   - updateInfoText 호출
   - addToHistory 호출
   ↓
8. useMetroMap.ts
   - 지도에 경로 Polyline 그리기
   - 화살표 마커 추가
   ↓
9. mapHelpers.ts
   - 환승역 Label 빨간색으로 변경
   - 출발지/도착지 마커 하이라이트
   ↓
10. 사용자에게 결과 표시
    - 지도: 빨간색 경로 + 화살표
    - 우측 상단: 경로 정보 텍스트
```

---

## 🎯 각 기능을 수정하려면?

### 1. Label 스타일 변경

- **파일**: `utils/constants.ts`
- **수정 내용**: `LABEL_GAP`, `MARKER_SIZE` 등 상수 값 변경
- **영향**: 모든 역 Label의 크기와 위치

### 2. 팝업 UI 변경

- **파일**: `hooks/useMetroMap.ts` (라인 160-175)
- **수정 내용**: `popupHtml` 변수의 HTML 수정
- **영향**: 역 클릭 시 표시되는 팝업 디자인

### 3. 경로 색상 변경

- **파일**: `hooks/useMetroMap.ts` (라인 250-260)
- **수정 내용**: Polyline의 `color`, `weight`, `opacity` 변경
- **영향**: 경로 선의 색상과 두께

### 4. 화살표 디자인 변경

- **파일**: `hooks/useMetroMap.ts` (라인 270-285)
- **수정 내용**: `arrowIcon`의 HTML 스타일 수정
- **영향**: 진행 방향 화살표 모양

### 5. 시간 계산 규칙 변경

- **파일**: `data/edges.ts`
- **수정 내용**: `EDGE_STOP_MIN`, `EDGE_TRANSFER_MIN` 값 변경
- **영향**: 총 소요 시간 계산

### 6. 정보 패널 위치 변경

- **파일**: `hooks/useMetroMap.ts` (라인 95)
- **수정 내용**: `position: "topright"` → `"topleft"`, `"bottomright"` 등
- **영향**: 경로 정보 텍스트 표시 위치

---

## 💡 추가 기능 구현 가이드

### 새로운 기능을 추가하려면?

1. **데이터가 필요한가?**

   - YES → `data/` 폴더에 추가
   - NO → 다음 단계로

2. **상태 관리가 필요한가?**

   - YES → `hooks/` 폴더에 커스텀 훅 생성
   - NO → 다음 단계로

3. **계산 로직이 필요한가?**

   - YES → `utils/` 폴더에 함수 추가
   - NO → 다음 단계로

4. **UI가 필요한가?**
   - YES → `Components/` 폴더에 컴포넌트 추가
   - NO → 완료

### 예시: "즐겨찾기 기능" 추가

1. **데이터**: `data/types.ts`에 `Favorite` 타입 추가
2. **상태**: `hooks/useFavorites.ts` 생성
3. **UI**: `Components/FavoriteList.tsx` 생성
4. **통합**: `MetroMapContainer.tsx`에서 사용

---

## 📝 정리

이 프로젝트는 **관심사의 분리** 원칙을 철저히 따릅니다:

- **data/**: 무엇을 보여줄까? (데이터)
- **Components/**: 어떻게 보일까? (UI)
- **hooks/**: 어떻게 동작할까? (로직)
- **utils/**: 어떻게 계산할까? (헬퍼)

각 기능은 여러 파일에 걸쳐 구현되어 있지만,
명확한 책임 분리 덕분에 수정과 확장이 쉽습니다.

**핵심 원칙:**

- 한 파일은 한 가지 책임만
- 재사용 가능한 코드는 분리
- 타입으로 안정성 확보
- 순수 함수로 테스트 용이성 확보

이 구조를 이해하면 어떤 기능이든 쉽게 추가할 수 있습니다! 🚀
