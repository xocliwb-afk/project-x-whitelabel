import { parseSearchPrompt } from '@/lib/ai/parseSearchPrompt';
import { geocodeLocation } from '@/lib/geocode-client';

export type SmartSubmitInput = { query: string; baseParams: URLSearchParams };
export type SmartSubmitOutput = {
  params: URLSearchParams;
  didUseAI: boolean;
  warnings: string[];
};

const STATUS_MAP: Record<string, string> = {
  for_sale: 'FOR_SALE',
  pending: 'PENDING',
  sold: 'SOLD',
};

const PROPERTY_MAP: Record<string, string> = {
  house: 'Single Family',
  condo: 'Condo',
  townhome: 'Townhome',
  land: 'Land',
  multi_family: 'Multi-Family',
};

const FILTER_TOKENS = [
  'under',
  'over',
  'below',
  'above',
  '$',
  'bed',
  'bath',
  'beds',
  'baths',
  'bedrooms',
  'bathrooms',
  'sqft',
  'pending',
  'sold',
  'for sale',
  'with',
  'has',
  'pool',
  'waterfront',
  'garage',
  'price',
];

const zipRegex = /\b\d{5}\b/;
const cityLikeRegex = /^[a-zA-Z]+(?:[\s'-][a-zA-Z]+)*(?:,?\s*[A-Za-z]{2})?$/;

function looksLikePureLocation(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  const hasFilterToken = FILTER_TOKENS.some((t) => lower.includes(t));
  const hasPricePattern = /\$\s*\d|\b\d+\s*k\b|\b\d{6}\b/i.test(lower);
  if (hasFilterToken || hasPricePattern) return false;
  if (/^\d{5}$/.test(trimmed)) return true;
  if (/^\d+\s+\S+/.test(trimmed)) return true;
  if (/\d/.test(trimmed)) return false;
  return cityLikeRegex.test(trimmed);
}

function applyScalar(params: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value == null || value === '') {
    params.delete(key);
  } else {
    params.set(key, String(value));
  }
}

function warn(warnings: string[], msg: string, context?: Record<string, unknown>) {
  const full = context ? `[smartSubmit] ${msg} ${JSON.stringify(context)}` : `[smartSubmit] ${msg}`;
  warnings.push(full);
  console.warn(full);
}

export async function smartSubmit({ query, baseParams }: SmartSubmitInput): Promise<SmartSubmitOutput> {
  const q = (query || '').trim();
  if (!q) return { params: baseParams, didUseAI: false, warnings: [] };

  const warnings: string[] = [];
  const params = new URLSearchParams(baseParams.toString());
  params.set('q', q);
  params.set('searchToken', Date.now().toString());

  const isPureLocation = looksLikePureLocation(q);

  if (isPureLocation) {
    const geo = await geocodeLocation(q);
    if (geo?.bbox) {
      params.set('bbox', geo.bbox);
      const zipHit = q.match(zipRegex)?.[0];
      if (zipHit) {
        params.set('postalCodes', zipHit);
      }
    } else {
      warn(warnings, 'geocode failed for pure location query', { query: q });
    }
    return { params, didUseAI: false, warnings };
  }

  const extractedZip = q.match(zipRegex)?.[0] || null;

  try {
    const aiRes = await parseSearchPrompt(q);
    if (aiRes.kind === 'success') {
      const pf = aiRes.data.proposedFilters || {};

      const filterKeys = Object.keys(pf).filter((k) => pf[k] != null && pf[k] !== '');
      if (filterKeys.length === 0) {
        warn(warnings, 'AI returned success but proposedFilters is empty', { query: q });
      }

      if (pf.status) {
        params.delete('status');
        const statuses: string[] = Array.isArray(pf.status) ? pf.status : [pf.status];
        statuses
          .map((s) => STATUS_MAP[String(s).toLowerCase()] || String(s).toUpperCase())
          .filter(Boolean)
          .forEach((s) => params.append('status', s));
      }

      if (pf.propertyType) {
        const mapped = PROPERTY_MAP[String(pf.propertyType).toLowerCase()] || pf.propertyType;
        applyScalar(params, 'propertyType', mapped);
      }

      applyScalar(params, 'beds', pf.bedsMin ?? pf.beds);
      applyScalar(params, 'baths', pf.bathsMin ?? pf.baths);
      applyScalar(params, 'minPrice', pf.minPrice);
      applyScalar(params, 'maxPrice', pf.maxPrice);

      if (pf.keywords && Array.isArray(pf.keywords)) {
        const keywords = pf.keywords.map((k: string) => String(k).trim()).filter(Boolean).join(',');
        applyScalar(params, 'keywords', keywords || null);
      }

      if (pf.city) {
        params.delete('cities');
        params.append('cities', String(pf.city));
      }
      if (pf.zip) {
        params.delete('postalCodes');
        params.append('postalCodes', String(pf.zip));
      }

      let locationQuery: string | null =
        (pf.zip && String(pf.zip)) || (pf.city && String(pf.city)) || extractedZip;
      if (locationQuery) {
        const geo = await geocodeLocation(locationQuery);
        if (geo?.bbox) {
          params.set('bbox', geo.bbox);
        } else {
          warn(warnings, 'geocode failed for AI-extracted location', { locationQuery, query: q });
        }
      }

      return { params, didUseAI: true, warnings };
    }

    // AI returned a non-success result
    warn(warnings, `AI parse returned non-success`, {
      kind: aiRes.kind,
      message: 'message' in aiRes ? aiRes.message : undefined,
      query: q,
    });

    if (extractedZip) {
      const geo = await geocodeLocation(extractedZip);
      if (geo?.bbox) {
        params.set('bbox', geo.bbox);
        params.set('postalCodes', extractedZip);
      } else {
        warn(warnings, 'geocode fallback failed for extracted zip', { zip: extractedZip, query: q });
      }
    }
    return { params, didUseAI: false, warnings };
  } catch (err) {
    warn(warnings, 'smartSubmit caught unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      query: q,
    });

    if (extractedZip) {
      const geo = await geocodeLocation(extractedZip);
      if (geo?.bbox) {
        params.set('bbox', geo.bbox);
        params.set('postalCodes', extractedZip);
      }
    }
    return { params, didUseAI: false, warnings };
  }
}
