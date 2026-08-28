export interface AnalyteRule {
  id: string
  pattern: string // lowercase substring match against the raw printed name
  canonical: string
  unit: string
}

export const defaultAnalyteRules: AnalyteRule[] = [
  { id: 'a1', pattern: 'glycated haemoglobin', canonical: 'HbA1c', unit: '%' },
  { id: 'a2', pattern: 'hba1c', canonical: 'HbA1c', unit: '%' },
  { id: 'a3', pattern: 'total cholesterol', canonical: 'Total Cholesterol', unit: 'mg/dL' },
  { id: 'a4', pattern: 'ldl', canonical: 'LDL Cholesterol', unit: 'mg/dL' },
  { id: 'a5', pattern: 'hdl', canonical: 'HDL Cholesterol', unit: 'mg/dL' },
  { id: 'a6', pattern: 'triglyceride', canonical: 'Triglycerides', unit: 'mg/dL' },
  { id: 'a7', pattern: 'ferritin', canonical: 'Ferritin', unit: 'ng/mL' },
  { id: 'a8', pattern: 'haemoglobin', canonical: 'Hemoglobin', unit: 'g/dL' },
  { id: 'a9', pattern: 'hemoglobin', canonical: 'Hemoglobin', unit: 'g/dL' },
  { id: 'a10', pattern: 'vitamin d', canonical: 'Vitamin D', unit: 'ng/mL' },
  { id: 'a11', pattern: 'vitamin b12', canonical: 'Vitamin B12', unit: 'pg/mL' },
  { id: 'a12', pattern: 'tsh', canonical: 'TSH', unit: 'mIU/L' },
  { id: 'a13', pattern: 'fasting glucose', canonical: 'Fasting Glucose', unit: 'mg/dL' },
  { id: 'a14', pattern: 'glucose', canonical: 'Fasting Glucose', unit: 'mg/dL' },
  { id: 'a15', pattern: 'creatinine', canonical: 'Creatinine', unit: 'mg/dL' },
  { id: 'a16', pattern: 'iron', canonical: 'Iron', unit: 'µg/dL' },
]

export function canonicalizeAnalyte(raw: string, rules: AnalyteRule[] = defaultAnalyteRules): { canonical: string; unit?: string } {
  const lower = raw.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.pattern)) return { canonical: rule.canonical, unit: rule.unit }
  }
  return { canonical: raw.trim() }
}

export interface StandardRange {
  analyte: string
  low: number
  high: number
  unit: string
  source: string
  population: string
}

// Fallback bands used only when a report doesn't print its own reference range,
// and only after a human approves the propose_reference_range proposal that cites one.
export const standardRanges: StandardRange[] = [
  { analyte: 'HbA1c', low: 4.0, high: 5.6, unit: '%', source: 'ADA 2024 Standards of Care', population: 'adult, non-diabetic' },
  { analyte: 'Total Cholesterol', low: 0, high: 200, unit: 'mg/dL', source: 'NCEP ATP III', population: 'adult' },
  { analyte: 'LDL Cholesterol', low: 0, high: 100, unit: 'mg/dL', source: 'NCEP ATP III', population: 'adult, optimal' },
  { analyte: 'HDL Cholesterol', low: 40, high: 100, unit: 'mg/dL', source: 'NCEP ATP III', population: 'adult male' },
  { analyte: 'Triglycerides', low: 0, high: 150, unit: 'mg/dL', source: 'NCEP ATP III', population: 'adult' },
  { analyte: 'Ferritin', low: 30, high: 400, unit: 'ng/mL', source: 'Mayo Clinic Laboratories', population: 'adult male' },
  { analyte: 'Hemoglobin', low: 13.0, high: 17.0, unit: 'g/dL', source: 'Mayo Clinic Laboratories', population: 'adult male' },
  { analyte: 'Vitamin D', low: 30, high: 100, unit: 'ng/mL', source: 'Endocrine Society guideline', population: 'adult' },
  { analyte: 'Vitamin B12', low: 200, high: 900, unit: 'pg/mL', source: 'Mayo Clinic Laboratories', population: 'adult' },
  { analyte: 'TSH', low: 0.4, high: 4.0, unit: 'mIU/L', source: 'AACE guideline', population: 'adult' },
  { analyte: 'Fasting Glucose', low: 70, high: 99, unit: 'mg/dL', source: 'ADA 2024 Standards of Care', population: 'adult, non-diabetic' },
  { analyte: 'Creatinine', low: 0.7, high: 1.3, unit: 'mg/dL', source: 'Mayo Clinic Laboratories', population: 'adult male' },
  { analyte: 'Iron', low: 65, high: 175, unit: 'µg/dL', source: 'Mayo Clinic Laboratories', population: 'adult male' },
]

export function standardRangeFor(analyte: string): StandardRange | undefined {
  return standardRanges.find((r) => r.analyte === analyte)
}
