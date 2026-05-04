import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/watchlist?sessionId=xxx - Get watchlist items with fund data
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    const watchlistItems = await db.watchlistItem.findMany({
      where: { sessionId },
      include: { fund: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ watchlist: watchlistItems })
  } catch (error: any) {
    console.error('Error fetching watchlist:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message,
        path: request.nextUrl.pathname 
      },
      { status: 500 }
    )
  }
}

// POST /api/watchlist - Add fund to watchlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, fundId, notes, targetPrice } = body

    if (!sessionId || !fundId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, fundId' },
        { status: 400 }
      )
    }

    // Verify fund exists
    const fund = await db.fund.findUnique({ where: { id: fundId } })
    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    // Check if already in watchlist (upsert pattern)
    const existing = await db.watchlistItem.findUnique({
      where: { sessionId_fundId: { sessionId, fundId } },
    })

    if (existing) {
      // Update the existing entry with new notes/targetPrice
      const updated = await db.watchlistItem.update({
        where: { id: existing.id },
        data: {
          notes: notes !== undefined ? notes : existing.notes,
          targetPrice: targetPrice !== undefined ? parseFloat(String(targetPrice)) : existing.targetPrice,
        },
        include: { fund: true },
      })
      return NextResponse.json(updated)
    }

    // Create new watchlist item
    const watchlistItem = await db.watchlistItem.create({
      data: {
        sessionId,
        fundId,
        notes: notes || null,
        targetPrice: targetPrice ? parseFloat(String(targetPrice)) : null,
      },
      include: { fund: true },
    })

    return NextResponse.json(watchlistItem, { status: 201 })
  } catch (error: any) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message,
        path: request.nextUrl.pathname 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/watchlist?sessionId=xxx&fundId=yyy - Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    const fundId = request.nextUrl.searchParams.get('fundId')

    if (!sessionId || !fundId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: sessionId, fundId' },
        { status: 400 }
      )
    }

    const watchlistItem = await db.watchlistItem.findUnique({
      where: { sessionId_fundId: { sessionId, fundId } },
    })

    if (!watchlistItem) {
      return NextResponse.json(
        { error: 'Watchlist item not found' },
        { status: 404 }
      )
    }

    await db.watchlistItem.delete({
      where: { id: watchlistItem.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: error.message,
        path: request.nextUrl.pathname 
      },
      { status: 500 }
    )
  }
}
