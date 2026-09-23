// Tests for GET /api/auth/me (AUTH-06).
// Pattern 14. requireAuth-gated. Note: requireAuth uses cookies() from
// next/headers internally, so tests must use mockNextCookies + prismaMock.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '@/test-utils/prisma-mock';
import { mockNextCookies, __cookieStore } from '@/test-utils/mock-cookies';

mockNextCookies();

vi.mock('@/lib/server/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/server/auth')>('@/lib/server/auth');
  return {
    ...actual,
    verifyToken: vi.fn(),
    verifyCsrf: vi.fn(),
  };
});

import { verifyToken, verifyCsrf } from '@/lib/server/auth';
import { GET, PATCH } from './route';
import { NextRequest, NextResponse } from 'next/server';

function makeReq(opts: { tokenCookie?: string; bearer?: string } = {}): NextRequest {
  const headers: Record<string, string> = {};
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  return new NextRequest('https://test/api/auth/me', {
    method: 'GET',
    headers,
  });
}

function makePatchReq(body: unknown, opts: { bearer?: string } = {}): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.bearer) headers.authorization = `Bearer ${opts.bearer}`;
  return new NextRequest('https://test/api/auth/me', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  __cookieStore.clear();
  vi.mocked(verifyToken).mockReset();
  vi.mocked(verifyCsrf).mockReset();
  vi.mocked(verifyCsrf).mockReturnValue(null);
});

describe('GET /api/auth/me', () => {
  it('Test 1: authed — returns user identity', async () => {
    // Place token cookie via mock store; requireAuth reads it via cookies().
    __cookieStore.clear();
    // Fake cookies.set: use mockStore via the mock-cookies internal store.
    // Simpler: test injects directly through Bearer header path which
    // requireAuth supports as a fallback when no cookie is present.
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'u1',
      email: 'a@b.com',
      tokenVersion: 0,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      tokenVersion: 0,
    } as never);

    const res = await GET(makeReq({ bearer: 'valid-access-token' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      user: { sub: 'u1', email: 'a@b.com' },
    });
  });

  it('Test 2: no cookie + no bearer — 401 missing token', async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Missing token|token/i);
  });

  it('Test 3: stale tokenVersion — 401', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'u1',
      email: 'a@b.com',
      tokenVersion: 0,
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      tokenVersion: 1, // bumped via change-password
    } as never);

    const res = await GET(makeReq({ bearer: 'stale-jwt' }));
    expect(res.status).toBe(401);
  });

  it('Test 4: deleted user — 401', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'u-deleted',
      email: 'gone@b.com',
      tokenVersion: 0,
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await GET(makeReq({ bearer: 'orphan-jwt' }));
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/me', () => {
  it('updates the display name and returns the trimmed value', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'u1', email: 'a@b.com', tokenVersion: 0 });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      tokenVersion: 0,
    } as never);
    prismaMock.user.update.mockResolvedValue({ id: 'u1', name: 'Pasteur Jean-Marc' } as never);

    const res = await PATCH(
      makePatchReq({ name: '  Pasteur Jean-Marc  ' }, { bearer: 'valid-access-token' }),
    );

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Pasteur Jean-Marc' },
      select: { id: true, name: true },
    });
    const body = (await res.json()) as { user: { name: string } };
    expect(body.user.name).toBe('Pasteur Jean-Marc');
  });

  it('rejects an empty name with 400 VALIDATION_FAILED', async () => {
    vi.mocked(verifyToken).mockResolvedValue({ sub: 'u1', email: 'a@b.com', tokenVersion: 0 });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      tokenVersion: 0,
    } as never);

    const res = await PATCH(makePatchReq({ name: '   ' }, { bearer: 'valid-access-token' }));
    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects when unauthenticated — 401, no DB write', async () => {
    const res = await PATCH(makePatchReq({ name: 'Someone' }));
    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects when CSRF fails — 403 short-circuits before auth', async () => {
    vi.mocked(verifyCsrf).mockReturnValueOnce(
      NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }),
    );
    const res = await PATCH(makePatchReq({ name: 'Someone' }, { bearer: 'valid-access-token' }));
    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
