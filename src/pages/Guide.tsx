import Layout from "../components/Layout";

export default function Guide() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">📖 دليل الاستخدام</h1>

      <div className="space-y-4">
        {/* إضافة مدرب */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">👨‍🏫 1. إضافة مدرب جديد</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"المدربون"</strong> في القائمة الجانبية.</li>
            <li>اضغط <strong>"➕ إضافة مدرب"</strong>.</li>
            <li>أدخل الاسم، اسم المستخدم، وكلمة المرور.</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
            <li>سيظهر المدرب في Firebase Auth تلقائياً (أو يحتاج تفعيل يدوي).</li>
          </ol>
        </div>

        {/* إضافة سباح */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">🏊 2. إضافة سباح جديد</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"السباحون"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة سباح"</strong>.</li>
            <li>أدخل الاسم، الفئة العمرية، الفريق، النقاط.</li>
            <li>اختر المدرب المسؤول.</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
          </ol>
        </div>

        {/* إضافة ولي أمر */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">👨‍👦 3. إضافة ولي أمر وربطه بسباح</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"أولياء الأمور"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة ولي أمر"</strong>.</li>
            <li>أدخل الاسم، اسم المستخدم، كلمة المرور.</li>
            <li><strong>اختر السباح</strong> من القائمة المنسدلة.</li>
            <li>اضغط <strong>"حفظ وربط"</strong>.</li>
            <li>⚠️ إذا ظهر <strong>"يحتاج تفعيل"</strong>، أخبر المطور لتشغيل سكربت التفعيل.</li>
          </ol>
        </div>

        {/* إضافة تمرين */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">📅 4. إضافة تمرين في الجدول</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"جدول التمارين"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة تمرين"</strong>.</li>
            <li>اختر اليوم، الوقت، المكان، الفئات العمرية.</li>
            <li>أضف محتوى الحصة (اختياري).</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
          </ol>
        </div>

        {/* نشر مستجدات */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">📢 5. نشر خبر أو تعميم</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"المستجدات"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة خبر"</strong>.</li>
            <li>أدخل العنوان والنص.</li>
            <li>اضغط <strong>"نشر"</strong>.</li>
            <li>سيراه جميع المدربين وأولياء الأمور.</li>
          </ol>
        </div>

        {/* إضافة بطولة */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">🏆 6. إضافة بطولة</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"البطولات"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة بطولة"</strong>.</li>
            <li>أدخل اسم البطولة، التاريخ، المكان، الفئات.</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
          </ol>
        </div>

        {/* الأرقام التأهيلية */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">🎯 7. إضافة أرقام تأهيلية</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"الأرقام التأهيلية"</strong>.</li>
            <li>اضغط <strong>"➕ إضافة رقم تأهيلي"</strong>.</li>
            <li>أدخل اسم البطولة، الفئة، نوع السباق، الزمن المطلوب.</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
          </ol>
        </div>

        {/* تقارير */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">📊 8. كتابة تقرير شهري (للمدرب)</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"التقارير"</strong>.</li>
            <li>اضغط <strong>"➕ تقرير جديد"</strong>.</li>
            <li>اختر السباح، الشهر، التقييم العام.</li>
            <li>أدخل الملاحظات والإنجازات.</li>
            <li>اضغط <strong>"حفظ"</strong>.</li>
            <li>سيراه أبو ناصر وولي الأمر.</li>
          </ol>
        </div>

        {/* التواصل */}
        <div className="card">
          <h2 className="text-lg font-bold text-abha-green mb-2">💬 9. التواصل مع الآخرين</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>اذهب إلى <strong>"التواصل"</strong>.</li>
            <li>اختر شخصاً من القائمة.</li>
            <li>اكتب رسالتك واضغط <strong>📤</strong>.</li>
            <li>ستصله رسالة مع إشعار.</li>
          </ol>
        </div>

        {/* تفعيل الحسابات */}
        <div className="card bg-yellow-50 border-yellow-200">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">⚠️ 10. تفعيل الحسابات (للمطور)</h2>
          <p className="text-sm text-yellow-800">
            بعد إضافة أولياء أمور جدد، شغّل هذا الأمر من جهازك:
          </p>
          <pre className="bg-white p-2 rounded mt-2 text-xs font-mono" dir="ltr">
            node seed.cjs
          </pre>
          <p className="text-sm text-yellow-800 mt-2">
            سيُفعّل جميع الحسابات المعلقة في Firebase Auth تلقائياً.
          </p>
        </div>
      </div>
    </Layout>
  );
}