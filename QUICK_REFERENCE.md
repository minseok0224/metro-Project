# 빠른 참조 가이드

## 📁 파일 구조 한눈에 보기

```
src/
├── Components/              # 🎨 UI 컴포넌트
│   ├── MetroMapContainer    # 뇌 (로직 관리)
│   ├── MetroMap             # 얼굴 (UI 렌더링)
│   └── SearchHistoryCard    # 검색/이력 UI
│
├── data/                    # 📊 데이터
│   ├── types.ts             # 타입 정의
│   ├── stations.ts          # 역 데이터
│   ├── subwayLines.ts       # 노선 데이터
│   └── edges.ts             # 연결 데이터
│
├── hooks/                   # 🔧 재사용 로직
│   ├── useMetroMap          # 지도 관리
│   └── useRouteState        # 경로 상태 관리
│
└── utils/                   # 🛠️ 헬퍼 함수
    ├── constants.ts         # 상수
    ├── mapHelpers.ts        # 지도 헬퍼
    └── pathfinding.ts       # 경로 탐색 알고리즘
```

---

## 🔄 데이터 흐름

### 경로 탐색 플로우

```
사용자 클릭
    ↓
setStartStation / setEndStation
    ↓
useEffect 트리거 (MetroMapContainer)
    ↓
dijkstraWithTransfers (최단 경로 계산)
    ↓
drawRoute (지도에 경로 그리기)
    ↓
addToHistory (이력 저장)
```

### 노선 필터링 플로우

```
노선 버튼 클릭
    ↓
highlightLine(lineId)
    ↓
selectedLine 상태 업데이트
    ↓
useEffect 트리거 (useMetroMap)
    ↓
opacity 조정 (선택된 노선만 강조)
```

---

## 🎯 주요 React 훅

### useState

```typescript
const [value, setValue] = useState(initialValue);

// 사용
setValue(newValue); // 직접 업데이트
setValue((prev) => prev + 1); // 함수형 업데이트 (권장)
```

### useEffect

```typescript
useEffect(() => {
  // 실행할 코드

  return () => {
    // 클린업 (선택사항)
  };
}, [dependency1, dependency2]); // 의존성 배열
```

**의존성 패턴:**

- `[]`: 마운트 시 한 번만
- `[value]`: value 변경 시마다
- 없음: 매 렌더링마다 (비추천)

### useCallback

```typescript
const memoizedFunc = useCallback(() => {
  // 함수 내용
}, [dependency]);

// 언제 사용?
// - 자식 컴포넌트에 props로 전달하는 함수
// - useEffect의 의존성으로 사용되는 함수
```

### useRef

```typescript
const ref = useRef(initialValue);

// 특징
ref.current = newValue; // 값 변경 (리렌더링 없음)
const value = ref.current; // 값 읽기

// 용도
// 1. DOM 요소 참조
// 2. 인스턴스 저장 (Leaflet map 등)
// 3. 이전 값 저장
```

---

## 💡 TypeScript 핵심

### 타입 정의

```typescript
// Interface
interface User {
  id: string;
  name: string;
  age?: number; // 선택적 속성
}

// Type Alias
type ID = string | number;

// 제네릭
const [items, setItems] = useState<Item[]>([]);
```

### 유용한 타입

```typescript
string | null          // null 가능
string | undefined     // undefined 가능
string[]              // 문자열 배열
Record<string, number> // { [key: string]: number }
```

---

## 🎨 컴포넌트 패턴

### 컨테이너 컴포넌트

```typescript
// 역할: 데이터와 로직 관리
const Container = () => {
  const [state, setState] = useState();
  const { data } = useCustomHook();

  const handleEvent = () => { ... };

  return <Presentational data={data} onEvent={handleEvent} />;
};
```

### 프레젠테이셔널 컴포넌트

```typescript
// 역할: UI 렌더링만
interface Props {
  data: Data;
  onEvent: () => void;
}

const Presentational = ({ data, onEvent }: Props) => {
  return <div onClick={onEvent}>{data.name}</div>;
};
```

---

## 🔧 커스텀 훅 패턴

```typescript
// 1. "use"로 시작
// 2. 다른 훅 사용 가능
// 3. 상태와 함수 반환

export function useMyHook() {
  const [state, setState] = useState();

  const doSomething = useCallback(() => {
    // 로직
  }, []);

  return { state, doSomething };
}

// 사용
const { state, doSomething } = useMyHook();
```

---

## 📝 배열 메서드

