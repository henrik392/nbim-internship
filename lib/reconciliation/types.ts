// NBIM booking system record
export type NBIMRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number;
  gross_amount_portfolio: number;
  net_amount_portfolio: number;
  wthtax_rate: number;
  instrument_name?: string;
  ex_date?: string;
  account_number?: string;
};

// Custodian record
export type CustodyRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number;
  holding_quantity: number;
  loan_quantity: number;
  gross_amount: number;
  net_amount_sc: number;
  tax_rate: number;
  custodian?: string;
  instrument_name?: string;
  ex_date?: string;
};

// Break type classification
export type BreakType =
  | "QUANTITY"
  | "AMOUNT"
  | "TAX_RATE"
  | "MISSING_RECORD";

// Severity classification
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Reconciliation break with LLM analysis
export type ReconciliationBreak = {
  event_key: string;
  instrument: string;
  isin: string;
  break_type: BreakType;
  nbim_value: number | null;
  custody_value: number | null;
  difference: number;
  difference_pct: number;

  // LLM-generated fields (populated after analysis)
  severity?: Severity;
  root_cause?: string;
  explanation?: string;
  recommendation?: string;
  confidence?: number;
};

// LLM Analysis output schema
export type BreakAnalysis = {
  severity: Severity;
  root_cause: string;
  explanation: string;
  recommendation: string;
  confidence: number;
};

// Summary statistics
export type ReconciliationSummary = {
  total_events: number;
  events_with_breaks: number;
  total_breaks: number;
  breaks_by_severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  breaks_by_type: {
    QUANTITY: number;
    AMOUNT: number;
    TAX_RATE: number;
    MISSING_RECORD: number;
  };
  total_cost: number;
  total_tokens: number;
};
