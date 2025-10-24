# 🎨 주요 컴포넌트 정리

---

## 📦 Components 패키지 구조

```
Components/
├── MetroMapContainer.tsx  ← 컨테이너 (훅 조합 + 로직)
├── MetroMap.tsx           ← 프레젠테이셔널 (UI 렌더링)
└── SearchHistoryCard.tsx  ← 프레젠테이셔널 (검색 + 이력 UI)
```

---

## 1️⃣ MetroMapContainer.tsx

**역할**: 컨테이너 컴포넌트로 훅을 조합하여 관리

### 주요 책임

#### 1. 로컬 상태 관리 (선택된 역, 노선)

```typescript
const [selectedStation, setSelectedStation] = useState<Station | null>(null);
const [selectedLine, setSelectedLine] = useState<string | null>(null);
```

- `selectedStation`: 현재 선택된 역 (역 정보 카드 표시용)
- `selectedLine`: 현재 선택된 노선 (노선 필터링용)
- **로컬 상태인 이유**: 이 컴포넌트와 자식에서만 사용

#### 2. 커스텀 훅 사용

```typescript
// 경로 상태 관리 훅
const {
  startStation, // 출발역
  endStation, // 도착역
  routeHistory, // 경로 이력 (최대 4개)
  setStartStation,
  setEndStation,
  addToHistory,
  removeFromHistory,
  selectHistoryItem,
} = useRouteState();

// 지도 관리 훅
const {
  mapContainerRef, // 지도 DOM 참조
  drawRoute, // 경로 그리기
  clearRoute, // 경로 지우기
  updateInfoText, // 정보 패널 업데이트
} = useMetroMap({
  stations,
  subwayLines,
  edges,
  startStation,
  endStation,
  selectedLine,
  onStationSelect: handleStationSelect,
  onMapClick: handleMapClick,
});
```

**커스텀 훅의 이점**:

- ✅ **재사용성**: 다른 컴포넌트에서도 사용 가능
- ✅ **유지보수성**: 로직이 한 곳에 모여있어 수정 용이
- ✅ **테스트 용이성**: 훅만 독립적으로 테스트 가능
- ✅ **관심사 분리**: 컴포넌트는 UI에만 집중

#### 3. 훅에서 받은 데이터를 자식에게 props로 전달

```typescript
return (
  <MetroMap
    // 지도 관련
    mapContainerRef={mapContainerRef}
    // 선택 상태
    selectedStation={selectedStation}
    selectedLine={selectedLine}
    // 데이터
    stations={stations}
    subwayLines={subwayLines}
    // 경로 상태 (useRouteState에서 받음)
    startStation={startStation}
    endStation={endStation}
    routeHistory={routeHistory}
    // 액션 함수들
    setStartStation={setStartStation}
    setEndStation={setEndStation}
    onHistoryClick={selectHistoryItem}
    // ...
  />
);
```

#### 4. useEffect로 경로 탐색 시점 제어

```typescript
useEffect(() => {
  // 조건 체크: 출발지와 도착지가 모두 있을 때만 실행
  if (!startStation || !endStation) return;

  // 경로 탐색 실행
  const result = dijkstraWithTransfers(
    startStation,
    endStation,
    stations,
    edges,
    EDGE_STOP_MIN,
    EDGE_TRANSFER_MIN
  );

  // 결과 처리
  if (!result) {
    updateInfoText("경로를 찾지 못했습니다.");
    clearRoute();
    return;
  }

  // 경로 그리기
  drawRoute(result);

  // 이력에 추가
  addToHistory(startStation, endStation);
}, [startStation, endStation]); // 의존성: 이 값들이 변경될 때만 실행
```

**useEffect 내부에서 출발지 및 도착지 선정 여부 체크**:

- `if (!startStation || !endStation) return;`
- 둘 중 하나라도 없으면 경로 탐색 안 함
- 둘 다 있을 때만 자동으로 경로 탐색 실행

---

## 2️⃣ MetroMap.tsx

**역할**: UI 렌더링과 사용자 인터랙션을 담당하는 프레젠테이셔널 컴포넌트

### 주요 책임

#### 1. Props 받기 (부모로부터 모든 것을 받음)

```typescript
interface MetroMapProps {
  // 지도 관련
  mapContainerRef: RefObject<HTMLDivElement | null>;

  // 선택 상태
  selectedStation: Station | null;
  selectedLine: string | null;

  // 데이터
  subwayLines: SubwayLine[];
  transferStations: Station[];
  stations: Station[];

  // 경로 상태
  startStation: Station | null;
  endStation: Station | null;
  routeHistory: RouteHistoryItem[];

  // 액션 함수들 (15개 이상의 props)
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}
```

