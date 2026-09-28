import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-abha-green to-abha-greenLight p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* اللوغو والعنوان */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-abha-green rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">أ</span>
          </div>
          <h1 className="text-2xl font-bold text-abha-green">
            منصة نادي أبها للسباحة
          </h1>
          <p className="text-gray-500 text-sm mt-2">تسجيل الدخول</p>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="example@abha-swim.com"
              required
              dir="ltr"
            />
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