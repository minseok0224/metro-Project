# 기능별 상세 구현 설명

이 문서는 각 기능을 **어떻게 구현했는지** 상세하게 설명합니다.

---

## 📍 기능 1: 역 이름 Label 표시

### 구현 방법

지도에 역의 이름을 Label로 표시해주는 기능 추가

이미 기존에 Leaflet DivIcon을 활용하여 역의 Icon만을 표시해주고 있었고, `span` 요소를 추가해서 `station.name` 데이터를 표시해주는 방법으로 구현함.

### 고려한 사항

1. **지도 축소/확대 대응**

   - 지도를 축소/확대 시에 추가한 `station.name` 요소가 자동으로 축소/확대될 수 있게 진행
   - Leaflet의 기본 동작을 활용하여 별도 처리 없이 자동 스케일링

2. **텍스트 겹침 방지**
   - 역의 이름을 표시해줄 때 노선과 텍스트가 겹치지 않게 빈 여백에 텍스트가 표시될 수 있도록 진행
   - `LABEL_GAP` 상수로 마커와 텍스트 사이 간격 조정
   - `LEFT_ALIGNED_STATIONS` 배열로 특정 역은 왼쪽 정렬하여 겹침 방지
   - `LABEL_OFFSETS` 객체로 역별 미세 위치 조정

### 핵심 구현 코드

**`utils/mapHelpers.ts`**

```typescript
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean = false
): L.DivIcon {
  const size = isTransfer ? TRANSFER_MARKER_SIZE : NORMAL_MARKER_SIZE;
  const leftAligned = LEFT_ALIGNED_STATIONS.includes(station.name);
  const off = LABEL_OFFSETS[station.name] || { x: 0, y: 0 };

  return L.divIcon({
    className: `station-label`,
    html: `
      <div class="station-label-root" data-station-id="${station.id}">
        <div style="...원형 마커..."></div>
        <span class="label-text" style="
          position: absolute;
          ${leftAligned ? "right" : "left"}: ${LABEL_GAP + (off.x ?? 0)}px;
          top: ${off.y ?? 0}px;
        ">
          ${station.name}
        </span>
      </div>
    `,
  });
}
```

---

## 📍 기능 2: 출발지/도착지 선정

### 구현 방법

역을 클릭 시 출발지 및 도착지를 선정할 수 있게 기능 추가

Leaflet의 Popup 기능을 활용하여 역 마커 클릭 시 팝업을 표시하고, 팝업 내부에 "출발지"와 "도착지" 버튼을 배치. 버튼 클릭 시 이벤트 리스너를 통해 상태를 업데이트하는 방식으로 구현함.

### 고려한 사항

1. **상태 관리 분리**

   - 출발역과 도착역 상태를 커스텀 훅(`useRouteState`)으로 분리하여 재사용성 확보
   - 경로 이력도 함께 관리하여 사용자 편의성 향상

2. **시각적 피드백**

   - 출발역은 빨간색 테두리, 도착역은 초록색 테두리로 구분
   - DOM 직접 조작을 통해 즉각적인 시각적 피드백 제공
   - `highlightStationCircles` 함수로 마커 스타일 동적 변경

3. **이벤트 처리 최적화**

   - 팝업이 열릴 때마다 이벤트 리스너를 동적으로 추가
   - 버튼 클릭 후 팝업 자동 닫기로 UX 개선
   - `useCallback`으로 핸들러 함수 메모이제이션하여 불필요한 리렌더링 방지

4. **역할 기반 처리**
   - `role` 파라미터("start" | "end")로 출발지/도착지 구분
   - 하나의 핸들러 함수로 두 가지 역할 처리하여 코드 중복 제거

### 핵심 구현 코드

**`hooks/useMetroMap.ts` - 팝업 생성 및 이벤트 처리**

```typescript
// 1. 팝업 HTML 생성
const popupHtml = `
  <div style="text-align:center; min-width:220px;">
    <h3 style="margin:0 0 6px 0; color:#333;">${station.name}</h3>
    <div style="font-size:13px; margin-bottom:6px;">${linesInfo}</div>
    <p style="font-size:12px; color:#666;">${station.description}</p>
    <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
      <button data-role="start" style="
        padding:4px 8px;
        border:1px solid #1f6feb;
        background:#e8f0ff;
        border-radius:5px;
        color:#1f6feb;
        cursor:pointer;
      ">출발지</button>
      <button data-role="end" style="
        padding:4px 8px;
        border:1px solid #10b981;
        background:#e8fff4;
        border-radius:5px;
        color:#059669;
        cursor:pointer;
      ">도착지</button>
    </div>
  </div>
`;

marker.bindPopup(popupHtml, { offset: L.point(0, -8) });

// 2. 팝업 열릴 때 이벤트 리스너 추가
marker.on("popupopen", (e) => {
  const container = e.popup.getElement();
  const btnStart = container?.querySelector<HTMLButtonElement>(
    "button[data-role='start']"
  );
  const btnEnd = container?.querySelector<HTMLButtonElement>(
    "button[data-role='end']"
  );

  // 출발지 버튼 클릭
  btnStart?.addEventListener("click", () => {
    onStationSelect(station, "start");
    marker.closePopup();
  });

  // 도착지 버튼 클릭
  btnEnd?.addEventListener("click", () => {
    onStationSelect(station, "end");
    marker.closePopup();
  });
});
```

**`Components/MetroMapContainer.tsx` - 콜백 처리**

```typescript
// useCallback으로 메모이제이션
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

// useMetroMap에 전달
const { mapContainerRef, drawRoute, clearRoute, updateInfoText } = useMetroMap({
  stations,
  subwayLines,
  edges,
  startStation,
  endStation,
  onStationSelect: handleStationSelect,
  onMapClick: handleMapClick,
});
```

