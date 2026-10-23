import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(usernameOrEmail, password);
      navigate("/");
    } catch (err: unknown) {
      console.error(err);
      const error = err as { code?: string; message?: string };

      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      } else if (error.code === "auth/user-not-found") {
        setError("المستخدم غير موجود");
      } else if (error.message) {
        setError(error.message);
      } else {
        setError("خطأ في تسجيل الدخول");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-abha-green to-abha-greenLight p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        {/* الشعار والعنوان */}
        <div className="text-center mb-6">
          <img
            src="/images/logo.png"
            alt="شعار أبها"
            className="w-24 h-24 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-abha-green">
            منصة نادي أبها للسباحة
          </h1>
          <p className="text-gray-500 text-sm mt-2">تسجيل الدخول</p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="input"
              placeholder="abu_nasser"
              required
              dir="ltr"
              autoComplete="username"
            />
            <p className="text-xs text-gray-400 mt-1">
              مثال : abu_nasser (بدون @)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              dir="ltr"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "جاري تسجيل الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 نادي أبها للسباحة
        </p>
      </div>
    </div>
  );
}