import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// client.ts throws at import time without these, so stub before importing.
vi.stubEnv('VITE_SUPABASE_URL', 'https://stub.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'stub-anon-key');

const { submitEnrollmentLeadWithTimeout } = await import('./client');

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const input = {
  parentName: 'Test Parent',
  parentEmail: 'parent@example.com',
  children: [{ name: 'Kid', age: 6 }],
};

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    json: () => Promise.resolve(body),
  }) as Response;

const errorResponse = (status: number, statusText: string, body: string) =>
  ({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(body),
  }) as Response;

describe('submitEnrollmentLeadWithTimeout', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('returns the lead id on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse('lead-uuid-123'));
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result).toEqual({ data: 'lead-uuid-123', error: null });
  });

  it('sends the RPC parameter shape the DB function expects', async () => {
    fetchMock.mockResolvedValue(jsonResponse('lead-uuid-123'));
    await submitEnrollmentLeadWithTimeout(input, 5000);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/rest/v1/rpc/submit_enrollment_lead');
    expect(JSON.parse(init.body)).toEqual({
      p_parent_name: 'Test Parent',
      p_parent_email: 'parent@example.com',
      p_phone: null,
      p_message: null,
      p_source_page: 'contact',
      p_children: [{ name: 'Kid', age: 6 }],
    });
  });

  it('surfaces the rate-limit code and message from the error body', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(
        429,
        'Too Many Requests',
        JSON.stringify({
          message: 'Please wait a moment before submitting again.',
          code: 'P0429',
        }),
      ),
    );
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result.data).toBeNull();
    expect(result.error).toEqual({
      message: 'Please wait a moment before submitting again.',
      code: 'P0429',
    });
  });

  it('falls back to statusText when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(500, 'Internal Server Error', '<html>oops</html>'),
    );
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result.error?.message).toBe('Internal Server Error');
    expect(result.error?.code).toBeUndefined();
  });

  it('maps an aborted request to the timeout message', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValue(abortError);
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result.error?.message).toBe(
      'Submission timed out. Please try again.',
    );
  });

  it('maps a network failure to its error message', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result.error?.message).toBe('fetch failed');
  });

  it('returns null data when the success payload is not a lead id string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));
    const result = await submitEnrollmentLeadWithTimeout(input, 5000);
    expect(result).toEqual({ data: null, error: null });
  });
});
