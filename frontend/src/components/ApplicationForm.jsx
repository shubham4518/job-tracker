import { useState } from "react";

const STATUS_OPTIONS = ["wishlist", "applied", "interview", "offer", "rejected"];

export default function ApplicationForm({ initial, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    status: initial?.status ?? "wishlist",
    link: initial?.link ?? "",
    notes: initial?.notes ?? "",
    follow_up: initial?.follow_up ?? "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...form,
        link: form.link || null,
        notes: form.notes || null,
        follow_up: form.follow_up || null,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card modal" onSubmit={submit}>
        <h2>{initial ? "Edit application" : "New application"}</h2>
        <div className="row">
          <label>
            Company
            <input value={form.company} onChange={set("company")} required autoFocus />
          </label>
          <label>
            Role
            <input value={form.role} onChange={set("role")} required />
          </label>
        </div>
        <div className="row">
          <label>
            Status
            <select value={form.status} onChange={set("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Follow-up date
            <input type="date" value={form.follow_up} onChange={set("follow_up")} />
          </label>
        </div>
        <label>
          Job link
          <input type="url" placeholder="https://…" value={form.link} onChange={set("link")} />
        </label>
        <label>
          Notes
          <textarea rows={4} value={form.notes} onChange={set("notes")} />
        </label>
        {form.link && (
          <a href={form.link} target="_blank" rel="noreferrer" className="muted">
            Open job posting ↗
          </a>
        )}
        {error && <div className="error">{error}</div>}
        <div className="actions">
          {onDelete && (
            <button type="button" className="danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
