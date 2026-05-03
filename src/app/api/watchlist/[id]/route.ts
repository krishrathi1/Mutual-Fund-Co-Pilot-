import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/watchlist/[id]?sessionId=xxx - Remove from watchlist by item ID
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

    const item = await db.watchlistItem.findUnique({ where: { id } })

    if (!item) {
      return NextResponse.json(
        { error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    if (item.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Watchlist item does not belong to this session' },
        { status: 403 }
      )
    }

    await db.watchlistItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    )
  }
}

// PATCH /api/watchlist/[id] - Update watchlist item (notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { sessionId, notes, targetPrice } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const item = await db.watchlistItem.findUnique({ where: { id } })

    if (!item) {
      return NextResponse.json(
        { error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    if (item.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Watchlist item does not belong to this session' },
        { status: 403 }
      )
    }

    const updated = await db.watchlistItem.update({
      where: { id },
      data: {
        notes: notes !== undefined ? notes : item.notes,
        targetPrice: targetPrice !== undefined ? parseFloat(String(targetPrice)) : item.targetPrice,
      },
      include: { fund: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating watchlist item:', error)
    return NextResponse.json(
      { error: 'Failed to update watchlist item' },
      { status: 500 }
    )
  }
}