**`utils/mapHelpers.ts` - 시각적 하이라이트**

```typescript
export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void {
  // 1. 모든 마커 초기화
  const ALL_CIRCLES = document.querySelectorAll<HTMLDivElement>(
    ".station-label-root > div"
  );
  ALL_CIRCLES.forEach((el) => {
    const isTransfer = el.style.background === "white";
    el.style.borderColor = isTransfer ? "#333" : "white";
    el.style.borderWidth = isTransfer
      ? `${TRANSFER_BORDER_WIDTH}px`
      : `${NORMAL_BORDER_WIDTH}px`;
  });

  // 2. 출발역 하이라이트 (빨간색)
  if (stationIds.start) {
    const startCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.start}"] > div`
    );
    if (startCircle) {
      startCircle.style.borderColor = "#ff3b30";
      startCircle.style.borderWidth = `${TRANSFER_BORDER_WIDTH}px`;
    }
  }

  // 3. 도착역 하이라이트 (초록색)
  if (stationIds.end) {
    const endCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.end}"] > div`
    );
    if (endCircle) {
      endCircle.style.borderColor = "#00c853";
      endCircle.style.borderWidth = `${TRANSFER_BORDER_WIDTH}px`;
    }
  }
}
```

**`hooks/useMetroMap.ts` - 하이라이트 적용**

```typescript
// 출발지/도착지 변경 시 자동으로 하이라이트 업데이트
useEffect(() => {
  highlightStationCircles({
    start: startStation?.id,
    end: endStation?.id,
  });
}, [startStation, endStation]);
```

### 구현 흐름

```
1. 사용자가 역 마커 클릭
   ↓
2. Leaflet Popup 표시 (출발지/도착지 버튼 포함)
   ↓
3. 사용자가 버튼 클릭 (예: 출발지)
   ↓
4. 이벤트 리스너 실행 → onStationSelect(station, "start") 호출
   ↓
5. handleStationSelect 실행 → setStartStation(station)
   ↓
6. useRouteState의 startStation 상태 업데이트
   ↓
7. useEffect 트리거 → highlightStationCircles 호출
   ↓
8. DOM 조작으로 마커 테두리 색상 변경 (빨간색)
   ↓
9. 팝업 닫기
```

---

## 📍 기능 3: 경로 텍스트 표시

### 구현 방법

지도 우측 상단에 텍스트로 경로 표시 기능 추가

Leaflet의 Control API를 활용하여 지도 위에 고정된 정보 패널을 생성. 경로 탐색 결과를 받아서 HTML 형식으로 텍스트를 구성하고, DOM 조작을 통해 동적으로 업데이트하는 방식으로 구현함.

### 고려한 사항

1. **정보 패널 위치 고정**

   - Leaflet Control을 사용하여 지도 우측 상단에 고정
   - `position: "topright"` 옵션으로 위치 지정
   - 지도 확대/축소, 이동 시에도 위치 유지

2. **가독성 높은 디자인**

   - 반투명 흰색 배경으로 지도와 구분
   - 그림자 효과로 입체감 부여
   - 적절한 패딩과 폰트 크기로 가독성 확보
   - HTML 태그(`<b>`, `<br/>`)를 활용한 정보 구조화

3. **동적 정보 업데이트**

   - 초기 상태: "출발지/도착지를 선택하세요"
   - 출발지만 선택: "출발지: 금융가 선택됨 — 도착지를 선택하세요"
   - 경로 탐색 완료: 상세 경로 정보 표시
   - 경로 없음: "경로를 찾지 못했습니다"

4. **경로 정보 구성**

   - 출발지 → 도착지 (굵은 글씨)
   - 정차역 수, 환승 횟수, 예상 소요 시간
   - 주요 경유지 (출발지, 환승역, 도착지만 표시)
   - 화살표(→)로 경로 시각화

5. **성능 최적화**
   - `setInfoText` 함수를 `useCallback`으로 메모이제이션
   - DOM 쿼리를 최소화하여 성능 향상

### 핵심 구현 코드

**`hooks/useMetroMap.ts` - 정보 패널 생성**

```typescript
// 지도 초기화 시 정보 컨트롤 패널 생성
const infoControl = new L.Control({ position: "topright" });

(infoControl as L.Control).onAdd = () => {
  const div = L.DomUtil.create("div", "trip-info");

  // 스타일 적용
  div.style.cssText = `
    background: rgba(255,255,255,0.95);
    padding: 8px 12px;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    font-size: 13px;
    color: #333;
    min-width: 220px;
    max-width: 400px;
    line-height: 1.6;
  `;

  // 초기 메시지
  div.innerHTML = "출발지/도착지를 선택하세요";

  return div;
};

infoControl.addTo(map);
infoControlRef.current = infoControl;
```

**`utils/mapHelpers.ts` - 텍스트 업데이트 함수**

```typescript
export function setInfoText(text: string): void {
  const el = document.querySelector<HTMLDivElement>(".trip-info");
  if (el) {
    el.innerHTML = text;
  }
}
```

**`hooks/useMetroMap.ts` - 업데이트 함수 노출**

```typescript
// 메모이제이션된 업데이트 함수
const updateInfoText = useCallback((text: string) => {
  setInfoText(text);
}, []);

