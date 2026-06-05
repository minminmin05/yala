import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  CommunityRisk,
  PumpStation,
  TelemetrySensor,
  EvacuationShelter,
  DistressSOS,
  FloodSeverity,
} from "../types";
import { mockCommunities, mockPumpStations, mockTelemetrySensors, mockEvacuationShelters, southernProvincesGeoJSON } from "../data/mockData";
import { Map, Layers, HelpCircle, Activity, Wind, Eye, Droplet, Fuel, ShieldAlert } from "lucide-react";

interface MapDashboardProps {
  communities: CommunityRisk[];
  pumps: PumpStation[];
  sensors: TelemetrySensor[];
  shelters: EvacuationShelter[];
  soslist: DistressSOS[];
  selectedCommunity: CommunityRisk | null;
  onSelectCommunity: (com: CommunityRisk) => void;
  selectedStation: PumpStation | null;
  onSelectStation: (pump: PumpStation) => void;
  selectedSensor: TelemetrySensor | null;
  onSelectSensor: (sensor: TelemetrySensor) => void;
  selectedShelter: EvacuationShelter | null;
  onSelectShelter: (shelter: EvacuationShelter) => void;
  selectedProvince: any | null;
  onSelectProvince: (prov: any | null) => void;
  showHeatmap: boolean;
  setShowHeatmap: (show: boolean) => void;
  activeLayers: {
    floodRisk: boolean;
    pumps: boolean;
    sensors: boolean;
    shelters: boolean;
    sos: boolean;
  };
  setActiveLayers: any;
}

