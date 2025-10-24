import type { Edge } from "./types";

export const EDGE_STOP_MIN = 4;
export const EDGE_TRANSFER_MIN = 2;

export const edges: Edge[] = [
  // 1호선 (파랑)
  { from: "101", to: "102", line: "1", weight: EDGE_STOP_MIN },
  { from: "102", to: "101", line: "1", weight: EDGE_STOP_MIN },

  { from: "102", to: "103", line: "1", weight: EDGE_STOP_MIN },
  { from: "103", to: "102", line: "1", weight: EDGE_STOP_MIN },

  { from: "103", to: "104", line: "1", weight: EDGE_STOP_MIN },
  { from: "104", to: "103", line: "1", weight: EDGE_STOP_MIN },

  { from: "104", to: "105", line: "1", weight: EDGE_STOP_MIN },
  { from: "105", to: "104", line: "1", weight: EDGE_STOP_MIN },

  { from: "105", to: "106", line: "1", weight: EDGE_STOP_MIN },
  { from: "106", to: "105", line: "1", weight: EDGE_STOP_MIN },

  // 2호선 (초록)
  { from: "201", to: "302", line: "2", weight: EDGE_STOP_MIN },
  { from: "302", to: "201", line: "2", weight: EDGE_STOP_MIN },
  { from: "202", to: "102", line: "2", weight: EDGE_STOP_MIN },
  { from: "102", to: "202", line: "2", weight: EDGE_STOP_MIN },
  { from: "102", to: "302", line: "2", weight: EDGE_STOP_MIN },
  { from: "302", to: "102", line: "2", weight: EDGE_STOP_MIN },

  { from: "202", to: "203", line: "2", weight: EDGE_STOP_MIN },
  { from: "203", to: "202", line: "2", weight: EDGE_STOP_MIN },

  { from: "203", to: "105", line: "2", weight: EDGE_STOP_MIN },
  { from: "105", to: "203", line: "2", weight: EDGE_STOP_MIN },
  { from: "105", to: "204", line: "2", weight: EDGE_STOP_MIN },
  { from: "204", to: "105", line: "2", weight: EDGE_STOP_MIN },

  // 3호선 (주황)
  { from: "301", to: "302", line: "3", weight: EDGE_STOP_MIN },
  { from: "302", to: "301", line: "3", weight: EDGE_STOP_MIN },

  { from: "302", to: "104", line: "3", weight: EDGE_STOP_MIN },
  { from: "104", to: "302", line: "3", weight: EDGE_STOP_MIN },

  { from: "104", to: "303", line: "3", weight: EDGE_STOP_MIN },
  { from: "303", to: "104", line: "3", weight: EDGE_STOP_MIN },

  { from: "303", to: "304", line: "3", weight: EDGE_STOP_MIN },
  { from: "304", to: "303", line: "3", weight: EDGE_STOP_MIN },

  { from: "304", to: "305", line: "3", weight: EDGE_STOP_MIN },
  { from: "305", to: "304", line: "3", weight: EDGE_STOP_MIN },

  // 4호선 (하늘)
  { from: "203", to: "402", line: "4", weight: EDGE_STOP_MIN },
  { from: "402", to: "203", line: "4", weight: EDGE_STOP_MIN },

  { from: "402", to: "401", line: "4", weight: EDGE_STOP_MIN },
  { from: "401", to: "402", line: "4", weight: EDGE_STOP_MIN },

  { from: "203", to: "403", line: "4", weight: EDGE_STOP_MIN },
  { from: "403", to: "203", line: "4", weight: EDGE_STOP_MIN },

  { from: "403", to: "404", line: "4", weight: EDGE_STOP_MIN },
  { from: "404", to: "403", line: "4", weight: EDGE_STOP_MIN },

  // 환승 (환승역: 1-2, 1-3, 2-4 등)
  { from: "102", to: "102", line: "1-2", weight: EDGE_TRANSFER_MIN },
  { from: "104", to: "104", line: "1-3", weight: EDGE_TRANSFER_MIN },
  { from: "105", to: "105", line: "1-2", weight: EDGE_TRANSFER_MIN },
  { from: "302", to: "302", line: "2-3", weight: EDGE_TRANSFER_MIN },
  { from: "203", to: "203", line: "2-4", weight: EDGE_TRANSFER_MIN },
];