// 외부에서 사용할 수 있도록 반환
return {
  mapContainerRef,
  drawRoute,
  clearRoute,
  updateInfoText,
};
```

**`Components/MetroMapContainer.tsx` - 상태별 정보 표시**

```typescript
// 1. 출발지/도착지 선택 시 안내 메시지
useEffect(() => {
  if (!startStation && !endStation) {
    updateInfoText("출발지/도착지를 선택하세요");
    clearRoute();
  } else if (startStation && !endStation) {
    updateInfoText(
      `출발지: <b>${startStation.name}</b> 선택됨 — 도착지를 선택하세요`
    );
  } else if (!startStation && endStation) {
    updateInfoText(
      `도착지: <b>${endStation.name}</b> 선택됨 — 출발지를 선택하세요`
    );
  }
}, [startStation, endStation, updateInfoText, clearRoute]);

// 2. 경로 탐색 완료 시 상세 정보 표시
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

  const { minutes, stops, transfers, path, nodeMeta } = result;

  // 주요 경유지 추출 (출발지, 환승역, 도착지)
  let stationNames: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const meta = nodeMeta.get(path[i]);
    if (!meta) continue;

    const station = stations.find((s) => s.id === meta.stationId);
    if (!station) continue;

    // 출발지와 도착지는 무조건 포함
    if (station.id === startStation.id || station.id === endStation.id) {
      stationNames.push(station.name);
      continue;
    }

    // 환승역만 포함
    if (i > 0) {
      const prevMeta = nodeMeta.get(path[i - 1]);
      if (
        prevMeta &&
        prevMeta.stationId === meta.stationId &&
        prevMeta.lineId !== meta.lineId
      ) {
        stationNames.push(station.name);
      }
    }
  }

  // 중복 제거
  stationNames = stationNames.filter(
    (name, idx, arr) => arr.indexOf(name) === idx
  );

  const routeText = stationNames.join(" → ");

  // HTML 형식으로 정보 구성
  updateInfoText(`
    출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
    정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
    경로: <b>${routeText}</b>
  `);
}, [
  startStation,
  endStation,
  drawRoute,
  clearRoute,
  updateInfoText,
  addToHistory,
]);
```

### 구현 흐름

```
1. 지도 초기화 시
   ↓
2. Leaflet Control 생성 (우측 상단)
   ↓
3. 초기 메시지 표시: "출발지/도착지를 선택하세요"
   ↓
4. 사용자가 출발지 선택
   ↓
5. useEffect 트리거 → updateInfoText 호출
   ↓
6. 안내 메시지 업데이트: "출발지: 금융가 선택됨..."
   ↓
7. 사용자가 도착지 선택
   ↓
8. 경로 탐색 useEffect 트리거
   ↓
9. dijkstraWithTransfers 실행 → 경로 계산
   ↓
10. 주요 경유지 추출 (출발지, 환승역, 도착지)
   ↓
11. HTML 형식으로 정보 구성
   ↓
12. updateInfoText 호출 → DOM 업데이트
   ↓
13. 정보 패널에 상세 경로 정보 표시
```

### 표시 예시

```
초기 상태:
출발지/도착지를 선택하세요

출발지만 선택:
출발지: 금융가 선택됨 — 도착지를 선택하세요

경로 탐색 완료:
출발: 금융가 → 도착: 자연공원
정차역 7개 · 환승 3회 · 예상 34분
경로: 금융가 → 테크밸리 → 비즈니스 파크 → 중앙역 → 자연공원
```

---

## 📍 기능 4: 경로 하이라이트 및 화살표

### 구현 방법

노선에 이동 경로를 하이라이트 및 화살표를 표시해주는 기능 추가

Leaflet의 Polyline과 DivIcon을 활용하여 경로를 시각화. 경로 좌표를 연결하는 두꺼운 빨간색 선을 그리고, 진행 방향을 나타내는 화살표 마커를 배치. 환승역은 Label 색상을 변경하여 강조하는 방식으로 구현함.

### 고려한 사항

1. **레이어 그룹 관리**

   - 경로 Polyline과 화살표를 별도의 레이어 그룹으로 관리
   - 새 경로 탐색 시 기존 레이어를 쉽게 제거하고 재생성
   - `routeLayerRef`와 `arrowLayerRef`로 참조 유지

2. **시각적 구분**

   - 경로 선: 빨간색(`#ff3b30`), 두께 10px, 불투명도 0.95
   - 기존 노선보다 두껍고 진하게 표시하여 명확히 구분
   - `lineCap: "round"`, `lineJoin: "round"`로 부드러운 모서리

3. **진행 방향 화살표**

   - 각 구간마다 2개의 화살표 배치 (40%, 80% 지점)
   - 삼각형 모양의 흰색 화살표
   - `Math.atan2`로 각도 계산하여 진행 방향으로 회전
   - `drop-shadow` 필터로 가독성 향상

4. **환승역 강조**

   - 경로 상의 환승역 Label을 빨간색으로 변경
   - DOM 직접 조작으로 즉각적인 시각적 피드백
   - 경로 초기화 시 모든 Label 색상 복원

5. **성능 최적화**
   - `drawRoute` 함수를 `useCallback`으로 메모이제이션
   - 레이어 그룹을 재사용하여 불필요한 생성/삭제 방지

### 핵심 구현 코드

**`hooks/useMetroMap.ts` - 경로 그리기 함수**

