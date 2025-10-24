# 🔍 컴포넌트 & 훅 Deep Dive

> 프로젝트의 주요 컴포넌트, 커스텀 훅, 유틸리티 함수들을 패키지별로 상세하게 분석한 문서입니다.

---

## 📦 패키지 구조 개요

```
src/
├── Components/          # UI 컴포넌트
│   ├── MetroMap.tsx
│   ├── MetroMapContainer.tsx
│   └── SearchHistoryCard.tsx
├── hooks/              # 커스텀 훅
│   ├── useMetroMap.ts
│   └── useRouteState.ts
├── utils/              # 유틸리티 함수
│   ├── pathfinding.ts
│   ├── mapHelpers.ts
│   └── constants.ts
└── data/               # 데이터 모델
    ├── types.ts
    ├── stations.ts
    ├── subwayLines.ts
    └── edges.ts
```

---

## 🎨 Components 패키지

### 1. MetroMapContainer.tsx

**역할**: 컨테이너 컴포넌트로, **커스텀 훅들을 조합**하여 데이터 흐름을 조율합니다.

#### 주요 책임

- **로컬 UI 상태 관리** (선택된 역, 노선) - 이 컴포넌트에서만 사용하는 UI 상태
- **커스텀 훅 조합** - `useRouteState`, `useMetroMap` 훅을 가져와서 사용
- **자식 컴포넌트 조율** - 훅에서 받은 데이터를 자식에게 props로 전달
- **경로 탐색 트리거** - useEffect로 경로 탐색 시점 제어

#### ⚠️ 중요: 실제 상태 관리는 어디서?

이 컴포넌트는 **"상태를 직접 관리"하는 것이 아니라 "훅들을 조합"**하는 역할입니다!

- **경로 상태** (출발지, 도착지, 이력) → `hooks/useRouteState.ts`에서 관리
- **지도 상태** (지도 인스턴스, 마커, 레이어) → `hooks/useMetroMap.ts`에서 관리
- **로컬 UI 상태** (선택된 역, 노선) → 이 컴포넌트에서 직접 관리 (다른 곳에서 안 씀)

**비유**: 이 컴포넌트는 "오케스트라 지휘자"입니다. 악기(훅)들을 연주시키고 조율하지만, 악기 자체를 만들지는 않습니다.

#### 핵심 상태 관리

```typescript
// 1. 선택된 역/노선 상태
const [selectedStation, setSelectedStation] = useState<Station | null>(null);
const [selectedLine, setSelectedLine] = useState<string | null>(null);

// 2. 커스텀 훅을 통한 경로 상태 관리
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

// 3. 지도 렌더링 및 제어
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

#### 이벤트 핸들러

**1. handleStationSelect**

```typescript
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

- 역할: 역 선택 시 출발지/도착지 설정
- 최적화: `useCallback`으로 메모이제이션하여 불필요한 리렌더링 방지

**2. handleMapClick**

```typescript
const handleMapClick = useCallback(() => {
  setStartStation(null);
  setEndStation(null);
  setSelectedLine(null);
  setSelectedStation(null);
}, [setStartStation, setEndStation]);
```

- 역할: 지도 빈 공간 클릭 시 모든 선택 초기화
- 사용자 경험: 빠른 초기화를 통한 새로운 검색 시작

#### 경로 탐색 로직 (핵심 useEffect)

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;

  // 1. Dijkstra 알고리즘으로 최단 경로 탐색
  const result = dijkstraWithTransfers(
    startStation,
    endStation,
    stations,
    edges,
    EDGE_STOP_MIN, // 정차 시간 (분)
    EDGE_TRANSFER_MIN // 환승 시간 (분)
  );

  if (!result) {
    updateInfoText("경로를 찾지 못했습니다.");
    clearRoute();
    return;
  }

  // 2. 경로 시각화
  drawRoute(result);

  // 3. 이력에 추가
  addToHistory(startStation, endStation);

  // 4. 경로 정보 추출 및 표시
  const { minutes, stops, transfers, path, nodeMeta } = result;

  // 환승역 이름 추출 로직
  let stationNames: string[] = [];
  for (let i = 0; i < path.length; i++) {
    const meta = nodeMeta.get(path[i]);
    if (!meta) continue;
    const station = stations.find((s) => s.id === meta.stationId);
    if (!station) continue;

    // 출발/도착역은 무조건 포함
    if (station.id === startStation.id || station.id === endStation.id) {
      stationNames.push(station.name);
      continue;
    }

    // 환승역 감지: 같은 역인데 노선이 바뀌는 경우
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

  // 5. 정보 패널 업데이트
  updateInfoText(
    `출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
    정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
    경로: <b>${routeText}</b>`
  );
}, [
  startStation,
  endStation,
  drawRoute,
  clearRoute,
  updateInfoText,
  addToHistory,
]);
```

**동작 흐름**:

1. 출발역과 도착역이 모두 선택되면 실행
2. Dijkstra 알고리즘으로 최단 경로 계산
3. 경로를 지도에 시각화 (빨간색 선 + 화살표)
4. 경로 이력에 자동 저장
5. 정차역, 환승 횟수, 예상 시간 계산 및 표시

---

### 2. MetroMap.tsx

**역할**: 프레젠테이션 컴포넌트로, UI 렌더링과 사용자 인터랙션을 담당합니다.

#### Props 인터페이스

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

  // 액션 핸들러
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}
```

#### 내부 상태: 검색 기능

```typescript
const [searchValue, setSearchValue] = useState("");
const [searchList, setSearchList] = useState<Station[]>([]);

useEffect(() => {
  if (!searchValue) {
    setSearchList([]);
  } else {
    // 역 이름으로 필터링
    setSearchList(stations.filter((st) => st.name.includes(searchValue)));
  }
}, [searchValue, stations]);
```

**특징**:

- 실시간 검색: 입력할 때마다 즉시 필터링
- 부분 일치 검색: `includes()` 메서드 사용
- 빈 입력 시 자동 초기화

#### 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│  [사이드패널 350px]          [지도 영역 flex:1]         │
│  ┌──────────────────┐       ┌──────────────────────┐   │
│  │ 검색 & 이력      │       │                      │   │
│  │ SearchHistoryCard│       │   Leaflet Map        │   │
│  ├──────────────────┤       │                      │   │
│  │ 컨트롤 패널      │       │                      │   │
│  ├──────────────────┤       └──────────────────────┘   │
│  │ 노선 목록        │       ┌──────────────────────┐   │
│  │ (스크롤 가능)    │       │   범례               │   │
│  ├──────────────────┤       └──────────────────────┘   │
│  │ 환승역 목록      │                                   │
│  ├──────────────────┤                                   │
│  │ 선택된 역 정보   │                                   │
│  └──────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

