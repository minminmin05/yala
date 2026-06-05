import { useEffect, useState, useMemo } from "react";
import MapDashboard from "./components/MapDashboard";
import DisasterControlPanel from "./components/DisasterControlPanel";
import EmergencySimulationPanel from "./components/EmergencySimulationPanel";
import AIInsightsPanel from "./components/AIInsightsPanel";
import {
  CommunityRisk,
  PumpStation,
  TelemetrySensor,
  EvacuationShelter,
  DistressSOS,
  DisasterSimulationState,
  AIAnalysisResult,
  FloodSeverity,
} from "./types";
import {
  mockCommunities,
  mockPumpStations,
  mockTelemetrySensors,
  mockEvacuationShelters,
  YALA_CENTER,
} from "./data/mockData";
import { calculateDetailedRisk } from "./utils/riskAnalyzer";
import { DatabaseService } from "./services/firebase";
import { Activity, ShieldAlert, Sliders, Sparkles, Building, MapPin, Navigation, Droplets, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const INITIAL_SIM_STATE: DisasterSimulationState = {
  rainfallMultiplier: 1.0,
  waterLevelOffset: 0.0,
  pumpFailureRate: 10,
  tideLevelForecast: 1.10,
  floodBarrierDeployed: false,
  absWallStatus: "RETRACTED",
  communicationReachRate: 95,
  runoffCoefficient: 0.65,
};

export default function App() {
  // Navigation Tabs for Command Panel
  const [activeTab, setActiveTab] = useState<"control" | "sandbox" | "ai">("control");

  // Core telemetry States
  const [communities, setCommunities] = useState<CommunityRisk[]>(mockCommunities);
  const [pumps, setPumps] = useState<PumpStation[]>(mockPumpStations);
  const [sensors, setSensors] = useState<TelemetrySensor[]>(mockTelemetrySensors);
  const [shelters, setShelters] = useState<EvacuationShelter[]>(mockEvacuationShelters);
  const [sosList, setSosList] = useState<DistressSOS[]>([]);

  // Selected details overlays
  const [selectedCommunity, setSelectedCommunity] = useState<CommunityRisk | null>(null);
  const [selectedStation, setSelectedStation] = useState<PumpStation | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<TelemetrySensor | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<EvacuationShelter | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<any | null>(null);

  // Map settings
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [activeLayers, setActiveLayers] = useState({
    floodRisk: true,
    pumps: true,
    sensors: true,
    shelters: true,
    sos: true,
  });

  // Simulator sandboxed parameters
  const [simulationState, setSimulationState] = useState<DisasterSimulationState>(INITIAL_SIM_STATE);

  // Load distress signals from database service on mount
  useEffect(() => {
    async function loadSOS() {
      const data = await DatabaseService.getSOSAlerts();
      setSosList(data);
    }
    loadSOS();
  }, []);

  // Sync / Propagate Sandbox Simulation updates dynamically across state variables in real-time!
  useEffect(() => {
    // 1. Calculate dynamic rainfall multipliers and water rise on sensors
    const updatedSensors = mockTelemetrySensors.map((s) => {
      const isLowBattery = s.id === "s8" || s.id === "s4";
      let status = s.healthStatus;
      
      // If failure rate is high (>40%), sensors degrade or drop offline
      if (simulationState.pumpFailureRate > 50 && isLowBattery) {
        status = "DEGRADED";
      }

      return {
        ...s,
        rainfall24h: s.rainfall24h * simulationState.rainfallMultiplier,
        rainfall120h: s.rainfall120h * simulationState.rainfallMultiplier,
        waterLevelMsl: s.waterLevelMsl + simulationState.waterLevelOffset,
        healthStatus: status,
      } as TelemetrySensor;
    });
    setSensors(updatedSensors);

    // 2. Adjust pump stations status depending on extreme situations and failure rates
    const updatedPumps = mockPumpStations.map((p) => {
      let isFailed = p.operationalStatus === "FAILED";
      let activeCount = p.activePumpCount;
      let flooded = p.engineFlooded;

      // Adjust failed rate dynamically
      if (simulationState.waterLevelOffset >= 2.5 && p.id === "p4") {
        flooded = true;
        isFailed = true;
        activeCount = 0;
      }

      // If simulated failure rate is high, random pumps with low rating fail
      if (simulationState.pumpFailureRate >= 50 && (p.id === "p10" || p.id === "p12" || p.id === "p3")) {
        isFailed = true;
        activeCount = 0;
      }

      const discharge = activeCount * (p.capacityCubicMeterPerSec / p.totalPumpCount);

      return {
        ...p,
        operationalStatus: isFailed ? "FAILED" : activeCount > 0 ? "ACTIVE" : "INACTIVE",
        engineFlooded: flooded,
        activePumpCount: activeCount,
        dischargeRate: isFailed ? 0 : discharge,
      } as PumpStation;
    });
    setPumps(updatedPumps);

    // 3. Re-estimate community flood scores depending on simulated factors
    const updatedCommunities = mockCommunities.map((com) => {
      // Base calculation
      let scoreModifier = 0;
      
      // Scaled by rain index
      scoreModifier += (simulationState.rainfallMultiplier - 1.0) * 15;
      // Scaled by water offset
      scoreModifier += simulationState.waterLevelOffset * 8;
      // Scaled by runoff metrics
      scoreModifier += (simulationState.runoffCoefficient - 0.65) * 20;

      // Deduct if defences are up!
      if (simulationState.floodBarrierDeployed) {
        scoreModifier -= 8;
      }
      if (simulationState.absWallStatus === "FULLY_RAISED") {
        scoreModifier -= 12;
      }

      const finalScore = Math.max(5, Math.min(100, Math.round(com.floodRiskScore + scoreModifier)));
      const flooded = finalScore >= 80;

      return {
        ...com,
        floodRiskScore: finalScore,
        isFlooded: flooded,
      } as CommunityRisk;
    });
    setCommunities(updatedCommunities);

    // 4. Adjust shelters occupancy proportionally based on water rising
    const updatedShelters = mockEvacuationShelters.map((she) => {
      let extraOccupants = 0;
      if (simulationState.waterLevelOffset > 0) {
        // More people flee
        extraOccupants = Math.round(simulationState.waterLevelOffset * 80);
      }
      const occupants = Math.min(she.maxCapacity, she.currentOccupants + extraOccupants);
      const ratio = occupants / she.maxCapacity;

      let status = she.status;
      if (occupants >= she.maxCapacity) {
        status = "FULL";
      } else if (ratio >= 0.85) {
        status = "NEAR_LIMIT";
      } else {
        status = "AVAILABLE";
      }

      return {
        ...she,
        currentOccupants: occupants,
        capacityRatio: ratio,
        status,
      } as EvacuationShelter;
    });
    setShelters(updatedShelters);

  }, [
    simulationState.rainfallMultiplier,
    simulationState.waterLevelOffset,
    simulationState.pumpFailureRate,
    simulationState.floodBarrierDeployed,
    simulationState.absWallStatus,
    simulationState.runoffCoefficient,
  ]);

  // Master Dynamic AI Predictor engine output computation
  const calculatedAnalysis = useMemo(() => {
    const failedCount = pumps.filter((p) => p.operationalStatus === "FAILED").length;
    const activeSOS = sosList.filter((s) => s.status === "PENDING").length;
    return calculateDetailedRisk(simulationState, sensors, failedCount, activeSOS);
  }, [simulationState, sensors, pumps, sosList]);

  // Update SOS Command queue triggers
  const handleUpdateSOS = async (id: string, newStatus: "PENDING" | "DISPATCHED" | "SOLVED") => {
    await DatabaseService.updateSOSStatus(id, newStatus);
    const updated = await DatabaseService.getSOSAlerts();
    setSosList(updated);
  };

  const handleDeleteSOS = async (id: string) => {
    await DatabaseService.deleteSOSAlert(id);
    const updated = await DatabaseService.getSOSAlerts();
    setSosList(updated);
  };

  const handleAddSOS = async (alert: Omit<DistressSOS, "id" | "timestamp" | "status">) => {
    await DatabaseService.addSOSAlert(alert);
    const updated = await DatabaseService.getSOSAlerts();
    setSosList(updated);
  };

  const handleResetSimulation = () => {
    setSimulationState(INITIAL_SIM_STATE);
    localStorage.removeItem("yala_flood_sos_signals");
    DatabaseService.getSOSAlerts().then((data) => setSosList(data));
    setSelectedCommunity(null);
    setSelectedStation(null);
    setSelectedSensor(null);
    setSelectedShelter(null);
    setSelectedProvince(null);
  };

  // Safe navigation action
  const handleSelectCommunityByCoords = (
    coords: [number, number],
    item: any,
    type: "community" | "pump" | "sensor" | "shelter" | "sos"
  ) => {
    setSelectedCommunity(null);
    setSelectedStation(null);
    setSelectedSensor(null);
    setSelectedShelter(null);

    if (type === "community") {
      setSelectedCommunity(item as CommunityRisk);
    } else if (type === "pump") {
      setSelectedStation(item as PumpStation);
    } else if (type === "sensor") {
      setSelectedSensor(item as TelemetrySensor);
    } else if (type === "shelter") {
      setSelectedShelter(item as EvacuationShelter);
    } else if (type === "sos") {
      // Focus map to coordinates without complex selection
      setSelectedCommunity({
        id: item.id,
        name: item.communityName,
        district: "ยะลา",
        vulnerablePopCount: item.vulnerableCount,
        floodRiskScore: 90,
        coordinates: item.coordinates,
        historicalMaxRainfallMs: 300,
        isFlooded: true,
        blockageFlag: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col font-sans transition-all selection:bg-pink-500/30 selection:text-white">
      
      {/* Tactical Operation Center Branding Header (TACTICAL INDUSTRIAL THEME) */}
      <header className="border-b border-[#222] bg-[#0a0a0a] px-6 h-14 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-pink-600 rounded-sm flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#666] border border-[#222] px-1.5 py-0.5 rounded-sm bg-[#111] leading-none">
                DOC - v2.4.0-TACTICAL
              </span>
              <span className="text-[#333] text-sm">/</span>
              <h1 className="text-xs sm:text-xs font-bold font-sans tracking-wider uppercase text-[#e0e0e0]">
                Yala Flood Management Operation Command <span className="text-[#666] font-mono text-[10px] font-normal italic lowercase sm:inline hidden">sys:active</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Global Live Model Alert State Banner */}
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="hidden md:flex gap-4 border-x border-[#222] px-6 h-full items-center">
            <div className="flex flex-col">
              <span className="text-[9px] text-[#666] uppercase leading-none font-bold">System Status</span>
              <span className="text-green-500 text-[10.5px] mt-0.5 font-bold flex items-center gap-1">● OPERATIONAL</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-[#666] uppercase leading-none font-bold">Discharge Rate</span>
              <span className="text-sky-400 text-[10.5px] mt-0.5 font-bold">
                {pumps.reduce((acc, p) => acc + p.dischargeRate, 0).toFixed(1)} m³/s
              </span>
            </div>
          </div>
          
          {/* Master Alarm Status indicator block */}
          <div className="flex items-center gap-2.5 bg-[#0a0a0a] border border-[#222] px-3 py-1.5 rounded-sm">
            <div className="relative">
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  calculatedAnalysis.severity === FloodSeverity.CRITICAL ? "bg-pink-500" : calculatedAnalysis.severity === FloodSeverity.WARNING ? "bg-amber-500" : "bg-emerald-500"
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  calculatedAnalysis.severity === FloodSeverity.CRITICAL ? "bg-pink-500" : calculatedAnalysis.severity === FloodSeverity.WARNING ? "bg-amber-500" : "bg-emerald-500"
                }`} />
              </span>
              <Activity className="h-3.5 w-3.5 text-[#666]" />
            </div>
            <div className="text-left font-mono select-none">
              <span className="text-[8px] text-[#666] uppercase font-bold block leading-none">RISK INDEX</span>
              <span className={`text-[11px] font-bold mt-1 block leading-none ${
                calculatedAnalysis.severity === FloodSeverity.CRITICAL ? "text-pink-400" : calculatedAnalysis.severity === FloodSeverity.WARNING ? "text-amber-400" : "text-emerald-400"
              }`}>
                {calculatedAnalysis.severity} ({calculatedAnalysis.riskScore}%)
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Multi-Pane Content Layout Grid */}
      <main className="flex-grow flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">
        
        {/* Left GIS Spatial Interactive Mapping Module */}
        <section className="w-full lg:w-3/5 h-[45vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-[#222] flex flex-col">
          <MapDashboard
            communities={communities}
            pumps={pumps}
            sensors={sensors}
            shelters={shelters}
            soslist={sosList}
            selectedCommunity={selectedCommunity}
            onSelectCommunity={setSelectedCommunity}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            selectedSensor={selectedSensor}
            onSelectSensor={setSelectedSensor}
            selectedShelter={selectedShelter}
            onSelectShelter={setSelectedShelter}
            selectedProvince={selectedProvince}
            onSelectProvince={setSelectedProvince}
            showHeatmap={showHeatmap}
            setShowHeatmap={setShowHeatmap}
            activeLayers={activeLayers}
            setActiveLayers={setActiveLayers}
          />

          {/* Quick Context Popovers details block */}
          <div className="absolute top-24 right-4 z-[1000] max-w-xs w-full pointer-events-auto">
            <AnimatePresence>
              {(selectedCommunity || selectedStation || selectedSensor || selectedShelter || selectedProvince) && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-[#0a0a0a]/95 border-2 border-[#222] rounded-sm p-3.5 text-[#e0e0e0] shadow-2xl backdrop-blur-md"
                >
                  <div className="flex justify-between items-center mb-2 border-b border-[#222] pb-1.5">
                    <span className="text-[9.5px] uppercase font-mono font-bold tracking-widest text-sky-400 flex items-center gap-1">
                      🛰️ TELEMETRY_FEED
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCommunity(null);
                        setSelectedStation(null);
                        setSelectedSensor(null);
                        setSelectedShelter(null);
                        setSelectedProvince(null);
                      }}
                      className="text-[#666] hover:text-[#white] font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 border border-[#222] bg-[#111] hover:bg-[#151515] rounded-sm"
                    >
                      CLS
                    </button>
                  </div>

                  {selectedCommunity && (
                    <div className="text-[11px] space-y-1 font-mono">
                      <h4 className="font-bold text-pink-400 text-xs">{selectedCommunity.name}</h4>
                      <p className="text-[#666] font-sans">Type: At-risk Residential Zone</p>
                      <div className="h-px bg-[#222] my-1"/>
                      <div className="flex justify-between"><span>Vulnerable pop:</span> <strong className="text-white">{selectedCommunity.vulnerablePopCount} people</strong></div>
                      <div className="flex justify-between"><span>Flood risk index:</span> <strong className="text-pink-400">{selectedCommunity.floodRiskScore}%</strong></div>
                      <div className="flex justify-between"><span>Water status:</span> <strong>{selectedCommunity.isFlooded ? "CRITICAL FLOODING" : "STABLE"}</strong></div>
                    </div>
                  )}

                  {selectedStation && (
                    <div className="text-[11px] space-y-1 font-mono font-normal">
                      <h4 className="font-bold text-sky-400 text-xs">{selectedStation.name}</h4>
                      <p className="text-[#666] font-sans">Type: Active Drainage Pump Gateway</p>
                      <div className="h-px bg-[#222] my-1"/>
                      <div className="flex justify-between"><span>Operational state:</span> <strong className={selectedStation.operationalStatus === "ACTIVE" ? "text-emerald-400" : "text-pink-400 animate-pulse"}>{selectedStation.operationalStatus}</strong></div>
                      <div className="flex justify-between"><span>Active motors:</span> <strong className="text-white">{selectedStation.activePumpCount} / {selectedStation.totalPumpCount} units</strong></div>
                      <div className="flex justify-between"><span>Discharge volume:</span> <strong className="text-sky-300">{selectedStation.dischargeRate.toFixed(2)} m³/s</strong></div>
                    </div>
                  )}

                  {selectedSensor && (
                    <div className="text-[11px] space-y-1 font-mono">
                      <h4 className="font-bold text-emerald-400 text-xs">{selectedSensor.name}</h4>
                      <p className="text-[#666] font-sans">Type: Water telemetry gauge</p>
                      <div className="h-px bg-[#222] my-1"/>
                      <div className="flex justify-between"><span>Water Level MSL:</span> <strong className="text-white">{selectedSensor.waterLevelMsl.toFixed(2)} m</strong></div>
                      <div className="flex justify-between"><span>Critical margin:</span> <strong className="text-pink-400">{selectedSensor.criticalThresholdMsl.toFixed(2)} m</strong></div>
                      <div className="flex justify-between"><span>24h Rainfall:</span> <strong className="text-sky-400 font-bold">{selectedSensor.rainfall24h.toFixed(1)} mm</strong></div>
                    </div>
                  )}

                  {selectedShelter && (
                    <div className="text-[11px] space-y-1 font-mono">
                      <h4 className="font-bold text-teal-400 text-xs">{selectedShelter.name}</h4>
                      <div className="h-px bg-[#222] my-1"/>
                      <div className="flex justify-between"><span>Capacity state:</span> <strong className="text-teal-400 font-bold">{selectedShelter.status}</strong></div>
                      <div className="flex justify-between"><span>Occupancy:</span> <strong className="text-white">{selectedShelter.currentOccupants} / {selectedShelter.maxCapacity} persons</strong></div>
                      <div className="flex justify-between"><span>Emergency Line:</span> <strong className="text-slate-300">{selectedShelter.contactNumber}</strong></div>
                    </div>
                  )}

                  {selectedProvince && (
                    <div className="text-[11px] space-y-1 font-mono">
                      <div className="flex items-center gap-1 mb-1 text-emerald-400">
                        <span className="text-[9.5px] uppercase font-bold tracking-widest text-[#10b981]">REGIONAL SUMMARY</span>
                      </div>
                      <h4 className="font-bold text-sm text-white">PROVINCE: {selectedProvince.properties.name_th}</h4>
                      <div className="h-px bg-[#222] my-1"/>
                      <div className="flex justify-between"><span>Disaster risk:</span> <strong className="text-pink-400">{selectedProvince.properties.riskScore}%</strong></div>
                      <div className="flex justify-between"><span>At-risk spots:</span> <strong className="text-white">{selectedProvince.properties.vulnerableCommunitiesCount} areas</strong></div>
                      <div className="flex justify-between"><span>Live sensors:</span> <strong className="text-emerald-400">{selectedProvince.properties.activeSensors} stations</strong></div>
                      <div className="flex justify-between"><span>Drain stations:</span> <strong className="text-sky-300">{selectedProvince.properties.pumpsOnline} blocks</strong></div>
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Right Tabbed Dynamic Control Deck Pane */}
        <section className="w-full lg:w-2/5 h-[55vh] lg:h-full bg-[#050505] flex flex-col">
          {/* Deck Segment Selectors */}
          <div className="flex border-b border-[#222] bg-[#0a0a0a] justify-around select-none">
            <button
              onClick={() => setActiveTab("control")}
              className={`flex-1 py-3 text-center text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "control"
                  ? "border-b-2 border-pink-500 bg-[#050505] text-white"
                  : "text-[#666] hover:text-[#e0e0e0] hover:bg-[#0c0c0c]"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-pink-500" />
               ศูนย์บัญชาการภัย
            </button>
            <button
              onClick={() => setActiveTab("sandbox")}
              className={`flex-1 py-3 text-center text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "sandbox"
                  ? "border-b-2 border-amber-500 bg-[#050505] text-white"
                  : "text-[#666] hover:text-[#e0e0e0] hover:bg-[#0c0c0c]"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-amber-500" />
               จำลองยุทธวิธี
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-3 text-center text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "ai"
                  ? "border-b-2 border-sky-500 bg-[#050505] text-white"
                  : "text-[#666] hover:text-[#e0e0e0] hover:bg-[#0c0c0c]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
               AI พยากรณ์ตลิ่ง
            </button>
          </div>

          {/* Core Panel Content Switcher Frame */}
          <div className="flex-grow overflow-hidden p-3.5 relative">
            <AnimatePresence mode="wait">
              {activeTab === "control" && (
                <motion.div
                  key="control-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <DisasterControlPanel
                    communities={communities}
                    pumps={pumps}
                    sensors={sensors}
                    shelters={shelters}
                    sosList={sosList}
                    calculatedScore={calculatedAnalysis.riskScore}
                    severity={calculatedAnalysis.severity}
                    onUpdateSOS={handleUpdateSOS}
                    onDeleteSOS={handleDeleteSOS}
                    onSelectCommunityByCoords={handleSelectCommunityByCoords}
                  />
                </motion.div>
              )}

              {activeTab === "sandbox" && (
                <motion.div
                  key="sandbox-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <EmergencySimulationPanel
                    simulationState={simulationState}
                    onUpdateSimulation={setSimulationState}
                    onAddSOS={handleAddSOS}
                    onResetSimulation={handleResetSimulation}
                  />
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div
                  key="ai-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full"
                >
                  <AIInsightsPanel analysis={calculatedAnalysis} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

      </main>
    </div>
  );
}

