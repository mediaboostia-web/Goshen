// Tests for /api/reports (GET list + GET preview + POST generate/archive).
//
// Mock strategy:
//   - `@/lib/server/middleware`: requireAuth returns a happy user ctx by
//     default; a per-test override simulates 401.
//   - `@/lib/server/church/resolve-church`: resolveChurchUser is mocked so
//     tests control church/branch access without a real DB.
//   - `@/lib/server/prisma`: fully mocked — findMany/aggregate/create/update
//     are vi.fn()s the tests configure per scenario.
//   - `@/lib/server/reports/pdf`: generateReportPdf is mocked to return a
//     fixed Buffer — pdfkit itself is a pure, well-tested third-party lib;
//     this test only verifies the route wires it (and the upload) correctly.
//   - `@/lib/server/upload/cloudinary-client`: uploadBuffer via
//     mockCloudinaryClient() (test-utils), matching the upload route's
//     established pattern. A dedicated test overrides it to reject with
//     StorageNotConfiguredError to prove report creation still succeeds.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { mockCloudinaryClient } from '@/test-utils/cloudinary-mock';

vi.mock('@/lib/server/auth', () => ({
  verifyCsrf: vi.fn(() => null),
}));

const cl = mockCloudinaryClient();

vi.mock('@/lib/server/upload/cloudinary-client', () => ({
  uploadBuffer: vi.fn((publicId: string, body: Buffer) => cl.uploadBuffer(publicId, body)),
  StorageNotConfiguredError: class StorageNotConfiguredError extends Error {
    constructor() {
      super('Storage not configured');
      this.name = 'StorageNotConfiguredError';
    }
  },
}));

vi.mock('@/lib/server/reports/pdf', () => ({
  generateReportPdf: vi.fn(async () => Buffer.from('%PDF-1.4 fake pdf bytes')),
}));

vi.mock('@/lib/server/middleware', () => ({
  requireAuth: vi.fn(async () => ({ user: { sub: 'user-1', email: 'pastor@eglise.ga' } })),
}));

const CHURCH = {
  id: 'org-1',
  slug: 'eglise-goshen',
  name: 'Communauté Évangélique de la Grâce',
  denomination: 'Assemblées de Dieu du Gabon',
  logoUrl: null,
  currency: 'XAF',
  status: 'ACTIVE',
  ownerId: 'user-1',
};

vi.mock('@/lib/server/church/resolve-church', () => ({
  resolveChurchUser: vi.fn(async () => ({
    church: CHURCH,
    member: { id: 'mem-1', role: 'PASTOR', branchAccess: [] },
    isPastor: true,
    isTreasurer: true,
    isAuditor: false,
    isSecretary: false,
  })),
}));

const findManyTx = vi.fn();
const branchFindFirst = vi.fn();
const branchAggregate = vi.fn();
const reportFindMany = vi.fn();
const reportCreate = vi.fn();
const reportUpdate = vi.fn();

vi.mock('@/lib/server/prisma', () => ({
  prisma: {
    financialTransaction: { findMany: (...args: unknown[]) => findManyTx(...args) },
    branch: {
      findFirst: (...args: unknown[]) => branchFindFirst(...args),
      aggregate: (...args: unknown[]) => branchAggregate(...args),
    },
    report: {
      findMany: (...args: unknown[]) => reportFindMany(...args),
      create: (...args: unknown[]) => reportCreate(...args),
      update: (...args: unknown[]) => reportUpdate(...args),
    },
  },
}));

function makeGetReq(qs = ''): NextRequest {
  return new NextRequest(`https://test/api/reports${qs}`, { method: 'GET' });
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest('https://test/api/reports', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const SAMPLE_TX = [
  {
    id: 'tx-1',
    type: 'INCOME',
    amount: 100_000,
    date: new Date('2026-06-07T10:00:00Z'),
    beneficiary: null,
    notes: null,
    category: { name: 'Dîmes' },
    branch: { name: 'Siège Principal' },
    author: { name: 'Trésorier Pierre', email: 'pierre@eglise.ga' },
  },
  {
    id: 'tx-2',
    type: 'EXPENSE',
    amount: 30_000,
    date: new Date('2026-06-08T10:00:00Z'),
    beneficiary: 'SEEG',
    notes: 'Facture électricité',
    category: { name: 'Factures' },
    branch: { name: 'Siège Principal' },
    author: { name: 'Trésorier Pierre', email: 'pierre@eglise.ga' },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  findManyTx.mockResolvedValue(SAMPLE_TX);
  branchFindFirst.mockResolvedValue({ currentBalance: 500_000 });
  branchAggregate.mockResolvedValue({ _sum: { currentBalance: 500_000 } });
  reportFindMany.mockResolvedValue([]);
  reportCreate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: 'report-1',
    pdfUrl: null,
    ...args.data,
  }));
  reportUpdate.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
    id: 'report-1',
    ...args.data,
  }));
});

