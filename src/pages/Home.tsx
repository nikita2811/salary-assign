import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // ✅ Bug fix: use react-hot-toast, remove dual toast system
import {
    listEmployees,
    getEmployeeCount,
    deleteEmployee,
    getGlobalSalaryInsight,
    getSalaryByCountry,
    getSalaryByJobTitle,
    getSalaryByDepartment,
    getSalaryByExperienceBand,
    searchEmployees,
    type Employee,
    type ApiError,
    type SalaryInsight,
    type CountryInsight,
    type JobTitleInsight,
    type DepartmentInsight,
    type ExperienceBandInsight,
} from "../api/employeeapi";
import "../css/Home.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(s: string | number) { return parseFloat(String(s)) || 0; }
function fmt(n: number) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
}

// ── Unified insight row shape ─────────────────────────────────────────────────

type InsightRow = {
    label: string;
    min: number;
    max: number;
    avg: number;
    count: number;
    extra?: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MetricBar: React.FC<{ rows: InsightRow[]; maxVal: number }> = ({ rows, maxVal }) => (
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

const MetricSkeleton: React.FC = () => (
    <div className="db-metric-rows">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="db-metric-row db-metric-row--skeleton">
                <div className="db-metric-label-wrap">
                    <span className="db-skeleton db-skeleton--label" />
                    <span className="db-skeleton db-skeleton--count" />
                </div>
                <div className="db-bar-track">
                    <div className="db-skeleton db-skeleton--bar" style={{ width: `${30 + i * 15}%` }} />
                </div>
                <div className="db-metric-vals">
                    <span className="db-skeleton db-skeleton--val" />
                    <span className="db-skeleton db-skeleton--val" />
                    <span className="db-skeleton db-skeleton--val" />
                </div>
            </div>
        ))}
    </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────

type GroupBy = "country" | "jobTitle" | "both" | "experienceYears" | "department";

const EXP_ORDER = ["0-2 years", "3-5 years", "6-10 years", "10+ years"];