```typescript
const drawRoute = useCallback((result: PathfindingResult) => {
  if (!mapRef.current) return;

  const map = mapRef.current;
  const { coords, transferStationIds } = result;

  // 1. 경로 레이어 초기화 및 생성
  if (!routeLayerRef.current) {
    routeLayerRef.current = L.layerGroup().addTo(map);
  } else {
    routeLayerRef.current.clearLayers();
  }

  if (!arrowLayerRef.current) {
    arrowLayerRef.current = L.layerGroup().addTo(map);
  } else {
    arrowLayerRef.current.clearLayers();
  }

  // 2. 경로 Polyline 그리기
  L.polyline(coords, {
    color: "#ff3b30", // 빨간색
    weight: 10, // 두께
    opacity: 0.95, // 불투명도
    lineCap: "round", // 끝 모양
    lineJoin: "round", // 연결 모양
  }).addTo(routeLayerRef.current);

  // 3. 진행방향 화살표 그리기
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];

    // 각도 계산 (라디안 → 도)
    const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const angleDeg = (angleRad * 180) / Math.PI;

    // 각 구간에 2개의 화살표 배치
    [0.4, 0.8].forEach((t) => {
      // 화살표 위치 계산 (선형 보간)
      const pos: [number, number] = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ];

      // 삼각형 화살표 아이콘 생성
      const arrowIcon = L.divIcon({
        className: "route-arrow",
        html: `<div style="
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 12px solid #ffffff;
          transform: rotate(${angleDeg}deg);
          filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)) drop-shadow(0 1px 1px rgba(0,0,0,0.5));
        "></div>`,
        iconSize: [14, 12],
        iconAnchor: [7, 6],
      });

      // 화살표 마커 추가
      L.marker(pos, {
        icon: arrowIcon,
        zIndexOffset: 1300, // 다른 요소보다 위에 표시
      }).addTo(arrowLayerRef.current!);
    });
  }

  // 4. 환승역 하이라이트
  highlightTransferLabels(transferStationIds);
}, []);
```

**`utils/mapHelpers.ts` - 환승역 하이라이트**

```typescript
export function highlightTransferLabels(transferStationIds: string[]): void {
  // 1. 모든 라벨 초기화 (검은색)
  const ALL = document.querySelectorAll<HTMLSpanElement>(
    ".station-label .label-text"
  );
  ALL.forEach((el) => (el.style.color = "#222"));

  // 2. 환승역만 빨간색으로 강조
  transferStationIds.forEach((sid) => {
    const label = document.querySelector<HTMLSpanElement>(
      `.station-label-root[data-station-id="${sid}"] .label-text`
    );
    if (label) {
      label.style.color = "#ff3b30";
      label.style.fontWeight = "600"; // 굵게
    }
  });
}
```

**`hooks/useMetroMap.ts` - 경로 초기화**

```typescript
const clearRoute = useCallback(() => {
  // 경로 레이어 제거
  if (routeLayerRef.current) {
    routeLayerRef.current.clearLayers();
  }

  // 화살표 레이어 제거
  if (arrowLayerRef.current) {
    arrowLayerRef.current.clearLayers();
  }

  // 환승역 하이라이트 제거
  highlightTransferLabels([]);

  // 출발지/도착지 하이라이트 제거
  highlightStationCircles({});
}, []);
```

**`Components/MetroMapContainer.tsx` - 경로 그리기 호출**

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;

  // 경로 탐색
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

  // 경로 그리기
  drawRoute(result);

  // 이력 추가
  addToHistory(startStation, endStation);

  // 정보 텍스트 업데이트
  updateInfoText(`...`);
}, [
  startStation,
  endStation,
  drawRoute,
  clearRoute,
  updateInfoText,
  addToHistory,
]);
```

### 구현 흐름

```
1. 출발지와 도착지 선택 완료
   ↓
2. dijkstraWithTransfers 실행 → PathfindingResult 반환
   ↓
3. drawRoute(result) 호출
   ↓
4. 기존 경로 레이어 초기화
   ↓
5. 경로 좌표(coords)로 Polyline 생성
   - 빨간색, 두께 10px, 불투명도 0.95
   ↓
6. 각 구간마다 반복
   ↓
7. 구간의 시작점(a)과 끝점(b) 사이 각도 계산
   - Math.atan2(a[1] - b[1], a[0] - b[0])
   ↓
8. 40%, 80% 지점에 화살표 마커 배치
   - 위치: 선형 보간으로 계산
   - 회전: 계산된 각도로 transform
   ↓
9. 환승역 ID 목록으로 Label 색상 변경
   - DOM 쿼리로 해당 Label 찾기
   - style.color = "#ff3b30"
   ↓
10. 지도에 경로 시각화 완료
```

### 화살표 각도 계산 원리

```typescript
// 두 점 사이의 각도 계산
const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
// Math.atan2(y차이, x차이) → 라디안 각도 반환

// 라디안을 도(degree)로 변환
const angleDeg = (angleRad * 180) / Math.PI;

// CSS transform으로 회전
transform: rotate(${angleDeg}deg);
```

### 화살표 위치 계산 (선형 보간)

```typescript
// t = 0.4 (40% 지점)
const pos = [
  a[0] + (b[0] - a[0]) * 0.4, // x 좌표
  a[1] + (b[1] - a[1]) * 0.4, // y 좌표
];

// 예시:
// a = [100, 50], b = [200, 150]
// 40% 지점 = [100 + (200-100)*0.4, 50 + (150-50)*0.4]
//          = [140, 90]
```

### 시각적 효과

- **경로 선**: 기존 노선(두께 8px)보다 두꺼운 10px로 명확히 구분
- **화살표**: 흰색 삼각형 + 검은색 그림자로 가독성 확보
- **환승역**: 빨간색 Label로 환승 지점 강조
- **레이어 순서**: 화살표가 가장 위에 표시되도록 zIndexOffset 설정

---

## 📍 기능 5: 특정 노선 하이라이트

### 구현 방법

화면 우측 사이드에 있는 지하철 노선에서 특정 호선 클릭 시 해당 호선 하이라이트 기능 추가

노선 버튼 클릭 시 토글 방식으로 동작하도록 구현. 선택된 노선과 해당 역만 정상 opacity로 표시하고, 나머지는 흐리게 처리. Polyline과 Marker의 참조를 Map 자료구조로 관리하여 효율적으로 opacity를 조정하는 방식으로 구현함.

