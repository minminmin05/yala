import { AIAnalysisResult, FloodSeverity } from "../types";
import { Cpu, AlertTriangle, BadgeAlert, CheckCircle, Lightbulb, FileText, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface AIInsightsPanelProps {
  analysis: AIAnalysisResult;
}

export default function AIInsightsPanel({ analysis }: AIInsightsPanelProps) {
  const { riskScore, severity, alertHeadline, scenarios, recommendations, keyFactors } = analysis;

  // Visual severity bindings
  let ringColor = "stroke-emerald-500 text-emerald-400";
  let bgGradient = "from-emerald-950/20 via-slate-950/40 to-slate-950";
  let badgeColor = "bg-emerald-950 text-emerald-400 border-emerald-800";
  let iconComponent = <CheckCircle className="h-5 w-5 text-emerald-400" />;

  if (severity === FloodSeverity.CRITICAL) {
    ringColor = "stroke-rose-500 text-rose-400";
    bgGradient = "from-rose-950/30 via-pink-950/10 to-slate-950";
    badgeColor = "bg-rose-950 text-rose-400 border-rose-800 animate-pulse";
    iconComponent = <BadgeAlert className="h-5 w-5 text-rose-500 animate-bounce" />;
  } else if (severity === FloodSeverity.WARNING) {
    ringColor = "stroke-amber-500 text-amber-400";
    bgGradient = "from-amber-950/20 via-slate-950/40 to-slate-950";
    badgeColor = "bg-amber-950 text-amber-400 border-amber-800";
    iconComponent = <AlertTriangle className="h-5 w-5 text-amber-400" />;
  }

  // Circular gauge calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="space-y-4 text-[#e0e0e0] font-sans p-1 h-full overflow-y-auto pr-2 select-none">
      {/* AI Header */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-400 animate-pulse" />
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            PREDICTIVE MODEL INSIGHTS (YALA SENSOR MATRIX)
          </h4>
        </div>
        <span className="text-[9px] bg-[#111] text-sky-400 px-2 py-0.5 rounded-sm border border-[#222] font-mono">
          MODEL: FLOOD-PREDICT/V2.1-SECURE
        </span>
      </div>

      {/* Main Core Gauge and Alert Card */}
      <div className={`bg-gradient-to-br ${bgGradient} border border-[#222] rounded-sm p-4 shadow-xl`}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Circular SVG Gauge */}
          <div className="relative flex items-center justify-center h-24 w-24 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-[#111]"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                className={ringColor}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold font-mono tracking-tight">{riskScore}</span>
              <span className="text-[8px] text-[#666] font-mono font-bold uppercase">SCORE</span>
            </div>
          </div>

          {/* Headline Severity status details */}
          <div className="space-y-1.5 flex-grow text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm border ${badgeColor}`}>
                {severity}
              </span>
              <span className="text-[10px] text-[#888] font-mono">EST_FLOOD_INDEX</span>
            </div>
            <h3 className="font-bold text-[13px] text-white flex items-center justify-center sm:justify-start gap-1.5 mt-1 leading-normal font-sans">
              {iconComponent}
              {alertHeadline}
            </h3>
            <p className="text-[10.5px] text-[#888] leading-normal font-sans">
              โมเดลประเมินความเสี่ยงอุทกภัยจากความแปรปรวนทลักแม่น้ำ ลุ่มลีดน-ท่าสาป และการชลประทานแบบคาดหมายล่วงหน้าตลอดแนวชายแดนยะลา
            </p>
          </div>
        </div>
      </div>

      {/* High-Fidelity Factor Matrix Weights */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5">
        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-[#222] pb-1.5 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
          KEY DETECTION ATTRIBUTE WEIGHTS
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {keyFactors.map((kf, i) => {
            let impactColor = "text-emerald-400";
            if (kf.impact === "HIGH") {
              impactColor = "text-rose-400 font-bold";
            } else if (kf.impact === "MEDIUM") {
              impactColor = "text-amber-400";
            }

            return (
              <div
                key={i}
                className="p-2 rounded-sm bg-[#111] border border-[#222] flex flex-col justify-between"
              >
                <span className="text-[9.5px] text-[#888] font-sans font-medium">{kf.factor}</span>
                <div className="flex justify-between items-baseline mt-1 text-[11px]">
                  <span className="text-white font-mono font-bold leading-none">{kf.value}</span>
                  <span className={`text-[8.5px] font-mono ${impactColor}`}>
                    [{kf.impact}]
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenarios / Physical impact assessment list */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5">
        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 mb-2 border-b border-[#222] pb-1.5 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-amber-500" />
          SCENARIO IMPACT ASSESSMENT (YALA SECTOR)
        </h5>
        
        <ul className="space-y-2">
          {scenarios.map((sc, i) => (
            <li key={i} className="text-[11px] text-[#bbb] leading-normal flex items-start gap-2 font-sans">
              <span className="text-amber-500 leading-relaxed font-bold shrink-0">⊙</span>
              <span>{sc}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Dynamic Actionable Recommendations */}
      <div className="bg-[#0a0a0a] border border-[#222] rounded-sm p-3.5">
        <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 mb-2 border-b border-[#222] pb-1.5 flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-sky-400" />
          COORDINATED EMERGENCY RECOMMENDATIONS
        </h5>

        <ul className="space-y-2">
          {recommendations.map((rec, i) => (
            <li key={i} className="text-[11px] text-[#bbb] leading-normal flex items-start gap-2 font-sans">
              <span className="text-sky-400 leading-none shrink-0 text-xs">💬</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

