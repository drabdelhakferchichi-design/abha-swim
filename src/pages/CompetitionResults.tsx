import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { db } from "../lib/firebase";
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
  team: string;
  coachName: string;
  competitions?: Competition[];
}

interface CompetitionSummary {
  compName: string;
  date: string;
  swimmers: {
    swimmerName: string;
    team: string;
    coachName: string;
    gold: number;
    silver: number;
    bronze: number;
    totalMedals: number;
    points: number;
  }[];
  teamTotals: Record<string, { gold: number; silver: number; bronze: number; totalMedals: number; points: number; swimmersCount: number }>;
}

export default function CompetitionResults() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [selectedComp, setSelectedComp] = useState("all");
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "swimmers"), (snap) => {
      const items: Swimmer[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          ageCategory: data.ageCategory || "",
          team: data.team || "غير محدد",
          coachName: data.coachName || "غير محدد",
          competitions: data.competitions || [],
        };
      });
      setSwimmers(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const allComps = Array.from(
    new Set(
      swimmers.flatMap((s) => (s.competitions || []).map((c) => c.name))
    )
  ).sort();

  const summaries: CompetitionSummary[] = allComps
    .filter((name) => selectedComp === "all" || name === selectedComp)
    .map((compName) => {
      const compDate = swimmers
        .flatMap((s) => s.competitions || [])
        .find((c) => c.name === compName)?.date || "";

      const swimmersInComp = swimmers
        .filter((s) => (s.competitions || []).some((c) => c.name === compName))
        .map((s) => {
          const comp = s.competitions!.find((c) => c.name === compName);
          const gold = comp?.results.filter((r) => r.medal === "gold").length || 0;
          const silver = comp?.results.filter((r) => r.medal === "silver").length || 0;
          const bronze = comp?.results.filter((r) => r.medal === "bronze").length || 0;
          const totalMedals = gold + silver + bronze;
          const points = comp?.results.reduce((sum, r) => sum + (r.points || 0), 0) || 0;

          return {
            swimmerName: s.name,
            team: s.team,
            coachName: s.coachName,
            gold,
            silver,
            bronze,
            totalMedals,
            points,
          };
        })
        .filter((s) => s.totalMedals > 0 || s.points > 0);

      const teamTotals: Record<string, { gold: number; silver: number; bronze: number; totalMedals: number; points: number; swimmersCount: number }> = {};
      swimmersInComp.forEach((s) => {
        if (!teamTotals[s.team]) {
          teamTotals[s.team] = { gold: 0, silver: 0, bronze: 0, totalMedals: 0, points: 0, swimmersCount: 0 };
        }
        teamTotals[s.team].gold += s.gold;
        teamTotals[s.team].silver += s.silver;
        teamTotals[s.team].bronze += s.bronze;
        teamTotals[s.team].totalMedals += s.totalMedals;
        teamTotals[s.team].points += s.points;
        teamTotals[s.team].swimmersCount += 1;
      });

      return { compName, date: compDate, swimmers: swimmersInComp, teamTotals };
    })
    .filter((s) => s.swimmers.length > 0);

  const grandTotals = summaries.reduce(
    (acc, sum) => {
      acc.gold += sum.swimmers.reduce((s, sw) => s + sw.gold, 0);
      acc.silver += sum.swimmers.reduce((s, sw) => s + sw.silver, 0);
      acc.bronze += sum.swimmers.reduce((s, sw) => s + sw.bronze, 0);
      acc.points += sum.swimmers.reduce((s, sw) => s + sw.points, 0);
      return acc;
    },
    { gold: 0, silver: 0, bronze: 0, points: 0 }
  );

  const exportPDF = async (sum: CompetitionSummary) => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`تقرير-${sum.compName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("خطأ في تصدير PDF");
    }
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
      <h1 className="text-2xl font-bold text-abha-green mb-6">🏆 النتائج العامة للبطولات</h1>

      <div className="card mb-6">
        <label className="block text-sm font-semibold mb-2">اختر البطولة :</label>
        <select value={selectedComp} onChange={(e) => setSelectedComp(e.target.value)} className="input">
          <option value="all">كل البطولات</option>
          {allComps.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl mb-1">🥇</div>
          <div className="text-2xl font-bold text-abha-gold">{grandTotals.gold}</div>
          <div className="text-xs text-gray-500">ذهبية</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🥈</div>
          <div className="text-2xl font-bold text-gray-400">{grandTotals.silver}</div>
          <div className="text-xs text-gray-500">فضية</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">🥉</div>
          <div className="text-2xl font-bold text-orange-600">{grandTotals.bronze}</div>
          <div className="text-xs text-gray-500">برونزية</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-blue-600">{grandTotals.points}</div>
          <div className="text-xs text-gray-500">النقاط</div>
        </div>
      </div>

      {summaries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">لا توجد نتائج مسجّلة بعد</p>
        </div>
      ) : (
        summaries.map((sum) => (
          <div key={sum.compName} className="card mb-6">
            <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
              <div>
                <h2 className="text-xl font-bold text-abha-green">🏆 {sum.compName}</h2>
                {sum.date && <p className="text-xs text-gray-500">📅 {sum.date}</p>}
              </div>
              <button
                onClick={() => exportPDF(sum)}
                className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600"
              >
                📄 تحميل تقرير PDF
              </button>
            </div>

            <div ref={reportRef} style={{ backgroundColor: "#fff", padding: "15px", direction: "rtl" }}>
              <div style={{ textAlign: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "3px solid #1B5E20" }}>
                <img src="/images/logo.png" alt="نادي أبها" style={{ width: "70px", height: "70px", margin: "0 auto", display: "block" }} />
                <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1B5E20", margin: "8px 0 4px 0" }}>نادي أبها للسباحة</h1>
                <h2 style={{ fontSize: "14px", color: "#C9A227", margin: 0 }}>تقرير النتائج العامة</h2>
              </div>

              <div style={{ textAlign: "center", background: "#F5F7FA", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1B5E20" }}>{sum.compName}</div>
                {sum.date && <div style={{ fontSize: "12px", color: "#666" }}>📅 {sum.date}</div>}
              </div>

              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#1B5E20", marginBottom: "8px" }}>🏅 ملخص حسب النادي</h3>
              <div style={{ overflowX: "auto", marginBottom: "15px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#1B5E20", color: "white" }}>
                      <th style={{ padding: "8px", textAlign: "right", border: "1px solid #ddd" }}>النادي</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>عدد السباحين</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>🥇</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>🥈</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>🥉</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>المجموع</th>
                      <th style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>⭐ النقاط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sum.teamTotals)
                      .sort(([, a], [, b]) => b.points - a.points)
                      .map(([team, totals]) => (
                      <tr key={team}>
                        <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", color: "#1B5E20" }}>{team}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd" }}>{totals.swimmersCount}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", color: "#C9A227" }}>{totals.gold}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", color: "#666" }}>{totals.silver}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", color: "#E65100" }}>{totals.bronze}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{totals.totalMedals}</td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", color: "#0288D1" }}>{totals.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ fontSize: "15px", fontWeight: "bold", color: "#1B5E20", marginBottom: "8px" }}>📊 التفاصيل الكاملة</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#C9A227", color: "white" }}>
                      <th style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>النادي</th>
                      <th style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>السباح</th>
                      <th style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>المدرب</th>
                      <th style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>🥇</th>
                      <th style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>🥈</th>
                      <th style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>🥉</th>
                      <th style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>المجموع</th>
                      <th style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>⭐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sum.swimmers
                      .sort((a, b) => b.points - a.points)
                      .map((sw) => (
                      <tr key={`${sw.team}-${sw.swimmerName}`}>
                        <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold", color: "#1B5E20" }}>{sw.team}</td>
                        <td style={{ padding: "6px", border: "1px solid #ddd" }}>{sw.swimmerName}</td>
                        <td style={{ padding: "6px", border: "1px solid #ddd", color: "#666" }}>{sw.coachName}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", color: "#C9A227" }}>{sw.gold}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd", color: "#666" }}>{sw.silver}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd", color: "#E65100" }}>{sw.bronze}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{sw.totalMedals}</td>
                        <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold", color: "#0288D1" }}>{sw.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "20px", paddingTop: "10px", borderTop: "2px solid #1B5E20", textAlign: "center", fontSize: "10px", color: "#999" }}>
                نادي أبها للسباحة — تم الإنشاء في {new Date().toLocaleString("ar-SA")}
              </div>
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}