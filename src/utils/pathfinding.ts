import type { Station, Edge } from "../data/types";

export type NodeKey = string; // `${stationId}@${lineId}`

export interface PathfindingResult {
  minutes: number;
  stops: number;
  transfers: number;
  coords: [number, number][];
  transferStationIds: string[];
  path: NodeKey[];
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>;
}

/**
 * Edge 리스트를 기반으로 그래프 구조를 생성합니다.
 * 각 역은 소속된 노선별로 별도의 노드를 가지며, 환승은 같은 역의 서로 다른 노선 노드 간 연결로 표현됩니다.
 */
export function buildGraph(
  stations: Station[],
  edges: Edge[]
): {
  adj: Map<NodeKey, Array<{ to: NodeKey; cost: number }>>;
  nodeMeta: Map<NodeKey, { stationId: string; lineId: string }>;
} {
  const adj = new Map<NodeKey, Array<{ to: NodeKey; cost: number }>>();
  const nodeMeta = new Map<NodeKey, { stationId: string; lineId: string }>();

  // 모든 역*노선별 노드 등록
  stations.forEach((st) =>
    st.lines.forEach((lid) =>
      nodeMeta.set(`${st.id}@${lid}`, { stationId: st.id, lineId: lid })
    )
  );

  // Edge 리스트 기반 간선 추가
  edges.forEach(({ from, to, line, weight }) => {
    if (line.includes("-")) {
      // 환승 edge
      const [lA, lB] = line.split("-");
      const fromKey = `${from}@${lA}`;
      const toKey = `${to}@${lB}`;

      if (!nodeMeta.has(fromKey)) {
        console.warn("❗환승 edge: nodeMeta에 없는 fromKey", fromKey);
      }
      if (!nodeMeta.has(toKey)) {
        console.warn("❗환승 edge: nodeMeta에 없는 toKey", toKey);
      }

      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });

      if (!adj.has(toKey)) adj.set(toKey, []);
      adj.get(toKey)!.push({ to: fromKey, cost: weight });
    } else {
      // 일반 edge
      const fromKey = `${from}@${line}`;
      const toKey = `${to}@${line}`;

      if (!adj.has(fromKey)) adj.set(fromKey, []);
      adj.get(fromKey)!.push({ to: toKey, cost: weight });
    }
  });

  return { adj, nodeMeta };
}

/**
 * Dijkstra 알고리즘을 사용하여 최단 경로를 탐색합니다.
 * 환승 정보를 포함한 경로 결과를 반환합니다.
 */
export function dijkstraWithTransfers(
  start: Station,
  end: Station,
  stations: Station[],
  edges: Edge[],
  edgeStopMin: number,
  edgeTransferMin: number
): PathfindingResult | null {
  const { adj, nodeMeta } = buildGraph(stations, edges);

  const startNodes: NodeKey[] = start.lines.map((lid) => `${start.id}@${lid}`);
  const isGoal = (key: NodeKey) => key.startsWith(`${end.id}@`);

  const dist = new Map<NodeKey, number>();
  const prev = new Map<NodeKey, NodeKey | null>();
  const pq: Array<{ key: NodeKey; d: number }> = [];

  startNodes.forEach((k) => {
    dist.set(k, 0);
    prev.set(k, null);
    pq.push({ key: k, d: 0 });
  });

  const popMin = () => {
    pq.sort((a, b) => a.d - b.d);
    return pq.shift();
  };

  let goalKey: NodeKey | null = null;

  while (pq.length) {
    const cur = popMin()!;
    if (dist.get(cur.key)! < cur.d) continue;

    if (isGoal(cur.key)) {
      goalKey = cur.key;
      break;
    }

    const edgeList = adj.get(cur.key) || [];
    for (const { to, cost } of edgeList) {
      const nd = cur.d + cost;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, cur.key);
        pq.push({ key: to, d: nd });
      }
    }
  }

  if (!goalKey) return null;

  // 경로 복원
  const rev: NodeKey[] = [];
  let t: NodeKey | null = goalKey;
  while (t) {
    rev.push(t);
    t = prev.get(t) ?? null;
  }
  const path = rev.reverse();

  // 통계, 환승역 추출
  let transfers = 0;
  let stops = 0;
  const transferStationIds: string[] = [];

  for (let i = 1; i < path.length; i++) {
    const a = nodeMeta.get(path[i - 1]);
    const b = nodeMeta.get(path[i]);

    if (!a || !b) {
      console.error(
        "❗[경로 분석] nodeMeta에 없는 key",
        path[i - 1],
        a,
        path[i],
        b
      );
      continue; // 방어 처리
    }

    if (a.stationId === b.stationId && a.lineId !== b.lineId) {
      transfers++;
      transferStationIds.push(a.stationId);
    } else if (a.lineId === b.lineId && a.stationId !== b.stationId) {
      stops++;
    }
  }

  const minutes = stops * edgeStopMin + transfers * edgeTransferMin;

  // 경로의 [lat, lng] 좌표 추출 (중복 역 생략)
  const coords: [number, number][] = [];
  let lastStation: string | null = null;

  console.log("[경로복원] path =", path, "nodeMeta size =", nodeMeta.size);

  for (const key of path) {
    const meta = nodeMeta.get(key);
    if (!meta) {
      console.error("❗[경로복원] nodeMeta에 없는 key:", key);
      continue; // 방어 처리
    }

    const { stationId } = meta;
    if (stationId !== lastStation) {
      const s = stations.find((s) => s.id === stationId);
      if (s) coords.push([s.lat, s.lng]);
      lastStation = stationId;
    }
  }

  return {
    minutes,
    stops,
    transfers,
    coords,
    transferStationIds,
    path,
    nodeMeta,
  };
}
