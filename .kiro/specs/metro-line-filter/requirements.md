# Requirements Document

## Introduction

이 문서는 지하철 노선도 애플리케이션에서 특정 노선을 선택하면 해당 노선의 역과 경로만 표시하는 필터링 기능에 대한 요구사항을 정의합니다. 사용자는 노선 목록에서 특정 노선을 클릭하여 해당 노선의 역과 연결선만 지도에 표시할 수 있으며, 다른 노선의 정보는 숨겨집니다.

## Glossary

- **System**: 지하철 노선도 애플리케이션 (Metro Map Application)
- **User**: 지하철 노선도를 사용하는 사용자
- **Line**: 지하철 노선 (예: 1호선, 2호선)
- **Station**: 지하철 역
- **Transfer Station**: 환승역 (두 개 이상의 노선이 교차하는 역)
- **Line Filter**: 특정 노선만 표시하는 필터링 기능
- **Polyline**: 지도 위에 그려지는 노선 연결선
- **Station Marker**: 지도 위에 표시되는 역 마커

## Requirements

### Requirement 1

**User Story:** 사용자로서, 특정 노선을 선택하여 해당 노선의 역과 경로만 보고 싶습니다. 이를 통해 복잡한 노선도에서 원하는 노선에 집중할 수 있습니다.

#### Acceptance Criteria

1. WHEN User가 노선 목록에서 특정 Line을 클릭하면, THE System SHALL 해당 Line에 속한 Station Marker만 지도에 표시한다
2. WHEN User가 노선 목록에서 특정 Line을 클릭하면, THE System SHALL 해당 Line의 Polyline만 지도에 표시한다
3. WHEN User가 노선 목록에서 특정 Line을 클릭하면, THE System SHALL 선택되지 않은 다른 Line의 Station Marker를 지도에서 숨긴다
4. WHEN User가 노선 목록에서 특정 Line을 클릭하면, THE System SHALL 선택되지 않은 다른 Line의 Polyline을 지도에서 숨긴다

### Requirement 2

**User Story:** 사용자로서, 환승역은 여러 노선에 속하므로 노선 필터링 시에도 환승역 정보를 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN User가 특정 Line을 선택하고 해당 Line에 Transfer Station이 포함되어 있으면, THE System SHALL Transfer Station의 Marker를 지도에 표시한다
2. WHEN User가 특정 Line을 선택하고 Transfer Station이 표시될 때, THE System SHALL Transfer Station의 Marker에 해당 역이 속한 모든 Line 정보를 표시한다
3. WHEN User가 특정 Line을 선택하고 Transfer Station의 Marker를 클릭하면, THE System SHALL 해당 역의 모든 노선 정보를 팝업으로 표시한다

### Requirement 3

**User Story:** 사용자로서, 노선 필터를 해제하여 전체 노선도를 다시 보고 싶습니다.

#### Acceptance Criteria

1. WHEN User가 선택된 Line을 다시 클릭하면, THE System SHALL Line Filter를 해제하고 모든 Line의 Station Marker를 표시한다
2. WHEN User가 선택된 Line을 다시 클릭하면, THE System SHALL Line Filter를 해제하고 모든 Line의 Polyline을 표시한다
3. WHEN User가 전체 보기 버튼을 클릭하면, THE System SHALL Line Filter를 해제하고 모든 노선을 표시한다

### Requirement 4

**User Story:** 사용자로서, 현재 어떤 노선이 선택되어 있는지 시각적으로 확인하고 싶습니다.

#### Acceptance Criteria

1. WHEN User가 특정 Line을 선택하면, THE System SHALL 선택된 Line의 UI 요소에 시각적 강조 표시를 적용한다
2. WHEN User가 Line Filter를 해제하면, THE System SHALL 모든 Line의 UI 요소에서 시각적 강조 표시를 제거한다
3. THE System SHALL 선택된 Line의 이름을 화면에 표시한다

### Requirement 5

**User Story:** 사용자로서, 노선 필터링 중에도 경로 탐색 기능을 사용하고 싶습니다.

#### Acceptance Criteria

1. WHEN User가 특정 Line을 선택한 상태에서 출발역과 도착역을 선택하면, THE System SHALL 선택된 Line에 속한 역만 사용하여 경로를 탐색한다
2. WHEN User가 특정 Line을 선택한 상태에서 경로 탐색 결과가 없으면, THE System SHALL 사용자에게 해당 노선으로는 경로를 찾을 수 없다는 메시지를 표시한다
3. WHEN User가 Line Filter를 해제한 상태에서 출발역과 도착역을 선택하면, THE System SHALL 모든 Line을 사용하여 최적 경로를 탐색한다
