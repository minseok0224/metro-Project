# 🗺️ MetroMap.tsx 구조 가이드

> MetroMapContainer.tsx를 정리했으니, 이제 MetroMap.tsx를 같은 방식으로 정리해봅시다!

---

## 📋 MetroMap.tsx 구조

### 1. 역할 정의

**MetroMap.tsx (프레젠테이셔널 컴포넌트)**

- 부모(MetroMapContainer)로부터 **모든 데이터를 props로 받음**
- **UI 렌더링만 담당** (JSX 중심)
- **로컬 UI 상태만 관리** (검색 기능)
- 사용자 이벤트를 **부모에게 전달**

---

## 🎯 MetroMap.tsx 작성 가이드

### 1. Props 인터페이스 정의

```typescript
interface MetroMapProps {
  // 📍 지도 관련
  mapContainerRef: RefObject<HTMLDivElement | null>; // 지도 DOM 참조

  // 🎨 선택 상태 (부모로부터 받음)
  selectedStation: Station | null; // 현재 선택된 역
  selectedLine: string | null; // 현재 선택된 노선

  // 📊 데이터 (부모로부터 받음)
  subwayLines: SubwayLine[]; // 모든 노선 정보
  transferStations: Station[]; // 환승역 목록
  stations: Station[]; // 모든 역 정보

  // 🚇 경로 상태 (부모로부터 받음)
  startStation: Station | null; // 출발역
  endStation: Station | null; // 도착역
  routeHistory: RouteHistoryItem[]; // 경로 이력

  // 🎬 액션 함수들 (부모의 함수를 받아서 호출)
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}
```

**Props의 3가지 종류**:

1. **데이터 Props**: 화면에 표시할 데이터 (stations, subwayLines 등)
2. **상태 Props**: 현재 선택된 것들 (selectedStation, selectedLine 등)
3. **함수 Props**: 사용자 클릭 시 호출할 함수 (zoomToStation, highlightLine 등)

---

### 2. 로컬 상태 관리 (검색 기능만)

