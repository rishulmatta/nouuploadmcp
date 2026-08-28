export interface LabResult {
  id: string
  doc: string
  page: number
  anchor: number // span index in page
  panel?: string // e.g. "Lipid Panel"
  analyte: string // canonical name
  rawAnalyte: string // as printed on the report
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  referenceSource?: 'report' | 'standard'
  date?: string // ISO collection date
}

export interface LabResultProposal {
  doc: string
  page: number
  anchor: number
  panel?: string
  analyte: string
  rawAnalyte: string
  value: number
  unit: string
  referenceLow?: number
  referenceHigh?: number
  referenceSource?: 'report' | 'standard'
  date?: string
}

export interface ReferenceRangeProposal {
  analyte: string
  low: number
  high: number
  unit: string
  source: string
  population: string
  reason: string
}

export interface ApprovedReferenceRange extends ReferenceRangeProposal {
  id: string
  approvedAt: number
}

export interface DietAdjustment {
  item: string // food or behaviour
  action: 'add' | 'reduce' | 'avoid'
  targetAnalyte: string
  rationale: string
}

export interface DietGoal {
  analyte: string
  label: string
  target: number
  current: number
  unit: string
}

export interface DietPlan {
  goal: DietGoal
  adjustments: DietAdjustment[]
  note?: string
}

export function resultKey(r: { doc: string; page: number; anchor: number }) {
  return `${r.doc}:${r.page}:${r.anchor}`
}
