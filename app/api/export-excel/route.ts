import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { testCases, sessionTitle } = await req.json();

    // Dynamically import xlsx to avoid edge runtime issues
    const XLSX = await import('xlsx');

    const headers = [
      'Test ID', 'Test Suite', 'Description', 'Preconditions',
      'Steps', 'Expected Result', 'Actual Result', 'Status', 'Priority', 'Assigned To'
    ];

    const rows = Array.isArray(testCases) && testCases.length > 0
      ? testCases.map((tc: Record<string, string>) => [
          tc.id || '',
          tc.suite || '',
          tc.description || '',
          tc.preconditions || '',
          tc.steps || '',
          tc.expectedResult || '',
          tc.actualResult || '',
          tc.status || 'Pending',
          tc.priority || 'Medium',
          tc.assignedTo || 'QA Agent',
        ])
      : [['TC-001', 'General', 'Sample test case', 'App is running', '1. Open URL\n2. Verify page loads', 'Page loads successfully', '', 'Pending', 'High', 'QA Agent']];

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style header row
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '7C3AED' } },
        alignment: { horizontal: 'center' },
      };
    }

    // Column widths
    ws['!cols'] = [
      { wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 20 },
      { wch: 40 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `${(sessionTitle || 'test-cases').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
