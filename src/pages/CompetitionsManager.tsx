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
  const [selectedSwimmer, setSelectedSwimmer] = useState<Swimmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [newCompName, setNewCompName] = useState("");
  const [newCompDate, setNewCompDate] = useState("");

  // تحميل السباحين (مع الفلترة حسب الدور)
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
      if (items.length > 0 && !selectedSwimmer) {
        setSelectedSwimmer(items[0]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user, selectedSwimmer]);

  const canEdit = user?.role === "coach";

  // تحديث السباح المحدد إذا تغيرت البيانات
  useEffect(() => {
    if (selectedSwimmer) {
      const fresh = swimmers.find((s) => s.id === selectedSwimmer.id);
      if (fresh && JSON.stringify(fresh.competitions) !== JSON.stringify(selectedSwimmer.competitions)) {
        setSelectedSwimmer(fresh);
      }
    }
  }, [swimmers, selectedSwimmer]);

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
    setSelectedSwimmer(updated);
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
    setNewCompName("");
    setNewCompDate("");
  };

  const toggleRace = (compIdx: number, race: string) => {
    if (!selectedSwimmer) return;
    const comps = [...(selectedSwimmer.competitions || [])];
    const comp = comps[compIdx];
    const planned = [...comp.plannedRaces];
    if (planned.includes(race)) {
      comp.plannedRaces = planned.filter((r) => r !== race);
      comp.results = comp.results.filter((r) => r.event !== race);
    } else {
      comp.plannedRaces = [...planned, race];
    }
    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSelectedSwimmer(updated);
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
  };

  const updateResult = (
    compIdx: number,
    race: string,
    field: keyof SwimResult,
    value: string | number
  ) => {
    if (!selectedSwimmer) return;
    const comps = [...(selectedSwimmer.competitions || [])];
    const comp = comps[compIdx];
    const resultIdx = comp.results.findIndex((r) => r.event === race);

    if (resultIdx >= 0) {
      comp.results[resultIdx] = { ...comp.results[resultIdx], [field]: value };
    } else {
      comp.results.push({
        event: race,
        position: field === "position" ? Number(value) : 0,
        medal: field === "medal" ? (value as "gold" | "silver" | "bronze" | "none") : "none",
        points: field === "points" ? Number(value) : 0,
        time: field === "time" ? String(value) : "",
      });
    }

    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSelectedSwimmer(updated);
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteCompetition = (compIdx: number) => {
    if (!selectedSwimmer) return;
    if (!confirm("حذف البطولة ؟")) return;
    const comps = (selectedSwimmer.competitions || []).filter((_, i) => i !== compIdx);
    const updated: Swimmer = { ...selectedSwimmer, competitions: comps };
    setSelectedSwimmer(updated);
    setSwimmers(swimmers.map((s) => (s.id === updated.id ? updated : s)));
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

      {msg.text && (
        <div className={`text-sm rounded-lg p-3 mb-4 ${
          msg.type === "success"
            ? "bg-green-50 border border-green-200 text-green-700"
            : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      {swimmers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا يوجد سباحون</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* قائمة السباحين */}
          <div className="card lg:col-span-1">
            <h2 className="font-bold text-abha-green mb-3">👥 اختر السباح</h2>
            <div className="space-y-1">
              {swimmers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSwimmer(s)}
                  className={`w-full text-right p-2 rounded-lg text-sm transition ${
                    selectedSwimmer?.id === s.id
                      ? "bg-abha-green text-white font-semibold"
                      : "hover:bg-abha-bg"
                  }`}
                >
                  <div>{s.name}</div>
                  <div className={`text-xs ${selectedSwimmer?.id === s.id ? "text-white/80" : "text-gray-500"}`}>
                    {s.ageCategory}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* محتوى السباح المحدد */}
          <div className="lg:col-span-3">
            {selectedSwimmer && (
              <>
                <div className="card mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-abha-green">
                      🏊 {selectedSwimmer.name} — {selectedSwimmer.ageCategory}
                    </h2>
                    {canEdit && (
                      <button
                        onClick={() => saveSwimmer(selectedSwimmer)}
                        disabled={saving}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        {saving ? "جاري الحفظ..." : "💾 حفظ"}
                      </button>
                    )}
                  </div>
                </div>

                {/* إضافة بطولة */}
                {canEdit && (
                  <div className="card mb-4">
                    <h3 className="font-bold text-abha-green mb-2">➕ إضافة بطولة جديدة</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        className="input text-sm sm:col-span-2"
                        placeholder="اسم البطولة"
                      />
                      <input
                        type="date"
                        value={newCompDate}
                        onChange={(e) => setNewCompDate(e.target.value)}
                        className="input text-sm"
                        dir="ltr"
                      />
                    </div>
                    <button onClick={addCompetition} className="btn-gold text-sm">
                      ➕ إضافة
                    </button>
                  </div>
                )}

                {/* البطولات */}
                {(selectedSwimmer.competitions || []).length === 0 ? (
                  <div className="card text-center py-6">
                    <p className="text-gray-500">لا توجد بطولات مسجّلة لهذا السباح</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSwimmer.competitions!.map((comp, cIdx) => (
                      <div key={comp.id} className="card">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-abha-green">{comp.name}</h3>
                            {comp.date && <p className="text-xs text-gray-500" dir="ltr">📅 {comp.date}</p>}
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => deleteCompetition(cIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              🗑️
                            </button>
                          )}
                        </div>

                        {/* السباقات المخططة */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🏊 السباقات المخططة :</p>
                          {canEdit ? (
                            <div className="flex flex-wrap gap-1">
                              {allRaces.map((race) => (
                                <button
                                  key={race}
                                  type="button"
                                  onClick={() => toggleRace(cIdx, race)}
                                  className={`px-2 py-1 rounded text-xs ${
                                    comp.plannedRaces.includes(race)
                                      ? "bg-abha-green text-white"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {comp.plannedRaces.includes(race) ? "✓ " : ""}{race}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {comp.plannedRaces.map((r) => (
                                <span key={r} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* النتائج */}
                        {comp.plannedRaces.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-semibold text-gray-600 mb-2">📊 النتائج :</p>
                            <div className="space-y-2">
                              {comp.plannedRaces.map((race) => {
                                const result = comp.results.find((r) => r.event === race);
                                return (
                                  <div key={race} className="bg-abha-bg p-2 rounded">
                                    <p className="text-sm font-semibold mb-1">🏅 {race}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-0.5">المركز</label>
                                        <input
                                          type="number"
                                          value={result?.position || ""}
                                          onChange={(e) => updateResult(cIdx, race, "position", Number(e.target.value))}
                                          className="input text-xs"
                                          disabled={!canEdit}
                                          min={1}
                                          placeholder="1"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-0.5">الميدالية</label>
                                        <select
                                          value={result?.medal || "none"}
                                          onChange={(e) => updateResult(cIdx, race, "medal", e.target.value)}
                                          className="input text-xs"
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
                                          onChange={(e) => updateResult(cIdx, race, "points", Number(e.target.value))}
                                          className="input text-xs"
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
                                          onChange={(e) => updateResult(cIdx, race, "time", e.target.value)}
                                          className="input text-xs"
                                          dir="ltr"
                                          disabled={!canEdit}
                                          placeholder="32.45"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}