### 고려한 사항

1. **토글 동작**

   - 같은 노선을 다시 클릭하면 전체 보기로 복귀
   - 다른 노선을 클릭하면 해당 노선으로 전환
   - 직관적인 UX를 위해 버튼 색상도 함께 변경

2. **참조 관리**

   - 모든 Polyline을 `polylinesRef` Map에 저장
   - 모든 Marker를 `markersRef` Map에 저장
   - Key 형식: `${lineId}-${idx}` (예: "1-0", "1-1", "2-0")
   - 나중에 opacity 조정 시 빠르게 접근 가능

3. **시각적 피드백**

   - 선택된 노선: opacity 0.8 (정상)
   - 선택되지 않은 노선: opacity 0.15 (매우 흐림)
   - 선택된 노선의 역: opacity 1 (정상)
   - 선택되지 않은 역: opacity 0.2 (흐림)
   - 버튼 배경색: 선택 시 해당 노선 색상

4. **성능 최적화**

   - `useEffect`로 `selectedLine` 변경 시에만 실행
   - Map의 `forEach`로 효율적인 순회
   - DOM 조작 최소화

5. **환승역 처리**
   - 환승역은 여러 노선에 속함 (`station.lines` 배열)
   - `includes` 메서드로 선택된 노선 포함 여부 확인
   - 하나라도 포함되면 정상 opacity로 표시

### 핵심 구현 코드

**`Components/MetroMapContainer.tsx` - 노선 선택 상태 및 토글**

```typescript
// 1. 노선 선택 상태
const [selectedLine, setSelectedLine] = useState<string | null>(null);

// 2. 토글 로직
<MetroMap
  // ... 다른 props
  highlightLine={(lineId) => {
    // 같은 노선을 다시 클릭하면 해제 (전체 보기)
    if (selectedLine === lineId) {
      setSelectedLine(null);
    } else {
      // 다른 노선 클릭 시 해당 노선으로 전환
      setSelectedLine(lineId);
    }
  }}
/>;
```

**`Components/MetroMap.tsx` - 노선 버튼 UI**

```typescript
<Card title='🚉 지하철 노선' size='small'>
  <Space direction='vertical' style={{ width: "100%" }} size='small'>
    {subwayLines.map((line) => (
      <Button
        key={line.id}
        block
        size='small'
        type={selectedLine === line.id ? "primary" : "default"}
        onClick={(e) => {
          e.stopPropagation(); // 이벤트 버블링 방지
          highlightLine(line.id);
        }}
        style={{
          textAlign: "center",
          height: "auto",
          padding: "8px 12px",
          borderColor: line.color,
          // 선택된 노선: 해당 색상 배경, 흰색 텍스트
          backgroundColor: selectedLine === line.id ? line.color : "white",
          color: selectedLine === line.id ? "white" : line.color,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <strong>{line.name}</strong>
          <br />
          <small style={{ opacity: 0.8 }}>
            {stations.filter((st) => st.lines.includes(line.id)).length}개 역
            운행
          </small>
        </div>
      </Button>
    ))}
  </Space>
</Card>
```

**`hooks/useMetroMap.ts` - Polyline 참조 저장**

```typescript
// 1. Ref 선언
const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
const markersRef = useRef<Map<string, L.Marker>>(new Map());

// 2. 노선 렌더링 시 참조 저장
subwayLines.forEach((line) => {
  const lineEdges = edges.filter((e) => e.line === line.id);

  lineEdges.forEach((edge, idx) => {
    const fromStation = stations.find((s) => s.id === edge.from);
    const toStation = stations.find((s) => s.id === edge.to);

    if (fromStation && toStation) {
      const polyline = L.polyline(
        [
          [fromStation.lat, fromStation.lng],
          [toStation.lat, toStation.lng],
        ],
        {
          color: line.color,
          weight: 8,
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
          className: `line-${line.id}`, // CSS 클래스 추가
        }
      ).addTo(map);

      // Map에 저장 (Key: "노선ID-인덱스")
      polylinesRef.current.set(`${line.id}-${idx}`, polyline);
    }
  });
});

// 3. 역 마커도 참조 저장
stations.forEach((station) => {
  const marker = L.marker([station.lat, station.lng], {
    icon: createStationLabel(station, color, station.isTransfer),
  }).addTo(map);

  // Map에 저장 (Key: 역ID)
  markersRef.current.set(station.id, marker);
});
```

**`hooks/useMetroMap.ts` - 필터링 로직**

```typescript
// selectedLine 변경 시 실행
useEffect(() => {
  if (!selectedLine) {
    // === 전체 보기 ===

    // 모든 노선을 정상 opacity로 복원
    polylinesRef.current.forEach((polyline) => {
      polyline.setStyle({ opacity: 0.8 });
    });

    // 모든 역을 정상 opacity로 복원
    markersRef.current.forEach((marker) => {
      marker.setOpacity(1);
    });
  } else {
    // === 특정 노선만 표시 ===

    // 노선 필터링
    polylinesRef.current.forEach((polyline, key) => {
      // Key에서 노선 ID 추출 (예: "1-0" → "1")
      const lineId = key.split("-")[0];

      if (lineId === selectedLine) {
        // 선택된 노선: 정상 opacity
        polyline.setStyle({ opacity: 0.8 });
      } else {
        // 나머지 노선: 매우 흐리게
        polyline.setStyle({ opacity: 0.15 });
      }
    });

    // 역 필터링
    markersRef.current.forEach((marker, stationId) => {
      // 역 정보 조회
      const station = stations.find((s) => s.id === stationId);

      if (station && station.lines.includes(selectedLine)) {
        // 선택된 노선에 속한 역: 정상 opacity
        marker.setOpacity(1);
      } else {
        // 나머지 역: 흐리게
        marker.setOpacity(0.2);
      }
    });
  }
}, [selectedLine, stations]);
```

