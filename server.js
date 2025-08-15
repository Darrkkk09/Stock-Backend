const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors(
  {
    origin:"*",
    methods: ["GET", "POST"],
    credentials: true,
  }
))
app.use(express.json())

// Db connection
const dbPath = path.join(__dirname, "database", "stocks.db")
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message)
  } else {
    console.log("Connected to SQLite database")
  }
})

// API Routes

// Get all companies
app.get("/api/companies", (req, res) => {
  const query = "SELECT * FROM companies ORDER BY name"

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message })
      return
    }
    res.json({
      message: "success",
      data: rows,
    })
  })
})

// Get company by ID
app.get("/api/companies/:id", (req, res) => {
  const { id } = req.params
  const query = "SELECT * FROM companies WHERE id = ?"

  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message })
      return
    }
    if (!row) {
      res.status(404).json({ error: "Company not found" })
      return
    }
    res.json({
      message: "success",
      data: row,
    })
  })
})

// Get stock data for a company
app.get("/api/stocks/:companyId", (req, res) => {
  const { companyId } = req.params
  const { period = "1M" } = req.query // Default to 1 month

  let dateFilter = ""
  const currentDate = new Date()

  switch (period) {
    case "1W":
      const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFilter = `AND date >= '${oneWeekAgo.toISOString().split("T")[0]}'`
      break
    case "1M":
      const oneMonthAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFilter = `AND date >= '${oneMonthAgo.toISOString().split("T")[0]}'`
      break
    case "3M":
      const threeMonthsAgo = new Date(currentDate.getTime() - 90 * 24 * 60 * 60 * 1000)
      dateFilter = `AND date >= '${threeMonthsAgo.toISOString().split("T")[0]}'`
      break
    case "1Y":
      const oneYearAgo = new Date(currentDate.getTime() - 365 * 24 * 60 * 60 * 1000)
      dateFilter = `AND date >= '${oneYearAgo.toISOString().split("T")[0]}'`
      break
  }

  const query = `
    SELECT * FROM stock_data 
    WHERE company_id = ? ${dateFilter}
    ORDER BY date ASC
  `

  db.all(query, [companyId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message })
      return
    }
    res.json({
      message: "success",
      data: rows,
      period: period,
    })
  })
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Stock Dashboard API is running",
    timestamp: new Date().toISOString(),
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something went wrong!" })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Start server
app.listen(PORT, () => {
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`Server is running on http://localhost:5000`)
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down server...")
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message)
    } else {
      console.log("Database connection closed")
    }
    process.exit(0)
  })
})
