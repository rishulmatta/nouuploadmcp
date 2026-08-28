import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs/promises'
import path from 'path'

const OUT_DIR = path.resolve('fixtures/labs')

interface Row {
  analyte: string
  value: number
  unit: string
  range?: string // printed range text, omitted deliberately for some analytes
  flag?: 'H' | 'L'
}

interface Panel {
  name: string
  rows: Row[]
}

interface Report {
  collected: string
  reported: string
  panels: Panel[]
}

// Ferritin and LDL deliberately never print a range on the report, so the agent
// must call propose_reference_range to get a cited fallback approved by a human.
// Ferritin trends down (out of range by the second report); LDL trends up.
const reports: Report[] = [
  {
    collected: '2025-09-12',
    reported: '2025-09-14',
    panels: [
      {
        name: 'LIPID PANEL',
        rows: [
          { analyte: 'Total Cholesterol', value: 188, unit: 'mg/dL', range: '0-200' },
          { analyte: 'LDL Cholesterol', value: 110, unit: 'mg/dL' },
          { analyte: 'HDL Cholesterol', value: 46, unit: 'mg/dL', range: '40-100' },
          { analyte: 'Triglycerides', value: 132, unit: 'mg/dL', range: '0-150' },
        ],
      },
      {
        name: 'COMPLETE BLOOD COUNT',
        rows: [
          { analyte: 'Hemoglobin', value: 14.1, unit: 'g/dL', range: '13.0-17.0' },
          { analyte: 'Ferritin', value: 18, unit: 'ng/mL', flag: 'L' },
        ],
      },
      {
        name: 'METABOLIC PANEL',
        rows: [
          { analyte: 'Fasting Glucose', value: 91, unit: 'mg/dL', range: '70-99' },
          { analyte: 'Creatinine', value: 1.0, unit: 'mg/dL', range: '0.7-1.3' },
        ],
      },
    ],
  },
  {
    collected: '2025-12-08',
    reported: '2025-12-10',
    panels: [
      {
        name: 'LIPID PANEL',
        rows: [
          { analyte: 'Total Cholesterol', value: 196, unit: 'mg/dL', range: '0-200' },
          { analyte: 'LDL Cholesterol', value: 118, unit: 'mg/dL' },
          { analyte: 'HDL Cholesterol', value: 44, unit: 'mg/dL', range: '40-100' },
          { analyte: 'Triglycerides', value: 140, unit: 'mg/dL', range: '0-150' },
        ],
      },
      {
        name: 'COMPLETE BLOOD COUNT',
        rows: [
          { analyte: 'Hemoglobin', value: 13.6, unit: 'g/dL', range: '13.0-17.0' },
          { analyte: 'Ferritin', value: 15, unit: 'ng/mL', flag: 'L' },
        ],
      },
      {
        name: 'METABOLIC PANEL',
        rows: [
          { analyte: 'Fasting Glucose', value: 94, unit: 'mg/dL', range: '70-99' },
          { analyte: 'Creatinine', value: 1.0, unit: 'mg/dL', range: '0.7-1.3' },
        ],
      },
    ],
  },
  {
    collected: '2026-03-09',
    reported: '2026-03-11',
    panels: [
      {
        name: 'LIPID PANEL',
        rows: [
          { analyte: 'Total Cholesterol', value: 203, unit: 'mg/dL', range: '0-200', flag: 'H' },
          { analyte: 'LDL Cholesterol', value: 125, unit: 'mg/dL' },
          { analyte: 'HDL Cholesterol', value: 43, unit: 'mg/dL', range: '40-100' },
          { analyte: 'Triglycerides', value: 148, unit: 'mg/dL', range: '0-150' },
        ],
      },
      {
        name: 'COMPLETE BLOOD COUNT',
        rows: [
          { analyte: 'Hemoglobin', value: 13.2, unit: 'g/dL', range: '13.0-17.0' },
          { analyte: 'Ferritin', value: 12, unit: 'ng/mL', flag: 'L' },
        ],
      },
      {
        name: 'METABOLIC PANEL',
        rows: [
          { analyte: 'Fasting Glucose', value: 96, unit: 'mg/dL', range: '70-99' },
          { analyte: 'Creatinine', value: 1.1, unit: 'mg/dL', range: '0.7-1.3' },
        ],
      },
      {
        name: 'THYROID AND VITAMINS',
        rows: [
          { analyte: 'TSH', value: 2.1, unit: 'mIU/L', range: '0.4-4.0' },
          { analyte: 'Vitamin D', value: 27, unit: 'ng/mL', range: '30-100', flag: 'L' },
        ],
      },
    ],
  },
  {
    collected: '2026-06-15',
    reported: '2026-06-17',
    panels: [
      {
        name: 'LIPID PANEL',
        rows: [
          { analyte: 'Total Cholesterol', value: 209, unit: 'mg/dL', range: '0-200', flag: 'H' },
          { analyte: 'LDL Cholesterol', value: 132, unit: 'mg/dL' },
          { analyte: 'HDL Cholesterol', value: 41, unit: 'mg/dL', range: '40-100' },
          { analyte: 'Triglycerides', value: 151, unit: 'mg/dL', range: '0-150', flag: 'H' },
        ],
      },
      {
        name: 'COMPLETE BLOOD COUNT',
        rows: [
          { analyte: 'Hemoglobin', value: 12.9, unit: 'g/dL', range: '13.0-17.0', flag: 'L' },
          { analyte: 'Ferritin', value: 10, unit: 'ng/mL', flag: 'L' },
        ],
      },
      {
        name: 'METABOLIC PANEL',
        rows: [
          { analyte: 'Fasting Glucose', value: 99, unit: 'mg/dL', range: '70-99' },
          { analyte: 'Creatinine', value: 1.1, unit: 'mg/dL', range: '0.7-1.3' },
        ],
      },
    ],
  },
]

