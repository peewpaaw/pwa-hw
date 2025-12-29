import { Navigate, Route, Routes } from "react-router-dom";
import { CircularProgress, Box } from "@mui/material";
import { AuthProvider, useAuth } from "./state/auth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

function AuthedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <LoginPage />} />
      <Route path="/app" element={user ? <DashboardPage /> : <Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to={user ? "/app" : "/"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthedApp />
    </AuthProvider>
  );
}
