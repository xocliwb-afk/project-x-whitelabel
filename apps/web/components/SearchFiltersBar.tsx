"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useTransition,
  useCallback,
  type MutableRefObject,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { geocodeLocation } from "@/lib/geocode-client";
import { smartSubmit } from "@/lib/search/smartSubmit";

type ActiveFilter =
  | null
  | "status"
  | "price"
  | "beds"
  | "baths"
  | "propertyType"
  | "more";

const chipBase =
  "flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap";
const chipActive = "border-orange-500 bg-orange-500 text-white";
const chipInactive =
  "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

const STATUS_OPTIONS = [
  { label: "For Sale", value: "FOR_SALE" },
  { label: "Pending", value: "PENDING" },
  { label: "Sold", value: "SOLD" },
];

const PROPERTY_TYPE_OPTIONS = [
  { label: "Single Family", value: "Single Family" },
  { label: "Condo", value: "Condo" },
  { label: "Multi-Family", value: "Multi-Family" },
  { label: "Land", value: "Land" },
];

const BEDS_OPTIONS = [
  { label: "Any", value: "0" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

const BATHS_OPTIONS = [
  { label: "Any", value: "0" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
];

const PRICE_OPTIONS = [
  { label: "No min", value: "" },
  { label: "$100k", value: "100000" },
  { label: "$150k", value: "150000" },
  { label: "$200k", value: "200000" },
  { label: "$250k", value: "250000" },
  { label: "$300k", value: "300000" },
  { label: "$400k", value: "400000" },
  { label: "$500k", value: "500000" },
  { label: "$750k", value: "750000" },
  { label: "$1M", value: "1000000" },
  { label: "$1.5M", value: "1500000" },
  { label: "$2M", value: "2000000" },
];

const DOM_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1 day", value: "1" },
  { label: "Less than 3", value: "3" },
  { label: "Less than 7", value: "7" },
  { label: "Less than 30", value: "30" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Days on Market", value: "dom" },
];

type SearchFiltersBarProps = {
  layout?: "inline" | "drawer";
};

export default function SearchFiltersBar({ layout = "inline" }: SearchFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dropdownLeft, setDropdownLeft] = useState<number | null>(null);
  const chipRefs: MutableRefObject<Record<string, HTMLButtonElement | null>> =
    useRef({});

  const [text, setText] = useState(searchParams.get("q") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
  const [minBeds, setMinBeds] = useState(searchParams.get("beds") || "");
  const [minBaths, setMinBaths] = useState(searchParams.get("baths") || "");
  const [propertyType, setPropertyType] = useState(
    searchParams.get("propertyType") || ""
  );
  const [minSqft, setMinSqft] = useState(searchParams.get("minSqft") || "");
  const [maxSqft, setMaxSqft] = useState(searchParams.get("maxSqft") || "");
  const [minYearBuilt, setMinYearBuilt] = useState(
    searchParams.get("minYearBuilt") || ""
  );
  const [maxYearBuilt, setMaxYearBuilt] = useState(
    searchParams.get("maxYearBuilt") || ""
  );
  const [maxDaysOnMarket, setMaxDaysOnMarket] = useState(
    searchParams.get("maxDaysOnMarket") || ""
  );
  const [keywords, setKeywords] = useState(searchParams.get("keywords") || "");

  // New filter states for More panel
  const [cities, setCities] = useState(searchParams.getAll("cities").join(", ") || "");
  const [postalCodes, setPostalCodes] = useState(searchParams.getAll("postalCodes").join(", ") || "");
  const [counties, setCounties] = useState(searchParams.getAll("counties").join(", ") || "");
  const [neighborhoods, setNeighborhoods] = useState(searchParams.getAll("neighborhoods").join(", ") || "");
  const [features, setFeatures] = useState(searchParams.getAll("features").join(", ") || "");
  const [subtype, setSubtype] = useState(searchParams.getAll("subtype").join(", ") || "");
  const [agent, setAgent] = useState(searchParams.getAll("agent").join(", ") || "");
  const [brokers, setBrokers] = useState(searchParams.getAll("brokers").join(", ") || "");
  const [maxBeds, setMaxBeds] = useState(searchParams.get("maxBeds") || "");
  const [maxBaths, setMaxBaths] = useState(searchParams.get("maxBaths") || "");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse comma/semicolon-separated string into trimmed array, dropping empties
  const parseMulti = useCallback((value: string): string[] => {
    return value
      .split(/[,;]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOmniboxSubmit = useCallback(async () => {
    const q = text.trim();
    if (!q) return;
    setIsSubmitting(true);
    try {
      const baseParams =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams.toString());
      const { params, warnings } = await smartSubmit({ query: q, baseParams });
      if (warnings.length > 0) {
        console.warn('[SearchFiltersBar] smartSubmit completed with warnings:', warnings);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    } finally {
      setIsSubmitting(false);
    }
  }, [pathname, router, searchParams, text]);

  const handleOmniboxEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      void handleOmniboxSubmit();
    },
    [handleOmniboxSubmit],
  );

  const applyArrayParams = (
    params: URLSearchParams,
    arrays: Record<string, string[]>,
  ) => {
    Object.entries(arrays).forEach(([key, values]) => {
      params.delete(key);
      values
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => params.append(key, v));
    });
  };

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      params.set("searchToken", Date.now().toString());

      startTransition(() => {
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  // Update params with array support (for repeated query params)
  const updateParamsWithArrays = useCallback(
    (
      scalarUpdates: Record<string, string | null>,
      arrayUpdates: Record<string, string[]>,
    ) => {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams.toString());

      // Handle scalar updates
      Object.entries(scalarUpdates).forEach(([key, value]) => {
        if (value && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Handle array updates (delete then append)
      Object.entries(arrayUpdates).forEach(([key, values]) => {
        params.delete(key);
        values
          .map((v) => v.trim())
          .filter(Boolean)
          .forEach((v) => {
            params.append(key, v);
          });
      });
      params.set("searchToken", Date.now().toString());

      startTransition(() => {
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, searchParams, startTransition],
  );

  useEffect(() => {
    const nextText = searchParams.get("q") || "";
    if (nextText !== text) setText(nextText);
    const nextMinPrice = searchParams.get("minPrice") || "";
    if (nextMinPrice !== minPrice) setMinPrice(nextMinPrice);
    const nextMaxPrice = searchParams.get("maxPrice") || "";
    if (nextMaxPrice !== maxPrice) setMaxPrice(nextMaxPrice);
    const nextMinBeds = searchParams.get("beds") || "";
    if (nextMinBeds !== minBeds) setMinBeds(nextMinBeds);
    const nextMinBaths = searchParams.get("baths") || "";
    if (nextMinBaths !== minBaths) setMinBaths(nextMinBaths);
    const nextPropertyType = searchParams.get("propertyType") || "";
    if (nextPropertyType !== propertyType) setPropertyType(nextPropertyType);
    const nextMinSqft = searchParams.get("minSqft") || "";
    if (nextMinSqft !== minSqft) setMinSqft(nextMinSqft);
    const nextMaxSqft = searchParams.get("maxSqft") || "";
    if (nextMaxSqft !== maxSqft) setMaxSqft(nextMaxSqft);
    const nextMinYearBuilt = searchParams.get("minYearBuilt") || "";
    if (nextMinYearBuilt !== minYearBuilt) setMinYearBuilt(nextMinYearBuilt);
    const nextMaxYearBuilt = searchParams.get("maxYearBuilt") || "";
    if (nextMaxYearBuilt !== maxYearBuilt) setMaxYearBuilt(nextMaxYearBuilt);
    const nextMaxDom = searchParams.get("maxDaysOnMarket") || "";
    if (nextMaxDom !== maxDaysOnMarket) setMaxDaysOnMarket(nextMaxDom);
    const nextKeywords = searchParams.get("keywords") || "";
    if (nextKeywords !== keywords) setKeywords(nextKeywords);
    const nextCities = searchParams.getAll("cities").join(", ");
    if (nextCities !== cities) setCities(nextCities);
    const nextPostalCodes = searchParams.getAll("postalCodes").join(", ");
    if (nextPostalCodes !== postalCodes) setPostalCodes(nextPostalCodes);
    const nextCounties = searchParams.getAll("counties").join(", ");
    if (nextCounties !== counties) setCounties(nextCounties);
    const nextNeighborhoods = searchParams.getAll("neighborhoods").join(", ");
    if (nextNeighborhoods !== neighborhoods) setNeighborhoods(nextNeighborhoods);
    const nextFeatures = searchParams.getAll("features").join(", ");
    if (nextFeatures !== features) setFeatures(nextFeatures);
    const nextSubtype = searchParams.getAll("subtype").join(", ");
    if (nextSubtype !== subtype) setSubtype(nextSubtype);
    const nextAgent = searchParams.getAll("agent").join(", ");
    if (nextAgent !== agent) setAgent(nextAgent);
    const nextBrokers = searchParams.getAll("brokers").join(", ");
    if (nextBrokers !== brokers) setBrokers(nextBrokers);
    const nextMaxBeds = searchParams.get("maxBeds") || "";
    if (nextMaxBeds !== maxBeds) setMaxBeds(nextMaxBeds);
    const nextMaxBaths = searchParams.get("maxBaths") || "";
    if (nextMaxBaths !== maxBaths) setMaxBaths(nextMaxBaths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openFilter = (filter: ActiveFilter, chipKey: string) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
      return;
    }
    const chip = chipRefs.current[chipKey];
    if (chip && barRef.current) {
      const chipRect = chip.getBoundingClientRect();
      const barRect = barRef.current.getBoundingClientRect();
      const center = chipRect.left + chipRect.width / 2;
      const relative = center - barRect.left;
      setDropdownLeft(relative);
    } else {
      setDropdownLeft(null);
    }
    setActiveFilter(filter);
  };

  const clearStatus = () => updateParams({ status: null });
  const clearPrice = () => {
    setMinPrice("");
    setMaxPrice("");
    updateParams({ minPrice: null, maxPrice: null });
  };
  const clearBeds = () => {
    setMinBeds("");
    updateParams({ beds: null });
  };
  const clearBaths = () => {
    setMinBaths("");
    updateParams({ baths: null });
  };
  const clearPropertyType = () => {
    setPropertyType("");
    updateParams({ propertyType: null });
  };
  const clearMore = () => {
    setMinSqft("");
    setMaxSqft("");
    setMinYearBuilt("");
    setMaxYearBuilt("");
    setMaxDaysOnMarket("");
    setKeywords("");
    setCities("");
    setPostalCodes("");
    setCounties("");
    setNeighborhoods("");
    setFeatures("");
    setSubtype("");
    setAgent("");
    setBrokers("");
    setMaxBeds("");
    setMaxBaths("");
    updateParamsWithArrays(
      {
        minSqft: null,
        maxSqft: null,
        minYearBuilt: null,
        maxYearBuilt: null,
        maxDaysOnMarket: null,
        keywords: null,
        maxBeds: null,
        maxBaths: null,
      },
      {
        cities: [],
        postalCodes: [],
        counties: [],
        neighborhoods: [],
        features: [],
        subtype: [],
        agent: [],
        brokers: [],
      },
    );
  };

  const handleApplyMoreFilters = useCallback(async () => {
    const prevParams =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());
    const nextParams = new URLSearchParams(prevParams.toString());

    const applyScalar = (key: string, value: string) => {
      if (value && value !== "") {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    };

    applyScalar("minSqft", minSqft);
    applyScalar("maxSqft", maxSqft);
    applyScalar("minYearBuilt", minYearBuilt);
    applyScalar("maxYearBuilt", maxYearBuilt);
    applyScalar("maxDaysOnMarket", maxDaysOnMarket);
    applyScalar("keywords", keywords);
    applyScalar("maxBeds", maxBeds);
    applyScalar("maxBaths", maxBaths);

    applyArrayParams(nextParams, {
      cities: parseMulti(cities),
      postalCodes: parseMulti(postalCodes),
      counties: parseMulti(counties),
      neighborhoods: parseMulti(neighborhoods),
      features: parseMulti(features),
      subtype: parseMulti(subtype),
      agent: parseMulti(agent),
      brokers: parseMulti(brokers),
    });

    const joinVals = (p: URLSearchParams, key: string) =>
      p
        .getAll(key)
        .map((v) => v.trim())
        .filter(Boolean)
        .join("|");

    const locationKeys = ["cities", "postalCodes", "counties", "neighborhoods"];
    const locationChanged = locationKeys.some(
      (key) => joinVals(prevParams, key) !== joinVals(nextParams, key),
    );

    if (locationChanged) {
      const nextCities = nextParams.getAll("cities").filter(Boolean);
      const nextZips = nextParams.getAll("postalCodes").filter(Boolean);
      const nextNeighborhoods = nextParams.getAll("neighborhoods").filter(Boolean);
      const nextCounties = nextParams.getAll("counties").filter(Boolean);
      const query =
        nextCities[0] ??
        nextZips[0] ??
        nextNeighborhoods[0] ??
        nextCounties[0] ??
        "";
      if (query) {
        const geo = await geocodeLocation(query);
        if (geo?.bbox) {
          nextParams.set("bbox", geo.bbox);
        }
      }
    }

    nextParams.set("searchToken", Date.now().toString());
    startTransition(() => {
      const qs = nextParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
    setActiveFilter(null);
  }, [
    brokers,
    agent,
    counties,
    cities,
    features,
    keywords,
    maxBaths,
    maxBeds,
    maxDaysOnMarket,
    maxSqft,
    maxYearBuilt,
    minSqft,
    minYearBuilt,
    neighborhoods,
    parseMulti,
    pathname,
    postalCodes,
    router,
    searchParams,
    setActiveFilter,
    startTransition,
    subtype,
  ]);

  const handleMorePanelKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter") return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const tag = target.tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON" || target.isContentEditable) return;
      if (tag === "INPUT" || tag === "SELECT") {
        e.preventDefault();
        void handleApplyMoreFilters();
      }
    },
    [handleApplyMoreFilters],
  );

  const currentStatus = searchParams.get("status");
  const statusLabel =
    STATUS_OPTIONS.find((opt) => opt.value === currentStatus)?.label || "Status";

  const priceLabel =
    minPrice || maxPrice
      ? `$${minPrice || "0"} - ${maxPrice ? `$${maxPrice}` : "Any"}`
      : "Price";

  const bedsLabel = minBeds ? `${minBeds}+ Beds` : "Beds";
  const bathsLabel = minBaths ? `${minBaths}+ Baths` : "Baths";
  const typeLabel = propertyType || "Home Type";

  const moreActive = Boolean(
    minSqft ||
      maxSqft ||
      minYearBuilt ||
      maxYearBuilt ||
      maxDaysOnMarket ||
      keywords ||
      cities ||
      postalCodes ||
      counties ||
      neighborhoods ||
      features ||
      subtype ||
      agent ||
      brokers ||
      maxBeds ||
      maxBaths,
  );

  const dropdownStyle: CSSProperties = dropdownLeft === null
    ? { left: "50%", transform: "translateX(-50%)" }
    : { left: dropdownLeft, transform: "translateX(-50%)" };

  const renderStatusDropdown = () => (
    <div className="w-72 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Status</span>
        <button onClick={clearStatus} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              updateParams({ status: opt.value });
              setActiveFilter(null);
            }}
            className={`rounded px-2 py-1 text-left transition ${
              currentStatus === opt.value
                ? "bg-orange-500 text-white"
                : "hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPriceDropdown = () => (
    <div className="w-72 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Price</span>
        <button onClick={clearPrice} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-main/70">
          Min price
          <select
            className="w-full rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          >
            {PRICE_OPTIONS.map((opt) => (
              <option key={opt.value || 'min-none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-main/70">
          Max price
          <select
            className="w-full rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          >
            {[{ label: "No max", value: "" }, ...PRICE_OPTIONS.slice(1)].map((opt) => (
              <option key={opt.value || 'max-none'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        className="mt-3 w-full rounded-full bg-orange-500 py-1.5 text-white"
        onClick={() => {
          updateParams({ minPrice, maxPrice });
          setActiveFilter(null);
        }}
      >
        Apply
      </button>
    </div>
  );

  const renderBedsDropdown = () => (
    <div className="w-72 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Bedrooms</span>
        <button onClick={clearBeds} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BEDS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setMinBeds(opt.value === "0" ? "" : opt.value);
              updateParams({ beds: opt.value === "0" ? null : opt.value });
              setActiveFilter(null);
            }}
            className={`rounded border border-border px-2 py-1 text-center text-sm ${
              minBeds === opt.value ? "bg-orange-500 text-white" : ""
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderBathsDropdown = () => (
    <div className="w-72 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Bathrooms</span>
        <button onClick={clearBaths} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {BATHS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setMinBaths(opt.value === "0" ? "" : opt.value);
              updateParams({ baths: opt.value === "0" ? null : opt.value });
              setActiveFilter(null);
            }}
            className={`rounded border border-border px-2 py-1 text-center text-sm ${
              minBaths === opt.value ? "bg-orange-500 text-white" : ""
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPropertyTypeDropdown = () => (
    <div className="w-72 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Home Type</span>
        <button onClick={clearPropertyType} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {PROPERTY_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setPropertyType(opt.value);
              updateParams({ propertyType: opt.value });
              setActiveFilter(null);
            }}
            className={`rounded px-2 py-1 text-left transition ${
              propertyType === opt.value
                ? "bg-orange-500 text-white"
                : "hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderMoreDropdown = () => (
    <div
      data-testid="more-filters-panel"
      onKeyDown={handleMorePanelKeyDown}
      className="w-[90vw] max-w-full lg:max-w-3xl rounded-2xl border border-border bg-white p-6 text-sm shadow-2xl dark:bg-slate-900"
    >
      <div className="mb-4 flex items-center justify-between text-xs text-text-main/70">
        <span className="font-semibold uppercase tracking-wider">Advanced Filters</span>
        <button onClick={clearMore} className="text-orange-500">
          Clear
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Location */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main/60">
            Location
          </h4>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Cities
            <input
              type="text"
              data-testid="more-filter-cities"
              placeholder="Grand Rapids, Detroit..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={cities}
              onChange={(e) => setCities(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            ZIP Codes
            <input
              type="text"
              data-testid="more-filter-postalCodes"
              placeholder="49503, 48201..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={postalCodes}
              onChange={(e) => setPostalCodes(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Counties
            <input
              type="text"
              data-testid="more-filter-counties"
              placeholder="Kent, Wayne..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={counties}
              onChange={(e) => setCounties(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Neighborhoods
            <input
              type="text"
              data-testid="more-filter-neighborhoods"
              placeholder="East Hills, Midtown..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={neighborhoods}
              onChange={(e) => setNeighborhoods(e.target.value)}
            />
          </label>
        </div>

        {/* Column 2: Size & Age + Beds/Baths */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main/60">
            Size &amp; Age
          </h4>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Square Feet
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={minSqft}
                onChange={(e) => setMinSqft(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={maxSqft}
                onChange={(e) => setMaxSqft(e.target.value)}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Year Built
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={minYearBuilt}
                onChange={(e) => setMinYearBuilt(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={maxYearBuilt}
                onChange={(e) => setMaxYearBuilt(e.target.value)}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Max Beds / Baths
            <div className="flex gap-2">
              <input
                type="number"
                data-testid="more-filter-maxBeds"
                placeholder="Max beds"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={maxBeds}
                onChange={(e) => setMaxBeds(e.target.value)}
              />
              <input
                type="number"
                data-testid="more-filter-maxBaths"
                placeholder="Max baths"
                className="w-1/2 rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
                value={maxBaths}
                onChange={(e) => setMaxBaths(e.target.value)}
              />
            </div>
          </label>
        </div>

        {/* Column 3: Amenities & Other */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main/60">
            Amenities &amp; Other
          </h4>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Keywords
            <input
              type="text"
              placeholder="Pool, fixer upper..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Features
            <input
              type="text"
              data-testid="more-filter-features"
              placeholder="Pool, Garage..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Subtype
            <input
              type="text"
              data-testid="more-filter-subtype"
              placeholder="Townhouse, Duplex..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Days on Market
            <select
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={maxDaysOnMarket}
              onChange={(e) => setMaxDaysOnMarket(e.target.value)}
            >
              {DOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Agent IDs
            <input
              type="text"
              data-testid="more-filter-agent"
              placeholder="Agent IDs..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-main/70">
            Broker IDs
            <input
              type="text"
              data-testid="more-filter-brokers"
              placeholder="Broker IDs..."
              className="rounded border border-border bg-white px-2 py-1 dark:bg-slate-800"
              value={brokers}
              onChange={(e) => setBrokers(e.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end">
        <button
          data-testid="more-filters-apply"
          className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white"
          onClick={() => {
            void handleApplyMoreFilters();
          }}
        >
          Apply Filters
        </button>
      </div>
    </div>
  );

  return (
    <div ref={barRef} className="relative w-full">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-3">
        <div className="w-full sm:w-1/3 md:w-1/3 lg:w-1/3 sm:ml-2">
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.3em] text-text-main/70 dark:text-slate-300 sm:inline">
              Search
            </span>
            <input
              type="text"
              data-testid="search-pill-input"
              className="w-full border-none bg-transparent p-0 text-sm text-text-main dark:text-slate-100 placeholder:text-text-secondary dark:placeholder:text-slate-400 placeholder:opacity-100 focus:outline-none"
              placeholder="City, ZIP, Address"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleOmniboxEnter}
            />
            <button
              type="button"
              data-testid="search-submit-btn"
              disabled={isSubmitting || !text.trim()}
              onClick={() => void handleOmniboxSubmit()}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-40"
              aria-label="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex w-full max-w-full flex-wrap items-center justify-center gap-2 overflow-x-hidden pb-1 sm:pb-0 lg:w-auto lg:max-w-none lg:flex-1 lg:flex-nowrap lg:justify-start lg:overflow-x-auto">
          <button
            ref={(el) => {
              chipRefs.current.status = el;
            }}
            type="button"
            onClick={() => openFilter("status", "status")}
            className={`${chipBase} ${currentStatus ? chipActive : chipInactive}`}
          >
            {statusLabel}
          </button>
          <button
            ref={(el) => {
              chipRefs.current.price = el;
            }}
            type="button"
            onClick={() => openFilter("price", "price")}
            className={`${chipBase} ${minPrice || maxPrice ? chipActive : chipInactive}`}
          >
            {priceLabel}
          </button>
          <button
            ref={(el) => {
              chipRefs.current.beds = el;
            }}
            type="button"
            onClick={() => openFilter("beds", "beds")}
            className={`${chipBase} ${minBeds ? chipActive : chipInactive}`}
          >
            {bedsLabel}
          </button>
          <button
            ref={(el) => {
              chipRefs.current.baths = el;
            }}
            type="button"
            onClick={() => openFilter("baths", "baths")}
            className={`${chipBase} ${minBaths ? chipActive : chipInactive}`}
          >
            {bathsLabel}
          </button>
          <button
            ref={(el) => {
              chipRefs.current.propertyType = el;
            }}
            type="button"
            onClick={() => openFilter("propertyType", "propertyType")}
            className={`${chipBase} ${propertyType ? chipActive : chipInactive}`}
          >
            {typeLabel}
          </button>
          <button
            ref={(el) => {
              chipRefs.current.more = el;
            }}
            type="button"
            onClick={() => openFilter("more", "more")}
            className={`${chipBase} ${moreActive ? chipActive : chipInactive}`}
          >
            More
          </button>
        </div>
      </div>

      {activeFilter && (
        <div
          className={
            layout === "drawer"
              ? "absolute left-0 right-0 top-full z-50 mt-2 flex justify-center px-2"
              : "absolute left-0 top-full z-50 mt-2"
          }
          style={layout === "drawer" ? undefined : dropdownStyle}
        >
          {activeFilter === "status" && renderStatusDropdown()}
          {activeFilter === "price" && renderPriceDropdown()}
          {activeFilter === "beds" && renderBedsDropdown()}
          {activeFilter === "baths" && renderBathsDropdown()}
          {activeFilter === "propertyType" && renderPropertyTypeDropdown()}
          {activeFilter === "more" && renderMoreDropdown()}
        </div>
      )}
    </div>
  );
}

export function SortButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sort = searchParams.get("sort") || "";
  const sortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sort)?.label || "Sort";

  const updateSort = (value: string | null) => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    params.set("searchToken", Date.now().toString());
    startTransition(() => {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const baseClasses =
    "h-10 flex items-center rounded-full border px-4 text-sm font-semibold transition-colors whitespace-nowrap";
  const activeClasses = "border-orange-500 bg-orange-500 text-white";
  const inactiveClasses =
    "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={`${baseClasses} ${sort ? activeClasses : inactiveClasses}`}
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
      >
        {sortLabel}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-white p-4 text-sm shadow-xl dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between text-xs text-text-main/70">
            <span className="font-semibold uppercase tracking-wider">Sort</span>
            <button onClick={() => updateSort(null)} className="text-orange-500">
              Clear
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  updateSort(opt.value);
                  setOpen(false);
                }}
                className={`rounded px-2 py-1 text-left transition ${
                  sort === opt.value ? "bg-orange-500 text-white" : "hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