#### 주요 UI 섹션

**1. 노선 목록 (Line List)**

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
          e.stopPropagation();
          highlightLine(line.id);
        }}
        style={{
          borderColor: line.color,
          backgroundColor: selectedLine === line.id ? line.color : "white",
          color: selectedLine === line.id ? "white" : line.color,
        }}
      >
        <div>
          <strong>{line.name}</strong>
          <br />
          <small>
            {stations.filter((st) => st.lines.includes(line.id)).length}개 역
            운행
          </small>
        </div>
      </Button>
    ))}
  </Space>
</Card>
```

**특징**:

- 동적 스타일링: 선택된 노선은 해당 노선 색상으로 배경 변경
- 역 개수 표시: 각 노선의 운행 역 개수 실시간 계산
- 이벤트 버블링 방지: `e.stopPropagation()`으로 카드 클릭 이벤트와 분리

**2. 환승역 목록 (Transfer Stations)**

```typescript
<Card title='🔄 주요 환승역' size='small'>
  <Space direction='vertical' style={{ width: "100%" }} size='small'>
    {transferStations.map((station) => (
      <Button
        key={station.id}
        block
        size='small'
        type={selectedStation?.id === station.id ? "primary" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          zoomToStation(station);
        }}
      >
        <div>
          <strong>{station.name}</strong>
          <br />
          <div style={{ marginTop: "4px" }}>
            {station.lines.map((lineId) => {
              const line = subwayLines.find((l) => l.id === lineId);
              return line ? (
                <Tag
                  key={lineId}
                  color={line.color}
                  style={{ fontSize: "10px" }}
                >
                  {line.name}
                </Tag>
              ) : null;
            })}
          </div>
        </div>
      </Button>
    ))}
  </Space>
</Card>
```

**특징**:

- 환승 가능 노선 표시: 각 환승역에서 이용 가능한 모든 노선을 Tag로 표시
- 색상 코딩: 노선별 고유 색상으로 시각적 구분
- 선택 상태 표시: 현재 선택된 환승역은 primary 스타일 적용

**3. 선택된 역 정보 (Station Info)**

```typescript
{
  selectedStation && (
    <Card title='ℹ️ 역 정보' size='small'>
      <div style={{ textAlign: "center" }}>
        <Title level={4}>{selectedStation.name}</Title>

        {/* 노선 태그 */}
        <div style={{ margin: "8px 0" }}>
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

        <Divider style={{ margin: "12px 0" }} />

        {/* 역 설명 */}
        <Text style={{ fontSize: "14px" }}>{selectedStation.description}</Text>

        {/* 좌표 정보 */}
        <div style={{ marginTop: "8px" }}>
          <Text type='secondary' style={{ fontSize: "12px" }}>
            좌표: ({selectedStation.lat}, {selectedStation.lng})
          </Text>
        </div>
      </div>
    </Card>
  );
}
```

**특징**:

- 조건부 렌더링: 역이 선택되었을 때만 표시
- 상세 정보 제공: 역 이름, 소속 노선, 환승 여부, 설명, 좌표
- 중앙 정렬: 모든 정보를 중앙 정렬하여 가독성 향상

**4. 범례 (Legend)**

```typescript
<Card size='small' style={{ marginTop: "8px" }}>
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "16px",
      alignItems: "center",
    }}
  >
    <Text strong>노선 범례:</Text>
    {subwayLines.map((line) => (
      <span
        key={line.id}
        style={{ display: "flex", alignItems: "center", gap: "4px" }}
      >
        <div
          style={{
            width: "20px",
            height: "4px",
            backgroundColor: line.color,
            borderRadius: "2px",
          }}
        ></div>
        <Text style={{ fontSize: "12px" }}>{line.name}</Text>
      </span>
    ))}
    <Text type='secondary' style={{ fontSize: "12px" }}>
      • 큰 원: 환승역 | 작은 원: 일반역
    </Text>
  </div>
