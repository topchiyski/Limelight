import { test, type APIRequestContext, type APIResponse } from '@playwright/test';
import { z } from 'zod';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<S extends z.ZodType> {
  /** Zod schema the response body must satisfy. Defaults to `z.unknown()` (no validation). */
  schema?: S;
  data?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  /** Status(es) treated as success. Defaults to any 2xx. Anything else throws `LimelightApiError`. */
  expectedStatus?: number | readonly number[];
}

export interface ApiResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

export class LimelightApiError extends Error {
  constructor(
    readonly method: HttpMethod,
    readonly url: string,
    readonly status: number,
    readonly body: string,
    reason: string,
  ) {
    super(`${method} ${url} -> ${status}: ${reason}\n${body.slice(0, 2_000)}`);
    this.name = 'LimelightApiError';
  }
}

/**
 * Thin wrapper over Playwright's APIRequestContext:
 * - every call is a named `test.step` (visible in the HTML report / trace)
 * - unexpected status codes fail fast with the response body attached
 * - response bodies are validated against a Zod schema and returned fully typed
 */
export class LimelightApi {
  constructor(private readonly request: APIRequestContext) {}

  get<S extends z.ZodType = z.ZodUnknown>(path: string, options: RequestOptions<S> = {}) {
    return this.send('GET', path, options);
  }

  post<S extends z.ZodType = z.ZodUnknown>(path: string, options: RequestOptions<S> = {}) {
    return this.send('POST', path, options);
  }

  put<S extends z.ZodType = z.ZodUnknown>(path: string, options: RequestOptions<S> = {}) {
    return this.send('PUT', path, options);
  }

  patch<S extends z.ZodType = z.ZodUnknown>(path: string, options: RequestOptions<S> = {}) {
    return this.send('PATCH', path, options);
  }

  delete<S extends z.ZodType = z.ZodUnknown>(path: string, options: RequestOptions<S> = {}) {
    return this.send('DELETE', path, options);
  }

  private async send<S extends z.ZodType>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<S>,
  ): Promise<ApiResponse<z.output<S>>> {
    // A leading slash would resolve against the host root and drop the API_URL path prefix.
    const relativePath = path.replace(/^\/+/, '');

    return test.step(`${method} ${relativePath}`, async () => {
      const response = await this.request.fetch(relativePath, {
        method,
        ...(options.data !== undefined && { data: options.data }),
        ...(options.params && { params: options.params }),
        ...(options.headers && { headers: options.headers }),
      });

      const body = await readBody(response);
      const status = response.status();

      if (!isExpectedStatus(status, options.expectedStatus)) {
        throw new LimelightApiError(method, response.url(), status, stringify(body), 'unexpected status');
      }

      const schema = options.schema ?? z.unknown();
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw new LimelightApiError(
          method,
          response.url(),
          status,
          stringify(body),
          `response failed schema validation\n${z.prettifyError(parsed.error)}`,
        );
      }

      return { status, headers: response.headers(), data: parsed.data as z.output<S> };
    }, { box: true });
  }
}

function isExpectedStatus(status: number, expected: RequestOptions<z.ZodType>['expectedStatus']): boolean {
  if (expected === undefined) return status >= 200 && status < 300;
  return typeof expected === 'number' ? status === expected : expected.includes(status);
}

async function readBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('json')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function stringify(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body, null, 2) ?? '';
}
