import { getIdToken } from "./auth";

export type Contractor = {
  id: string;
  name: string;
  cageCode: string;
  ueiSam: string;
  notes: string;
  avgRating: number;
  ratingCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  myRating?: { stars: number; comment: string | null } | null;
};

export type Contract = {
  id: string;
  contractNumber: string;
  title: string;
  contractorId: string;
  agency: string;
  awardDate: string;
  contractValue: number | null;
  description: string;
  avgRating: number;
  ratingCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  myRating?: { stars: number; comment: string | null } | null;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getIdToken();
  if (!token) throw new ApiError(401, "Not signed in");

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? res.statusText);
  return data as T;
}

export const api = {
  listContractors: () => request<{ items: Contractor[] }>("/contractors"),
  getContractor: (id: string) => request<Contractor>(`/contractors/${id}`),
  createContractor: (body: Partial<Contractor>) =>
    request<Contractor>("/contractors", { method: "POST", body: JSON.stringify(body) }),
  updateContractor: (id: string, body: Partial<Contractor>) =>
    request<Contractor>(`/contractors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteContractor: (id: string) => request<void>(`/contractors/${id}`, { method: "DELETE" }),
  rateContractor: (id: string, stars: number, comment?: string) =>
    request<{ avgRating: number; ratingCount: number }>(`/contractors/${id}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    }),

  listContracts: (contractorId?: string) =>
    request<{ items: Contract[] }>(`/contracts${contractorId ? `?contractorId=${contractorId}` : ""}`),
  getContract: (id: string) => request<Contract>(`/contracts/${id}`),
  createContract: (body: Partial<Contract>) =>
    request<Contract>("/contracts", { method: "POST", body: JSON.stringify(body) }),
  updateContract: (id: string, body: Partial<Contract>) =>
    request<Contract>(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteContract: (id: string) => request<void>(`/contracts/${id}`, { method: "DELETE" }),
  rateContract: (id: string, stars: number, comment?: string) =>
    request<{ avgRating: number; ratingCount: number }>(`/contracts/${id}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    }),
};