</Card>
```

**특징**:

- 동적 생성: 노선 데이터를 기반으로 자동 생성
- 색상 매칭: 지도의 노선 색상과 일치
- 마커 설명: 환승역과 일반역의 시각적 차이 설명

---

### 3. SearchHistoryCard.tsx

**역할**: 검색 기능과 경로 이력을 통합 관리하는 독립적인 카드 컴포넌트입니다.

#### Props 인터페이스

```typescript
interface SearchHistoryCardProps {
  // 검색 상태
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

#### 내부 상태: 선택된 검색 역

```typescript
const [selectedSearchStation, setSelectedSearchStation] =
  React.useState<Station | null>(null);

// 검색어가 바뀌면 선택 초기화
React.useEffect(() => {
  setSelectedSearchStation(null);
}, [searchValue]);
```

**설계 의도**:

- 2단계 선택 프로세스: 검색 → 역 선택 → 출발지/도착지 지정
- 자동 초기화: 새로운 검색 시 이전 선택 상태 제거

#### UI 흐름

**1. 검색 입력창**

```typescript
<Input
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  onPressEnter={() => {
    if (searchList.length > 0) {
      setSelectedSearchStation(searchList[0]);
    }
  }}
  placeholder='역, 버스, 도로 검색'
  allowClear
  prefix={<SearchOutlined />}
  style={{
    border: "1.5px solid #0099ff",
    borderRadius: 6,
    fontWeight: 500,
    fontSize: 15,
  }}
/>
```

**특징**:

- Enter 키 지원: 첫 번째 검색 결과 자동 선택
- 빠른 초기화: `allowClear` 속성으로 X 버튼 제공
- 시각적 강조: 파란색 테두리로 검색창 강조

**2. 자동완성 목록**

```typescript
{
  searchValue && !selectedSearchStation && (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        maxHeight: 160,
        overflowY: "auto",
      }}
    >
      {searchList.length === 0 ? (
        <div style={{ padding: 10, color: "#bbb" }}>검색 결과 없음</div>
      ) : (
        searchList.map((s) => (
          <div
            key={s.id}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
              borderBottom: "1px solid #f4f4f4",
            }}
            onClick={() => setSelectedSearchStation(s)}
          >
            <SearchOutlined style={{ color: "#0052A4", marginRight: 8 }} />
            {s.name}
            {s.isTransfer && (
              <span
                style={{ color: "#ff3b30", marginLeft: 6, fontWeight: 600 }}
              >
                (환승)
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

**특징**:

- 조건부 렌더링: 검색어가 있고 역이 선택되지 않았을 때만 표시
- 환승역 표시: 환승 가능한 역은 빨간색으로 강조
- 스크롤 지원: 최대 높이 160px, 넘치면 스크롤

**3. 선택된 역 미니 카드**

```typescript
{
  selectedSearchStation && (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #0099ff",
        borderRadius: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: 16,
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* 역 이름 */}
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
        {selectedSearchStation.name}
      </div>

      {/* 노선 태그 */}
      <div style={{ marginBottom: 4 }}>
        {selectedSearchStation.lines.map((lineId) => (
          <Tag key={lineId} color='#0052A4' style={{ fontWeight: 600 }}>
            {lineId}호선
          </Tag>
        ))}
      </div>

      {/* 역 설명 */}
      <div style={{ color: "#666", marginBottom: 12, fontSize: 13 }}>
        {selectedSearchStation.description}
      </div>

      {/* 출발지/도착지 선택 버튼 */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        <Button
          type='default'
          style={{
            borderColor: "#0052A4",
            color: "#0052A4",
            fontWeight: 600,
          }}
          onClick={() => {
            onSelectAsStart(selectedSearchStation);
            setSelectedSearchStation(null);
            setSearchValue("");
          }}
        >
          출발지
        </Button>
        <Button
          type='default'
          style={{
            borderColor: "#00C853",
            color: "#00C853",
            fontWeight: 600,
          }}
          onClick={() => {
            onSelectAsEnd(selectedSearchStation);
            setSelectedSearchStation(null);
            setSearchValue("");
          }}
        >
          도착지
        </Button>
      </div>

      {/* 닫기 버튼 */}
      <Button
        size='small'
        style={{
          position: "absolute",
          right: 8,
          top: 6,
          border: "none",
          background: "none",
          color: "#bbb",
        }}
        onClick={() => setSelectedSearchStation(null)}
      >
        ✕
      </Button>
    </div>
  );
}
```

**특징**:

- 상세 정보 표시: 역 이름, 노선, 설명을 한눈에 확인
- 색상 구분: 출발지(파란색), 도착지(초록색) 버튼으로 직관적 구분
- 자동 초기화: 버튼 클릭 시 선택 상태와 검색어 모두 초기화
- 닫기 기능: 우측 상단 X 버튼으로 카드 닫기

**4. 최근 경로 이력**

```typescript
{
  routeHistory.length > 0 && (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontWeight: 500,
          color: "#888",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <HistoryOutlined style={{ color: "#0052A4" }} />
        최근 경로
      </div>

      {routeHistory.map((item) => (
        <div
          key={item.from.id + "-" + item.to.id}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            marginBottom: 4,
            background: "#fafafa",
            border: "1px solid #e0e0e0",
            borderRadius: 5,
            padding: "6px 10px",
          }}
        >
          {/* 경로 클릭 버튼 */}
          <button
            style={{
              flex: 1,
              textAlign: "left",
              border: "none",
              background: "transparent",
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
            }}
            onClick={() => onHistoryClick(item)}
          >
            <b>{item.from.name}</b> → <b>{item.to.name}</b>
          </button>

          {/* 삭제 버튼 */}
          <button
            style={{
              border: "none",
              background: "none",
              color: "#bbb",
              fontSize: 15,
              marginLeft: 8,
              cursor: "pointer",
              lineHeight: 1,
            }}
            aria-label='이 경로 삭제'
            onClick={() => onRemoveHistory(item)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

**특징**:

- 조건부 렌더링: 이력이 있을 때만 표시
- 빠른 재검색: 이력 항목 클릭으로 즉시 경로 재탐색
- 개별 삭제: 각 항목마다 X 버튼으로 삭제 가능
- 접근성: `aria-label`로 스크린 리더 지원

---

## 🎣 Hooks 패키지

### 1. useMetroMap.ts

**역할**: Leaflet 지도 초기화, 렌더링, 상호작용을 관리하는 핵심 커스텀 훅입니다.

#### 인터페이스

```typescript
export interface UseMetroMapProps {
  stations: Station[];
  subwayLines: SubwayLine[];
  edges: Edge[];
  startStation: Station | null;
  endStation: Station | null;
  selectedLine: string | null;
  onStationSelect: (station: Station, role: "start" | "end") => void;
  onMapClick: () => void;
}

export interface UseMetroMapReturn {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  drawRoute: (result: PathfindingResult) => void;
  clearRoute: () => void;
  updateInfoText: (text: string) => void;
}
```

#### Ref 관리

```typescript
const mapContainerRef = useRef<HTMLDivElement>(null); // 지도 DOM 컨테이너
const mapRef = useRef<L.Map | null>(null); // Leaflet 지도 인스턴스
const markersRef = useRef<Map<string, L.Marker>>(new Map()); // 역 마커 맵
const polylinesRef = useRef<Map<string, L.Polyline>>(new Map()); // 노선 폴리라인 맵
const routeLayerRef = useRef<L.LayerGroup | null>(null); // 경로 레이어
const arrowLayerRef = useRef<L.LayerGroup | null>(null); // 화살표 레이어
const infoControlRef = useRef<L.Control | null>(null); // 정보 컨트롤
```

**설계 의도**:

- Ref 사용 이유: Leaflet 객체는 React 상태로 관리하면 불필요한 리렌더링 발생
- Map 자료구조: 역 ID와 노선 ID로 빠른 조회 가능
- 레이어 분리: 경로와 화살표를 별도 레이어로 관리하여 독립적 제어

#### 지도 초기화 (useEffect)

```typescript
useEffect(() => {
  if (!mapContainerRef.current) return;

  // 1. Leaflet 지도 인스턴스 생성
  const map = L.map(mapContainerRef.current, {
    crs: L.CRS.Simple,    // 단순 좌표계 (실제 지리 좌표 아님)
    minZoom: 2,
    maxZoom: 5,
    center: [85, 75],
    zoom: 2
  });

  mapRef.current = map;

  // 2. 타일 레이어 추가 (격자 배경)
  L.tileLayer(
    "data:image/svg+xml;base64..." + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="256" height="256" fill="#fafafa"/>
        <rect width="256" height="256" fill="url(#grid)"/>
      </svg>
    `),
    { attribution: "Metro City Subway Map" }
  ).addTo(map);
```

**특징**:

- Simple CRS: 실제 지리 좌표가 아닌 단순 2D 평면 좌표계 사용
- SVG 타일: Base64 인코딩된 SVG로 격자 패턴 배경 생성
- 줌 제한: 2~5 레벨로 제한하여 적절한 시야 유지

  // 3. 정보 컨트롤 패널 생성
  const infoControl = new L.Control({ position: "topright" });
  infoControl.onAdd = () => {
  const div = L.DomUtil.create("div", "trip-info");
  div.style.cssText = `   background: rgba(255,255,255,0.95);
padding: 8px 12px;
border-radius: 8px;
box-shadow: 0 2px 6px rgba(0,0,0,0.15);
font-size: 13px;
color: #333;
min-width: 220px;`;
  div.innerHTML = "출발지/도착지를 선택하세요";
  return div;
  };
  infoControl.addTo(map);
  infoControlRef.current = infoControl;

  // 4. 지도 클릭 이벤트 핸들러 등록
  map.on("click", onMapClick);

  // 5. 노선 Polyline 렌더링
  subwayLines.forEach((line) => {
  const lineEdges = edges.filter((e) => e.line === line.id);
  lineEdges.forEach((edge, idx) => {
  const fromStation = stations.find((s) => s.id === edge.from);
  const toStation = stations.find((s) => s.id === edge.to);

              if (fromStation && toStation) {
                const polyline = L.polyline(
                  [
                    [fromStation.lat, fromStation.lng],
                    [toStation.lat, toStation.lng]
                  ],
                  {
                    color: line.color,
                    weight: 8,
                    opacity: 0.8,
                    lineCap: "round",
                    lineJoin: "round",
                    className: `line-${line.id}`
                  }
                ).addTo(map);

                polylinesRef.current.set(`${line.id}-${idx}`, polyline);
              }

  });
  });

````

**노선 렌더링 로직**:
1. 각 노선별로 Edge 필터링
2. Edge의 출발역과 도착역 좌표로 Polyline 생성
3. 노선 색상, 두께, 투명도 설정
4. Map에 저장하여 나중에 제어 가능하도록 함

```typescript
  // 6. 역 마커 생성 및 팝업 UI 구성
  stations.forEach((station) => {
    // 마커 색상: 소속 노선 첫 번째 색상
    const line = subwayLines.find((l) => station.lines[0] === l.id);
    const color = line ? line.color : "#666";

    const marker = L.marker([station.lat, station.lng], {
      icon: createStationLabel(station, color, station.isTransfer)
    }).addTo(map);

    markersRef.current.set(station.id, marker);

    // 팝업 UI
    const linesInfo = station.lines
      .map((id) => {
        const l = subwayLines.find((l) => l.id === id);
        return l
          ? `<span style="color:${l.color};font-weight:600;">${l.name}</span>`
          : "";
      })
      .join(" • ");

    const popupHtml = `
      <div style="text-align:center; min-width:220px;">
        <h3 style="margin:0 0 6px 0; color:#333;">${station.name}</h3>
        <div style="font-size:13px; margin-bottom:6px;">${linesInfo}</div>
        <p style="font-size:12px; color:#666;">${station.description}</p>
        <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
          <button data-role="start" style="padding:4px 8px; border:1px solid #1f6feb; background:#e8f0ff; border-radius:5px; color:#1f6feb;">출발지</button>
          <button data-role="end" style="padding:4px 8px; border:1px solid #10b981; background:#e8fff4; border-radius:5px; color:#059669;">도착지</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { offset: L.point(0, -8) });

    // 마커 클릭 이벤트 핸들러 등록
    marker.on("popupopen", (e) => {
      const container = e.popup.getElement();
      const btnStart = container?.querySelector<HTMLButtonElement>(
        "button[data-role='start']"
      );
      const btnEnd = container?.querySelector<HTMLButtonElement>(
        "button[data-role='end']"
      );

      btnStart?.addEventListener("click", () => {
        onStationSelect(station, "start");
        marker.closePopup();
      });

      btnEnd?.addEventListener("click", () => {
        onStationSelect(station, "end");
        marker.closePopup();
      });
    });
  });

  // 7. 클린업 함수
  return () => {
    if (infoControlRef.current) {
      infoControlRef.current.remove();
      infoControlRef.current = null;
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
      routeLayerRef.current = null;
    }

    if (arrowLayerRef.current) {
      arrowLayerRef.current.clearLayers();
      arrowLayerRef.current = null;
    }

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    markersRef.current.clear();
  };
}, [stations, subwayLines, edges, onStationSelect, onMapClick]);
````

**마커 생성 로직**:

1. 각 역의 첫 번째 노선 색상을 마커 색상으로 사용
2. `createStationLabel` 헬퍼 함수로 커스텀 아이콘 생성
3. HTML 팝업 생성 (역 정보 + 출발지/도착지 선택 버튼)
4. 팝업 열릴 때 버튼 이벤트 리스너 등록
5. 버튼 클릭 시 `onStationSelect` 콜백 호출 후 팝업 닫기

**클린업 중요성**:

- 메모리 누수 방지: Leaflet 객체는 수동으로 제거해야 함
- 이벤트 리스너 정리: 등록된 모든 이벤트 핸들러 제거
- Ref 초기화: 다음 마운트를 위해 Ref 초기화

#### 출발지/도착지 하이라이트 (useEffect)

```typescript
useEffect(() => {
  highlightStationCircles({
    start: startStation?.id,
    end: endStation?.id,
  });
}, [startStation, endStation]);
```

**동작**:

- 출발역: 빨간색 테두리
- 도착역: 초록색 테두리
- 나머지: 기본 스타일

#### 노선 필터링 (useEffect)

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
        polyline.setStyle({ opacity: 0.8 });
      } else {
        polyline.setStyle({ opacity: 0.15 });
      }
    });

    markersRef.current.forEach((marker, stationId) => {
      const station = stations.find((s) => s.id === stationId);
      if (station && station.lines.includes(selectedLine)) {
        marker.setOpacity(1);
      } else {
        marker.setOpacity(0.2);
      }
    });
  }
}, [selectedLine, stations]);
```

**특징**:

- 선택적 강조: 선택된 노선과 해당 역만 불투명하게 표시
- 나머지 흐리게: 다른 노선과 역은 투명도 낮춤
- 전체 보기: 선택 해제 시 모든 요소 원래대로

#### 경로 그리기 함수 (drawRoute)

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
    color: "#ff3b30",
    weight: 10,
    opacity: 0.95,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(routeLayerRef.current);

  // 3. 진행방향 화살표 그리기
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];

    // 화살표 각도 계산
    const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const angleDeg = (angleRad * 180) / Math.PI;

    // 각 구간에 2개의 화살표 배치 (40%, 80% 지점)
    [0.4, 0.8].forEach((t) => {
      const pos: [number, number] = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
      ];

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

      L.marker(pos, { icon: arrowIcon, zIndexOffset: 1300 }).addTo(
        arrowLayerRef.current!
      );
    });
  }

  // 4. 환승역 하이라이트
  highlightTransferLabels(transferStationIds);
}, []);
```

**화살표 렌더링 로직**:

1. 각 구간의 시작점(a)과 끝점(b) 사이 각도 계산
2. `Math.atan2`로 라디안 각도 계산 후 도(degree)로 변환
3. 각 구간에 40%, 80% 지점에 화살표 배치
4. CSS `transform: rotate`로 진행 방향에 맞게 회전
5. `drop-shadow` 필터로 가독성 향상

**레이어 관리**:

- 경로 레이어: 빨간색 굵은 선
- 화살표 레이어: 흰색 삼각형 마커
- 분리 이유: 독립적으로 제거/업데이트 가능

#### 경로 초기화 함수 (clearRoute)

```typescript
const clearRoute = useCallback(() => {
  if (routeLayerRef.current) {
    routeLayerRef.current.clearLayers();
  }
  if (arrowLayerRef.current) {
    arrowLayerRef.current.clearLayers();
  }
  highlightTransferLabels([]);
  highlightStationCircles({});
}, []);
```

**동작**:

1. 경로 레이어의 모든 요소 제거
2. 화살표 레이어의 모든 요소 제거
3. 환승역 하이라이트 해제
4. 역 마커 하이라이트 해제

#### 정보 텍스트 업데이트 함수 (updateInfoText)

```typescript
const updateInfoText = useCallback((text: string) => {
  setInfoText(text);
}, []);
```

**사용 예시**:

```typescript
updateInfoText(
  `출발: <b>${startStation.name}</b> → 도착: <b>${endStation.name}</b><br/>
  정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b><br/>
  경로: <b>${routeText}</b>`
);
```

---

### 2. useRouteState.ts

**역할**: 경로 탐색 관련 상태(출발역, 도착역, 이력)를 관리하는 커스텀 훅입니다.

#### 인터페이스

```typescript
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
```

#### 상태 정의

```typescript
const [startStation, setStartStation] = useState<Station | null>(null);
const [endStation, setEndStation] = useState<Station | null>(null);
const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);
```

**설계 의도**:

- 단순한 상태 관리: 복잡한 로직 없이 기본 상태만 관리
- 재사용성: 다른 컴포넌트에서도 쉽게 사용 가능
- 관심사 분리: 경로 상태와 지도 렌더링 로직 분리

#### 이력 추가 함수 (addToHistory)

```typescript
const addToHistory = useCallback((from: Station, to: Station) => {
  setRouteHistory((prev) => {
    // 1. 중복 제거: 같은 출발지-도착지 조합이 있으면 제거
    const filtered = prev.filter(
      (h) => !(h.from.id === from.id && h.to.id === to.id)
    );

    // 2. 새 항목을 맨 앞에 추가하고 최대 4개까지만 유지
    return [{ from, to }, ...filtered].slice(0, 4);
  });
}, []);
```

**동작 흐름**:

1. 기존 이력에서 동일한 경로 제거 (중복 방지)
2. 새 경로를 배열 맨 앞에 추가
3. 최대 4개까지만 유지 (오래된 항목 자동 삭제)

**특징**:

- LRU (Least Recently Used) 방식
- 최신 검색이 항상 맨 위에 표시
- 메모리 효율: 최대 4개로 제한

#### 이력 제거 함수 (removeFromHistory)

```typescript
const removeFromHistory = useCallback((item: RouteHistoryItem) => {
  setRouteHistory((prev) =>
    prev.filter((h) => !(h.from.id === item.from.id && h.to.id === item.to.id))
  );
}, []);
```

**동작**:

- 출발지와 도착지 ID가 모두 일치하는 항목만 제거
- 불변성 유지: `filter`로 새 배열 생성

#### 이력 선택 함수 (selectHistoryItem)

```typescript
const selectHistoryItem = useCallback((item: RouteHistoryItem) => {
  setStartStation(item.from);
  setEndStation(item.to);
}, []);
```

**동작**:

- 이력 항목의 출발지와 도착지를 현재 상태로 설정
- 자동으로 경로 탐색 트리거 (useEffect 의존성)

---

## 🛠️ Utils 패키지

### 1. pathfinding.ts

**역할**: Dijkstra 알고리즘을 사용한 최단 경로 탐색 로직을 제공합니다.

#### 타입 정의

```typescript
export type NodeKey = string; // `${stationId}@${lineId}`

