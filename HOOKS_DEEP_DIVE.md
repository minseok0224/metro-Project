# hooks 패키지 완전 정복 🎣

이 문서는 `hooks/` 패키지에 대해 **매우 상세하게** 설명합니다.

---

## 📚 목차

1. [왜 커스텀 훅을 만들어야 하나요?](#왜-커스텀-훅을-만들어야-하나요)
2. [커스텀 훅 vs 일반 사용 비교](#커스텀-훅-vs-일반-사용-비교)
3. [useRouteState 훅 완전 분석](#useroutestate-훅-완전-분석)
4. [useMetroMap 훅 완전 분석](#usemetromap-훅-완전-분석)
5. [useRef vs useState](#useref-vs-usestate)
6. [커스텀 훅의 반환 패턴](#커스텀-훅의-반환-패턴)
7. [실전 사용 전후 비교](#실전-사용-전후-비교)

---

## 왜 커스텀 훅을 만들어야 하나요?

### 🎯 핵심 이유: "로직 재사용"

**커스텀 훅은 "로직을 담는 상자"입니다**

```
┌─────────────────────────────────┐
│   커스텀 훅 (useRouteState)      │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 상태 (useState)          │   │
│  │ - startStation          │   │
│  │ - endStation            │   │
│  │ - routeHistory          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 로직 (함수들)            │   │
│  │ - addToHistory()        │   │
│  │ - removeFromHistory()   │   │
│  │ - selectHistoryItem()   │   │
│  └─────────────────────────┘   │
│                                 │
│  return { 상태, 함수들 }        │
└─────────────────────────────────┘
         ↓
    어디서든 사용 가능!
```

---

## 커스텀 훅 vs 일반 사용 비교

### 시나리오: 경로 이력 기능을 추가한다고 가정

#### ❌ 커스텀 훅 없이 구현 (문제 투성이)

```typescript
// MetroMapContainer.tsx
const MetroMapContainer = () => {
  // 1. 상태 선언
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  // 2. 이력 추가 로직 (20줄)
  const addToHistory = (from: Station, to: Station) => {
    setRouteHistory((prev) => {
      // 중복 제거
      const filtered = prev.filter(
        (h) => !(h.from.id === from.id && h.to.id === to.id)
      );
      // 새 항목을 맨 앞에 추가
      return [{ from, to }, ...filtered].slice(0, 4);
    });
  };

  // 3. 이력 삭제 로직 (10줄)
  const removeFromHistory = (item: RouteHistoryItem) => {
    setRouteHistory((prev) =>
      prev.filter(
        (h) => !(h.from.id === item.from.id && h.to.id === item.to.id)
      )
    );
  };

  // 4. 이력 선택 로직 (5줄)
  const selectHistoryItem = (item: RouteHistoryItem) => {
    setStartStation(item.from);
    setEndStation(item.to);
  };

  // 5. 경로 탐색 로직 (30줄)
  useEffect(() => {
    if (!startStation || !endStation) return;
    // 경로 탐색 코드...
    addToHistory(startStation, endStation);
  }, [startStation, endStation]);

  return (
    <MetroMap routeHistory={routeHistory} onHistoryClick={selectHistoryItem} />
  );
};

// 만약 다른 컴포넌트에서도 이력 기능이 필요하다면?
// → 위 코드 65줄을 복사-붙여넣기 해야 함! 😱
```

**문제점:**

1. 🔴 **코드 중복**: 다른 컴포넌트에서도 필요하면 복사-붙여넣기
2. 🔴 **유지보수 지옥**: 버그 수정 시 모든 곳을 찾아서 수정
3. 🔴 **테스트 불가능**: 컴포넌트와 로직이 섞여있어 로직만 테스트 불가
4. 🔴 **가독성 저하**: 컴포넌트가 길어지고 복잡해짐 (200줄+)
5. 🔴 **의존성 관리 어려움**: useEffect 의존성 배열 관리가 복잡

#### ✅ 커스텀 훅으로 구현 (깔끔!)

```typescript
// hooks/useRouteState.ts (50줄)
export function useRouteState() {
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  const addToHistory = useCallback((from: Station, to: Station) => {
    setRouteHistory((prev) => {
      const filtered = prev.filter(
        (h) => !(h.from.id === from.id && h.to.id === to.id)
      );
      return [{ from, to }, ...filtered].slice(0, 4);
    });
  }, []);

  const removeFromHistory = useCallback((item: RouteHistoryItem) => {
    setRouteHistory((prev) =>
      prev.filter(
        (h) => !(h.from.id === item.from.id && h.to.id === item.to.id)
      )
    );
  }, []);

  const selectHistoryItem = useCallback((item: RouteHistoryItem) => {
    setStartStation(item.from);
    setEndStation(item.to);
  }, []);

  return {
    startStation,
    endStation,
    routeHistory,
    setStartStation,
    setEndStation,
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  };
}

// Components/MetroMapContainer.tsx (10줄)
const MetroMapContainer = () => {
  // 한 줄로 모든 기능 사용! 🎉
  const {
    startStation,
    endStation,
    routeHistory,
    setStartStation,
    setEndStation,
    addToHistory,
    selectHistoryItem,
  } = useRouteState();

  useEffect(() => {
    if (!startStation || !endStation) return;
    // 경로 탐색 코드...
    addToHistory(startStation, endStation);
  }, [startStation, endStation, addToHistory]);

  return (
    <MetroMap routeHistory={routeHistory} onHistoryClick={selectHistoryItem} />
  );
};

// 다른 컴포넌트에서도 똑같이 사용 가능! 🚀
const RouteHistoryPage = () => {
  const { routeHistory, removeFromHistory } = useRouteState();
  return <HistoryList items={routeHistory} onRemove={removeFromHistory} />;
};

const FavoritesPage = () => {
  const { routeHistory, selectHistoryItem } = useRouteState();
  return <FavoritesList items={routeHistory} onSelect={selectHistoryItem} />;
};
```

**장점:**

1. ✅ **재사용 가능**: 어디서든 `useRouteState()` 호출만 하면 됨
2. ✅ **유지보수 쉬움**: 버그 수정은 `useRouteState.ts` 한 곳만
3. ✅ **테스트 가능**: 훅만 독립적으로 테스트 가능
4. ✅ **가독성 향상**: 컴포넌트가 짧고 깔끔 (10줄)
5. ✅ **관심사 분리**: 로직과 UI가 명확히 분리
6. ✅ **타입 안정성**: 반환 타입이 명확함

---

## 커스텀 훅의 핵심 원리

### 규칙

1. **이름은 반드시 `use`로 시작** (React의 규칙)

   ```typescript
   // ✅ 올바른 이름
   useRouteState();
   useMetroMap();
   useToggle();

   // ❌ 잘못된 이름
   routeState(); // use가 없음
   getRouteState(); // use가 없음
   ```

2. **다른 훅을 사용할 수 있음**

   ```typescript
   function useRouteState() {
     const [state, setState] = useState();  // ✅ 가능
     useEffect(() => { ... }, []);          // ✅ 가능
     const value = useMemo(() => { ... });  // ✅ 가능
     return { state, value };
   }
   ```

3. **컴포넌트 최상위에서만 호출**

   ```typescript
   // ✅ 올바른 사용
   function Component() {
     const { state } = useRouteState();
     return <div>{state}</div>;
   }

   // ❌ 잘못된 사용
   function Component() {
     if (condition) {
       const { state } = useRouteState(); // 조건문 안에서 호출 불가!
     }
   }
   ```

4. **반환값은 자유롭게 설계**

   ```typescript
   // 객체 반환
   return { state, setState, doSomething };

   // 배열 반환
   return [state, setState];

   // 값 반환
   return state;
   ```

---

## useRouteState 훅 완전 분석

### 전체 코드

```typescript
export function useRouteState(): UseRouteStateReturn {
  // 1️⃣ 상태 선언 (이 훅이 관리할 데이터)
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  // 2️⃣ 이력 추가 함수 (메모이제이션)
  const addToHistory = useCallback((from: Station, to: Station) => {
    setRouteHistory((prev) => {
      // 중복 제거: 같은 경로가 있으면 제거
      const filtered = prev.filter(
        (h) => !(h.from.id === from.id && h.to.id === to.id)
      );
      // 새 항목을 맨 앞에 추가하고 최대 4개까지만 유지
      return [{ from, to }, ...filtered].slice(0, 4);
    });
  }, []); // 빈 배열 = 함수는 한 번만 생성

  // 3️⃣ 이력 삭제 함수
  const removeFromHistory = useCallback((item: RouteHistoryItem) => {
    setRouteHistory((prev) =>
      prev.filter(
        (h) => !(h.from.id === item.from.id && h.to.id === item.to.id)
      )
    );
  }, []);

  // 4️⃣ 이력 선택 함수
  const selectHistoryItem = useCallback((item: RouteHistoryItem) => {
    setStartStation(item.from);
    setEndStation(item.to);
  }, []);

  // 5️⃣ 외부에 노출할 인터페이스
  return {
    // 상태
    startStation,
    endStation,
    routeHistory,
    // 상태 변경 함수
    setStartStation,
    setEndStation,
    // 비즈니스 로직 함수
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  };
}
```

### 라인별 상세 설명

#### 1️⃣ 상태 선언

```typescript
const [startStation, setStartStation] = useState<Station | null>(null);
const [endStation, setEndStation] = useState<Station | null>(null);
const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);
```

**왜 이렇게 선언했나요?**

- `Station | null`: 초기에는 선택된 역이 없으므로 `null`
- `RouteHistoryItem[]`: 배열로 여러 이력 저장

**이 상태들은 어디서 사용되나요?**

- `startStation`, `endStation`: 경로 탐색에 사용
- `routeHistory`: 최근 경로 목록 표시

#### 2️⃣ 이력 추가 함수

```typescript
const addToHistory = useCallback((from: Station, to: Station) => {
  setRouteHistory((prev) => {
    // 중복 제거
    const filtered = prev.filter(
      (h) => !(h.from.id === from.id && h.to.id === to.id)
    );
    // 새 항목을 맨 앞에 추가하고 최대 4개까지만 유지
    return [{ from, to }, ...filtered].slice(0, 4);
  });
}, []);
```

**왜 useCallback을 사용하나요?**

```typescript
// ❌ useCallback 없이
const addToHistory = (from, to) => { ... };
// 문제: 컴포넌트가 리렌더링될 때마다 새 함수 생성
// → 이 함수를 props로 받는 자식 컴포넌트도 리렌더링됨

// ✅ useCallback 사용
const addToHistory = useCallback((from, to) => { ... }, []);
// 해결: 함수가 한 번만 생성되고 재사용됨
// → 자식 컴포넌트 불필요한 리렌더링 방지
```

**왜 함수형 업데이트를 사용하나요?**

```typescript
// ❌ 직접 참조 (위험)
const addToHistory = (from, to) => {
  setRouteHistory([{ from, to }, ...routeHistory].slice(0, 4));
  // 문제: routeHistory가 오래된 값일 수 있음
  // 의존성 배열에 routeHistory를 추가해야 함
};

// ✅ 함수형 업데이트 (안전)
const addToHistory = useCallback((from, to) => {
  setRouteHistory((prev) => [{ from, to }, ...prev].slice(0, 4));
  // 해결: prev는 항상 최신 값을 보장
  // 의존성 배열에 routeHistory를 넣지 않아도 됨!
}, []); // 빈 배열 가능!
```

**로직 설명:**

1. `filter`로 중복 제거 (같은 출발지-도착지 조합)
2. 새 항목을 맨 앞에 추가 (`[{ from, to }, ...filtered]`)
3. 최대 4개까지만 유지 (`.slice(0, 4)`)

**예시:**

```typescript
// 현재 이력: [A→B, C→D, E→F]
addToHistory(G, H);
// 결과: [G→H, A→B, C→D, E→F]

// 현재 이력: [A→B, C→D, E→F, G→H]
addToHistory(I, J);
// 결과: [I→J, A→B, C→D, E→F] (G→H는 제거됨)

// 현재 이력: [A→B, C→D]
addToHistory(A, B); // 중복!
// 결과: [A→B, C→D] (맨 앞으로 이동)
```

#### 3️⃣ 이력 삭제 함수

```typescript
const removeFromHistory = useCallback((item: RouteHistoryItem) => {
  setRouteHistory((prev) =>
    prev.filter((h) => !(h.from.id === item.from.id && h.to.id === item.to.id))
  );
}, []);
```

**로직 설명:**

- `filter`로 해당 항목만 제외
- 출발지 ID와 도착지 ID가 모두 일치하는 항목 제거

**예시:**

```typescript
// 현재 이력: [A→B, C→D, E→F]
removeFromHistory({ from: C, to: D });
// 결과: [A→B, E→F]
```

#### 4️⃣ 이력 선택 함수

```typescript
const selectHistoryItem = useCallback((item: RouteHistoryItem) => {
  setStartStation(item.from);
  setEndStation(item.to);
}, []);
```

**로직 설명:**

- 이력 항목을 클릭하면 출발지와 도착지로 설정
- 자동으로 경로 탐색이 트리거됨

**예시:**

```typescript
// 사용자가 "금융가 → 자연공원" 이력 클릭
selectHistoryItem({ from: 금융가, to: 자연공원 });
// → startStation = 금융가
// → endStation = 자연공원
// → useEffect가 트리거되어 경로 탐색 시작
```

#### 5️⃣ 반환 인터페이스

```typescript
return {
  // 상태
  startStation,
  endStation,
  routeHistory,
  // 상태 변경 함수
  setStartStation,
  setEndStation,
  // 비즈니스 로직 함수
  addToHistory,
  removeFromHistory,
  selectHistoryItem,
};
```

**왜 이렇게 반환하나요?**

- 사용하는 쪽에서 필요한 것만 선택적으로 사용 가능
- 구조 분해 할당으로 깔끔하게 사용

**사용 예:**

```typescript
// 필요한 것만 가져오기
const { startStation, setStartStation } = useRouteState();

// 모두 가져오기
const routeState = useRouteState();
console.log(routeState.startStation);
```

---

## useMetroMap 훅 완전 분석

### 이 훅이 하는 일

`useMetroMap`은 **Leaflet 지도 라이브러리를 React와 통합**하는 복잡한 훅입니다.

**주요 책임:**

1. Leaflet 지도 초기화 및 관리
2. 노선과 역 마커 렌더링
3. 출발지/도착지 하이라이트
4. 노선 필터링 (특정 노선만 표시)
5. 경로 그리기 및 초기화
6. 정보 패널 업데이트

### 전체 구조

```typescript
export function useMetroMap(props: UseMetroMapProps): UseMetroMapReturn {
  // 1. Props 추출
  const { stations, subwayLines, edges, startStation, endStation, selectedLine, ... } = props;

  // 2. Ref 선언 (리렌더링 없이 값 유지)
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());

  // 3. 부수 효과들 (useEffect)
  useEffect(() => { /* 출발지/도착지 하이라이트 */ }, [startStation, endStation]);
  useEffect(() => { /* 노선 필터링 */ }, [selectedLine]);
  useEffect(() => { /* 지도 초기화 */ }, [stations, subwayLines, edges]);

  // 4. 메모이제이션된 함수들
  const drawRoute = useCallback((result) => { ... }, []);
  const clearRoute = useCallback(() => { ... }, []);
  const updateInfoText = useCallback((text) => { ... }, []);

  // 5. 반환
  return { mapContainerRef, drawRoute, clearRoute, updateInfoText };
}
```

### 상세 분석

#### 1️⃣ Ref 선언 - 왜 useState가 아닌 useRef를 사용하나요?

```typescript
const mapRef = useRef<L.Map | null>(null);
const markersRef = useRef<Map<string, L.Marker>>(new Map());
const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
const routeLayerRef = useRef<L.LayerGroup | null>(null);
const arrowLayerRef = useRef<L.LayerGroup | null>(null);
```

**useState vs useRef 비교:**

```typescript
// ❌ useState 사용 시 (문제 발생)
const [map, setMap] = useState<L.Map | null>(null);
const [markers, setMarkers] = useState(new Map());

// 문제 1: 값이 변경되면 리렌더링 발생
setMap(newMap); // → 컴포넌트 리렌더링!

// 문제 2: 리렌더링 시 지도가 깜빡임
// 문제 3: 성능 저하 (불필요한 리렌더링)

// ✅ useRef 사용 시 (해결)
const mapRef = useRef<L.Map | null>(null);
const markersRef = useRef(new Map());

// 해결: 값이 변경되어도 리렌더링 없음
mapRef.current = newMap; // → 리렌더링 없음!

// 장점 1: 지도가 부드럽게 동작
// 장점 2: 성능 향상
// 장점 3: Leaflet 인스턴스를 안전하게 보관
```

**언제 useRef를 사용하나요?**

- DOM 요소 참조
- 외부 라이브러리 인스턴스 (Leaflet, D3 등)
- 리렌더링을 유발하지 않아야 하는 값
- 이전 값을 기억해야 할 때

**언제 useState를 사용하나요?**

- UI에 표시되는 값
- 값이 변경되면 화면도 업데이트되어야 할 때

#### 2️⃣ 출발지/도착지 하이라이트

```typescript
useEffect(() => {
  highlightStationCircles({
    start: startStation?.id,
    end: endStation?.id,
  });
}, [startStation, endStation]);
```

**동작 원리:**

1. `startStation`이나 `endStation`이 변경되면 실행
2. `highlightStationCircles` 함수 호출
3. DOM 조작으로 마커 테두리 색상 변경
   - 출발역: 빨간색 (`#ff3b30`)
   - 도착역: 초록색 (`#00c853`)

**왜 useEffect를 사용하나요?**

- 상태 변경에 반응하는 "부수 효과"
- DOM 조작은 렌더링 후에 실행되어야 함

#### 3️⃣ 노선 필터링

```typescript
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

**동작 원리:**

1. `selectedLine`이 변경되면 실행
2. `null`이면 전체 보기 (모든 opacity 복원)
3. 값이 있으면 해당 노선만 강조
   - 선택된 노선: opacity 0.8 (정상)
   - 나머지 노선: opacity 0.15 (매우 흐림)
   - 선택된 노선의 역: opacity 1 (정상)
   - 나머지 역: opacity 0.2 (흐림)

**왜 Map 자료구조를 사용하나요?**

```typescript
// Map 사용
const markersRef = useRef<Map<string, L.Marker>>(new Map());
markersRef.current.set("S1", marker);
const marker = markersRef.current.get("S1");

// 장점:
// 1. O(1) 시간 복잡도로 빠른 조회
// 2. forEach로 쉬운 순회
// 3. 키-값 쌍 관리가 명확
```

#### 4️⃣ 지도 초기화 (가장 복잡!)

```typescript
useEffect(() => {
  if (!mapContainerRef.current) return;

  // 1. Leaflet 지도 생성
  const map = L.map(mapContainerRef.current, {
    crs: L.CRS.Simple,
    minZoom: 2,
    maxZoom: 5,
    center: [85, 75],
    zoom: 2,
  });
  mapRef.current = map;

  // 2. 타일 레이어 추가 (배경)
  L.tileLayer("data:image/svg+xml;base64,...").addTo(map);

  // 3. 정보 컨트롤 패널 생성
  const infoControl = new L.Control({ position: "topright" });
  infoControl.onAdd = () => {
    const div = L.DomUtil.create("div", "trip-info");
    div.innerHTML = "출발지/도착지를 선택하세요";
    return div;
  };
  infoControl.addTo(map);

  // 4. 노선 Polyline 렌더링
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
          { color: line.color, weight: 8, opacity: 0.8 }
        ).addTo(map);

        // Ref에 저장 (나중에 필터링할 때 사용)
        polylinesRef.current.set(`${line.id}-${idx}`, polyline);
      }
    });
  });

  // 5. 역 마커 생성
  stations.forEach((station) => {
    const marker = L.marker([station.lat, station.lng], {
      icon: createStationLabel(station, color, station.isTransfer),
    }).addTo(map);

    markersRef.current.set(station.id, marker);

    // 팝업 바인딩
    marker.bindPopup(popupHtml);

    // 팝업 이벤트 핸들러
    marker.on("popupopen", (e) => {
      // 출발지/도착지 버튼 클릭 이벤트 등록
    });
  });

  // 6. 클린업 함수 (언마운트 시 정리)
  return () => {
    if (mapRef.current) {
      mapRef.current.remove(); // 지도 인스턴스 제거
    }
    markersRef.current.clear(); // 마커 참조 초기화
  };
}, [stations, subwayLines, edges, onStationSelect, onMapClick]);
```

**왜 의존성 배열에 이렇게 많은 값이 있나요?**

- `stations`, `subwayLines`, `edges`: 데이터가 변경되면 지도 재생성
- `onStationSelect`, `onMapClick`: 이벤트 핸들러가 변경되면 재등록

**클린업 함수의 중요성:**

```typescript
return () => {
  // 메모리 누수 방지!
  if (mapRef.current) {
    mapRef.current.remove(); // Leaflet 인스턴스 제거
  }
  markersRef.current.clear(); // Map 초기화
};
```

**왜 클린업이 필요한가요?**

- Leaflet은 React 외부 라이브러리
- 컴포넌트가 언마운트되어도 Leaflet 인스턴스는 남아있음
- 메모리 누수 발생 → 클린업으로 해결!

#### 5️⃣ 경로 그리기 함수

```typescript
const drawRoute = useCallback((result: PathfindingResult) => {
  if (!mapRef.current) return;

  const map = mapRef.current;
  const { coords, transferStationIds } = result;

  // 1. 경로 레이어 초기화
  if (!routeLayerRef.current) {
    routeLayerRef.current = L.layerGroup().addTo(map);
  } else {
    routeLayerRef.current.clearLayers();
  }

  // 2. 경로 Polyline 그리기
  L.polyline(coords, {
    color: "#ff3b30",
    weight: 10,
    opacity: 0.95,
  }).addTo(routeLayerRef.current);

  // 3. 진행방향 화살표 그리기
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];

    // 각도 계산
    const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const angleDeg = (angleRad * 180) / Math.PI;

    // 화살표 마커 추가
    [0.4, 0.8].forEach((t) => {
      const pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const arrowIcon = L.divIcon({ ... });
      L.marker(pos, { icon: arrowIcon }).addTo(arrowLayerRef.current!);
    });
  }

  // 4. 환승역 하이라이트
  highlightTransferLabels(transferStationIds);
}, []);
```

**왜 레이어 그룹을 사용하나요?**

```typescript
// 레이어 그룹 = 여러 레이어를 묶어서 관리
const routeLayerRef = useRef<L.LayerGroup | null>(null);

