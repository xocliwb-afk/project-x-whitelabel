import express from "express";
import cors from "cors";
import { mockListings } from "./data/mockListings";
import type {
  ListingSearchParams,
  ListingStatus,
  PropertyType,
} from "@project-x/shared-types";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Helper Parsers ---
function toNumber(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toStatuses(value: unknown): ListingStatus[] | undefined {
  if (typeof value !== "string") return undefined;
  const valid = new Set(["FOR_SALE", "PENDING", "SOLD"]);
  const statuses = value
    .split(",")
    .map((status) => status.trim())
    .filter((status) => valid.has(status)) as ListingStatus[];
  return statuses.length ? statuses : undefined;
}

function toPropertyType(value: unknown): PropertyType | undefined {
  if (typeof value !== "string") return undefined;
  const valid = ["Single Family", "Condo", "Multi-Family", "Land"];
  return valid.includes(value) ? (value as PropertyType) : undefined;
}

// --- Route ---
app.get("/api/listings", (req, res) => {
  const query = req.query;

  // 1. Parse URL params into Domain Object
  const params: ListingSearchParams = {
    q: query.q as string,
    minPrice: toNumber(query.minPrice),
    maxPrice: toNumber(query.maxPrice),
    beds: toNumber(query.beds),
    baths: toNumber(query.baths),
    status: toStatuses(query.status),
    propertyType: toPropertyType(query.propertyType),
    minSqft: toNumber(query.minSqft),
    maxDaysOnMarket: toNumber(query.maxDaysOnMarket),
  };

  // 2. Filter Logic
  let results = mockListings.filter((l) => {
    // Text Search
    if (params.q) {
      const q = params.q.toLowerCase();
      const text = `${l.address.street} ${l.address.city} ${l.address.zip} ${
        l.address.neighborhood || ""
      }`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    // Ranges & Enums
    if (params.minPrice && l.details.price < params.minPrice) return false;
    if (params.maxPrice && l.details.price > params.maxPrice) return false;
    if (params.beds && (l.details.beds ?? 0) < params.beds) return false;
    if (params.baths && (l.details.baths ?? 0) < params.baths) return false;
    if (
      params.status?.length &&
      !params.status.includes(l.details.status)
    )
      return false;
    if (
      params.propertyType &&
      l.details.propertyType !== params.propertyType
    )
      return false;
    if (params.minSqft && l.details.sqft < params.minSqft) return false;
    if (
      params.maxDaysOnMarket &&
      l.meta.daysOnMarket > params.maxDaysOnMarket
    )
      return false;

    return true;
  });

  res.json(results);
});

app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