#### 2. 로컬 검색 상태 관리 (이 컴포넌트에서만 사용)

```typescript
const [searchValue, setSearchValue] = useState("");
const [searchList, setSearchList] = useState<Station[]>([]);

// 검색 로직: searchValue가 변경될 때마다 필터링
useEffect(() => {
  if (!searchValue) {
    setSearchList([]);
  } else {
    setSearchList(stations.filter((st) => st.name.includes(searchValue)));
  }
}, [searchValue, stations]);
```

**왜 로컬 상태인가?**:

- 검색어는 MetroMap에서만 사용
- 부모(Container)는 검색어를 알 필요 없음
- 검색 결과도 MetroMap에서만 표시

#### 3. UI 구조 (레이아웃)

```
┌─────────────────────────────────────────────────┐
│              MetroMap 전체 레이아웃             │
│  ┌──────────────┐  ┌─────────────────────┐     │
│  │ 사이드 패널  │  │    지도 영역        │     │
│  │ (350px 고정) │  │    (flex: 1)        │     │
│  │              │  │                     │     │
│  │ ┌──────────┐ │  │  ┌───────────────┐ │     │
│  │ │검색&이력 │ │  │  │ Leaflet Map   │ │     │
│  │ └──────────┘ │  │  └───────────────┘ │     │
│  │              │  │                     │     │
│  │ ┌──────────┐ │  │  ┌───────────────┐ │     │
│  │ │컨트롤    │ │  │  │    범례       │ │     │
│  │ └──────────┘ │  │  └───────────────┘ │     │
│  │              │  │                     │     │
│  │ ┌──────────┐ │  │                     │     │
│  │ │노선 목록 │ │  │                     │     │
│  │ │(스크롤)  │ │  │                     │     │
│  │ └──────────┘ │  │                     │     │
│  │              │  │                     │     │
│  │ ┌──────────┐ │  │                     │     │
│  │ │환승역    │ │  │                     │     │
│  │ └──────────┘ │  │                     │     │
│  │              │  │                     │     │
│  │ ┌──────────┐ │  │                     │     │
│  │ │역 정보   │ │  │                     │     │
│  │ └──────────┘ │  │                     │     │
│  └──────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────┘
```

#### 4. 주요 UI 섹션

**섹션 1: 검색 & 이력 (SearchHistoryCard)**

```typescript
<SearchHistoryCard
  searchValue={searchValue}
  setSearchValue={setSearchValue}
  searchList={searchList}
  onSelectAsStart={(station) => setStartStation(station)} // 부모 함수 호출
  onSelectAsEnd={(station) => setEndStation(station)} // 부모 함수 호출
  routeHistory={routeHistory}
  onHistoryClick={onHistoryClick}
  onRemoveHistory={onRemoveHistory}
/>
```

**섹션 2: 노선 목록**

```typescript
<Card title='🚉 지하철 노선'>
  {subwayLines.map((line) => (
    <Button
      key={line.id}
      type={selectedLine === line.id ? "primary" : "default"}
      onClick={() => highlightLine(line.id)} // 부모 함수 호출
      style={{
        backgroundColor: selectedLine === line.id ? line.color : "white",
        color: selectedLine === line.id ? "white" : line.color,
      }}
    >
      {line.name}
    </Button>
  ))}
</Card>
```

- **동적 스타일링**: 선택된 노선은 해당 색상으로 배경 변경
- **이벤트 전달**: 클릭 시 부모의 `highlightLine` 함수 호출

**섹션 3: 환승역 목록**

```typescript
<Card title='🔄 주요 환승역'>
  {transferStations.map((station) => (
    <Button
      key={station.id}
      type={selectedStation?.id === station.id ? "primary" : "default"}
      onClick={() => zoomToStation(station)} // 부모 함수 호출
    >
      <strong>{station.name}</strong>
      {/* 환승 가능 노선 표시 */}
      {station.lines.map((lineId) => (
        <Tag key={lineId} color={line.color}>
          {line.name}
        </Tag>
      ))}
    </Button>
  ))}
</Card>
```

**섹션 4: 선택된 역 정보 (조건부 렌더링)**

```typescript
{
  selectedStation && (
    <Card title='ℹ️ 역 정보'>
      <Title>{selectedStation.name}</Title>

      {/* 노선 태그 */}
      {selectedStation.lines.map((lineId) => (
        <Tag key={lineId} color={line.color}>
          {line.name}
        </Tag>
      ))}

      {/* 환승역 표시 */}
      {selectedStation.isTransfer && <Tag color='red'>환승역</Tag>}

      <Text>{selectedStation.description}</Text>
    </Card>
  );
}
```

#### 5. 이벤트 처리 패턴

