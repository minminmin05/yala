import { useState, FormEvent } from "react";
import { DisasterSimulationState, DistressSOS } from "../types";
import { Play, Pause, RefreshCw, PlusCircle, AlertTriangle, Droplet, Wind, ShieldAlert } from "lucide-react";

interface EmergencySimulationPanelProps {
  simulationState: DisasterSimulationState;
  onUpdateSimulation: (state: Partial<DisasterSimulationState>) => void;
  onAddSOS: (alert: Omit<DistressSOS, "id" | "timestamp" | "status">) => void;
  onResetSimulation: () => void;
}

export default function EmergencySimulationPanel({
  simulationState,
  onUpdateSimulation,
  onAddSOS,
  onResetSimulation,
}: EmergencySimulationPanelProps) {
  // SOS Custom input states
  const [sosCommunity, setSosCommunity] = useState("ชุมชนเวฬุวัน-วิเวกโกลก");
  const [sosMessage, setSosMessage] = useState("มีผู้สูงอายุติดอยู่บนที่พักระดับพิงเตียงสูง น้ำเพิ่มชั่วโมงเดือดด่วนพิเศษค่ะ");
  const [sosVulnerable, setSosVulnerable] = useState(2);
  const [sosPhone, setSosPhone] = useState("081-992-0199");

  const [coordsOption, setCoordsOption] = useState<"c1" | "c2" | "c3" | "c4">("c1");

  const coordinatesMap: Record<string, { name: string; coords: [number, number] }> = {
    c1: { name: "ชุมชนเวฬุวัน-วิเวกโกลก", coords: [6.5492, 101.2915] },
    c2: { name: "ชุมชนเสาธงทอง (ตลาดเก่า)", coords: [6.5435, 101.2852] },
    c3: { name: "ชุมชนริมแม่น้ำปัตตานี 1", coords: [6.5582, 101.2811] },
    c4: { name: "ชุมชนท่าสาปพัฒนา", coords: [6.5552, 101.2619] },
  };

  const handleCreateSOS = (e: FormEvent) => {
    e.preventDefault();
    const target = coordinatesMap[coordsOption];
    onAddSOS({
      communityName: target.name,
      coordinates: target.coords,
      message: sosMessage,
      senderPhone: sosPhone,
      vulnerableCount: sosVulnerable,
    });
    // Trigger reset messages
    setSosMessage("ต้องการความช่วยเหลือ ด่วน น้ำสูงขึ้นอย่างต่อเนื่อง");
  };

  return (
    <div className="space-y-4 text-[#e0e0e0] font-sans p-1 h-full overflow-y-auto pr-2 select-none">
      {/* Simulation Master Header Controls */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5 shadow-lg flex items-center justify-between">
        <div>
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">
            STRATEGIC SIMULATION ENGINE (SANDBOX)
          </h4>
          <span className="text-[10px] text-[#666] leading-normal mt-0.5 block">
            ปรับเปลี่ยนระดับปริมาณน้ำฝนและโครงสร้างเพื่อวิเคราะห์และทดสอบแผนเผชิญเหตุกองอำนวยการ
          </span>
        </div>
        <button
          onClick={onResetSimulation}
          className="p-1 px-2.5 rounded-sm border border-[#222] bg-[#111] hover:bg-[#1a1a1a] text-[10px] font-mono font-bold text-slate-300 flex items-center gap-1 transition-all uppercase"
        >
          <RefreshCw className="h-3 w-3" />
          RESET_SIM
        </button>
      </div>

      {/* Grid of Simulation Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Slider 1: Rain Multiplier */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400">RAINFALL_STORM_FACTOR:</span>
            <span className="text-xs font-mono font-bold text-sky-400">
              {simulationState.rainfallMultiplier.toFixed(1)}x ({(303.6 * simulationState.rainfallMultiplier).toFixed(1)} มม.)
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={simulationState.rainfallMultiplier}
            onChange={(e) => onUpdateSimulation({ rainfallMultiplier: parseFloat(e.target.value) })}
            className="w-full accent-sky-500 h-1 bg-[#111] rounded-none appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] font-mono text-[#666] mt-1.5 uppercase">
            <span>DRIZZLE (0.5x)</span>
            <span>NORM (1.0x)</span>
            <span>STORM (2.0x)</span>
            <span>TYPHOON (3.0x)</span>
          </div>
        </div>

        {/* Slider 2: River Water Height Offset */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400">RIVER_STAGE_OFFSET:</span>
            <span className="text-xs font-mono font-bold text-amber-500">
              {simulationState.waterLevelOffset > 0 ? "+" : ""}{simulationState.waterLevelOffset.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min="-1.5"
            max="4.0"
            step="0.1"
            value={simulationState.waterLevelOffset}
            onChange={(e) => onUpdateSimulation({ waterLevelOffset: parseFloat(e.target.value) })}
            className="w-full accent-amber-500 h-1 bg-[#111] rounded-none appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] font-mono text-[#666] mt-1.5 uppercase">
            <span>DRY (-1.5m)</span>
            <span>BASELINE (0m)</span>
            <span>CRITICAL (+2.0m)</span>
            <span>MAX_FLOOD (+4.0m)</span>
          </div>
        </div>

        {/* Runoff & Drainage speed coefficient */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400">RUNOFF_COEFFICIENT:</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {simulationState.runoffCoefficient.toFixed(2)} ({(simulationState.runoffCoefficient * 100).toFixed(0)}% absorption block)
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={simulationState.runoffCoefficient}
            onChange={(e) => onUpdateSimulation({ runoffCoefficient: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 h-1 bg-[#111] rounded-none appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] font-mono text-[#666] mt-1.5 uppercase">
            <span>FOREST_DECK (0.3)</span>
            <span>NORMAL_SOIL (0.6)</span>
            <span>CONCRETE_URBAN (0.95)</span>
          </div>
        </div>

        {/* Dynamic Pump Failure probability simulation limit */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400">GRID_OUTAGE_RISK:</span>
            <span className="text-xs font-mono font-bold text-red-400">
              {simulationState.pumpFailureRate}% risk
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={simulationState.pumpFailureRate}
            onChange={(e) => onUpdateSimulation({ pumpFailureRate: parseInt(e.target.value) })}
            className="w-full accent-red-500 h-1 bg-[#111] rounded-none appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] font-mono text-[#666] mt-1.5 uppercase">
            <span>MAINTAINED (0%)</span>
            <span>RISK_FACTOR (50%)</span>
            <span>TOTAL_OUTAGE (100%)</span>
          </div>
        </div>
      </div>

      {/* Structural Mitigation Switchers */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5 space-y-3">
        <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#888] border-b border-[#222] pb-1.5 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-400" />
          COORDINATED COMBAT MEASURES (STRUCTURAL)
        </h5>
 
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Barrier Deploy Button */}
          <button
            onClick={() => onUpdateSimulation({ floodBarrierDeployed: !simulationState.floodBarrierDeployed })}
            className={`p-2.5 rounded-sm border text-xs font-bold font-sans flex items-center justify-between transition-all cursor-pointer ${
              simulationState.floodBarrierDeployed
                ? "bg-sky-950/40 text-sky-300 border-sky-500/80 shadow-[0_0_10px_rgba(56,189,248,0.15)]"
                : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
            }`}
          >
            <div className="flex flex-col items-start pr-2">
              <span className="font-mono text-[10.5px]">FLOOD DEFENSE BARRIER</span>
              <span className="text-[9px] font-normal text-[#666] mt-0.5 text-left font-sans leading-none">ทำนบกั้นน้ำเทศบาลยะลาสะเตง</span>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${simulationState.floodBarrierDeployed ? "bg-sky-400 animate-pulse" : "bg-[#222]"}`} />
          </button>
 
          {/* ABS Wall State Selector */}
          <div className="flex flex-col gap-1.5 bg-[#111] border border-[#222] p-2 rounded-sm">
            <span className="text-[9px] text-[#666] font-mono font-bold uppercase">ALUMINUM ABS WALL POSITION:</span>
            <div className="grid grid-cols-3 gap-1">
              {(["RETRACTED", "PARTIALLY_RAISED", "FULLY_RAISED"] as const).map((ws) => {
                const label = ws === "RETRACTED" ? "RETRACT" : ws === "PARTIALLY_RAISED" ? "HALF-ABS" : "FULLY-ABS";
                const isSelected = simulationState.absWallStatus === ws;
 
                return (
                  <button
                    key={ws}
                    onClick={() => onUpdateSimulation({ absWallStatus: ws })}
                    className={`py-1 text-[9px] font-mono font-bold rounded-sm transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow"
                        : "bg-[#050505] text-[#666] hover:bg-[#0c0c0c] hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
 
      {/* Distress Signal SOS Spawning Form */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5 shadow-xl">
        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 border-b border-[#222] pb-1.5 mb-2.5 flex items-center gap-1.5">
          <span>🚨</span> TACTICAL_SOS_SPAWNER
        </h5>
 
        <form onSubmit={handleCreateSOS} className="space-y-2 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[#666] text-[9px] font-mono uppercase">CHOOSE_SECTOR:</label>
              <select
                value={coordsOption}
                onChange={(e) => setCoordsOption(e.target.value as any)}
                className="bg-[#111] text-slate-100 border border-[#222] p-2 rounded-sm focus:outline-none focus:border-red-600 text-[11px]"
              >
                <option value="c1">ชุมชนเวฬุวัน-วิเวกโกลก</option>
                <option value="c2">ชุมชนเสาธงทอง (ตลาดเก่า)</option>
                <option value="c3">ชุมชนริมแม่น้ำปัตตานี 1</option>
                <option value="c4">ชุมชนท่าสาปพัฒนา (ริมโค้งน้ำ)</option>
              </select>
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[#666] text-[9px] font-mono uppercase">CALLER_TELEPHONE_METRIC:</label>
              <input
                type="text"
                required
                value={sosPhone}
                onChange={(e) => setSosPhone(e.target.value)}
                className="bg-[#111] text-slate-100 border border-[#222] p-2 rounded-sm focus:outline-none focus:border-red-600 text-[11px] font-mono"
              />
            </div>
          </div>
 
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[#666] text-[9px] font-mono uppercase">DISTRESS_MESSAGE:</label>
              <input
                type="text"
                required
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                className="bg-[#111] text-slate-100 border border-[#222] p-2 rounded-sm focus:outline-none focus:border-red-600 text-[11px]"
              />
            </div>
 
            <div className="flex flex-col gap-1">
              <label className="text-[#666] text-[9px] font-mono uppercase">VULNERABLE_QTY (PAX):</label>
              <input
                type="number"
                min="1"
                max="25"
                value={sosVulnerable}
                onChange={(e) => setSosVulnerable(parseInt(e.target.value) || 1)}
                className="bg-[#111] text-slate-100 border border-[#222] p-2 rounded-sm focus:outline-none focus:border-red-600 font-mono"
              />
            </div>
          </div>
 
          <button
            type="submit"
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-[10px] uppercase rounded-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5 text-center cursor-pointer shadow-lg shadow-red-950/20 mt-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            INJECT_ACTIVE_SOS_TICKET
          </button>
        </form>
      </div>
    </div>
  );
}
