import L from "leaflet";
import type { Station } from "../data/types";
import {
  LABEL_GAP,
  TRANSFER_MARKER_SIZE,
  NORMAL_MARKER_SIZE,
  TRANSFER_BORDER_WIDTH,
  NORMAL_BORDER_WIDTH,
  LABEL_OFFSETS,
  LEFT_ALIGNED_STATIONS,
} from "./constants";

/**
 * 역 마커용 DivIcon을 생성합니다.
 * 환승역, 출발역, 도착역에 따라 다른 스타일을 적용합니다.
 */
export function createStationLabel(
  station: Station,
  color: string,
  isTransfer: boolean = false,
  isStart: boolean = false,
  isEnd: boolean = false
): L.DivIcon {
  const size = isTransfer ? TRANSFER_MARKER_SIZE : NORMAL_MARKER_SIZE;
  const borderWidth = isTransfer ? TRANSFER_BORDER_WIDTH : NORMAL_BORDER_WIDTH;
  const leftAligned = LEFT_ALIGNED_STATIONS.includes(station.name);

  const off = LABEL_OFFSETS[station.name] || { x: 0, y: 0 };
  const highlightClass = isStart ? "station-start" : isEnd ? "station-end" : "";

  return L.divIcon({
    className: `station-label ${highlightClass}`,
    html: `
    <div class="station-label-root" data-station-id="${
      station.id
    }" style="position: relative; width:0; height:0; font-size:12px; color:#222; white-space:nowrap;">
      <div style="position:absolute; left:0; top:0; transform: translate(-50%, -50%); width:${size}px; height:${size}px; background-color:${color}; border:${borderWidth}px solid white; border-radius:50%; box-shadow:0 2px 4px rgba(0,0,0,0.4); ${
      isTransfer ? "border-color:#333; background:white;" : ""
    }"></div>
<span
  class="label-text"
  data-left="${leftAligned}"
  data-offx="${off.x ?? 0}"
  data-offy="${off.y ?? 0}"
  style="
    position:absolute;
    top: ${off.y ?? 0}px; 
    ${
      leftAligned
        ? `right: ${LABEL_GAP + (off.x ?? 0)}px; text-align:right;`
        : `left: ${LABEL_GAP + (off.x ?? 0)}px; text-align:left;`
    }
    transform: translateY(-50%);
    font-weight:500;
  "
>
  ${station.name}
</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [0, 0],
  });
}

/**
 * 환승역 라벨을 하이라이트합니다.
 * 모든 라벨을 기본 색상으로 초기화한 후, 지정된 환승역만 강조 색상으로 변경합니다.
 */
export function highlightTransferLabels(transferStationIds: string[]): void {
  const ALL = document.querySelectorAll<HTMLSpanElement>(
    ".station-label .label-text"
  );
  ALL.forEach((el) => (el.style.color = "#222"));

  transferStationIds.forEach((sid) => {
    const label = document.querySelector<HTMLSpanElement>(
      `.station-label-root[data-station-id="${sid}"] .label-text`
    );
    if (label) label.style.color = "#ff3b30";
  });
}

/**
 * 출발역과 도착역의 원형 마커를 하이라이트합니다.
 * 모든 마커를 기본 스타일로 초기화한 후, 출발역과 도착역만 강조 스타일을 적용합니다.
 */
export function highlightStationCircles(stationIds: {
  start?: string;
  end?: string;
}): void {
  const ALL_CIRCLES = document.querySelectorAll<HTMLDivElement>(
    ".station-label-root > div"
  );

  ALL_CIRCLES.forEach((el) => {
    const isTransfer = el.style.background === "white";
    el.style.borderColor = isTransfer ? "#333" : "white";
    el.style.borderWidth = isTransfer
      ? `${TRANSFER_BORDER_WIDTH}px`
      : `${NORMAL_BORDER_WIDTH}px`;
  });

  if (stationIds.start) {
    const startCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.start}"] > div`
    );
    if (startCircle) {
      startCircle.style.borderColor = "#ff3b30";
      startCircle.style.borderWidth = `${TRANSFER_BORDER_WIDTH}px`;
    }
  }

  if (stationIds.end) {
    const endCircle = document.querySelector<HTMLDivElement>(
      `.station-label-root[data-station-id="${stationIds.end}"] > div`
    );
    if (endCircle) {
      endCircle.style.borderColor = "#00c853";
      endCircle.style.borderWidth = `${TRANSFER_BORDER_WIDTH}px`;
    }
  }
}

/**
 * 정보 패널의 텍스트를 업데이트합니다.
 */
export function setInfoText(text: string): void {
  const el = document.querySelector<HTMLDivElement>(".trip-info");
  if (el) el.innerHTML = text;
}