// 장점:
// 1. 한 번에 모든 경로 요소 제거 가능
routeLayerRef.current.clearLayers();

// 2. 한 번에 모든 경로 요소 추가/제거
routeLayerRef.current.addTo(map);
routeLayerRef.current.remove();
```

---

## useRef vs useState

### 완전 비교표

| 항목           | useState                 | useRef                   |
| -------------- | ------------------------ | ------------------------ |
| **값 변경 시** | 리렌더링 발생            | 리렌더링 없음            |
| **값 접근**    | `value`                  | `ref.current`            |
| **값 변경**    | `setValue(newValue)`     | `ref.current = newValue` |
| **초기값**     | `useState(initialValue)` | `useRef(initialValue)`   |
| **용도**       | UI에 표시되는 값         | DOM 참조, 인스턴스 저장  |
| **성능**       | 리렌더링 비용            | 리렌더링 없어서 빠름     |

### 실전 예제

```typescript
// 시나리오: 타이머 구현

// ❌ useState 사용 (문제)
const [count, setCount] = useState(0);
const [timerId, setTimerId] = useState<number | null>(null);

useEffect(() => {
  const id = setInterval(() => {
    setCount((c) => c + 1); // 1초마다 리렌더링!
  }, 1000);
  setTimerId(id); // 또 리렌더링!

  return () => clearInterval(timerId!);
}, []);

