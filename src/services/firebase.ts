import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDocFromServer,
  getDoc,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { DistressSOS, OperationType } from "../types";

// Determine if the imported config is a placeholder
const isPlaceholderConfig =
  !firebaseConfig ||
  firebaseConfig.apiKey.includes("PLACEHOLDER") ||
  firebaseConfig.projectId === "placeholder-project";

let app;
let auth: any = null;
let db: any = null;
let isConnected = false;

if (!isPlaceholderConfig) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    isConnected = true;

    // Test connection as requested by system skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.warn("Please check your Firebase configuration (client is offline).");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.error("Firebase initialization failed, running in sandbox mode:", err);
    isConnected = false;
  }
} else {
  console.log("Firebase is running in sandbox/offline mode because credentials have not been configured in the UI yet.");
}

export { auth, db, isConnected };

// Custom Firestore Error Handling Wrapper
export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error("Firestore Error Event: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Disaster Data Storage Service (Hybrid offline-first localStorage & real Firestore fallback)
export class DatabaseService {
  private static SOS_COLLECTION = "active_sos";
  private static SIM_COLLECTION = "simulation_config";

  private static getLocalSOS(): DistressSOS[] {
    const list = localStorage.getItem("yala_flood_sos_signals");
    if (!list) {
      // Seed some starting SOS signals for the prototype setup
      const seed: DistressSOS[] = [
        {
          id: "sos-1",
          communityName: "ชุมชนตลาดเก่าร่วมใจ (ซอย 3/2 ลุ่มต่ำ)",
          coordinates: [6.5458, 101.2981],
          message: "คนชรา 2 คนติดชะงัก ชั้นล่างถูกน้ำท่วมมิด 50 ซม. ขอเรือช่วยเหลือด่วนค่ะ",
          senderPhone: "089-761-XXXX",
          timestamp: new Date(Date.now() - 4500000).toISOString(),
          status: "PENDING",
          vulnerableCount: 2,
        },
        {
          id: "sos-2",
          communityName: "ชุมชนเวฬุวัน-วิเวกโกลก",
          coordinates: [6.5492, 101.2915],
          message: "มีเด็กเล็กไข้ขึ้นสูง น้ำท่วมตัดขาดเข้าออกไม่ได้ ต้องการยาสามัญประจำบ้าน",
          senderPhone: "081-324-XXXX",
          timestamp: new Date(Date.now() - 15000000).toISOString(),
          status: "DISPATCHED",
          vulnerableCount: 1,
        },
        {
          id: "sos-3",
          communityName: "ชุมชนริมแม่น้ำปัตตานี 1",
          coordinates: [6.5582, 101.2811],
          message: "สะพานไม้ชั่วคราวชำรุดหัก อาหารและน้ำสะอาดสำหรับ 4 ครอบครัวหมดเกลี้ยง",
          senderPhone: "085-112-XXXX",
          timestamp: new Date(Date.now() - 1200000).toISOString(),
          status: "PENDING",
          vulnerableCount: 5,
        }
      ];
      localStorage.setItem("yala_flood_sos_signals", JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(list);
  }

  private static setLocalSOS(data: DistressSOS[]) {
    localStorage.setItem("yala_flood_sos_signals", JSON.stringify(data));
  }

  // Get All SOS Alerts
  static async getSOSAlerts(): Promise<DistressSOS[]> {
    if (isConnected && db) {
      try {
        const querySnapshot = await getDocs(collection(db, this.SOS_COLLECTION));
        const sosList: DistressSOS[] = [];
        querySnapshot.forEach((docSnap) => {
          sosList.push({ id: docSnap.id, ...docSnap.data() } as DistressSOS);
        });
        return sosList.length > 0 ? sosList : this.getLocalSOS();
      } catch (err) {
        // Fallback to local on error
        console.warn("Firestore fetch SOS failed, falling back to local:", err);
        return this.getLocalSOS();
      }
    }
    return this.getLocalSOS();
  }

  // Add new Distress SOS Call
  static async addSOSAlert(alert: Omit<DistressSOS, "id" | "timestamp" | "status">): Promise<DistressSOS> {
    const newAlert: DistressSOS = {
      ...alert,
      id: "sos-" + Date.now(),
      timestamp: new Date().toISOString(),
      status: "PENDING"
    };

    if (isConnected && db) {
      try {
        await setDoc(doc(db, this.SOS_COLLECTION, newAlert.id), newAlert);
      } catch (err) {
        handleFirestoreError(err, "create", `${this.SOS_COLLECTION}/${newAlert.id}`);
      }
    }

    // Always update local for hybrid persistence
    const local = this.getLocalSOS();
    local.unshift(newAlert);
    this.setLocalSOS(local);

    return newAlert;
  }

  // Update SOS status (Action-based state validation)
  static async updateSOSStatus(id: string, newStatus: "PENDING" | "DISPATCHED" | "SOLVED"): Promise<void> {
    if (isConnected && db) {
      const docPath = `${this.SOS_COLLECTION}/${id}`;
      try {
        await setDoc(doc(db, this.SOS_COLLECTION, id), { status: newStatus }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, "update", docPath);
      }
    }

    const local = this.getLocalSOS();
    const idx = local.findIndex((s) => s.id === id);
    if (idx !== -1) {
      local[idx].status = newStatus;
      this.setLocalSOS(local);
    }
  }

  // Delete/Resolve SOS alert
  static async deleteSOSAlert(id: string): Promise<void> {
    if (isConnected && db) {
      const docPath = `${this.SOS_COLLECTION}/${id}`;
      try {
        await firestoreDeleteDoc(doc(db, this.SOS_COLLECTION, id));
      } catch (err) {
        handleFirestoreError(err, "delete", docPath);
      }
    }

    const local = this.getLocalSOS();
    const filtered = local.filter((s) => s.id !== id);
    this.setLocalSOS(filtered);
  }
}
