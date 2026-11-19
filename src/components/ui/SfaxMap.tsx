"use client";

import type { Station } from "@/lib/supabase/types";

export function SfaxMap({
  stations,
  selectedStationId,
  onSelectStation,
  routeStationIds,
}: {
  stations: Station[];
  selectedStationId?: number | null;
  onSelectStation?: (station: Station) => void;
  routeStationIds?: number[];
}) {
  const getStationById = (id: number) =>
    stations.find((s) => s.id_station === id);

  const routePoints = (routeStationIds ?? [])
    .map((id) => getStationById(id))
    .filter((s): s is Station => Boolean(s));

  return (
    <div className="card-sfax-flat relative overflow-hidden bg-[#F6F1E7] p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-heading text-sm font-semibold text-[#14232B]">
          Réseau CycloSfaxcity — Sfax
        </span>
        <div className="flex items-center gap-3 font-mono-sfax text-[11px]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full border border-[#14232B] bg-[#C8553D]" />
            Déficit
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full border border-[#14232B] bg-[#5E7B3A]" />
            Équilibrée
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full border border-[#14232B] bg-[#F0A42B]" />
            Surplus
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 100 90"
        className="h-64 w-full rounded-[6px] border border-[#E3D9C6] bg-[#FFFDF8]"
      >
        {/* Littoral Salines de Sfax */}
        <path
          d="M 78 0 Q 82 35 88 65 L 100 90 L 100 0 Z"
          fill="#9DB8BF"
          fillOpacity="0.25"
        />
        <text x="86" y="45" fontSize="2.8" fill="#0E5A6B" fontFamily="monospace">
          Mer
        </text>

        {/* Lignes de réseau de base */}
        {stations.length > 1 &&
          stations.slice(0, -1).map((s, idx) => {
            const next = stations[idx + 1];
            return (
              <line
                key={`grid-${s.id_station}`}
                x1={s.map_x}
                y1={s.map_y}
                x2={next.map_x}
                y2={next.map_y}
                stroke="#E3D9C6"
                strokeWidth="0.6"
                strokeDasharray="1.5 1.5"
              />
            );
          })}

        {/* Itinéraire actif si fourni */}
        {routePoints.length > 1 &&
          routePoints.slice(0, -1).map((s, idx) => {
            const next = routePoints[idx + 1];
            return (
              <line
                key={`route-${idx}`}
                x1={s.map_x}
                y1={s.map_y}
                x2={next.map_x}
                y2={next.map_y}
                stroke="#0E5A6B"
                strokeWidth="1.2"
                strokeDasharray="2 1.2"
              />
            );
          })}

        {/* Noeuds stations */}
        {stations.map((s) => {
          const ratio = s.capacite > 0 ? s.nb_velos_actuel / s.capacite : 0;
          const color =
            ratio <= 0.25
              ? "#C8553D"
              : ratio >= 0.75
              ? "#F0A42B"
              : "#5E7B3A";
          const isSelected = selectedStationId === s.id_station;
          const routeIdx = routeStationIds?.indexOf(s.id_station) ?? -1;

          return (
            <g
              key={s.id_station}
              className={onSelectStation ? "cursor-pointer" : undefined}
              onClick={() => onSelectStation?.(s)}
            >
              {isSelected && (
                <circle
                  cx={s.map_x}
                  cy={s.map_y}
                  r="5.2"
                  fill="none"
                  stroke="#F0A42B"
                  strokeWidth="0.9"
                />
              )}
              <circle
                cx={s.map_x}
                cy={s.map_y}
                r="3.2"
                fill={color}
                stroke="#14232B"
                strokeWidth="0.7"
              />
              {routeIdx >= 0 && (
                <text
                  x={s.map_x}
                  y={s.map_y + 1.1}
                  textAnchor="middle"
                  fontSize="2.5"
                  fill="#FFFDF8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {routeIdx + 1}
                </text>
              )}
              <text
                x={s.map_x}
                y={s.map_y - 4.5}
                textAnchor="middle"
                fontSize="2.6"
                fill="#14232B"
                fontWeight="600"
              >
                {s.nom.split("–")[0].trim()}
              </text>
              <text
                x={s.map_x}
                y={s.map_y + 6.2}
                textAnchor="middle"
                fontSize="2.3"
                fill="#0E5A6B"
                fontFamily="monospace"
              >
                {s.nb_velos_actuel}/{s.capacite}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
