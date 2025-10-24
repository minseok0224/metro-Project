# ⏰ useEffect는 정확히 "언제" 체크하나요?

> "useEffect는 언제마다 출발지 및 도착지 여부를 체크하는거야?"

---

## 🎯 정답: 컴포넌트가 렌더링될 때마다!

```typescript
useEffect(() => {
  if (!startStation || !endStation) return;
  // 경로 탐색...
}, [startStation, endStation]);
```

**핵심**: useEffect는 **컴포넌트가 렌더링된 후**에 실행됩니다.

---

## 📊 정확한 실행 타이밍

### React 렌더링 사이클

```
1. 상태 변경 (setState 호출)
   ↓
2. 컴포넌트 함수 실행 (렌더링)
   ↓
3. 가상 DOM 생성
   ↓
4. 실제 DOM 업데이트
   ↓
5. useEffect 실행 ← 여기서 체크!
```

### 구체적인 예시

```typescript
const MetroMapContainer = () => {
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);

  console.log("1. 컴포넌트 렌더링 시작");

  useEffect(() => {
    console.log("3. useEffect 실행!");
    console.log("   startStation:", startStation);
    console.log("   endStation:", endStation);

    if (!startStation || !endStation) {
      console.log("   → 조건 불만족, return");
      return;
    }

    console.log("   → 조건 만족, 경로 탐색 시작!");
  }, [startStation, endStation]);

  console.log("2. 컴포넌트 렌더링 끝");

  return <div>...</div>;
};
```

---

## 🔍 실제 동작 시나리오

### 시나리오 1: 초기 렌더링

```
[앱 시작]

1. 컴포넌트 렌더링 시작
   startStation = null
   endStation = null

2. 컴포넌트 렌더링 끝

3. useEffect 실행
   → 의존성 배열 [null, null]
   → if (!null || !null) return; 실행
   → 종료

콘솔 출력:
1. 컴포넌트 렌더링 시작
2. 컴포넌트 렌더링 끝
3. useEffect 실행!
   startStation: null
   endStation: null
   → 조건 불만족, return
```

### 시나리오 2: 출발지 선택

```
[사용자가 "강남역" 클릭]

→ setStartStation(강남역) 호출

1. 컴포넌트 렌더링 시작
   startStation = 강남역 ← 변경됨!
   endStation = null

2. 컴포넌트 렌더링 끝

3. useEffect 실행
   → 의존성 배열 [강남역, null]
   → 이전 값 [null, null]과 비교
   → 다르다! 실행!
   → if (!강남역 || !null) return; 실행
   → 종료

콘솔 출력:
1. 컴포넌트 렌더링 시작
2. 컴포넌트 렌더링 끝
3. useEffect 실행!
   startStation: 강남역
   endStation: null
   → 조건 불만족, return
```

### 시나리오 3: 도착지 선택

```
[사용자가 "역삼역" 클릭]

→ setEndStation(역삼역) 호출

1. 컴포넌트 렌더링 시작
   startStation = 강남역
   endStation = 역삼역 ← 변경됨!

2. 컴포넌트 렌더링 끝

3. useEffect 실행
   → 의존성 배열 [강남역, 역삼역]
   → 이전 값 [강남역, null]과 비교
   → 다르다! 실행!
   → if (!강남역 || !역삼역)
   → 둘 다 있음! 조건 통과!
   → 경로 탐색 실행! ✅

콘솔 출력:
1. 컴포넌트 렌더링 시작
2. 컴포넌트 렌더링 끝
3. useEffect 실행!
   startStation: 강남역
   endStation: 역삼역
   → 조건 만족, 경로 탐색 시작!
```

---

## 🤔 그럼 계속 체크하는 건가요?

### 아니요! 의존성이 변경될 때만 체크합니다.

```typescript
useEffect(() => {
  console.log("체크!");
}, [startStation, endStation]);
```

