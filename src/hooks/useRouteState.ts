import { useState, useCallback } from "react";
import type { Station, RouteHistoryItem } from "../data/types";

export interface UseRouteStateReturn {
  startStation: Station | null;
  endStation: Station | null;
  routeHistory: RouteHistoryItem[];
  setStartStation: (station: Station | null) => void;
  setEndStation: (station: Station | null) => void;
  addToHistory: (from: Station, to: Station) => void;
  removeFromHistory: (item: RouteHistoryItem) => void;
  selectHistoryItem: (item: RouteHistoryItem) => void;
}

/**
 * 경로 탐색 관련 상태를 관리하는 Custom Hook
 * 출발역, 도착역, 경로 이력을 관리하며 이력은 최대 4개까지 유지됩니다.
 */
export function useRouteState(): UseRouteStateReturn {
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [endStation, setEndStation] = useState<Station | null>(null);
  const [routeHistory, setRouteHistory] = useState<RouteHistoryItem[]>([]);

  /**
   * 경로 이력에 새 항목을 추가합니다.
   * 중복된 경로는 맨 앞으로 이동하고, 최대 4개까지만 유지합니다.
   */
  const addToHistory = useCallback((from: Station, to: Station) => {
    setRouteHistory((prev) => {
      // 중복 제거: 같은 출발지-도착지 조합이 있으면 제거
      const filtered = prev.filter(
        (h) => !(h.from.id === from.id && h.to.id === to.id)
      );
      // 새 항목을 맨 앞에 추가하고 최대 4개까지만 유지
      return [{ from, to }, ...filtered].slice(0, 4);
    });
  }, []);

  /**
   * 경로 이력에서 특정 항목을 제거합니다.
   */
  const removeFromHistory = useCallback((item: RouteHistoryItem) => {
    setRouteHistory((prev) =>
      prev.filter(
        (h) => !(h.from.id === item.from.id && h.to.id === item.to.id)
      )
    );
  }, []);

  /**
   * 경로 이력 항목을 선택하여 출발역과 도착역을 설정합니다.
   */
  const selectHistoryItem = useCallback((item: RouteHistoryItem) => {
    setStartStation(item.from);
    setEndStation(item.to);
  }, []);

  return {
    startStation,
    endStation,
    routeHistory,
    setStartStation,
    setEndStation,
    addToHistory,
    removeFromHistory,
    selectHistoryItem,
  };
}
