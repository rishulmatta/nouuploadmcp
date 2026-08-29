import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

const OUT_DIR = path.resolve('fixtures/finance')
const SCALE = 0.83
const START_DATE = new Date('2025-09-01')
const MONTHS = 12

const banks = [
  { name: 'Aurora Bank', layout: 'classic' },
  { name: 'Coastal Trust', layout: 'modern' },
  { name: 'Meridian Financial', layout: 'compact' },
]

const merchants = [
  { name: 'Starbrew Coffee', category: 'Dining out', amount: 4.20 },
  { name: 'Greenway Grocers', category: 'Groceries', amount: 42.50 },
  { name: 'StreamFlix', category: 'Subscriptions', amount: 12.99 },
  { name: 'Metro Transport', category: 'Transport', amount: 7.80 },
  { name: 'FitLab Gym', category: 'Health', amount: 34.00 },
  { name: 'CloudPower Energy', category: 'Bills', amount: 82.40 },
  { name: 'Urban Eats', category: 'Dining out', amount: 28.30 },
  { name: 'QuickShop', category: 'Groceries', amount: 18.90 },
  { name: 'AudioWave', category: 'Subscriptions', amount: 9.99 },
  { name: 'Petrol Express', category: 'Transport', amount: 56.00 },
]

const recurring = [
  { name: 'StreamFlix', amount: 12.99 },
  { name: 'FitLab Gym', amount: 34.00 },
  { name: 'CloudPower Energy', amount: 82.40 },
  { name: 'AudioWave', amount: 9.99 },
  // Forgotten subscriptions
  { name: 'NewsPlus Digital', amount: 7.99 },
  { name: 'CloudSync Pro', amount: 4.49 },
  { name: 'Premium Toolkit', amount: 11.29 },
]

const income = [
  { name: 'Salary', amount: 3200 },
  { name: 'Freelance', amount: 420 },
]

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function scale(n: number) {
  return Math.round(n * SCALE * 100) / 100
}

interface Transaction {
  date: Date
  description: string
  amount: number // positive for credit, negative for debit
  balance: number
}

function generateMonthTransactions(monthIndex: number, startBalance: number): Transaction[] {
  const txs: Transaction[] = []
  const baseYear = START_DATE.getFullYear()
  const baseMonth = START_DATE.getMonth()
  const month = new Date(baseYear + Math.floor((baseMonth + monthIndex) / 12), (baseMonth + monthIndex) % 12, 1)
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()

  // Balance brought forward line (not a transaction)
  // We put it in the text but won't add to txs

  // Income
  const salaryDay = randInt(25, 28)
  txs.push({
    date: new Date(month.getFullYear(), month.getMonth(), salaryDay),
    description: 'Salary',
    amount: scale(income[0].amount),
    balance: 0,
  })
  if (monthIndex % 2 === 1) {
    txs.push({
      date: new Date(month.getFullYear(), month.getMonth(), randInt(10, 15)),
      description: 'Freelance',
      amount: scale(income[1].amount),
      balance: 0,
    })
  }

  // Recurring charges
  for (const r of recurring) {
    txs.push({
      date: new Date(month.getFullYear(), month.getMonth(), randInt(1, 5)),
      description: r.name,
      amount: -scale(r.amount),
      balance: 0,
    })
  }

  // Variable spending
  const txCount = randInt(18, 28)
  for (let i = 0; i < txCount; i++) {
    const day = randInt(1, daysInMonth)
    const m = pick(merchants)
    let desc = m.name
    // Variant spellings for Starbrew
    if (m.name === 'Starbrew Coffee') {
      const variants = ['Starbrew Coffee', 'STARBREW COFFEE', 'Starbrew Coffee Ltd', 'STARBREW COFFEE LONDON']
      desc = pick(variants)
    }
    // Decimal error plant: month 6 (Feb 2026), one Starbrew transaction at $54.00
    if (monthIndex === 5 && m.name === 'Starbrew Coffee' && i === 3) {
      txs.push({
        date: new Date(month.getFullYear(), month.getMonth(), day),
        description: desc,
        amount: -54.0,
        balance: 0,
      })
      continue
    }
    txs.push({
      date: new Date(month.getFullYear(), month.getMonth(), day),
      description: desc,
      amount: -scale(m.amount * (0.7 + Math.random() * 0.6)),
      balance: 0,
    })
  }

  // Sort by date
  txs.sort((a, b) => a.date.getTime() - b.date.getTime())

  // Compute balances
  let balance = startBalance
  for (const tx of txs) {
    balance += tx.amount
    tx.balance = Math.round(balance * 100) / 100
  }

  return txs
}

