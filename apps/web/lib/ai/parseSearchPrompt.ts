type ParseSearchSuccess = {
  kind: 'success';
  data: {
    requestId: string;
    proposedFilters: Record<string, any>;
    explanations: Array<{ field: string; reason: string }>;
    confidence: number;
    warnings: string[];
    ignoredInputReasons: string[];
  };
};

type ParseSearchDisabled = { kind: 'disabled' };

type ParseSearchRateLimited = { kind: 'rate_limited'; retryAfterSeconds?: number };

type ParseSearchError = { kind: 'error'; message: string };

export type ParseSearchResult =
  | ParseSearchSuccess
  | ParseSearchDisabled
  | ParseSearchRateLimited
  | ParseSearchError;

export async function parseSearchPrompt(
  prompt: string,
  context?: { currentFilters?: Record<string, unknown>; searchText?: string | null },
): Promise<ParseSearchResult> {
  try {
    const res = await fetch('/api/ai/parse-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, context }),
    });

    if (res.status === 503) return { kind: 'disabled' };
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : undefined;
      return {
        kind: 'rate_limited',
        retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      };
    }

    if (!res.ok) {
      let message = 'Failed to process prompt';
      try {
        const data = await res.json();
        if (data?.message) message = data.message;
      } catch (err) {
        message = (err as Error)?.message || message;
      }
      return { kind: 'error', message };
    }

    const data = await res.json();
    return { kind: 'success', data };
  } catch (err) {
    const message = (err as Error)?.message || 'Network error';
    return { kind: 'error', message };
  }
}
