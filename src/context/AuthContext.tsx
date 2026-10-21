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
  updatePassword as fbUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type Role = "admin" | "coach" | "swimmer" | "parent";

export interface AppUser {
  uid: string;
  email: string;
  username?: string;
  name: string;
  role: Role;
  swimmerId?: string;
  parentOf?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || "",
            username: data.username,
            name: data.name || "",
            role: (data.role as Role) || "swimmer",
            swimmerId: data.swimmerId,
            parentOf: data.parentOf,
          });
        } else {
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

  // ─── تسجيل الدخول (username أو email) ───
  const login = async (usernameOrEmail: string, password: string) => {
    let emailToUse = usernameOrEmail.trim();

    // إذا لم يكن فيه @، نفترض أنه username
    if (!emailToUse.includes("@")) {
      // ابحث في Firestore عن username
      const q = query(
        collection(db, "users"),
        where("username", "==", emailToUse)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        throw new Error("اسم المستخدم غير موجود");
      }

      // إذا وجد، استخدم الإيميل الداخلي
      emailToUse = `${emailToUse}@abha-swim.local`;
    }

    await signInWithEmailAndPassword(auth, emailToUse, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUsername = async (newUsername: string) => {
    if (!auth.currentUser) throw new Error("لا يوجد مستخدم");
    const trimmed = newUsername.trim();
    if (trimmed.length < 3) throw new Error("اسم المستخدم قصير جداً");

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      username: trimmed,
    });

    setUser((prev) => (prev ? { ...prev, username: trimmed } : prev));
  };

  const updateDisplayName = async (newName: string) => {
    if (!auth.currentUser) throw new Error("لا يوجد مستخدم");
    const trimmed = newName.trim();
    if (trimmed.length < 2) throw new Error("الاسم قصير جداً");

    await updateProfile(auth.currentUser, { displayName: trimmed });
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      name: trimmed,
    });

    setUser((prev) => (prev ? { ...prev, name: trimmed } : prev));
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser || !auth.currentUser.email) {
      throw new Error("لا يوجد مستخدم");
    }
    if (newPassword.length < 6) {
      throw new Error("كلمة المرور الجديدة قصيرة جداً");
    }

    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(auth.currentUser, credential);
    await fbUpdatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUsername,
        updateDisplayName,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}