const Home: React.FC = () => {
    const navigate = useNavigate();

    // ── Employee list state ───────────────────────────────────────────────────
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);

    // ── Insight state ─────────────────────────────────────────────────────────
    const [globalSalary, setGlobalSalary] = useState<SalaryInsight | null>(null);
    const [countryInsights, setCountryInsights] = useState<CountryInsight[]>([]);
    const [jobTitleInsights, setJobTitleInsights] = useState<JobTitleInsight[]>([]);
    const [deptInsights, setDeptInsights] = useState<DepartmentInsight[]>([]);
    const [expInsights, setExpInsights] = useState<ExperienceBandInsight[]>([]);
    // ✅ Bug fix: start as true so stat cards show "—" immediately, not stale zeros
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [insightsError, setInsightsError] = useState<string | null>(null);

    // ── Table state ───────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [sortKey, setSortKey] = useState<keyof Employee>("firstName");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [page, setPage] = useState(1);
    const [filterCountry, setFilterCountry] = useState("All");
    const [filterJobTitle, setFilterJobTitle] = useState("All");
    const [filterDepartment, setFilterDepartment] = useState("All");


    const countryOptions = useMemo(() =>
        ["All", ...countryInsights.map((r) => r.country).filter(Boolean).sort()],
        [countryInsights]
    );

    const jobTitleOptions = useMemo(() => {
        const titles = new Set(jobTitleInsights.map((r) => r.jobTitle).filter(Boolean));
        return ["All", ...Array.from(titles).sort()];
    }, [jobTitleInsights]);

    const departmentOptions = useMemo(() =>
        ["All", ...deptInsights.map((r) => r.department).filter(Boolean).sort()],
        [deptInsights]
    );

    // table page (local)
    const [apiPage, setApiPage] = useState(1);     // API page (server)

    const [hasMore, setHasMore] = useState(true);
    const [fetchLoading, setFetchLoading] = useState(false)
    const PAGE_SIZE = 8;
    const FETCH_SIZE = 50;

    // ── Metrics state ─────────────────────────────────────────────────────────
    const [groupBy, setGroupBy] = useState<GroupBy>("country");
    const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Initial data load ─────────────────────────────────────────────────────

    useEffect(() => {
        Promise.all([listEmployees(1, FETCH_SIZE), getEmployeeCount()])
            .then(([data, count]) => {
                setEmployees(data.results);
                setTotalCount(count);
                setHasMore(data.next !== null);
            })
            .catch((e: ApiError) => setError(e.message ?? "Failed to load employees."))
            .finally(() => setLoading(false));
    }, []);

    const loadMore = async () => {
        if (fetchLoading || !hasMore) return;
        setFetchLoading(true);
        try {
            const next = apiPage + 1;
            const data = await listEmployees(next, FETCH_SIZE);
            setEmployees((prev) => [...prev, ...data.results]); // ← append
            setApiPage(next);
            setHasMore(data.next !== null);
        } catch (e) {
            toast.error("Failed to load more employees.");
        } finally {
            setFetchLoading(false);
        }
    };

    const handleSearch = async (search: string) => {
        if (!search.trim()) {
            setEmployees([]);
            return;
        }

        setFetchLoading(true);

        try {
            const data = await searchEmployees(
                search,

            );
            setEmployees(data.results);

            setApiPage(1);

            setHasMore(data.next !== null);
        } catch (e) {
            toast.error("Failed to search employees.");
        } finally {
            setFetchLoading(false);
        }

    };

    // ── Load all insights in parallel (including new global salary) ───────────

    useEffect(() => {
        setInsightsLoading(true);
        setInsightsError(null);
        Promise.all([
            getGlobalSalaryInsight(),   // ✅ new: accurate single-query global stats
            getSalaryByCountry(),
            getSalaryByJobTitle(),
            getSalaryByDepartment(),
            getSalaryByExperienceBand(),
        ])
            .then(([salary, country, jobTitle, dept, exp]) => {
                setGlobalSalary(salary);
                setCountryInsights(country);
                setJobTitleInsights(jobTitle);
                setDeptInsights(dept);
                setExpInsights(exp);
                console.log(globalSalary)
            })
            .catch((e: ApiError) => setInsightsError(e.message ?? "Failed to load insights."))
            .finally(() => setInsightsLoading(false));
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
                (e.jobTitle ?? "").toLowerCase().includes(q) ||
                (e.department ?? "").toLowerCase().includes(q);
            const matchDept = deptFilter === "All" || e.department === deptFilter;
            const matchType = typeFilter === "All" || e.employmentType === typeFilter;
            return matchSearch && matchDept && matchType;
        });
    }, [employees, search, deptFilter, typeFilter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            const av = String(a[sortKey] ?? "");
            const bv = String(b[sortKey] ?? "");
            const cmp = sortKey === "salary" || sortKey === "experienceYears"
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

    // ── Map API insight data → unified InsightRow[] ───────────────────────────



    const metricRows = useMemo((): InsightRow[] => {
        switch (groupBy) {
            case "country":
                return countryInsights
                    .filter((r) => filterCountry === "All" || r.country === filterCountry)
                    .map((r) => ({
                        label: r.country || "—",
                        min: toNum(r.minSalary),
                        max: toNum(r.maxSalary),
                        avg: toNum(r.avgSalary),
                        count: r.headcount,
                    }))
                    .sort((a, b) => b.avg - a.avg);

            case "jobTitle": {
                const map = new Map<string, { min: number; max: number; totalSalary: number; count: number }>();
                for (const r of jobTitleInsights) {
                    if (filterJobTitle !== "All" && r.jobTitle !== filterJobTitle) continue;
                    const key = r.jobTitle || "Unknown";
                    const existing = map.get(key);
                    if (!existing) {
                        map.set(key, { min: toNum(r.minSalary), max: toNum(r.maxSalary), totalSalary: toNum(r.avgSalary) * r.headcount, count: r.headcount });
                    } else {
                        existing.min = Math.min(existing.min, toNum(r.minSalary));
                        existing.max = Math.max(existing.max, toNum(r.maxSalary));
                        existing.totalSalary += toNum(r.avgSalary) * r.headcount;
                        existing.count += r.headcount;
                    }
                }
                return Array.from(map.entries())
                    .map(([label, v]) => ({ label, min: v.min, max: v.max, avg: v.totalSalary / v.count, count: v.count }))
                    .sort((a, b) => b.avg - a.avg);
            }

            case "both": {
                const seen = new Map<string, InsightRow>();
                for (const r of jobTitleInsights) {
                    if (filterCountry !== "All" && r.country !== filterCountry) continue;
                    if (filterJobTitle !== "All" && r.jobTitle !== filterJobTitle) continue;
                    const label = `${r.country || "—"} · ${r.jobTitle || "Unknown"}`;
                    const existing = seen.get(label);
                    if (existing) {
                        existing.min = Math.min(existing.min, toNum(r.minSalary));
                        existing.max = Math.max(existing.max, toNum(r.maxSalary));
                        existing.avg = (existing.avg * existing.count + toNum(r.avgSalary) * r.headcount) / (existing.count + r.headcount);
                        existing.count += r.headcount;
                    } else {
                        seen.set(label, { label, min: toNum(r.minSalary), max: toNum(r.maxSalary), avg: toNum(r.avgSalary), count: r.headcount });
                    }
                }
                return Array.from(seen.values()).sort((a, b) => b.avg - a.avg);
            }

            case "department":
                return deptInsights
                    .filter((r) => filterDepartment === "All" || r.department === filterDepartment)
                    .map((r) => ({
                        label: r.department || "—",
                        min: toNum(r.minSalary),
                        max: toNum(r.maxSalary),
                        avg: toNum(r.avgSalary),
                        count: r.headcount,
                        extra: fmt(toNum(r.salaryRange)),
                    }))
                    .sort((a, b) => b.avg - a.avg);

            case "experienceYears":
                return expInsights
                    .map((r) => ({
                        label: r.experienceBand,
                        min: toNum(r.minSalary),
                        max: toNum(r.maxSalary),
                        avg: toNum(r.avgSalary),
                        count: r.headcount,
                    }))
                    .sort((a, b) => EXP_ORDER.indexOf(a.label) - EXP_ORDER.indexOf(b.label));

            default:
                return [];
        }
    }, [groupBy, countryInsights, jobTitleInsights, deptInsights, expInsights,
        filterCountry, filterJobTitle, filterDepartment]);

    const maxVal = useMemo(() => Math.max(...metricRows.map((r) => r.max), 1), [metricRows]);

    // ── Delete ────────────────────────────────────────────────────────────────

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteEmployee(deleteTarget.id);
            setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
            setTotalCount((c) => c - 1);
            // ✅ Bug fix: use react-hot-toast (already in App.tsx via <Toaster />)
            toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`);
            setDeleteTarget(null);
        } catch (e) {
            const ae = e as ApiError;
            toast.error(ae.message ?? "Delete failed.");
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
                {/* ✅ Bug fix: was "/employees/new", correct route is "/create-employee" */}
                <button className="db-btn-dark" onClick={() => navigate("/create-employee")}>
                    + New employee
                </button>
            </header>

            {/* ── Stat cards — now powered by /insights/salary/ ── */}
            <div className="db-stats-grid">
                <div className="db-stat-card">
                    <span className="db-stat-label">Total employees</span>
                    <span className="db-stat-value">{totalCount}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Avg salary</span>
                    <span className="db-stat-value">
                        {insightsLoading || !globalSalary ? "—" : fmt(toNum(globalSalary.avgSalary))}
                    </span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Highest salary</span>
                    <span className="db-stat-value">
                        {insightsLoading || !globalSalary ? "—" : fmt(toNum(globalSalary.maxSalary))}
                    </span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Lowest salary</span>
                    <span className="db-stat-value">
                        {insightsLoading || !globalSalary ? "—" : fmt(toNum(globalSalary.minSalary))}
                    </span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Departments</span>
                    <span className="db-stat-value">{departments.length - 1}</span>
                </div>
                <div className="db-stat-card">
                    <span className="db-stat-label">Countries</span>
                    <span className="db-stat-value">
                        {insightsLoading ? "—" : countryInsights.length}
                    </span>
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
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <select className="db-select" value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}>
                            {departments.map((d) => <option key={d}>{d}</option>)}
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
                                <tr><td colSpan={7} className="db-empty">No employees match your filters.</td></tr>
                            ) : pageRows.map((e) => (
                                <tr key={e.id} className="db-tr">
                                    <td>
                                        <div className="db-name-cell">
                                            <div className="db-avatar">
                                                {(e.firstName?.[0] ?? "?")}{(e.lastName?.[0] ?? "")}
                                            </div>
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
                                            ? <span className={`db-badge db-badge--${e.employmentType.toLowerCase().replace(/[_-]/g, "")}`}>{e.employmentType}</span>
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
                {hasMore && (
                    <div className="db-page-info">
                        <button

                            onClick={loadMore}
                            disabled={fetchLoading}
                        >
                            {fetchLoading
                                ? "Loading…"
                                : `Load more (${employees.length} of ${totalCount} loaded)`}
                        </button>
                    </div>
                )}
            </section>


            {/* ── Salary Metrics ── */}
            <section className="db-card">
                <div className="db-card-header">
                    <div>
                        <h2 className="db-card-title">Salary metrics</h2>
                        <p className="db-card-sub">
                            {insightsLoading
                                ? "Loading from server…"
                                : insightsError
                                    ? `⚠ ${insightsError}`
                                    : "Min · Avg · Max — server-aggregated"}
                        </p>
                    </div>
                    <div className="db-group-tabs">
                        {(["country", "jobTitle", "both", "experience", "department"] as GroupBy[]).map((g) => (
                            <button
                                key={g}
                                className={`db-tab${groupBy === g ? " db-tab--active" : ""}`}
                                onClick={() => {
                                    setGroupBy(g);
                                    // reset filters when switching tabs
                                    setFilterCountry("All");
                                    setFilterJobTitle("All");
                                    setFilterDepartment("All");
                                }}
                            >
                                {g === "jobTitle" ? "Job title"
                                    : g === "both" ? "Country + Title"
                                        : g === "experienceYears" ? "Experience"
                                            : g.charAt(0).toUpperCase() + g.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Per-tab filter dropdowns ── */}
                {!insightsLoading && !insightsError && (
                    <div className="db-insight-filters">
                        {(groupBy === "country") && (
                            <select
                                className="db-select"
                                value={filterCountry}
                                onChange={(e) => setFilterCountry(e.target.value)}
                            >
                                {countryOptions.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        )}
                        {(groupBy === "jobTitle") && (
                            <select
                                className="db-select"
                                value={filterJobTitle}
                                onChange={(e) => setFilterJobTitle(e.target.value)}
                            >
                                {jobTitleOptions.map((t) => <option key={t}>{t}</option>)}
                            </select>
                        )}
                        {(groupBy === "both") && (
                            <>
                                <select
                                    className="db-select"
                                    value={filterCountry}
                                    onChange={(e) => setFilterCountry(e.target.value)}
                                >
                                    {countryOptions.map((c) => <option key={c}>{c}</option>)}
                                </select>
                                <select
                                    className="db-select"
                                    value={filterJobTitle}
                                    onChange={(e) => setFilterJobTitle(e.target.value)}
                                >
                                    {jobTitleOptions.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </>
                        )}
                        {(groupBy === "department") && (
                            <select
                                className="db-select"
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                            >
                                {departmentOptions.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        )}
                        {/* experience has no filter — bands are fixed */}
                    </div>
                )}

                {insightsLoading
                    ? <MetricSkeleton />
                    : insightsError
                        ? (
                            <div className="db-insights-error">
                                <p>{insightsError}</p>
                                <button className="db-btn-dark" onClick={() => window.location.reload()}>Retry</button>
                            </div>
                        )
                        : metricRows.length === 0
                            ? <p className="db-empty">No data for this filter.</p>
                            : <MetricBar rows={metricRows} maxVal={maxVal} />
                }

                {!insightsLoading && groupBy === "department" && metricRows.length > 0 && (
                    <div className="db-dept-ranges">
                        <p className="db-dept-ranges-title">Salary spread by department</p>
                        <div className="db-dept-range-list">
                            {metricRows.map((r) => (
                                <div key={r.label} className="db-dept-range-item">
                                    <span>{r.label}</span>
                                    <span className="db-dept-range-val">{r.extra} range</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
                            <button
                                className={`db-modal-confirm${deleteLoading ? " db-modal-confirm--loading" : ""}`}
                                onClick={confirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading && <span className="db-spinner db-spinner--sm" />}
                                {deleteLoading ? "Deleting…" : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;