# Requirements Document

## Introduction

현재 MetroMapContainer 컴포넌트는 600줄이 넘는 코드로 데이터 정의, 그래프 알고리즘, 지도 렌더링, UI 상태 관리가 모두 혼재되어 있습니다. 이를 관심사 분리(Separation of Concerns) 원칙에 따라 모듈화하여 코드의 가독성, 유지보수성, 테스트 용이성을 향상시키는 것이 목표입니다.

## Glossary

- **MetroMapContainer**: 지하철 노선도를 표시하고 경로 탐색 기능을 제공하는 메인 React 컴포넌트
- **Station**: 지하철 역 정보를 담는 데이터 구조 (id, name, lat, lng, lines, isTransfer, description)
- **SubwayLine**: 지하철 노선 정보를 담는 데이터 구조 (id, name, color)
- **Edge**: 역과 역 사이의 연결 정보를 담는 데이터 구조 (from, to, line, weight)
- **Dijkstra Algorithm**: 최단 경로 탐색을 위한 알고리즘
- **Leaflet**: 지도 렌더링을 위한 JavaScript 라이브러리
- **Custom Hook**: React에서 상태 로직을 재사용하기 위한 함수

## Requirements

### Requirement 1

**User Story:** 개발자로서, 역 및 노선 데이터를 별도 파일로 분리하여 데이터 관리를 용이하게 하고 싶습니다.

#### Acceptance Criteria

1. WHEN 개발자가 역 데이터를 수정하려 할 때, THE System SHALL 별도의 데이터 파일에서 역 정보를 제공한다
2. WHEN 개발자가 노선 데이터를 수정하려 할 때, THE System SHALL 별도의 데이터 파일에서 노선 정보를 제공한다
3. WHEN 개발자가 연결 정보를 수정하려 할 때, THE System SHALL 별도의 데이터 파일에서 Edge 정보를 제공한다
4. THE System SHALL 데이터 파일에 TypeScript 타입 정의를 포함한다

### Requirement 2

**User Story:** 개발자로서, 경로 탐색 로직을 별도 모듈로 분리하여 알고리즘을 독립적으로 테스트하고 개선하고 싶습니다.

#### Acceptance Criteria

1. WHEN 경로 탐색이 필요할 때, THE System SHALL 별도의 유틸리티 모듈에서 Dijkstra 알고리즘을 제공한다
2. WHEN 그래프를 구성할 때, THE System SHALL 별도의 유틸리티 모듈에서 그래프 빌드 함수를 제공한다
3. THE System SHALL 경로 탐색 결과로 소요 시간, 정차역 수, 환승 횟수, 좌표 배열, 환승역 ID 목록을 반환한다
4. THE System SHALL 경로 탐색 로직이 UI 컴포넌트와 독립적으로 동작한다

### Requirement 3

**User Story:** 개발자로서, Leaflet 지도 관련 로직을 Custom Hook으로 분리하여 지도 초기화 및 렌더링 로직을 재사용하고 싶습니다.

#### Acceptance Criteria

1. WHEN 지도를 초기화할 때, THE System SHALL Custom Hook에서 지도 인스턴스를 생성하고 반환한다
2. WHEN 역 마커를 그릴 때, THE System SHALL Custom Hook에서 마커 생성 및 이벤트 핸들러를 관리한다
3. WHEN 노선을 그릴 때, THE System SHALL Custom Hook에서 Polyline을 생성하고 관리한다
4. WHEN 경로를 표시할 때, THE System SHALL Custom Hook에서 경로 레이어를 생성하고 관리한다
5. THE System SHALL 지도 관련 ref 객체들을 Custom Hook 내부에서 관리한다

### Requirement 4

**User Story:** 개발자로서, UI 헬퍼 함수들을 별도 유틸리티 모듈로 분리하여 코드 가독성을 높이고 싶습니다.

#### Acceptance Criteria

1. WHEN 역 라벨을 생성할 때, THE System SHALL 별도의 유틸리티 함수에서 Leaflet DivIcon을 생성한다
2. WHEN 환승역을 하이라이트할 때, THE System SHALL 별도의 유틸리티 함수에서 DOM 조작을 수행한다
3. WHEN 출발/도착역을 하이라이트할 때, THE System SHALL 별도의 유틸리티 함수에서 DOM 조작을 수행한다
4. THE System SHALL UI 헬퍼 함수들이 순수 함수로 구현된다

### Requirement 5

**User Story:** 개발자로서, 상태 관리 로직을 Custom Hook으로 분리하여 컴포넌트의 복잡도를 낮추고 싶습니다.

#### Acceptance Criteria

1. WHEN 경로 탐색 상태를 관리할 때, THE System SHALL Custom Hook에서 출발역, 도착역, 경로 이력 상태를 관리한다
2. WHEN 선택된 역/노선 상태를 관리할 때, THE System SHALL Custom Hook에서 해당 상태를 관리한다
3. THE System SHALL Custom Hook에서 상태 업데이트 함수들을 반환한다
4. THE System SHALL 상태 관리 로직이 UI 렌더링 로직과 분리된다

### Requirement 6

**User Story:** 개발자로서, 리팩토링 후에도 기존 기능이 정상 동작하는지 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN 사용자가 역을 클릭할 때, THE System SHALL 기존과 동일하게 팝업을 표시한다
2. WHEN 사용자가 출발지와 도착지를 선택할 때, THE System SHALL 기존과 동일하게 경로를 계산하고 표시한다
3. WHEN 사용자가 경로 이력을 클릭할 때, THE System SHALL 기존과 동일하게 해당 경로를 다시 표시한다
4. THE System SHALL 모든 기존 UI 인터랙션이 정상 동작한다