**`hooks/useMetroMap.ts` - Props에 selectedLine 추가**

```typescript
export interface UseMetroMapProps {
  stations: Station[];
  subwayLines: SubwayLine[];
  edges: Edge[];
  startStation: Station | null;
  endStation: Station | null;
  selectedLine: string | null; // 추가
  onStationSelect: (station: Station, role: "start" | "end") => void;
  onMapClick: () => void;
}

export function useMetroMap(props: UseMetroMapProps): UseMetroMapReturn {
  const {
    stations,
    subwayLines,
    edges,
    startStation,
    endStation,
    selectedLine, // 추가
    onStationSelect,
    onMapClick,
  } = props;

  // ...
}
```

### 구현 흐름

```
1. 사용자가 노선 버튼 클릭 (예: 1호선)
   ↓
2. highlightLine("1") 호출
   ↓
3. MetroMapContainer의 토글 로직 실행
   - selectedLine === "1"? → setSelectedLine(null)
   - selectedLine !== "1"? → setSelectedLine("1")
   ↓
4. selectedLine 상태 업데이트
   ↓
5. useMetroMap의 useEffect 트리거
   ↓
6. polylinesRef.current.forEach 실행
   - Key에서 노선 ID 추출
   - 1호선이면 opacity 0.8
   - 아니면 opacity 0.15
   ↓
7. markersRef.current.forEach 실행
   - 역 정보 조회
   - station.lines.includes("1")이면 opacity 1
   - 아니면 opacity 0.2
   ↓
8. 지도에 필터링 결과 즉시 반영
   ↓
9. 버튼 색상도 변경 (배경: 1호선 색상, 텍스트: 흰색)
```

### 환승역 처리 예시

```typescript
// 환승역 예시
const station = {
  id: "S5",
  name: "중앙역",
  lines: ["1", "2", "3"], // 1, 2, 3호선 환승역
  // ...
};

// 1호선 선택 시
station.lines.includes("1"); // true → opacity 1 (표시)

// 4호선 선택 시
station.lines.includes("4"); // false → opacity 0.2 (흐림)
```

### Map 자료구조 활용

```typescript
// Polyline 저장
polylinesRef.current.set("1-0", polyline1);
polylinesRef.current.set("1-1", polyline2);
polylinesRef.current.set("2-0", polyline3);

// 조회 및 수정
polylinesRef.current.forEach((polyline, key) => {
  const lineId = key.split("-")[0]; // "1-0" → "1"
  if (lineId === "1") {
    polyline.setStyle({ opacity: 0.8 });
  }
});

// Marker 저장
markersRef.current.set("S1", marker1);
markersRef.current.set("S2", marker2);

// 조회 및 수정
const marker = markersRef.current.get("S1");
marker?.setOpacity(0.5);
```

### 시각적 효과

```
전체 보기 (selectedLine === null):
- 모든 노선: opacity 0.8
- 모든 역: opacity 1
- 버튼: 흰색 배경, 노선 색상 텍스트

1호선 선택 (selectedLine === "1"):
- 1호선: opacity 0.8 (정상)
- 다른 노선: opacity 0.15 (매우 흐림)
- 1호선 역: opacity 1 (정상)
- 다른 역: opacity 0.2 (흐림)
- 1호선 버튼: 1호선 색상 배경, 흰색 텍스트
- 다른 버튼: 흰색 배경, 노선 색상 텍스트
```

---

## 📍 기능 6: 소요 시간 계산 및 표시

### 구현 방법

임의로 경로 산정 규칙을 세워서 지도 우측 상단에 경로와 같이 표시해주는 기능 추가

Dijkstra 알고리즘을 활용한 최단 경로 탐색 시, 각 구간의 `weight` 값을 비용으로 사용. 경로를 분석하여 정차역 수와 환승 횟수를 계산하고, 미리 정의한 규칙(역 간 이동 4분, 환승 5분)을 적용하여 총 소요 시간을 산출하는 방식으로 구현함.

### 고려한 사항

1. **시간 규칙 정의**

   - 역 간 이동 시간: 4분 (`EDGE_STOP_MIN`)
   - 환승 시간: 5분 (`EDGE_TRANSFER_MIN`)
   - 상수로 관리하여 쉽게 조정 가능
   - 실제 지하철 평균 소요 시간을 참고하여 설정

2. **그래프 구조**

   - 각 역을 노선별로 별도의 노드로 표현 (예: "S1@1", "S1@2")
   - 일반 이동: 같은 노선의 인접 역 연결
   - 환승: 같은 역의 다른 노선 노드 연결
   - Edge의 `weight`가 비용(시간)

3. **통계 계산 로직**

   - 경로를 순회하며 정차역과 환승 구분
   - 같은 역, 다른 노선 = 환승
   - 다른 역, 같은 노선 = 정차
   - 환승역 ID 목록도 함께 추출

4. **계산 공식**

   ```
   총 소요 시간 = (정차역 수 × 4분) + (환승 횟수 × 5분)
   ```

5. **정확성 보장**
   - Dijkstra 알고리즘으로 최단 경로 보장
   - 우선순위 큐로 효율적인 탐색
   - 경로 복원으로 정확한 통계 계산

### 핵심 구현 코드

**`data/edges.ts` - 시간 규칙 및 데이터 정의**