**실행 조건**:

1. ✅ 초기 렌더링 (컴포넌트가 처음 마운트될 때)
2. ✅ `startStation`이 변경될 때
3. ✅ `endStation`이 변경될 때
4. ❌ 다른 상태가 변경될 때는 실행 안 됨!

### 예시: 다른 상태 변경

```typescript
const MetroMapContainer = () => {
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null); // 다른 상태

  useEffect(() => {
    console.log("경로 탐색 useEffect 실행!");
  }, [startStation, endStation]); // selectedLine은 의존성에 없음!

  // ...
};
```

**동작**:

```
[사용자가 노선 버튼 클릭]
→ setSelectedLine("2") 호출
→ 컴포넌트 렌더링
→ useEffect 실행 안 됨! ❌
   (의존성 배열에 selectedLine이 없으므로)

[사용자가 출발지 선택]
→ setStartStation(강남역) 호출
→ 컴포넌트 렌더링
→ useEffect 실행됨! ✅
   (의존성 배열에 startStation이 있으므로)
```

---

## 🔬 의존성 배열의 비교 방식

### React는 어떻게 "변경"을 감지하나요?

```typescript
useEffect(() => {
  // ...
}, [startStation, endStation]);
```

**비교 방식**: `Object.is()` 사용 (얕은 비교)

```javascript
// 이전 렌더링
이전 startStation = null
이전 endStation = null

// 현재 렌더링
현재 startStation = 강남역 객체
현재 endStation = null

// React의 비교
Object.is(null, 강남역 객체) → false (다름!)
Object.is(null, null) → true (같음!)

// 결과: 하나라도 다르면 useEffect 실행!
```

### 객체 비교 주의사항

```typescript
// ⚠️ 주의: 객체는 참조로 비교됨!

const station1 = { id: "S1", name: "강남" };
const station2 = { id: "S1", name: "강남" };

Object.is(station1, station2); // false! (다른 객체)
Object.is(station1, station1); // true (같은 객체)
```

---

## 📈 전체 타임라인

### 상세 실행 순서

```
[초기 렌더링]
0ms: 앱 시작
1ms: MetroMapContainer 함수 실행
2ms: useState 초기화 (startStation = null, endStation = null)
3ms: JSX 반환
4ms: DOM 업데이트
5ms: useEffect 실행 ← 여기서 체크!
     → 조건 불만족, return

[10초 후 - 사용자가 출발지 클릭]
10000ms: setStartStation(강남역) 호출
10001ms: React가 리렌더링 스케줄링
10002ms: MetroMapContainer 함수 재실행
10003ms: startStation = 강남역 (새 값)
10004ms: JSX 반환
10005ms: DOM 업데이트
10006ms: useEffect 실행 ← 여기서 체크!
         → startStation 변경 감지
         → 조건 불만족 (endStation이 null), return

[15초 후 - 사용자가 도착지 클릭]
15000ms: setEndStation(역삼역) 호출
15001ms: React가 리렌더링 스케줄링
15002ms: MetroMapContainer 함수 재실행
15003ms: endStation = 역삼역 (새 값)
15004ms: JSX 반환
15005ms: DOM 업데이트
15006ms: useEffect 실행 ← 여기서 체크!
         → endStation 변경 감지
         → 조건 만족! (둘 다 있음)
         → 경로 탐색 실행! ✅
```

---

## 💡 핵심 정리

### Q: useEffect는 언제마다 체크하나요?

**A: 컴포넌트가 렌더링된 후, 의존성 배열의 값이 변경되었을 때!**

### 구체적으로:

1. **초기 렌더링 시** (컴포넌트가 처음 마운트될 때)

   ```
   → useEffect 실행
   → 출발지/도착지 체크
   ```

2. **startStation이 변경될 때**

   ```
   → setState 호출
   → 컴포넌트 리렌더링
   → useEffect 실행
   → 출발지/도착지 체크
   ```