async function drawReport(page: any, report: Report) {
  const font = await page.doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await page.doc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()

  let y = height - 50
  page.drawText('Northwood Labs', { x: 50, y, size: 16, font: fontBold, color: rgb(0.1, 0.2, 0.15) })
  y -= 22
  page.drawText('Blood Test Report', { x: 50, y, size: 12, font: fontBold })
  y -= 20
  page.drawText('Patient: Mr A. Sample   DOB: 04/12/1985   MRN: NW-88213', { x: 50, y, size: 10, font })
  y -= 16
  page.drawText(`Collected ${report.collected}`, { x: 50, y, size: 10, font })
  y -= 30

  const colAnalyte = 50
  const colValue = 280
  const colUnit = 330
  const colRange = 400
  const colFlag = 500
  const rowHeight = 16

  for (const panel of report.panels) {
    if (y < 120) break
    page.drawText(panel.name, { x: colAnalyte, y, size: 11, font: fontBold, color: rgb(0.15, 0.15, 0.4) })
    y -= 18

    page.drawText('Analyte', { x: colAnalyte, y, size: 9, font: fontBold })
    page.drawText('Result', { x: colValue, y, size: 9, font: fontBold })
    page.drawText('Units', { x: colUnit, y, size: 9, font: fontBold })
    page.drawText('Reference Range', { x: colRange, y, size: 9, font: fontBold })
    page.drawText('Flag', { x: colFlag, y, size: 9, font: fontBold })
    y -= rowHeight

    for (const row of panel.rows) {
      page.drawText(row.analyte, { x: colAnalyte, y, size: 9, font })
      page.drawText(String(row.value), { x: colValue, y, size: 9, font })
      page.drawText(row.unit, { x: colUnit, y, size: 9, font })
      if (row.range) page.drawText(row.range, { x: colRange, y, size: 9, font })
      if (row.flag) page.drawText(row.flag, { x: colFlag, y, size: 9, font: fontBold, color: rgb(0.6, 0.1, 0.1) })
      y -= rowHeight
    }
    y -= 10
  }

  page.drawText('For clinician review. Not a diagnosis.', { x: 50, y: 40, size: 8, font, color: rgb(0.5, 0.5, 0.5) })
}

async function generateReport(index: number) {
  const report = reports[index]
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  await drawReport(page, report)

  const fileName = `northwood-${report.collected.slice(0, 7)}.pdf`
  const bytes = await doc.save()
  await fs.writeFile(path.join(OUT_DIR, fileName), bytes)
  console.log(`Wrote ${fileName}`)
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (let i = 0; i < reports.length; i++) {
    await generateReport(i)
  }
  console.log(`Generated ${reports.length} fixtures in ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
