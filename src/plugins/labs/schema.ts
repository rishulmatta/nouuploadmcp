export interface LabResult {
  id: string
  doc: string
  page: number
  anchor: number
  analyte: string
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  date?: string
}

export interface ReferenceRange {
  analyte: string
  low: number
  high: number
  unit: string
  source: string
  population: string
  reason: string
}