export interface PathfindingResult {
  minutes: number; // 총 소요 시간
  stops: number; // 정차역 수
  transfers: number; // 환승 횟수
  coords: [number, number][]; // 경로 좌표 배열
  transferStationIds: string[]; // 환승역 ID 배열
  path: NodeKey[]; // 노드 경로
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>; // 노드 메타데이터
}
```

**NodeKey 설계**:

- 형식: `${stationId}@${lineId}`
- 예시: `"gangnam@2"` (강남역 2호선)
- 이유: 같은 역이라도 노선별로 다른 노드로 취급 (환승 표현)

#### 그래프 생성 함수 (buildGraph)

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
      // 환승 edge (예: "2-3" = 2호선에서 3호선으로 환승)
      const [lA, lB] = line.split("-");
      const fromKey = `${from}@${lA}`;
      const toKey = `${to}@${lB}`;

      // 양방향 간선 추가
      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });

      if (!adj.has(toKey)) adj.set(toKey, []);
      adj.get(toKey)!.push({ to: fromKey, cost: weight });
    } else {
      // 일반 edge (같은 노선 내 역 간 이동)
      const fromKey = `${from}@${line}`;
      const toKey = `${to}@${line}`;

      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });
    }
  });

  return { adj, nodeMeta };
}
```

