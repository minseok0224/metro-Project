# 🗺️ MetroMap.tsx 완전 분석

> "MetroMap.tsx는 왜 따로 분리되어 있고, 정확히 무슨 역할을 하나요?"

---

## 🎯 핵심 요약

**MetroMap.tsx = "화면을 그리는 담당자"**

- 부모(MetroMapContainer)로부터 데이터를 받아서
- 화면에 UI를 그리고
- 사용자 클릭을 부모에게 전달

**비유**: 레스토랑의 웨이터

- 주방(Container)에서 음식(데이터)을 받아서
- 손님(사용자)에게 전달하고
- 손님의 주문(클릭)을 주방에 전달

---

## 📊 MetroMapContainer vs MetroMap 비교

### 역할 분담

```
┌─────────────────────────────────────────────────────┐
│         MetroMapContainer (부모)                    │
│         "뇌" - 생각하고 결정하는 역할                │
│                                                      │
│  ✅ 하는 일:                                         │
│  - 데이터 가져오기 (stations, subwayLines)          │
│  - 커스텀 훅 사용 (useRouteState, useMetroMap)      │
│  - 경로 탐색 로직 실행 (dijkstra)                   │
│  - 상태 관리 (selectedStation, selectedLine)        │
│  - 이벤트 핸들러 정의 (handleStationSelect)         │
│                                                      │
│  ❌ 하지 않는 일:                                    │
│  - UI 그리기 (JSX가 거의 없음)                      │
│  - 스타일 지정                                       │
│                                                      │
└─────────────────────────────────────────────────────┘
                        │
                        │ props 전달
                        ↓
┌─────────────────────────────────────────────────────┐
│              MetroMap (자식)                        │
│              "손" - 그리는 역할                      │
│                                                      │
│  ✅ 하는 일:                                         │
│  - UI 렌더링 (Card, Button, Tag 등)                │
│  - 레이아웃 구성 (사이드패널, 지도 영역)            │
│  - 스타일 지정 (색상, 크기, 간격)                   │
│  - 로컬 검색 상태 관리 (searchValue)                │
│                                                      │
│  ❌ 하지 않는 일:                                    │
│  - 데이터 가져오기                                   │
│  - 복잡한 로직 실행                                  │
│  - 경로 탐색                                         │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 코드로 비교하기

### MetroMapContainer.tsx (부모)

```typescript
const MetroMapContainer = () => {
  // 1️⃣ 데이터 가져오기
  import { stations } from "../data/stations";
  import { subwayLines } from "../data/subwayLines";

  // 2️⃣ 상태 관리
  const [selectedStation, setSelectedStation] = useState(null);
  const { startStation, endStation } = useRouteState();

  // 3️⃣ 복잡한 로직
  useEffect(() => {
    if (!startStation || !endStation) return;
    const result = dijkstraWithTransfers(...); // 경로 탐색
    drawRoute(result);
  }, [startStation, endStation]);

  // 4️⃣ 이벤트 핸들러
  const handleStationSelect = useCallback((station, role) => {
    if (role === "start") {
      setStartStation(station);
    }
  }, []);

  // 5️⃣ 자식에게 모든 것을 전달
  return (
    <MetroMap
      stations={stations}              // 데이터
      selectedStation={selectedStation} // 상태
      onHistoryClick={selectHistoryItem} // 함수
      // ... 15개 이상의 props
    />
  );
};
```

**특징**:

- JSX가 거의 없음 (단 1줄!)
- 로직이 많음 (useEffect, useCallback)
- 데이터와 상태 관리에 집중

### MetroMap.tsx (자식)

```typescript
const MetroMap = ({
  // 1️⃣ 부모로부터 모든 것을 받음
  stations,
  selectedStation,
  onHistoryClick,
  // ... 15개 이상의 props
}) => {
  // 2️⃣ 로컬 검색 상태만 관리
  const [searchValue, setSearchValue] = useState("");

  // 3️⃣ 간단한 검색 로직
  useEffect(() => {
    if (!searchValue) {
      setSearchList([]);
    } else {
      setSearchList(stations.filter(st => st.name.includes(searchValue)));
    }
  }, [searchValue]);

  // 4️⃣ UI 렌더링 (200줄 이상의 JSX!)
  return (
    <div>
      {/* 사이드 패널 */}
      <div>
        <SearchHistoryCard ... />
        <Card title='🚇 노선도'>...</Card>
        <Card title='🚉 지하철 노선'>...</Card>
        <Card title='🔄 주요 환승역'>...</Card>
      </div>

      {/* 지도 영역 */}
      <div ref={mapContainerRef}>...</div>
    </div>
  );
};
```

**특징**:

- JSX가 많음 (200줄 이상!)
- 로직이 적음 (간단한 검색만)
- UI 렌더링에 집중

---

## 🤔 왜 분리했나요?

### 문제 상황: 분리하지 않으면?

```typescript
// ❌ 만약 하나의 컴포넌트에 모두 있다면?
const MetroMapEverything = () => {
  // 1. 데이터 import (10줄)
  import { stations } from ...
  import { subwayLines } from ...

  // 2. 상태 관리 (20줄)
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  // ...

  // 3. 커스텀 훅 (10줄)
  const { startStation, endStation } = useRouteState();
  const { mapContainerRef, drawRoute } = useMetroMap(...);

  // 4. 이벤트 핸들러 (30줄)
  const handleStationSelect = useCallback(...);
  const handleMapClick = useCallback(...);
  // ...

  // 5. useEffect (50줄)
  useEffect(() => { /* 경로 탐색 */ }, [startStation, endStation]);
  useEffect(() => { /* 정보 업데이트 */ }, [startStation, endStation]);
  useEffect(() => { /* 검색 */ }, [searchValue]);

  // 6. UI 렌더링 (200줄)
  return (
    <div>
      {/* 엄청 긴 JSX... */}
    </div>
  );
};