// 문제: 불필요한 리렌더링 2번 발생

// ✅ useRef 사용 (해결)
const [count, setCount] = useState(0);
const timerIdRef = useRef<number | null>(null);

useEffect(() => {
  timerIdRef.current = setInterval(() => {
    setCount((c) => c + 1); // 1초마다 리렌더링 (필요)
  }, 1000); // timerIdRef 변경은 리렌더링 없음!

  return () => clearInterval(timerIdRef.current!);
}, []);

// 해결: 필요한 리렌더링만 발생
```

---

## 커스텀 훅의 반환 패턴

### 패턴 1: 객체 반환 (추천)

```typescript
function useRouteState() {
  return {
    startStation,
    endStation,
    setStartStation,
    setEndStation,
  };
}

// 사용: 필요한 것만 구조 분해
const { startStation, setStartStation } = useRouteState();

// 장점:
// 1. 이름이 명확함
// 2. 순서 상관없음
// 3. 필요한 것만 선택 가능
```

### 패턴 2: 배열 반환 (useState 스타일)

```typescript
function useToggle(initialValue: boolean) {
  const [value, setValue] = useState(initialValue);
  const toggle = () => setValue((v) => !v);
  return [value, toggle] as const;
}

// 사용: 이름을 자유롭게 지정
const [isOpen, toggleOpen] = useToggle(false);
const [isVisible, toggleVisible] = useToggle(true);

