# ⏰ useEffect로 경로 탐색 시점 제어하기

> "useEffect로 경로 탐색 시점 제어"가 정확히 무슨 의미인가요?

---

## 🤔 문제 상황: 언제 경로를 탐색해야 할까?

### 시나리오

```
사용자 행동:
1. 출발지 선택 (강남역)
2. 도착지 선택 (역삼역)
3. 경로 표시!

❓ 질문: 경로 탐색은 "언제" 실행되어야 할까요?
```

### 잘못된 방법들

#### ❌ 방법 1: 버튼 클릭 시 실행

```typescript
const MetroMapContainer = () => {
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);

  const handleSearchRoute = () => {
    if (startStation && endStation) {
      const result = dijkstraWithTransfers(startStation, endStation, ...);
      drawRoute(result);
    }
  };

  return (
    <div>
      <Button onClick={handleSearchRoute}>경로 찾기</Button>
    </div>
  );
};
```

**문제점**:

- 사용자가 버튼을 클릭해야만 경로가 표시됨
- 출발지와 도착지를 선택했는데도 자동으로 경로가 안 나옴
- UX가 나쁨 (불필요한 클릭 추가)

#### ❌ 방법 2: 도착지 선택 함수 안에서 실행

```typescript
const handleEndStationSelect = (station: Station) => {
  setEndStation(station);

  // 여기서 바로 경로 탐색?
  if (startStation && station) {
    const result = dijkstraWithTransfers(startStation, station, ...);
    drawRoute(result);
  }
};
```

**문제점**:

- `setEndStation`은 비동기입니다!
- 상태가 즉시 업데이트되지 않음
- 경로 탐색이 실행될 때 `endStation`이 아직 `null`일 수 있음
- 코드가 여러 곳에 흩어짐 (출발지 선택, 도착지 선택 각각에 로직 필요)

---

## ✅ 올바른 방법: useEffect 사용

### 코드

```typescript
const MetroMapContainer = () => {
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);

  // 🎯 핵심: useEffect로 경로 탐색 시점 제어
  useEffect(() => {
    // 1. 조건 확인: 출발지와 도착지가 모두 있을 때만 실행
    if (!startStation || !endStation) {
      // 둘 중 하나라도 없으면 아무것도 안 함
      return;
    }

    // 2. 경로 탐색 실행
    const result = dijkstraWithTransfers(
      startStation,
      endStation,
      stations,
      edges,
      EDGE_STOP_MIN,
      EDGE_TRANSFER_MIN
    );

    // 3. 결과 처리
    if (!result) {
      updateInfoText("경로를 찾지 못했습니다.");
      clearRoute();
      return;
    }

    // 4. 경로 그리기
    drawRoute(result);

    // 5. 이력에 추가
    addToHistory(startStation, endStation);
  }, [startStation, endStation]);
  // 👆 의존성 배열: 이 값들이 변경될 때마다 useEffect 실행

  // ...
};
```

---

## 🔍 useEffect 동작 원리

### 1. 의존성 배열이란?

```typescript
useEffect(() => {
  // 실행할 코드
}, [startStation, endStation]); // 👈 의존성 배열
```

**의존성 배열의 역할**:

- 이 배열에 있는 값들이 **변경될 때마다** useEffect 내부 코드가 실행됩니다
- React가 자동으로 감지하고 실행해줍니다

### 2. 실행 시점 예시

```typescript
// 초기 상태
startStation = null;
endStation = null;
// → useEffect 실행됨 (초기 렌더링)
// → if (!startStation || !endStation) return; 으로 종료

// 사용자가 출발지 선택 (강남역)
setStartStation(강남역);
// → startStation = 강남역
// → useEffect 실행됨 (startStation 변경됨)
// → if (!startStation || !endStation) return; 으로 종료 (endStation이 아직 null)

// 사용자가 도착지 선택 (역삼역)
setEndStation(역삼역);
// → endStation = 역삼역
// → useEffect 실행됨 (endStation 변경됨)
// → 이제 둘 다 있으므로 경로 탐색 실행! ✅
```

### 3. 타임라인 다이어그램

