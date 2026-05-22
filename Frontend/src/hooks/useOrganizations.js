/**
 * src/hooks/useOrganizations.js
 *
 * Fetches the organization list from the backend and exposes
 * a helper to filter by org_type_id.
 *
 * org_type_id mapping (from message.txt + backend):
 *   1 → Payment (Khalti)
 *   2 → Telecom / Landline (Ncell, NTC)
 *   3 → Water (Community Khanepani, KUKL)
 *   4 → Electricity (NEA)
 *   5 → Education (Colleges / Schools)
 *   6 → Internet (Worldlink, Vianet, Subisu, NT FTTH, Dishhome)
 */

import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Cache in module scope — shared across all component instances.
let _cache = null;
let _inflight = null;

async function fetchOrganizations() {
  if (_cache) return _cache;
  if (_inflight) return _inflight;

  _inflight = fetch(`${BASE}/organizations`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load organizations");
      return r.json();
    })
    .then((data) => {
      // Support both { organizations: [...] } and plain array responses
      const list = Array.isArray(data) ? data : data.organizations ?? [];
      _cache = list;
      _inflight = null;
      return list;
    })
    .catch((err) => {
      _inflight = null;
      throw err;
    });

  return _inflight;
}

/**
 * Invalidate the module-level cache (call after a new org registers).
 */
export function invalidateOrgsCache() {
  _cache = null;
}

/**
 * Hook usage:
 *   const { orgs, loading, error } = useOrganizations(typeId);
 *
 * Pass typeId = null to get ALL organizations.
 */
export function useOrganizations(typeId = null) {
  const [all, setAll] = useState(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (_cache) {
      setAll(_cache);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOrganizations()
      .then((list) => {
        if (!cancelled) {
          setAll(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orgs =
    typeId == null ? all : all.filter((o) => o.org_type_id === typeId);

  return { orgs, loading, error };
}

export const ORG_TYPES = {
  TELECOM: 2,
  WATER: 3,
  ELECTRICITY: 4,
  EDUCATION: 5,
  INTERNET: 6,
};