// 장점:
// 1. 이름을 자유롭게 지정 가능
// 2. useState와 비슷한 사용법
```

### 언제 어떤 패턴을 사용하나요?

- **반환값이 2개 이하** → 배열 (useState처럼)
- **반환값이 3개 이상** → 객체 (이름이 명확함)

---

## 실전 사용 전후 비교

### 시나리오: 3개의 컴포넌트에서 경로 이력 기능이 필요

#### ❌ 커스텀 훅 없이

```typescript
// ComponentA.tsx (100줄)
const ComponentA = () => {
  const [routeHistory, setRouteHistory] = useState([]);
  const addToHistory = (from, to) => {
    /* 20줄 */
  };
  const removeFromHistory = (item) => {
    /* 10줄 */
  };
  // ... UI 코드 70줄
};

// ComponentB.tsx (100줄)
const ComponentB = () => {
  const [routeHistory, setRouteHistory] = useState([]);
  const addToHistory = (from, to) => {
    /* 20줄 복사 */
  };
  const removeFromHistory = (item) => {
    /* 10줄 복사 */
  };
  // ... UI 코드 70줄
};

// ComponentC.tsx (100줄)
const ComponentC = () => {
  const [routeHistory, setRouteHistory] = useState([]);
  const addToHistory = (from, to) => {
    /* 20줄 복사 */
  };
  const removeFromHistory = (item) => {
    /* 10줄 복사 */
  };
  // ... UI 코드 70줄
};