**그래프 구조**:

```
예시: 강남역 (2호선, 신분당선)

노드:
- gangnam@2 (강남역 2호선)
- gangnam@shinbundang (강남역 신분당선)

간선:
- gangnam@2 → yeoksam@2 (역삼역, 일반 이동)
- gangnam@2 → gangnam@shinbundang (환승)
```

**환승 처리**:

- 환승 Edge: `line` 필드가 `"2-shinbundang"` 형식
- 같은 역의 다른 노선 노드 간 연결
- 양방향 간선: 2호선 → 신분당선, 신분당선 → 2호선 모두 가능

**일반 이동 처리**:

- 일반 Edge: `line` 필드가 `"2"` 형식
- 같은 노선 내 인접 역 간 연결
- 단방향 간선: Edge 데이터에 명시된 방향만

#### Dijkstra 알고리즘 (dijkstraWithTransfers)

```typescript
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,
  edgeTransferMin: number
): PathfindingResult | null {
  const { adj, nodeMeta } = buildGraph(stations, edges);

  // 1. 시작 노드 설정 (출발역의 모든 노선)
  const startNodes: NodeKey[] = start.lines.map((lid) => `${start.id}@${lid}`);
  const isGoal = (key: NodeKey) => key.startsWith(`${end.id}@`);

  // 2. 초기화
  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey | null>();
  const pq: Array<{ key: NodeKey; d: number }> = [];

  startNodes.forEach((k) => {
    dist.set(k, 0);
    prev.set(k, null);
    pq.push({ key: k, d: 0 });
  });

  // 3. 우선순위 큐에서 최소값 추출 함수
  const popMin = () => {
    pq.sort((a, b) => a.d - b.d);
    return pq.shift();
  };

  let goalKey: NodeKey | null = null;

  // 4. Dijkstra 메인 루프
  while (pq.length) {
    const cur = popMin()!;

    // 이미 처리된 노드는 스킵
    if (dist.get(cur.key)! < cur.d) continue;

    // 목표 노드 도달 시 종료
    if (isGoal(cur.key)) {
      goalKey = cur.key;
      break;
    }

    // 인접 노드 탐색
    const edgeList = adj.get(cur.key) || [];
    for (const { to, cost } of edgeList) {
      const nd = cur.d + cost;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, cur.key);
        pq.push({ key: to, d: nd });
      }
    }
  }

  if (!goalKey) return null;

  // 5. 경로 복원
  const rev: NodeKey[] = [];
  let t: NodeKey | null = goalKey;
  while (t) {
    rev.push(t);
    t = prev.get(t) ?? null;
  }
  const path = rev.reverse();
```

