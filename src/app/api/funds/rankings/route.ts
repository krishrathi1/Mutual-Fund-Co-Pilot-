import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || ''
    const subCategory = searchParams.get('subCategory') || ''
    const sortBy = searchParams.get('sortBy') || 'return1y'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 100)

    // Build where clause
    const where: Prisma.FundWhereInput = {}
    if (category) where.category = category
    if (subCategory) where.subCategory = subCategory

    // Determine sort field and direction
    const orderDir: 'desc' | 'asc' = sortBy === 'expenseRatio' ? 'asc' : 'desc'

    let orderBy: Prisma.FundOrderByWithRelationInput
    switch (sortBy) {
      case 'return1y':
        orderBy = { directReturn1y: orderDir }
        break
      case 'return3y':
        orderBy = { directReturn3y: orderDir }
        break
      case 'return5y':
        orderBy = { directReturn5y: orderDir }
        break
      case 'sharpe':
        orderBy = { directSharpe1y: orderDir }
        break
      case 'expenseRatio':
        orderBy = { directExpenseRatio: orderDir }
        break
      case 'aum':
        orderBy = { aumCrore: orderDir }
        break
      default:
        orderBy = { directReturn1y: 'desc' }
    }

    const funds = await db.fund.findMany({
      where,
      orderBy,
      take: limit,
    })

    const rankings = funds.map((fund, index) => ({
      rank: index + 1,
      fundId: fund.id,
      schemeName: fund.schemeName,
      fundHouse: fund.fundHouse,
      directReturn: {
        return1y: fund.directReturn1y,
        return3y: fund.directReturn3y,
        return5y: fund.directReturn5y,
      },
      regularReturn: {
        return1y: fund.regularReturn1y,
        return3y: fund.regularReturn3y,
        return5y: fund.regularReturn5y,
      },
      directSharpe: fund.directSharpe1y,
      regularSharpe: fund.regularSharpe1y,
      directER: fund.directExpenseRatio,
      regularER: fund.regularExpenseRatio,
      aum: fund.aumCrore,
    }))

    return NextResponse.json({ rankings })
  } catch (error) {
    console.error('Error fetching fund rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund rankings' },
      { status: 500 }
    )
  }
}