```typescript
const MetroMap = ({
  mapContainerRef,
  selectedStation,
  selectedLine,
  stations,
}: // ... 나머지 props
MetroMapProps) => {
  // 🔍 로컬 검색 상태 (이 컴포넌트에서만 사용)
  const [searchValue, setSearchValue] = useState("");
  const [searchList, setSearchList] = useState<Station[]>([]);

  // 검색 로직: searchValue가 변경될 때마다 실행
  useEffect(() => {
    if (!searchValue) {
      setSearchList([]); // 검색어 없으면 빈 배열
    } else {
      // 역 이름으로 필터링
      setSearchList(stations.filter((st) => st.name.includes(searchValue)));
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

---

### 3. UI 렌더링 구조

```typescript
return (
  <div style={{ height: "100%", display: "flex", gap: "16px" }}>
    {/* 📱 사이드 패널 (350px 고정) */}
    <div
      style={{
        width: "350px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 1️⃣ 검색 & 이력 카드 */}
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

      {/* 2️⃣ 컨트롤 패널 */}
      <Card title='🚇 노선도'>
        <Button onClick={resetView}>전체 보기</Button> {/* 부모 함수 호출 */}
      </Card>

      {/* 3️⃣ 스크롤 가능한 영역 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* 노선 목록 */}
        <Card title='🚉 지하철 노선'>
          {subwayLines.map((line) => (
            <Button
              key={line.id}
              type={selectedLine === line.id ? "primary" : "default"}
              onClick={() => highlightLine(line.id)} // 부모 함수 호출
              style={{
                backgroundColor:
                  selectedLine === line.id ? line.color : "white",
                color: selectedLine === line.id ? "white" : line.color,
              }}
            >
              {line.name}
            </Button>
          ))}
        </Card>

        {/* 환승역 목록 */}
        <Card title='🔄 주요 환승역'>
          {transferStations.map((station) => (
            <Button
              key={station.id}
              type={selectedStation?.id === station.id ? "primary" : "default"}
              onClick={() => zoomToStation(station)} // 부모 함수 호출
            >
              {station.name}
            </Button>
          ))}
        </Card>

        {/* 선택된 역 정보 (조건부 렌더링) */}
        {selectedStation && (
          <Card title='ℹ️ 역 정보'>
            <Title>{selectedStation.name}</Title>
            <Text>{selectedStation.description}</Text>
          </Card>
        )}
      </div>
    </div>

    {/* 🗺️ 지도 영역 (flex: 1) */}
    <div style={{ flex: 1 }}>
      {/* Leaflet 지도 컨테이너 */}
      <div ref={mapContainerRef} style={{ flex: 1 }} />

      {/* 범례 */}
      <Card>
        {subwayLines.map((line) => (
          <span key={line.id}>
            <div style={{ backgroundColor: line.color }} />
            {line.name}
          </span>
        ))}
      </Card>
    </div>
  </div>
);
```

---

## 📝 작성 템플릿

### 전체 구조

```typescript
// 1️⃣ Import
import { useState, useEffect } from "react";
import { Card, Button, Typography } from "antd";
import type { Station, SubwayLine, RouteHistoryItem } from "../data/types";
import SearchHistoryCard from "./SearchHistoryCard";

// 2️⃣ Props 인터페이스
interface MetroMapProps {
  // 지도 관련
  mapContainerRef: RefObject<HTMLDivElement | null>;

  // 선택 상태
  selectedStation: Station | null;
  selectedLine: string | null;

  // 데이터
  subwayLines: SubwayLine[];
  stations: Station[];
  transferStations: Station[];

  // 경로 상태
  startStation: Station | null;
  endStation: Station | null;
  routeHistory: RouteHistoryItem[];

  // 액션 함수들
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}

// 3️⃣ 컴포넌트
const MetroMap = ({
  mapContainerRef,
  selectedStation,
  selectedLine,
  subwayLines,
  stations,
  transferStations,
  startStation,
  endStation,
  routeHistory,
  zoomToStation,
  highlightLine,
  resetView,
  setStartStation,
  setEndStation,
  onHistoryClick,
  onRemoveHistory,
}: MetroMapProps) => {

  // 4️⃣ 로컬 상태 (검색 기능)
  const [searchValue, setSearchValue] = useState("");
  const [searchList, setSearchList] = useState<Station[]>([]);

  // 5️⃣ useEffect (검색 로직)
  useEffect(() => {
    if (!searchValue) {
      setSearchList([]);
    } else {
      setSearchList(stations.filter(st => st.name.includes(searchValue)));
    }
  }, [searchValue, stations]);

  // 6️⃣ UI 렌더링
  return (
    <div>
      {/* 사이드 패널 */}
      <div>
        <SearchHistoryCard ... />
        <Card>노선 목록</Card>
        <Card>환승역 목록</Card>
        {selectedStation && <Card>역 정보</Card>}
      </div>

      {/* 지도 영역 */}
      <div ref={mapContainerRef} />
    </div>
  );
};

// 7️⃣ Export
export default MetroMap;
```

---

## 🎯 핵심 포인트

### MetroMap.tsx가 하는 일

```typescript
✅ Props 받기
   - 부모로부터 데이터, 상태, 함수를 받음
   - 15개 이상의 props를 받음

✅ 로컬 상태 관리
   - searchValue (검색어)
   - searchList (검색 결과)
   - 이 컴포넌트에서만 사용하는 상태

✅ 간단한 로직
   - 검색 필터링 (useEffect)
   - 조건부 렌더링 (selectedStation && ...)

✅ UI 렌더링
   - 사이드 패널 (검색, 노선, 환승역, 역 정보)
   - 지도 영역 (Leaflet 컨테이너)
   - 범례

✅ 이벤트 전달
   - 사용자 클릭 → 부모 함수 호출
   - onClick={() => highlightLine(line.id)}
```

### MetroMap.tsx가 하지 않는 일

```typescript
❌ 데이터 가져오기
   - stations, subwayLines를 import 하지 않음
   - 부모로부터 props로 받음

❌ 복잡한 로직
   - 경로 탐색 (dijkstra) 하지 않음
   - 커스텀 훅 사용하지 않음

❌ 상태 관리
   - selectedStation, selectedLine을 관리하지 않음
   - 부모로부터 props로 받음

❌ 직접 상태 변경
   - setSelectedStation 같은 함수를 직접 만들지 않음
   - 부모의 함수를 호출만 함
```

---

## 📊 데이터 흐름

### 부모 → 자식 (Props)

```
MetroMapContainer
  ↓ props
  ├─ stations (데이터)
  ├─ selectedStation (상태)
  ├─ highlightLine (함수)
  └─ ...
  ↓
MetroMap
  ↓ 렌더링
  <Button onClick={() => highlightLine(line.id)}>
```

### 자식 → 부모 (함수 호출)

```
MetroMap
  ↓ 사용자 클릭
  <Button onClick={() => highlightLine("2")}>
  ↓ 함수 호출
MetroMapContainer
  ↓ 상태 변경
  setSelectedLine("2")
  ↓ 리렌더링
MetroMap
  ↓ props 업데이트
  selectedLine = "2"
  ↓ UI 업데이트
  버튼 스타일 변경 (선택된 노선 강조)
```

---

## 🎨 스타일링 패턴

### 동적 스타일링

```typescript
// 선택된 노선에 따라 스타일 변경
<Button
  type={selectedLine === line.id ? "primary" : "default"}
  style={{
    backgroundColor: selectedLine === line.id ? line.color : "white",
    color: selectedLine === line.id ? "white" : line.color,
  }}
>
  {line.name}
</Button>
```

### 조건부 렌더링

```typescript
// 선택된 역이 있을 때만 표시
{
  selectedStation && (
    <Card title='ℹ️ 역 정보'>
      <Title>{selectedStation.name}</Title>
    </Card>
  );
}

// 환승역일 때만 태그 표시
{
  selectedStation.isTransfer && <Tag color='red'>환승역</Tag>;
}
```

---

## 🔄 이벤트 처리 패턴

### 패턴 1: 직접 호출

```typescript
<Button onClick={resetView}>전체 보기</Button>
```

### 패턴 2: 인자 전달

```typescript
<Button onClick={() => highlightLine(line.id)}>{line.name}</Button>
```

### 패턴 3: 이벤트 버블링 방지

```typescript
<Button
  onClick={(e) => {
    e.stopPropagation(); // 부모 요소의 onClick 방지
    highlightLine(line.id);
  }}
>
  {line.name}
</Button>
```

---

## 📋 체크리스트

### MetroMap.tsx 작성 시 확인사항

```
✅ Props 인터페이스 정의했나?
✅ 모든 props를 구조 분해 할당으로 받았나?
✅ 로컬 상태는 최소한으로만 사용했나?
✅ 부모의 함수를 직접 호출하고 있나?
✅ 복잡한 로직은 없나? (있으면 부모로 이동)
✅ 조건부 렌더링을 적절히 사용했나?
✅ 동적 스타일링을 적용했나?
✅ 이벤트 버블링을 고려했나?
```

---

## 🎯 최종 정리

### MetroMap.tsx 한 줄 요약

```
"부모로부터 모든 것을 받아서, UI만 그리고, 클릭을 부모에게 전달"
```

### 작성 순서

```
1. Props 인터페이스 정의
   ↓
2. 로컬 상태 정의 (검색 기능)
   ↓
3. useEffect 작성 (검색 로직)
   ↓
4. UI 렌더링 (JSX)
   ↓
5. Export
```

### 핵심 원칙

```
✅ Props로 받은 데이터만 사용
✅ Props로 받은 함수만 호출
✅ 로컬 상태는 최소한으로
✅ 복잡한 로직은 부모에게
✅ UI 렌더링에만 집중
```

---

이제 MetroMap.tsx를 작성할 준비가 되었나요? 🎯

위 가이드를 따라서 작성하면, MetroMapContainer.tsx와 완벽하게 조화를 이루는 깔끔한 컴포넌트를 만들 수 있습니다! 😊