```typescript
// 시간 규칙 상수
export const EDGE_STOP_MIN = 4; // 역 간 이동 시간 (분)
export const EDGE_TRANSFER_MIN = 5; // 환승 시간 (분)

// Edge 데이터 (weight = 소요 시간)
export const edges: Edge[] = [
  // 일반 이동 (같은 노선의 인접 역)
  { from: "S1", to: "S2", line: "1", weight: 3 },
  { from: "S2", to: "S3", line: "1", weight: 4 },
  { from: "S3", to: "S4", line: "1", weight: 3 },

  // 환승 (같은 역, 다른 노선)
  { from: "S5", to: "S5", line: "1-2", weight: 5 }, // 1호선 ↔ 2호선
  { from: "S8", to: "S8", line: "2-3", weight: 5 }, // 2호선 ↔ 3호선

  // ...
];
```

**`utils/pathfinding.ts` - Dijkstra 알고리즘**

```typescript
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number, // 역 간 이동 시간
  edgeTransferMin: number // 환승 시간
): PathfindingResult | null {
  // 1. 그래프 구조 생성
  const { adj, nodeMeta } = buildGraph(stations, edges);

  // 2. 시작 노드들 (역의 모든 노선)
  const startNodes: NodeKey[] = start.lines.map((lid) => `${start.id}@${lid}`);
  const isGoal = (key: NodeKey) => key.startsWith(`${end.id}@`);

  // 3. Dijkstra 초기화
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey | null>();
  const pq: Array<{ key: NodeKey; d: number }> = [];

  startNodes.forEach((k) => {
    dist.set(k, 0);
    prev.set(k, null);
    pq.push({ key: k, d: 0 });
  });

  // 4. 최단 경로 탐색
  let goalKey: NodeKey | null = null;

  while (pq.length) {
    // 우선순위 큐에서 최소 거리 노드 선택
    pq.sort((a, b) => a.d - b.d);
    const cur = pq.shift()!;

    if (dist.get(cur.key)! < cur.d) continue;

    // 목적지 도착
    if (isGoal(cur.key)) {
      goalKey = cur.key;
      break;
    }

    // 인접 노드 탐색
    const edgeList = adj.get(cur.key) || [];
    for (const { to, cost } of edgeList) {
      const nd = cur.d + cost; // 새로운 거리

      // 더 짧은 경로 발견 시 업데이트
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, cur.key);
        pq.push({ key: to, d: nd });
      }
    }
  }

  if (!goalKey) return null; // 경로 없음

  // 5. 경로 복원
  const rev: NodeKey[] = [];
  let t: NodeKey | null = goalKey;
  while (t) {
    rev.push(t);
    t = prev.get(t) ?? null;
  }
  const path = rev.reverse();

  // 6. 통계 계산
  let transfers = 0;
  let stops = 0;
  const transferStationIds: string[] = [];

  for (let i = 1; i < path.length; i++) {
    const a = nodeMeta.get(path[i - 1]);
    const b = nodeMeta.get(path[i]);

    if (!a || !b) continue;

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

  // 7. 총 소요 시간 계산
  const minutes = stops * edgeStopMin + transfers * edgeTransferMin;

  // 8. 경로 좌표 추출
  const coords: [number, number][] = [];
  let lastStation: string | null = null;

  for (const key of path) {
    const meta = nodeMeta.get(key);
    if (!meta) continue;

    const { stationId } = meta;
    if (stationId !== lastStation) {
      const s = stations.find((s) => s.id === stationId);
      if (s) coords.push([s.lat, s.lng]);
      lastStation = stationId;
    }
  }

  return {
    minutes, // 총 소요 시간
    stops, // 정차역 수
    transfers, // 환승 횟수
    coords, // 경로 좌표
    transferStationIds, // 환승역 ID 목록
    path, // 노드 경로
    nodeMeta, // 노드 메타데이터
  };
}
```

**`utils/pathfinding.ts` - 그래프 구조 생성**

```typescript
export function buildGraph(
  stations: Station[],
  edges: Edge[]
): {
  adj: Map<NodeKey, Array<{ to: NodeKey; cost: number }>>;
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>;
} {
  const adj = new Map<NodeKey, Array<{ to: NodeKey; cost: number }>>();
  const nodeMeta = new Map<NodeKey, { stationId: string; lineId: string }>();

  // 1. 모든 역*노선별 노드 등록
  stations.forEach((st) =>
    st.lines.forEach((lid) =>
      nodeMeta.set(`${st.id}@${lid}`, { stationId: st.id, lineId: lid })
    )
  );

  // 2. Edge 리스트 기반 간선 추가
  edges.forEach(({ from, to, line, weight }) => {
    if (line.includes("-")) {
      // 환승 edge (예: "1-2")
      const [lA, lB] = line.split("-");
      const fromKey = `${from}@${lA}`;
      const toKey = `${to}@${lB}`;

      // 양방향 연결
      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });

      if (!adj.has(toKey)) adj.set(toKey, []);
      adj.get(toKey)!.push({ to: fromKey, cost: weight });
    } else {
      // 일반 edge
      const fromKey = `${from}@${line}`;
      const toKey = `${to}@${line}`;

      // 단방향 연결 (역방향은 별도 edge로 정의)
      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });
    }
  });

  return { adj, nodeMeta };
}
```

