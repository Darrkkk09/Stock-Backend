const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const fs = require("fs")

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, "..", "database")
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const dbPath = path.join(dbDir, "stocks.db")

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log("Existing database removed")
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error creating database:", err.message)
    return
  }
  console.log("Connected to SQLite database")
})

// Create tables
db.serialize(() => {
  // Companies table
  db.run(`
    CREATE TABLE companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL UNIQUE,
      sector TEXT NOT NULL,
      market_cap REAL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Stock data table
  db.run(`
    CREATE TABLE stock_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      date DATE NOT NULL,
      open_price REAL NOT NULL,
      high_price REAL NOT NULL,
      low_price REAL NOT NULL,
      close_price REAL NOT NULL,
      volume INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies (id)
    )
  `)

  // Insert sample companies
  const companies = [
    ["Reliance Industries", "RELIANCE", "Oil & Gas", 1500000, "Largest private sector company in India"],
    ["Tata Consultancy Services", "TCS", "Information Technology", 1200000, "Leading IT services company"],
    ["HDFC Bank", "HDFCBANK", "Banking", 800000, "Leading private sector bank"],
    ["Infosys", "INFY", "Information Technology", 700000, "Global IT consulting company"],
    ["Hindustan Unilever", "HINDUNILVR", "FMCG", 600000, "Consumer goods company"],
    ["ICICI Bank", "ICICIBANK", "Banking", 550000, "Private sector bank"],
    ["State Bank of India", "SBIN", "Banking", 400000, "Largest public sector bank"],
    ["Bharti Airtel", "BHARTIARTL", "Telecommunications", 450000, "Leading telecom operator"],
    ["ITC Limited", "ITC", "FMCG", 350000, "Diversified conglomerate"],
    ["Kotak Mahindra Bank", "KOTAKBANK", "Banking", 300000, "Private sector bank"],
    ["Larsen & Toubro", "LT", "Engineering", 280000, "Engineering and construction company"],
    ["Asian Paints", "ASIANPAINT", "Paints", 250000, "Leading paint manufacturer"],
  ]

  const insertCompany = db.prepare(`
    INSERT INTO companies (name, symbol, sector, market_cap, description)
    VALUES (?, ?, ?, ?, ?)
  `)

  companies.forEach((company) => {
    insertCompany.run(company)
  })
  insertCompany.finalize()

  // Generate sample stock data for each company
  const insertStock = db.prepare(`
    INSERT INTO stock_data (company_id, date, open_price, high_price, low_price, close_price, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  // Generate data for the last 6 months
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)

  for (let companyId = 1; companyId <= companies.length; companyId++) {
    let basePrice = 100 + Math.random() * 2000 
    const currentDate = new Date(startDate)

    while (currentDate <= new Date()) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        // Generate realistic stock data with some volatility
        const volatility = 0.02 // 2% daily volatility
        const change = (Math.random() - 0.5) * 2 * volatility

        const openPrice = basePrice
        const closePrice = basePrice * (1 + change)
        const highPrice = Math.max(openPrice, closePrice) * (1 + Math.random() * 0.01)
        const lowPrice = Math.min(openPrice, closePrice) * (1 - Math.random() * 0.01)
        const volume = Math.floor(Math.random() * 1000000) + 100000

        insertStock.run([
          companyId,
          currentDate.toISOString().split("T")[0],
          Math.round(openPrice * 100) / 100,
          Math.round(highPrice * 100) / 100,
          Math.round(lowPrice * 100) / 100,
          Math.round(closePrice * 100) / 100,
          volume,
        ])

        basePrice = closePrice // Update base price for next day
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }

  insertStock.finalize()
})

db.close((err) => {
  if (err) {
    console.error("Error closing database:", err.message)
  } else {
    console.log("Database initialized successfully with sample data")
    console.log("Companies and stock data have been created")
  }
})
