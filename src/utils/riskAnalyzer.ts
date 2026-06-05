import { FloodSeverity, DisasterSimulationState, AIAnalysisResult, TelemetrySensor } from "../types";

export function calculateDetailedRisk(
  state: DisasterSimulationState,
  sensors: TelemetrySensor[],
  failedPumpsCount: number,
  activeSOSCount: number
): AIAnalysisResult {
  // Base factors
  const avgRainfall24h = (sensors.reduce((acc, s) => acc + s.rainfall24h, 0) / sensors.length) * state.rainfallMultiplier;
  const avgRainfall120h = (sensors.reduce((acc, s) => acc + s.rainfall120h, 0) / sensors.length) * state.rainfallMultiplier;
  const avgWaterLevelMsl = sensors.reduce((acc, s) => acc + s.waterLevelMsl, 0) / sensors.length + state.waterLevelOffset;

  // Let's find max values to display in AI dashboard
  const maxRainfall24h = Math.max(...sensors.map(s => s.rainfall24h)) * state.rainfallMultiplier;
  const maxWaterLevelSensor = sensors.reduce((prev, current) => {
    const prevVal = prev.waterLevelMsl + state.waterLevelOffset;
    const currVal = current.waterLevelMsl + state.waterLevelOffset;
    return currVal > prevVal ? current : prev;
  });
  const maxWaterLevelMsl = maxWaterLevelSensor.waterLevelMsl + state.waterLevelOffset;

  // High-fidelity risk weighting
  let score = 40; // baseline high during rain event of 5 days

  // 1. Rainfall weights (max rating is 35 points)
  // Max rainfall registered was 303.6 mm/day
  const rainfallFactor = Math.min(30, (maxRainfall24h / 303.6) * 30);
  score += rainfallFactor;

  // 2. Cumulative rain weight (max 15 points)
  // Max cumulative 5-day is 1072 mm
  const cumulativeFactor = Math.min(15, (avgRainfall120h / 1072.0) * 15);
  score += cumulativeFactor;

  // 3. Pump failures penalization (max 20 points)
  // Out of 14 pumps, every failed pump adds risk
  const pumpFailureFactor = Math.min(20, (failedPumpsCount / 14) * 40);
  score += pumpFailureFactor;

  // 4. Barriers and wall mitigations (subtracts risk!)
  if (state.floodBarrierDeployed) {
    score -= 8;
  }
  if (state.absWallStatus === "FULLY_RAISED") {
    score -= 10;
  } else if (state.absWallStatus === "PARTIALLY_RAISED") {
    score -= 5;
  }

  // 5. Runoff coefficient (drainage rate) adding (max 10 points)
  score += state.runoffCoefficient * 10;

  // 6. SOS density booster
  score += Math.min(10, activeSOSCount * 2);

  // Normalize score to 0 - 100
  score = Math.max(5, Math.min(100, Math.round(score)));

  // Classify severity
  let severity = FloodSeverity.SAFE;
  let alertHeadline = "สถานการณ์ปกติ - เฝ้าระวังระดับน้ำฝนระยะยาว";

  if (score >= 80) {
    severity = FloodSeverity.CRITICAL;
    alertHeadline = "แจ้งเตือนระดับวิกฤต (CRITICAL) - อพยพด่วนในพื้นที่ลุ่มต่ำริมแม่น้ำปัตตานี";
  } else if (score >= 55) {
    severity = FloodSeverity.WARNING;
    alertHeadline = "ระดับเตือนภัยสีเหลือง (WARNING) - เกิดน้ำท่วมล้นตลิ่งบางแห่ง ควรสแตนด์บายเครื่องสูบน้ำ";
  }

  // Key factors construction
  const keyFactors: { factor: string; impact: "HIGH" | "MEDIUM" | "LOW"; value: string }[] = [];

  keyFactors.push({
    factor: "ปริมาณน้ำฝน 24 ชม. สูงสุด",
    impact: maxRainfall24h > 250 ? "HIGH" : maxRainfall24h > 120 ? "MEDIUM" : "LOW",
    value: `${maxRainfall24h.toFixed(1)} มม./วัน`,
  });

  keyFactors.push({
    factor: "ฝนสะสม 5 วัน (เฉลี่ยพื้นที่)",
    impact: avgRainfall120h > 800 ? "HIGH" : avgRainfall120h > 400 ? "MEDIUM" : "LOW",
    value: `${avgRainfall120h.toFixed(0)} มม.`,
  });

  keyFactors.push({
    factor: "สถานะเครื่องสูบน้ำล่มเหลว",
    impact: failedPumpsCount >= 4 ? "HIGH" : failedPumpsCount >= 2 ? "MEDIUM" : "LOW",
    value: `${failedPumpsCount} จาก 14 สถานี`,
  });

  keyFactors.push({
    factor: "อัตราส่วนการปิดกั้นท่อระบาย (Blockage)",
    impact: "MEDIUM",
    value: "ตรวจพบขยะอุดตันใน 12 ชุมชนหนาแน่น",
  });

  // Dynamic explanations & recommendations
  const scenarios: string[] = [];
  const recommendations: string[] = [];

  if (severity === FloodSeverity.CRITICAL) {
    scenarios.push(
      `เกิดภาวะน้ำล้นตลิ่งจากแม่น้ำปัตตานี เนื่องจากปริมาณฝนสะสมสูงถึง ${avgRainfall120h.toFixed(0)} มม. เกินขีดจำกัดหน้าทางระบายน้ำ`,
      `สถานีสูบน้ำหลังโรงพยาบาลยะลา (คลองท่าสาป) อยู่ในสถานะล่มเหลวจากสภาพเครื่องสูบถูกน้ำท่วมซัด (Engine Flooded)`,
      `ชุมชนตลาดเก่าร่วมใจ และชุมชนริมแม่น้ำปัตตานีมีระดับน้ำเอ่อล้นเข้าท่วมพื้นที่อยู่อาศัยสูงกว่า 50-80 ซม.`,
      `ตรวจพบสัญญาณขอความช่วยเหลือ (SOS SOS Call) จากประชาชนในพื้นที่เสี่ยงมากกว่า ${activeSOSCount} จุด`
    );

    recommendations.push(
      "สั่งการอพยพประชาชนใน 41 ชุมชนเสี่ยง ไปยังโรงเรียนเทศบาล 4 (ธนวิถี) และ ศูนย์เยาวชนเทศบาลนครยะลาด่วนที่สุด",
      "ส่งหน่วยเร่งด่วนเข้ากู้สถานีสูบน้ำคลองท่าสาป ย้ายเครื่องปั่นไฟขึ้นที่สูง",
      "ผลักดันน้ำผ่านเขื่อนแม่น้ำปัตตานี ร่วมกับการควบคุมบานระบายน้ำปิด-เปิดตามตารางน้ำทะเลหนุนสูง",
      "ระดมรถสูบน้ำระยะไกลจาก ปภ. เขต 12 เข้าสนับสนุนจุดคูหาภิมุขและตลาดเก่า"
    );
  } else if (severity === FloodSeverity.WARNING) {
    scenarios.push(
      `เกิดน้ำขังสะสมบนผิวจราจรโดยเฉพาะจุดลุ่มต่ำ ชุมชนเวฬุวัน และสะเตงนอก ระดับระบายลดความเร็วลงจากปัญหาท่อขุดลอกล้าหลัง`,
      `ปริมาณฝนสะสมสัปดาห์นี้แตะ ${avgRainfall120h.toFixed(0)} มม. ทำให้ดินชุ่มน้ำเกือบ 90% (Runoff Coefficient สูงขึ้นเป็น ${(state.runoffCoefficient * 100).toFixed(0)}%)`,
      `ความจุศูนย์พักพิงหลักใกล้ถึงขีดจำกัดเนื่องจากคลื่นผู้ลี้ภัยเตรียมตัวล่วงหน้า`
    );

    recommendations.push(
      "แจ้งเตือนระดับสีเหลืองผ่านแอปเครือข่ายและหอกระจายข่าววิทยุเทศบาล ครอบคลุมผู้ใช้สัญญาณกว่า 90%",
      "สั่งเดินเครื่องสูบน้ำแบบเต็มพิกัดใน 14 สถานีหลัก และจุดแก้มลิงบึงบากง",
      "เปิดผนังกันน้ำพับได้อัตโนมัติ (ABS Wall) หรือวางกระสอบทรายความยาวตลอดแนวริมน้ำปัตตานี",
      "เตรียมกำลังพลอาสาสมัครรองรับจุดอพยพสำรอง วัดพุทธภูมิบรรเทาความแออัด"
    );
  } else {
    scenarios.push(
      "สภาพอากาศโดยทั่วไปยังควบคุมได้ ปริมาณฝนตกกระจายตัวและระบายน้ำได้ทันตามรอบธรรมชาติ",
      "ระดับน้ำในแม่น้ำปัตตานีที่จุดวัดสถานีท่าสาปยังห่างจากขีดเตือนภัยล้นตลิ่ง",
      "สถานีสูบน้ำเกือบทั้งหมดอยู่ในโหมดพร้อมทำงานพร้อมแผนบำรุงรักษาเชิงป้องกัน"
    );

    recommendations.push(
      "ตรวจสอบสุขภาพอุปกรณ์สถานีมาตรวัดโทรมาตร (Telemetry Sensors) โดยเฉพาะตัวที่แบตเตอรี่ตกลงผิดปกติ",
      "ทำความสะอาดขยะมูลฝอยหน้าตะแกรงสถานีสูบน้ำต้อนรับรอบฝนถัดไป",
      "อัปเดตแผนที่พิกัดบ้านกลุ่มเปราะบาง (Vulnerable population) ประจำปีของยะลา"
    );
  }

  return {
    riskScore: score,
    severity,
    alertHeadline,
    scenarios,
    recommendations,
    keyFactors,
  };
}