```typescript
const items = [1, 2, 3, 4, 5];

// filter: 조건에 맞는 요소만
items.filter((x) => x > 2); // [3, 4, 5]

// map: 각 요소 변환
items.map((x) => x * 2); // [2, 4, 6, 8, 10]

// find: 첫 번째 요소
items.find((x) => x > 2); // 3

// some: 하나라도 있는지
items.some((x) => x > 4); // true

// every: 모두 만족하는지
items.every((x) => x > 0); // true

// reduce: 누적 계산
items.reduce((sum, x) => sum + x, 0); // 15
```

---

## 🚀 불변성 패턴

### 배열

```typescript
// 추가
[...arr, newItem]           // 뒤에 추가
[newItem, ...arr]           // 앞에 추가

// 삭제
arr.filter(item => item.id !== id)

// 수정
arr.map(item => item.id === id ? updated : item)

// 정렬 (원본 유지)
[...arr].sort((a, b) => a - b)
```

### 객체

```typescript
// 수정
{ ...obj, key: newValue }

// 중첩 수정
{ ...obj, nested: { ...obj.nested, key: newValue } }

// 삭제
const { keyToRemove, ...rest } = obj;
```

---

## ⚡ 성능 최적화 체크리스트

- [ ] 함수를 props로 전달할 때 `useCallback` 사용
- [ ] 복잡한 계산은 `useMemo` 사용
- [ ] 리스트 렌더링 시 `key` prop 사용
- [ ] 불필요한 리렌더링 방지 (`React.memo`)
- [ ] 의존성 배열 정확히 관리
- [ ] 큰 컴포넌트는 작게 분리

---

## 🐛 자주 하는 실수

### 1. 의존성 배열 누락

```typescript
// ❌ 나쁜 예
useEffect(() => {
  doSomething(value);
}, []); // value가 변경되어도 실행 안 됨

// ✅ 좋은 예
useEffect(() => {
  doSomething(value);
}, [value]);
```

### 2. 상태 직접 수정

```typescript
// ❌ 나쁜 예
items.push(newItem);
setItems(items);

// ✅ 좋은 예
setItems([...items, newItem]);
```

### 3. 함수형 업데이트 미사용

```typescript
// ❌ 나쁜 예
setCount(count + 1);

// ✅ 좋은 예
setCount((prev) => prev + 1);
```

### 4. key prop 누락

```typescript
// ❌ 나쁜 예
{
  items.map((item) => <div>{item.name}</div>);
}

// ✅ 좋은 예
{
  items.map((item) => <div key={item.id}>{item.name}</div>);
}
```

---

## 📚 학습 로드맵

### 초급 (1-2주)

- [ ] useState, useEffect 기초
- [ ] 컴포넌트 props 전달
- [ ] 조건부 렌더링
- [ ] 리스트 렌더링

### 중급 (2-4주)

- [ ] useCallback, useMemo
- [ ] useRef
- [ ] 커스텀 훅 만들기
- [ ] TypeScript 기초

### 고급 (4주+)

- [ ] 성능 최적화
- [ ] 복잡한 상태 관리
- [ ] 테스트 작성
- [ ] 디자인 패턴

---

## 🔍 디버깅 팁

### 1. console.log 활용

```typescript
useEffect(() => {
  console.log("Effect 실행:", { startStation, endStation });
  // ...
}, [startStation, endStation]);
```

### 2. React DevTools

- 컴포넌트 트리 확인
- Props와 State 검사
- 리렌더링 하이라이트

### 3. 타입 에러 해결

```typescript
// 에러: Type 'null' is not assignable to type 'string'
// 해결: null 허용
const [value, setValue] = useState<string | null>(null);
```

---

## 🎓 추가 학습 자료

- **React 공식 문서**: https://react.dev
- **TypeScript 핸드북**: https://www.typescriptlang.org/docs/
- **MDN Web Docs**: https://developer.mozilla.org/
- **Leaflet 문서**: https://leafletjs.com/

---

## 💬 용어 사전

- **컴포넌트**: UI의 재사용 가능한 블록
- **Props**: 부모에서 자식으로 전달하는 데이터
- **State**: 컴포넌트의 변경 가능한 데이터
- **Hook**: React 기능을 사용하는 함수 (use로 시작)
- **렌더링**: 컴포넌트를 화면에 그리는 과정
- **리렌더링**: 상태 변경 시 다시 그리는 과정
- **의존성**: useEffect나 useCallback이 감시하는 값
- **메모이제이션**: 계산 결과를 캐싱하는 기법
- **불변성**: 원본을 수정하지 않고 새로운 값 생성
- **순수 함수**: 같은 입력 → 같은 출력, 부수 효과 없음

---

이 가이드를 북마크해두고 필요할 때마다 참고하세요! 🚀