// 총 320줄! 😱
```

**문제점**:

1. 🔴 **너무 길다**: 한 파일에 320줄
2. 🔴 **읽기 어렵다**: 어디가 로직이고 어디가 UI인지 구분 안 됨
3. 🔴 **수정하기 어렵다**: UI 수정하려다가 로직을 건드릴 수 있음
4. 🔴 **재사용 불가**: 다른 곳에서 UI만 재사용할 수 없음
5. 🔴 **테스트 어렵다**: UI와 로직이 섞여있어서 테스트 복잡

### 해결책: 분리!

```typescript
// ✅ 분리 후

// MetroMapContainer.tsx (120줄)
// - 로직만 집중
// - 읽기 쉬움
// - 테스트 쉬움

// MetroMap.tsx (200줄)
// - UI만 집중
// - 읽기 쉬움
// - 재사용 가능
```

---

## 📦 MetroMap.tsx 상세 분석

### 1. Props 인터페이스

```typescript
interface MetroMapProps {
  // 지도 관련
  mapContainerRef: RefObject<HTMLDivElement | null>; // 지도 DOM 참조

  // 선택 상태
  selectedStation: Station | null; // 현재 선택된 역
  selectedLine: string | null; // 현재 선택된 노선

  // 데이터
  subwayLines: SubwayLine[]; // 모든 노선 정보
  transferStations: Station[]; // 환승역 목록
  stations: Station[]; // 모든 역 정보

  // 경로 관련
  startStation: Station | null; // 출발역
  endStation: Station | null; // 도착역
  routeHistory: RouteHistoryItem[]; // 경로 이력

