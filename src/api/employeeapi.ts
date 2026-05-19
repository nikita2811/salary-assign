import api from "./apiInstance";
import { AxiosError } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EmploymentType = "" | "full_time" | "part_time" | "contractor";

export type EmployeeFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    department: string;
    country: string;
    city: string;
    salary: number;           // ✅ was string, Django DecimalField returns number
    employmentType: EmploymentType;
    joiningDate: string;
    experienceYears: number;  // ✅ was experience: string, matches Django experience_years
    skills: string[];
    manager: string;
};

export type Employee = EmployeeFormData & {
    id: string;
    isActive: boolean;        // ✅ was missing
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

export async function listEmployees(): Promise<Employee[]> {
    try {
        const response = await api.get<PaginatedResponse<Employee>>(ENDPOINT);
        return response.data.results.map((e: any) => ({
            ...e,
            firstName: e.fullName?.split(" ")[0] ?? "",
            lastName: e.fullName?.split(" ").slice(1).join(" ") ?? "",
        }));
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
    id: string,                    // ✅ was number
    data: Partial<EmployeeFormData>
): Promise<Employee> {
    try {
        const response = await api.patch<Employee>(`${ENDPOINT}${id}/`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

export async function deleteEmployee(id: string): Promise<void> {  // ✅ was number
    try {
        await api.delete(`${ENDPOINT}${id}/`);
    } catch (error) {
        throw parseError(error);
    }
}