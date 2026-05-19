import api from "./apiInstance";
import { AxiosError } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────
export type EmploymentType = "full_time" | "part_time" | "contract";
export type EmployeeFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    jobTitle: string;
    department: string;
    country: string;
    city: string;
    salary: string;
    employmentType: EmploymentType;
    joiningDate: string;
    experience: string;
    skills: string[];
    manager: string;
};

export type Employee = EmployeeFormData & {
    id: number;
    createdAt: string;
    updatedAt: string;
};

export type ApiError = {
    status: number;
    message: string;
    // Django REST Framework returns field-level errors as { field: string[] }
    fieldErrors?: Record<string, string[]>;
};

// ── Case Converters ───────────────────────────────────────────────────────────

function camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(obj).map(([key, val]) => [camelToSnake(key), val])
    );
}

function convertKeysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(obj).map(([key, val]) => [snakeToCamel(key), val])
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseError(error: unknown): ApiError {
    if (error instanceof AxiosError) {
        const status = error.response?.status ?? 0;
        const data = error.response?.data;

        if (status === 0 || !error.response) {
            return { status: 0, message: "No response from server. Check your connection." };
        }

        // DRF non-field error (e.g. { "detail": "Not found." })
        if (typeof data?.detail === "string") {
            return { status, message: data.detail };
        }

        // DRF field-level validation errors (e.g. { "email": ["Enter a valid email."] })
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

/**
 * Create a new employee.
 * Returns the created Employee object on success.
 * Throws an ApiError on failure.
 */

export async function createEmployee(data: EmployeeFormData): Promise<Employee> {
    try {
        const response = await api.post<Employee>(ENDPOINT, data);
        return response.data; // interceptor already converted keys to camelCase
    } catch (error) {
        throw parseError(error); // fieldErrors keys also come back as camelCase
    }
}

/**
 * Fetch a single employee by ID.
 */
export async function getEmployee(id: number): Promise<Employee> {
    try {
        const response = await api.get<Employee>(`${ENDPOINT}${id}/`);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

/**
 * Fetch all employees.
 */
export async function listEmployees(): Promise<Employee[]> {
    try {
        const response = await api.get<Employee[]>(ENDPOINT);
        console.log(response.data)
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

/**
 * Update an existing employee (full update).
 */
export async function updateEmployee(id: number, data: EmployeeFormData): Promise<Employee> {
    try {
        const response = await api.put<Employee>(`${ENDPOINT}${id}/`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

/**
 * Partially update an employee (PATCH).
 */
export async function patchEmployee(
    id: number,
    data: Partial<EmployeeFormData>
): Promise<Employee> {
    try {
        const response = await api.patch<Employee>(`${ENDPOINT}${id}/`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
}

/**
 * Delete an employee by ID.
 */
export async function deleteEmployee(id: number): Promise<void> {
    try {
        await api.delete(`${ENDPOINT}${id}/`);
    } catch (error) {
        throw parseError(error);
    }
}