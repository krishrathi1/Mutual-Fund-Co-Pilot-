import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const TIMEFRAMES = ['1Y', '3Y', '5Y'] as const

const SUB_CATEGORY_ORDER = [
  { name: 'Large Cap', category: 'Equity' },
  { name: 'Mid Cap', category: 'Equity' },
  { name: 'Small Cap', category: 'Equity' },
  { name: 'Flexi Cap', category: 'Equity' },
  { name: 'ELSS', category: 'Equity' },
  { name: 'Sectoral/Thematic', category: 'Equity' },
  { name: 'Dividend Yield', category: 'Equity' },
  { name: 'Gilt', category: 'Debt' },
  { name: 'Corporate Bond', category: 'Debt' },
  { name: 'Short Duration', category: 'Debt' },
  { name: 'Liquid', category: 'Debt' },
  { name: 'Conservative Hybrid', category: 'Hybrid' },
  { name: 'Balanced Advantage', category: 'Hybrid' },
  { name: 'Aggressive Hybrid', category: 'Hybrid' },
]

interface HeatmapCell {
  subCategory: string
  timeframe: string
  avgReturn: number
  fundCount: number
  minReturn: number
  maxReturn: number
  avgExpenseDiff: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where = category ? { category } : {}

    const funds = await db.fund.findMany({ where })

    if (funds.length === 0) {
      return NextResponse.json({ rows: [] })
    }

    // Group by subCategory
    const groups: Record<string, typeof funds> = {}
    for (const fund of funds) {
      const key = fund.subCategory || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(fund)
    }

    const rows: {
      subCategory: string
      category: string
      fundCount: number
      cells: Record<string, HeatmapCell>
    }[] = []

    // Use ordered sub-categories
    const orderedKeys = SUB_CATEGORY_ORDER
      .filter((sc) => !category || sc.category === category)
      .map((sc) => sc.name)
      .filter((name) => groups[name])

    // Add remaining keys not in order
    const allKeys = new Set([...orderedKeys, ...Object.keys(groups)])

    for (const key of allKeys) {
      if (!groups[key]) continue
      const fundGroup = groups[key]
      const mainCategory = SUB_CATEGORY_ORDER.find((sc) => sc.name === key)?.category || 'Other'

      const cells: Record<string, HeatmapCell> = {}

      for (const tf of TIMEFRAMES) {
        const field = tf === '1Y' ? 'directReturn1y' : tf === '3Y' ? 'directReturn3y' : 'directReturn5y'
        const values = fundGroup
          .map((f) => f[field as keyof typeof f] as number | null)
          .filter((v): v is number => v !== null && v !== undefined)

        const expenseDiffs = fundGroup.map((f) => f.regularExpenseRatio - f.directExpenseRatio)

        if (values.length > 0) {
          const avg = values.reduce((s, v) => s + v, 0) / values.length
          cells[tf] = {
            subCategory: key,
            timeframe: tf,
            avgReturn: Math.round(avg * 100) / 100,
            fundCount: values.length,
            minReturn: Math.min(...values),
            maxReturn: Math.max(...values),
            avgExpenseDiff: expenseDiffs.length > 0
              ? Math.round((expenseDiffs.reduce((s, v) => s + v, 0) / expenseDiffs.length) * 100) / 100
              : 0,
          }
        }
      }

      if (Object.keys(cells).length > 0) {
        rows.push({
          subCategory: key,
          category: mainCategory,
          fundCount: fundGroup.length,
          cells,
        })
      }
    }

    return NextResponse.json({ rows })
  } catch (error) {
    console.error('Heatmap error:', error)
    return NextResponse.json({ error: 'Failed to compute heatmap' }, { status: 500 })
  }
}
