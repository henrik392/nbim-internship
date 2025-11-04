// NBIM booking system record
export type NBIMRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number; // Number of shares
  gross_amount_portfolio: number; // In NOK
  net_amount_portfolio: number; // In NOK
  wthtax_rate: number; // Percentage (e.g., 15)
  instrument_name?: string;
  ex_date?: string;
  account_number?: string; // Key for matching with custody
  gross_amount_quotation?: number; // In original currency
  net_amount_quotation?: number; // In original currency
  quotation_currency?: string;
};

// Custodian record
export type CustodyRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number; // Number of shares for dividend calculation
  holding_quantity: number; // Actual shares held (nominal - loans)
  loan_quantity: number; // Shares on loan
  gross_amount: number; // In quotation currency
  net_amount_qc: number; // In quotation currency (for comparison with NBIM)
  net_amount_sc: number; // In settlement currency
  tax_rate: number; // Percentage (e.g., 15)
  custodian?: string;
  instrument_name?: string;
  ex_date?: string;
  bank_account?: string; // Key for matching with NBIM
};

// Break type classification
export type BreakType = "QUANTITY" | "AMOUNT" | "TAX_RATE" | "MISSING_RECORD";

// Severity classification
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Remediation type
export type RemediationType =
  | "auto_resolve"
  | "data_correction"
  | "create_entry"
  | "escalation";

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
  suggested_remediation?: RemediationType;
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