  // 액션 함수들 (부모에게 이벤트 전달)
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}
```

**Props의 종류**:

1. **데이터 Props**: 화면에 표시할 데이터
2. **상태 Props**: 현재 선택된 것들
3. **함수 Props**: 사용자 클릭 시 호출할 함수

### 2. 로컬 상태 (검색 기능)

```typescript
const MetroMap = ({ stations, ... }) => {
  // 로컬 상태: 이 컴포넌트에서만 사용
  const [searchValue, setSearchValue] = useState("");
  const [searchList, setSearchList] = useState<Station[]>([]);

  // 검색 로직
  useEffect(() => {
    if (!searchValue) {
      setSearchList([]);
    } else {
      // 역 이름으로 필터링
      setSearchList(stations.filter(st => st.name.includes(searchValue)));
    }
  }, [searchValue, stations]);

  // ...
};
```

**왜 로컬 상태인가?**:

- `searchValue`는 MetroMap에서만 사용
- 부모(Container)는 검색어를 알 필요 없음
- 검색 결과도 MetroMap에서만 표시
- → 굳이 부모에 올릴 필요 없음!

### 3. UI 구조

```
┌─────────────────────────────────────────────────────┐
│                   MetroMap                          │
│  ┌────────────────┐  ┌─────────────────────────┐   │
│  │  사이드 패널   │  │     지도 영역           │   │
│  │  (350px 고정)  │  │     (flex: 1)           │   │
│  │                │  │                         │   │
│  │ ┌────────────┐ │  │  ┌─────────────────┐   │   │
│  │ │ 검색 & 이력│ │  │  │   Leaflet Map   │   │   │
│  │ └────────────┘ │  │  │                 │   │   │
│  │                │  │  │                 │   │   │
│  │ ┌────────────┐ │  │  └─────────────────┘   │   │
│  │ │ 컨트롤     │ │  │                         │   │
│  │ └────────────┘ │  │  ┌─────────────────┐   │   │
│  │                │  │  │     범례        │   │   │
│  │ ┌────────────┐ │  │  └─────────────────┘   │   │
│  │ │ 노선 목록  │ │  │                         │   │
│  │ │ (스크롤)   │ │  │                         │   │
│  │ └────────────┘ │  │                         │   │
│  │                │  │                         │   │
│  │ ┌────────────┐ │  │                         │   │
│  │ │ 환승역     │ │  │                         │   │
│  │ └────────────┘ │  │                         │   │
│  │                │  │                         │   │
│  │ ┌────────────┐ │  │                         │   │
│  │ │ 역 정보    │ │  │                         │   │
│  │ └────────────┘ │  │                         │   │
│  └────────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4. 주요 UI 섹션

#### 섹션 1: 검색 & 이력 (SearchHistoryCard)

```typescript
<SearchHistoryCard
  searchValue={searchValue}
  setSearchValue={setSearchValue}
  searchList={searchList}
  onSearchSelect={(station) => {
    zoomToStation(station); // 부모 함수 호출
  }}
  onSelectAsStart={(station) => {
    setStartStation(station); // 부모 함수 호출
  }}
  onSelectAsEnd={(station) => {
    setEndStation(station); // 부모 함수 호출
  }}
  routeHistory={routeHistory}
  onHistoryClick={onHistoryClick}
  onRemoveHistory={onRemoveHistory}
/>
```

**역할**:

- 역 검색 기능
- 검색 결과 표시
- 경로 이력 표시
- 출발지/도착지 선택

**데이터 흐름**:

```
사용자가 검색어 입력
  ↓
setSearchValue(검색어)
  ↓
useEffect 실행
  ↓
searchList 업데이트
  ↓
SearchHistoryCard에 전달
  ↓
검색 결과 표시
```

#### 섹션 2: 노선 목록

```typescript
<Card title='🚉 지하철 노선'>
  {subwayLines.map((line) => (
    <Button
      key={line.id}
      type={selectedLine === line.id ? "primary" : "default"}
      onClick={(e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        highlightLine(line.id); // 부모 함수 호출
      }}
      style={{
        borderColor: line.color,
        backgroundColor: selectedLine === line.id ? line.color : "white",
        color: selectedLine === line.id ? "white" : line.color,
      }}
    >
      <strong>{line.name}</strong>
      <br />
      <small>
        {stations.filter((st) => st.lines.includes(line.id)).length}개 역 운행
      </small>
    </Button>
  ))}
</Card>
```

**특징**:

- 동적 스타일링: 선택된 노선은 해당 색상으로 배경 변경
- 역 개수 계산: `filter`로 실시간 계산
- 이벤트 버블링 방지: `e.stopPropagation()`

