import { getIdToken } from "./auth";
import { config } from "./config";

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

export const ISSUE_STATUSES = ["To-Do", "In Progress", "Blocked", "Resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

// An issue tracked against a contract: free text plus a workflow status.
export type Issue = {
  id: string;
  text: string;
  assignee: string;
  status: IssueStatus;
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
  issues: Issue[];
  notes: string;
  agency: string;
  contractValue: number | null;
  description: string;
  pwsKey?: string;
  pwsFilename?: string;
  // Presigned download URL for the uploaded PWS, generated server-side on
  // getContract (short-lived); null/absent when there's no PWS.
  pwsDownloadUrl?: string | null;
  avgRating: number;
  ratingCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  myRating?: { stars: number; comment: string | null } | null;
};

// Result of a bulk seed-document import (POST /contracts/import).
export type ImportResult = {
  created: { id: string; contractNumber: string }[];
  skipped: string[];
  errors: string[];
  contractorCount: number;
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
  const headers: Record<string, string> = { "content-type": "application/json", ...(options.headers as Record<string, string>) };

  // Local/container build authenticates with a same-origin session
  // cookie (sent automatically), so there's no bearer token to attach.
  if (!config.localMode) {
    const token = await getIdToken();
    if (!token) throw new ApiError(401, "Not signed in");
    headers.authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });

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
  // Bulk import of a JSON seed document — an array of contracts or
  // { contracts: [...] } (same shape as scripts/seed-data-kuwait.json).
  // Existing contract numbers are skipped server-side.
  importContracts: (doc: unknown) =>
    request<ImportResult>("/contracts/import", { method: "POST", body: JSON.stringify(doc) }),
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

  // PWS document upload: ask for a presigned URL, PUT the file straight to
  // S3, then record it on the contract. Download URL comes back on
  // getContract as pwsDownloadUrl.
  getPwsUploadUrl: (contractId: string, filename: string) =>
    request<{ uploadUrl: string; key: string; filename: string }>(`/contracts/${contractId}/pws/upload-url`, {
      method: "POST",
      body: JSON.stringify({ filename }),
    }),
  recordPws: (contractId: string, key: string, filename: string) =>
    request<Contract>(`/contracts/${contractId}/pws`, { method: "POST", body: JSON.stringify({ key, filename }) }),
  removePws: (contractId: string) => request<Contract>(`/contracts/${contractId}/pws`, { method: "DELETE" }),
};

// Uploads a file directly to S3 with a presigned PUT URL. This does NOT
// use `request()` -- presigned URLs carry their own auth in the query
// string, so no Authorization header (and it must not go through /api).
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "content-type": file.type || "application/octet-stream" },
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}
