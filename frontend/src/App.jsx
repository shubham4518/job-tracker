import { useEffect, useState } from "react";
import { api, getToken, clearToken } from "./api.js";
import Auth from "./components/Auth.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.me().then(setUser).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("jt-logout", onLogout);
    return () => window.removeEventListener("jt-logout", onLogout);
  }, []);

  const logout = () => {
    clearToken();
    setUser(null);
  };

  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Auth onAuthed={setUser} />;
  return <Dashboard user={user} onLogout={logout} />;
}
