import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/holdings - Add a holding
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, fundId, planType, investedAmount, currentAmount, units, purchaseDate } = body

    if (!sessionId || !fundId || !planType || investedAmount == null || currentAmount == null || units == null) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, fundId, planType, investedAmount, currentAmount, units' },
        { status: 400 }
      )
    }

    if (planType !== 'direct' && planType !== 'regular') {
      return NextResponse.json(
        { error: 'planType must be "direct" or "regular"' },
        { status: 400 }
      )
    }

    if (investedAmount < 0 || currentAmount < 0 || units < 0) {
      return NextResponse.json(
        { error: 'Amounts and units must be non-negative' },
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

    const holding = await db.holding.create({
      data: {
        sessionId,
        fundId,
        planType,
        investedAmount: parseFloat(String(investedAmount)),
        currentAmount: parseFloat(String(currentAmount)),
        units: parseFloat(String(units)),
        purchaseDate: purchaseDate || null,
      },
      include: { fund: true },
    })

    return NextResponse.json(holding, { status: 201 })
  } catch (error) {
    console.error('Error creating holding:', error)
    return NextResponse.json(
      { error: 'Failed to create holding' },
      { status: 500 }
    )
  }
}

// GET /api/holdings - Get all holdings for a session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 }
      )
    }

    const holdings = await db.holding.findMany({
      where: { sessionId },
      include: { fund: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ holdings })
  } catch (error) {
    console.error('Error fetching holdings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    )
  }
}
