import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface UserRecord {
  uid: string;
  name: string;
  role: string;
}

interface Message {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  body: string;
  read: boolean;
  createdAt: Date | null;
}

export default function Messages() {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // جلب كل المستخدمين (للاختيار)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const items: UserRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (d.id !== user?.uid) {
          items.push({
            uid: d.id,
            name: data.name || "",
            role: data.role || "",
          });
        }
      });
      setAllUsers(items);
    });
    return () => unsub();
  }, [user]);

  // جلب الرسائل
  useEffect(() => {
    if (!user) return;
    const q1 = query(
      collection(db, "messages"),
      where("fromUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const q2 = query(
      collection(db, "messages"),
      where("toUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const process = (snap: any) => {
      const items: Message[] = snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          fromUid: data.fromUid || "",
          fromName: data.fromName || "",
          toUid: data.toUid || "",
          toName: data.toName || "",
          body: data.body || "",
          read: data.read || false,
          createdAt: data.createdAt?.toDate() || null,
        };
      });
      setMessages(items);
    };

    const u1 = onSnapshot(q1, process);
    const u2 = onSnapshot(q2, process);

    return () => {
      u1();
      u2();
    };
  }, [user]);

  // فلترة المستخدمين حسب الدور
  const visibleUsers = allUsers.filter((u) => {
    if (!user) return false;

    // admin يرى الجميع
    if (user.role === "admin") return true;

    // مدرب يرى admin + أولياء أمور
    if (user.role === "coach") {
      return u.role === "admin" || u.role === "parent";
    }

    // ولي أمر يرى admin + مدربين
    if (user.role === "parent") {
      return u.role === "admin" || u.role === "coach";
    }

    return false;
  });

  const filteredUsers = visibleUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  // رسائل المحادثة الحالية
  const conversation = selectedUser
    ? messages
        .filter(
          (m) =>
            (m.fromUid === user?.uid && m.toUid === selectedUser.uid) ||
            (m.fromUid === selectedUser.uid && m.toUid === user?.uid)
        )
        .sort((a, b) => {
          const da = a.createdAt?.getTime() || 0;
          const dbb = b.createdAt?.getTime() || 0;
          return da - dbb;
        })
    : [];

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !body.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "messages"), {
        fromUid: user.uid,
        fromName: user.name || user.email,
        toUid: selectedUser.uid,
        toName: selectedUser.name,
        body: body.trim(),
        read: false,
        createdAt: serverTimestamp(),
      });
      setBody("");
    } catch (err) {
      console.error(err);
      alert("خطأ في الإرسال");
    }
    setLoading(false);
  };

  // تعليم الرسائل كمقروءة عند فتح المحادثة
  useEffect(() => {
    if (!user || !selectedUser) return;
    conversation.forEach((m) => {
      if (m.toUid === user.uid && !m.read) {
        updateDoc(doc(db, "messages", m.id), { read: true }).catch(console.error);
      }
    });
  }, [conversation, selectedUser, user]);

  // عدد الرسائل غير المقروءة من مستخدم معين
  const unreadFrom = (uid: string) =>
    messages.filter((m) => m.fromUid === uid && m.toUid === user?.uid && !m.read).length;

  const roleLabel = (role: string) => {
    if (role === "admin") return "🟢 مشرف";
    if (role === "coach") return "🔵 مدرب";
    if (role === "parent") return "🟠 ولي أمر";
    return role;
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">💬 التواصل</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* قائمة المستخدمين */}
        <div className="card">
          <h2 className="font-bold text-abha-green mb-3">📋 المحادثات</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input mb-3"
            placeholder="🔍 ابحث..."
          />

          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">لا يوجد مستخدمون</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {filteredUsers.map((u) => {
                const unread = unreadFrom(u.uid);
                return (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-right p-2 rounded-lg text-sm transition ${
                      selectedUser?.uid === u.uid
                        ? "bg-abha-green text-white"
                        : "hover:bg-abha-bg"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className={`text-xs ${selectedUser?.uid === u.uid ? "text-white/80" : "text-gray-500"}`}>
                          {roleLabel(u.role)}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {unread}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* المحادثة */}
        <div className="card lg:col-span-2 flex flex-col" style={{ minHeight: "500px" }}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500">
              <div>
                <p className="text-4xl mb-2">💬</p>
                <p>اختر مستخدماً للبدء بالمحادثة</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b pb-3 mb-3">
                <p className="font-bold text-abha-green">{selectedUser.name}</p>
                <p className="text-xs text-gray-500">{roleLabel(selectedUser.role)}</p>
              </div>

              <div className="flex-1 overflow-y-auto mb-3 space-y-2" style={{ maxHeight: "400px" }}>
                {conversation.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">لا توجد رسائل بعد</p>
                ) : (
                  conversation.map((m) => {
                    const mine = m.fromUid === user?.uid;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            mine
                              ? "bg-abha-green text-white"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          <p>{m.body}</p>
                          <p className={`text-xs mt-1 ${mine ? "text-white/70" : "text-gray-500"}`}>
                            {m.createdAt?.toLocaleString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="input flex-1"
                  placeholder="اكتب رسالتك..."
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                  📤
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}