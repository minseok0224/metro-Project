# Implementation Plan

- [x] 1. 데이터 레이어 구축

  - src/data 디렉토리를 생성하고 타입 정의 및 데이터 파일들을 분리합니다
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 타입 정의 파일 생성

  - src/data/types.ts 파일을 생성하고 Station, SubwayLine, Edge, RouteHistoryItem 인터페이스를 정의합니다
  - MetroMapContainer.tsx에서 타입 정의를 추출하여 이동합니다
  - _Requirements: 1.4_

- [x] 1.2 역 데이터 파일 생성

  - src/data/stations.ts 파일을 생성하고 stations 배열을 export합니다
  - MetroMapContainer.tsx에서 stations 배열을 추출하여 이동합니다
  - types.ts에서 Station 타입을 import합니다
  - _Requirements: 1.1_

- [x] 1.3 노선 데이터 파일 생성

  - src/data/subwayLines.ts 파일을 생성하고 subwayLines 배열을 export합니다
  - MetroMapContainer.tsx에서 subwayLines 배열을 추출하여 이동합니다
  - types.ts에서 SubwayLine 타입을 import합니다
  - _Requirements: 1.2_

- [x] 1.4 연결 정보 파일 생성

  - src/data/edges.ts 파일을 생성하고 edges 배열과 상수들을 export합니다
  - MetroMapContainer.tsx에서 edges 배열, EDGE_STOP_MIN, EDGE_TRANSFER_MIN을 추출하여 이동합니다
  - types.ts에서 Edge 타입을 import합니다
  - _Requirements: 1.3_

- [x] 2. 유틸리티 레이어 구축

  - src/utils 디렉토리를 생성하고 비즈니스 로직 및 UI 헬퍼 함수들을 분리합니다
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4_

- [x] 2.1 상수 파일 생성

  - src/utils/constants.ts 파일을 생성하고 UI 관련 상수들을 정의합니다
  - LABEL_GAP, TRANSFER_MARKER_SIZE, NORMAL_MARKER_SIZE 등의 상수를 export합니다
  - LABEL_OFFSETS, LEFT_ALIGNED_STATIONS 등의 설정 객체를 export합니다
  - _Requirements: 4.4_

- [x] 2.2 경로 탐색 유틸리티 생성

  - src/utils/pathfinding.ts 파일을 생성합니다
  - buildGraph 함수를 구현하여 Edge 리스트 기반 그래프 구조를 생성합니다
  - dijkstraWithTransfers 함수를 구현하여 최단 경로를 탐색합니다
  - MetroMapContainer.tsx에서 buildGraph, dijkstraWithTransfers 함수를 추출하여 이동합니다
  - NodeKey 타입과 PathfindingResult 인터페이스를 정의합니다
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.3 지도 헬퍼 유틸리티 생성

  - src/utils/mapHelpers.ts 파일을 생성합니다
  - createStationLabel 함수를 구현하여 역 마커용 DivIcon을 생성합니다
  - highlightTransferLabels 함수를 구현하여 환승역 라벨을 하이라이트합니다
  - highlightStationCircles 함수를 구현하여 출발/도착역 원형 마커를 하이라이트합니다
  - setInfoText 함수를 구현하여 정보 패널 텍스트를 업데이트합니다
  - MetroMapContainer.tsx에서 해당 함수들을 추출하여 이동합니다
  - _Requirements: 4.1, 4.2, 4.3_

-

- [x] 3. Custom Hooks 레이어 구축

  - src/hooks 디렉토리를 생성하고 상태 관리 및 지도 로직을 Custom Hook으로 분리합니다
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

- [x] 3.1 경로 상태 관리 Hook 생성

  - src/hooks/useRouteState.ts 파일을 생성합니다
  - startStation, endStation, routeHistory 상태를 관리합니다
  - setStartStation, setEndStation, addToHistory, removeFromHistory, selectHistoryItem 함수를 구현합니다
  - 이력 관리 로직 (중복 제거, 최대 4개 제한)을 포함합니다
  - UseRouteStateReturn 인터페이스를 정의합니다
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.2 지도 관리 Hook 생성 - 기본 구조

  - src/hooks/useMetroMap.ts 파일을 생성합니다
  - UseMetroMapProps, UseMetroMapReturn 인터페이스를 정의합니다
  - mapContainerRef, mapRef, markersRef, routeLayerRef, arrowLayerRef, infoControlRef를 관리합니다
  - 기본 Hook 구조와 ref 초기화 로직을 작성합니다
  - _Requirements: 3.1, 3.5_

- [x] 3.3 지도 관리 Hook - 지도 초기화

  - useMetroMap Hook에 지도 초기화 로직을 추가합니다
  - Leaflet 지도 인스턴스를 생성하고 CRS.Simple 설정을 적용합니다
  - 타일 레이어를 추가하고 정보 컨트롤 패널을 생성합니다
  - 지도 클릭 이벤트 핸들러를 등록합니다
  - _Requirements: 3.1_

- [x] 3.4 지도 관리 Hook - 노선 및 역 렌더링

  - useMetroMap Hook에 노선 Polyline 렌더링 로직을 추가합니다
  - 역 마커 생성 및 팝업 UI 구성 로직을 추가합니다
  - 마커 클릭 이벤트 핸들러를 등록하여 onStationSelect 콜백을 호출합니다
  - mapHelpers의 createStationLabel 함수를 사용합니다
  - _Requirements: 3.2, 3.3_