// 총 코드: 300줄
// 중복 코드: 90줄 (30%)
// 버그 수정 시: 3곳 모두 수정해야 함
```

#### ✅ 커스텀 훅 사용

```typescript
// hooks/useRouteState.ts (50줄)
export function useRouteState() {
  const [routeHistory, setRouteHistory] = useState([]);
  const addToHistory = useCallback((from, to) => {
    /* 20줄 */
  }, []);
  const removeFromHistory = useCallback((item) => {
    /* 10줄 */
  }, []);
  return { routeHistory, addToHistory, removeFromHistory };
}

// ComponentA.tsx (20줄)
const ComponentA = () => {
  const { routeHistory, addToHistory } = useRouteState();
  // ... UI 코드 15줄
};

// ComponentB.tsx (20줄)
const ComponentB = () => {
  const { routeHistory, addToHistory } = useRouteState();
  // ... UI 코드 15줄
};

// ComponentC.tsx (20줄)
const ComponentC = () => {
  const { routeHistory, addToHistory } = useRouteState();
  // ... UI 코드 15줄
};

// 총 코드: 110줄
// 중복 코드: 0줄 (0%)
// 버그 수정 시: useRouteState.ts 한 곳만 수정
```

### 절약 효과

| 항목            | 커스텀 훅 없이 | 커스텀 훅 사용 | 개선            |
| --------------- | -------------- | -------------- | --------------- |
| **총 코드**     | 300줄          | 110줄          | **63% 감소**    |
| **중복 코드**   | 90줄           | 0줄            | **100% 제거**   |
| **수정 위치**   | 3곳            | 1곳            | **66% 감소**    |
| **버그 발생률** | 높음           | 낮음           | **격리됨**      |
| **테스트**      | 불가능         | 가능           | **독립 테스트** |

---

## 정리: hooks 패키지를 사용하는 이유

### 1. **코드 재사용** 🔄

- 같은 로직을 여러 컴포넌트에서 사용
- 복사-붙여넣기 불필요
- DRY 원칙 (Don't Repeat Yourself)

### 2. **관심사 분리** 🎯

- 로직과 UI를 명확히 분리
- 컴포넌트는 UI에만 집중
- 훅은 로직에만 집중

### 3. **유지보수성** 🛠️

- 버그 수정은 한 곳만
- 기능 추가도 한 곳만
- 영향 범위가 명확

### 4. **테스트 용이성** ✅

- 훅만 독립적으로 테스트
- 컴포넌트 없이도 테스트 가능
- 단위 테스트 작성 쉬움

### 5. **가독성** 📖

- 컴포넌트가 짧고 깔끔
- 복잡한 로직은 훅 안에 숨김
- 코드 의도가 명확

### 6. **성능 최적화** ⚡

- useCallback으로 함수 메모이제이션
- 불필요한 리렌더링 방지
- useRef로 리렌더링 없이 값 유지

### 7. **타입 안정성** 🔒

- 반환 타입이 명확
- IDE 자동완성 지원
- 컴파일 시점에 에러 발견

---

## 결론

**hooks는 React의 "로직 재사용 메커니즘"입니다!**

```
커스텀 훅 = 로직을 담는 상자

┌─────────────────────────────────┐
│   useRouteState                 │
│                                 │
│  상태 + 로직 + 함수             │
│                                 │
│  return { 필요한 것들 }         │
└─────────────────────────────────┘
         ↓
    어디서든 재사용!
```

**핵심 메시지:**

- 로직이 중복되면 → 커스텀 훅으로 만들기
- 컴포넌트가 복잡하면 → 로직을 훅으로 분리
- 테스트가 어려우면 → 훅으로 격리

이제 hooks 패키지의 모든 것을 이해했습니다! 🎉
