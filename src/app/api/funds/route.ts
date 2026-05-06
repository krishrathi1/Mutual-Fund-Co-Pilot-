import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const q = searchParams.get('q') || ''
    const category = searchParams.get('category') || ''
    const subCategory = searchParams.get('subCategory') || ''
    const sortBy = searchParams.get('sortBy') || 'aum'
    const order = searchParams.get('order') || 'desc'
    const planType = searchParams.get('planType') || 'direct' // 'direct' or 'regular'
    
    // Robust parsing for limit and offset
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam) || 20, 1), 100) : 20
    const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : 0
    
    const orderDir: 'asc' | 'desc' = order.toLowerCase() === 'asc' ? 'asc' : 'desc'
    
    // Build where clause
    const where: Prisma.FundWhereInput = {}
    
    if (q) {
      where.OR = [
        { schemeName: { contains: q } },
        { fundHouse: { contains: q } },
        { category: { contains: q } },
      ]
    }
    
    if (category) {
      where.category = category
    }
    
    if (subCategory) {
      where.subCategory = subCategory
    }
    
    // Determine sort
    let orderBy: Prisma.FundOrderByWithRelationInput = { aumCrore: orderDir }
    
    switch (sortBy) {
      case 'aum':
      case 'aumCrore':
        orderBy = { aumCrore: orderDir }
        break
      case 'name':
      case 'schemeName':
        orderBy = { schemeName: orderDir }
        break
      case 'expenseRatio':
      case 'directExpenseRatio':
        orderBy = planType === 'direct' 
          ? { directExpenseRatio: orderDir } 
          : { regularExpenseRatio: orderDir }
        break
      case 'return1y':
      case 'directReturn1y':
        orderBy = planType === 'direct'
          ? { directReturn1y: orderDir }
          : { regularReturn1y: orderDir }
        break
      case 'return3y':
      case 'directReturn3y':
        orderBy = planType === 'direct'
          ? { directReturn3y: orderDir }
          : { regularReturn3y: orderDir }
        break
      case 'return5y':
      case 'directReturn5y':
        orderBy = planType === 'direct'
          ? { directReturn5y: orderDir }
          : { regularReturn5y: orderDir }
        break
      case 'sharpe1y':
      case 'directSharpe1y':
        orderBy = { directSharpe1y: orderDir }
        break
      case 'expenseDiff':
        // Sort in memory later
        orderBy = { aumCrore: 'desc' }
        break
      case 'diversificationScore':
        // Sort in memory later
        orderBy = { aumCrore: 'desc' }
        break
      default:
        orderBy = { aumCrore: 'desc' }
    }
    
    const [funds, total] = await Promise.all([
      db.fund.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      db.fund.count({ where }),
    ])

    // Handle in-memory sorting for complex fields
    if (sortBy === 'expenseDiff') {
      funds.sort((a, b) => {
        const diffA = a.regularExpenseRatio - a.directExpenseRatio
        const diffB = b.regularExpenseRatio - b.directExpenseRatio
        return orderDir === 'desc' ? diffB - diffA : diffA - diffB
      })
    } else if (sortBy === 'diversificationScore') {
      // Logic for computing diversification score
      const computeDiversificationScore = (f: typeof funds[0]): number => {
        let score = 0
        // Portfolio concentration (proxied by numStocks)
        if (f.numStocks) {
          score += Math.min(40, f.numStocks / 2)
        }
        // Sector/Category diversity (simplified)
        const cat = f.category?.toLowerCase() || ''
        const sub = f.subCategory?.toLowerCase() || ''
        if (cat.includes('hybrid') || sub.includes('multi')) {
          score += 30
        } else if (cat.includes('index') || sub.includes('large')) {
          score += 15
        }
        
        // Asset allocation balance
        if (f.equityPercentage && f.debtPercentage) {
          const minPct = Math.min(f.equityPercentage, f.debtPercentage)
          score += Math.min(30, minPct * 0.6)
        }
        
        return score
      }
      
      funds.sort((a, b) => {
        const scoreA = computeDiversificationScore(a)
        const scoreB = computeDiversificationScore(b)
        return orderDir === 'desc' ? scoreB - scoreA : scoreA - scoreB
      })
    }
    
    return NextResponse.json({ funds, total })
  } catch (error) {
    console.error('API /api/funds error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
