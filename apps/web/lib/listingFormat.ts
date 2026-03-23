import type { Listing } from "@project-x/shared-types";

export const formatAttribution = (listing: Listing): string => {
  const name = listing.office?.name?.trim() ?? "";
  const idRaw = listing.office?.id;
  const id = idRaw != null ? String(idRaw).trim() : "";
  if (name && id) {
    return `Listed by ${name}\nData provided by SimplyRETS`;
  }
  return "Data provided by SimplyRETS";
};

export const formatAgentName = (agent?: Listing["agent"]): string | null => {
  if (!agent) return null;
  const first = agent.firstName?.trim();
  const last = agent.lastName?.trim();
  const name = [first, last].filter(Boolean).join(" ");
  return name || null;
};

export const formatOfficeName = (office?: Listing["office"]): string | null => {
  if (!office) return null;
  const name = office.name?.trim();
  return name || null;
};

export const formatSchoolDistrict = (school?: Listing["school"]): string | null => {
  if (!school) return null;
  const district = school.district?.trim();
  return district || null;
};

export const formatTax = (tax?: Listing["tax"]): string | null => {
  if (!tax) return null;
  const amount =
    typeof tax.annualAmount === "number" && Number.isFinite(tax.annualAmount)
      ? tax.annualAmount
      : null;
  const year = typeof tax.year === "number" && Number.isFinite(tax.year) ? tax.year : null;
  if (amount == null) return null;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
  if (year) return `${formattedAmount} (${year})`;
  return formattedAmount;
};

export const normalizeRemarks = (text?: string | null): string | null => {
  if (!text) return null;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;
  return normalized.replace(/\n\s*\n\s*\n+/g, "\n\n");
};

export const formatDescription = (
  text: string | null | undefined,
  variant: "card" | "modal" | "detail",
): string | null => {
  if (variant === "card") return null;
  const normalized = normalizeRemarks(text);
  if (!normalized) return null;
  if (variant === "detail") return normalized;
  const limit = 250;
  if (normalized.length <= limit) return normalized;
  return normalized.slice(0, limit);
};

export const formatPrice = (listing: Listing): string => {
  if (listing.listPriceFormatted?.trim()) return listing.listPriceFormatted;
  const price = typeof listing.listPrice === "number" ? listing.listPrice : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatAddressFull = (listing: Listing): string => {
  const full = listing.address?.full?.trim();
  if (full) return full;
  const parts = [
    listing.address?.street,
    [listing.address?.city, listing.address?.state].filter(Boolean).join(", "),
    listing.address?.zip,
  ]
    .filter((part) => Boolean(part && String(part).trim().length > 0))
    .map((p) => String(p).trim());
  return parts.join(", ") || "Address unavailable";
};

export const formatAddressCityStateZip = (listing: Listing): string => {
  const parts = [listing.address?.city, listing.address?.state, listing.address?.zip]
    .filter((part) => Boolean(part && String(part).trim().length > 0))
    .map((p) => String(p).trim());
  return parts.join(", ");
};

export const formatStatus = (status?: string | null): string => {
  if (!status || !status.trim()) return "Unknown";
  return status.replace(/_/g, " ");
};

export const getStatusBadgeClasses = (status?: string | null): string => {
  const normalized = status?.toUpperCase() ?? "UNKNOWN";
  if (normalized === "ACTIVE" || normalized === "FOR_SALE") {
    return "bg-green-100 text-green-800";
  }
  if (normalized.includes("PENDING")) {
    return "bg-amber-100 text-amber-800";
  }
  if (normalized.includes("SOLD")) {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-slate-200 text-slate-700";
};

export const formatSqft = (sqft?: number | null): string | null => {
  if (typeof sqft === "number" && sqft > 0) return sqft.toLocaleString();
  return null;
};

export const formatLotSize = (lotSize?: number | null): string | null => {
  if (typeof lotSize === "number" && lotSize > 0) {
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(lotSize)} ac`;
  }
  return null;
};

export const formatYearBuilt = (year?: number | null): string | null => {
  if (typeof year === "number" && year > 0) return String(year);
  return null;
};

export const formatHOAFees = (hoa?: number | null): string | null => {
  if (typeof hoa === "number" && hoa > 0) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(hoa);
  }
  return null;
};

export const formatBasement = (basement?: string | null): string | null => {
  if (!basement || !basement.trim()) return null;
  return basement.trim();
};

export const formatPropertyType = (type?: string | null): string | null => {
  if (!type || !type.trim()) return null;
  return type.trim();
};

export const formatDaysOnMarketShort = (dom?: number | null): string | null => {
  if (typeof dom === "number" && dom > 0) return `${dom} DOM`;
  return null;
};

export const formatDaysOnMarketFull = (dom?: number | null): string | null => {
  if (typeof dom === "number" && dom > 0) return `${dom} days on market`;
  return null;
};

export const getThumbnailUrl = (listing: Listing): string =>
  listing.media?.thumbnailUrl ||
  listing.media?.photos?.[0] ||
  "/placeholder-house.jpg";

export const formatMLSAttribution = (listing: Listing): string => formatAttribution(listing);

export const getListingDetailsRows = (listing: Listing): Array<{ label: string; value: string }> => {
  const rows: Array<{ label: string; value: string }> = [];
  const agent = formatAgentName(listing.agent);
  const coAgent = formatAgentName(listing.coAgent);
  const office = formatOfficeName(listing.office);
  const school = formatSchoolDistrict(listing.school);
  const tax = formatTax(listing.tax);

  if (agent) rows.push({ label: "Agent", value: agent });
  if (coAgent) rows.push({ label: "Co-Agent", value: coAgent });
  if (office) rows.push({ label: "Brokerage", value: office });
  if (school) rows.push({ label: "School District", value: school });
  if (tax) rows.push({ label: "Tax", value: tax });

  return rows;
};