3. **endStation이 변경될 때**

   ```
   → setState 호출
   → 컴포넌트 리렌더링
   → useEffect 실행
   → 출발지/도착지 체크
   ```

4. **다른 상태가 변경될 때는?**
   ```
   → 컴포넌트 리렌더링
   → useEffect 실행 안 됨! ❌
   (의존성 배열에 없으므로)
   ```

---

## 🎓 비유로 이해하기

### 비유 1: 자동문

```
useEffect = 자동문 센서

의존성 배열 = 센서가 감지하는 대상

[startStation, endStation] = "이 두 사람만 감지해!"

동작:
- startStation이 지나감 → 센서 작동 → 문 열림 (useEffect 실행)
- endStation이 지나감 → 센서 작동 → 문 열림 (useEffect 실행)
- 다른 사람이 지나감 → 센서 무반응 → 문 안 열림 (useEffect 실행 안 됨)
```

### 비유 2: 알람

```
useEffect = 알람

의존성 배열 = 알람 조건

[startStation, endStation] = "이 값들이 바뀌면 알려줘!"

동작:
- startStation 변경 → 알람 울림 → 체크 실행
- endStation 변경 → 알람 울림 → 체크 실행
- 다른 값 변경 → 알람 안 울림 → 체크 안 함
```

---

## 🔍 실험해보기

### 코드에 로그 추가

```typescript
const MetroMapContainer = () => {
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);

  console.log("🔄 컴포넌트 렌더링!", {
    startStation: startStation?.name,
    endStation: endStation?.name,
    selectedLine,
  });

  useEffect(() => {
    console.log("✅ useEffect 실행!", {
      startStation: startStation?.name,
      endStation: endStation?.name,
    });

    if (!startStation || !endStation) {
      console.log("❌ 조건 불만족");
      return;
    }

    console.log("🎯 경로 탐색 시작!");
  }, [startStation, endStation]);

  // ...
};
```

### 예상 출력

```
[앱 시작]
🔄 컴포넌트 렌더링! { startStation: undefined, endStation: undefined, selectedLine: null }
✅ useEffect 실행! { startStation: undefined, endStation: undefined }
❌ 조건 불만족

[출발지 선택]
🔄 컴포넌트 렌더링! { startStation: '강남', endStation: undefined, selectedLine: null }
✅ useEffect 실행! { startStation: '강남', endStation: undefined }
❌ 조건 불만족

[노선 선택] ← 주목!
🔄 컴포넌트 렌더링! { startStation: '강남', endStation: undefined, selectedLine: '2' }
(useEffect 실행 안 됨! selectedLine은 의존성에 없음)

[도착지 선택]
🔄 컴포넌트 렌더링! { startStation: '강남', endStation: '역삼', selectedLine: '2' }
✅ useEffect 실행! { startStation: '강남', endStation: '역삼' }
🎯 경로 탐색 시작!
```

---

## 🎯 최종 답변

### Q: useEffect는 언제마다 출발지 및 도착지 여부를 체크하는거야?

**A: 정확히 3번 체크합니다!**

1. **앱이 처음 시작될 때** (초기 렌더링)
2. **출발지가 변경될 때** (startStation 변경)
3. **도착지가 변경될 때** (endStation 변경)

**체크하지 않는 경우**:

- 다른 상태가 변경될 때 (selectedLine, selectedStation 등)
- 부모 컴포넌트가 리렌더링되어도 의존성이 안 바뀌면 실행 안 됨

**핵심**:

- useEffect는 "계속" 체크하는 게 아니라
- 의존성 배열의 값이 **변경될 때만** 체크합니다!
- 마치 "변경 감지 센서"처럼 동작합니다! 🎯

---

이제 명확해졌나요? useEffect는 매 순간 체크하는 게 아니라, 의존성 배열에 있는 값들이 변경될 때만 실행됩니다! 😊