**알고리즘 특징**:

- 시작점: 출발역의 모든 노선 노드 (어느 노선에서 시작해도 됨)
- 종료 조건: 도착역의 어느 노선 노드든 도달하면 종료
- 최단 경로 보장: Dijkstra 알고리즘의 특성
- 시간 복잡도: O((V + E) log V), V=노드 수, E=간선 수

```typescript
  // 6. 통계 계산 및 환승역 추출
  let transfers = 0;
  let stops = 0;
  const transferStationIds: string[] = [];

  for (let i = 1; i < path.length; i++) {
    const a = nodeMeta.get(path[i - 1]);
    const b = nodeMeta.get(path[i]);

    if (!a || !b) continue;

    // 환승 감지: 같은 역인데 노선이 다름
    if (a.stationId === b.stationId && a.lineId !== b.lineId) {
      transfers++;
      transferStationIds.push(a.stationId);
    }
    // 정차역 카운트: 같은 노선에서 다른 역으로 이동
    else if (a.lineId === b.lineId && a.stationId !== b.stationId) {
      stops++;
    }
  }

  const minutes = stops * edgeStopMin + transfers * edgeTransferMin;

  // 7. 경로의 [lat, lng] 좌표 추출 (중복 역 생략)
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
    minutes,
    stops,
    transfers,
    coords,
    transferStationIds,
    path,
    nodeMeta
  };
}
```

**통계 계산 로직**:

1. **환승 감지**: `stationId`는 같지만 `lineId`가 다른 경우
2. **정차역 카운트**: `lineId`는 같지만 `stationId`가 다른 경우
3. **소요 시간**: `정차역 수 × 정차 시간 + 환승 횟수 × 환승 시간`

**좌표 추출 로직**:

- 중복 제거: 같은 역을 여러 번 방문해도 한 번만 좌표 추가
- 환승역 처리: 환승 시에도 역 좌표는 한 번만 추가
- 순서 유지: 경로 순서대로 좌표 배열 생성

---

### 2. mapHelpers.ts

**역할**: Leaflet 지도 관련 헬퍼 함수들을 제공합니다.

#### 역 라벨 생성 함수 (createStationLabel)

