import api from "./apiInstance";
import { AxiosError } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmploymentType = "" | "full_time" | "part_time" | "contract";

export type EmployeeFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    department: string;
    country: string;
    city: string;
    salary: number;
    employmentType: EmploymentType;
    joiningDate: string;
    experienceYears: number;
    skills: string[];
    manager: string;
};

export type Employee = EmployeeFormData & {
    id: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type ApiError = {
    status: number;
    message: string;
    fieldErrors?: Record<string, string[]>;
};

export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
};

// ── Insight types ─────────────────────────────────────────────────────────────

/** Returned by /insights/salary/ — single global aggregate */
export type SalaryInsight = {
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    headcount: number;
};

export type CountryInsight = {
    country: string;
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    headcount: number;
};

export type JobTitleInsight = {
    country: string;
    jobTitle: string;
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    headcount: number;
};

export type DepartmentInsight = {
    department: string;
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    headcount: number;
    salaryRange: number;
};

export type ExperienceBandInsight = {
    experienceBand: string;
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    headcount: number;
};



// ── Helpers ───────────────────────────────────────────────────────────────────

function parseError(error: unknown): ApiError {
    if (error instanceof AxiosError) {
        const status = error.response?.status ?? 0;
        const data = error.response?.data;

        if (status === 0 || !error.response) {
            return { status: 0, message: "No response from server. Check your connection." };
        }

        if (typeof data?.detail === "string") {
            return { status, message: data.detail };
        }

        if (typeof data === "object" && data !== null) {
            const fieldErrors: Record<string, string[]> = {};
            let firstMessage = `Error ${status}`;

            for (const [key, val] of Object.entries(data)) {
                if (Array.isArray(val)) {
                    fieldErrors[key] = val as string[];
                    if (firstMessage === `Error ${status}`) {
                        firstMessage = `${key}: ${val[0]}`;
                    }
                }
            }

            return { status, message: firstMessage, fieldErrors };
        }

        return { status, message: error.message };
    }

    return { status: 0, message: "An unexpected error occurred." };
}

// ── Employee API ──────────────────────────────────────────────────────────────

const ENDPOINT = "api/employees/";

export async function createEmployee(data: EmployeeFormData): Promise<Employee> {
    try {
        const response = await api.post<Employee>(ENDPOINT, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function getEmployee(id: string): Promise<Employee> {
    try {
        const response = await api.get<Employee>(`${ENDPOINT}${id}/`);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function listEmployees(page = 1, pageSize = 50): Promise<PaginatedResponse<any>> {
    try {
        const response = await api.get<PaginatedResponse<any>>(ENDPOINT, {
            params: { page, page_size: pageSize },
        });

        return {
            ...response.data,
            results: response.data.results.map((e: any) => ({
                ...e,
                firstName: e.fullName?.split(" ")[0] ?? "",
                lastName: e.fullName?.split(" ").slice(1).join(" ") ?? "",
                jobTitle: e.jobTitle ?? "",
                employmentType: e.employmentType ?? "",
                experienceYears: e.experienceYears ?? 0,
                isActive: e.isActive ?? true,
                joiningDate: e.joiningDate ?? "",
                createdAt: e.createdAt ?? "",
                updatedAt: e.updatedAt ?? "",
            })),
        };
    } catch (error) {
        throw parseError(error);
    }
}

export async function updateEmployee(id: string, data: EmployeeFormData): Promise<Employee> {
    try {
        const response = await api.put<Employee>(`${ENDPOINT}${id}/`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function patchEmployee(
    id: string,
    data: Partial<EmployeeFormData>
): Promise<Employee> {
    try {
        const response = await api.patch<Employee>(`${ENDPOINT}${id}/`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function deleteEmployee(id: string): Promise<void> {
    try {
        await api.delete(`${ENDPOINT}${id}/`);
    } catch (error) {
        throw parseError(error);
    }
}

export async function getEmployeeCount(): Promise<number> {
    try {
        const response = await api.get<{ count: number }>(`${ENDPOINT}count/`);
        return response.data.count;
    } catch (error) {
        throw parseError(error);
    }
}

// ── Insight APIs ──────────────────────────────────────────────────────────────

/**
 * Global min/max/avg salary across all active employees.
 * Backend uses .aggregate() — single DB query, single result object.
 */
export async function getGlobalSalaryInsight(): Promise<SalaryInsight> {
    try {
        const response = await api.get<SalaryInsight>(`${ENDPOINT}insights/salary/`);
        console.log(response.data)
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function getSalaryByCountry(country?: string): Promise<CountryInsight[]> {
    try {
        const params = country ? { country } : {};
        const response = await api.get<CountryInsight[]>(`${ENDPOINT}insights/country/`, { params });
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function getSalaryByJobTitle(
    filters?: { country?: string; jobTitle?: string }
): Promise<JobTitleInsight[]> {
    try {
        const response = await api.get<JobTitleInsight[]>(
            `${ENDPOINT}insights/job-title/`,
            { params: filters ?? {} }
        );
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function getSalaryByDepartment(department?: string): Promise<DepartmentInsight[]> {
    try {
        const params = department ? { department } : {};
        const response = await api.get<DepartmentInsight[]>(`${ENDPOINT}insights/department/`, { params });
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function getSalaryByExperienceBand(): Promise<ExperienceBandInsight[]> {
    try {
        const response = await api.get<ExperienceBandInsight[]>(`${ENDPOINT}insights/experience-bands/`);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}


export const searchEmployees = async (
    search: string
): Promise<PaginatedResponse<any>> => {
    try {
        const response =
            await api.get<PaginatedResponse<any>>(
                `${ENDPOINT}?search=${encodeURIComponent(
                    search
                )}`
            );

        return {
            ...response.data,
            results: response.data.results.map((e: any) => ({
                ...e,
                firstName: e.fullName?.split(" ")[0] ?? "",
                lastName: e.fullName?.split(" ").slice(1).join(" ") ?? "",
                jobTitle: e.jobTitle ?? "",
                employmentType: e.employmentType ?? "",
                experienceYears: e.experienceYears ?? 0,
                isActive: e.isActive ?? true,
                joiningDate: e.joiningDate ?? "",
                createdAt: e.createdAt ?? "",
                updatedAt: e.updatedAt ?? "",
            })),
        };
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
};