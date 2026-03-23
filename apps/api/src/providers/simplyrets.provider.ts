import { ListingProvider } from './listing-provider.interface';
import { ListingSearchParams, NormalizedListing } from '@project-x/shared-types';

export class SimplyRetsListingProvider implements ListingProvider {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    this.baseUrl = process.env.SIMPLYRETS_BASE_URL ?? 'https://api.simplyrets.com';

    const username = process.env.SIMPLYRETS_USERNAME;
    const password = process.env.SIMPLYRETS_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'SIMPLYRETS_USERNAME and SIMPLYRETS_PASSWORD must be set when using SimplyRetsListingProvider',
      );
    }

    const token = Buffer.from(`${username}:${password}`).toString('base64');
    this.authHeader = `Basic ${token}`;
  }

  /**
   * Builds the SimplyRETS search URL from ListingSearchParams.
   * Exposed for testing — all parameter mapping lives here.
   */
  public buildSearchUrl(params: ListingSearchParams): URL {
    const url = new URL('/properties', this.baseUrl);

    const STATUS_MAP: Record<string, string> = {
      FOR_SALE: 'Active',
      PENDING: 'Pending',
      SOLD: 'Closed',
    };
    const mapStatus = (status: string) => STATUS_MAP[status] ?? status;

    // Map UI-facing property type labels to SimplyRETS enum values.
    // SimplyRETS accepts: residential, rental, mobilehome, condominium,
    // multifamily, commercial, commerciallease, land, farm.
    const PROPERTY_TYPE_MAP: Record<string, string> = {
      'Single Family': 'residential',
      'Condo': 'condominium',
      'Multi-Family': 'multifamily',
      'Land': 'land',
    };
    const mapPropertyType = (pt: string) => PROPERTY_TYPE_MAP[pt] ?? pt;

    const appendAll = (key: string, values?: string[]) => {
      if (!values || values.length === 0) return;
      for (const v of values) {
        const t = typeof v === 'string' ? v.trim() : '';
        if (t) {
          url.searchParams.append(key, t);
        }
      }
    };

    if (params.limit) url.searchParams.set('limit', String(params.limit));
    if (params.q) url.searchParams.set('q', params.q);
    if (params.minPrice) url.searchParams.set('minprice', String(params.minPrice));
    if (params.maxPrice) url.searchParams.set('maxprice', String(params.maxPrice));
    if (params.beds) url.searchParams.set('minbeds', String(params.beds));
    if (params.baths) url.searchParams.set('minbaths', String(params.baths));
    if (params.propertyType) url.searchParams.set('type', mapPropertyType(params.propertyType));
    if (params.status && params.status.length > 0) {
      for (const s of params.status) {
        const mapped = mapStatus(s);
        url.searchParams.append('status', mapped);
      }
    }
    if (params.minSqft) url.searchParams.set('minarea', String(params.minSqft));
    if (params.maxSqft) url.searchParams.set('maxarea', String(params.maxSqft));
    if (params.minYearBuilt) url.searchParams.set('minyear', String(params.minYearBuilt));
    if (params.maxYearBuilt) url.searchParams.set('maxyear', String(params.maxYearBuilt));
    if (params.maxDaysOnMarket) url.searchParams.set('maxdom', String(params.maxDaysOnMarket));
    if (params.sort) {
      // SimplyRETS accepted sort values: listprice, -listprice, listdate, -listdate,
      // closedate, -closedate, beds, -beds, baths, -baths.
      // 'dom' has no SimplyRETS equivalent; omitted here and handled by stableSortListings post-fetch.
      const sortMap: Partial<Record<NonNullable<ListingSearchParams['sort']>, string>> = {
        'price-asc': 'listprice',
        'price-desc': '-listprice',
        newest: '-listdate',
      };
      const mapped = sortMap[params.sort];
      if (mapped) {
        url.searchParams.set('sort', mapped);
      }
    }
    if (params.bbox) {
      const parts = params.bbox.split(',').map((p: string) => Number(p));
      if (parts.length === 4 && parts.every((n: number) => Number.isFinite(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        const rectangle: Array<[number, number]> = [
          [minLat, minLng],
          [minLat, maxLng],
          [maxLat, maxLng],
          [maxLat, minLng],
        ];
        rectangle.forEach(([lat, lng]) => {
          url.searchParams.append('points', `${lat},${lng}`);
        });
      }
    }

    appendAll('cities', params.cities);
    appendAll('postalCodes', params.postalCodes);
    appendAll('counties', params.counties);
    appendAll('neighborhoods', params.neighborhoods);
    appendAll('features', params.features);
    appendAll('subtype', params.subtype);
    appendAll('agent', params.agent);
    appendAll('brokers', params.brokers);

    if (params.maxBeds != null) {
      url.searchParams.set('maxbeds', String(params.maxBeds));
    }
    if (params.maxBaths != null) {
      url.searchParams.set('maxbaths', String(params.maxBaths));
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limitForOffset = params.clientLimit ?? params.limit;
    if (limitForOffset && limitForOffset > 0 && page > 1) {
      const offset = (page - 1) * limitForOffset;
      url.searchParams.set('offset', String(offset));
    }

    return url;
  }

  public async search(params: ListingSearchParams): Promise<NormalizedListing[]> {
    const url = this.buildSearchUrl(params);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!res.ok) {
      throw new Error(`SimplyRETS search failed with status ${res.status}`);
    }

    const data = (await res.json()) as any[];

    const results: NormalizedListing[] = [];
    for (const raw of data) {
      try {
        results.push(this.mapToListing(raw));
      } catch (err) {
        console.error('[SimplyRetsListingProvider] Failed to map listing', {
          error: err,
          mlsId: raw?.mlsId,
          address: raw?.address?.full,
        });
      }
    }

    return results;
  }

  public async getById(id: string): Promise<NormalizedListing | null> {
    const url = new URL(`/properties/${id}`, this.baseUrl);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`SimplyRETS getById failed with status ${res.status}`);
    }

    const raw = await res.json();
    return this.mapToListing(raw);
  }

  private mapToListing(raw: any): NormalizedListing {
    const listPrice = raw.listPrice ?? 0;

    const fullBaths = raw.property?.bathsFull ?? 0;
    const halfBaths = raw.property?.bathsHalf ?? 0;
    const totalBaths =
      fullBaths > 0 || halfBaths > 0 ? fullBaths + halfBaths * 0.5 : null;

    const mapAgent = (agentRaw: any) => {
      if (!agentRaw) return null;
      const contact = agentRaw.contact ?? {};
      const firstName = agentRaw.firstName ?? contact.firstName ?? null;
      const lastName = agentRaw.lastName ?? contact.lastName ?? null;
      const email = agentRaw.email ?? contact.email ?? null;
      const phone = agentRaw.officePhone ?? agentRaw.phone ?? contact.office ?? contact.phone ?? null;
      const cellPhone = agentRaw.cellPhone ?? contact.cell ?? contact.cellPhone ?? null;
      const id = agentRaw.id ?? contact.id ?? null;
      if ([firstName, lastName, email, phone, cellPhone, id].every((v) => v == null)) {
        return null;
      }
      return {
        id,
        firstName,
        lastName,
        email,
        phone,
        cellPhone,
      };
    };

    const mapOffice = (officeRaw: any) => {
      if (!officeRaw) return null;
      const contact = officeRaw.contact ?? {};
      const name = officeRaw.name ?? contact.name ?? null;
      const phone = officeRaw.phone ?? contact.office ?? contact.phone ?? null;
      const email = officeRaw.email ?? contact.email ?? null;
      const rawId = officeRaw.id ?? officeRaw.brokerid ?? contact.id ?? contact.brokerid ?? null;
      const id = rawId != null ? String(rawId) : null;
      if ([name, phone, email, id].every((v) => v == null)) return null;
      return { id, name, phone, email };
    };

    const description =
      typeof raw.remarks === 'string' && raw.remarks.trim().length > 0
        ? raw.remarks.trim()
        : null;

    return {
      id: String(raw.mlsId),
      mlsId: String(raw.mlsId),
      listPrice,
      listPriceFormatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(listPrice),
      address: {
        full: raw.address?.full ?? 'Address not available',
        street: `${raw.address?.streetNumberText ?? ''} ${raw.address?.streetName ?? ''}`.trim(),
        city: raw.address?.city ?? '',
        state: raw.address?.state ?? '',
        zip: raw.address?.postalCode ?? '',
        lat: raw.geo?.lat ?? 0,
        lng: raw.geo?.lng ?? 0,
      },
      media: {
        photos: Array.isArray(raw.photos) ? raw.photos : [],
        thumbnailUrl: Array.isArray(raw.photos) && raw.photos.length > 0 ? raw.photos[0] : null,
      },
      attribution: {
        mlsName: raw.mls?.name ?? 'MLS (via SimplyRETS)',
        disclaimer: 'Listing information is deemed reliable but not guaranteed.',
        logoUrl: undefined,
      },
      details: {
        beds: raw.property?.bedrooms ?? null,
        baths: totalBaths,
        sqft: raw.property?.area ?? null,
        lotSize: raw.property?.lotSizeArea ?? null,
        yearBuilt: raw.property?.yearBuilt ?? null,
        hoaFees: raw.association?.fee ?? null,
        basement:
          Array.isArray(raw.property?.basement) && raw.property.basement.length > 0
            ? raw.property.basement.join(', ')
            : null,
        propertyType: raw.property?.style ?? raw.property?.type ?? 'Unknown',
        status: raw.mls?.status ?? 'Unknown',
      },
      meta: {
        daysOnMarket: raw.mls?.daysOnMarket ?? null,
        mlsName: raw.mls?.name ?? 'SimplyRETS',
      },
      agent: mapAgent(raw.agent),
      coAgent: mapAgent(raw.coAgent),
      office: mapOffice(raw.office),
      description,
      tax: raw.tax
        ? {
            annualAmount: raw.tax.taxAnnualAmount ?? null,
            year: raw.tax.taxYear ?? null,
            assessmentId: raw.tax.id ?? null,
          }
        : null,
      school: raw.school
        ? {
            district: raw.school.district ?? null,
            elementary: raw.school.elementarySchool ?? null,
            middle: raw.school.middleSchool ?? null,
            high: raw.school.highSchool ?? null,
          }
        : null,
      // Compensation/commission fields intentionally excluded for compliance.
    };
  }
}
