import { createContext, useContext, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("kwality_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [profile, setProfile] = useState(() => {
    const stored = localStorage.getItem("kwality_profile");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { username, password });
      const { access_token, user: loggedInUser, profile: loggedInProfile } = res.data;
      localStorage.setItem("kwality_token", access_token);
      localStorage.setItem("kwality_user", JSON.stringify(loggedInUser));
      localStorage.setItem("kwality_profile", JSON.stringify(loggedInProfile || null));
      setUser(loggedInUser);
      setProfile(loggedInProfile || null);
      return loggedInUser;
    } catch (err) {
      const message = err.response?.data?.error || "Login failed. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("kwality_token");
    localStorage.removeItem("kwality_user");
    localStorage.removeItem("kwality_profile");
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
