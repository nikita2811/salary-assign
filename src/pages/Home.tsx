
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listEmployees, deleteEmployee, type Employee, type ApiError } from "../api/employeeapi";
import "../css/Home.css";

// ── Metric helpers ────────────────────────────────────────────────────────────

function toNum(s: string) { return parseFloat(s) || 0; }
function fmt(n: number) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
}

type SalaryRow = { label: string; min: number; max: number; avg: number; count: number };

function buildRows(employees: Employee[], keyFn: (e: Employee) => string): SalaryRow[] {
    const map = new Map<string, number[]>();
    for (const e of employees) {
        const k = keyFn(e) || "—";
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(toNum(e.salary));
    }
    return Array.from(map.entries())
        .map(([label, salaries]) => ({
            label,
            min: Math.min(...salaries),
            max: Math.max(...salaries),
            avg: salaries.reduce((a, b) => a + b, 0) / salaries.length,
            count: salaries.length,
        }))
        .sort((a, b) => b.avg - a.avg);
}

function expBand(exp: string): string {
    const y = parseFloat(exp);
    if (isNaN(y)) return "Unknown";
    if (y < 1) return "< 1 yr";
    if (y < 3) return "1–2 yrs";
    if (y < 6) return "3–5 yrs";
    if (y < 10) return "6–9 yrs";
    return "10+ yrs";
}

const EXP_ORDER = ["< 1 yr", "1–2 yrs", "3–5 yrs", "6–9 yrs", "10+ yrs", "Unknown"];

// ── Sub-components ────────────────────────────────────────────────────────────

