# 상세 코드 리뷰 - 파일별 분석

## 목차

1. [data/ 폴더](#data-폴더)
2. [Components/ 폴더](#components-폴더)
3. [hooks/ 폴더](#hooks-폴더)
4. [utils/ 폴더](#utils-폴더)

---

## data/ 폴더

이 폴더는 애플리케이션의 "데이터베이스" 역할을 합니다.
실제 프로젝트에서는 API에서 데이터를 가져오지만,
여기서는 하드코딩된 데이터를 사용합니다.

### types.ts - 타입 정의의 중요성

```typescript
export interface Station {
  id: string; // 고유 식별자
  name: string; // 사용자에게 보여줄 이름
  lat: number; // 지도 좌표 (위도)
  lng: number; // 지도 좌표 (경도)
  lines: string[]; // 소속 노선 (배열 = 환승역 가능)
  isTransfer: boolean; // 환승역 여부 (UI에서 다르게 표시)
  description: string; // 추가 정보
}
```

**왜 interface를 사용하나요?**

- TypeScript의 핵심 기능입니다
- 객체의 "계약"을 정의합니다
- 컴파일 시점에 오류를 잡을 수 있습니다

**예시:**

```typescript
// ✅ 올바른 사용
const station: Station = {
  id: "S1",
  name: "금융가",
  lat: 100,
  lng: 50,
  lines: ["1"],
  isTransfer: false,
  description: "금융 중심지",
};

// ❌ 컴파일 에러 발생
const badStation: Station = {
  id: "S1",
  // name이 없음 - 에러!
  lat: "100", // 문자열인데 숫자여야 함 - 에러!
};
```

### stations.ts - 데이터와 타입의 분리

```typescript
import type { Station } from "./types";

export const stations: Station[] = [
  {
    id: "S1",
    name: "금융가",
    lat: 100,
    lng: 50,
    lines: ["1"],
    isTransfer: false,
    description: "도심 금융 중심지",
  },
  // ... 더 많은 역들
];
```

**왜 분리했나요?**

1. **단일 책임 원칙**: types.ts는 타입만, stations.ts는 데이터만
2. **유지보수**: 역 추가/수정 시 타입 정의를 건드리지 않음
3. **확장성**: 나중에 API로 교체하기 쉬움

**실제 사용 예:**

```typescript
// 다른 파일에서 import
import { stations } from "../data/stations";

// 배열 메서드 사용 가능
const transferStations = stations.filter((s) => s.isTransfer);
const station1 = stations.find((s) => s.id === "S1");
```

### edges.ts - 그래프 구조

```typescript
export interface Edge {
  from: string; // 출발역 ID
  to: string; // 도착역 ID
  line: string; // 노선 ID (또는 "1-2" 형태로 환승)
  weight: number; // 소요 시간 (분)
}

export const edges: Edge[] = [
  { from: "S1", to: "S2", line: "1", weight: 3 },
  { from: "S2", to: "S3", line: "1", weight: 4 },
  // 환승 edge
  { from: "S5", to: "S5", line: "1-2", weight: 5 },
];
```

**그래프 이론 기초:**

- **노드(Node)**: 역
- **엣지(Edge)**: 역 사이의 연결
- **가중치(Weight)**: 이동 비용 (여기서는 시간)

**환승 표현:**

```typescript
// 같은 역에서 다른 노선으로 환승
{ from: "S5", to: "S5", line: "1-2", weight: 5 }
// S5역의 1호선 → S5역의 2호선 (환승 시간 5분)
```

---

## Components/ 폴더

React 컴포넌트들이 있는 곳입니다.
컴포넌트는 UI를 구성하는 "블록"입니다.

### MetroMapContainer.tsx - 스마트 컴포넌트

이 컴포넌트는 "뇌" 역할을 합니다. 데이터와 로직을 관리합니다.

```typescript
const MetroMapContainer = () => {
  // 1️⃣ 로컬 상태 (이 컴포넌트에서만 사용)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
```

**useState 이해하기:**

```typescript
const [value, setValue] = useState(initialValue);
//     ↑       ↑              ↑
//   현재값  변경함수      초기값

// 사용 예:
setValue(newValue); // 값 변경
console.log(value); // 현재 값 읽기
```

```typescript
// 2️⃣ 커스텀 훅 사용 (재사용 가능한 로직)
const {
  startStation, // 출발역
  endStation, // 도착역
  routeHistory, // 경로 이력
  setStartStation, // 출발역 설정 함수
  setEndStation, // 도착역 설정 함수
  addToHistory, // 이력 추가 함수
  removeFromHistory, // 이력 삭제 함수
  selectHistoryItem, // 이력 선택 함수
} = useRouteState();
```

**커스텀 훅의 장점:**

- 복잡한 로직을 숨기고 간단한 인터페이스만 노출
- 다른 컴포넌트에서도 재사용 가능
- 테스트하기 쉬움

```typescript
// 3️⃣ 콜백 함수 메모이제이션
const handleStationSelect = useCallback(
  (station: Station, role: "start" | "end") => {
    if (role === "start") {
      setStartStation(station);
    } else {
      setEndStation(station);
    }
  },
  [setStartStation, setEndStation] // 의존성 배열
);
```

**useCallback이 필요한 이유:**

```typescript
// ❌ 메모이제이션 없이
const handleClick = () => { ... };
// 컴포넌트가 리렌더링될 때마다 새 함수 생성
// 자식 컴포넌트도 불필요하게 리렌더링됨

// ✅ 메모이제이션 사용
const handleClick = useCallback(() => { ... }, []);
// 함수가 한 번만 생성되고 재사용됨
// 자식 컴포넌트 리렌더링 방지
```

```typescript
// 4️⃣ 부수 효과 처리 (경로 탐색)
useEffect(() => {
  // 출발지와 도착지가 모두 있을 때만 실행
  if (!startStation || !endStation) return;

  // 최단 경로 계산
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

  // 지도에 경로 그리기
  drawRoute(result);

  // 이력에 추가
  addToHistory(startStation, endStation);

  // 정보 텍스트 업데이트
  updateInfoText(`출발: ${startStation.name} → 도착: ${endStation.name}`);
}, [
  startStation,
  endStation,
  drawRoute,
  clearRoute,
  updateInfoText,
  addToHistory,
]);
//  ↑ 의존성 배열: 이 값들이 변경되면 useEffect 재실행
```

**useEffect 이해하기:**

```typescript
useEffect(() => {
  // 이 코드는 언제 실행되나요?
  // 1. 컴포넌트가 처음 렌더링될 때
  // 2. 의존성 배열의 값이 변경될 때

  return () => {
    // 클린업 함수 (선택사항)
    // 컴포넌트가 언마운트되거나 다음 effect 실행 전에 실행
  };
}, [dependency1, dependency2]);
```

**의존성 배열 패턴:**

```typescript
useEffect(() => { ... }, []);        // 마운트 시 한 번만
useEffect(() => { ... }, [value]);   // value 변경 시마다
useEffect(() => { ... });            // 매 렌더링마다 (비추천)
```

```typescript
  // 5️⃣ JSX 반환 (UI 렌더링)
  return (
    <MetroMap
      mapContainerRef={mapContainerRef}
      selectedStation={selectedStation}
      selectedLine={selectedLine}
      // ... 더 많은 props
      highlightLine={(lineId) => {
        // 토글 로직: 같은 노선 클릭 시 해제
        if (selectedLine === lineId) {
          setSelectedLine(null);
        } else {
          setSelectedLine(lineId);
        }
      }}
    />
  );
};
```

**Props 전달 패턴:**

```typescript
// 방법 1: 개별 전달
<Child prop1={value1} prop2={value2} />

// 방법 2: 스프레드 연산자
const props = { prop1: value1, prop2: value2 };
<Child {...props} />

// 방법 3: 인라인 함수 (간단한 로직)
<Child onClick={() => doSomething()} />

// 방법 4: 메모이제이션된 함수 (복잡한 로직)
const handleClick = useCallback(() => doSomething(), []);
<Child onClick={handleClick} />
```

### MetroMap.tsx - 프레젠테이셔널 컴포넌트

이 컴포넌트는 "얼굴" 역할을 합니다. UI만 담당합니다.

```typescript
interface MetroMapProps {
  // Props 타입 정의 (부모로부터 받을 데이터)
  mapContainerRef: RefObject<HTMLDivElement | null>;
  selectedStation: Station | null;
  selectedLine: string | null;
  subwayLines: SubwayLine[];
  stations: Station[];
  // ... 함수들
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
}

const MetroMap = ({
  mapContainerRef,
  selectedStation,
  selectedLine,
  // ... 구조 분해 할당으로 props 받기
}: MetroMapProps) => {
```

**구조 분해 할당 (Destructuring):**

```typescript
// ❌ props 객체로 받기
const MetroMap = (props: MetroMapProps) => {
  return <div>{props.selectedStation?.name}</div>;
};

// ✅ 구조 분해 할당으로 받기
const MetroMap = ({ selectedStation }: MetroMapProps) => {
  return <div>{selectedStation?.name}</div>;
};
```

```typescript
// 로컬 상태 (이 컴포넌트에서만 사용)
const [searchValue, setSearchValue] = useState("");
const [searchList, setSearchList] = useState<Station[]>([]);

// 검색어 변경 시 필터링
useEffect(() => {
  if (!searchValue) {
    setSearchList([]);
  } else {
    setSearchList(stations.filter((st) => st.name.includes(searchValue)));
  }
}, [searchValue, stations]);
```

**배열 메서드 활용:**

```typescript
// filter: 조건에 맞는 요소만 추출
const filtered = stations.filter((s) => s.isTransfer);

// map: 각 요소를 변환
const names = stations.map((s) => s.name);

// find: 조건에 맞는 첫 번째 요소
const station = stations.find((s) => s.id === "S1");

// some: 조건에 맞는 요소가 하나라도 있는지
const hasTransfer = stations.some((s) => s.isTransfer);
```

```typescript
  return (
    <div style={{ height: "100%", display: "flex", gap: "16px" }}>
      {/* 사이드 패널 */}
      <div style={{ width: "350px" }}>
        <SearchHistoryCard
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          searchList={searchList}
          onSelectAsStart={(station) => {
            setStartStation(station);
          }}
          // ...
        />

        {/* 노선 목록 */}
        <Card title='🚉 지하철 노선'>
          <Space direction='vertical'>
            {subwayLines.map((line) => (
              <Button
                key={line.id}  // ⚠️ key는 필수!
                onClick={(e) => {
                  e.stopPropagation();  // 이벤트 버블링 방지
                  highlightLine(line.id);
                }}
                style={{
                  backgroundColor: selectedLine === line.id ? line.color : "white",
                  color: selectedLine === line.id ? "white" : line.color,
                }}
              >
                {line.name}
              </Button>
            ))}
          </Space>
        </Card>
      </div>

      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} style={{ flex: 1 }} />
    </div>
  );
};
```

**React 렌더링 규칙:**

1. **key prop**: 리스트 렌더링 시 필수

   ```typescript
   {
     items.map((item) => <div key={item.id}>{item.name}</div>);
   }
   ```

2. **이벤트 버블링**: 자식 이벤트가 부모로 전파

   ```typescript
   onClick={(e) => {
     e.stopPropagation();  // 부모로 전파 방지
   }}
   ```

3. **조건부 렌더링**:
   ```typescript
   {
     condition && <Component />;
   } // 조건이 true일 때만
   {
     condition ? <A /> : <B />;
   } // 삼항 연산자
   {
     items.length > 0 && <List />;
   } // 배열이 비어있지 않을 때
   ```

---

## hooks/ 폴더

커스텀 훅은 React의 강력한 기능입니다.
로직을 재사용 가능한 함수로 만들 수 있습니다.

### useRouteState.ts - 상태 관리 훅

```typescript
export function useRouteState(): UseRouteStateReturn {
  // 1️⃣ 상태 선언
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);
```

**useState의 제네릭 타입:**

```typescript
// 타입 명시
const [value, setValue] = useState<string | null>(null);

// 타입 추론 (초기값으로 타입 결정)
const [count, setCount] = useState(0); // number로 추론
const [name, setName] = useState(""); // string으로 추론
```

```typescript
// 2️⃣ 이력 추가 함수
const addToHistory = useCallback((from: Station, to: Station) => {
  setRouteHistory((prev) => {
    // 함수형 업데이트: 이전 상태를 기반으로 새 상태 계산

    // 중복 제거
    const filtered = prev.filter(
      (h) => !(h.from.id === from.id && h.to.id === to.id)
    );

    // 새 항목을 맨 앞에 추가하고 최대 4개까지만 유지
    return [{ from, to }, ...filtered].slice(0, 4);
  });
}, []); // 빈 의존성 = 함수는 한 번만 생성
```

**함수형 업데이트 vs 직접 업데이트:**

```typescript
// ❌ 직접 업데이트 (문제 발생 가능)
const addItem = () => {
  setItems([...items, newItem]); // items는 오래된 값일 수 있음
};

// ✅ 함수형 업데이트 (안전)
const addItem = () => {
  setItems((prev) => [...prev, newItem]); // prev는 항상 최신 값
};
```

**배열 불변성 유지:**

```typescript
// ❌ 원본 배열 수정 (React가 변경을 감지 못함)
items.push(newItem);
setItems(items);

// ✅ 새 배열 생성 (React가 변경 감지)
setItems([...items, newItem]);

// 다른 불변성 패턴들:
setItems([newItem, ...items]); // 앞에 추가
setItems(items.filter((i) => i.id !== id)); // 삭제
setItems(items.map((i) => (i.id === id ? updated : i))); // 수정
```

```typescript
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

  // 5️⃣ 상태와 함수들을 객체로 반환
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
```

**커스텀 훅 사용 예:**

```typescript
// 컴포넌트에서 사용
function MyComponent() {
  const { startStation, setStartStation, addToHistory } = useRouteState();

  // 이제 이 상태와 함수들을 자유롭게 사용
  const handleClick = () => {
    setStartStation(someStation);
  };
}
```

### useMetroMap.ts - 지도 관리 훅

이 훅은 Leaflet 지도 라이브러리를 React와 통합합니다.

```typescript
export function useMetroMap(props: UseMetroMapProps): UseMetroMapReturn {
  const {
    stations,
    subwayLines,
    edges,
    startStation,
    endStation,
    selectedLine,
    onStationSelect,
    onMapClick,
  } = props;

  // 1️⃣ Ref로 DOM 요소와 인스턴스 참조
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
```

**useRef 이해하기:**

```typescript
const ref = useRef(initialValue);

// 특징:
// 1. ref.current로 값에 접근
// 2. 값이 변경되어도 리렌더링 안 됨
// 3. 컴포넌트 생명주기 동안 유지됨

// 사용 예:
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />;
inputRef.current?.focus(); // DOM 요소에 직접 접근
```

**useRef vs useState:**

```typescript
// useState: 값 변경 시 리렌더링
const [count, setCount] = useState(0);
setCount(1); // 리렌더링 발생

// useRef: 값 변경 시 리렌더링 없음
const countRef = useRef(0);
countRef.current = 1; // 리렌더링 없음
```

```typescript
// 2️⃣ 출발지/도착지 변경 시 하이라이트
useEffect(() => {
  highlightStationCircles({
    start: startStation?.id,
    end: endStation?.id,
  });
}, [startStation, endStation]);
```

**옵셔널 체이닝 (?.):**

```typescript
// ❌ 전통적인 방법
const id = startStation ? startStation.id : undefined;

// ✅ 옵셔널 체이닝
const id = startStation?.id;

// 중첩된 경우:
const value = obj?.prop1?.prop2?.prop3;
```

```typescript
// 3️⃣ 선택된 노선에 따라 필터링
useEffect(() => {
  if (!selectedLine) {
    // 전체 보기: 모든 노선과 역 표시
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
        polyline.setStyle({ opacity: 0.8 });
      } else {
        polyline.setStyle({ opacity: 0.15 }); // 흐리게
      }
    });

    markersRef.current.forEach((marker, stationId) => {
      const station = stations.find((s) => s.id === stationId);
      if (station && station.lines.includes(selectedLine)) {
        marker.setOpacity(1);
      } else {
        marker.setOpacity(0.2); // 흐리게
      }
    });
  }
}, [selectedLine, stations]);
```

**Map 자료구조:**

```typescript
// Map: 키-값 쌍을 저장하는 자료구조
const map = new Map<string, number>();

// 추가
map.set("key1", 100);

// 조회
const value = map.get("key1"); // 100

// 삭제
map.delete("key1");

// 순회
map.forEach((value, key) => {
  console.log(key, value);
});

// 크기
console.log(map.size);
```

```typescript
// 4️⃣ 지도 초기화 (마운트 시 한 번만)
useEffect(() => {
  if (!mapContainerRef.current) return;

  // Leaflet 지도 생성
  const map = L.map(mapContainerRef.current, {
    crs: L.CRS.Simple,
    minZoom: 2,
    maxZoom: 5,
    center: [85, 75],
    zoom: 2,
  });

  mapRef.current = map;

  // 노선 그리기
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
          }
        ).addTo(map);

        // Ref에 저장 (나중에 필터링할 때 사용)
        polylinesRef.current.set(`${line.id}-${idx}`, polyline);
      }
    });
  });

  // 역 마커 생성
  stations.forEach((station) => {
    const marker = L.marker([station.lat, station.lng], {
      icon: createStationLabel(station, color, station.isTransfer),
    }).addTo(map);

    markersRef.current.set(station.id, marker);
  });

  // 클린업 함수
  return () => {
    if (mapRef.current) {
      mapRef.current.remove(); // 지도 인스턴스 제거
      mapRef.current = null;
    }
    markersRef.current.clear(); // 마커 참조 초기화
  };
}, [stations, subwayLines, edges, onStationSelect, onMapClick]);
```

**클린업 함수의 중요성:**

```typescript
useEffect(() => {
  // 설정 코드
  const subscription = api.subscribe();
  const timer = setInterval(() => {...}, 1000);

  // 클린업 함수 (메모리 누수 방지)
  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
  };
}, []);
```

**왜 클린업이 필요한가요?**

- 메모리 누수 방지
- 이벤트 리스너 제거
- 타이머 정리
- 외부 라이브러리 인스턴스 제거

```typescript
  // 5️⃣ 경로 그리기 함수 (메모이제이션)
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

    // 경로 Polyline 그리기
    L.polyline(coords, {
      color: "#ff3b30",
      weight: 10,
      opacity: 0.95,
    }).addTo(routeLayerRef.current);

    // 환승역 하이라이트
    highlightTransferLabels(transferStationIds);
  }, []);

  // 6️⃣ 반환값
  return {
    mapContainerRef,
    drawRoute,
    clearRoute,
    updateInfoText,
  };
}
```

**훅의 반환 패턴:**

```typescript
// 패턴 1: 객체 반환 (이름으로 접근)
return { value1, value2, func1 };
const { value1, func1 } = useMyHook();

// 패턴 2: 배열 반환 (순서로 접근)
return [value, setValue];
const [count, setCount] = useState(0);

// 언제 어떤 패턴을 사용하나요?
// - 2개 이하: 배열 (useState처럼)
// - 3개 이상: 객체 (이름이 명확함)
```

---

## utils/ 폴더

순수 함수들이 모여있는 곳입니다.
React와 무관한 로직을 담당합니다.

### pathfinding.ts - 최단 경로 알고리즘

```typescript
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,
  edgeTransferMin: number
): PathfindingResult | null {
```

**Dijkstra 알고리즘 개념:**

1. 시작 노드에서 모든 노드까지의 최단 거리를 계산
2. 우선순위 큐를 사용해 가장 가까운 노드부터 방문
3. 각 노드를 방문하면서 인접 노드의 거리를 업데이트

**시간 복잡도:** O((V + E) log V)

- V: 노드(역) 개수
- E: 엣지(연결) 개수

```typescript
// 1️⃣ 그래프 구조 생성
const { adj, nodeMeta } = buildGraph(stations, edges);

// adj: 인접 리스트 (각 노드의 이웃들)
// nodeMeta: 노드 메타데이터 (역 ID, 노선 ID)
```

**그래프 표현 방법:**

```typescript
// 인접 리스트 (Adjacency List)
const adj = new Map<string, Array<{ to: string; cost: number }>>();

// 예시:
// S1@1 → [{ to: "S2@1", cost: 3 }]
// S2@1 → [{ to: "S1@1", cost: 3 }, { to: "S3@1", cost: 4 }]
```

```typescript
// 2️⃣ 초기화
const dist = new Map<NodeKey, number>(); // 각 노드까지의 최단 거리
const prev = new Map<NodeKey, NodeKey | null>(); // 이전 노드 (경로 복원용)
const pq: Array<{ key: NodeKey; d: number }> = []; // 우선순위 큐

// 시작 노드들 초기화
startNodes.forEach((k) => {
  dist.set(k, 0);
  prev.set(k, null);
  pq.push({ key: k, d: 0 });
});

// 3️⃣ 최단 경로 탐색
while (pq.length) {
  const cur = popMin()!; // 가장 가까운 노드 선택

  if (isGoal(cur.key)) {
    goalKey = cur.key;
    break; // 목적지 도착
  }

  // 인접 노드들 확인
  const edgeList = adj.get(cur.key) || [];
  for (const { to, cost } of edgeList) {
    const nd = cur.d + cost; // 새로운 거리

    // 더 짧은 경로를 찾으면 업데이트
    if (nd < (dist.get(to) ?? Infinity)) {
      dist.set(to, nd);
      prev.set(to, cur.key);
      pq.push({ key: to, d: nd });
    }
  }
}
```

**알고리즘 시각화:**

```
시작: S1@1 (거리 0)

1단계:
  S1@1 → S2@1 (거리 3)
  S1@1 → S3@1 (거리 5)

2단계: S2@1 선택 (거리 3)
  S2@1 → S3@1 (거리 3+2=5, 기존 5와 같음)
  S2@1 → S4@1 (거리 3+4=7)

3단계: S3@1 선택 (거리 5)
  ...
```

```typescript
// 4️⃣ 경로 복원
const rev: NodeKey[] = [];
let t: NodeKey | null = goalKey;

while (t) {
  rev.push(t);
  t = prev.get(t) ?? null; // 이전 노드로 이동
}

const path = rev.reverse(); // 역순으로 뒤집기
```

**경로 복원 과정:**

```
prev Map:
  S3@1 → S2@1
  S2@1 → S1@1
  S1@1 → null

역순 추적:
  S3@1 ← S2@1 ← S1@1 ← null

결과:
  [S1@1, S2@1, S3@1]
```

```typescript
  // 5️⃣ 통계 계산
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

  const minutes = stops * edgeStopMin + transfers * edgeTransferMin;

  return {
    minutes,
    stops,
    transfers,
    coords,
    transferStationIds,
    path,
    nodeMeta,
  };
}
```

### mapHelpers.ts - 지도 헬퍼 함수

```typescript
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean
): L.DivIcon {
  const size = isTransfer ? TRANSFER_MARKER_SIZE : NORMAL_MARKER_SIZE;

  return L.divIcon({
    className: `station-label`,
    html: `
      <div style="...">
        <div style="background-color:${color}; ..."></div>
        <span>${station.name}</span>
      </div>
    `,
    iconSize: [36, 36],
  });
}
```

**Leaflet DivIcon:**

- HTML을 마커로 사용할 수 있게 해줍니다
- CSS로 스타일링 가능
- 동적으로 내용 변경 가능

```typescript
export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void {
  // 모든 마커 초기화
  const ALL_CIRCLES = document.querySelectorAll<HTMLDivElement>(
    ".station-label-root > div"
  );

  ALL_CIRCLES.forEach((el) => {
    el.style.borderColor = "white";
  });

  // 출발역 하이라이트
  if (stationIds.start) {
    const startCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.start}"] > div`
    );
    if (startCircle) {
      startCircle.style.borderColor = "#ff3b30"; // 빨간색
    }
  }

  // 도착역 하이라이트
  if (stationIds.end) {
    const endCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.end}"] > div`
    );
    if (endCircle) {
      endCircle.style.borderColor = "#00c853"; // 초록색
    }
  }
}
```

**DOM 조작:**

```typescript
// querySelector: 첫 번째 요소 선택
const element = document.querySelector(".class-name");