```typescript
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean = false,
  isStart: boolean = false,
  isEnd: boolean = false
): L.DivIcon {
  const size = isTransfer ? TRANSFER_MARKER_SIZE : NORMAL_MARKER_SIZE;
  const borderWidth = isTransfer ? TRANSFER_BORDER_WIDTH : NORMAL_BORDER_WIDTH;
  const leftAligned = LEFT_ALIGNED_STATIONS.includes(station.name);

  const off = LABEL_OFFSETS[station.name] || { x: 0, y: 0 };
  const highlightClass = isStart ? "station-start" : isEnd ? "station-end" : "";

  return L.divIcon({
    className: `station-label ${highlightClass}`,
    html: `
    <div class="station-label-root" data-station-id="${station.id}" 
         style="position: relative; width:0; height:0;">
      
      <!-- 역 마커 원 -->
      <div style="
        position:absolute;
        left:0;
        top:0;
        transform: translate(-50%, -50%);
        width:${size}px;
        height:${size}px;
        background-color:${color};
        border:${borderWidth}px solid white;
        border-radius:50%;
        box-shadow:0 2px 4px rgba(0,0,0,0.4);
        ${isTransfer ? "border-color:#333; background:white;" : ""}
      "></div>

      <!-- 역 이름 라벨 -->
      <span
        class="label-text"
        data-left="${leftAligned}"
        data-offx="${off.x ?? 0}"
        data-offy="${off.y ?? 0}"
        style="
          position:absolute;
          top: ${off.y ?? 0}px; 
          ${
            leftAligned
              ? `right: ${LABEL_GAP + (off.x ?? 0)}px; text-align:right;`
              : `left: ${LABEL_GAP + (off.x ?? 0)}px; text-align:left;`
          }
          transform: translateY(-50%);
          font-weight:500;
        "
      >
        ${station.name}
      </span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [0, 0],
  });
}
```

**마커 스타일 규칙**:

1. **환승역**: 큰 원 (TRANSFER_MARKER_SIZE), 흰색 배경, 검은 테두리
2. **일반역**: 작은 원 (NORMAL_MARKER_SIZE), 노선 색상 배경, 흰색 테두리
3. **출발역**: `station-start` 클래스 추가
4. **도착역**: `station-end` 클래스 추가

**라벨 정렬**:

- 기본: 마커 오른쪽에 라벨 표시
- 특정 역: `LEFT_ALIGNED_STATIONS`에 포함된 역은 왼쪽에 표시
- 오프셋: `LABEL_OFFSETS`로 개별 역의 라벨 위치 미세 조정

#### 환승역 라벨 하이라이트 (highlightTransferLabels)

```typescript
export function highlightTransferLabels(transferStationIds: string[]): void {
  // 1. 모든 라벨을 기본 색상으로 초기화
  const ALL = document.querySelectorAll<HTMLSpanElement>(
    ".station-label .label-text"
  );
  ALL.forEach((el) => (el.style.color = "#222"));

  // 2. 지정된 환승역만 강조 색상으로 변경
  transferStationIds.forEach((sid) => {
    const label = document.querySelector<HTMLSpanElement>(
      `.station-label-root[data-station-id="${sid}"] .label-text`
    );
    if (label) label.style.color = "#ff3b30";
  });
}
```

**동작**:

1. 모든 역 라벨을 검은색(#222)으로 초기화
2. 환승역 ID 배열을 순회하며 해당 역 라벨만 빨간색(#ff3b30)으로 변경
3. DOM 직접 조작: React 상태가 아닌 Leaflet DOM 요소 제어

**사용 시점**:

- 경로 탐색 완료 후 환승역 강조
- 경로 초기화 시 빈 배열 전달하여 모든 하이라이트 해제

#### 역 마커 하이라이트 (highlightStationCircles)

```typescript
export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void {
  // 1. 모든 마커를 기본 스타일로 초기화
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

  // 2. 출발역 하이라이트
  if (stationIds.start) {
    const startCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.start}"] > div`
    );
    if (startCircle) {
      startCircle.style.borderColor = "#ff3b30";
      startCircle.style.borderWidth = `${TRANSFER_BORDER_WIDTH}px`;
    }
  }

  // 3. 도착역 하이라이트
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

**하이라이트 규칙**:

