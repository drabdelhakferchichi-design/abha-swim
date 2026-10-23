import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface UseNotificationsProps {
  userId: string | undefined;
  enabled?: boolean;
}

export function useNotifications({ userId, enabled = true }: UseNotificationsProps) {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [notifications, setNotifications] = useState<number>(0);

  // تتبع آخر ID معروف (لتجنب الإشعارات القديمة)
  const knownMessageIds = useRef<Set<string>>(new Set());
  const knownNewsIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  // طلب الإذن
  const requestPermission = async () => {
    if (typeof Notification === "undefined") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        new Notification("✅ تم تفعيل الإشعارات", {
          body: "ستصلك إشعارات المستجدات والرسائل الجديدة",
          icon: "/images/logo.png",
        });
      }
    } catch (err) {
      console.error("Notification permission error:", err);
    }
  };

  // إظهار إشعار
  const showNotification = (title: string, body: string, tag?: string) => {
    if (permission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: "/images/logo.png",
        badge: "/images/logo.png",
        tag: tag || "default",
        dir: "rtl",
        lang: "ar",
      });
    } catch (err) {
      console.error("Show notification error:", err);
    }
  };

  // إعداد الإشعارات
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof Notification === "undefined") return;

    // ─── إشعارات المستجدات (News) ───
    const newsQ = query(
      collection(db, "news"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubNews = onSnapshot(newsQ, (snap) => {
      if (!initialized.current) {
        // أول مرة — سجل الـ IDs الموجودة
        snap.docs.forEach((d) => knownNewsIds.current.add(d.id));
        initialized.current = true;
        return;
      }

      snap.docChanges().forEach((change) => {
        if (change.type === "added" && !knownNewsIds.current.has(change.doc.id)) {
          const data = change.doc.data();
          knownNewsIds.current.add(change.doc.id);
          showNotification(
            "📢 مستجد جديد",
            data.title || "خبر جديد",
            `news-${change.doc.id}`
          );
        }
      });
    });

    return () => unsubNews();
  }, [userId, enabled, permission]);

  // ─── إشعارات الرسائل الجديدة ───
  useEffect(() => {
    if (!enabled || !userId) return;
    if (typeof Notification === "undefined") return;

    // جلب الرسائل الحالية (لتسجيل IDs القديمة)
    const initMessages = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("toUid", "==", userId),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => knownMessageIds.current.add(d.id));
      } catch (err) {
        console.error("Init messages error:", err);
      }
    };

    initMessages();

    const messagesQ = query(
      collection(db, "messages"),
      where("toUid", "==", userId)
    );

    const unsubMessages = onSnapshot(messagesQ, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added" && !knownMessageIds.current.has(change.doc.id)) {
          const data = change.doc.data();
          knownMessageIds.current.add(change.doc.id);
          
          // تجاهل الرسائل القديمة (> 10 ثوانٍ)
          const createdAt = data.createdAt?.toDate();
          const now = new Date();
          if (createdAt && now.getTime() - createdAt.getTime() < 10000) {
            showNotification(
              `💬 رسالة من ${data.fromName || "مستخدم"}`,
              data.body || "رسالة جديدة",
              `message-${change.doc.id}`
            );
          }
        }
      });
    });

    return () => unsubMessages();
  }, [userId, enabled, permission]);

  return {
    permission,
    requestPermission,
    notificationsCount: notifications,
    setNotificationsCount: setNotifications,
  };
}