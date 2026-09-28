import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ─── الأدوار ───
export type Role = "admin" | "coach" | "swimmer" | "parent";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  // حقول إضافية اختيارية
  swimmerId?: string;   // للسباح
  parentOf?: string;    // لولي الأمر
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // جلب الدور من Firestore
      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || "",
            name: data.name || "",
            role: (data.role as Role) || "swimmer",
            swimmerId: data.swimmerId,
            parentOf: data.parentOf,
          });
        } else {
          // مستخدم بدون وثيقة في Firestore — نعتبره admin مؤقتاً
          // ⚠️ للتطوير فقط — احذف هذا لاحقاً
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || "",
            name: "بدون اسم",
            role: "swimmer",
          });
        }
      } catch (err) {
        console.error("خطأ في جلب بيانات المستخدم :", err);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook للاستعمال داخل الصفحات
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}