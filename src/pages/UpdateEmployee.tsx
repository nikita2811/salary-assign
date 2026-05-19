import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getEmployee,
    updateEmployee,
    deleteEmployee,
    type EmployeeFormData,
    type ApiError,
    type EmploymentType,
} from "../api/employeeapi";
import "../css/UpdateEmployee.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastState = { message: string; type: "success" | "error" | "info" };

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: EmployeeFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    department: "",
    country: "",
    city: "",
    salary: 0,
    employmentType: "" as EmploymentType,
    joiningDate: "",
    experience: "",
    skills: [],
    manager: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

const UpdateEmployee: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
    const [original, setOriginal] = useState<EmployeeFormData>(EMPTY_FORM);
    const [skillInput, setSkillInput] = useState("");
    const [fetchLoading, setFetchLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // ── Helpers ──────────────────────────────────────────────────────────────────

    const showToast = (message: string, type: ToastState["type"] = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const isDirty = JSON.stringify(formData) !== JSON.stringify(original);

    // ── Fetch existing employee ───────────────────────────────────────────────────

    useEffect(() => {
        if (!id) return;
        setFetchLoading(true);
        setFetchError(null);

        getEmployee(id)
            .then((emp) => {
                const { id: _id, createdAt: _c, updatedAt: _u, isActive: _a, ...fields } = emp;
                setFormData(fields);
                setOriginal(fields);
            })
            .catch((err: ApiError) => {
                setFetchError(err.message ?? "Failed to load employee.");
            })
            .finally(() => setFetchLoading(false));
    }, [id]);

    // ── Field handlers ────────────────────────────────────────────────────────────

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addSkill = () => {
        const parts = skillInput.split(",").map((s) => s.trim()).filter(Boolean);
        const next = [...new Set([...formData.skills, ...parts])];
        setFormData({ ...formData, skills: next });
        setSkillInput("");
    };

    const removeSkill = (skill: string) => {
        setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
    };

    const handleReset = () => {
        setFormData(original);
        showToast("Changes discarded.", "info");
    };

    // ── Submit (full update) ──────────────────────────────────────────────────────

    const handleSubmit = async () => {
        const required: (keyof EmployeeFormData)[] = [
            "firstName", "lastName", "email", "salary", "jobTitle", "country",
        ];
        const missing = required.filter((k) => !formData[k]);
        if (missing.length) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        setSaveLoading(true);
        try {
            const updated = await updateEmployee(id!, formData);
            const { id: _id, createdAt: _c, updatedAt: _u, isActive: _a, ...fields } = updated;
            setOriginal(fields);
            showToast(`${updated.firstName} ${updated.lastName} updated successfully.`);
        } catch (err) {
            const apiErr = err as ApiError;
            if (apiErr.fieldErrors) {
                const firstField = Object.keys(apiErr.fieldErrors)[0];
                showToast(`${firstField}: ${apiErr.fieldErrors[firstField][0]}`, "error");
            } else {
                showToast(apiErr.message ?? "Something went wrong.", "error");
            }
        } finally {
            setSaveLoading(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await deleteEmployee(id!);
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

    // ── Render: Loading ───────────────────────────────────────────────────────────

    if (fetchLoading) {
        return (
            <div className="upd-page">
                <div className="upd-skeleton-wrap">
                    <div className="upd-skeleton upd-skeleton--header" />
                    <div className="upd-skeleton-grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="upd-skeleton upd-skeleton--field" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Error ─────────────────────────────────────────────────────────────

    if (fetchError) {
        return (
            <div className="upd-page">
                <div className="upd-error-state">
                    <p className="upd-error-icon">⚠</p>
                    <p className="upd-error-title">Could not load employee</p>
                    <p className="upd-error-msg">{fetchError}</p>
                    <button className="upd-back-btn" onClick={() => navigate(-1)}>Go back</button>
                </div>
            </div>
        );
    }

    // ── Render: Main ──────────────────────────────────────────────────────────────

    return (
        <div className="upd-page">
            <div className="upd-container">

                {/* Header */}
                <div className="upd-header">
                    <button className="upd-back-link" onClick={() => navigate(-1)} type="button">
                        ← Employees
                    </button>
                    <div className="upd-header-row">
                        <div>
                            <div className="upd-header-eyebrow">Employee #{id}</div>
                            <h1 className="upd-header-title">
                                {original.firstName} {original.lastName}
                            </h1>
                            <p className="upd-header-sub">{original.jobTitle || "—"} · {original.department || "—"}</p>
                        </div>
                        <button
                            className="upd-delete-trigger"
                            onClick={() => setShowDeleteModal(true)}
                            type="button"
                            aria-label="Delete employee"
                        >
                            Delete
                        </button>
                    </div>

                    {isDirty && (
                        <div className="upd-dirty-banner">
                            Unsaved changes
                            <button className="upd-discard-btn" onClick={handleReset} type="button">
                                Discard
                            </button>
                        </div>
                    )}
                </div>

                <div className="upd-body">

                    {/* Section 01 — Personal */}
                    <section className="upd-section">
                        <div className="upd-section-label">
                            <span className="upd-section-num">01</span> Personal info
                        </div>
                        <div className="upd-grid">
                            <div className="upd-field">
                                <label className="upd-label">First name <span className="upd-req">*</span></label>
                                <input className="upd-input" type="text" name="firstName" placeholder="John"
                                    value={formData.firstName} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Last name <span className="upd-req">*</span></label>
                                <input className="upd-input" type="text" name="lastName" placeholder="Doe"
                                    value={formData.lastName} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Email address <span className="upd-req">*</span></label>
                                <input className="upd-input" type="email" name="email" placeholder="john@example.com"
                                    value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Phone number</label>
                                <input className="upd-input" type="tel" name="phone" placeholder="+91 9876543210"
                                    value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Country <span className="upd-req">*</span></label>
                                <input className="upd-input" type="text" name="country" placeholder="India"
                                    value={formData.country} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">City</label>
                                <input className="upd-input" type="text" name="city" placeholder="Delhi"
                                    value={formData.city} onChange={handleChange} />
                            </div>
                        </div>
                    </section>

                    {/* Section 02 — Role */}
                    <section className="upd-section">
                        <div className="upd-section-label">
                            <span className="upd-section-num">02</span> Role &amp; employment
                        </div>
                        <div className="upd-grid">
                            <div className="upd-field">
                                <label className="upd-label">Job title <span className="upd-req">*</span></label>
                                <input className="upd-input" type="text" name="jobTitle" placeholder="Backend Developer"
                                    value={formData.jobTitle} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Department</label>
                                <input className="upd-input" type="text" name="department" placeholder="Engineering"
                                    value={formData.department} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Employment type</label>
                                <select className="upd-input upd-select" name="employmentType"
                                    value={formData.employmentType} onChange={handleChange}>
                                    <option value="">Select type</option>
                                    <option value="full_time">Full Time</option>
                                    <option value="part_time">Part Time</option>
                                    <option value="contractor">Contractor</option>
                                </select>
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Joining date</label>
                                <input className="upd-input" type="date" name="joiningDate"
                                    value={formData.joiningDate} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Experience (years)</label>
                                <input className="upd-input" type="number" name="experience"
                                    placeholder="3" min={0} max={50}
                                    value={formData.experience} onChange={handleChange} />
                            </div>
                            <div className="upd-field">
                                <label className="upd-label">Salary (₹) <span className="upd-req">*</span></label>
                                <div className="upd-prefix-wrap">
                                    <span className="upd-prefix">₹</span>
                                    <input className="upd-input upd-input-prefix" type="number" name="salary"
                                        placeholder="50000" value={formData.salary} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="upd-field upd-field-full">
                                <label className="upd-label">Reporting manager</label>
                                <input className="upd-input" type="text" name="manager" placeholder="Manager name"
                                    value={formData.manager} onChange={handleChange} />
                            </div>
                        </div>
                    </section>

                    {/* Section 03 — Skills */}
                    <section className="upd-section">
                        <div className="upd-section-label">
                            <span className="upd-section-num">03</span> Skills
                        </div>
                        <div className="upd-skills-input-row">
                            <input
                                className="upd-input"
                                type="text"
                                placeholder="e.g. React, Docker, AWS — press Enter or Add"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                            />
                            <button className="upd-skill-add-btn" onClick={addSkill} type="button">Add</button>
                        </div>
                        {formData.skills.length > 0 && (
                            <div className="upd-skills-wrap">
                                {formData.skills.map((skill) => (
                                    <span key={skill} className="upd-skill-tag">
                                        {skill}
                                        <button
                                            className="upd-skill-remove"
                                            onClick={() => removeSkill(skill)}
                                            aria-label={`Remove ${skill}`}
                                            type="button"
                                        >×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Actions */}
                    <div className="upd-actions">
                        <button className="upd-cancel-btn" onClick={handleReset}
                            disabled={!isDirty || saveLoading} type="button">
                            Discard changes
                        </button>
                        <button
                            className={`upd-save-btn${saveLoading ? " upd-save-btn--loading" : ""}`}
                            onClick={handleSubmit}
                            disabled={saveLoading || !isDirty}
                            type="button"
                        >
                            {saveLoading && <span className="upd-spinner" aria-hidden="true" />}
                            {saveLoading ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete confirmation modal */}
            {showDeleteModal && (
                <div className="upd-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
                    <div className="upd-modal" onClick={(e) => e.stopPropagation()} role="dialog"
                        aria-modal="true" aria-labelledby="modal-title">
                        <p className="upd-modal-title" id="modal-title">Delete employee?</p>
                        <p className="upd-modal-body">
                            This will permanently remove{" "}
                            <strong>{original.firstName} {original.lastName}</strong> and cannot be undone.
                        </p>
                        <div className="upd-modal-actions">
                            <button className="upd-modal-cancel" onClick={() => setShowDeleteModal(false)} type="button">
                                Cancel
                            </button>
                            <button
                                className={`upd-modal-confirm${deleteLoading ? " upd-modal-confirm--loading" : ""}`}
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                type="button"
                            >
                                {deleteLoading && <span className="upd-spinner upd-spinner--dark" aria-hidden="true" />}
                                {deleteLoading ? "Deleting…" : "Yes, delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`upd-toast upd-toast--${toast.type}`} role="alert">
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default UpdateEmployee;