**데이터 흐름**:

```
사용자가 노선 버튼 클릭
  ↓
highlightLine(line.id) 호출
  ↓
부모(Container)의 함수 실행
  ↓
selectedLine 상태 변경
  ↓
MetroMap 리렌더링
  ↓
버튼 스타일 변경 (선택된 노선 강조)
```

#### 섹션 3: 환승역 목록

```typescript
<Card title='🔄 주요 환승역'>
  {transferStations.map((station) => (
    <Button
      key={station.id}
      type={selectedStation?.id === station.id ? "primary" : "default"}
      onClick={(e) => {
        e.stopPropagation();
        zoomToStation(station); // 부모 함수 호출
      }}
    >
      <strong>{station.name}</strong>
      <br />
      <div>
        {station.lines.map((lineId) => {
          const line = subwayLines.find((l) => l.id === lineId);
          return line ? (
            <Tag key={lineId} color={line.color}>
              {line.name}
            </Tag>
          ) : null;
        })}
      </div>
    </Button>
  ))}
</Card>
```

**특징**:

- 환승 가능 노선 표시: 각 역의 모든 노선을 Tag로 표시
- 색상 코딩: 노선별 고유 색상
- 선택 상태 표시: 현재 선택된 역은 primary 스타일

#### 섹션 4: 선택된 역 정보

```typescript
{
  selectedStation && (
    <Card title='ℹ️ 역 정보'>
      <Title level={4}>{selectedStation.name}</Title>

      {/* 노선 태그 */}
      <div>
        {selectedStation.lines.map((lineId) => {
          const line = subwayLines.find((l) => l.id === lineId);
          return line ? (
            <Tag key={lineId} color={line.color}>
              {line.name}
            </Tag>
          ) : null;
        })}
      </div>

      {/* 환승역 표시 */}
      {selectedStation.isTransfer && <Tag color='red'>환승역</Tag>}

      {/* 역 설명 */}
      <Text>{selectedStation.description}</Text>

      {/* 좌표 정보 */}
      <Text type='secondary'>
        좌표: ({selectedStation.lat}, {selectedStation.lng})
      </Text>
    </Card>
  );
}
```

**특징**:

- 조건부 렌더링: `selectedStation`이 있을 때만 표시
- 상세 정보 제공: 이름, 노선, 환승 여부, 설명, 좌표

---

## 🔄 데이터 흐름 예시

### 예시 1: 노선 선택

```
[사용자가 "2호선" 버튼 클릭]

1. MetroMap.tsx
   onClick={() => highlightLine("2")}
   ↓

2. MetroMapContainer.tsx
   highlightLine 함수 실행
   ↓
   if (selectedLine === "2") {
     setSelectedLine(null);  // 토글: 같은 노선 클릭 시 해제
   } else {
     setSelectedLine("2");
   }
   ↓

3. selectedLine 상태 변경
   ↓

4. MetroMap 리렌더링
   props.selectedLine = "2"
   ↓

5. 버튼 스타일 변경
   type={selectedLine === "2" ? "primary" : "default"}
   backgroundColor: line.color (초록색)
   ↓

6. useMetroMap 훅에서 감지
   useEffect(() => {
     // 2호선만 opacity 0.8
     // 다른 노선은 opacity 0.15
   }, [selectedLine]);
   ↓

7. 지도에서 2호선만 강조 표시
```

### 예시 2: 출발지 선택

```
[사용자가 검색에서 "강남역" 선택 후 "출발지" 버튼 클릭]

1. SearchHistoryCard.tsx
   onClick={() => onSelectAsStart(강남역)}
   ↓

2. MetroMap.tsx
   onSelectAsStart={(station) => {
     setStartStation(station);  // 부모 함수 호출
   }}
   ↓

3. MetroMapContainer.tsx
   setStartStation(강남역)  // useRouteState 훅의 함수
   ↓

4. useRouteState 훅
   startStation 상태 변경
   ↓

5. MetroMapContainer의 useEffect 트리거
   useEffect(() => {
     if (!startStation || !endStation) return;
     // 아직 endStation이 없으므로 return
   }, [startStation, endStation]);
   ↓

6. 정보 텍스트 업데이트
   updateInfoText("출발지: 강남역 선택됨 — 도착지를 선택하세요")
```

