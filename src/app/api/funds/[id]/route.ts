import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const fund = await db.fund.findUnique({
      where: { id },
      include: { holdings: false },
    })

    if (!fund) {
      return NextResponse.json(
        { error: 'Fund not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(fund)
  } catch (error) {
    console.error('Error fetching fund:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund' },
      { status: 500 }
    )
  }
}
