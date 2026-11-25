export type VelosfAudience = "ALL" | "RESPONSABLE" | "TECHNICIEN" | "BORNE";

export type VelosfEventSeverity = "info" | "success" | "warning" | "alert";

export type VelosfEventKind =
  | "RECLAMATION_CREATED"
  | "REPARATION_PLANIFIEE"
  | "REPARATION_DEMARREE"
  | "REPARATION_CLOTUREE"
  | "REPARATION_ROUVERTE"
  | "MISSION_ASSIGNED"
  | "MISSION_UPDATED"
  | "MISSION_DELETED"
  | "MISSION_ETAPE_VALIDEE"
  | "MISSION_CLOTUREE"
  | "MISSION_PANNE_RECUPEREE"
  | "LOCATION_DEMARREE"
  | "LOCATION_TERMINEE"
  | "STATION_UPDATED"
  | "PARC_UPDATED"
  | "SYSTEM_SYNC";

export interface VelosfRealtimeEvent {
  id: string;
  at: string;
  audience: VelosfAudience;
  targetMatricule?: number;
  targetStationId?: number;
  severity: VelosfEventSeverity;
  title: string;
  message: string;
  route?: string;
  kind: VelosfEventKind;
}
