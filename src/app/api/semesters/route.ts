import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - List all semesters
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const academicYear = url.searchParams.get('academic_year');
        const activeOnly = url.searchParams.get('active_only') === 'true';

        let semesters;

        if (academicYear && activeOnly) {
            semesters = await sql`
        SELECT * FROM semesters 
        WHERE academic_year = ${academicYear} AND is_active = true
        ORDER BY semester_number ASC
      `;
        } else if (academicYear) {
            semesters = await sql`
        SELECT * FROM semesters 
        WHERE academic_year = ${academicYear}
        ORDER BY semester_number ASC
      `;
        } else if (activeOnly) {
            semesters = await sql`
        SELECT * FROM semesters 
        WHERE is_active = true
        ORDER BY academic_year DESC, semester_number ASC
      `;
        } else {
            semesters = await sql`
        SELECT * FROM semesters 
        ORDER BY academic_year DESC, semester_number ASC
      `;
        }

        return NextResponse.json({ success: true, data: semesters });
    } catch (err) {
        console.error('Semesters GET error:', err);
        return NextResponse.json({ success: false, error: 'Failed to fetch semesters' }, { status: 500 });
    }
}

// POST - Create new semester (Admin only)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { semester_number, academic_year, start_date, end_date, is_active } = body;

        if (!semester_number || !academic_year || !start_date || !end_date) {
            return NextResponse.json({
                success: false,
                error: 'Semester number, academic year, start date, and end date are required'
            }, { status: 400 });
        }

        if (semester_number !== 1 && semester_number !== 2) {
            return NextResponse.json({
                success: false,
                error: 'Semester number must be 1 or 2'
            }, { status: 400 });
        }

        const name = `Semester ${semester_number} (${academic_year})`;

        // If setting this as active, deactivate others first
        if (is_active) {
            await sql`UPDATE semesters SET is_active = false WHERE is_active = true`;
        }

        const result = await sql`
      INSERT INTO semesters (name, semester_number, academic_year, start_date, end_date, is_active)
      VALUES (${name}, ${semester_number}, ${academic_year}, ${start_date}, ${end_date}, ${is_active || false})
      RETURNING *
    `;

        return NextResponse.json({ success: true, data: result[0], message: 'Semester created successfully' });
    } catch (err: any) {
        console.error('Semesters POST error:', err);
        if (err.code === '23505') {
            return NextResponse.json({ success: false, error: 'This semester already exists for the academic year' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Failed to create semester' }, { status: 500 });
    }
}

// PUT - Update semester (Admin only)
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { id, semester_number, academic_year, start_date, end_date, is_active } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Semester ID is required' }, { status: 400 });
        }

        // If setting this as active, deactivate others first
        if (is_active) {
            await sql`UPDATE semesters SET is_active = false WHERE is_active = true AND id != ${id}`;
        }

        const name = semester_number && academic_year
            ? `Semester ${semester_number} (${academic_year})`
            : undefined;

        const result = await sql`
      UPDATE semesters
      SET 
        name = COALESCE(${name}, name),
        semester_number = COALESCE(${semester_number}, semester_number),
        academic_year = COALESCE(${academic_year}, academic_year),
        start_date = COALESCE(${start_date}, start_date),
        end_date = COALESCE(${end_date}, end_date),
        is_active = COALESCE(${is_active}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

        if (result.length === 0) {
            return NextResponse.json({ success: false, error: 'Semester not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: result[0] });
    } catch (err) {
        console.error('Semesters PUT error:', err);
        return NextResponse.json({ success: false, error: 'Failed to update semester' }, { status: 500 });
    }
}

// DELETE - Delete semester (Admin only)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Semester ID is required' }, { status: 400 });
        }

        await sql`DELETE FROM semesters WHERE id = ${parseInt(id)}`;

        return NextResponse.json({ success: true, message: 'Semester deleted successfully' });
    } catch (err) {
        console.error('Semesters DELETE error:', err);
        return NextResponse.json({ success: false, error: 'Failed to delete semester' }, { status: 500 });
    }
}