```
시간 →

[초기 렌더링]
  startStation: null
  endStation: null
  ↓
  useEffect 실행
  ↓
  조건 체크: null이므로 return
  ↓
  (아무 일도 안 일어남)

[사용자가 출발지 선택]
  startStation: 강남역 ← 변경됨!
  endStation: null
  ↓
  useEffect 실행 (startStation 변경 감지)
  ↓
  조건 체크: endStation이 null이므로 return
  ↓
  (아무 일도 안 일어남)

[사용자가 도착지 선택]
  startStation: 강남역
  endStation: 역삼역 ← 변경됨!
  ↓
  useEffect 실행 (endStation 변경 감지)
  ↓
  조건 체크: 둘 다 있음! ✅
  ↓
  경로 탐색 실행
  ↓
  지도에 경로 그리기
  ↓
  이력에 추가
```

---

## 🎯 "시점 제어"의 의미

### 제어하는 것들

#### 1. **언제 실행할지** 제어

```typescript
useEffect(() => {
  // startStation이나 endStation이 변경될 때만 실행
}, [startStation, endStation]);
```

- 버튼 클릭 필요 없음
- 자동으로 적절한 시점에 실행
- 사용자 경험 향상

#### 2. **실행 조건** 제어

```typescript
useEffect(() => {
  // 조건: 둘 다 있을 때만
  if (!startStation || !endStation) return;

  // 경로 탐색 실행
}, [startStation, endStation]);
```

- 불완전한 상태에서는 실행 안 함
- 에러 방지

#### 3. **실행 순서** 제어

```typescript
useEffect(() => {
  // 1. 경로 탐색
  const result = dijkstraWithTransfers(...);

  // 2. 결과 확인
  if (!result) {
    clearRoute();
    return;
  }

  // 3. 경로 그리기
  drawRoute(result);

  // 4. 이력 추가
  addToHistory(startStation, endStation);

}, [startStation, endStation]);
```

- 순차적으로 실행
- 각 단계가 완료된 후 다음 단계 진행

---

## 🆚 다른 방법들과 비교

### 방법 1: 버튼 클릭

```typescript
// ❌ 수동 실행
<Button onClick={handleSearchRoute}>경로 찾기</Button>

// 문제:
// - 사용자가 버튼을 클릭해야 함
// - 불편함
// - 버튼을 깜빡할 수 있음
```

### 방법 2: 상태 변경 함수 안에서

```typescript
// ❌ 상태 변경 함수 안에서 실행
const setEndStation = (station) => {
  setEndStation(station);
  findRoute(); // 여기서 실행?
};

// 문제:
// - setState는 비동기!
// - 상태가 즉시 업데이트 안 됨
// - 타이밍 이슈 발생
```

### 방법 3: useEffect (현재 방법)

```typescript
// ✅ useEffect 사용
useEffect(() => {
  if (startStation && endStation) {
    findRoute();
  }
}, [startStation, endStation]);

// 장점:
// - 자동 실행
// - 상태 업데이트 후 실행 보장
// - 코드가 한 곳에 모임
// - 타이밍 이슈 없음
```

---

## 🔄 실제 동작 흐름

### 전체 플로우

```
1. 사용자가 출발지 선택
   ↓
2. setStartStation(강남역) 호출
   ↓
3. React가 상태 업데이트
   ↓
4. 컴포넌트 리렌더링
   ↓
5. useEffect 실행 (startStation 변경 감지)
   ↓
6. 조건 체크: endStation이 없으므로 return
   ↓
7. 사용자가 도착지 선택
   ↓
8. setEndStation(역삼역) 호출
   ↓
9. React가 상태 업데이트
   ↓
10. 컴포넌트 리렌더링
    ↓
11. useEffect 실행 (endStation 변경 감지)
    ↓
12. 조건 체크: 둘 다 있음! ✅
    ↓
13. dijkstraWithTransfers 실행
    ↓
14. 경로 계산 완료
    ↓
15. drawRoute로 지도에 그리기
    ↓
16. addToHistory로 이력 추가
    ↓
17. 사용자에게 경로 표시 완료!
```

---

## 💡 왜 이 방법이 좋은가?

### 1. 자동화

```typescript
// 사용자 입장:
// 1. 출발지 클릭
// 2. 도착지 클릭
// 3. 자동으로 경로 표시! ✨

// 버튼 클릭 필요 없음
// 추가 액션 필요 없음
```

### 2. 타이밍 보장

```typescript
// setState는 비동기지만
// useEffect는 상태 업데이트 후에 실행됨
// → 항상 최신 상태로 경로 탐색
```

### 3. 코드 집중화

