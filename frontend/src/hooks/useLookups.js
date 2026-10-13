import { useEffect, useState } from "react";
import { getLookups } from "../api/lookups";

const EMPTY = { areas: [], subjects: [], class_levels: [], universities: [] };

/** Reference lists for filter menus. If the request fails the lists stay empty (menus show "Any"). */
export function useLookups() {
  const [lookups, setLookups] = useState(EMPTY);

  useEffect(() => {
    let active = true;
    getLookups()
      .then((data) => active && setLookups({ ...EMPTY, ...data }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return lookups;
}
