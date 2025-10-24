# 🎯 아키텍처 명확화: Components vs Hooks

> "Components는 UI만 담당한다고 했는데, MetroMapContainer는 왜 상태 관리를 하나요?"

좋은 질문입니다! 혼란스러울 수 있는 부분을 명확히 정리하겠습니다.

---

## 📊 핵심 개념: 상태의 종류

상태는 크게 **3가지 종류**로 나뉩니다:

### 1. 전역 상태 (Global State)

- 여러 컴포넌트에서 공유하는 상태
- 예: 사용자 로그인 정보, 테마 설정
- **이 프로젝트에는 없음** (규모가 작아서 불필요)

### 2. 공유 상태 (Shared State)

- 여러 컴포넌트에서 사용하지만 전역은 아닌 상태
- **커스텀 훅으로 관리**
- 예: `useRouteState` (출발지, 도착지, 이력)

### 3. 로컬 상태 (Local State)

- 한 컴포넌트에서만 사용하는 상태
- **컴포넌트 내부에서 직접 관리**
- 예: `selectedStation`, `selectedLine`, `searchValue`

---

## 🔍 실제 코드로 이해하기

### MetroMapContainer.tsx의 상태 분석

```typescript
const MetroMapContainer = () => {
  // ❓ 이것들은 어디서 관리되나요?

  // 1️⃣ 로컬 상태 (이 컴포넌트에서 직접 관리)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  // 👉 이 상태들은 MetroMapContainer와 MetroMap에서만 사용
  // 👉 다른 곳에서 필요 없으므로 여기서 직접 관리

  // 2️⃣ 공유 상태 (커스텀 훅에서 관리)
  const {
    startStation, // 출발역
    endStation, // 도착역
    routeHistory, // 경로 이력
    setStartStation,
    setEndStation,
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  } = useRouteState(); // 👈 hooks/useRouteState.ts에서 관리
  // 👉 이 상태들은 여러 컴포넌트에서 사용 가능
  // 👉 SearchHistoryCard, MetroMap 등에서 접근

  // 3️⃣ 지도 관련 상태 (커스텀 훅에서 관리)
  const {
    mapContainerRef, // 지도 DOM 참조
    drawRoute, // 경로 그리기 함수
    clearRoute, // 경로 지우기 함수
    updateInfoText, // 정보 패널 업데이트 함수
  } = useMetroMap({
    // 👈 hooks/useMetroMap.ts에서 관리
    stations,
    subwayLines,
    edges,
    startStation,
    endStation,
    selectedLine,
    onStationSelect: handleStationSelect,
    onMapClick: handleMapClick,
  });
  // 👉 지도 인스턴스, 마커, 레이어 등은 useMetroMap 내부에서 관리
  // 👉 Leaflet 관련 복잡한 로직을 훅으로 캡슐화

  // ...
};
```

---

## 🎭 역할 분담 명확화

### Components 패키지의 역할

```
Components/
├── MetroMapContainer.tsx  ← "조율자" (Orchestrator)
│   ├── 로컬 UI 상태 관리 (selectedStation, selectedLine)
│   ├── 커스텀 훅 조합 (useRouteState, useMetroMap)
│   ├── 이벤트 핸들러 정의
│   └── 자식 컴포넌트에 props 전달
│
├── MetroMap.tsx           ← "렌더러" (Renderer)
│   ├── UI 렌더링만 담당
│   ├── 로컬 검색 상태 관리 (searchValue)
│   └── 부모로부터 받은 props로 화면 구성
│
└── SearchHistoryCard.tsx  ← "세부 렌더러" (Sub-Renderer)
    ├── 검색/이력 UI 렌더링
    ├── 로컬 선택 상태 관리 (selectedSearchStation)
    └── 부모로부터 받은 props로 동작
```

### Hooks 패키지의 역할

```
hooks/
├── useRouteState.ts       ← "경로 상태 관리자"
│   ├── 출발지/도착지 상태
│   ├── 경로 이력 상태
│   └── 상태 조작 함수들
│
└── useMetroMap.ts         ← "지도 관리자"
    ├── Leaflet 지도 인스턴스
    ├── 마커, 레이어 관리
    └── 지도 조작 함수들
```

---

## 💡 왜 이렇게 나눴나요?