```typescript
// 경로 탐색 로직이 한 곳에 모임
// 여러 곳에 흩어지지 않음
// 유지보수 쉬움
```

### 4. 선언적 프로그래밍

```typescript
// "어떻게" 실행할지가 아니라
// "언제" 실행할지를 선언
useEffect(() => {
  // 경로 탐색
}, [startStation, endStation]); // "이 값들이 변경되면 실행해줘"
```

---

## 🎓 추가 예시: 다른 useEffect 사용 사례

### 예시 1: 정보 텍스트 업데이트

```typescript
// 출발지/도착지 변경 시 정보 텍스트 업데이트
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
```

**시점 제어**:

- 출발지나 도착지가 변경될 때마다 자동으로 정보 텍스트 업데이트
- 사용자에게 현재 상태를 실시간으로 알려줌

### 예시 2: 출발지/도착지 마커 하이라이트

```typescript
// useMetroMap.ts 내부
useEffect(() => {
  highlightStationCircles({
    start: startStation?.id,
    end: endStation?.id,
  });
}, [startStation, endStation]);
```

**시점 제어**:

- 출발지나 도착지가 변경될 때마다 마커 하이라이트 업데이트
- 지도에서 시각적으로 표시

### 예시 3: 노선 필터링

```typescript
// useMetroMap.ts 내부
useEffect(() => {
  if (!selectedLine) {
    // 전체 보기
    polylinesRef.current.forEach((polyline) => {
      polyline.setStyle({ opacity: 0.8 });
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
  }
}, [selectedLine]);
```

**시점 제어**:

- 선택된 노선이 변경될 때마다 지도 필터링
- 자동으로 노선 강조/흐리게 처리

---

## 🚫 흔한 실수들

### 실수 1: 의존성 배열 누락

```typescript
// ❌ 나쁜 예
useEffect(() => {
  if (startStation && endStation) {
    findRoute(startStation, endStation);
  }
}, []); // 빈 배열 → 한 번만 실행됨!

// 문제:
// - startStation이나 endStation이 변경되어도 실행 안 됨
// - 경로가 업데이트 안 됨
```

### 실수 2: 의존성 배열에 함수 포함

```typescript
// ❌ 나쁜 예
useEffect(() => {
  findRoute();
}, [findRoute]); // 함수를 의존성에 넣으면 매번 실행됨!

// 해결:
// - 함수를 useCallback으로 메모이제이션
// - 또는 의존성에서 제거하고 필요한 값만 포함
```

### 실수 3: 조건 체크 없이 실행

```typescript
// ❌ 나쁜 예
useEffect(() => {
  // 조건 체크 없이 바로 실행
  const result = dijkstraWithTransfers(startStation, endStation, ...);
  // startStation이나 endStation이 null이면 에러!
}, [startStation, endStation]);

// ✅ 좋은 예
useEffect(() => {
  if (!startStation || !endStation) return; // 조건 체크!
  const result = dijkstraWithTransfers(startStation, endStation, ...);
}, [startStation, endStation]);
```

---

## 🎯 핵심 정리

### "useEffect로 경로 탐색 시점 제어"의 의미

```typescript
useEffect(() => {
  // 이 코드는 "언제" 실행될까?
  // → startStation이나 endStation이 변경될 때!

  // "어떤 조건"에서 실행될까?
  // → 둘 다 있을 때만!

  if (!startStation || !endStation) return;

  // 경로 탐색 실행
  const result = dijkstraWithTransfers(...);
  drawRoute(result);

}, [startStation, endStation]); // 👈 이 값들이 변경되면 실행
```

### 장점

1. ✅ **자동 실행**: 버튼 클릭 필요 없음
2. ✅ **타이밍 보장**: 상태 업데이트 후 실행
3. ✅ **조건 제어**: 불완전한 상태에서 실행 안 함
4. ✅ **코드 집중화**: 로직이 한 곳에 모임
5. ✅ **선언적**: "언제" 실행할지만 선언

### 비유

```
useEffect = 자동 감시 시스템

"출발지나 도착지가 변경되는지 감시하고 있다가,
 둘 다 설정되면 자동으로 경로를 찾아줘!"

사용자는 그냥 출발지와 도착지만 선택하면 됨.
나머지는 React가 알아서 처리! ✨
```

---

이제 "useEffect로 경로 탐색 시점 제어"가 무슨 의미인지 명확해졌나요? 🎯