- **출발역**: 빨간색 테두리 (#ff3b30), 굵은 테두리
- **도착역**: 초록색 테두리 (#00c853), 굵은 테두리
- **환승역**: 검은색 테두리 (#333), 기본 굵기
- **일반역**: 흰색 테두리, 기본 굵기

**초기화 로직**:

1. 모든 마커의 배경색 확인 (흰색 = 환승역)
2. 환승역과 일반역에 맞는 기본 스타일 적용
3. 출발역/도착역이 지정되면 해당 마커만 강조

#### 정보 텍스트 설정 (setInfoText)

```typescript
export function setInfoText(text: string): void {
  const el = document.querySelector<HTMLDivElement>(".trip-info");
  if (el) el.innerHTML = text;
}
```

**특징**:

- HTML 지원: `<b>`, `<br/>` 등 HTML 태그 사용 가능
- 실시간 업데이트: 경로 탐색 진행 상황 표시
- 안전성: 요소가 없으면 조용히 실패 (에러 없음)

**사용 예시**:

```typescript
setInfoText("출발지/도착지를 선택하세요");
setInfoText(`출발지: <b>${station.name}</b> 선택됨`);
setInfoText(`
  출발: <b>${start.name}</b> → 도착: <b>${end.name}</b><br/>
  정차역 <b>${stops}</b>개 · 환승 <b>${transfers}</b>회 · 예상 <b>${minutes}분</b>
`);
```

---

### 3. constants.ts

**역할**: 지도 렌더링 관련 상수 값들을 정의합니다.

```typescript
// 마커 크기
export const TRANSFER_MARKER_SIZE = 16; // 환승역 마커 크기
export const NORMAL_MARKER_SIZE = 10; // 일반역 마커 크기

// 테두리 두께
export const TRANSFER_BORDER_WIDTH = 3; // 환승역 테두리
export const NORMAL_BORDER_WIDTH = 2; // 일반역 테두리

// 라벨 간격
export const LABEL_GAP = 12; // 마커와 라벨 사이 간격 (px)

// 왼쪽 정렬 역 목록
export const LEFT_ALIGNED_STATIONS = ["신논현", "강남", "역삼"];

// 개별 역 라벨 오프셋
export const LABEL_OFFSETS: Record<string, { x?: number; y?: number }> = {
  강남: { x: 0, y: -5 },
  역삼: { x: 0, y: 5 },
  선릉: { x: 5, y: 0 },
};
```

**설계 의도**:

- 중앙 집중화: 모든 스타일 상수를 한 곳에서 관리
- 유지보수성: 값 변경 시 한 파일만 수정
- 타입 안전성: TypeScript로 타입 체크

**사용 예시**:

```typescript
import { TRANSFER_MARKER_SIZE, LABEL_GAP } from "./constants";

const size = isTransfer ? TRANSFER_MARKER_SIZE : NORMAL_MARKER_SIZE;
const labelPosition = `left: ${LABEL_GAP}px`;
```

---

## 📊 Data 패키지

### types.ts

**역할**: 프로젝트 전체에서 사용하는 타입 정의를 제공합니다.

```typescript
export interface Station {
  id: string; // 역 고유 ID (예: "gangnam")
  name: string; // 역 이름 (예: "강남")
  lat: number; // 위도 (지도 Y 좌표)
  lng: number; // 경도 (지도 X 좌표)
  lines: string[]; // 소속 노선 ID 배열 (예: ["2", "shinbundang"])
  isTransfer: boolean; // 환승역 여부
  description: string; // 역 설명
}

export interface SubwayLine {
  id: string; // 노선 ID (예: "2")
  name: string; // 노선 이름 (예: "2호선")
  color: string; // 노선 색상 (예: "#00a84d")
}

export interface Edge {
  from: string; // 출발역 ID
  to: string; // 도착역 ID
  line: string; // 노선 ID 또는 환승 표시 (예: "2" 또는 "2-3")
  weight: number; // 가중치 (소요 시간, 분)
}

export type RouteHistoryItem = {
  from: Station;
  to: Station;
};
```

**타입 설계 원칙**:

1. **명확한 네이밍**: 필드 이름만으로 의미 파악 가능
2. **타입 안전성**: 모든 필드에 명시적 타입 지정
3. **재사용성**: 여러 컴포넌트에서 공통으로 사용
4. **확장성**: 필요 시 필드 추가 용이

**Edge 타입 특징**:

- `line` 필드가 `-` 포함 시 환승 Edge
- 예: `"2-3"` = 2호선에서 3호선으로 환승
- 예: `"2"` = 2호선 내 역 간 이동

---

## 🔄 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    MetroMapContainer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useRouteState()                                     │  │
│  │  - startStation, endStation                          │  │
│  │  - routeHistory                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useMetroMap()                                       │  │
│  │  - mapContainerRef                                   │  │
│  │  - drawRoute(), clearRoute()                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useEffect: 경로 탐색                                │  │
│  │  1. dijkstraWithTransfers() 호출                     │  │
│  │  2. drawRoute() 호출                                 │  │
│  │  3. addToHistory() 호출                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       MetroMap                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ SearchHistory    │  │  지도 영역                   │    │
│  │ Card             │  │  - Leaflet Map               │    │
│  │ - 검색           │  │  - 노선 Polyline             │    │
│  │ - 이력           │  │  - 역 마커                   │    │
│  └──────────────────┘  │  - 경로 레이어               │    │
│  ┌──────────────────┐  │  - 화살표 레이어             │    │
│  │ 노선 목록        │  └──────────────────────────────┘    │
│  └──────────────────┘  ┌──────────────────────────────┐    │
│  ┌──────────────────┐  │  범례                        │    │
│  │ 환승역 목록      │  └──────────────────────────────┘    │
│  └──────────────────┘                                       │
│  ┌──────────────────┐                                       │
│  │ 선택된 역 정보   │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 핵심 설계 패턴

### 1. Container-Presenter 패턴

- **Container**: `MetroMapContainer` - 로직과 상태 관리
- **Presenter**: `MetroMap` - UI 렌더링만 담당
- **장점**: 관심사 분리, 테스트 용이성, 재사용성

### 2. Custom Hooks 패턴

- **useMetroMap**: 지도 관련 로직 캡슐화
- **useRouteState**: 경로 상태 관리 캡슐화
- **장점**: 로직 재사용, 컴포넌트 단순화

### 3. Ref 기반 외부 라이브러리 통합

- Leaflet 객체를 Ref로 관리
- React 상태와 분리하여 성능 최적화
- **장점**: 불필요한 리렌더링 방지

### 4. 헬퍼 함수 분리

- `mapHelpers.ts`로 DOM 조작 로직 분리
- 순수 함수로 구현하여 테스트 용이
- **장점**: 코드 재사용, 유지보수성

### 5. 타입 중심 설계

- 모든 데이터 구조를 TypeScript 인터페이스로 정의
- 컴파일 타임 타입 체크
- **장점**: 버그 조기 발견, IDE 자동완성

---

## 🚀 성능 최적화 기법

### 1. useCallback 메모이제이션

```typescript
const handleStationSelect = useCallback(
  (station: Station, role: "start" | "end") => {
    // ...
  },
  [setStartStation, setEndStation]
);
```

- 함수 재생성 방지
- 자식 컴포넌트 불필요한 리렌더링 방지

### 2. Ref 기반 Leaflet 관리

```typescript
const mapRef = useRef<L.Map | null>(null);
const markersRef = useRef<Map<string, L.Marker>>(new Map());
```

- React 상태 변경 없이 Leaflet 객체 제어
- 렌더링 사이클과 독립적

### 3. 레이어 분리

```typescript
const routeLayerRef = useRef<L.LayerGroup | null>(null);
const arrowLayerRef = useRef<L.LayerGroup | null>(null);
```

- 경로와 화살표를 별도 레이어로 관리
- 부분 업데이트 가능

### 4. 조건부 렌더링

```typescript
{
  selectedStation && <Card>...</Card>;
}
{
  routeHistory.length > 0 && <div>...</div>;
}
```

- 필요한 컴포넌트만 렌더링
- DOM 노드 수 최소화

---

## 📝 코드 품질 관리

### 1. TypeScript 엄격 모드

- 모든 변수와 함수에 명시적 타입 지정
- `null` 체크 강제
- 타입 안전성 보장

### 2. 에러 처리

```typescript
if (!result) {
  updateInfoText("경로를 찾지 못했습니다.");
  clearRoute();
  return;
}
```

- 모든 실패 케이스 처리
- 사용자에게 명확한 피드백

### 3. 방어적 프로그래밍

```typescript
if (!a || !b) {
  console.error("❗[경로 분석] nodeMeta에 없는 key");
  continue;
}
```

- 예상치 못한 상황 대비
- 로그를 통한 디버깅 지원

### 4. 클린업 함수

```typescript
return () => {
  if (mapRef.current) {
    mapRef.current.remove();
    mapRef.current = null;
  }
  markersRef.current.clear();
};
```

- 메모리 누수 방지
- 리소스 정리

---

## 🎓 학습 포인트

### 1. Leaflet 통합

- React와 Leaflet의 라이프사이클 차이 이해
- Ref를 사용한 외부 라이브러리 통합 패턴

### 2. 그래프 알고리즘

- Dijkstra 알고리즘 구현
- 환승을 고려한 그래프 모델링

### 3. 상태 관리

- 로컬 상태와 전역 상태 구분
- Custom Hooks를 통한 상태 로직 캡슐화

### 4. 성능 최적화

- 메모이제이션 기법
- 불필요한 리렌더링 방지

### 5. 타입 시스템

- TypeScript 고급 타입 활용
- 타입 안전성과 개발 생산성

---

이 문서는 프로젝트의 모든 주요 컴포넌트, 훅, 유틸리티 함수를 상세하게 분석하여 코드의 동작 원리와 설계 의도를 명확히 설명합니다. 각 함수의 역할, 매개변수, 반환값, 그리고 내부 로직까지 깊이 있게 다루어 프로젝트를 완전히 이해할 수 있도록 구성했습니다.