### 시나리오 1: 로컬 상태 (selectedStation)

```typescript
// ❓ selectedStation은 왜 컴포넌트에서 관리하나요?

// 사용처:
// - MetroMapContainer: 상태 저장
// - MetroMap: 선택된 역 정보 카드 표시

// 👉 오직 이 두 컴포넌트에서만 사용
// 👉 다른 곳에서 필요 없음
// 👉 굳이 훅으로 만들 필요 없음
// 👉 컴포넌트에서 직접 관리하는 것이 더 간단
```

### 시나리오 2: 공유 상태 (startStation, endStation)

```typescript
// ❓ startStation/endStation은 왜 훅에서 관리하나요?

// 사용처:
// - MetroMapContainer: 경로 탐색 트리거
// - MetroMap: 정보 표시
// - SearchHistoryCard: 출발지/도착지 설정
// - useMetroMap: 마커 하이라이트

// 👉 여러 곳에서 사용
// 👉 로직이 복잡함 (이력 관리 포함)
// 👉 훅으로 분리하면 재사용 가능
// 👉 테스트하기 쉬움
```

### 시나리오 3: 복잡한 외부 라이브러리 (Leaflet)

```typescript
// ❓ 지도 관련 로직은 왜 훅에서 관리하나요?

// 복잡도:
// - Leaflet 초기화 (100줄)
// - 마커 생성 및 관리 (50줄)
// - 경로 그리기 (80줄)
// - 이벤트 핸들러 등록 (30줄)
// - 클린업 로직 (20줄)

// 👉 컴포넌트에 넣으면 너무 복잡해짐
// 👉 훅으로 분리하면 컴포넌트가 깔끔해짐
// 👉 지도 로직만 독립적으로 수정 가능
```

---

## 📋 결정 기준: 어디에 상태를 둘까?

### 컴포넌트에 직접 두는 경우

```typescript
✅ 한 컴포넌트(또는 부모-자식)에서만 사용
✅ 로직이 간단함 (단순 get/set)
✅ 다른 곳에서 재사용할 일 없음

예시:
- selectedStation (선택된 역 표시용)
- selectedLine (노선 필터링용)
- searchValue (검색어 입력)
- selectedSearchStation (검색 결과 선택)
```

### 커스텀 훅에 두는 경우

```typescript
✅ 여러 컴포넌트에서 사용
✅ 로직이 복잡함 (계산, 변환, 부수효과)
✅ 재사용 가능성이 있음
✅ 독립적으로 테스트하고 싶음

예시:
- startStation, endStation, routeHistory (경로 관련)
- 지도 인스턴스, 마커, 레이어 (Leaflet 관련)
```

---

## 🔄 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│           MetroMapContainer (조율자)                    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 로컬 상태 (여기서 직접 관리)                   │    │
│  │ - selectedStation                              │    │
│  │ - selectedLine                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ useRouteState() 훅 사용                        │    │
│  │ ← startStation, endStation, routeHistory       │    │
│  │ ← setStartStation, addToHistory, ...           │    │
│  └────────────────────────────────────────────────┘    │
│                    ↑                                     │
│                    │ 실제 상태는 훅 내부에 있음          │
│                    ↓                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │ useMetroMap() 훅 사용                          │    │
│  │ ← mapContainerRef, drawRoute, clearRoute       │    │
│  └────────────────────────────────────────────────┘    │
│                    ↑                                     │
│                    │ 지도 인스턴스는 훅 내부에 있음      │
│                    ↓                                     │
└─────────────────────────────────────────────────────────┘
                     │
                     │ props 전달
                     ↓
┌─────────────────────────────────────────────────────────┐
│                MetroMap (렌더러)                        │
│                                                          │
│  - 받은 props로 UI 렌더링                               │
│  - 로컬 검색 상태만 관리 (searchValue)                  │
│  - 이벤트를 부모에게 전달                               │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 핵심 정리

### CODE_REVIEW.md에서 말한 "Components는 UI만 담당"의 의미

```typescript
// ✅ 맞는 이해
Components는 "복잡한 비즈니스 로직"을 직접 구현하지 않습니다.
대신 커스텀 훅을 사용하여 로직을 가져옵니다.

// ❌ 틀린 이해
Components는 "아무 상태도 가지면 안 됩니다."
→ 로컬 UI 상태는 가질 수 있습니다!
```

