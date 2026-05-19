import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getEmployee,
    deleteEmployee,
    type Employee,
    type ApiError,
} from "../api/employeeapi";
import "../css/ViewEmployee.css";

// ✅ Fix 1: null removed from type, moved to useState generic
type ToastState = { message: string; type: "success" | "error" | "info" };

const ViewEmployee: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    // ✅ Fix 2: removed duplicate declaration outside component, correct generic
    const [toast, setToast] = useState<ToastState | null>(null);

    const showToast = (message: string, type: ToastState["type"] = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!id) return;
        setFetchLoading(true);
        setFetchError(null);
        getEmployee(id)
            .then(setEmployee)
            .catch((err: ApiError) => setFetchError(err.message ?? "Failed to load employee."))
            .finally(() => setFetchLoading(false));
    }, [id]);

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await deleteEmployee(id!); // ✅ Fix 3: id is string, no Number() conversion
            showToast("Employee deleted.", "info");
            setTimeout(() => navigate("/employees"), 1200);
        } catch (err) {
            const apiErr = err as ApiError;
            showToast(apiErr.message ?? "Delete failed.", "error");
            setShowDeleteModal(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const EMPLOYMENT_LABELS: Record<string, string> = {
        full_time: "Full Time",
        part_time: "Part Time",
        contractor: "Contractor",
    };

    const getInitials = (first: string, last: string) =>
        `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();

    if (fetchLoading) {
        return (
            <div className="vew-page">
                <div className="vew-skeleton-wrap">
                    <div className="vew-skeleton vew-skeleton--avatar" />
                    <div className="vew-skeleton vew-skeleton--title" />
                    <div className="vew-skeleton vew-skeleton--sub" />
                    <div className="vew-skeleton-grid">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="vew-skeleton vew-skeleton--field" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (fetchError || !employee) {
        return (
            <div className="vew-page">
                <div className="vew-error-state">
                    <p className="vew-error-icon">⚠</p>
                    <p className="vew-error-title">Could not load employee</p>
                    <p className="vew-error-msg">{fetchError}</p>
                    <button className="vew-back-btn" onClick={() => navigate(-1)}>Go back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="vew-page">
            <div className="vew-container">

                <div className="vew-header">
                    <button className="vew-back-link" onClick={() => navigate(-1)} type="button">
                        ← Employees
                    </button>
                    <div className="vew-hero">
                        <div className="vew-avatar">
                            {getInitials(employee.firstName, employee.lastName)}
                        </div>
                        <div className="vew-hero-info">
                            <h1 className="vew-name">{employee.firstName} {employee.lastName}</h1>
                            <p className="vew-role">{employee.jobTitle || "—"} · {employee.department || "—"}</p>
                            <div className="vew-badges">
                                <span className={`vew-badge vew-badge--status ${employee.isActive ? "vew-badge--active" : "vew-badge--inactive"}`}>
                                    {employee.isActive ? "Active" : "Inactive"}
                                </span>
                                {employee.employmentType && (
                                    <span className="vew-badge vew-badge--type">
                                        {EMPLOYMENT_LABELS[employee.employmentType] ?? employee.employmentType}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="vew-header-actions">
                            <button
                                className="vew-edit-btn"
                                onClick={() => navigate(`/update-employee/${id}`)}
                                type="button"
                            >
                                Edit
                            </button>
                            <button
                                className="vew-delete-btn"
                                onClick={() => setShowDeleteModal(true)}
                                type="button"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>

                <div className="vew-body">

                    <section className="vew-section">
                        <div className="vew-section-label">
                            <span className="vew-section-num">01</span> Personal info
                        </div>
                        <div className="vew-grid">
                            <Field label="First name" value={employee.firstName} />
                            <Field label="Last name" value={employee.lastName} />
                            <Field label="Email address" value={employee.email} />
                            <Field label="Phone number" value={employee.phone} />
                            <Field label="Country" value={employee.country} />
                            <Field label="City" value={employee.city} />
                        </div>
                    </section>

                    <section className="vew-section">
                        <div className="vew-section-label">
                            <span className="vew-section-num">02</span> Role &amp; employment
                        </div>
                        <div className="vew-grid">
                            <Field label="Job title" value={employee.jobTitle} />
                            <Field label="Department" value={employee.department} />
                            <Field
                                label="Employment type"
                                value={EMPLOYMENT_LABELS[employee.employmentType] ?? employee.employmentType}
                            />
                            <Field label="Joining date" value={employee.joiningDate} />
                            {/* ✅ Fix 4: experienceYears → experience to match EmployeeFormData */}
                            <Field label="Experience" value={employee.experienceYears ? `${employee.experienceYears} years` : "—"} />
                            <Field label="Salary" value={employee.salary ? `₹ ${Number(employee.salary).toLocaleString("en-IN")}` : "—"} />
                            <Field label="Reporting manager" value={employee.manager} span />
                        </div>
                    </section>

                    {employee.skills?.length > 0 && (
                        <section className="vew-section">
                            <div className="vew-section-label">
                                <span className="vew-section-num">03</span> Skills
                            </div>
                            <div className="vew-skills-wrap">
                                {employee.skills.map((skill) => (
                                    <span key={skill} className="vew-skill-tag">{skill}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="vew-section">
                        <div className="vew-section-label">
                            <span className="vew-section-num">04</span> Record info
                        </div>
                        <div className="vew-grid">
                            <Field label="Employee ID" value={employee.id} span />
                            <Field label="Created at" value={employee.createdAt ? new Date(employee.createdAt).toLocaleString() : "—"} />
                            <Field label="Last updated" value={employee.updatedAt ? new Date(employee.updatedAt).toLocaleString() : "—"} />
                        </div>
                    </section>

                </div>
            </div>

            {showDeleteModal && (
                <div className="vew-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
                    <div className="vew-modal" onClick={(e) => e.stopPropagation()} role="dialog"
                        aria-modal="true" aria-labelledby="modal-title">
                        <p className="vew-modal-title" id="modal-title">Delete employee?</p>
                        <p className="vew-modal-body">
                            This will permanently remove <strong>{employee.firstName} {employee.lastName}</strong> and cannot be undone.
                        </p>
                        <div className="vew-modal-actions">
                            <button className="vew-modal-cancel" onClick={() => setShowDeleteModal(false)} type="button">
                                Cancel
                            </button>
                            <button
                                className={`vew-modal-confirm${deleteLoading ? " vew-modal-confirm--loading" : ""}`}
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                type="button"
                            >
                                {deleteLoading && <span className="vew-spinner vew-spinner--dark" aria-hidden="true" />}
                                {deleteLoading ? "Deleting…" : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`vew-toast vew-toast--${toast.type}`} role="alert">
                    {toast.message}
                </div>
            )}
        </div>
    );
};

const Field: React.FC<{ label: string; value?: string | null; span?: boolean }> = ({
    label, value, span
}) => (
    <div className={`vew-field${span ? " vew-field-full" : ""}`}>
        <p className="vew-field-label">{label}</p>
        <p className="vew-field-value">{value || "—"}</p>
    </div>
);

export default ViewEmployee;