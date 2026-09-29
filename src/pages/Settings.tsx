import Layout from "../components/Layout";

export default function Settings() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-abha-green mb-6">⚙️ الإعدادات</h1>
      <div className="card text-center py-12">
        <p className="text-gray-500">قريباً — تغيير اسم المستخدم وكلمة المرور</p>
      </div>
    </Layout>
  );
}