const MetricBar: React.FC<{ rows: SalaryRow[]; maxVal: number }> = ({ rows, maxVal }) => (
    <div className="db-metric-rows">
        {rows.map((r) => (
            <div key={r.label} className="db-metric-row">
                <div className="db-metric-label-wrap">
                    <span className="db-metric-label">{r.label}</span>
                    <span className="db-metric-count">{r.count} emp</span>
                </div>
                <div className="db-bar-track">
                    <div className="db-bar-min" style={{ width: `${(r.min / maxVal) * 100}%` }} title={`Min: ${fmt(r.min)}`} />
                    <div className="db-bar-avg" style={{ width: `${(r.avg / maxVal) * 100}%` }} title={`Avg: ${fmt(r.avg)}`} />
                    <div className="db-bar-max" style={{ width: `${(r.max / maxVal) * 100}%` }} title={`Max: ${fmt(r.max)}`} />
                </div>
                <div className="db-metric-vals">
                    <span className="db-val-min">{fmt(r.min)}</span>
                    <span className="db-val-avg">{fmt(r.avg)}</span>
                    <span className="db-val-max">{fmt(r.max)}</span>
                </div>
            </div>
        ))}
        <div className="db-legend">
            <span className="db-legend-item db-legend-min">Min</span>
            <span className="db-legend-item db-legend-avg">Avg</span>
            <span className="db-legend-item db-legend-max">Max</span>
        </div>
    </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────

type GroupBy = "country" | "jobTitle" | "both" | "experience" | "department";

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Table state
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [sortKey, setSortKey] = useState<keyof Employee>("firstName");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 8;

    // Metrics state
    const [groupBy, setGroupBy] = useState<GroupBy>("country");
    const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        listEmployees()
            .then((employees) => {
                setEmployees(employees); // ✅ already an array, no .results needed
            })

            .catch((e: ApiError) => setError(e.message ?? "Failed to load employees."))
            .finally(() => setLoading(false));
    }, []);

    // ── Derived filter options ────────────────────────────────────────────────

    const departments = useMemo(() => {
        const s = new Set(employees.map((e) => e.department).filter(Boolean));
        return ["All", ...Array.from(s).sort()];
    }, [employees]);

    const empTypes = useMemo(() => {
        const s = new Set(employees.map((e) => e.employmentType).filter(Boolean));
        return ["All", ...Array.from(s).sort()];
    }, [employees]);

    // ── Filtered + sorted table rows ──────────────────────────────────────────

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return employees.filter((e) => {
            const matchSearch =
                !q ||
                `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
                e.email.toLowerCase().includes(q) ||
                e.jobTitle.toLowerCase().includes(q) ||
                e.department.toLowerCase().includes(q);
            const matchDept = deptFilter === "All" || e.department === deptFilter;
            const matchType = typeFilter === "All" || e.employmentType === typeFilter;
            return matchSearch && matchDept && matchType;
        });
    }, [employees, search, deptFilter, typeFilter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = String(a[sortKey] ?? "");
            const bv = String(b[sortKey] ?? "");
            const cmp = sortKey === "salary" || sortKey === "experience"
                ? toNum(av) - toNum(bv)
                : av.localeCompare(bv);
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleSort = (key: keyof Employee) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
        setPage(1);
    };

    const SortIcon = ({ k }: { k: keyof Employee }) =>
        sortKey === k
            ? <span className="db-sort-icon">{sortDir === "asc" ? "↑" : "↓"}</span>
            : <span className="db-sort-icon db-sort-icon--idle">↕</span>;

    // ── Salary metrics ────────────────────────────────────────────────────────

    const metricRows = useMemo(() => {
        if (!employees.length) return [];
        let rows: SalaryRow[] = [];
        if (groupBy === "country") rows = buildRows(employees, (e) => e.country);
        else if (groupBy === "jobTitle") rows = buildRows(employees, (e) => e.jobTitle);
        else if (groupBy === "both") rows = buildRows(employees, (e) => `${e.country} · ${e.jobTitle}`);
        else if (groupBy === "department") rows = buildRows(employees, (e) => e.department);
        else if (groupBy === "experience") {
            rows = buildRows(employees, (e) => expBand(e.experience));
            rows.sort((a, b) => EXP_ORDER.indexOf(a.label) - EXP_ORDER.indexOf(b.label));
        }
        return rows;
    }, [employees, groupBy]);

    const maxVal = useMemo(() => Math.max(...metricRows.map((r) => r.max), 1), [metricRows]);

    // ── Global stats ──────────────────────────────────────────────────────────

    const allSalaries = employees.map((e) => toNum(e.salary)).filter((n) => n > 0);
    const globalAvg = allSalaries.length ? allSalaries.reduce((a, b) => a + b, 0) / allSalaries.length : 0;
    const globalMax = allSalaries.length ? Math.max(...allSalaries) : 0;
    const globalMin = allSalaries.length ? Math.min(...allSalaries) : 0;

    // ── Delete ────────────────────────────────────────────────────────────────

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteEmployee(deleteTarget.id);
            setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
            showToast(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`);
            setDeleteTarget(null);
        } catch (e) {
            const ae = e as ApiError;
            showToast(ae.message ?? "Delete failed.", "error");
        } finally {
            setDeleteLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return (
        <div className="db-page">
            <div className="db-loading">
                <div className="db-loading-spinner" />
                <p>Loading employees…</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="db-page">
            <div className="db-error-state">
                <p className="db-error-icon">⚠</p>
                <p className="db-error-title">Failed to load</p>
                <p className="db-error-msg">{error}</p>
                <button className="db-btn-dark" onClick={() => window.location.reload()}>Retry</button>
            </div>
        </div>
    );

    return (
        <div className="db-page">

            {/* ── Top bar ── */}
            <header className="db-topbar">
                <div className="db-topbar-left">
                    <span className="db-topbar-eyebrow">HR Portal</span>
                    <h1 className="db-topbar-title">Dashboard</h1>
                </div>
                <button className="db-btn-dark" onClick={() => navigate("/employees/new")}>
                    + New employee
                </button>
            </header>

            {/* ── Stat cards ── */}
            <div className="db-stats-grid">
                <div className="db-stat-card">
                    <span className="db-stat-label">Total employees</span>
                    <span className="db-stat-value">{employees.length}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Avg salary</span>
                    <span className="db-stat-value">{fmt(globalAvg)}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Highest salary</span>
                    <span className="db-stat-value">{fmt(globalMax)}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Lowest salary</span>
                    <span className="db-stat-value">{fmt(globalMin)}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Departments</span>
                    <span className="db-stat-value">{departments.length - 1}</span>
                </div>
            </div>

            {/* ── Employee Table ── */}
            <section className="db-card">
                <div className="db-card-header">
                    <div>
                        <h2 className="db-card-title">Employees</h2>
                        <p className="db-card-sub">{filtered.length} of {employees.length} shown</p>
                    </div>
                    <div className="db-table-controls">
                        <input
                            className="db-search"
                            type="text"
                            placeholder="Search name, title, dept…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                        <select className="db-select" value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
                            {departments.map((d) => <option key={d}>{d}</option>)}
                        </select>
                        <select className="db-select" value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
                            {empTypes.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="db-table-wrap">
                    <table className="db-table">
                        <thead>
                            <tr>
                                <th onClick={() => toggleSort("firstName")}>Name <SortIcon k="firstName" /></th>
                                <th onClick={() => toggleSort("jobTitle")}>Title <SortIcon k="jobTitle" /></th>
                                <th onClick={() => toggleSort("department")}>Dept <SortIcon k="department" /></th>
                                <th onClick={() => toggleSort("country")}>Country <SortIcon k="country" /></th>
                                <th onClick={() => toggleSort("employmentType")}>Type <SortIcon k="employmentType" /></th>
                                <th onClick={() => toggleSort("salary")}>Salary <SortIcon k="salary" /></th>
                                <th className="db-th-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.length === 0 ? (
                                <tr><td colSpan={8} className="db-empty">No employees match your filters.</td></tr>
                            ) : pageRows.map((e) => (
                                <tr key={e.id} className="db-tr">
                                    <td>
                                        <div className="db-name-cell">
                                            <div className="db-avatar">{e.firstName[0]}{e.lastName[0]}</div>
                                            <div>
                                                <p className="db-name">{e.firstName} {e.lastName}</p>
                                                <p className="db-email">{e.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{e.jobTitle || "—"}</td>
                                    <td>{e.department || "—"}</td>
                                    <td>{e.country || "—"}</td>
                                    <td>
                                        {e.employmentType
                                            ? <span className={`db-badge db-badge--${e.employmentType.toLowerCase().replace("-", "")}`}>{e.employmentType}</span>
                                            : "—"}
                                    </td>

                                    <td className="db-salary">{e.salary ? fmt(toNum(e.salary)) : "—"}</td>
                                    <td>
                                        <div className="db-actions">
                                            <button className="db-action-btn db-action-view"
                                                onClick={() => navigate(`/view-employee/${e.id}`)} title="View">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            </button>
                                            <button className="db-action-btn db-action-edit"
                                                onClick={() => navigate(`/update-employee/${e.id}`)} title="Edit">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button className="db-action-btn db-action-delete"
                                                onClick={() => setDeleteTarget(e)} title="Delete">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="db-pagination">
                        <span className="db-page-info">Page {page} of {totalPages}</span>
                        <div className="db-page-btns">
                            <button className="db-page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
                            <button className="db-page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    p === "…"
                                        ? <span key={`ellipsis-${i}`} className="db-page-ellipsis">…</span>
                                        : <button key={p} className={`db-page-btn${page === p ? " db-page-btn--active" : ""}`}
                                            onClick={() => setPage(p as number)}>{p}</button>
                                )}
                            <button className="db-page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
                            <button className="db-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
                        </div>
                    </div>
                )}
            </section>

            {/* ── Salary Metrics ── */}
            <section className="db-card">
                <div className="db-card-header">
                    <div>
                        <h2 className="db-card-title">Salary metrics</h2>
                        <p className="db-card-sub">Min · Avg · Max across groups</p>
                    </div>
                    <div className="db-group-tabs">
                        {(["country", "jobTitle", "both", "experience", "department"] as GroupBy[]).map((g) => (
                            <button
                                key={g}
                                className={`db-tab${groupBy === g ? " db-tab--active" : ""}`}
                                onClick={() => setGroupBy(g)}
                            >
                                {g === "jobTitle" ? "Job title"
                                    : g === "both" ? "Country + Title"
                                        : g === "experience" ? "Experience"
                                            : g.charAt(0).toUpperCase() + g.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {metricRows.length === 0
                    ? <p className="db-empty">No salary data available.</p>
                    : <MetricBar rows={metricRows} maxVal={maxVal} />}
            </section>

            {/* ── Delete modal ── */}
            {deleteTarget && (
                <div className="db-modal-backdrop" onClick={() => setDeleteTarget(null)}>
                    <div className="db-modal" onClick={(e) => e.stopPropagation()}>
                        <p className="db-modal-title">Delete employee?</p>
                        <p className="db-modal-body">
                            This will permanently remove <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong> and cannot be undone.
                        </p>
                        <div className="db-modal-actions">
                            <button className="db-modal-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className={`db-modal-confirm${deleteLoading ? " db-modal-confirm--loading" : ""}`}
                                onClick={confirmDelete} disabled={deleteLoading}>
                                {deleteLoading && <span className="db-spinner db-spinner--sm" />}
                                {deleteLoading ? "Deleting…" : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ── */}
            {toast && (
                <div className={`db-toast db-toast--${toast.type}`} role="alert">{toast.msg}</div>
            )}
        </div>
    );
};

export default Home;