- [x] 3.5 지도 관리 Hook - 경로 표시 함수

  - useMetroMap Hook에 drawRoute 함수를 구현합니다
  - PathfindingResult를 받아 경로 Polyline과 화살표를 그립니다
  - clearRoute 함수를 구현하여 경로 레이어를 초기화합니다
  - updateInfoText 함수를 구현하여 정보 패널을 업데이트합니다
  - mapHelpers의 highlightTransferLabels 함수를 사용합니다
  - _Requirements: 3.4_

- [x] 3.6 지도 관리 Hook - 클린업 로직

  - useMetroMap Hook에 cleanup 로직을 추가합니다
  - 모든 레이어와 컨트롤을 제거하고 지도 인스턴스를 정리합니다
  - 메모리 누수를 방지합니다
  - _Requirements: 3.5_

- [x] 4. MetroMapContainer 컴포넌트 리팩토링

  - MetroMapContainer.tsx를 간소화하고 분리된 모듈들을 통합합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.1 Import 구조 변경

  - MetroMapContainer.tsx에서 데이터 파일들을 import합니다
  - Custom Hook들을 import합니다
  - 유틸리티 함수들을 import합니다
  - 기존 코드에서 분리된 부분들을 제거합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 상태 관리 로직 교체

  - useState 기반 상태 관리를 useRouteState Hook으로 교체합니다
  - selectedStation, selectedLine 상태는 컴포넌트에 유지합니다
  - 경로 이력 관련 함수들을 Hook에서 가져온 함수로 교체합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.3 지도 로직 교체

  - 지도 초기화 및 렌더링 로직을 useMetroMap Hook으로 교체합니다
  - useEffect 내의 지도 관련 코드를 제거하고 Hook의 함수들을 사용합니다
  - mapRef 직접 접근을 제거하고 Hook에서 제공하는 함수들을 사용합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.4 경로 계산 로직 교체

  - useEffect 내의 경로 계산 로직을 pathfinding 유틸리티 함수로 교체합니다
  - dijkstraWithTransfers 함수를 호출하고 결과를 처리합니다
  - drawRoute, clearRoute, updateInfoText 함수를 사용하여 UI를 업데이트합니다
  - 경로 정보 텍스트 생성 로직을 유지합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.5 MetroMap 컴포넌트 Props 전달

  - MetroMap 컴포넌트에 필요한 props를 전달합니다
  - 데이터 파일에서 가져온 stations, subwayLines를 전달합니다
  - Hook에서 가져온 상태와 함수들을 전달합니다
  - zoomToStation, resetView 함수를 적절히 구현합니다 (Hook 함수 활용 또는 임시 구현)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. 타입 정의 업데이트

- [ ] 5. 타입 정의 업데이트

  - 분리된 모듈들 간의 타입 일관성을 확인하고 필요시 수정합니다
  - _Requirements: 1.4, 2.3, 5.3_

- [x] 5.1 MetroMap 컴포넌트 타입 업데이트

  - MetroMap.tsx에서 Station, SubwayLine 타입 import를 src/data/types.ts로 변경합니다
  - RouteHistoryItem 타입 정의를 제거하고 types.ts에서 import합니다
  - _Requirements: 1.4_

- [x] 5.2 SearchHistoryCard 컴포넌트 타입 확인

  - SearchHistoryCard.tsx가 있다면 타입 import 경로를 확인하고 필요시 수정합니다
  - _Requirements: 1.4_

- [-] 6. 기능 검증 및 버그 수정

  - 리팩토링 후 모든 기능이 정상 동작하는지 확인하고 발견된 버그를 수정합니다
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

-

- [ ] 6.1 역 선택 기능 검증

  - 역 클릭 시 팝업이 정상적으로 표시되는지 확인합니다
  - 출발지/도착지 버튼이 정상 동작하는지 확인합니다
  - 발견된 버그를 수정합니다
  - _Requirements: 6.1_

- [ ] 6.2 경로 탐색 기능 검증

  - 출발지와 도착지 선택 시 경로가 정상적으로 계산되고 표시되는지 확인합니다
  - 경로 정보 텍스트가 올바르게 표시되는지 확인합니다
  - 환승역 하이라이트가 정상 동작하는지 확인합니다
  - 발견된 버그를 수정합니다
  - _Requirements: 6.2_

- [ ] 6.3 경로 이력 기능 검증

  - 경로 이력이 정상적으로 추가되는지 확인합니다
  - 이력 클릭 시 해당 경로가 다시 표시되는지 확인합니다
  - 이력 삭제 기능이 정상 동작하는지 확인합니다
  - 발견된 버그를 수정합니다
  - _Requirements: 6.3_

- [ ] 6.4 UI 인터랙션 검증
  - 노선 하이라이트 기능이 정상 동작하는지 확인합니다
  - 전체 보기 버튼이 정상 동작하는지 확인합니다
  - 지도 클릭 시 초기화가 정상 동작하는지 확인합니다
  - 발견된 버그를 수정합니다
  - _Requirements: 6.4_
