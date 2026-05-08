import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { pipeline } from '@xenova/transformers';
import { db } from './db';
import path from 'path';

// Local Vector Database logic for high-speed semantic search
let embedder: any = null;
let dbInstance: lancedb.Connection | null = null;

const DB_PATH = path.join(process.cwd(), 'data', 'lancedb');
const TABLE_NAME = 'fund_vectors';

export async function getEmbedder() {
  if (!embedder) {
    console.log('VectorDB: Loading embedding model (all-MiniLM-L6-v2)...')
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('VectorDB: Embedding model loaded')
  }
  return embedder;
}

export async function getVectorDB() {
  if (!dbInstance) {
    console.log('VectorDB: Connecting to LanceDB at', DB_PATH)
    dbInstance = await lancedb.connect(DB_PATH);
    console.log('VectorDB: Connected to LanceDB')
  }
  return dbInstance;
}

async function getEmbedding(text: string) {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function syncFundsToVectorDB() {
  const ldb = await getVectorDB();
  const funds = await db.fund.findMany();
  
  const data = await Promise.all(funds.map(async (f) => {
    const textToEmbed = `${f.schemeName} ${f.fundHouse} ${f.category} ${f.subCategory} ${f.riskometer}`;
    const vector = await getEmbedding(textToEmbed);
    
    return {
      id: f.id,
      vector,
      schemeName: f.schemeName,
      category: f.category,
      fundHouse: f.fundHouse,
      details: JSON.stringify({
        directExpense: f.directExpenseRatio,
        regularExpense: f.regularExpenseRatio,
        return1y: f.directReturn1y,
        return3y: f.directReturn3y,
        return5y: f.directReturn5y,
        aum: f.aumCrore,
        risk: f.riskometer
      })
    };
  }));

  try {
    const tableNames = await ldb.tableNames();
    if (tableNames.includes(TABLE_NAME)) {
      const table = await ldb.openTable(TABLE_NAME);
      await table.add(data);
    } else {
      await ldb.createTable(TABLE_NAME, data);
    }
    console.log(`Synced ${funds.length} funds to LanceDB`);
  } catch (err) {
    console.error('LanceDB Sync Error:', err);
  }
}

export async function semanticSearchFunds(query: string, limit: number = 4) {
  try {
    const ldb = await getVectorDB();
    const tableNames = await ldb.tableNames();
    if (!tableNames.includes(TABLE_NAME)) {
      await syncFundsToVectorDB();
    }

    const table = await ldb.openTable(TABLE_NAME);
    const queryVector = await getEmbedding(query);
    
    const results = await table
      .vectorSearch(queryVector)
      .limit(limit)
      .toArray();

    return results.map(r => ({
      schemeName: r.schemeName,
      category: r.category,
      fundHouse: r.fundHouse,
      ...JSON.parse(r.details as string)
    }));
  } catch (err) {
    console.error('Semantic Search Error:', err);
    return [];
  }
}