### 각 패키지의 실제 역할

| 패키지         | 역할                      | 상태 관리      |
| -------------- | ------------------------- | -------------- |
| **Components** | UI 렌더링 + 훅 조합       | 로컬 UI 상태만 |
| **Hooks**      | 재사용 가능한 로직 + 상태 | 공유 상태 관리 |
| **Utils**      | 순수 함수 (계산, 변환)    | 상태 없음      |
| **Data**       | 타입 정의 + 정적 데이터   | 상태 없음      |

---

## 🔍 실전 예시: 새 기능 추가 시 어디에 둘까?

### 예시 1: "즐겨찾기 역" 기능 추가

```typescript
// ❓ 어디에 상태를 둘까요?

// 사용처:
// - 여러 컴포넌트에서 즐겨찾기 목록 표시
// - 즐겨찾기 추가/삭제 기능
// - 로컬 스토리지에 저장

// ✅ 정답: 커스텀 훅 생성
// hooks/useFavoriteStations.ts
export function useFavoriteStations() {
  const [favorites, setFavorites] = useState<Station[]>([]);

  const addFavorite = useCallback((station: Station) => {
    // 로컬 스토리지 저장 로직
  }, []);

  return { favorites, addFavorite, removeFavorite };
}

// 이유:
// - 여러 컴포넌트에서 사용
// - 로컬 스토리지 로직이 복잡
// - 재사용 가능
```

### 예시 2: "지도 줌 레벨" 상태

```typescript
// ❓ 어디에 상태를 둘까요?

// 사용처:
// - MetroMapContainer에서만 사용
// - 단순 get/set

// ✅ 정답: 컴포넌트 로컬 상태
const MetroMapContainer = () => {
  const [zoomLevel, setZoomLevel] = useState(2);
  // ...
};

// 이유:
// - 한 곳에서만 사용
// - 로직이 간단
// - 굳이 훅으로 만들 필요 없음
```

### 예시 3: "경로 비용 계산" 함수

```typescript
// ❓ 어디에 둘까요?

// 특징:
// - 입력 → 출력 (순수 함수)
// - React 상태 사용 안 함
// - 여러 곳에서 재사용

// ✅ 정답: Utils 함수
// utils/routeCalculator.ts
export function calculateRouteCost(stops: number, transfers: number): number {
  return stops * STOP_COST + transfers * TRANSFER_COST;
}

// 이유:
// - 순수 함수 (부수 효과 없음)
// - React와 무관
// - 독립적으로 테스트 가능
```

---

## 🎓 최종 정리

### MetroMapContainer는 무엇인가?

```
MetroMapContainer = 조율자 (Orchestrator)

역할:
1. 커스텀 훅들을 조합 (useRouteState, useMetroMap)
2. 로컬 UI 상태 관리 (selectedStation, selectedLine)
3. 이벤트 핸들러 정의
4. 자식 컴포넌트에 props 전달
5. 경로 탐색 시점 제어 (useEffect)

하지 않는 것:
❌ 복잡한 비즈니스 로직 직접 구현
❌ Dijkstra 알고리즘 직접 작성
❌ Leaflet 지도 직접 조작
❌ 경로 이력 관리 로직 직접 구현

→ 이런 것들은 훅과 유틸 함수에 위임!
```

### Components 패키지의 진짜 의미

```
"Components는 UI만 담당" =
"복잡한 로직을 직접 구현하지 않고,
 훅과 유틸을 조합하여 UI를 구성한다"

✅ 할 수 있는 것:
- 로컬 UI 상태 관리 (selectedStation, searchValue)
- 커스텀 훅 사용 (useRouteState, useMetroMap)
- 이벤트 핸들러 정의
- JSX 렌더링

❌ 하지 않는 것:
- 복잡한 알고리즘 구현
- 외부 라이브러리 직접 조작
- 재사용 가능한 로직 직접 작성
```

---

이제 명확해졌나요?

**핵심은**: Components는 "UI 렌더링 + 훅 조합"을 담당하고, 실제 복잡한 로직과 공유 상태는 Hooks에서 관리합니다. 로컬 UI 상태는 컴포넌트에서 직접 관리해도 괜찮습니다! 🎯
