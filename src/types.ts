export enum FloodSeverity {
  SAFE = "SAFE",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface CommunityRisk {
  id: string;
  name: string;
  district: string;
  vulnerablePopCount: number;
  floodRiskScore: number; // 0 - 100
  coordinates: [number, number]; // [lat, lng]
  historicalMaxRainfallMs: number; // in mm
  isFlooded: boolean;
  blockageFlag: boolean;
}

export interface PumpStation {
  id: string;
  name: string;
  coordinates: [number, number];
  operationalStatus: "ACTIVE" | "INACTIVE" | "FAILED";
  engineFlooded: boolean;
  capacityCubicMeterPerSec: number;
  activePumpCount: number;
  totalPumpCount: number;
  dischargeRate: number; // actual discharge rate m3/s
}

export interface TelemetrySensor {
  id: string;
  name: string;
  coordinates: [number, number];
  waterLevelMsl: number; // meters above sea level
  warningThresholdMsl: number;
  criticalThresholdMsl: number;
  flowRate: number; // m3/s
  rainfall24h: number; // mm
  rainfall120h: number; // mm cumulative
  batteryStatus: number; // 0 - 100%
  healthStatus: "EXCELLENT" | "GOOD" | "MAINTENANCE" | "DEGRADED" | "OFFLINE";
  tideLevelForecast: number; // meters
}

export interface EvacuationShelter {
  id: string;
  name: string;
  coordinates: [number, number];
  capacityRatio: number; // 0 to 1 (fullness)
  maxCapacity: number;
  currentOccupants: number;
  status: "AVAILABLE" | "NEAR_LIMIT" | "FULL" | "CLOSED";
  contactNumber: string;
  vulnerableServed: number;
}

export interface DistressSOS {
  id: string;
  communityName: string;
  coordinates: [number, number];
  message: string;
  senderPhone: string;
  timestamp: string;
  status: "PENDING" | "DISPATCHED" | "SOLVED";
  vulnerableCount: number;
}

export interface DisasterSimulationState {
  rainfallMultiplier: number; // multiplier 0.5 to 3.0
  waterLevelOffset: number; // offset in meters
  pumpFailureRate: number; // 0 to 100% chance
  tideLevelForecast: number; // tidewater forecast offset
  floodBarrierDeployed: boolean;
  absWallStatus: "FULLY_RAISED" | "PARTIALLY_RAISED" | "RETRACTED";
  communicationReachRate: number; // 0 to 100%
  runoffCoefficient: number; // 0 to 1
}

export interface AIAnalysisResult {
  riskScore: number;
  severity: FloodSeverity;
  alertHeadline: string;
  scenarios: string[];
  recommendations: string[];
  keyFactors: {
    factor: string;
    impact: "HIGH" | "MEDIUM" | "LOW";
    value: string;
  }[];
}