```typescript
// 패턴 1: 직접 호출
<Button onClick={resetView}>전체 보기</Button>

// 패턴 2: 인자 전달
<Button onClick={() => highlightLine(line.id)}>
  {line.name}
</Button>

// 패턴 3: 이벤트 버블링 방지
<Button onClick={(e) => {
  e.stopPropagation();  // 부모 요소의 onClick 방지
  highlightLine(line.id);
}}>
  {line.name}
</Button>
```

### 핵심 특징

```typescript
✅ 하는 일:
- Props로 받은 데이터를 화면에 렌더링
- 사용자 클릭을 부모 함수로 전달
- 로컬 검색 상태 관리 (searchValue)
- 조건부 렌더링 (selectedStation && ...)
- 동적 스타일링 (선택된 노선 강조)

❌ 하지 않는 일:
- 데이터 가져오기 (import stations)
- 복잡한 로직 실행 (경로 탐색)
- 커스텀 훅 사용
- 상태 직접 관리 (selectedStation은 props로 받음)
```

---

## 3️⃣ SearchHistoryCard.tsx

**역할**: 검색 기능과 경로 이력을 통합 관리하는 독립적인 카드 컴포넌트

### 주요 책임

#### 1. Props 받기

```typescript
interface SearchHistoryCardProps {
  // 검색 상태 (부모로부터 받음)
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchList: Station[];

  // 검색 액션
  onSearchSelect: (station: Station) => void;
  onSelectAsStart: (station: Station) => void;
  onSelectAsEnd: (station: Station) => void;

  // 이력 관련
  routeHistory: RouteHistoryItem[];
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}
```

#### 2. 로컬 상태 (선택된 검색 역)

```typescript
const [selectedSearchStation, setSelectedSearchStation] =
  React.useState<Station | null>(null);

// 검색어가 바뀌면 선택 초기화
React.useEffect(() => {
  setSelectedSearchStation(null);
}, [searchValue]);
```

**2단계 선택 프로세스**:

1. 검색 결과에서 역 선택 → `selectedSearchStation` 설정
2. "출발지" 또는 "도착지" 버튼 클릭 → 부모 함수 호출

#### 3. UI 구조

**UI 흐름**:

```
1. 검색 입력창
   ↓
2. 자동완성 목록 (검색어가 있고 역이 선택 안 됐을 때)
   ↓
3. 선택된 역 미니 카드 (역이 선택됐을 때)
   - 역 이름, 노선, 설명
   - 출발지/도착지 선택 버튼
   ↓
4. 최근 경로 이력 (이력이 있을 때)
```

#### 4. 주요 기능

**기능 1: 검색 입력**

```typescript
<Input
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  onPressEnter={() => {
    if (searchList.length > 0) {
      setSelectedSearchStation(searchList[0]); // 첫 번째 결과 선택
    }
  }}
  placeholder='역, 버스, 도로 검색'
  allowClear
  prefix={<SearchOutlined />}
/>
```

- **Enter 키 지원**: 첫 번째 검색 결과 자동 선택
- **빠른 초기화**: `allowClear`로 X 버튼 제공

**기능 2: 자동완성 목록**

```typescript
{
  searchValue && !selectedSearchStation && (
    <div>
      {searchList.length === 0 ? (
        <div>검색 결과 없음</div>
      ) : (
        searchList.map((station) => (
          <div onClick={() => setSelectedSearchStation(station)}>
            {station.name}
            {station.isTransfer && <span>(환승)</span>}
          </div>
        ))
      )}
    </div>
  );
}
```

- **조건부 렌더링**: 검색어가 있고 역이 선택 안 됐을 때만 표시
- **환승역 표시**: 환승 가능한 역은 빨간색으로 강조

**기능 3: 선택된 역 미니 카드**

```typescript
{
  selectedSearchStation && (
    <div>
      {/* 역 이름 */}
      <div>{selectedSearchStation.name}</div>

      {/* 노선 태그 */}
      {selectedSearchStation.lines.map((lineId) => (
        <Tag key={lineId}>{lineId}호선</Tag>
      ))}

      {/* 역 설명 */}
      <div>{selectedSearchStation.description}</div>

      {/* 출발지/도착지 선택 버튼 */}
      <Button
        onClick={() => {
          onSelectAsStart(selectedSearchStation); // 부모 함수 호출
          setSelectedSearchStation(null); // 선택 초기화
          setSearchValue(""); // 검색어 초기화
        }}
      >
        출발지
      </Button>

      <Button
        onClick={() => {
          onSelectAsEnd(selectedSearchStation); // 부모 함수 호출
          setSelectedSearchStation(null);
          setSearchValue("");
        }}
      >
        도착지
      </Button>

      {/* 닫기 버튼 */}
      <Button onClick={() => setSelectedSearchStation(null)}>✕</Button>
    </div>
  );
}
```

