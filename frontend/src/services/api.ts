import { ClinicalCase, CaseCreateInput, CaseStats, CaseStatus } from '../types/case';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        if (typeof errorJson.detail === 'string') {
          errorDetail = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errorDetail = errorJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
        }
      }
    } catch {
      // Non-JSON response
    }
    throw new ApiError(errorDetail, res.status);
  }
  return res.json();
}

export const api = {
  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  async getStats(): Promise<CaseStats> {
    const res = await fetch(`${API_BASE_URL}/api/stats`);
    return handleResponse<CaseStats>(res);
  },

  async getCases(status?: string, search?: string): Promise<ClinicalCase[]> {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.append('status', status);
    }
    if (search && search.trim()) {
      params.append('search', search.trim());
    }
    const url = `${API_BASE_URL}/api/cases${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    return handleResponse<ClinicalCase[]>(res);
  },

  async getCase(id: string): Promise<ClinicalCase> {
    const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(id)}`);
    return handleResponse<ClinicalCase>(res);
  },

  async createCase(input: CaseCreateInput): Promise<ClinicalCase> {
    const res = await fetch(`${API_BASE_URL}/api/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    return handleResponse<ClinicalCase>(res);
  },

  async updateCaseStatus(id: string, status: CaseStatus): Promise<ClinicalCase> {
    const res = await fetch(`${API_BASE_URL}/api/cases/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<ClinicalCase>(res);
  },

  async seedDemoCases(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/seed`, {
      method: 'POST',
    });
    return handleResponse<{ message: string }>(res);
  },
};
