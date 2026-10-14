
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://studenttaskmanager-deployment.onrender.com/api/tasks";

const emptyForm = {
  title: "",
  description: "",
  dueDate: "",
  status: "PENDING",
};

function formatDate(date) {
  if (!date) return "No due date";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Could not load tasks.");
      const data = await response.json();
      setTasks(data);
    } catch {
      setError(
        "Unable to connect to the backend. Make sure Spring Boot is running on port 8080."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const counts = useMemo(
    () => ({
      ALL: tasks.length,
      PENDING: tasks.filter((task) => task.status !== "COMPLETED").length,
      COMPLETED: tasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "PENDING" && task.status !== "COMPLETED") ||
        task.status === filter;

      const text = `${task.title} ${task.description || ""}`.toLowerCase();
      return matchesFilter && text.includes(search.toLowerCase());
    });
  }, [tasks, filter, search]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || null,
      status: form.status,
    };

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Unable to save task.");
      }

      await loadTasks();
      setMessage(editingId ? "Task updated successfully!" : "Task added successfully!");
      resetForm();
    } catch (err) {
      setError(err.message || "Unable to save task. Check the backend.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate || "",
      status: task.status || "PENDING",
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleComplete(task) {
    setError("");
    setMessage("");

    const newStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";

    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      });

      if (!response.ok) throw new Error("Could not update task status.");

      await loadTasks();
      setMessage(
        newStatus === "COMPLETED"
          ? "Task marked as completed!"
          : "Task moved back to pending."
      );
    } catch (err) {
      setError(err.message || "Could not update task status.");
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Could not delete task.");

      if (editingId === task.id) resetForm();
      await loadTasks();
      setMessage("Task deleted successfully.");
    } catch (err) {
      setError(err.message || "Could not delete task.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">✓</span>
          <span>TaskFlow</span>
        </a>
        <span className="topbar-label">STUDENT TASK MANAGER</span>
      </header>

      <main className="main-content" id="home">
        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
            <h1>Make today count.</h1>
            <p className="welcome-subtitle">
              Organize your assignments, stay focused, and get things done.
            </p>
          </div>
          <div className="welcome-mark" aria-hidden="true">✦</div>
        </section>

        <section className="stats-grid" aria-label="Task statistics">
          <div className="stat-card">
            <span className="stat-icon purple">▤</span>
            <div>
              <p>Total tasks</p>
              <strong>{counts.ALL}</strong>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon orange">◷</span>
            <div>
              <p>To do</p>
              <strong>{counts.PENDING}</strong>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon green">✓</span>
            <div>
              <p>Completed</p>
              <strong>{counts.COMPLETED}</strong>
            </div>
          </div>
        </section>

        {error && <div className="notice error-notice" role="alert">{error}</div>}
        {message && <div className="notice success-notice" role="status">{message}</div>}

        <section className="workspace">
          <div className="form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{editingId ? "UPDATE TASK" : "GET STARTED"}</p>
                <h2>{editingId ? "Edit task" : "Create a task"}</h2>
              </div>
              <span className="heading-symbol">{editingId ? "✎" : "+"}</span>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="title">Task title <span>*</span></label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Complete Java assignment"
                maxLength={150}
                required
              />

              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Add a few details about this task..."
                rows={4}
                maxLength={500}
              />

              <div className="form-row">
                <div>
                  <label htmlFor="dueDate">Due date</label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="PENDING">To do</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes →" : "+ Add task"}
              </button>

              {editingId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
            </form>
          </div>

          <div className="tasks-panel">
            <div className="panel-heading tasks-heading">
              <div>
                <p className="eyebrow">YOUR WORK</p>
                <h2>My tasks <span className="task-count">{filteredTasks.length}</span></h2>
              </div>
            </div>

            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search tasks"
                placeholder="Search your tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="filter-tabs" aria-label="Filter tasks">
              {[
                ["ALL", "All"],
                ["PENDING", "To do"],
                ["COMPLETED", "Completed"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`filter-tab ${filter === value ? "active" : ""}`}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                  <span>{counts[value]}</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty-state">
                <div className="empty-icon">◌</div>
                <h3>Loading tasks...</h3>
                <p>Getting your tasks from the database.</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{search ? "⌕" : "✓"}</div>
                <h3>{search ? "No matching tasks" : "Nothing on your list yet"}</h3>
                <p>
                  {search
                    ? "Try another search term."
                    : "Add your first task using the form to get started."}
                </p>
              </div>
            ) : (
              <div className="task-list">
                {filteredTasks.map((task) => (
                  <article
                    className={`task-card ${task.status === "COMPLETED" ? "is-completed" : ""}`}
                    key={task.id}
                  >
                    <button
                      className={`completion-check ${task.status === "COMPLETED" ? "checked" : ""}`}
                      onClick={() => toggleComplete(task)}
                      title={task.status === "COMPLETED" ? "Mark as to do" : "Mark as completed"}
                      aria-label={task.status === "COMPLETED" ? "Mark as to do" : "Mark as completed"}
                      type="button"
                    >
                      {task.status === "COMPLETED" ? "✓" : ""}
                    </button>

                    <div className="task-details">
                      <h3>{task.title}</h3>
                      {task.description && <p>{task.description}</p>}
                      <div className="task-meta">
                        <span className="due-date">◷ {formatDate(task.dueDate)}</span>
                        <span className={`status-badge ${task.status === "COMPLETED" ? "completed" : "pending"}`}>
                          {task.status === "COMPLETED" ? "Completed" : "To do"}
                        </span>
                      </div>
                    </div>

                    <div className="task-actions">
                      <button type="button" onClick={() => startEdit(task)} aria-label={`Edit ${task.title}`} title="Edit">✎</button>
                      <button type="button" className="delete-action" onClick={() => deleteTask(task)} aria-label={`Delete ${task.title}`} title="Delete">⌫</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <span>TaskFlow · Student Task Manager</span>
          <span>One task at a time. Keep going ✦</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
