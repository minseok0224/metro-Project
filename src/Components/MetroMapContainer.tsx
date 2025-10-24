import { useEffect, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import MetroMap from "./MetroMap";
import { stations } from "../data/stations";
import { subwayLines } from "../data/subwayLines";
import { edges, EDGE_STOP_MIN, EDGE_TRANSFER_MIN } from "../data/edges";
import type { Station } from "../data/types";
import { useRouteState } from "../hooks/useRouteState";
import { useMetroMap } from "../hooks/useMetroMap";
import { dijkstraWithTransfers } from "../utils/pathfinding";

const MetroMapContainer = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);

  const {
    startStation,
    endStation,
    routeHistory,
    setStartStation,
    setEndStation,
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  } = useRouteState();

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

  const handleMapClick = useCallback(() => {
    setStartStation(null);
    setEndStation(null);
    setSelectedLine(null);
    setSelectedStation(null);
  }, [setStartStation, setEndStation]);

  const { mapContainerRef, drawRoute, clearRoute, updateInfoText } =
    useMetroMap({
      stations,
      subwayLines,
      edges,
      startStation,
      endStation,
      selectedLine,
      onStationSelect: handleStationSelect,
      onMapClick: handleMapClick,
    });

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

  // 경로 탐색 및 표시
  useEffect(() => {
    if (!startStation || !endStation) return;

    const result = dijkstraWithTransfers(
      startStation,
      endStation,
      stations,
      edges,
      EDGE_STOP_MIN,
      EDGE_TRANSFER_MIN
    );

    if (!result) {
      updateInfoText("경로를 찾지 못했습니다.");
      clearRoute();
      return;
    }

    drawRoute(result);
    addToHistory(startStation, endStation);

    const { minutes, stops, transfers, path, nodeMeta } = result;

    // 안내 텍스트 구성용 경로 스테이션 이름 추출
    let stationNames: string[] = [];
    for (let i = 0; i < path.length; i++) {
      const meta = nodeMeta.get(path[i]);
      if (!meta) continue;
      const station = stations.find((s) => s.id === meta.stationId);
      if (!station) continue;

      if (station.id === startStation.id || station.id === endStation.id) {
        stationNames.push(station.name);
        continue;
      }
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
    // 중복제거
    stationNames = stationNames.filter(
      (name, idx, arr) => arr.indexOf(name) === idx
    );

    const routeText = stationNames.join(" → ");
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

  return (
    <MetroMap
      mapContainerRef={mapContainerRef}
      selectedStation={selectedStation}
      selectedLine={selectedLine}
      subwayLines={subwayLines}
      stations={stations}
      transferStations={stations.filter((s) => s.isTransfer)}
      routeHistory={routeHistory}
      startStation={startStation}
      endStation={endStation}
      setStartStation={(station) => {
        setStartStation(station);
        if (station) {
          updateInfoText(
            `출발지: <b>${station.name}</b> 선택됨 — 도착지를 선택하세요`
          );
        }
      }}
      setEndStation={(station) => {
        setEndStation(station);
        if (station) {
          updateInfoText(
            `도착지: <b>${station.name}</b> 선택됨 — 출발지를 선택하세요`
          );
        }
      }}
      onHistoryClick={selectHistoryItem}
      onRemoveHistory={removeFromHistory}
      zoomToStation={(station) => {
        if (station) {
          setSelectedStation(station);
        } else {
          setSelectedStation(null);
        }
      }}
      highlightLine={(lineId) => {
        // 같은 노선을 다시 클릭하면 해제
        if (selectedLine === lineId) {
          setSelectedLine(null);
        } else {
          setSelectedLine(lineId);
        }
      }}
      resetView={() => {
        setSelectedStation(null);
        setSelectedLine(null);
      }}
    />
  );
};

export default MetroMapContainer;
