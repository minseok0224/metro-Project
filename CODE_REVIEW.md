# 지하철 노선도 앱 코드 리뷰 (React 초보자용)

## 📚 목차

1. [프로젝트 구조 개요](#프로젝트-구조-개요)
2. [왜 4개의 패키지로 나눴나요?](#왜-4개의-패키지로-나눴나요)
3. [각 폴더별 상세 설명](#각-폴더별-상세-설명)
4. [주요 개념 설명](#주요-개념-설명)
5. [데이터 흐름](#데이터-흐름)

---

## 프로젝트 구조 개요

```
src/
├── Components/          # UI 컴포넌트들
│   ├── MetroMapContainer.tsx
│   ├── MetroMap.tsx
│   └── SearchHistoryCard.tsx
├── data/               # 데이터 정의
│   ├── types.ts
│   ├── stations.ts
│   ├── subwayLines.ts
│   └── edges.ts
├── hooks/              # 커스텀 훅 (재사용 가능한 로직)
│   ├── useMetroMap.ts
│   └── useRouteState.ts
└── utils/              # 유틸리티 함수들
    ├── constants.ts
    ├── mapHelpers.ts
    └── pathfinding.ts
```

---

## 왜 4개의 패키지로 나눴나요?

### 🔄 리팩토링 전: 하나의 거대한 컴포넌트

원래는 **모든 기능이 하나의 컴포넌트**에 들어있었습니다:

```typescript
// ❌ 리팩토링 전: MetroMap.tsx (1000+ 줄)
const MetroMap = () => {
  // 1. 모든 상태가 한 곳에
  const [stations, setStations] = useState([...]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [map, setMap] = useState(null);

  // 2. 모든 로직이 한 곳에
  const dijkstra = () => { /* 100줄 */ };
  const drawRoute = () => { /* 50줄 */ };
  const createMarker = () => { /* 30줄 */ };

  // 3. 모든 useEffect가 한 곳에
  useEffect(() => { /* 지도 초기화 */ }, []);
  useEffect(() => { /* 경로 탐색 */ }, [startStation, endStation]);
  useEffect(() => { /* 노선 필터링 */ }, [selectedLine]);

  // 4. 거대한 JSX
  return (
    <div>
      {/* 500줄의 UI 코드 */}
    </div>
  );
};
```

**문제점:**

- 🔴 코드가 너무 길어서 읽기 어려움 (1000+ 줄)
- 🔴 어디를 수정해야 할지 찾기 어려움
- 🔴 한 부분을 수정하면 다른 부분이 망가짐
- 🔴 재사용 불가능
- 🔴 테스트 불가능

### ✅ 리팩토링 후: 4개의 패키지로 분리

이제 **각 폴더가 명확한 책임**을 가집니다:

#### 1. **`Components/` - "어떻게 보일까?" (UI만 담당)**

```typescript
// ✅ 리팩토링 후
// MetroMapContainer.tsx (150줄) - 로직 관리
// MetroMap.tsx (200줄) - UI 렌더링
// SearchHistoryCard.tsx (100줄) - 검색/이력 UI
```

**역할:**

- 화면에 무엇을 그릴지만 결정
- 버튼, 카드, 입력창 등 UI 요소 배치
- 사용자 인터랙션 이벤트 전달

**예시:**

```typescript
// 이 컴포넌트는 "보여주기"만 함
<Button onClick={onStationSelect}>출발지</Button>
```

#### 2. **`data/` - "무엇을 보여줄까?" (데이터만 담당)**

```typescript
// ✅ 리팩토링 후
// types.ts - 타입 정의
// stations.ts - 역 데이터 (100개 역)
// subwayLines.ts - 노선 데이터 (4개 노선)
// edges.ts - 연결 데이터 (200개 연결)
```

**역할:**

- 앱에서 사용할 모든 데이터 정의
- 타입으로 데이터 구조 명시
- 나중에 API로 교체하기 쉬움

**예시:**

```typescript
// 역 데이터만 관리
export const stations: Station[] = [
  { id: "S1", name: "금융가", ... },
  { id: "S2", name: "테크밸리", ... },
];
```

#### 3. **`hooks/` - "어떻게 동작할까?" (로직만 담당)**

```typescript
// ✅ 리팩토링 후
// useRouteState.ts (100줄) - 경로 상태 관리
// useMetroMap.ts (300줄) - 지도 관리
```

**역할:**

- 상태 관리 (출발지, 도착지, 이력)
- 복잡한 로직 캡슐화
- 여러 컴포넌트에서 재사용 가능

**예시:**

```typescript
// 경로 상태 로직을 훅으로 분리
const { startStation, setStartStation, routeHistory } = useRouteState();
```

#### 4. **`utils/` - "어떻게 계산할까?" (순수 함수만 담당)**

```typescript
// ✅ 리팩토링 후
// pathfinding.ts (200줄) - Dijkstra 알고리즘
// mapHelpers.ts (150줄) - 지도 헬퍼 함수
// constants.ts (50줄) - 상수 정의
```

**역할:**

- React와 무관한 순수 계산 로직
- 입력 → 출력 (부수 효과 없음)
- 독립적으로 테스트 가능

**예시:**

```typescript
// 최단 경로 계산 (React 없이도 동작)
const result = dijkstraWithTransfers(start, end, stations, edges);
```

---

### 📊 리팩토링 전후 비교

| 항목          | 리팩토링 전                         | 리팩토링 후                 |
| ------------- | ----------------------------------- | --------------------------- |
| **파일 수**   | 1개 (MetroMap.tsx)                  | 11개 (역할별 분리)          |
| **코드 길이** | 1000+ 줄                            | 평균 150줄                  |
| **의존성**    | 모든 것이 서로 의존                 | 명확한 의존성 방향          |
| **재사용성**  | 불가능                              | 훅과 함수 재사용 가능       |
| **테스트**    | 불가능                              | 각 부분 독립 테스트         |
| **수정 시간** | 30분+ (어디인지 찾기 어려움)        | 5분 (정확한 위치 알고 있음) |
| **버그 발생** | 높음 (한 곳 수정 시 다른 곳 망가짐) | 낮음 (격리되어 있음)        |

---

### 🎯 실제 사례: 경로 탐색 기능

#### 리팩토링 전 (모든 것이 한 곳에)

```typescript
const MetroMap = () => {
  // 상태, 로직, UI가 모두 섞여있음
  const [startStation, setStartStation] = useState(null);

  const dijkstra = () => {
    // 100줄의 알고리즘 코드가 컴포넌트 안에...
  };

  useEffect(() => {
    if (startStation && endStation) {
      const result = dijkstra(); // 여기서 직접 호출
      // 지도 그리기 코드도 여기에...
    }
  }, [startStation, endStation]);

  return <div>{/* UI */}</div>;
};
```

#### 리팩토링 후 (역할별 분리)

```typescript
// 1. data/types.ts - 타입 정의
export interface Station { ... }

// 2. hooks/useRouteState.ts - 상태 관리
export function useRouteState() {
  const [startStation, setStartStation] = useState(null);
  return { startStation, setStartStation };
}

// 3. utils/pathfinding.ts - 알고리즘
export function dijkstraWithTransfers(...) {
  // 순수 함수로 분리
}

// 4. hooks/useMetroMap.ts - 지도 로직
export function useMetroMap() {
  const drawRoute = useCallback((result) => {
    // 지도 그리기 로직
  }, []);
  return { drawRoute };
}

// 5. Components/MetroMapContainer.tsx - 조합
const MetroMapContainer = () => {
  const { startStation, endStation } = useRouteState();
  const { drawRoute } = useMetroMap();

  useEffect(() => {
    if (startStation && endStation) {
      const result = dijkstraWithTransfers(...);
      drawRoute(result);
    }
  }, [startStation, endStation]);

  return <MetroMap />;
};
```

**장점:**

- ✅ 각 파일이 짧고 읽기 쉬움
- ✅ `dijkstraWithTransfers`를 다른 곳에서도 사용 가능
- ✅ `useRouteState`를 다른 컴포넌트에서도 사용 가능
- ✅ 알고리즘만 독립적으로 테스트 가능
- ✅ UI 수정 시 알고리즘 코드를 건드리지 않음

---

### 🔗 의존성 관리

#### 리팩토링 전: 순환 의존성

```
MetroMap.tsx
  ↓ ↑ ↓ ↑
모든 것이 서로 의존
(수정 시 예측 불가능)
```

#### 리팩토링 후: 단방향 의존성

```
Components (UI)
    ↓ 사용
hooks (로직)
    ↓ 사용
utils (계산)
    ↓ 사용
data (데이터)
```

**규칙:**

- 위에서 아래로만 의존 (역방향 의존 금지)
- 같은 레벨끼리는 의존하지 않음
- 명확한 의존성 방향으로 예측 가능

---

### 🌐 전역 상태 관리

**이 프로젝트는 전역 상태 관리 라이브러리를 사용하지 않습니다!**

#### 왜 Redux나 Context API를 사용하지 않았나요?

1. **프로젝트 규모가 작음**

   - 컴포넌트 계층이 깊지 않음 (최대 3단계)
   - Props Drilling 문제가 심각하지 않음

2. **커스텀 훅으로 충분**

   - `useRouteState`로 경로 상태 관리
   - `useMetroMap`으로 지도 상태 관리
   - 필요한 곳에서 훅을 호출하면 됨

3. **성능 문제 없음**
   - 불필요한 리렌더링이 발생하지 않음
   - `useCallback`과 `useMemo`로 최적화

#### 상태 관리 구조

```typescript
// 전역 상태 없음! 각 컴포넌트가 필요한 상태만 관리

// MetroMapContainer.tsx
const MetroMapContainer = () => {
  // 로컬 상태
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);

  // 커스텀 훅으로 상태 관리
  const { startStation, endStation, routeHistory } = useRouteState();

  // 자식에게 props로 전달
  return (
    <MetroMap
      selectedStation={selectedStation}
      startStation={startStation}
      // ...
    />
  );
};
```

**장점:**

- ✅ 간단하고 이해하기 쉬움
- ✅ 보일러플레이트 코드 없음
- ✅ 디버깅이 쉬움 (React DevTools로 확인)
- ✅ 번들 크기 작음 (추가 라이브러리 없음)

**만약 프로젝트가 커진다면?**

- 컴포넌트가 10개 이상
- Props를 5단계 이상 전달
- 여러 컴포넌트가 같은 상태를 공유

→ 그때 Redux나 Zustand 도입 고려

---

### 💡 핵심 원칙

1. **한 파일은 한 가지 책임만**

   - `pathfinding.ts`: 경로 계산만
   - `useRouteState.ts`: 경로 상태 관리만
   - `MetroMap.tsx`: UI 렌더링만

2. **재사용 가능한 코드는 분리**

   - 훅: 여러 컴포넌트에서 사용
   - 유틸: 어디서든 import 가능
   - 컴포넌트: 다른 페이지에서도 사용 가능

3. **타입으로 안정성 확보**

   - 모든 함수와 변수에 타입 명시
   - 컴파일 시점에 에러 발견
   - IDE 자동완성 지원

4. **순수 함수로 테스트 용이성 확보**
   - utils의 모든 함수는 순수 함수
   - 같은 입력 → 같은 출력
   - 부수 효과 없음

---

### 🎓 학습 포인트

이 리팩토링을 통해 배울 수 있는 것:

1. **컴포넌트 분리 기법**

   - 컨테이너 vs 프레젠테이셔널
   - 언제 분리해야 하는지

2. **커스텀 훅 활용**

   - 로직 재사용
   - 상태 관리 캡슐화

3. **의존성 관리**

   - 단방향 의존성
   - 순환 의존성 방지

4. **성능 최적화**

   - 메모이제이션
   - 불필요한 리렌더링 방지

5. **코드 구조화**
   - 폴더 구조 설계
   - 파일 네이밍 규칙

---

## 각 폴더별 상세 설명

### 📁 `data/` - 데이터 레이어

#### `types.ts` - 타입 정의

```typescript
// 왜 필요한가요?
// TypeScript는 타입을 명시해야 합니다.
// 모든 타입을 한 곳에 모아두면 일관성을 유지할 수 있습니다.

export interface Station {
  id: string; // 역 고유 ID
  name: string; // 역 이름
  lat: number; // 위도 (지도 좌표)
  lng: number; // 경도 (지도 좌표)
  lines: string[]; // 소속 노선들 (환승역은 여러 개)
  isTransfer: boolean; // 환승역 여부
  description: string; // 역 설명
}
```

**핵심 개념:**

- `interface`: 객체의 "형태"를 정의합니다
- 타입을 정의하면 실수를 방지할 수 있습니다 (예: `name`을 `nmae`로 오타 내면 에러 발생)

#### `stations.ts` - 역 데이터

```typescript
import type { Station } from "./types";

export const stations: Station[] = [
  {
    id: "S1",
    name: "금융가",
    // ...
  },
  // ...
];
```

**왜 분리했나요?**

- 데이터와 타입을 분리하면 데이터만 수정할 때 타입 정의를 건드리지 않아도 됩니다
- 나중에 API에서 데이터를 가져올 때도 타입은 그대로 유지됩니다

#### `edges.ts` - 역 간 연결 정보

```typescript
export const edges: Edge[] = [
  { from: "S1", to: "S2", line: "1", weight: 3 },
  // from: 출발역, to: 도착역, line: 노선, weight: 소요시간
];
```

**그래프 이론:**

- 지하철 노선도는 "그래프"입니다
- 역 = 노드(Node), 연결 = 엣지(Edge)
- 이 구조로 최단 경로를 찾을 수 있습니다

---

### 🎨 `Components/` - UI 레이어

#### `MetroMapContainer.tsx` - 컨테이너 컴포넌트

```typescript
// 역할: 데이터와 로직을 관리하고 자식 컴포넌트에 전달
// "스마트 컴포넌트" 또는 "컨테이너 컴포넌트"라고 부릅니다

const MetroMapContainer = () => {
  // 1. 상태 관리
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // 2. 커스텀 훅 사용
  const { startStation, endStation, ... } = useRouteState();
  const { mapContainerRef, drawRoute, ... } = useMetroMap({...});

  // 3. 이벤트 핸들러 정의
  const handleStationSelect = useCallback(...);

  // 4. 부수 효과 처리 (경로 탐색)
  useEffect(() => {
    if (!startStation || !endStation) return;
    const result = dijkstraWithTransfers(...);
    drawRoute(result);
  }, [startStation, endStation]);

  // 5. UI 렌더링 (자식 컴포넌트에 props 전달)
  return <MetroMap {...props} />;
};
```

**핵심 개념:**

1. **useState**: 컴포넌트의 상태를 관리합니다

   ```typescript
   const [count, setCount] = useState(0);
   // count: 현재 값
   // setCount: 값을 변경하는 함수
   ```

2. **useEffect**: 부수 효과를 처리합니다

   ```typescript
   useEffect(() => {
     // 이 코드는 startStation이나 endStation이 변경될 때마다 실행됩니다
   }, [startStation, endStation]); // 의존성 배열
   ```

3. **useCallback**: 함수를 메모이제이션합니다
   ```typescript
   const handleClick = useCallback(() => {
     // 이 함수는 한 번만 생성되고 재사용됩니다
   }, []); // 빈 배열 = 컴포넌트 생명주기 동안 한 번만 생성
   ```

**왜 메모이제이션이 필요한가요?**

- React는 상태가 변경되면 컴포넌트를 다시 렌더링합니다
- 함수를 매번 새로 만들면 자식 컴포넌트도 불필요하게 다시 렌더링됩니다
- `useCallback`으로 함수를 재사용하면 성능이 향상됩니다

#### `MetroMap.tsx` - 프레젠테이셔널 컴포넌트

```typescript
// 역할: UI만 담당, 로직은 없음
// "덤 컴포넌트" 또는 "프레젠테이셔널 컴포넌트"라고 부릅니다

interface MetroMapProps {
  // props의 타입을 명시합니다
  selectedStation: Station | null;
  onHistoryClick: (item: RouteHistoryItem) => void;
  // ...
}

const MetroMap = ({ selectedStation, onHistoryClick, ... }: MetroMapProps) => {
  // 로컬 상태만 관리 (검색어 등)
  const [searchValue, setSearchValue] = useState("");

  // UI 렌더링
  return (
    <div>
      <SearchHistoryCard {...props} />
      <Card>노선 목록</Card>
      {/* ... */}
    </div>
  );
};
```

**컨테이너 vs 프레젠테이셔널 패턴:**

- **컨테이너**: 데이터와 로직 관리 (뇌)
- **프레젠테이셔널**: UI 렌더링 (얼굴)
- 이렇게 분리하면 UI를 쉽게 재사용하고 테스트할 수 있습니다

---

### 🔧 `hooks/` - 로직 레이어

#### `useRouteState.ts` - 경로 상태 관리 훅

```typescript
// 커스텀 훅: "use"로 시작하는 함수
// 여러 컴포넌트에서 재사용할 수 있는 로직을 캡슐화합니다

export function useRouteState() {
  // 1. 상태 정의
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  // 2. 상태를 조작하는 함수들
  const addToHistory = useCallback((from: Station, to: Station) => {
    setRouteHistory((prev) => {
      // 함수형 업데이트: 이전 상태를 기반으로 새 상태를 계산
      const filtered = prev.filter(...);
      return [{ from, to }, ...filtered].slice(0, 4);
    });
  }, []); // 빈 의존성 = 함수는 한 번만 생성

  // 3. 상태와 함수를 반환
  return {
    startStation,
    setStartStation,
    addToHistory,
    // ...
  };
}
```

**왜 커스텀 훅을 만드나요?**

1. **재사용성**: 여러 컴포넌트에서 같은 로직을 사용할 수 있습니다
2. **가독성**: 복잡한 로직을 숨기고 간단한 인터페이스만 노출합니다
3. **테스트**: 로직을 독립적으로 테스트할 수 있습니다

**함수형 업데이트란?**

```typescript
// ❌ 나쁜 예: 이전 상태를 직접 참조
setCount(count + 1);

// ✅ 좋은 예: 함수로 이전 상태를 받아서 업데이트
setCount((prev) => prev + 1);
```

- 함수형 업데이트는 항상 최신 상태를 보장합니다
- 비동기 업데이트에서 안전합니다

#### `useMetroMap.ts` - 지도 관리 훅

```typescript
export function useMetroMap(props: UseMetroMapProps) {
  // 1. Ref로 DOM 요소와 Leaflet 인스턴스 참조
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // 2. 지도 초기화 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    const map = L.map(mapContainerRef.current, {...});
    mapRef.current = map;

    // 클린업 함수: 컴포넌트 언마운트 시 실행
    return () => {
      map.remove();
    };
  }, [stations, subwayLines, edges]); // 데이터가 변경되면 재초기화

  // 3. 선택된 노선에 따라 필터링
  useEffect(() => {
    if (!selectedLine) {
      // 전체 보기
    } else {
      // 특정 노선만 표시
    }
  }, [selectedLine]);

  // 4. 메모이제이션된 함수들 반환
  const drawRoute = useCallback((result) => {...}, []);

  return { mapContainerRef, drawRoute, clearRoute, updateInfoText };
}
```

**useRef란?**

```typescript
const mapRef = useRef<L.Map | null>(null);
// mapRef.current로 값에 접근
// 값이 변경되어도 리렌더링되지 않습니다
```

**useRef vs useState:**

- `useState`: 값이 변경되면 리렌더링 발생
- `useRef`: 값이 변경되어도 리렌더링 없음 (DOM 요소나 인스턴스 저장용)

**클린업 함수:**

```typescript
useEffect(() => {
  // 설정 코드
  const map = L.map(...);

  // 클린업 함수 반환
  return () => {
    // 정리 코드 (메모리 누수 방지)
    map.remove();
  };
}, []);
```

---

### 🛠️ `utils/` - 유틸리티 레이어

#### `pathfinding.ts` - 경로 탐색 알고리즘

```typescript
// Dijkstra 알고리즘: 최단 경로 찾기
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,
  edgeTransferMin: number
): PathfindingResult | null {
  // 1. 그래프 구조 생성
  const { adj, nodeMeta } = buildGraph(stations, edges);

  // 2. 우선순위 큐로 최단 경로 탐색
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey | null>();

  // 3. 경로 복원
  const path = [];

  // 4. 통계 계산 (정차역, 환승 횟수)

  return { minutes, stops, transfers, coords, ... };
}
```

**Dijkstra 알고리즘이란?**

- 그래프에서 최단 경로를 찾는 알고리즘입니다
- 각 역까지의 최소 비용을 계산합니다
- 우선순위 큐를 사용해 효율적으로 탐색합니다

**왜 utils에 있나요?**

- 순수 함수입니다 (같은 입력 → 같은 출력)
- React와 무관한 로직입니다
- 독립적으로 테스트할 수 있습니다

#### `mapHelpers.ts` - 지도 헬퍼 함수

```typescript
// Leaflet 마커 생성
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean
): L.DivIcon {
  return L.divIcon({
    className: `station-label`,
    html: `<div>...</div>`,
    // ...
  });
}

// DOM 조작 함수들
export function highlightStationCircles(stationIds: {...}) {
  const circles = document.querySelectorAll(...);
  circles.forEach((el) => {
    // 스타일 변경
  });
}
```

**왜 DOM을 직접 조작하나요?**

- Leaflet은 React 외부 라이브러리입니다
- React 상태로 관리하기 어려운 부분은 직접 DOM을 조작합니다
- 성능상 이점이 있습니다 (리렌더링 없이 스타일만 변경)

#### `constants.ts` - 상수 정의

```typescript
// 매직 넘버를 상수로 정의
export const LABEL_GAP = 14;
export const TRANSFER_MARKER_SIZE = 24;

// 설정 객체
export const LABEL_OFFSETS: Record<string, { x?: number; y?: number }> = {
  "비즈니스 파크": { x: 4, y: 8 },
};
```

**왜 상수를 분리하나요?**

- 매직 넘버를 피합니다 (코드에 `14`가 있으면 의미를 알 수 없음)
- 한 곳에서 관리하면 수정이 쉽습니다
- 의미 있는 이름으로 가독성이 향상됩니다

---

## 주요 개념 설명

### 1. Props Drilling 문제와 해결

```typescript
// ❌ Props Drilling: 여러 단계를 거쳐 props 전달
<GrandParent>
  <Parent station={station}>
    <Child station={station}>
      <GrandChild station={station} />
    </Child>
  </Parent>
</GrandParent>;

// ✅ 커스텀 훅으로 해결
function GrandChild() {
  const { station } = useRouteState(); // 직접 접근
}
```

### 2. 단방향 데이터 흐름

```
데이터 흐름:
MetroMapContainer (상태 관리)
    ↓ props
MetroMap (UI 렌더링)
    ↓ props
SearchHistoryCard (세부 UI)

이벤트 흐름:
SearchHistoryCard (사용자 클릭)
    ↑ callback
MetroMap (이벤트 전달)
    ↑ callback
MetroMapContainer (상태 업데이트)
```

### 3. 관심사의 분리 예시

```
사용자가 역을 클릭했을 때:

1. MetroMap.tsx (UI)
   - 클릭 이벤트 감지
   - onStationSelect(station, 'start') 호출

2. MetroMapContainer.tsx (로직)
   - handleStationSelect 실행
   - setStartStation(station) 호출

3. useRouteState.ts (상태)
   - startStation 상태 업데이트

4. useMetroMap.ts (지도)
   - startStation 변경 감지
   - highlightStationCircles 호출

5. mapHelpers.ts (유틸)
   - DOM 조작으로 마커 하이라이트
```

---

## 데이터 흐름

### 경로 탐색 플로우

```
1. 사용자가 출발지/도착지 선택
   ↓
2. MetroMapContainer의 useEffect 트리거
   ↓
3. dijkstraWithTransfers 함수 호출 (utils/pathfinding.ts)
   ↓
4. 최단 경로 계산
   ↓
5. drawRoute 함수 호출 (hooks/useMetroMap.ts)
   ↓
6. 지도에 경로 그리기
   ↓
7. addToHistory로 이력 저장 (hooks/useRouteState.ts)
```

### 노선 필터링 플로우

```
1. 사용자가 노선 버튼 클릭
   ↓
2. highlightLine(lineId) 호출
   ↓
3. selectedLine 상태 업데이트 (토글)
   ↓
4. useMetroMap의 useEffect 트리거
   ↓
5. 선택된 노선만 opacity 조정
   ↓
6. 지도에 필터링 결과 표시
```

---

## 베스트 프랙티스

### 1. 타입 안정성

```typescript
// ✅ 타입을 명시하면 실수를 방지할 수 있습니다
const [station, setStation] = useState<Station | null>(null);

// ❌ any는 피하세요
const [data, setData] = useState<any>(null);
```

### 2. 불변성 유지

```typescript
// ✅ 새 배열/객체를 만들어서 업데이트
setHistory((prev) => [...prev, newItem]);

// ❌ 기존 배열을 직접 수정
history.push(newItem);
setHistory(history);
```

### 3. 의존성 배열 관리

```typescript
// ✅ 사용하는 모든 외부 값을 의존성에 포함
useEffect(() => {
  if (startStation && endStation) {
    findRoute(startStation, endStation);
  }
}, [startStation, endStation, findRoute]);

// ❌ 의존성을 누락하면 버그 발생
useEffect(() => {
  findRoute(startStation, endStation);
}, []); // startStation, endStation 변경 시 실행 안 됨!
```

### 4. 메모이제이션 활용

```typescript
// ✅ 함수를 메모이제이션하여 불필요한 리렌더링 방지
const handleClick = useCallback(() => {
  doSomething();
}, []);

// ✅ 복잡한 계산은 useMemo로 캐싱
const filteredStations = useMemo(() => {
  return stations.filter((s) => s.lines.includes(selectedLine));
}, [stations, selectedLine]);
```

---

## 정리

### 이 구조의 장점

1. **명확한 책임 분리**: 각 파일/폴더가 하나의 역할만 담당
2. **재사용성**: 훅과 유틸 함수를 여러 곳에서 사용 가능
3. **테스트 용이성**: 각 부분을 독립적으로 테스트 가능
4. **확장성**: 새 기능 추가 시 어디에 코드를 넣을지 명확
5. **유지보수성**: 버그 수정이나 리팩토링이 쉬움

### 학습 포인트

- **React Hooks**: useState, useEffect, useCallback, useRef
- **커스텀 훅**: 로직 재사용
- **타입스크립트**: 타입 안정성
- **컴포넌트 패턴**: 컨테이너/프레젠테이셔널
- **상태 관리**: 단방향 데이터 흐름
- **성능 최적화**: 메모이제이션

이 구조는 실무에서 많이 사용되는 패턴입니다. 작은 프로젝트에서는 과할 수 있지만, 프로젝트가 커질수록 이런 구조의 가치가 드러납니다! 🚀