// querySelectorAll: 모든 요소 선택
const elements = document.querySelectorAll(".class-name");

// 스타일 변경
element.style.color = "red";
element.style.backgroundColor = "blue";

// 클래스 추가/제거
element.classList.add("active");
element.classList.remove("inactive");
```

---

## 마무리

### 핵심 개념 정리

1. **컴포넌트 분리**

   - 컨테이너: 로직 관리
   - 프레젠테이셔널: UI 렌더링

2. **커스텀 훅**

   - 로직 재사용
   - 관심사 분리
   - 테스트 용이

3. **상태 관리**

   - useState: 로컬 상태
   - useRef: DOM 참조, 인스턴스 저장
   - 불변성 유지

4. **부수 효과**

   - useEffect: 데이터 페칭, 구독, DOM 조작
   - 클린업: 메모리 누수 방지

5. **성능 최적화**
   - useCallback: 함수 메모이제이션
   - useMemo: 값 메모이제이션
   - 의존성 배열 관리

### 학습 순서 추천

1. **기초**: useState, useEffect
2. **중급**: useCallback, useRef, 커스텀 훅
3. **고급**: 성능 최적화, 복잡한 상태 관리

### 추가 학습 자료

- React 공식 문서: https://react.dev
- TypeScript 핸드북: https://www.typescriptlang.org/docs/
- Leaflet 문서: https://leafletjs.com/

이 구조를 이해하면 실무 프로젝트에서도 충분히 활용할 수 있습니다! 🎉
