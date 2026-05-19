import { useState } from "react";
import { createEmployee, type EmployeeFormData, type ApiError, type EmploymentType } from "../api/employeeapi";
import "../css/CreateEmployee.css";

type ToastState = { message: string; type: "success" | "error" } | null;

// Re-export so consumers of this file can use EmployeeFormData if needed
export type { EmployeeFormData };
const EMPLOYMENT_TYPE_OPTIONS = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
] satisfies { value: EmploymentType; label: string }[];


const CreateEmployee: React.FC = () => {
    const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
    const [formData, setFormData] = useState<EmployeeFormData>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobTitle: "",
        department: "",
        country: "",
        city: "",
        salary: 0,
        employmentType: employmentType,
        joiningDate: "",
        experienceYears: 0,
        skills: [],
        manager: "",
    });

    const [skillInput, setSkillInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2800);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addSkill = () => {
        const parts = skillInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const next = [...new Set([...formData.skills, ...parts])];
        setFormData({ ...formData, skills: next });
        setSkillInput("");
    };

    const removeSkill = (skill: string) => {
        setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
    };



    const handleSubmit = async () => {
        const required: (keyof EmployeeFormData)[] = [
            "firstName", "lastName", "email", "salary", "jobTitle", "country",
        ];
        const missing = required.filter((k) => !formData[k]);
        if (missing.length) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        setLoading(true);
        try {
            const created = await createEmployee(formData);
            console.log("Created employee:", created);
            showToast(`${created.firstName} ${created.lastName} registered successfully.`);
            // Optionally reset form after success:
            // setFormData({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "",
            //   department: "", country: "", city: "", salary: "", employmentType: "",
            //   joiningDate: "", experience: "", skills: [], manager: "" });
        } catch (err) {
            const apiErr = err as ApiError;
            if (apiErr.fieldErrors) {
                // Show first field-level error from DRF
                const firstField = Object.keys(apiErr.fieldErrors)[0];
                const firstMsg = apiErr.fieldErrors[firstField][0];
                showToast(`${firstField}: ${firstMsg}`, "error");
            } else {
                showToast(apiErr.message ?? "Something went wrong.", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="emp-page">
            <div className="emp-container">

                {/* Header */}
                <div className="emp-header">
                    <div className="emp-header-eyebrow">HR Portal</div>
                    <h1 className="emp-header-title">New Employee</h1>
                    <p className="emp-header-sub">Register a team member and configure their profile</p>
                </div>

                <div className="emp-body">

                    {/* Personal Info */}
                    <section className="emp-section">
                        <div className="emp-section-label">
                            <span className="emp-section-num">01</span>
                            Personal info
                        </div>
                        <div className="emp-grid">
                            <div className="emp-field">
                                <label className="emp-label">First name <span className="emp-req">*</span></label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="firstName"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Last name <span className="emp-req">*</span></label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="lastName"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Email address <span className="emp-req">*</span></label>
                                <input
                                    className="emp-input"
                                    type="email"
                                    name="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Phone number</label>
                                <input
                                    className="emp-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="+91 9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Country <span className="emp-req">*</span></label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="country"
                                    placeholder="India"
                                    value={formData.country}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">City</label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="city"
                                    placeholder="Delhi"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Role & Employment */}
                    <section className="emp-section">
                        <div className="emp-section-label">
                            <span className="emp-section-num">02</span>
                            Role &amp; employment
                        </div>
                        <div className="emp-grid">
                            <div className="emp-field">
                                <label className="emp-label">Job title <span className="emp-req">*</span></label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="jobTitle"
                                    placeholder="Backend Developer"
                                    value={formData.jobTitle}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Department</label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="department"
                                    placeholder="Engineering"
                                    value={formData.department}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Employment type</label>
                                <select className="emp-input"
                                    value={employmentType}
                                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                                >
                                    {EMPLOYMENT_TYPE_OPTIONS.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>

                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Joining date</label>
                                <input
                                    className="emp-input"
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Experience (years)</label>
                                <input
                                    className="emp-input"
                                    type="number"
                                    name="experience"
                                    placeholder="3"
                                    min={0}
                                    max={50}
                                    value={formData.experienceYears}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="emp-field">
                                <label className="emp-label">Salary (₹) <span className="emp-req">*</span></label>
                                <div className="emp-prefix-wrap">
                                    <span className="emp-prefix">₹</span>
                                    <input
                                        className="emp-input emp-input-prefix"
                                        type="number"
                                        name="salary"
                                        placeholder="50000"
                                        value={formData.salary}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="emp-field emp-field-full">
                                <label className="emp-label">Reporting manager</label>
                                <input
                                    className="emp-input"
                                    type="text"
                                    name="manager"
                                    placeholder="Manager name"
                                    value={formData.manager}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Skills */}
                    <section className="emp-section">
                        <div className="emp-section-label">
                            <span className="emp-section-num">03</span>
                            Skills
                        </div>
                        <div className="emp-skills-input-row">
                            <input
                                className="emp-input"
                                type="text"
                                placeholder="e.g. React, Docker, AWS — press Enter or Add"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}

                            />
                            <button className="emp-skill-add-btn" onClick={addSkill} type="button">
                                Add
                            </button>
                        </div>
                        {formData.skills.length > 0 && (
                            <div className="emp-skills-wrap">
                                {formData.skills.map((skill) => (
                                    <span key={skill} className="emp-skill-tag">
                                        {skill}
                                        <button
                                            className="emp-skill-remove"
                                            onClick={() => removeSkill(skill)}
                                            aria-label={`Remove ${skill}`}
                                            type="button"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Submit */}
                    <div className="emp-submit-row">
                        <button
                            className={`emp-submit-btn${loading ? " emp-submit-btn--loading" : ""}`}
                            onClick={handleSubmit}
                            disabled={loading}
                            type="button"
                        >
                            {loading ? (
                                <span className="emp-spinner" aria-hidden="true" />
                            ) : null}
                            {loading ? "Saving…" : "Save employee"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`emp-toast emp-toast--${toast.type}`} role="alert">
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default CreateEmployee;