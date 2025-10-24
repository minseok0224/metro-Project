import { useRef, useEffect, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Station, SubwayLine, Edge } from "../data/types";
import type { PathfindingResult } from "../utils/pathfinding";
import {
  createStationLabel,
  highlightTransferLabels,
  highlightStationCircles,
  setInfoText,
} from "../utils/mapHelpers";

export interface UseMetroMapProps {
  stations: Station[];
  subwayLines: SubwayLine[];
  edges: Edge[];
  startStation: Station | null;
  endStation: Station | null;
  selectedLine: string | null;
  onStationSelect: (station: Station, role: "start" | "end") => void;
  onMapClick: () => void;
}

export interface UseMetroMapReturn {
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  drawRoute: (result: PathfindingResult) => void;
  clearRoute: () => void;
  updateInfoText: (text: string) => void;
}

/**
 * Leaflet 지도 초기화 및 렌더링을 담당하는 Custom Hook
 * 지도 인스턴스, 마커, 레이어 등을 관리합니다.
 */
export function useMetroMap(props: UseMetroMapProps): UseMetroMapReturn {
  const {
    stations,
    subwayLines,
    edges,
    startStation,
    endStation,
    selectedLine,
    onStationSelect,
    onMapClick,
  } = props;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const arrowLayerRef = useRef<L.LayerGroup | null>(null);
  const infoControlRef = useRef<L.Control | null>(null);

  // 출발지/도착지 변경 시 마커 하이라이트 업데이트
  useEffect(() => {
    highlightStationCircles({
      start: startStation?.id,
      end: endStation?.id,
    });
  }, [startStation, endStation]);

  // 선택된 노선에 따라 필터링
  useEffect(() => {
    if (!selectedLine) {
      // 전체 보기: 모든 노선과 역을 표시
      polylinesRef.current.forEach((polyline) => {
        polyline.setStyle({ opacity: 0.8 });
      });
      markersRef.current.forEach((marker) => {
        marker.setOpacity(1);
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

      markersRef.current.forEach((marker, stationId) => {
        const station = stations.find((s) => s.id === stationId);
        if (station && station.lines.includes(selectedLine)) {
          marker.setOpacity(1);
        } else {
          marker.setOpacity(0.2);
        }
      });
    }
  }, [selectedLine, stations]);

  // 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Leaflet 지도 인스턴스 생성
    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 2,
      maxZoom: 5,
      center: [85, 75],
      zoom: 2,
    });

    mapRef.current = map;

    // 타일 레이어 추가
    L.tileLayer(
      "data:image/svg+xml;base64," +
        btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="256" height="256" fill="#fafafa"/>
          <rect width="256" height="256" fill="url(#grid)"/>
        </svg>
      `),
      { attribution: "Metro City Subway Map" }
    ).addTo(map);

    // 정보 컨트롤 패널 생성
    const infoControl = new L.Control({ position: "topright" });
    (infoControl as L.Control).onAdd = () => {
      const div = L.DomUtil.create("div", "trip-info");
      div.style.cssText = `background: rgba(255,255,255,0.95); padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); font-size: 13px; color: #333; min-width: 220px;`;
      div.innerHTML = "출발지/도착지를 선택하세요";
      return div;
    };
    infoControl.addTo(map);
    infoControlRef.current = infoControl;

    // 지도 클릭 이벤트 핸들러 등록
    map.on("click", onMapClick);

    // 노선 Polyline 렌더링
    subwayLines.forEach((line) => {
      const lineEdges = edges.filter((e) => e.line === line.id);
      lineEdges.forEach((edge, idx) => {
        const fromStation = stations.find((s) => s.id === edge.from);
        const toStation = stations.find((s) => s.id === edge.to);
        if (fromStation && toStation) {
          const polyline = L.polyline(
            [
              [fromStation.lat, fromStation.lng],
              [toStation.lat, toStation.lng],
            ],
            {
              color: line.color,
              weight: 8,
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
              className: `line-${line.id}`,
            }
          ).addTo(map);

          polylinesRef.current.set(`${line.id}-${idx}`, polyline);
        }
      });
    });

    // 역 마커 생성 및 팝업 UI 구성
    stations.forEach((station) => {
      // 마커 색상: 소속 노선 첫 번째 색상
      const line = subwayLines.find((l) => station.lines[0] === l.id);
      const color = line ? line.color : "#666";

      const marker = L.marker([station.lat, station.lng], {
        icon: createStationLabel(station, color, station.isTransfer),
      }).addTo(map);

      markersRef.current.set(station.id, marker);

      // 팝업 UI
      const linesInfo = station.lines
        .map((id) => {
          const l = subwayLines.find((l) => l.id === id);
          return l
            ? `<span style="color:${l.color};font-weight:600;">${l.name}</span>`
            : "";
        })
        .join(" • ");

      const popupHtml = `
        <div style="text-align:center; min-width:220px;">
          <h3 style="margin:0 0 6px 0; color:#333;">${station.name}</h3>
          <div style="font-size:13px; margin-bottom:6px;">${linesInfo}</div>
          <p style="font-size:12px; color:#666;">${station.description}</p>
          <div style="margin-top:8px; display:flex; gap:8px; justify-content:center;">
            <button data-role="start" style="padding:4px 8px; border:1px solid #1f6feb; background:#e8f0ff; border-radius:5px; color:#1f6feb;">출발지</button>
            <button data-role="end" style="padding:4px 8px; border:1px solid #10b981; background:#e8fff4; border-radius:5px; color:#059669;">도착지</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { offset: L.point(0, -8) });

      // 마커 클릭 이벤트 핸들러 등록
      marker.on("popupopen", (e) => {
        const container = e.popup.getElement();
        const btnStart = container?.querySelector<HTMLButtonElement>(
          "button[data-role='start']"
        );
        const btnEnd = container?.querySelector<HTMLButtonElement>(
          "button[data-role='end']"
        );

        btnStart?.addEventListener("click", () => {
          onStationSelect(station, "start");
          marker.closePopup();
        });

        btnEnd?.addEventListener("click", () => {
          onStationSelect(station, "end");
          marker.closePopup();
        });
      });
    });

    return () => {
      // 클린업: 모든 레이어와 컨트롤 제거
      if (infoControlRef.current) {
        infoControlRef.current.remove();
        infoControlRef.current = null;
      }

      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
        routeLayerRef.current = null;
      }

      if (arrowLayerRef.current) {
        arrowLayerRef.current.clearLayers();
        arrowLayerRef.current = null;
      }

      // 지도 인스턴스 정리
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // 마커 참조 초기화
      markersRef.current.clear();
    };
  }, [stations, subwayLines, edges, onStationSelect, onMapClick]);

  /**
   * 경로를 지도에 그립니다.
   */
  const drawRoute = useCallback((result: PathfindingResult) => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const { coords, transferStationIds } = result;

    // 경로 레이어 초기화 및 생성
    if (!routeLayerRef.current) {
      routeLayerRef.current = L.layerGroup().addTo(map);
    } else {
      routeLayerRef.current.clearLayers();
    }

    if (!arrowLayerRef.current) {
      arrowLayerRef.current = L.layerGroup().addTo(map);
    } else {
      arrowLayerRef.current.clearLayers();
    }

    // 경로 Polyline 그리기
    L.polyline(coords, {
      color: "#ff3b30",
      weight: 10,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(routeLayerRef.current);

    // 진행방향 화살표 그리기
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i];
      const b = coords[i + 1];
      const angleRad = Math.atan2(a[1] - b[1], a[0] - b[0]);
      const angleDeg = (angleRad * 180) / Math.PI;

      [0.4, 0.8].forEach((t) => {
        const pos: [number, number] = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
        ];

        const arrowIcon = L.divIcon({
          className: "route-arrow",
          html: `<div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 12px solid #ffffff; transform: rotate(${angleDeg}deg); filter: drop-shadow(0 0 2px rgba(0,0,0,0.8)) drop-shadow(0 1px 1px rgba(0,0,0,0.5));"></div>`,
          iconSize: [14, 12],
          iconAnchor: [7, 6],
        });

        L.marker(pos, { icon: arrowIcon, zIndexOffset: 1300 }).addTo(
          arrowLayerRef.current!
        );
      });
    }

    // 환승역 하이라이트
    highlightTransferLabels(transferStationIds);
  }, []);

  /**
   * 경로 레이어를 초기화합니다.
   */
  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    if (arrowLayerRef.current) {
      arrowLayerRef.current.clearLayers();
    }
    highlightTransferLabels([]);
    highlightStationCircles({});
  }, []);

  /**
   * 정보 패널 텍스트를 업데이트합니다.
   */
  const updateInfoText = useCallback((text: string) => {
    setInfoText(text);
  }, []);

  return {
    mapContainerRef,
    drawRoute,
    clearRoute,
    updateInfoText,
  };
}
