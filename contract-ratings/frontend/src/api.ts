import { getIdToken } from "./auth";

// A contract-level contact (lead, POC, or alternate POC). Stored as an
// element of one of the contract's contact lists. inDate/outDate are only
// meaningful for POCs; leads and alternate POCs leave them blank.
export type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  inDate: string;
  outDate: string;
};

export type Contractor = {
  id: string;
  contractId: string;
  company: string;
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
  pwsLink: string;
  contractStart: string;
  contractEnd: string;
  milestone30: string;
  milestone60: string;
  milestone90: string;
  milestone120: string;
  leads: Contact[];
  pocs: Contact[];
  alternatePocs: Contact[];
  notes: string;
  agency: string;
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
  // Contractors are nested under a contract: listed/created via the
  // parent contract's id, but read/updated/deleted/rated by their own id.
  listContractorsForContract: (contractId: string) =>
    request<{ items: Contractor[] }>(`/contracts/${contractId}/contractors`),
  createContractor: (contractId: string, body: Partial<Contractor>) =>
    request<Contractor>(`/contracts/${contractId}/contractors`, { method: "POST", body: JSON.stringify(body) }),
  getContractor: (id: string) => request<Contractor>(`/contractors/${id}`),
  updateContractor: (id: string, body: Partial<Contractor>) =>
    request<Contractor>(`/contractors/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteContractor: (id: string) => request<void>(`/contractors/${id}`, { method: "DELETE" }),
  rateContractor: (id: string, stars: number, comment?: string) =>
    request<{ avgRating: number; ratingCount: number }>(`/contractors/${id}/rating`, {
      method: "POST",
      body: JSON.stringify({ stars, comment }),
    }),

  listContracts: () => request<{ items: Contract[] }>("/contracts"),
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