async function drawPage(
  page: any,
  bank: { name: string; layout: string },
  monthIndex: number,
  startBalance: number,
  txs: Transaction[],
  pageNumber: number,
  totalPages: number,
  splitPageBreak: boolean,
) {
  const { width, height } = page.getSize()
  const font = await page.doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await page.doc.embedFont(StandardFonts.HelveticaBold)

  const baseYear = START_DATE.getFullYear()
  const baseMonth = START_DATE.getMonth()
  const periodStart = new Date(baseYear + Math.floor((baseMonth + monthIndex) / 12), (baseMonth + monthIndex) % 12, 1)
  const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)

  const yStart = height - 50
  let y = yStart

  // Header
  page.drawText(bank.name, { x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.3) })
  y -= 22
  page.drawText('Statement of Account', { x: 50, y, size: 12, font: fontBold })
  page.drawText(`Page ${pageNumber} of ${totalPages}`, { x: width - 120, y, size: 10, font })
  y -= 18
  page.drawText(`Mr A. Sample`, { x: 50, y, size: 10, font })
  y -= 14
  page.drawText(`12 Privacy Lane, Anonymous Town, AN1 2XY`, { x: 50, y, size: 10, font })
  y -= 14
  page.drawText(`Account: ****1234 · Sort code: 12-34-56`, { x: 50, y, size: 10, font })
  y -= 22
  page.drawText(`Statement period: ${fmtDate(periodStart)} to ${fmtDate(periodEnd)}`, { x: 50, y, size: 10, font })
  page.drawText(`Opening balance: ${fmtMoney(startBalance)}`, { x: 350, y, size: 10, font })
  y -= 30

  // Column headers
  const rowHeight = 16
  const colDate = 50
  const colDesc = 120
  const colAmount = 360
  const colBalance = 460

  page.drawText('Date', { x: colDate, y, size: 10, font: fontBold })
  if (bank.layout === 'compact') {
    // Different column order: Description, Date, Amount, Balance
    page.drawText('Description', { x: colDesc, y, size: 10, font: fontBold })
    page.drawText('Date', { x: colDate, y, size: 10, font: fontBold })
  } else {
    page.drawText('Description', { x: colDesc, y, size: 10, font: fontBold })
  }
  page.drawText('Amount', { x: colAmount, y, size: 10, font: fontBold })
  page.drawText('Balance', { x: colBalance, y, size: 10, font: fontBold })
  y -= rowHeight

  // Balance brought forward on first page
  if (pageNumber === 1) {
    page.drawText('Balance brought forward', { x: colDesc, y, size: 10, font })
    page.drawText(fmtMoney(startBalance), { x: colBalance, y, size: 10, font })
    y -= rowHeight
  }

  // Transactions
  for (const tx of txs) {
    page.drawText(fmtDate(tx.date), { x: colDate, y, size: 9, font })
    page.drawText(tx.description, { x: colDesc, y, size: 9, font })
    page.drawText(fmtMoney(Math.abs(tx.amount)), { x: colAmount, y, size: 9, font })
    page.drawText(fmtMoney(tx.balance), { x: colBalance, y, size: 9, font })
    y -= rowHeight
    if (y < 80) break
  }

  // Footer closing balance on last page
  if (pageNumber === totalPages && txs.length > 0) {
    const closing = txs[txs.length - 1].balance
    page.drawText(`Closing balance: ${fmtMoney(closing)}`, { x: 50, y: 50, size: 11, font: fontBold })
  }
}

async function generateStatement(monthIndex: number) {
  const bank = banks[monthIndex % banks.length]
  const doc = await PDFDocument.create()

  const startBalance = 1200 + monthIndex * 180 + Math.random() * 200
  const allTxs = generateMonthTransactions(monthIndex, startBalance)

  // Split across page break for month 3 (Dec 2025)
  const splitPageBreak = monthIndex === 3
  const txsPage1 = splitPageBreak ? allTxs.slice(0, Math.floor(allTxs.length / 2)) : allTxs.slice(0, 35)
  const txsPage2 = splitPageBreak ? allTxs.slice(Math.floor(allTxs.length / 2)) : allTxs.slice(35)
  const totalPages = txsPage2.length > 0 ? 2 : 1

  const page1 = doc.addPage([595, 842])
  await drawPage(page1, bank, monthIndex, startBalance, txsPage1, 1, totalPages, splitPageBreak)

  if (txsPage2.length > 0) {
    const page2 = doc.addPage([595, 842])
    await drawPage(page2, bank, monthIndex, startBalance, txsPage2, 2, totalPages, splitPageBreak)
  }

  const year = START_DATE.getFullYear()
  const month = START_DATE.getMonth() + monthIndex
  const fileName = `statement-${String(year + Math.floor(month / 12)).padStart(4, '0')}-${String((month % 12) + 1).padStart(2, '0')}.pdf`
  const bytes = await doc.save()
  await fs.writeFile(path.join(OUT_DIR, fileName), bytes)
  console.log(`Wrote ${fileName} (${allTxs.length} txs, closing ${fmtMoney(allTxs[allTxs.length - 1].balance)})`)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (let i = 0; i < MONTHS; i++) {
    await generateStatement(i)
  }
  console.log(`Generated ${MONTHS} fixtures in ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
