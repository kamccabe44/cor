// Server-side helpers for pulling public federal contract award data from
// USASpending.gov (https://api.usaspending.gov). No API key is required.
//
// NOTE: This was implemented against the documented v2 API contract
// (https://api.usaspending.gov/docs/endpoints). Outbound network access was
// blocked in the development sandbox this app was built in, so these calls
// could not be live-tested during development. Field extraction is written
// defensively (optional chaining + fallbacks) to tolerate minor schema
// drift, but verify against the live docs if results look wrong.

const BASE_URL = "https://api.usaspending.gov";

export interface AwardSearchResult {
  awardId: string;
  piid: string | null;
  recipientName: string | null;
  startDate: string | null;
  endDate: string | null;
  awardAmount: number | null;
  awardingAgency: string | null;
  awardingSubAgency: string | null;
  awardType: string | null;
  description: string | null;
}

export async function searchAwards(keyword: string): Promise<AwardSearchResult[]> {
  const res = await fetch(`${BASE_URL}/api/v2/search/spending_by_award/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filters: {
        award_type_codes: ["A", "B", "C", "D"],
        keywords: [keyword],
      },
      fields: [
        "Award ID",
        "Recipient Name",
        "Start Date",
        "End Date",
        "Award Amount",
        "Awarding Agency",
        "Awarding Sub Agency",
        "Contract Award Type",
        "Description",
      ],
      page: 1,
      limit: 15,
      sort: "Award Amount",
      order: "desc",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`USASpending search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  return results.map((r: Record<string, unknown>) => ({
    awardId: String(r["generated_internal_id"] ?? r["internal_id"] ?? r["generated_unique_award_id"] ?? ""),
    piid: (r["Award ID"] as string) ?? null,
    recipientName: (r["Recipient Name"] as string) ?? null,
    startDate: (r["Start Date"] as string) ?? null,
    endDate: (r["End Date"] as string) ?? null,
    awardAmount: typeof r["Award Amount"] === "number" ? (r["Award Amount"] as number) : null,
    awardingAgency: (r["Awarding Agency"] as string) ?? null,
    awardingSubAgency: (r["Awarding Sub Agency"] as string) ?? null,
    awardType: (r["Contract Award Type"] as string) ?? null,
    description: (r["Description"] as string) ?? null,
  }));
}

export interface AwardDetail {
  awardId: string;
  piid: string | null;
  title: string | null;
  vendorName: string | null;
  uei: string | null;
  naicsCode: string | null;
  pscCode: string | null;
  popStart: string | null;
  popEnd: string | null;
  baseValue: number | null;
  totalValueWithOptions: number | null;
  obligatedAmount: number | null;
  placeOfPerformance: string | null;
  awardingAgency: string | null;
  fundingSource: string | null;
}

export async function getAwardDetail(awardId: string): Promise<AwardDetail> {
  const res = await fetch(`${BASE_URL}/api/v2/awards/${encodeURIComponent(awardId)}/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`USASpending award lookup failed: ${res.status} ${res.statusText}`);
  }

  const a = await res.json();

  const pop = a?.period_of_performance ?? {};
  const recipient = a?.recipient ?? {};
  const popLoc = a?.place_of_performance ?? {};
  const awardingAgency = a?.awarding_agency ?? {};
  const fundingAgency = a?.funding_agency ?? {};

  const placeOfPerformance = [popLoc?.city_name, popLoc?.state_code, popLoc?.country_name]
    .filter(Boolean)
    .join(", ") || null;

  const fundingSource = [fundingAgency?.toptier_agency?.name, fundingAgency?.subtier_agency?.name]
    .filter(Boolean)
    .join(" / ") || [awardingAgency?.toptier_agency?.name, awardingAgency?.subtier_agency?.name]
    .filter(Boolean)
    .join(" / ") || null;

  return {
    awardId: String(a?.generated_unique_award_id ?? awardId),
    piid: a?.piid ?? null,
    title: a?.description ?? null,
    vendorName: recipient?.recipient_name ?? null,
    uei: recipient?.recipient_uei ?? null,
    naicsCode: a?.naics ?? a?.naics_hierarchy?.[0]?.code ?? null,
    pscCode: a?.psc_hierarchy?.base_code?.code ?? a?.psc ?? null,
    popStart: pop?.start_date ?? null,
    popEnd: pop?.potential_end_date ?? pop?.end_date ?? null,
    baseValue: typeof a?.base_exercised_options_value === "string"
      ? Number(a.base_exercised_options_value)
      : a?.base_exercised_options_value ?? null,
    totalValueWithOptions: typeof a?.base_and_all_options_value === "string"
      ? Number(a.base_and_all_options_value)
      : a?.base_and_all_options_value ?? null,
    obligatedAmount: typeof a?.total_obligation === "string" ? Number(a.total_obligation) : a?.total_obligation ?? null,
    placeOfPerformance,
    awardingAgency: [awardingAgency?.toptier_agency?.name, awardingAgency?.subtier_agency?.name]
      .filter(Boolean)
      .join(" / ") || null,
    fundingSource,
  };
}
