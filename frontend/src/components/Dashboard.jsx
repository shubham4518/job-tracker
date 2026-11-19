import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import Stats from "./Stats.jsx";
import ApplicationForm from "./ApplicationForm.jsx";

export const STATUSES = [
  { key: "wishlist", label: "Wishlist" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
];

export default function Dashboard({ user, onLogout }) {
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | application
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([api.list({ q: search }), api.stats()]);
      setApps(a);
      setStats(s);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  async function save(data) {
    if (editing === "new") await api.create(data);
    else await api.update(editing.id, data);
    setEditing(null);
    load();
  }

  async function move(app, status) {
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a))); // optimistic
    try {
      await api.update(app.id, { status });
      load();
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  async function remove(app) {
    if (!confirm(`Delete ${app.role} at ${app.company}?`)) return;
    await api.remove(app.id);
    setEditing(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="app">
      <header>
        <h1>Job Tracker</h1>
        <div className="header-right">
          <span className="muted">{user.email}</span>
          <button onClick={onLogout}>Log out</button>
        </div>
      </header>

      <Stats stats={stats} />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search company or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="primary" onClick={() => setEditing("new")}>
          + Add application
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="board">
        {STATUSES.map((col) => {
          const items = apps.filter((a) => a.status === col.key);
          return (
            <section
              key={col.key}
              className={`column col-${col.key}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = Number(e.dataTransfer.getData("text/plain"));
                const app = apps.find((a) => a.id === id);
                if (app && app.status !== col.key) move(app, col.key);
              }}
            >
              <h2>
                {col.label} <span className="count">{items.length}</span>
              </h2>
              {items.map((a) => (
                <article
                  key={a.id}
                  className="app-card"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                  onClick={() => setEditing(a)}
                >
                  <strong>{a.company}</strong>
                  <span>{a.role}</span>
                  {a.follow_up && (
                    <small className={a.follow_up <= today ? "due" : "muted"}>
                      Follow up: {a.follow_up}
                    </small>
                  )}
                </article>
              ))}
              {items.length === 0 && <p className="empty muted">Nothing here yet</p>}
            </section>
          );
        })}
      </div>

      {editing && (
        <ApplicationForm
          initial={editing === "new" ? null : editing}
          onSave={save}
          onDelete={editing === "new" ? null : () => remove(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
