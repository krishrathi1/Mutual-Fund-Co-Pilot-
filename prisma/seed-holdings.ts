import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Top holdings data organized by sub-category
// Each fund's topHoldings is a JSON array: [{name, weight, sector}]

interface TopHoldingEntry {
  name: string
  weight: number
  sector: string
}

const TOP_HOLDINGS_BY_SUBCATEGORY: Record<string, TopHoldingEntry[][]> = {
  'Large Cap': [
    // SBI Bluechip Fund
    [
      { name: 'HDFC Bank Ltd', weight: 8.45, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.12, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 6.78, sector: 'Information Technology' },
      { name: 'Reliance Industries Ltd', weight: 6.34, sector: 'Energy' },
      { name: 'TCS Ltd', weight: 5.89, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.98, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.67, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.45, sector: 'FMCG' },
      { name: 'Kotak Mahindra Bank Ltd', weight: 3.21, sector: 'Financial Services' },
    ],
    // HDFC Top 100 Fund
    [
      { name: 'ICICI Bank Ltd', weight: 7.82, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 7.45, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 6.56, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.98, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 5.34, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.78, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'SBI Ltd', weight: 3.89, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.56, sector: 'FMCG' },
      { name: 'HCL Technologies Ltd', weight: 3.23, sector: 'Information Technology' },
    ],
    // ICICI Prudential Bluechip Fund
    [
      { name: 'Infosys Ltd', weight: 8.12, sector: 'Information Technology' },
      { name: 'ICICI Bank Ltd', weight: 7.56, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 6.89, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 6.23, sector: 'Financial Services' },
      { name: 'TCS Ltd', weight: 5.67, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.89, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.34, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.78, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.45, sector: 'FMCG' },
      { name: 'Maruti Suzuki Ltd', weight: 3.12, sector: 'Automobile' },
    ],
    // Kotak Bluechip Fund
    [
      { name: 'Reliance Industries Ltd', weight: 9.21, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 7.89, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 5.67, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 5.23, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'SBI Ltd', weight: 3.78, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.34, sector: 'FMCG' },
      { name: 'Asian Paints Ltd', weight: 2.89, sector: 'Consumer Goods' },
    ],
    // Axis Bluechip Fund
    [
      { name: 'HDFC Bank Ltd', weight: 8.94, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.56, sector: 'Financial Services' },
      { name: 'TCS Ltd', weight: 6.78, sector: 'Information Technology' },
      { name: 'Infosys Ltd', weight: 5.89, sector: 'Information Technology' },
      { name: 'Reliance Industries Ltd', weight: 5.34, sector: 'Energy' },
      { name: 'Bharti Airtel Ltd', weight: 4.78, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.23, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.67, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.45, sector: 'FMCG' },
      { name: 'HCL Technologies Ltd', weight: 3.12, sector: 'Information Technology' },
    ],
    // Nippon India Large Cap Fund
    [
      { name: 'Infosys Ltd', weight: 7.68, sector: 'Information Technology' },
      { name: 'Reliance Industries Ltd', weight: 7.34, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 6.89, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.23, sector: 'Financial Services' },
      { name: 'TCS Ltd', weight: 5.78, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'SBI Ltd', weight: 3.78, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.45, sector: 'FMCG' },
      { name: 'Titan Company Ltd', weight: 3.12, sector: 'Consumer Goods' },
    ],
    // BNP Paribas Large Cap Fund
    [
      { name: 'Bharti Airtel Ltd', weight: 7.34, sector: 'Telecom' },
      { name: 'HDFC Bank Ltd', weight: 7.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.56, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 6.23, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.89, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 5.34, sector: 'Information Technology' },
      { name: 'Larsen & Toubro Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.78, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.45, sector: 'FMCG' },
      { name: 'Sun Pharma Ltd', weight: 3.12, sector: 'Healthcare' },
    ],
    // Mirae Asset Large Cap Fund
    [
      { name: 'HDFC Bank Ltd', weight: 9.56, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.34, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 6.78, sector: 'Information Technology' },
      { name: 'Reliance Industries Ltd', weight: 6.12, sector: 'Energy' },
      { name: 'TCS Ltd', weight: 5.45, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.89, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 4.23, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.67, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.34, sector: 'FMCG' },
      { name: 'Kotak Mahindra Bank Ltd', weight: 3.12, sector: 'Financial Services' },
    ],
  ],
  'Mid Cap': [
    // HDFC Mid-Cap Opportunities Fund
    [
      { name: 'Indian Hotels Co Ltd', weight: 5.67, sector: 'Consumer Services' },
      { name: 'Cummins India Ltd', weight: 5.12, sector: 'Capital Goods' },
      { name: 'Cholamandalam Investment & Finance', weight: 4.89, sector: 'Financial Services' },
      { name: 'Trent Ltd', weight: 4.56, sector: 'Retail' },
      { name: 'Page Industries Ltd', weight: 4.23, sector: 'Textiles' },
      { name: 'Apar Industries Ltd', weight: 3.98, sector: 'Capital Goods' },
      { name: 'Delhivery Ltd', weight: 3.78, sector: 'Logistics' },
      { name: 'Carborundum Universal Ltd', weight: 3.56, sector: 'Industrial Products' },
      { name: 'KPIT Technologies Ltd', weight: 3.34, sector: 'Information Technology' },
      { name: 'Zydus Lifesciences Ltd', weight: 3.12, sector: 'Healthcare' },
    ],
    // Kotak Emerging Equity Fund
    [
      { name: 'Cummins India Ltd', weight: 4.89, sector: 'Capital Goods' },
      { name: 'Indian Hotels Co Ltd', weight: 4.67, sector: 'Consumer Services' },
      { name: 'Cholamandalam Investment & Finance', weight: 4.45, sector: 'Financial Services' },
      { name: 'Trent Ltd', weight: 4.12, sector: 'Retail' },
      { name: 'Apar Industries Ltd', weight: 3.89, sector: 'Capital Goods' },
      { name: 'Delhivery Ltd', weight: 3.67, sector: 'Logistics' },
      { name: 'Page Industries Ltd', weight: 3.45, sector: 'Textiles' },
      { name: 'Carborundum Universal Ltd', weight: 3.23, sector: 'Industrial Products' },
      { name: 'KPIT Technologies Ltd', weight: 3.12, sector: 'Information Technology' },
      { name: 'Persistent Systems Ltd', weight: 2.89, sector: 'Information Technology' },
    ],
    // Axis Midcap Fund
    [
      { name: 'Trent Ltd', weight: 5.12, sector: 'Retail' },
      { name: 'Indian Hotels Co Ltd', weight: 4.89, sector: 'Consumer Services' },
      { name: 'Cholamandalam Investment & Finance', weight: 4.56, sector: 'Financial Services' },
      { name: 'Cummins India Ltd', weight: 4.34, sector: 'Capital Goods' },
      { name: 'Apar Industries Ltd', weight: 3.89, sector: 'Capital Goods' },
      { name: 'Page Industries Ltd', weight: 3.67, sector: 'Textiles' },
      { name: 'Delhivery Ltd', weight: 3.45, sector: 'Logistics' },
      { name: 'KPIT Technologies Ltd', weight: 3.23, sector: 'Information Technology' },
      { name: 'Carborundum Universal Ltd', weight: 3.12, sector: 'Industrial Products' },
      { name: 'Zydus Lifesciences Ltd', weight: 2.89, sector: 'Healthcare' },
    ],
    // SBI Magnum Midcap Fund
    [
      { name: 'Cholamandalam Investment & Finance', weight: 4.56, sector: 'Financial Services' },
      { name: 'Indian Hotels Co Ltd', weight: 4.34, sector: 'Consumer Services' },
      { name: 'Cummins India Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'Trent Ltd', weight: 3.89, sector: 'Retail' },
      { name: 'Apar Industries Ltd', weight: 3.67, sector: 'Capital Goods' },
      { name: 'Page Industries Ltd', weight: 3.45, sector: 'Textiles' },
      { name: 'Delhivery Ltd', weight: 3.23, sector: 'Logistics' },
      { name: 'KPIT Technologies Ltd', weight: 3.12, sector: 'Information Technology' },
      { name: 'Carborundum Universal Ltd', weight: 2.89, sector: 'Industrial Products' },
      { name: 'Persistent Systems Ltd', weight: 2.67, sector: 'Information Technology' },
    ],
    // DSP Midcap Fund
    [
      { name: 'Page Industries Ltd', weight: 4.78, sector: 'Textiles' },
      { name: 'Indian Hotels Co Ltd', weight: 4.56, sector: 'Consumer Services' },
      { name: 'Cholamandalam Investment & Finance', weight: 4.34, sector: 'Financial Services' },
      { name: 'Cummins India Ltd', weight: 4.12, sector: 'Capital Goods' },
      { name: 'Trent Ltd', weight: 3.89, sector: 'Retail' },
      { name: 'Apar Industries Ltd', weight: 3.67, sector: 'Capital Goods' },
      { name: 'Delhivery Ltd', weight: 3.45, sector: 'Logistics' },
      { name: 'KPIT Technologies Ltd', weight: 3.23, sector: 'Information Technology' },
      { name: 'Zydus Lifesciences Ltd', weight: 3.12, sector: 'Healthcare' },
      { name: 'Carborundum Universal Ltd', weight: 2.89, sector: 'Industrial Products' },
    ],
    // Nippon India Growth Fund
    [
      { name: 'Carborundum Universal Ltd', weight: 4.34, sector: 'Industrial Products' },
      { name: 'Indian Hotels Co Ltd', weight: 4.12, sector: 'Consumer Services' },
      { name: 'Cummins India Ltd', weight: 3.89, sector: 'Capital Goods' },
      { name: 'Cholamandalam Investment & Finance', weight: 3.78, sector: 'Financial Services' },
      { name: 'Trent Ltd', weight: 3.56, sector: 'Retail' },
      { name: 'Apar Industries Ltd', weight: 3.34, sector: 'Capital Goods' },
      { name: 'Page Industries Ltd', weight: 3.12, sector: 'Textiles' },
      { name: 'Delhivery Ltd', weight: 2.89, sector: 'Logistics' },
      { name: 'KPIT Technologies Ltd', weight: 2.67, sector: 'Information Technology' },
      { name: 'Persistent Systems Ltd', weight: 2.45, sector: 'Information Technology' },
    ],
  ],
  'Small Cap': [
    // SBI Small Cap Fund
    [
      { name: 'KPIT Technologies Ltd', weight: 4.23, sector: 'Information Technology' },
      { name: 'Firstsource Solutions Ltd', weight: 3.89, sector: 'IT Services' },
      { name: 'Aarti Industries Ltd', weight: 3.56, sector: 'Chemicals' },
      { name: 'Tata Elxsi Ltd', weight: 3.34, sector: 'Information Technology' },
      { name: 'Cyient Ltd', weight: 3.12, sector: 'Information Technology' },
      { name: 'JBM Auto Ltd', weight: 2.89, sector: 'Automobile' },
      { name: 'Kei Industries Ltd', weight: 2.67, sector: 'Industrial Products' },
      { name: 'Sirca Paints India Ltd', weight: 2.45, sector: 'Consumer Goods' },
      { name: 'Galaxy Surfactants Ltd', weight: 2.34, sector: 'Chemicals' },
      { name: 'La Opala RG Ltd', weight: 2.12, sector: 'Consumer Goods' },
    ],
    // Nippon India Small Cap Fund
    [
      { name: 'Firstsource Solutions Ltd', weight: 3.89, sector: 'IT Services' },
      { name: 'KPIT Technologies Ltd', weight: 3.67, sector: 'Information Technology' },
      { name: 'Aarti Industries Ltd', weight: 3.45, sector: 'Chemicals' },
      { name: 'Tata Elxsi Ltd', weight: 3.23, sector: 'Information Technology' },
      { name: 'Cyient Ltd', weight: 3.12, sector: 'Information Technology' },
      { name: 'JBM Auto Ltd', weight: 2.89, sector: 'Automobile' },
      { name: 'Kei Industries Ltd', weight: 2.67, sector: 'Industrial Products' },
      { name: 'Sirca Paints India Ltd', weight: 2.45, sector: 'Consumer Goods' },
      { name: 'Galaxy Surfactants Ltd', weight: 2.34, sector: 'Chemicals' },
      { name: 'La Opala RG Ltd', weight: 2.12, sector: 'Consumer Goods' },
    ],
    // DSP Small Cap Fund
    [
      { name: 'Aarti Industries Ltd', weight: 3.56, sector: 'Chemicals' },
      { name: 'KPIT Technologies Ltd', weight: 3.34, sector: 'Information Technology' },
      { name: 'Firstsource Solutions Ltd', weight: 3.12, sector: 'IT Services' },
      { name: 'Tata Elxsi Ltd', weight: 2.89, sector: 'Information Technology' },
      { name: 'Cyient Ltd', weight: 2.67, sector: 'Information Technology' },
      { name: 'JBM Auto Ltd', weight: 2.45, sector: 'Automobile' },
      { name: 'Kei Industries Ltd', weight: 2.34, sector: 'Industrial Products' },
      { name: 'Sirca Paints India Ltd', weight: 2.12, sector: 'Consumer Goods' },
      { name: 'Galaxy Surfactants Ltd', weight: 2.01, sector: 'Chemicals' },
      { name: 'La Opala RG Ltd', weight: 1.89, sector: 'Consumer Goods' },
    ],
    // HDFC Small Cap Fund
    [
      { name: 'Tata Elxsi Ltd', weight: 3.78, sector: 'Information Technology' },
      { name: 'KPIT Technologies Ltd', weight: 3.56, sector: 'Information Technology' },
      { name: 'Firstsource Solutions Ltd', weight: 3.34, sector: 'IT Services' },
      { name: 'Aarti Industries Ltd', weight: 3.12, sector: 'Chemicals' },
      { name: 'Cyient Ltd', weight: 2.89, sector: 'Information Technology' },
      { name: 'JBM Auto Ltd', weight: 2.67, sector: 'Automobile' },
      { name: 'Kei Industries Ltd', weight: 2.45, sector: 'Industrial Products' },
      { name: 'Sirca Paints India Ltd', weight: 2.23, sector: 'Consumer Goods' },
      { name: 'Galaxy Surfactants Ltd', weight: 2.12, sector: 'Chemicals' },
      { name: 'La Opala RG Ltd', weight: 1.89, sector: 'Consumer Goods' },
    ],
    // Axis Small Cap Fund
    [
      { name: 'Cyient Ltd', weight: 4.12, sector: 'Information Technology' },
      { name: 'KPIT Technologies Ltd', weight: 3.89, sector: 'Information Technology' },
      { name: 'Firstsource Solutions Ltd', weight: 3.67, sector: 'IT Services' },
      { name: 'Aarti Industries Ltd', weight: 3.45, sector: 'Chemicals' },
      { name: 'Tata Elxsi Ltd', weight: 3.23, sector: 'Information Technology' },
      { name: 'JBM Auto Ltd', weight: 2.89, sector: 'Automobile' },
      { name: 'Kei Industries Ltd', weight: 2.67, sector: 'Industrial Products' },
      { name: 'Sirca Paints India Ltd', weight: 2.45, sector: 'Consumer Goods' },
      { name: 'Galaxy Surfactants Ltd', weight: 2.34, sector: 'Chemicals' },
      { name: 'La Opala RG Ltd', weight: 2.12, sector: 'Consumer Goods' },
    ],
  ],
  'Flexi Cap': [
    // HDFC Flexi Cap Fund
    [
      { name: 'HDFC Bank Ltd', weight: 7.89, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.34, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.78, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.12, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.56, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.12, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.45, sector: 'Financial Services' },
      { name: 'Indian Hotels Co Ltd', weight: 3.12, sector: 'Consumer Services' },
      { name: 'Cummins India Ltd', weight: 2.89, sector: 'Capital Goods' },
    ],
    // Kotak Flexicap Fund
    [
      { name: 'ICICI Bank Ltd', weight: 8.34, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 6.12, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.34, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.89, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.23, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.45, sector: 'Financial Services' },
      { name: 'Trent Ltd', weight: 3.12, sector: 'Retail' },
      { name: 'Cummins India Ltd', weight: 2.89, sector: 'Capital Goods' },
    ],
    // SBI Flexicap Fund
    [
      { name: 'Reliance Industries Ltd', weight: 8.56, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 7.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.34, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 5.67, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 5.12, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.45, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.89, sector: 'Capital Goods' },
      { name: 'SBI Ltd', weight: 3.56, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.23, sector: 'FMCG' },
      { name: 'Cholamandalam Investment & Finance', weight: 2.89, sector: 'Financial Services' },
    ],
    // Parag Parikh Flexi Cap Fund
    [
      { name: 'Bajaj Holdings & Investment Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 6.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 5.34, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 4.89, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 4.56, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.12, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 3.78, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.45, sector: 'Capital Goods' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'Maruti Suzuki Ltd', weight: 2.89, sector: 'Automobile' },
    ],
    // DSP Flexi Cap Fund
    [
      { name: 'Power Finance Corporation Ltd', weight: 5.34, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 5.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 4.89, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 4.56, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 4.23, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 3.89, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 3.56, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.23, sector: 'Capital Goods' },
      { name: 'Indian Hotels Co Ltd', weight: 2.89, sector: 'Consumer Services' },
      { name: 'Cummins India Ltd', weight: 2.67, sector: 'Capital Goods' },
    ],
  ],
  'ELSS': [
    // Axis ELSS Tax Saver Fund
    [
      { name: 'HDFC Bank Ltd', weight: 7.45, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.89, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.34, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.78, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.12, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.67, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.34, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'Kotak Mahindra Bank Ltd', weight: 2.89, sector: 'Financial Services' },
    ],
    // SBI Long Term Equity Fund
    [
      { name: 'ICICI Bank Ltd', weight: 8.12, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 7.34, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 6.56, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.78, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 5.12, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.89, sector: 'Capital Goods' },
      { name: 'SBI Ltd', weight: 3.45, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'HCL Technologies Ltd', weight: 2.78, sector: 'Information Technology' },
    ],
    // HDFC TaxSaver Fund
    [
      { name: 'Reliance Industries Ltd', weight: 7.89, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 7.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.34, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 5.67, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.89, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.23, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.45, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'Maruti Suzuki Ltd', weight: 2.89, sector: 'Automobile' },
    ],
    // Kotak Tax Saver Fund
    [
      { name: 'Kotak Mahindra Bank Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.12, sector: 'Financial Services' },
      { name: 'HDFC Bank Ltd', weight: 5.89, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.34, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 4.78, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.23, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 3.89, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.45, sector: 'Capital Goods' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'HCL Technologies Ltd', weight: 2.78, sector: 'Information Technology' },
    ],
    // DSP Tax Saver Fund
    [
      { name: 'Infosys Ltd', weight: 6.45, sector: 'Information Technology' },
      { name: 'HDFC Bank Ltd', weight: 6.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 5.78, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.34, sector: 'Energy' },
      { name: 'TCS Ltd', weight: 4.89, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.23, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.45, sector: 'Financial Services' },
      { name: 'ITC Ltd', weight: 3.12, sector: 'FMCG' },
      { name: 'Sun Pharma Ltd', weight: 2.78, sector: 'Healthcare' },
    ],
  ],
  'Index Fund': [
    // HDFC Index Fund - Nifty 50 Plan
    [
      { name: 'Reliance Industries Ltd', weight: 10.23, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 9.45, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 8.12, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.34, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.78, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 4.12, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.34, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 3.12, sector: 'Financial Services' },
    ],
    // SBI Nifty Index Fund
    [
      { name: 'HDFC Bank Ltd', weight: 10.67, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 9.89, sector: 'Energy' },
      { name: 'ICICI Bank Ltd', weight: 7.78, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.12, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.45, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.34, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 3.89, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.56, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.23, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 2.89, sector: 'Financial Services' },
    ],
    // UTI Nifty 50 Index Fund
    [
      { name: 'Reliance Industries Ltd', weight: 10.12, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 9.56, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.89, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.23, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.56, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.45, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 3.98, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.67, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.34, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 3.01, sector: 'Financial Services' },
    ],
    // Nippon India Index Fund
    [
      { name: 'HDFC Bank Ltd', weight: 10.34, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 9.78, sector: 'Energy' },
      { name: 'ICICI Bank Ltd', weight: 7.56, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.12, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.34, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 4.12, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.23, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 3.01, sector: 'Financial Services' },
    ],
    // Motilal Oswal Nifty 50 Index Fund
    [
      { name: 'Reliance Industries Ltd', weight: 10.45, sector: 'Energy' },
      { name: 'HDFC Bank Ltd', weight: 9.67, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.78, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.34, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.45, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.56, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 4.12, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.78, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.34, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 2.89, sector: 'Financial Services' },
    ],
    // Tata Nifty 50 Index Fund
    [
      { name: 'HDFC Bank Ltd', weight: 10.56, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 9.89, sector: 'Energy' },
      { name: 'ICICI Bank Ltd', weight: 7.67, sector: 'Financial Services' },
      { name: 'Infosys Ltd', weight: 7.12, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 6.78, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 4.45, sector: 'Telecom' },
      { name: 'ITC Ltd', weight: 3.89, sector: 'FMCG' },
      { name: 'Larsen & Toubro Ltd', weight: 3.56, sector: 'Capital Goods' },
      { name: 'Axis Bank Ltd', weight: 3.23, sector: 'Financial Services' },
      { name: 'SBI Ltd', weight: 3.12, sector: 'Financial Services' },
    ],
  ],
  'Liquid': [
    [
      { name: 'Reserve Bank of India', weight: 15.23, sector: 'Government Securities' },
      { name: 'National Bank for Agriculture & Rural Dev', weight: 12.45, sector: 'Government Securities' },
      { name: 'HDFC Bank Ltd', weight: 8.67, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 7.89, sector: 'Financial Services' },
      { name: 'State Bank of India', weight: 6.34, sector: 'Financial Services' },
      { name: 'Punjab National Bank', weight: 5.78, sector: 'Financial Services' },
      { name: 'Bank of Baroda', weight: 5.12, sector: 'Financial Services' },
      { name: 'Union Bank of India', weight: 4.56, sector: 'Financial Services' },
      { name: 'Indian Bank', weight: 4.12, sector: 'Financial Services' },
      { name: 'Canara Bank', weight: 3.89, sector: 'Financial Services' },
    ],
  ],
  'Aggressive Hybrid': [
    [
      { name: 'HDFC Bank Ltd', weight: 7.12, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 6.34, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.78, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 5.12, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.56, sector: 'Information Technology' },
      { name: 'Bharti Airtel Ltd', weight: 3.89, sector: 'Telecom' },
      { name: 'Larsen & Toubro Ltd', weight: 3.45, sector: 'Capital Goods' },
      { name: 'Government of India Bond', weight: 8.23, sector: 'Government Securities' },
      { name: 'State Development Loan', weight: 5.67, sector: 'Government Securities' },
      { name: 'AAA Corporate Bond', weight: 4.89, sector: 'Corporate Debt' },
    ],
  ],
  'Short Duration': [
    [
      { name: 'Government of India Bond', weight: 18.45, sector: 'Government Securities' },
      { name: 'State Development Loan', weight: 12.34, sector: 'Government Securities' },
      { name: 'HDFC Ltd Bond', weight: 8.67, sector: 'Corporate Debt' },
      { name: 'ICICI Bank CD', weight: 7.89, sector: 'Corporate Debt' },
      { name: 'SBI Bond', weight: 6.78, sector: 'Corporate Debt' },
      { name: 'L&T Finance Bond', weight: 5.67, sector: 'Corporate Debt' },
      { name: 'Bajaj Finance Bond', weight: 5.12, sector: 'Corporate Debt' },
      { name: 'Reliance Industries CP', weight: 4.56, sector: 'Corporate Debt' },
      { name: 'Tata Steel Bond', weight: 4.12, sector: 'Corporate Debt' },
      { name: 'NHAI Bond', weight: 3.89, sector: 'Government Securities' },
    ],
  ],
  'Corporate Bond': [
    [
      { name: 'HDFC Ltd Bond', weight: 12.45, sector: 'Corporate Debt' },
      { name: 'ICICI Bank Bond', weight: 10.34, sector: 'Corporate Debt' },
      { name: 'SBI Bond', weight: 8.78, sector: 'Corporate Debt' },
      { name: 'Bajaj Finance Bond', weight: 7.89, sector: 'Corporate Debt' },
      { name: 'L&T Finance Bond', weight: 6.56, sector: 'Corporate Debt' },
      { name: 'Reliance Industries Bond', weight: 5.78, sector: 'Corporate Debt' },
      { name: 'Tata Steel Bond', weight: 5.12, sector: 'Corporate Debt' },
      { name: 'Government of India Bond', weight: 4.89, sector: 'Government Securities' },
      { name: 'State Bank of India CD', weight: 4.34, sector: 'Corporate Debt' },
      { name: 'NHAI Bond', weight: 3.89, sector: 'Government Securities' },
    ],
  ],
  'Conservative Hybrid': [
    [
      { name: 'Government of India Bond', weight: 22.34, sector: 'Government Securities' },
      { name: 'State Development Loan', weight: 15.67, sector: 'Government Securities' },
      { name: 'HDFC Ltd Bond', weight: 10.12, sector: 'Corporate Debt' },
      { name: 'ICICI Bank CD', weight: 8.45, sector: 'Corporate Debt' },
      { name: 'SBI Bond', weight: 7.23, sector: 'Corporate Debt' },
      { name: 'HDFC Bank Ltd', weight: 4.56, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 3.89, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 3.12, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 2.78, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 2.45, sector: 'Information Technology' },
    ],
  ],
  'Balanced Advantage': [
    [
      { name: 'HDFC Bank Ltd', weight: 6.78, sector: 'Financial Services' },
      { name: 'ICICI Bank Ltd', weight: 5.89, sector: 'Financial Services' },
      { name: 'Reliance Industries Ltd', weight: 5.34, sector: 'Energy' },
      { name: 'Infosys Ltd', weight: 4.56, sector: 'Information Technology' },
      { name: 'TCS Ltd', weight: 4.12, sector: 'Information Technology' },
      { name: 'Government of India Bond', weight: 10.23, sector: 'Government Securities' },
      { name: 'State Development Loan', weight: 7.89, sector: 'Government Securities' },
      { name: 'HDFC Ltd Bond', weight: 5.67, sector: 'Corporate Debt' },
      { name: 'Bharti Airtel Ltd', weight: 3.45, sector: 'Telecom' },
      { name: 'AAA Corporate Bond', weight: 4.89, sector: 'Corporate Debt' },
    ],
  ],
}

async function main() {
  console.log('🔄 Seeding topHoldings data for existing funds...\n')

  const funds = await prisma.fund.findMany()
  console.log(`📊 Found ${funds.length} funds in database\n`)

  let updated = 0
  let skipped = 0

  for (const fund of funds) {
    // Skip if topHoldings already exists
    if (fund.topHoldings) {
      console.log(`  ⏭️  Skipping ${fund.schemeName} (already has topHoldings)`)
      skipped++
      continue
    }

    const subCat = fund.subCategory
    const holdingsArrays = TOP_HOLDINGS_BY_SUBCATEGORY[subCat]

    if (!holdingsArrays || holdingsArrays.length === 0) {
      console.log(`  ⚠️  No topHoldings template for subCategory: ${subCat} (${fund.schemeName})`)
      skipped++
      continue
    }

    // Pick a holdings array based on fund index within subcategory
    // Use a hash of the fund name for variety
    const hash = fund.schemeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const idx = hash % holdingsArrays.length
    const holdings = holdingsArrays[idx]

    await prisma.fund.update({
      where: { id: fund.id },
      data: { topHoldings: JSON.stringify(holdings) },
    })

    console.log(`  ✅ Updated ${fund.schemeName} with ${holdings.length} top holdings`)
    updated++
  }

  console.log(`\n📈 Summary: ${updated} funds updated, ${skipped} skipped\n`)

  // Verify by sampling a few funds
  const sampleFunds = await prisma.fund.findMany({
    where: { topHoldings: { not: null } },
    take: 3,
    select: { schemeName: true, topHoldings: true },
  })

  console.log('🔍 Sample verification:')
  for (const fund of sampleFunds) {
    const holdings = JSON.parse(fund.topHoldings!) as TopHoldingEntry[]
    console.log(`  ${fund.schemeName}: ${holdings.length} holdings (top: ${holdings[0]?.name} @ ${holdings[0]?.weight}%)`)
  }

  console.log('\n🎉 topHoldings seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