- **상세 정보 표시**: 역 이름, 노선, 설명
- **색상 구분**: 출발지(파란색), 도착지(초록색)
- **자동 초기화**: 버튼 클릭 시 선택 상태와 검색어 모두 초기화

**기능 4: 최근 경로 이력**

```typescript
{
  routeHistory.length > 0 && (
    <div>
      <div>
        <HistoryOutlined />
        최근 경로
      </div>

      {routeHistory.map((item) => (
        <div key={item.from.id + "-" + item.to.id}>
          {/* 경로 클릭 버튼 */}
          <button onClick={() => onHistoryClick(item)}>
            <b>{item.from.name}</b> → <b>{item.to.name}</b>
          </button>

          {/* 삭제 버튼 */}
          <button onClick={() => onRemoveHistory(item)}>✕</button>
        </div>
      ))}
    </div>
  );
}
```

- **조건부 렌더링**: 이력이 있을 때만 표시
- **빠른 재검색**: 이력 항목 클릭으로 즉시 경로 재탐색
- **개별 삭제**: 각 항목마다 X 버튼으로 삭제 가능

### 핵심 특징

```typescript
✅ 하는 일:
- 검색 입력 UI 렌더링
- 자동완성 목록 표시
- 선택된 역 상세 정보 표시
- 출발지/도착지 선택 버튼 제공
- 경로 이력 표시 및 관리
- 로컬 선택 상태 관리 (selectedSearchStation)

❌ 하지 않는 일:
- 검색 로직 (부모에서 searchList를 받음)
- 경로 탐색
- 이력 저장 (부모의 함수 호출만)
```

---

## 🔄 컴포넌트 간 데이터 흐름

### 전체 흐름

```
MetroMapContainer (부모)
  ↓ props
  ├─ stations (데이터)
  ├─ selectedStation (상태)
  ├─ startStation (useRouteState에서)
  ├─ routeHistory (useRouteState에서)
  ├─ highlightLine (함수)
  └─ setStartStation (함수)
  ↓
MetroMap (자식)
  ↓ props
  ├─ searchValue (로컬 상태)
  ├─ searchList (로컬 상태)
  ├─ routeHistory (부모에서 받음)
  ├─ setStartStation (부모 함수)
  └─ onHistoryClick (부모 함수)
  ↓
SearchHistoryCard (손자)
  ↓ 사용자 클릭
  onSelectAsStart(station) 호출
  ↓
MetroMap
  ↓ 함수 호출
  setStartStation(station)
  ↓
MetroMapContainer
  ↓ 상태 변경
  startStation 업데이트
  ↓ useEffect 트리거
  경로 탐색 실행
```

### 예시: 검색에서 출발지 선택

```
1. 사용자가 "강남" 검색
   ↓
2. MetroMap의 searchValue 변경
   ↓
3. useEffect 실행 → searchList 업데이트
   ↓
4. SearchHistoryCard에 searchList 전달
   ↓
5. 사용자가 "강남역" 클릭
   ↓
6. selectedSearchStation 설정
   ↓
7. 미니 카드 표시
   ↓
8. 사용자가 "출발지" 버튼 클릭
   ↓
9. onSelectAsStart(강남역) 호출
   ↓
10. MetroMap의 setStartStation(강남역) 호출
    ↓
11. MetroMapContainer의 setStartStation 실행
    ↓
12. useRouteState 훅에서 startStation 업데이트
    ↓
13. MetroMapContainer의 useEffect 트리거
    ↓
14. 경로 탐색 대기 (endStation 필요)
```

---

## 🎯 핵심 정리

### 역할 분담

| 컴포넌트              | 역할        | 상태 관리           | 로직                 |
| --------------------- | ----------- | ------------------- | -------------------- |
| **MetroMapContainer** | 조율자      | 로컬 상태 + 훅 조합 | 경로 탐색, useEffect |
| **MetroMap**          | 렌더러      | 로컬 검색 상태      | 간단한 필터링        |
| **SearchHistoryCard** | 세부 렌더러 | 로컬 선택 상태      | 없음 (UI만)          |

### 데이터 흐름 방향

```
Container → Map → SearchHistoryCard  (Props 전달)
Container ← Map ← SearchHistoryCard  (함수 호출)
```

### 핵심 원칙

```
✅ Container: 훅 조합 + 로직 + 데이터 관리
✅ Map: UI 렌더링 + 로컬 검색 상태
✅ SearchHistoryCard: 검색/이력 UI + 로컬 선택 상태
✅ 모든 복잡한 로직은 Container 또는 훅에
✅ UI 컴포넌트는 받은 props로만 동작
```

---

이제 세 컴포넌트의 역할과 관계가 명확해졌나요? 🎯
