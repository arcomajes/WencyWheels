import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Vehicles from "./pages/Vehicles";
import Rent from "./pages/Rent";
import History from "./pages/History";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import { Toaster } from "./components/ui/sonner-toast";

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/admin/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
            <Route path="/admin/rent-a-car" element={<ProtectedRoute><Rent /></ProtectedRoute>} />
            <Route path="/admin/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;