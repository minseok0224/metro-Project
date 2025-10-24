import type { RefObject } from "react";
import { Card, Space, Button, Typography, Tag, Divider } from "antd";
import type { Station, SubwayLine, RouteHistoryItem } from "../data/types";
import { useEffect, useState } from "react";
import SearchHistoryCard from "./SearchHistoryCard";

interface TripHistoryProps {
  routeHistory: RouteHistoryItem[];
  onHistoryClick: (item: RouteHistoryItem) => void;
}

export function TripHistory({
  routeHistory,
  onHistoryClick,
}: TripHistoryProps) {
  if (!routeHistory.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>최근 경로</div>
      {routeHistory.map((item) => (
        <button
          key={item.from.id + "-" + item.to.id}
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            marginBottom: 4,
            border: "1px solid #e0e0e0",
            background: "#fafafa",
            borderRadius: 5,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 13,
          }}
          onClick={() => onHistoryClick(item)}
        >
          <b>{item.from.name}</b> → <b>{item.to.name}</b>
        </button>
      ))}
      <hr style={{ margin: "12px 0" }} />
    </div>
  );
}

const { Text, Title } = Typography;

interface MetroMapProps {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  selectedStation: Station | null;
  selectedLine: string | null;
  subwayLines: SubwayLine[];
  transferStations: Station[];
  stations: Station[];
  zoomToStation: (station: Station | null) => void;
  highlightLine: (lineId: string | null) => void;
  resetView: () => void;
  routeHistory: RouteHistoryItem[];
  onHistoryClick: (item: RouteHistoryItem) => void;
  startStation: Station | null;
  endStation: Station | null;
  setStartStation: (station: Station | null) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
  setEndStation: (station: Station | null) => void;
}

const MetroMap = ({
  mapContainerRef,
  selectedStation,
  selectedLine,
  subwayLines,
  stations,
  transferStations,
  zoomToStation,
  highlightLine,
  resetView,
  routeHistory,
  onHistoryClick,
  setStartStation,
  setEndStation,
  onRemoveHistory,
}: MetroMapProps) => {
  // 검색 input 관련 상태
  const [searchValue, setSearchValue] = useState("");
  const [searchList, setSearchList] = useState<Station[]>([]);

  useEffect(() => {
    if (!searchValue) {
      setSearchList([]);
    } else {
      setSearchList(stations.filter((st) => st.name.includes(searchValue)));
    }
  }, [searchValue, stations]);

  return (
    <div
      style={{ height: "100%", display: "flex", gap: "16px", width: "100%" }}
    >
      {/* 사이드 패널 */}
      <div
        style={{
          width: "350px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ padding: "10px 14px 0 14px" }}>
          <SearchHistoryCard
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            searchList={searchList}
            onSearchSelect={(station) => {
              zoomToStation(station);
            }}
            onSelectAsStart={(station) => {
              // 출발지로 세팅
              setStartStation(station);
              // 필요 시 바로 경로 검색 or 포커스 이동 등 추가 처리
            }}
            onSelectAsEnd={(station) => {
              // 도착지로 세팅
              setEndStation(station);
            }}
            routeHistory={routeHistory}
            onHistoryClick={onHistoryClick}
            onRemoveHistory={onRemoveHistory}
          />
        </div>
        {/* ----------- [★ END] ---------- */}

        {/* 컨트롤 패널 - 고정 */}
        <Card title='🚇 노선도' size='small' style={{ flexShrink: 0 }}>
          <Space
            direction='vertical'
            style={{ width: "100%", textAlign: "center" }}
          >
            <Button block onClick={resetView}>
              전체 보기
            </Button>
            <Text
              type='secondary'
              style={{ fontSize: "12px", textAlign: "center" }}
            >
              역이나 노선을 클릭하여 상세 정보를 확인하세요
            </Text>
          </Space>
        </Card>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            paddingRight: "8px",
            minHeight: 0,
          }}
        >
          {/* 노선 목록 */}
          <Card
            title='🚉 지하철 노선'
            size='small'
            style={{ flexShrink: 0 }}
            onClick={() => highlightLine(null)}
          >
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
                    textAlign: "center",
                    height: "auto",
                    padding: "8px 12px",
                    borderColor: line.color,
                    backgroundColor:
                      selectedLine === line.id ? line.color : "white",
                    color: selectedLine === line.id ? "white" : line.color,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <strong>{line.name}</strong>
                    <br />
                    <small style={{ opacity: 0.8 }}>
                      {
                        stations.filter((st) => st.lines.includes(line.id))
                          .length
                      }
                      개 역 운행
                    </small>
                  </div>
                </Button>
              ))}
            </Space>
          </Card>

          {/* 환승역 */}
          <Card
            title='🔄 주요 환승역'
            size='small'
            style={{ flexShrink: 0 }}
            onClick={() => zoomToStation(null)}
          >
            <Space direction='vertical' style={{ width: "100%" }} size='small'>
              {transferStations.map((station) => (
                <Button
                  key={station.id}
                  block
                  size='small'
                  type={
                    selectedStation?.id === station.id ? "primary" : "default"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    zoomToStation(station);
                  }}
                  style={{
                    textAlign: "center",
                    height: "auto",
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <strong>{station.name}</strong>
                    <br />
                    <div style={{ marginTop: "4px", textAlign: "center" }}>
                      {station.lines.map((lineId) => {
                        const line = subwayLines.find((l) => l.id === lineId);
                        return line ? (
                          <Tag
                            key={lineId}
                            color={line.color}
                            style={{ margin: "1px", fontSize: "10px" }}
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

          {/* 선택된 역 정보 */}
          {selectedStation && (
            <Card title='ℹ️ 역 정보' size='small' style={{ flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <Title
                  level={4}
                  style={{ margin: "0 0 8px 0", textAlign: "center" }}
                >
                  {selectedStation.name}
                </Title>
                <div style={{ margin: "8px 0", textAlign: "center" }}>
                  {selectedStation.lines.map((lineId) => {
                    const line = subwayLines.find((l) => l.id === lineId);
                    return line ? (
                      <Tag
                        key={lineId}
                        color={line.color}
                        style={{ margin: "2px" }}
                      >
                        {line.name}
                      </Tag>
                    ) : null;
                  })}
                </div>
                {selectedStation.isTransfer && (
                  <div style={{ textAlign: "center" }}>
                    <Tag color='red' style={{ margin: "4px 0" }}>
                      환승역
                    </Tag>
                  </div>
                )}
                <Divider style={{ margin: "12px 0" }} />
                <Text
                  style={{
                    fontSize: "14px",
                    textAlign: "center",
                    display: "block",
                  }}
                >
                  {selectedStation.description}
                </Text>
                <div style={{ marginTop: "8px", textAlign: "center" }}>
                  <Text
                    type='secondary'
                    style={{ fontSize: "12px", textAlign: "center" }}
                  >
                    좌표: ({selectedStation.lat}, {selectedStation.lng})
                  </Text>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 맵 컨테이너 */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            border: "2px solid #d9d9d9",
            borderRadius: "8px",
            backgroundColor: "#fafafa",
            width: "100%",
          }}
        />

        {/* 범례 */}
        <Card size='small' style={{ marginTop: "8px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <Text strong style={{ textAlign: "center" }}>
              노선 범례:
            </Text>
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
                <Text style={{ fontSize: "12px", textAlign: "center" }}>
                  {line.name}
                </Text>
              </span>
            ))}
            <Text
              type='secondary'
              style={{ fontSize: "12px", textAlign: "center" }}
            >
              • 큰 원: 환승역 | 작은 원: 일반역
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MetroMap;
