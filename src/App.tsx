import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Parents from "./pages/Parents";
import Messages from "./pages/Messages";
import Reports from "./pages/Reports";
import Swimmers from "./pages/Swimmers";
import News from "./pages/News";
import Trainings from "./pages/Trainings";
import Times from "./pages/Times";
import Competitions from "./pages/Competitions";
import SwimmerDetails from "./pages/SwimmerDetails";
import Qualifying from "./pages/Qualifying";
import Meetings from "./pages/Meetings";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Guide from "./pages/Guide";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-abha-bg">
        <div className="text-abha-green text-lg font-semibold">جاري التحميل...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/parents" element={<ProtectedRoute><Parents /></ProtectedRoute>} />
     <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} /> 
     <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/swimmers" element={<ProtectedRoute><Swimmers /></ProtectedRoute>} />
      <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
      <Route path="/trainings" element={<ProtectedRoute><Trainings /></ProtectedRoute>} />
      <Route path="/times" element={<ProtectedRoute><Times /></ProtectedRoute>} />
      <Route path="/competitions" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
      <Route path="/swimmers/:id" element={<ProtectedRoute><SwimmerDetails /></ProtectedRoute>} />
      <Route path="/qualifying" element={<ProtectedRoute><Qualifying /></ProtectedRoute>} />
      <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}