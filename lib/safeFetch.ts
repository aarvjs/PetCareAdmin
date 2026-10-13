/**
 * Safe API client helper for Next.js App Router applications.
 * Defensively handles empty bodies, non-JSON error responses (e.g. 504 Gateway Timeout on Vercel),
 * network disconnects, and unexpected content types without throwing JSON parse syntax errors.
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  errorText?: string;
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (!text || !text.trim()) {
      const errMsg = res.ok ? undefined : `Server returned an empty response (${res.status}).`;
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: errMsg,
        errorText: errMsg,
      };
    }

    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(text) as T;
        const serverError = (parsed as any)?.error || (parsed as any)?.message;
        const errMsg = res.ok ? undefined : (serverError || `Request failed with status ${res.status}`);
        return {
          ok: res.ok,
          status: res.status,
          data: parsed,
          error: errMsg,
          errorText: errMsg,
        };
      } catch (jsonErr) {
        const errMsg = `Malformed JSON response from server (${res.status}).`;
        return {
          ok: false,
          status: res.status,
          data: null,
          error: errMsg,
          errorText: errMsg,
        };
      }
    }

    // Response is HTML or plain text (e.g. Vercel timeout page or error)
    const errMsg = res.ok ? undefined : `Server returned non-JSON response (${res.status}).`;
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      error: errMsg,
      errorText: errMsg,
    };
  } catch (netErr: any) {
    const errMsg = netErr?.message || 'Network connection failed.';
    return {
      ok: false,
      status: 0,
      data: null,
      error: errMsg,
      errorText: errMsg,
    };
  }
}
