import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify the holding belongs to this session
    const holding = await db.holding.findUnique({
      where: { id },
    })

    if (!holding) {
      return NextResponse.json(
        { error: 'Holding not found' },
        { status: 404 }
      )
    }

    if (holding.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Unauthorized: holding does not belong to this session' },
        { status: 403 }
      )
    }

    await db.holding.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting holding:', error)
    return NextResponse.json(
      { error: 'Failed to delete holding' },
      { status: 500 }
    )
  }
}
