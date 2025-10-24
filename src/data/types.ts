export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  isTransfer: boolean;
  description: string;
}

export interface SubwayLine {
  id: string;
  name: string;
  color: string;
}

export interface Edge {
  from: string; // 출발역ID
  to: string; // 도착역ID
  line: string; // 노선ID
  weight: number; // 소요시간(분)
}

export type RouteHistoryItem = { from: Station; to: Station };