**`Components/MetroMapContainer.tsx` - 결과 표시**

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;

  // 경로 탐색 (시간 규칙 전달)
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
    clearRoute();
    return;
  }

  // 결과 추출
  const { minutes, stops, transfers, path, nodeMeta } = result;

  // 주요 경유지 추출
  let stationNames: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const meta = nodeMeta.get(path[i]);
    if (!meta) continue;

    const station = stations.find((s) => s.id === meta.stationId);
    if (!station) continue;

    // 출발지, 도착지, 환승역만 포함
    if (station.id === startStation.id || station.id === endStation.id) {
      stationNames.push(station.name);
      continue;
    }

    if (i > 0) {
      const prevMeta = nodeMeta.get(path[i - 1]);
      if (
        prevMeta &&
        prevMeta.stationId === meta.stationId &&
        prevMeta.lineId !== meta.lineId
      ) {
        stationNames.push(station.name);
      }
    }
  }

  // 중복 제거
  stationNames = stationNames.filter(
    (name, idx, arr) => arr.indexOf(name) === idx
  );

  const routeText = stationNames.join(" → ");

  // 정보 텍스트 업데이트
  updateInfoText(`
    출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
    정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
    경로: <b>${routeText}</b>
  `);

  // 경로 그리기
  drawRoute(result);

  // 이력 추가
  addToHistory(startStation, endStation);
}, [
  startStation,
  endStation,
  drawRoute,
  clearRoute,
  updateInfoText,
  addToHistory,
]);
```

### 구현 흐름

```
1. 사용자가 출발지와 도착지 선택
   ↓
2. dijkstraWithTransfers 호출
   - 시간 규칙 전달 (4분, 5분)
   ↓
3. buildGraph로 그래프 구조 생성
   - 각 역을 노선별로 노드 생성
   - Edge 데이터로 간선 연결
   ↓
4. Dijkstra 알고리즘 실행
   - 우선순위 큐로 최단 경로 탐색
   - weight 값을 비용으로 사용
   ↓
5. 경로 복원
   - prev Map을 역순으로 추적
   - 시작점부터 도착점까지 경로 생성
   ↓
6. 경로 분석
   - 각 구간을 순회하며 정차/환승 구분
   - 같은 역, 다른 노선 → 환승 카운트
   - 다른 역, 같은 노선 → 정차 카운트
   ↓
7. 소요 시간 계산
   - minutes = stops × 4 + transfers × 5
   ↓
8. 결과 반환
   - minutes, stops, transfers, coords, ...
   ↓
9. 정보 텍스트 업데이트
   - "정차역 7개 · 환승 3회 · 예상 34분"
```

### 계산 예시

**경로:** 금융가(1호선) → 테크밸리(1호선) → 비즈니스 파크(2호선) → 중앙역(3호선) → 자연공원(3호선)

**분석:**

1. 금융가 → 테크밸리: 같은 노선(1호선), 다른 역 → **정차** (stops++)
2. 테크밸리 → 테크밸리: 같은 역, 다른 노선(1→2) → **환승** (transfers++)
3. 테크밸리(2호선) → 비즈니스 파크: 같은 노선(2호선), 다른 역 → **정차** (stops++)
4. 비즈니스 파크 → 비즈니스 파크: 같은 역, 다른 노선(2→3) → **환승** (transfers++)
5. 비즈니스 파크(3호선) → 중앙역: 같은 노선(3호선), 다른 역 → **정차** (stops++)
6. 중앙역 → 자연공원: 같은 노선(3호선), 다른 역 → **정차** (stops++)

**결과:**

- 정차역: 4개
- 환승: 2회
- 소요 시간: 4 × 4 + 2 × 5 = 16 + 10 = **26분**

### 그래프 구조 예시

```
역 데이터:
S1: { lines: ["1"] }
S5: { lines: ["1", "2"] }  // 환승역

노드 생성:
S1@1  (S1역의 1호선)
S5@1  (S5역의 1호선)
S5@2  (S5역의 2호선)

간선 연결:
S1@1 → S5@1 (weight: 3)  // 일반 이동
S5@1 ↔ S5@2 (weight: 5)  // 환승
```

### 시간 규칙 조정

```typescript
// data/edges.ts에서 상수 변경

// 더 빠르게
export const EDGE_STOP_MIN = 3;
export const EDGE_TRANSFER_MIN = 4;

// 더 느리게
export const EDGE_STOP_MIN = 5;
export const EDGE_TRANSFER_MIN = 7;

// 특정 구간만 조정
{ from: "S1", to: "S2", line: "1", weight: 6 },  // 이 구간만 6분
```

---

## 📝 전체 정리

### 구현 철학

모든 기능은 다음 원칙을 따라 구현되었습니다:

1. **관심사의 분리**

   - UI, 로직, 데이터, 유틸리티를 명확히 분리
   - 각 파일은 하나의 책임만 담당

2. **재사용성**

   - 커스텀 훅으로 로직 캡슐화
   - 순수 함수로 유틸리티 구현
   - 상수로 설정 값 관리

3. **성능 최적화**

   - useCallback, useMemo로 메모이제이션
   - Ref로 불필요한 리렌더링 방지
   - 레이어 그룹으로 효율적인 관리

4. **사용자 경험**

   - 즉각적인 시각적 피드백
   - 직관적인 인터랙션
   - 명확한 정보 표시

5. **유지보수성**
   - 타입으로 안정성 확보
   - 명확한 네이밍
   - 주석으로 의도 설명

### 기술 스택 활용

- **React**: 컴포넌트 기반 UI, 훅으로 로직 관리
- **TypeScript**: 타입 안정성, 인터페이스 정의
- **Leaflet**: 지도 렌더링, 마커/레이어 관리
- **Ant Design**: UI 컴포넌트 라이브러리
- **Dijkstra**: 최단 경로 알고리즘

### 확장 가능성

이 구조는 다음과 같은 기능을 쉽게 추가할 수 있습니다:

- 즐겨찾기 기능
- 실시간 열차 위치
- 요금 계산
- 다국어 지원
- 테마 변경
- 경로 공유

각 기능은 적절한 폴더에 추가하면 됩니다! 🚀
