import fetch from "node-fetch";

type GeminiParams = {
  prompt: string;
  apiKey: string;
  model: string;
  schema: unknown;
  timeoutMs: number;
  retryMaxAttempts: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GeminiCallResult = {
  status: number;
  bodyText: string;
  attempts: number;
  latencyMs: number;
};

export const callGemini = async ({
  prompt,
  apiKey,
  model,
  schema,
  timeoutMs,
  retryMaxAttempts,
}: GeminiParams): Promise<GeminiCallResult> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const attempts = Math.max(1, Number(retryMaxAttempts) || 1);
  const started = Date.now();
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseJsonSchema: schema,
          },
        }),
        signal: controller.signal,
      });

      lastStatus = res.status;
      lastBody = await res.text();
      clearTimeout(timeout);

      if (res.status === 429 || res.status >= 500) {
        if (attempt < attempts) {
          await delay(150 * attempt + Math.random() * 250);
          continue;
        }
      }

      return {
        status: res.status,
        bodyText: lastBody,
        attempts: attempt,
        latencyMs: Date.now() - started,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const isAbort = err?.name === "AbortError";
      if (attempt < attempts && (isAbort || err)) {
        await delay(150 * attempt + Math.random() * 250);
        continue;
      }
      lastBody = err?.message ?? String(err);
      return {
        status: isAbort ? 408 : 500,
        bodyText: lastBody,
        attempts: attempt,
        latencyMs: Date.now() - started,
      };
    }
  }

  return {
    status: lastStatus || 500,
    bodyText: lastBody,
    attempts: attempts,
    latencyMs: Date.now() - started,
  };
};
