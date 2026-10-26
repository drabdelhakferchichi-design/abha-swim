import { useEffect, useState } from "react";
import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

interface SwimResult {
  event: string;
  position: number;
  medal: "gold" | "silver" | "bronze" | "none";
  points: number;
  time: string;
}

interface Competition {
  id: string;
  name: string;
  date: string;
  plannedRaces: string[];
  results: SwimResult[];
}

interface Swimmer {
  id: string;
  name: string;
  ageCategory: string;
  coachId: string;
  parentUid: string;
  competitions?: Competition[];
}

const allRaces = [
  "50م حرة", "100م حرة", "200م حرة", "400م حرة", "1500م حرة",
  "50م ظهر", "100م ظهر", "200م ظهر",
  "50م صدر", "100م صدر", "200م صدر",
  "50م فراشة", "100م فراشة", "200م فراشة",
  "200م متنوع", "400م متنوع",
];

export default function CompetitionsManager() {
  const { user } = useAuth();
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [selectedSwimmerId, setSelectedSwimmerId] = useState<string>("");
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"races" | "results" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [showPastCompForm, setShowPastCompForm] = useState(false);

  const [newCompName, setNewCompName] = useState("");
  const [newCompDate, setNewCompDate] = useState("");

  // تحميل السباحين
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "swimmers"), (snap) => {
      let items: Swimmer[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          coachId: data.coachId || "",
          parentUid: data.parentUid || "",
          competitions: data.competitions || [],
        };
      });

      if (user.role === "coach") {
        items = items.filter((s) => s.coachId === user.uid);
      } else if (user.role === "parent") {
        items = items.filter((s) => s.parentUid === user.uid);
      }

      setSwimmers(items);
      if (items.length > 0 && !selectedSwimmerId) {
        setSelectedSwimmerId(items[0].id);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user, selectedSwimmerId]);

  const canEdit = user?.role === "coach";
  const isReadOnly = user?.role === "admin" || user?.role === "parent";
  const selectedSwimmer = swimmers.find((s) => s.id === selectedSwimmerId) || null;
  const selectedComp = selectedSwimmer?.competitions?.find((c) => c.id === selectedCompId) || null;

  // حفظ السباح
  const saveSwimmer = async (swimmer: Swimmer) => {
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await updateDoc(doc(db, "swimmers", swimmer.id), {
        competitions: swimmer.competitions || [],
      });
      setMsg({ type: "success", text: "✅ تم الحفظ" });
      setTimeout(() => setMsg({ type: "", text: "" }), 2000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMsg({ type: "error", text: error.message || "خطأ" });
    }
    setSaving(false);
  };

  // إضافة بطولة جديدة (قادمة أو سابقة)
  const addCompetition = () => {
    if (!selectedSwimmer || !newCompName.trim()) return;
    const newComp: Competition = {
      id: `comp_${Date.now()}`,
      name: newCompName.trim(),
      date: newCompDate,
      plannedRaces: [],
      results: [],
    };
    const updated: Swimmer = {
      ...selectedSwimmer,
      competitions: [...(selectedSwimmer.competitions || []), newComp],
    };
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedCompId(newComp.id);
    setActiveTab(null);
    setNewCompName("");
    setNewCompDate("");
    setShowPastCompForm(false);
    saveSwimmer(updated);
  };

  // toggle السباق
  const toggleRace = (race: string) => {
    if (!selectedSwimmer || !selectedComp || !canEdit) return;
    const comps = [...(selectedSwimmer.competitions || [])];
    const idx = comps.findIndex((c) => c.id === selectedComp.id);
    if (idx < 0) return;

    const planned = [...comps[idx].plannedRaces];
    if (planned.includes(race)) {
      comps[idx].plannedRaces = planned.filter((r) => r !== race);
      comps[idx].results = comps[idx].results.filter((r) => r.event !== race);
    } else {
      comps[idx].plannedRaces = [...planned, race];
    }
    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
  };

  // تحديث نتيجة
  const updateResult = (race: string, field: keyof SwimResult, value: string | number) => {
    if (!selectedSwimmer || !selectedComp || !canEdit) return;
    const comps = [...(selectedSwimmer.competitions || [])];
    const idx = comps.findIndex((c) => c.id === selectedComp.id);
    if (idx < 0) return;

    const resultIdx = comps[idx].results.findIndex((r) => r.event === race);
    if (resultIdx >= 0) {
      comps[idx].results[resultIdx] = { ...comps[idx].results[resultIdx], [field]: value };
    } else {
      comps[idx].results.push({
        event: race,
        position: field === "position" ? Number(value) : 0,
        medal: field === "medal" ? (value as "gold" | "silver" | "bronze" | "none") : "none",
        points: field === "points" ? Number(value) : 0,
        time: field === "time" ? String(value) : "",
      });
    }
    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
  };

  // حذف بطولة
  const deleteCompetition = () => {
    if (!selectedSwimmer || !selectedComp || !canEdit) return;
    if (!confirm("حذف البطولة ؟")) return;
    const comps = (selectedSwimmer.competitions || []).filter((c) => c.id !== selectedComp.id);
    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedCompId("");
    setActiveTab(null);
    saveSwimmer(updated);
  };

  const getMedalEmoji = (medal: string) => {
    if (medal === "gold") return "🥇";
    if (medal === "silver") return "🥈";
    if (medal === "bronze") return "🥉";
    return "—";
  };

  if (loading) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">🏆 إدارة البطولات</h1>
      {isReadOnly && (
        <p className="text-xs text-gray-500 mb-4">
          👁️ عرض فقط (كما أدخله المدرب) — للقراءة فقط
        </p>
      )}

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 mb-4 ${
          msg.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* العمود 1: قائمة السباحين */}
        <div className="card lg:col-span-1">
          <h2 className="font-bold text-abha-green mb-3">👥 السباحون</h2>
          <div className="space-y-1">
            {swimmers.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedSwimmerId(s.id); setSelectedCompId(""); setActiveTab(null); }}
                className={`w-full text-right p-2 rounded-lg text-sm transition ${
                  selectedSwimmerId === s.id
                    ? "bg-abha-green text-white font-semibold"
                    : "hover:bg-abha-bg"
                }`}
              >
                <div>{s.name}</div>
                <div className={`text-xs ${selectedSwimmerId === s.id ? "text-white/80" : "text-gray-500"}`}>
                  {s.ageCategory}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* العمود 2: بطولات السباح */}
        <div className="card lg:col-span-1">
          <h2 className="font-bold text-abha-green mb-3">🏆 بطولات {selectedSwimmer?.name || ""}</h2>

          {canEdit && (
            <>
              <button
                onClick={() => setShowPastCompForm(!showPastCompForm)}
                className="btn-primary text-xs w-full mb-2"
              >
                {showPastCompForm ? "إلغاء" : "➕ إضافة بطولة"}
              </button>

              {showPastCompForm && (
                <div className="bg-abha-bg p-2 rounded mb-3">
                  <input
                    type="text"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="input text-xs mb-1"
                    placeholder="اسم البطولة"
                  />
                  <input
                    type="date"
                    value={newCompDate}
                    onChange={(e) => setNewCompDate(e.target.value)}
                    className="input text-xs mb-1"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mb-1">
                    💡 يمكنك اختيار تاريخ قديم للبطولات السابقة
                  </p>
                  <button onClick={addCompetition} className="btn-gold text-xs w-full">
                    ✅ حفظ البطولة
                  </button>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            {selectedSwimmer?.competitions
              ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedCompId(c.id); setActiveTab(null); }}
                className={`w-full text-right p-2 rounded-lg text-sm transition ${
                  selectedCompId === c.id
                    ? "bg-abha-gold text-white font-semibold"
                    : "hover:bg-abha-bg"
                }`}
              >
                <div className="font-semibold">{c.name}</div>
                {c.date && <div className="text-xs opacity-80">{c.date}</div>}
                <div className="text-xs mt-1">
                  {c.plannedRaces.length} سباق — {c.results.filter((r) => r.medal !== "none").length} ميدالية
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* العمود 3-4: المحتوى */}
        <div className="lg:col-span-2">
          {!selectedComp ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">اختر بطولة من القائمة لعرض تفاصيلها</p>
            </div>
          ) : activeTab === null ? (
            // اختيار المرحلة
            <div className="card">
              <h2 className="text-lg font-bold text-abha-green mb-2">🏆 {selectedComp.name}</h2>
              {selectedComp.date && <p className="text-xs text-gray-500 mb-4">📅 {selectedComp.date}</p>}

              <p className="text-sm text-gray-600 mb-4">
                {canEdit ? "اختر ما تريد إدخاله :" : "البيانات المتاحة :"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* بطاقة تسجيل السباقات */}
                <button
                  onClick={() => setActiveTab("races")}
                  className="card text-center hover:shadow-lg transition border-2 border-blue-200 bg-blue-50 p-6"
                >
                  <div className="text-5xl mb-3">🏊</div>
                  <h3 className="font-bold text-lg text-blue-700 mb-1">
                    {canEdit ? "تسجيل السباقات" : "السباقات المخططة"}
                  </h3>
                  <p className="text-xs text-gray-600">{canEdit ? "قبل البطولة" : "كما أدخلها المدرب"}</p>
                  <p className="text-xs text-blue-600 mt-2 font-semibold">
                    {selectedComp.plannedRaces.length} سباق مسجّل
                  </p>
                </button>

                {/* بطاقة تسجيل النتائج */}
                <button
                  onClick={() => setActiveTab("results")}
                  disabled={selectedComp.plannedRaces.length === 0}
                  className={`card text-center hover:shadow-lg transition border-2 p-6 ${
                    selectedComp.plannedRaces.length > 0
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="text-5xl mb-3">📊</div>
                  <h3 className={`font-bold text-lg mb-1 ${selectedComp.plannedRaces.length > 0 ? "text-green-700" : "text-gray-400"}`}>
                    {canEdit ? "تسجيل النتائج" : "النتائج المحققة"}
                  </h3>
                  <p className="text-xs text-gray-600">{canEdit ? "بعد البطولة" : "كما أدخلها المدرب"}</p>
                  {selectedComp.plannedRaces.length === 0 && canEdit && (
                    <p className="text-xs text-red-500 mt-2">⚠️ سجّل السباقات أولاً</p>
                  )}
                  {selectedComp.plannedRaces.length > 0 && (
                    <p className="text-xs text-green-600 mt-2 font-semibold">
                      {selectedComp.results.filter((r) => r.medal !== "none").length} ميدالية
                    </p>
                  )}
                </button>
              </div>

              {canEdit && (
                <button
                  onClick={deleteCompetition}
                  className="text-red-500 hover:text-red-700 text-xs mt-4"
                >
                  🗑️ حذف البطولة
                </button>
              )}
            </div>
          ) : activeTab === "races" ? (
            // صفحة السباقات
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setActiveTab(null)} className="text-sm text-gray-500 hover:text-abha-green">
                  ← رجوع
                </button>
                <h2 className="text-lg font-bold text-abha-green">
                  🏊 {canEdit ? "تسجيل السباقات" : "السباقات المخططة"}
                </h2>
              </div>

              <p className="text-xs text-gray-600 mb-3">
                {canEdit
                  ? "حدد السباقات التي سيشارك فيها السباح :"
                  : "السباقات التي سجلها المدرب :"}
              </p>

              {canEdit ? (
                <div className="flex flex-wrap gap-1">
                  {allRaces.map((race) => (
                    <button
                      key={race}
                      type="button"
                      onClick={() => toggleRace(race)}
                      className={`px-2 py-1 rounded text-xs ${
                        selectedComp.plannedRaces.includes(race)
                          ? "bg-abha-green text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {selectedComp.plannedRaces.includes(race) ? "✓ " : ""}{race}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedComp.plannedRaces.length === 0 ? (
                    <span className="text-xs text-gray-400">لم يتم تسجيل سباقات</span>
                  ) : (
                    selectedComp.plannedRaces.map((r) => (
                      <span key={r} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        {r}
                      </span>
                    ))
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  onClick={() => saveSwimmer(selectedSwimmer!)}
                  disabled={saving}
                  className="btn-primary mt-4 text-sm w-full disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "💾 حفظ السباقات"}
                </button>
              )}
            </div>
          ) : (
            // صفحة النتائج
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setActiveTab(null)} className="text-sm text-gray-500 hover:text-abha-green">
                  ← رجوع
                </button>
                <h2 className="text-lg font-bold text-abha-green">
                  📊 {canEdit ? "تسجيل النتائج" : "النتائج المحققة"}
                </h2>
              </div>

              <div className="space-y-3">
                {selectedComp.plannedRaces.map((race) => {
                  const result = selectedComp.results.find((r) => r.event === race);
                  return (
                    <div key={race} className="bg-abha-bg p-3 rounded-lg">
                      <p className="text-sm font-bold mb-2">🏅 {race}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">المركز</label>
                          <input
                            type="number"
                            value={result?.position || ""}
                            onChange={(e) => updateResult(race, "position", Number(e.target.value))}
                            className="input text-sm"
                            disabled={!canEdit}
                            min={1}
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">الميدالية</label>
                          <select
                            value={result?.medal || "none"}
                            onChange={(e) => updateResult(race, "medal", e.target.value)}
                            className="input text-sm"
                            disabled={!canEdit}
                          >
                            <option value="none">بدون</option>
                            <option value="gold">🥇 ذهبية</option>
                            <option value="silver">🥈 فضية</option>
                            <option value="bronze">🥉 برونزية</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">النقاط</label>
                          <input
                            type="number"
                            value={result?.points || ""}
                            onChange={(e) => updateResult(race, "points", Number(e.target.value))}
                            className="input text-sm"
                            disabled={!canEdit}
                            min={0}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-0.5">الزمن</label>
                          <input
                            type="text"
                            value={result?.time || ""}
                            onChange={(e) => updateResult(race, "time", e.target.value)}
                            className="input text-sm"
                            dir="ltr"
                            disabled={!canEdit}
                            placeholder="32.45"
                          />
                        </div>
                      </div>
                      {/* عرض الميدالية بجانب السباق */}
                      {!canEdit && result?.medal !== "none" && result?.medal && (
                        <p className="text-xs mt-1 text-abha-gold font-semibold">
                          {getMedalEmoji(result.medal)} {result.position ? `المركز ${result.position}` : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {canEdit && (
                <button
                  onClick={() => saveSwimmer(selectedSwimmer!)}
                  disabled={saving}
                  className="btn-primary mt-4 text-sm w-full disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "💾 حفظ النتائج"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}