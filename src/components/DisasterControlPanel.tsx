import { CommunityRisk, PumpStation, TelemetrySensor, EvacuationShelter, DistressSOS, FloodSeverity } from "../types";
import { Droplets, ShieldAlert, Cpu, Heart, CheckCircle2, AlertTriangle, Play, Pause, RefreshCw, PhoneCall, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DisasterControlPanelProps {
  communities: CommunityRisk[];
  pumps: PumpStation[];
  sensors: TelemetrySensor[];
  shelters: EvacuationShelter[];
  sosList: DistressSOS[];
  calculatedScore: number;
  severity: FloodSeverity;
  onUpdateSOS: (id: string, newStatus: "PENDING" | "DISPATCHED" | "SOLVED") => void;
  onDeleteSOS: (id: string) => void;
  onSelectCommunityByCoords: (coords: [number, number], item: any, type: "community" | "pump" | "sensor" | "shelter" | "sos") => void;
}

export default function DisasterControlPanel({
  communities,
  pumps,
  sensors,
  shelters,
  sosList,
  calculatedScore,
  severity,
  onUpdateSOS,
  onDeleteSOS,
  onSelectCommunityByCoords,
}: DisasterControlPanelProps) {
  // Summing metrics
  const totalVulnerable = communities.reduce((acc, c) => acc + c.vulnerablePopCount, 0);
  const floodedCommunitiesCount = communities.filter((c) => c.isFlooded).length;
  
  const activePumps = pumps.filter((p) => p.operationalStatus === "ACTIVE").length;
  const failedPumps = pumps.filter((p) => p.operationalStatus === "FAILED").length;
  const floodedEngines = pumps.filter((p) => p.engineFlooded).length;
  const totalDischarge = pumps.reduce((acc, p) => acc + p.dischargeRate, 0);

  const avgRain24h = (sensors.reduce((acc, s) => acc + s.rainfall24h, 0) / sensors.length).toFixed(1);
  const avgRain120h = (sensors.reduce((acc, s) => acc + s.rainfall120h, 0) / sensors.length).toFixed(0);

  const pendingSOS = sosList.filter((s) => s.status === "PENDING");
  const dispatchedSOS = sosList.filter((s) => s.status === "DISPATCHED");

  return (
    <div className="space-y-4 font-sans text-[#e0e0e0] p-1 flex flex-col h-full overflow-y-auto pr-2 select-none">
      {/* 24-Hour Operations Ticker */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#888] uppercase">
            YALA FLOOD DISPATCH COMMAND DECK
          </span>
        </div>
        <div className="text-[10px] text-[#666] bg-[#111] border border-[#222] px-2 py-0.5 rounded-sm font-mono">
          TIME_COORD_UTC: 2026-06-05
        </div>
      </div>

      {/* Grid of Key Numerical Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Metric 1: Rainfall 24h & Cumulative */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-2.5 relative overflow-hidden">
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded-sm bg-[#111] border border-[#222] text-[#666] text-[8px] font-mono font-bold leading-none">
            MET_SEN
          </div>
          <p className="text-[9px] text-[#666] font-mono font-bold block uppercase">RAINFALL_24H</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono text-sky-400">303.6</span>
            <span className="text-[9px] text-[#666] font-mono">MM</span>
          </div>
          <div className="text-[9px] text-[#666] border-t border-[#222] mt-2 pt-1 flex justify-between font-mono">
            <span>5D_CUMUL:</span>
            <span className="font-bold text-[#e0e0e0]">1,072 MM</span>
          </div>
        </div>

        {/* Metric 2: Vulnerable Areas At Risk */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-2.5 relative overflow-hidden">
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded-sm bg-[#111] border border-[#222] text-[#666] text-[8px] font-mono font-bold leading-none">
            RISK_COM
          </div>
          <p className="text-[9px] text-[#666] font-mono font-bold block uppercase">AT_RISK_SPOTS</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono text-amber-500">41</span>
            <span className="text-[9px] text-[#666] font-mono">OF 44 AREAS</span>
          </div>
          <div className="text-[9px] text-[#666] border-t border-[#222] mt-2 pt-1 flex justify-between font-mono">
            <span>POPULATION:</span>
            <span className="font-bold text-[#e0e0e0]">{totalVulnerable} PAX</span>
          </div>
        </div>

        {/* Metric 3: Pumps Status Online */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-2.5 relative overflow-hidden">
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded-sm bg-[#111] border border-[#222] text-[#666] text-[8px] font-mono font-bold leading-none">
            DRN_SYS
          </div>
          <p className="text-[9px] text-[#666] font-mono font-bold block uppercase">ACTIVE_PUMPS</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono text-emerald-400">{activePumps}</span>
            <span className="text-[9px] text-[#666] font-mono">OF 14 STN</span>
          </div>
          <div className="text-[9px] text-[#666] border-t border-[#222] mt-2 pt-1 flex justify-between font-mono">
            <span>FAIL_COMP:</span>
            <span className="font-bold text-red-500 animate-pulse">{failedPumps} UNITS ({floodedEngines} FLOODED)</span>
          </div>
        </div>

        {/* Metric 4: Total Discharge Rate m3/s */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-2.5 relative overflow-hidden">
          <div className="absolute top-1 right-1 px-1 py-0.5 rounded-sm bg-[#111] border border-[#222] text-[#666] text-[8px] font-mono font-bold leading-none">
            FLOW_IND
          </div>
          <p className="text-[9px] text-[#666] font-mono font-bold block uppercase">TOTAL_DISCH</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono text-indigo-400">{totalDischarge.toFixed(1)}</span>
            <span className="text-[9px] text-[#666] font-mono">M³/SEC</span>
          </div>
          <div className="text-[9px] text-[#666] border-t border-[#222] mt-2 pt-1 flex justify-between font-mono">
            <span>TIDE_AVG:</span>
            <span className="font-bold text-[#e0e0e0]">1.10 M</span>
          </div>
        </div>
      </div>

      {/* Extreme Alarms & Local Critical Points */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5">
        <h4 className="text-[10px] font-bold font-mono text-red-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-[#222] pb-2">
          <ShieldAlert className="h-3.5 w-3.5 text-red-500 animate-bounce" />
          CRITICAL SECTOR ENCOUNTER WARNINGS
        </h4>
        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
          {/* Critical Pump Failure Display */}
          <div className="p-2.5 rounded-sm bg-[#180a0a] border border-red-950 flex items-center justify-between text-xs transition-colors hover:bg-[#200f0f]">
            <div className="flex flex-col pr-3">
              <span className="font-bold text-red-200 font-mono text-[11px] flex items-center gap-1">
                 ⚠️ SECTOR YALA_HOSP_GEN PUMP_FAIL
              </span>
              <p className="text-[10px] text-red-400 mt-0.5 leading-normal font-sans">
                Station power grid failure due to extreme local torrent runoff. Mechanical discharge capacity dropped to 0 m³/s. River overflow expected in 30m.
              </p>
            </div>
            <button
              onClick={() => onSelectCommunityByCoords([6.5348, 101.2699], pumps[3], "pump")}
              className="px-2 py-1 rounded-sm bg-red-950 text-red-300 font-mono text-[9px] uppercase font-bold shrink-0 hover:bg-[#401111] border border-red-900/50"
            >
              LOCATE
            </button>
          </div>

          {/* Flooding communities display */}
          <div className="p-2.5 rounded-sm bg-[#111111] border border-[#222] flex items-center justify-between text-xs">
            <div className="flex flex-col pr-3">
              <span className="font-bold font-mono text-amber-500 text-[11px]">
                ⚠️ ALARM SECTOR OLD_MKT_STENG RUNOFF
              </span>
              <p className="text-[10px] text-[#888] mt-0.5 leading-normal font-sans">
                Severe residential mud floods from Tha Sap river curve overflow. Active channel dredging teams in position. Avoid low-altitude lanes.
              </p>
            </div>
            <button
              onClick={() => onSelectCommunityByCoords([6.5458, 101.2981], communities[2], "community")}
              className="px-2 py-1 rounded-sm bg-[#222] text-[#888] hover:text-white font-mono text-[9px] uppercase"
            >
              LOCATE
            </button>
          </div>
        </div>
      </div>

      {/* SOS Signal Processing / Ticket Command Deck */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
          <h4 className="text-[10px] font-bold font-mono text-sky-400 uppercase tracking-widest flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-red-500 animate-pulse" />
            DISPATCH QUEUE (ACTIVE SOS ALARMS)
          </h4>
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-red-950/50 text-red-300 border border-red-900/40 animate-pulse">
            QUEUED: {pendingSOS.length}
          </span>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          <AnimatePresence>
            {sosList.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#666] font-mono uppercase">
                NO REGISTERED SOS SIGNALS (ALL SECTORS SECURED)
              </div>
            ) : (
              sosList.map((sos) => {
                let badgeClass = "bg-[#180a0a] text-red-400 border-red-900/60";
                let statusLabel = "PENDING_DISPATCH";

                if (sos.status === "DISPATCHED") {
                  badgeClass = "bg-[#1d1607] text-amber-400 border-amber-900";
                  statusLabel = "UNIT_DISPATCHED";
                } else if (sos.status === "SOLVED") {
                  badgeClass = "bg-[#071810] text-[#10b981] border-emerald-900/60";
                  statusLabel = "RESOLVED";
                }

                return (
                  <motion.div
                    key={sos.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-2.5 rounded-sm bg-[#111] border border-[#222] flex flex-col justify-between gap-2.5 text-xs hover:border-[#333] transition-colors"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-white font-mono">{sos.communityName}</span>
                        <span className={`text-[8px] font-mono px-1.5 rounded-sm border ${badgeClass} font-bold`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-[#bbb] italic bg-[#050505] p-2.5 rounded-sm border border-[#222] text-[10.5px] leading-relaxed font-sans">
                        "{sos.message}"
                      </p>
                      <div className="flex justify-between text-[9px] font-mono text-[#666] mt-2">
                        <span>Vulnerable qty: <strong className="text-red-400">{sos.vulnerableCount} counts</strong></span>
                        <span>Tel: <strong className="text-[#aaa]">{sos.senderPhone}</strong></span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 border-t border-[#222] pt-2">
                      <button
                        onClick={() => onSelectCommunityByCoords(sos.coordinates, sos, "sos")}
                        className="px-2 py-1 rounded-sm bg-[#222] hover:bg-[#333] text-[#888] hover:text-white font-mono text-[9px] uppercase"
                      >
                        PAN MAP
                      </button>
                      
                      {sos.status === "PENDING" && (
                        <button
                          onClick={() => onUpdateSOS(sos.id, "DISPATCHED")}
                          className="px-2.5 py-1 rounded-sm bg-amber-600 text-white font-mono font-bold text-[9px] uppercase hover:bg-amber-500 transition-colors"
                        >
                          DISPATCH VESSEL
                        </button>
                      )}

                      {sos.status === "DISPATCHED" && (
                        <button
                          onClick={() => onUpdateSOS(sos.id, "SOLVED")}
                          className="px-2.5 py-1 rounded-sm bg-emerald-600 text-white font-mono font-bold text-[9px] uppercase hover:bg-emerald-500 transition-colors"
                        >
                          SOLVE TARGET
                        </button>
                      )}

                      {sos.status === "SOLVED" && (
                        <button
                          onClick={() => onDeleteSOS(sos.id)}
                          className="px-2.5 py-1 rounded-sm bg-red-950 text-red-300 font-mono font-bold text-[9px] uppercase hover:bg-red-900"
                        >
                          DELETE LOG
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
