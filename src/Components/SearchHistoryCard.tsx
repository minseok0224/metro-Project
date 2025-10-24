import React from "react";
import { Card, Input, Button, Tag } from "antd";
import { SearchOutlined, HistoryOutlined } from "@ant-design/icons";
import type { Station, RouteHistoryItem } from "../data/types";

interface SearchHistoryCardProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchList: Station[];
  onSearchSelect: (station: Station) => void; // 필요 시 제거 가능
  onSelectAsStart: (station: Station) => void;
  onSelectAsEnd: (station: Station) => void;
  routeHistory: RouteHistoryItem[];
  onHistoryClick: (item: RouteHistoryItem) => void;
  onRemoveHistory: (item: RouteHistoryItem) => void;
}

const SearchHistoryCard: React.FC<SearchHistoryCardProps> = ({
  searchValue,
  setSearchValue,
  searchList,
  onSelectAsStart,
  onSelectAsEnd,
  routeHistory,
  onHistoryClick,
  onRemoveHistory,
}) => {
  const [selectedSearchStation, setSelectedSearchStation] =
    React.useState<Station | null>(null);

  // 검색어 바뀌면 선택 초기화
  React.useEffect(() => {
    setSelectedSearchStation(null);
  }, [searchValue]);

  return (
    <Card
      title={
        <span
          style={{
            fontWeight: 600,
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SearchOutlined style={{ color: "#0052A4", fontSize: 18 }} />
          검색 및 이력
        </span>
      }
      size='small'
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        marginBottom: 12,
      }}
      bodyStyle={{ padding: 16 }}
    >
      {/* 검색창 */}
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
        style={{
          background: "#fff",
          border: "1.5px solid #0099ff",
          borderRadius: 6,
          color: "#222",
          fontWeight: 500,
          fontSize: 15,
          marginBottom: 8,
        }}
        prefix={<SearchOutlined />}
      />
      {/* 자동완성 목록 */}
      {searchValue && !selectedSearchStation && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            marginTop: -1,
            maxHeight: 160,
            overflowY: "auto",
            marginBottom: 8,
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
                  display: "flex",
                  alignItems: "center",
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
      )}
      {/* 선택된 역 미니 카드 */}
      {selectedSearchStation && (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #0099ff",
            borderRadius: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            margin: "0 0 12px 0",
            padding: 16,
            textAlign: "center",
            position: "relative",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {selectedSearchStation.name}
          </div>
          <div style={{ marginBottom: 4 }}>
            {selectedSearchStation.lines.map((lineId) => (
              <Tag key={lineId} color='#0052A4' style={{ fontWeight: 600 }}>
                {lineId}호선
              </Tag>
            ))}
          </div>
          <div style={{ color: "#666", marginBottom: 12, fontSize: 13 }}>
            {selectedSearchStation.description}
          </div>
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
                setSearchValue(""); // 입력창도 비움
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
      )}
      {/* 최근 이력 */}
      {routeHistory.length > 0 && (
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
      )}
    </Card>
  );
};

export default SearchHistoryCard;