describe('GET /api/reports', () => {
  it('propagates 401 from requireAuth', async () => {
    const { requireAuth } = await import('@/lib/server/middleware');
    vi.mocked(requireAuth).mockResolvedValueOnce(
      NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 }),
    );
    const { GET } = await import('./route');
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it('returns 404 CHURCH_NOT_FOUND when the user has no church', async () => {
    const { resolveChurchUser } = await import('@/lib/server/church/resolve-church');
    vi.mocked(resolveChurchUser).mockResolvedValueOnce(null);
    const { GET } = await import('./route');
    const res = await GET(makeGetReq());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('CHURCH_NOT_FOUND');
  });

  it('preview=true aggregates income/expense by category and computes balances', async () => {
    const { GET } = await import('./route');
    const res = await GET(
      makeGetReq(
        '?preview=true&startDate=2026-06-01T00:00:00.000Z&endDate=2026-06-30T23:59:59.999Z&branchId=CONSOLIDATED',
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.preview.totalIncome).toBe(100_000);
    expect(body.preview.totalExpense).toBe(30_000);
    expect(body.preview.incomesByCategory).toEqual({ Dîmes: 100_000 });
    expect(body.preview.expensesByCategory).toEqual({ Factures: 30_000 });
    // closingBalance comes from the branch aggregate (500_000); opening is
    // closing minus the net movement over the period.
    expect(body.preview.closingBalance).toBe(500_000);
    expect(body.preview.openingBalance).toBe(500_000 - (100_000 - 30_000));
  });

  it('without preview, lists archived reports for the church', async () => {
    reportFindMany.mockResolvedValueOnce([{ id: 'r1', title: 'Bilan Juin' }]);
    const { GET } = await import('./route');
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reports).toEqual([{ id: 'r1', title: 'Bilan Juin' }]);
  });
});

describe('POST /api/reports', () => {
  const VALID_BODY = {
    title: 'Bilan du mois de Juin',
    periodType: 'MONTHLY',
    branchId: 'CONSOLIDATED',
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-30T23:59:59.999Z',
  };

  it('returns 400 VALIDATION_FAILED for a missing required field', async () => {
    const { POST } = await import('./route');
    const res = await POST(makePostReq({ ...VALID_BODY, title: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('VALIDATION_FAILED');
  });

  it('returns 404 CHURCH_NOT_FOUND when the user has no church', async () => {
    const { resolveChurchUser } = await import('@/lib/server/church/resolve-church');
    vi.mocked(resolveChurchUser).mockResolvedValueOnce(null);
    const { POST } = await import('./route');
    const res = await POST(makePostReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it('creates the report, generates the PDF, uploads it, and returns pdfUrl', async () => {
    const { POST } = await import('./route');
    const res = await POST(makePostReq(VALID_BODY));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(reportCreate).toHaveBeenCalledTimes(1);
    expect(cl.uploadBuffer).toHaveBeenCalledTimes(1);
    // publicId is scoped by org + report id; no .pdf suffix — Cloudinary
    // appends the detected format extension to the delivery URL itself.
    const uploadArgs = vi.mocked(cl.uploadBuffer).mock.calls[0];
    expect(uploadArgs?.[0]).toBe('reports/org-1/report-1');
    expect(reportUpdate).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { pdfUrl: expect.stringContaining('https://res.cloudinary.com/') },
    });
    expect(body.report.pdfUrl).toContain('https://res.cloudinary.com/');
  });

  it('still returns 201 with the report when Cloudinary is not configured (best-effort PDF)', async () => {
    const { uploadBuffer, StorageNotConfiguredError } =
      await import('@/lib/server/upload/cloudinary-client');
    vi.mocked(uploadBuffer).mockRejectedValueOnce(new StorageNotConfiguredError());

    const { POST } = await import('./route');
    const res = await POST(makePostReq(VALID_BODY));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.report.pdfUrl).toBeNull();
    expect(reportUpdate).not.toHaveBeenCalled();
  });

  it("source exports runtime = 'nodejs' (Phase 0 guard)", async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const src = fs.readFileSync(path.join(__dirname, 'route.ts'), 'utf8');
    expect(src).toMatch(/export\s+const\s+runtime\s*=\s*['"]nodejs['"]/);
  });
});