export default function MapDashboard({
  communities,
  pumps,
  sensors,
  shelters,
  soslist,
  selectedCommunity,
  onSelectCommunity,
  selectedStation,
  onSelectStation,
  selectedSensor,
  onSelectSensor,
  selectedShelter,
  onSelectShelter,
  selectedProvince,
  onSelectProvince,
  showHeatmap,
  setShowHeatmap,
  activeLayers,
  setActiveLayers,
}: MapDashboardProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  // Grouped layer instances for live toggling
  const communitiesGroup = useRef<L.LayerGroup>(L.layerGroup());
  const pumpsGroup = useRef<L.LayerGroup>(L.layerGroup());
  const sensorsGroup = useRef<L.LayerGroup>(L.layerGroup());
  const sheltersGroup = useRef<L.LayerGroup>(L.layerGroup());
  const sosGroup = useRef<L.LayerGroup>(L.layerGroup());
  const heatmapGroup = useRef<L.LayerGroup>(L.layerGroup());
  const geojsonGroup = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Yala Coordinates: [6.5401, 101.2825]
    const map = L.map(mapRef.current, {
      center: [6.5401, 101.2825],
      zoom: 12,
      zoomControl: false,
      layers: [],
    });

    // Dark-Mode tactical layout base tile
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // Zoom Controls at top-right
    L.control.zoom({ position: "topright" }).addTo(map);

    mapInstance.current = map;

    // Set up standard Layer Groups
    communitiesGroup.current.addTo(map);
    pumpsGroup.current.addTo(map);
    sensorsGroup.current.addTo(map);
    sheltersGroup.current.addTo(map);
    sosGroup.current.addTo(map);
    heatmapGroup.current.addTo(map);
    geojsonGroup.current.addTo(map);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sync FlyTo on Selected Assets
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (selectedCommunity) {
      map.flyTo(selectedCommunity.coordinates, 14, { animate: true, duration: 1.5 });
    } else if (selectedStation) {
      map.flyTo(selectedStation.coordinates, 14, { animate: true, duration: 1.5 });
    } else if (selectedSensor) {
      map.flyTo(selectedSensor.coordinates, 14, { animate: true, duration: 1.5 });
    } else if (selectedShelter) {
      map.flyTo(selectedShelter.coordinates, 14, { animate: true, duration: 1.5 });
    }
  }, [selectedCommunity, selectedStation, selectedSensor, selectedShelter]);

  // Update GeoJSON Southern Provinces
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    geojsonGroup.current.clearLayers();

    const geojsonLayer = L.geoJSON(southernProvincesGeoJSON as any, {
      style: (feature: any) => {
        let riskColor = "#3b82f6"; // Safe blue
        if (feature.properties.riskScore >= 80) {
          riskColor = "#f43f5e"; // red
        } else if (feature.properties.riskScore >= 50) {
          riskColor = "#eab308"; // yellow
        }

        const isCurrentlySelected = selectedProvince?.properties?.id === feature.properties.id;

        return {
          color: isCurrentlySelected ? "#10b981" : "#4b5563",
          weight: isCurrentlySelected ? 3 : 1,
          fillColor: riskColor,
          fillOpacity: isCurrentlySelected ? 0.35 : 0.08,
          dashArray: isCurrentlySelected ? "0" : "5, 5",
        };
      },
      onEachFeature: (feature, layer) => {
        layer.on({
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            onSelectProvince(feature);
          },
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ fillOpacity: 0.25, weight: 2 });
          },
          mouseout: (e) => {
            const l = e.target;
            const isSel = selectedProvince?.properties?.id === feature.properties.id;
            l.setStyle({
              fillOpacity: isSel ? 0.35 : 0.08,
              weight: isSel ? 3 : 1,
            });
          },
        });
      },
    });

    geojsonLayer.addTo(geojsonGroup.current);
  }, [selectedProvince]);

  // Redraw Layers on dynamic state modification
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // --- COMMUNITY LAYER REDRAW ---
    communitiesGroup.current.clearLayers();
    if (activeLayers.floodRisk) {
      communities.forEach((com) => {
        const markerColor =
          com.floodRiskScore >= 80
            ? "bg-rose-500 text-rose-100 ring-rose-500/50"
            : com.floodRiskScore >= 55
            ? "bg-amber-500 text-amber-100 ring-amber-500/50"
            : "bg-emerald-500 text-emerald-100 ring-emerald-500/50";

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute h-9 w-9 rounded-full ${markerColor} animate-ping opacity-25"></div>
              <div class="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 ${markerColor} shadow-lg ring-4">
                <span class="text-[9px] font-bold font-sans">${com.floodRiskScore}</span>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(com.coordinates, { icon });
        
        let popupHtml = `
          <div class="p-3 text-slate-100 bg-slate-950 rounded-lg max-w-[240px] font-sans border border-slate-800">
            <h4 class="font-bold text-sm text-sky-400 mb-1">${com.name}</h4>
            <div class="text-[11px] space-y-1 text-slate-300">
              <div class="flex justify-between"><span>พิกัดทางภูมิศาสตร์:</span> <span class="font-mono text-white">${com.coordinates[0].toFixed(4)}, ${com.coordinates[1].toFixed(4)}</span></div>
              <div class="flex justify-between"><span>กลุ่มเปราะบาง:</span> <span class="text-amber-400 font-bold">${com.vulnerablePopCount} ราย</span></div>
              <div class="flex justify-between"><span>Flood Risk:</span> <span class="font-bold ${com.floodRiskScore >= 80 ? 'text-red-400' : 'text-emerald-400'}">${com.floodRiskScore}/100</span></div>
              <div class="flex justify-between"><span>ระดับน้ำรวมปานกลาง:</span> <span class="${com.isFlooded ? "text-rose-400 font-bold" : "text-emerald-400"}">${com.isFlooded ? "น้ำท่วมขัง" : "ปกติ"}</span></div>
              <div class="flex justify-between"><span>ตะแกรงท่อตัน:</span> <span class="${com.blockageFlag ? "text-rose-400 font-bold" : "text-emerald-400"}">${com.blockageFlag ? "อุดตัน" : "ปกติ"}</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false, className: "custom-popup" });
        marker.on("click", () => {
          onSelectCommunity(com);
        });
        marker.addTo(communitiesGroup.current);
      });
    }

    // --- PUMP STATIONS REDRAW ---
    pumpsGroup.current.clearLayers();
    if (activeLayers.pumps) {
      pumps.forEach((pump) => {
        let pulseAnim = "";
        let colorClass = "bg-sky-500 text-sky-100 border-sky-400";

        if (pump.operationalStatus === "FAILED" || pump.engineFlooded) {
          colorClass = "bg-rose-600 text-rose-100 border-rose-500";
          pulseAnim = "animate-pulse";
        } else if (pump.operationalStatus === "INACTIVE") {
          colorClass = "bg-slate-500 text-slate-200 border-slate-400";
        } else {
          pulseAnim = "animate-spin-slow"; // Dynamic rotational animation
        }

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center">
              ${pump.operationalStatus === "ACTIVE" ? '<div class="absolute h-8 w-8 rounded-full bg-sky-500/20 animate-ping"></div>' : ""}
              <div class="relative flex h-6 w-6 items-center justify-center rounded border-2 ${colorClass} shadow-md ${pulseAnim}">
                <svg stroke="currentColor" fill="none" stroke-width="2.5" viewBox="0 0 24 24" class="h-3 w-3"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(pump.coordinates, { icon });

        let popupHtml = `
          <div class="p-3 text-slate-100 bg-slate-950 rounded-lg max-w-[260px] font-sans border border-slate-800">
            <div class="flex items-center gap-1.5 mb-1 text-sky-400">
              <span class="p-1 rounded bg-sky-950 text-sky-400 text-xs">PUMP</span>
              <h4 class="font-bold text-sm text-slate-100 truncate">${pump.name.substring(0, 30)}...</h4>
            </div>
            <div class="whitespace-normal text-[11px] space-y-1 text-slate-300">
              <div class="flex justify-between"><span>สถานะการเดินเครื่อง:</span> <span class="font-bold ${pump.operationalStatus === "ACTIVE" ? "text-emerald-400" : "text-rose-400"}">${pump.operationalStatus === "ACTIVE" ? "กำลังสูบระบาย" : pump.operationalStatus === "FAILED" ? "ขัดข้อง/ล่มเหลว" : "สแตนด์บาย"}</span></div>
              <div class="flex justify-between"><span>เครื่องสูบน้ำจม:</span> <span class="${pump.engineFlooded ? "text-red-400 font-bold animate-pulse" : "text-emerald-400"}">${pump.engineFlooded ? "วิกฤต (Engine Flooded)" : "แห้งปกติ"}</span></div>
              <div class="flex justify-between"><span>ปั๊มที่เปิดงาน:</span> <span class="text-white">${pump.activePumpCount} / ${pump.totalPumpCount} เครื่อง</span></div>
              <div class="flex justify-between"><span>ความจุเต็มที่:</span> <span class="text-white">${pump.capacityCubicMeterPerSec} ลบ.ม./วิ</span></div>
              <div class="flex justify-between"><span>อัตราสูบจริงหน้างาน:</span> <span class="text-emerald-400 font-mono font-bold">${pump.dischargeRate.toFixed(2)} ลบ.ม./วิ</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });
        marker.on("click", () => {
          onSelectStation(pump);
        });
        marker.addTo(pumpsGroup.current);
      });
    }

    // --- TELEMETRY SENSORS REDRAW ---
    sensorsGroup.current.clearLayers();
    if (activeLayers.sensors) {
      sensors.forEach((sens) => {
        let heartRateAnim = "";
        let colorClass = "bg-slate-700 text-slate-300 border-slate-500";

        if (sens.healthStatus === "EXCELLENT" || sens.healthStatus === "GOOD") {
          colorClass = "bg-emerald-600 text-emerald-100 border-emerald-500";
        } else if (sens.healthStatus === "DEGRADED" || sens.healthStatus === "MAINTENANCE") {
          colorClass = "bg-amber-600 text-amber-100 border-amber-500";
          heartRateAnim = "animate-pulse";
        } else {
          colorClass = "bg-slate-800 text-slate-500 border-slate-700";
        }

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="relative flex h-6 w-6 items-center justify-center rounded-full border-2 ${colorClass} shadow-md ${heartRateAnim}">
                <span class="text-[10px] font-sans">📶</span>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(sens.coordinates, { icon });

        let popupHtml = `
          <div class="p-3 text-slate-100 bg-slate-950 rounded-lg max-w-[260px] font-sans border border-slate-800">
            <div class="flex items-center gap-1.5 mb-1.5 text-emerald-400">
              <span class="p-1 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono leading-none">SENSOR</span>
              <h4 class="font-bold text-xs text-slate-100 line-clamp-1">${sens.name}</h4>
            </div>
            <div class="text-[11px] space-y-1 text-slate-300">
              <div class="flex justify-between"><span>ระดับน้ำ (MSL):</span> <span class="font-mono font-bold font-white">${sens.waterLevelMsl.toFixed(2)} ม.</span></div>
              <div class="flex justify-between"><span>เกณฑ์วิกฤตตลิ่ง:</span> <span class="font-mono text-red-400">${sens.criticalThresholdMsl.toFixed(2)} ม.</span></div>
              <div class="flex justify-between"><span>สถานะเซ็นเซอร์:</span> <span class="font-bold text-emerald-400">${sens.healthStatus}</span></div>
              <div class="flex justify-between"><span>ปริมาณฝน 24 ชั่วโมง:</span> <span class="text-sky-400 font-bold">${sens.rainfall24h.toFixed(1)} มม.</span></div>
              <div class="flex justify-between"><span>สะสม 5 วัน:</span> <span class="text-blue-400 font-bold">${sens.rainfall120h.toFixed(0)} มม.</span></div>
              <div class="flex justify-between"><span>สุขภาพแบตเตอรี่:</span> <span class="font-bold ${sens.batteryStatus <= 20 ? 'text-red-400' : 'text-slate-200'}">${sens.batteryStatus}%</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });
        marker.on("click", () => {
          onSelectSensor(sens);
        });
        marker.addTo(sensorsGroup.current);
      });
    }

    // --- EVACUATION SHELTERS REDRAW ---
    sheltersGroup.current.clearLayers();
    if (activeLayers.shelters) {
      shelters.forEach((she) => {
        let colorClass = "bg-teal-500 text-teal-100 border-teal-400";
        if (she.status === "FULL") {
          colorClass = "bg-red-700 text-white border-red-500";
        } else if (she.status === "NEAR_LIMIT") {
          colorClass = "bg-amber-600 text-amber-100 border-amber-500";
        }

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="relative flex h-6 w-6 items-center justify-center rounded-lg border-2 ${colorClass} shadow-md">
                <span class="text-[9px] font-bold font-sans">🏠</span>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(she.coordinates, { icon });

        let popupHtml = `
          <div class="p-3 text-slate-100 bg-slate-950 rounded-lg max-w-[260px] font-sans border border-slate-800">
            <div class="flex items-center gap-1.5 mb-1.5 text-teal-400">
              <span class="p-1 rounded bg-teal-950 text-teal-400 text-xs">SHELTER</span>
              <h4 class="font-bold text-xs text-slate-100 line-clamp-1">${she.name}</h4>
            </div>
            <div class="text-[11px] space-y-1 text-slate-300">
              <div class="flex justify-between"><span>สถานะศูนย์พักพิง:</span> <span class="font-bold ${she.status === "FULL" ? "text-red-400" : she.status === "NEAR_LIMIT" ? "text-amber-400" : "text-emerald-400"}">${she.status === "FULL" ? "หนาแน่นเต็มอัตรา" : she.status === "NEAR_LIMIT" ? "จำกัดอย่างยิ่ง" : "ว่างสแตนด์บาย"}</span></div>
              <div class="flex justify-between"><span>จำนวนผู้อพยพปัจจุบัน:</span> <span class="text-white font-bold font-mono">${she.currentOccupants} / ${she.maxCapacity} คน</span></div>
              <div class="flex justify-between"><span>สัดส่วนความจุ:</span> <span class="text-slate-100 font-mono">${(she.capacityRatio * 100).toFixed(0)}%</span></div>
              <div class="flex justify-between"><span>โทรติดต่อสายตรง:</span> <span class="text-sky-300 font-mono">${she.contactNumber}</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });
        marker.on("click", () => {
          onSelectShelter(she);
        });
        marker.addTo(sheltersGroup.current);
      });
    }

    // --- SOS PIN REDRAW ---
    sosGroup.current.clearLayers();
    if (activeLayers.sos) {
      soslist.forEach((sos) => {
        let colorTheme = "bg-rose-600 text-rose-50 border-rose-400 ring-rose-500/80";
        if (sos.status === "DISPATCHED") {
          colorTheme = "bg-amber-500 text-amber-50 border-amber-400 ring-amber-500/50";
        } else if (sos.status === "SOLVED") {
          colorTheme = "bg-emerald-600 text-emerald-50 border-emerald-500 ring-emerald-500/30";
        }

        const icon = L.divIcon({
          className: "custom-leaflet-icon",
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute h-10 w-10 rounded-full ${colorTheme} animate-ping opacity-35"></div>
              <div class="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 ${colorTheme} shadow-2xl ring-4">
                <span class="text-[9px] font-bold">❗</span>
              </div>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(sos.coordinates, { icon });

        let popupHtml = `
          <div class="p-3 text-slate-100 bg-slate-950 rounded-lg max-w-[280px] font-sans border-2 border-rose-600">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-xs bg-rose-600 px-2 py-0.5 rounded text-white font-bold blink-text">วิกฤต SOS</span>
              <span class="text-[10px] text-slate-400">${new Date(sos.timestamp).toLocaleTimeString()}</span>
            </div>
            <p class="font-bold text-amber-300 text-[11px] mb-1">ชุมชน: ${sos.communityName}</p>
            <p class="text-slate-100 text-xs italic bg-slate-900 p-2 rounded mb-1.5 border border-slate-800">"${sos.message}"</p>
            <div class="text-[10px] space-y-1 text-slate-300">
              <div class="flex justify-between"><span>ผู้ติดค้างสะสม:</span> <span class="text-rose-400 font-bold">${sos.vulnerableCount} คน</span></div>
              <div class="flex justify-between"><span>เบอร์ส่งข่าว:</span> <span class="text-white font-mono">${sos.senderPhone}</span></div>
              <div class="flex justify-between"><span>สถานะคิวช่วย:</span> <span class="font-bold underline text-white">${sos.status}</span></div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { closeButton: false });
        marker.addTo(sosGroup.current);
      });
    }

    // --- FLOOD RISK HEATMAP LAYER REDRAW ---
    heatmapGroup.current.clearLayers();
    if (showHeatmap) {
      // Draw glowing heatmap zones around Yala based on risk scores
      communities.forEach((com) => {
        if (com.floodRiskScore >= 60) {
          const colorCode = com.floodRiskScore >= 80 ? "#f43f5e" : "#fbbf24";
          // We represent heat using overlapping transparent rings with blur
          const circle1 = L.circle(com.coordinates, {
            radius: 400 + (com.floodRiskScore * 3),
            color: "transparent",
            fillColor: colorCode,
            fillOpacity: 0.12,
          });

          const circle2 = L.circle(com.coordinates, {
            radius: 150 + (com.floodRiskScore * 1.5),
            color: "transparent",
            fillColor: colorCode,
            fillOpacity: 0.22,
          });

          circle1.addTo(heatmapGroup.current);
          circle2.addTo(heatmapGroup.current);
        }
      });

      // Add hotspots for active distress call locations
      soslist.filter(s => s.status === "PENDING").forEach((sos) => {
        const circleSos = L.circle(sos.coordinates, {
          radius: 500,
          color: "transparent",
          fillColor: "#e11d48",
          fillOpacity: 0.25,
        });
        circleSos.addTo(heatmapGroup.current);
      });
    }

  }, [communities, pumps, sensors, shelters, soslist, activeLayers, showHeatmap]);

  return (
    <div className="relative h-full w-full bg-[#050505] overflow-hidden flex flex-col">
      {/* Top Map Toolbar Control Panels */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 max-w-sm sm:max-w-md pointer-events-auto select-none">
        <div className="bg-[#0a0a0a]/95 border border-[#222] rounded-sm p-3.5 text-[#e0e0e0] shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Map className="h-3.5 w-3.5 text-sky-400" />
            <h3 className="font-bold font-mono text-[10px] tracking-wider uppercase text-slate-200">
              YALA GIS OPERATIONAL INTERFACE
            </h3>
          </div>
          <p className="text-[10px] text-[#666] leading-normal font-sans">
            Tactical live mapping, active water level telemetry sensory gates, discharge status matrices and dispatch tracker columns.
          </p>
        </div>

        {/* Dynamic Southern Legend Panel */}
        <div className="bg-[#0a0a0a]/95 border border-[#222] rounded-sm p-3 text-[#e0e0e0] shadow-xl backdrop-blur-md">
          <span className="text-[9px] text-[#666] uppercase font-mono font-bold block mb-1.5">GIS OVERLAYS (LAYERS SELECTOR)</span>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => setActiveLayers((prev: any) => ({ ...prev, floodRisk: !prev.floodRisk }))}
              className={`px-2 py-1 rounded-sm flex items-center justify-between border transition-colors ${
                activeLayers.floodRisk
                  ? "bg-red-950/40 text-red-300 border-red-800"
                  : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
              }`}
            >
              <span>RESIDENTIAL RISK</span>
              <div className={`h-1.5 w-1.5 rounded-full ${activeLayers.floodRisk ? "bg-red-400 animate-ping" : "bg-[#222]"}`} />
            </button>
            <button
              onClick={() => setActiveLayers((prev: any) => ({ ...prev, pumps: !prev.pumps }))}
              className={`px-2 py-1 rounded-sm flex items-center justify-between border transition-colors ${
                activeLayers.pumps
                  ? "bg-sky-950/40 text-sky-300 border-sky-800"
                  : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
              }`}
            >
              <span>PUMP GATEWAYS</span>
              <div className={`h-1.5 w-1.5 rounded-full ${activeLayers.pumps ? "bg-sky-400 animate-ping" : "bg-[#222]"}`} />
            </button>
            <button
              onClick={() => setActiveLayers((prev: any) => ({ ...prev, sensors: !prev.sensors }))}
              className={`px-2 py-1 rounded-sm flex items-center justify-between border transition-colors ${
                activeLayers.sensors
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-800"
                  : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
              }`}
            >
              <span>TELEMETRY SENSORS</span>
              <div className={`h-1.5 w-1.5 rounded-full ${activeLayers.sensors ? "bg-emerald-400 animate-ping" : "bg-[#222]"}`} />
            </button>
            <button
              onClick={() => setActiveLayers((prev: any) => ({ ...prev, shelters: !prev.shelters }))}
              className={`px-2 py-1 rounded-sm flex items-center justify-between border transition-colors ${
                activeLayers.shelters
                  ? "bg-teal-950/40 text-teal-300 border-teal-800"
                  : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
              }`}
            >
              <span>EMERGENCY HAVENS</span>
              <div className={`h-1.5 w-1.5 rounded-full ${activeLayers.shelters ? "bg-teal-400 animate-ping" : "bg-[#222]"}`} />
            </button>
            <button
              onClick={() => setActiveLayers((prev: any) => ({ ...prev, sos: !prev.sos }))}
              className={`px-2 py-1.5 rounded-sm flex items-center justify-between border transition-colors uppercase col-span-2 ${
                activeLayers.sos
                  ? "bg-red-950/60 text-red-200 border-red-700 shadow-inner"
                  : "bg-[#111] text-[#666] border-[#222] hover:text-slate-200"
              }`}
            >
              <span>SOS DISTRESS ALIGNMENT ({soslist.filter(s => s.status !== "SOLVED").length} TICKETS)</span>
              <span className={`h-2 w-2 rounded-full ${activeLayers.sos ? "bg-red-500 animate-ping" : "bg-[#222]"}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Heatmap overlay toggle */}
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1.5 pointer-events-auto rounded-sm border text-[10px] font-mono font-bold flex items-center gap-2 transition-colors shadow-lg ${
            showHeatmap
              ? "bg-red-600 text-white border-red-500 hover:bg-red-700"
              : "bg-[#0a0a0a]/95 text-red-400 border-[#222] hover:bg-[#111]"
          }`}
        >
          <span>🔥</span>
          {showHeatmap ? "DISABLE COMPREHENSIVE FLOOD COMPONENT HEATMAP" : "ENABLE COMPREHENSIVE FLOOD COMPONENT HEATMAP"}
        </button>
      </div>

      {/* Map Target Canvas Div */}
      <div id="map" ref={mapRef} className="h-full w-full z-10 flex-grow" style={{ minHeight: "350px" }} />

      {/* Dynamic bottom information bar */}
      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-auto flex flex-col gap-2 max-w-sm">
        <div className="bg-[#0a0a0a]/95 border border-[#222] rounded-sm p-3 text-slate-200 shadow-2xl backdrop-blur-md text-[11px]">
          <span className="font-bold font-mono text-sky-400 mb-1 block">TACTICAL INSTRUCTION:</span>
          <p className="text-[#666] text-[10px] font-sans">
             Select individual active nodes (Sensors, Pumps, or SOS anchors) directly to highlight regional statistics inside the telemetry reader deck on the right.
          </p>
        </div>
      </div>
    </div>
  );
}