---

## 💡 왜 이렇게 분리하면 좋은가?

### 1. 관심사의 분리 (Separation of Concerns)

```typescript
// MetroMapContainer: "무엇을" 할지 결정
const result = dijkstraWithTransfers(startStation, endStation, ...);
drawRoute(result);

// MetroMap: "어떻게" 보여줄지 결정
<Button style={{ backgroundColor: line.color }}>
  {line.name}
</Button>
```

### 2. 재사용성

```typescript
// MetroMap은 다른 곳에서도 사용 가능!

// 페이지 1: 전체 기능
<MetroMapContainer />

// 페이지 2: UI만 표시 (로직 없이)
<MetroMap
  stations={mockStations}
  selectedStation={null}
  onHistoryClick={() => {}}
  // ...
/>
```

### 3. 테스트 용이성

```typescript
// MetroMap 테스트: UI만 테스트
test('노선 버튼 클릭 시 함수 호출', () => {
  const mockHighlightLine = jest.fn();
  render(<MetroMap highlightLine={mockHighlightLine} ... />);

  fireEvent.click(screen.getByText('2호선'));
  expect(mockHighlightLine).toHaveBeenCalledWith('2');
});

// MetroMapContainer 테스트: 로직만 테스트
test('출발지와 도착지 선택 시 경로 탐색', () => {
  // 로직 테스트...
});
```

### 4. 유지보수성

```typescript
// UI 수정: MetroMap.tsx만 수정
// - 버튼 색상 변경
// - 레이아웃 조정
// - 스타일 수정
// → 로직 코드를 건드리지 않음!

// 로직 수정: MetroMapContainer.tsx만 수정
// - 경로 탐색 알고리즘 변경
// - 상태 관리 방식 변경
// - API 연동
// → UI 코드를 건드리지 않음!
```

### 5. 코드 가독성

```typescript
// ✅ 분리 후: 각 파일이 짧고 명확
// MetroMapContainer.tsx (120줄) - 로직만
// MetroMap.tsx (200줄) - UI만

// ❌ 분리 전: 하나의 거대한 파일
// MetroMapEverything.tsx (320줄) - 로직 + UI 섞임
```

---

## 🎯 핵심 정리

### MetroMap.tsx의 역할

```
1. Props 받기
   - 부모로부터 데이터, 상태, 함수를 받음

2. 로컬 상태 관리
   - 검색어 (searchValue)
   - 검색 결과 (searchList)

3. UI 렌더링
   - 사이드 패널 (검색, 노선, 환승역, 역 정보)
   - 지도 영역 (Leaflet 컨테이너)
   - 범례

4. 이벤트 전달
   - 사용자 클릭 → 부모 함수 호출
```

### 왜 분리했나?

```
✅ 관심사 분리: 로직과 UI 분리
✅ 재사용성: MetroMap을 다른 곳에서도 사용 가능
✅ 테스트 용이성: UI와 로직을 독립적으로 테스트
✅ 유지보수성: UI 수정 시 로직 안 건드림
✅ 가독성: 각 파일이 짧고 명확
```

### 비유

```
MetroMapContainer = 레스토랑 주방
- 재료 준비 (데이터)
- 요리 (로직)
- 레시피 결정 (상태 관리)

MetroMap = 레스토랑 홀
- 음식 서빙 (UI 렌더링)
- 손님 응대 (이벤트 처리)
- 테이블 세팅 (레이아웃)

주방과 홀을 분리하면:
- 주방은 요리에만 집중
- 홀은 서비스에만 집중
- 서로 방해하지 않음
- 각자의 역할이 명확
```

---

이제 MetroMap.tsx가 왜 분리되어 있고, 무슨 역할을 하는지 명확해졌나요? 🎯
