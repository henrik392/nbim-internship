// NBIM booking system record
export type NBIMRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number; // Number of shares
  dividend_per_share: number; // Dividend rate per share
  gross_amount_quotation: number; // In original currency
  net_amount_quotation: number; // In original currency
  wthtax_amount: number; // Withholding tax amount in quotation currency
  wthtax_rate: number; // Percentage (e.g., 15)
  localtax_amount?: number; // Local tax amount in quotation currency
  total_tax_rate: number; // Total tax rate (WHT + local)
  gross_amount_portfolio: number; // In NOK
  net_amount_portfolio: number; // In NOK
  quotation_currency: string;
  settlement_currency: string;
  fx_rate: number; // FX rate from quotation to portfolio currency
  instrument_name?: string;
  ex_date?: string;
  payment_date?: string;
  account_number?: string; // Key for matching with custody
  restitution_rate?: number; // Expected tax restitution rate
};

// Custodian record
export type CustodyRecord = {
  coac_event_key: string;
  isin: string;
  nominal_basis: number; // Number of shares for dividend calculation
  holding_quantity: number; // Actual shares held (nominal - loans)
  loan_quantity: number; // Shares on loan
  dividend_rate: number; // Dividend per share
  gross_amount: number; // In quotation currency
  net_amount_qc: number; // In quotation currency (for comparison with NBIM)
  net_amount_sc: number; // In settlement currency
  tax_amount: number; // Total tax in quotation currency
  tax_rate: number; // Percentage (e.g., 15)
  fx_rate?: number; // FX rate (if cross-currency)
  is_cross_currency: boolean; // Cross-currency reversal flag
  custodian?: string;
  instrument_name?: string;
  ex_date?: string;
  payment_date?: string;
  bank_account?: string; // Key for matching with NBIM
  restitution_amount?: number; // Possible tax restitution amount
};

// Break type classification - comprehensive categories
export type BreakType =
  | "QUANTITY" // Quantity/share count mismatch
  | "AMOUNT" // Net amount mismatch (in quotation currency)
  | "TAX_RATE" // Tax rate percentage mismatch
  | "TAX_AMOUNT" // Tax amount mismatch (even if rate matches)
  | "GROSS_AMOUNT" // Gross amount mismatch
  | "DIVIDEND_RATE" // Dividend per share rate mismatch
  | "FIELD_INCONSISTENCY" // Data quality issue (e.g., nominal_basis != holding_quantity)
  | "CALCULATION_ERROR" // Provided amounts don't match recomputed amounts
  | "FX_DIFFERENCE" // Foreign exchange rate mismatch
  | "DATE_MISMATCH" // Payment or ex-date mismatch
  | "RESTITUTION_MISMATCH" // Tax restitution expectation difference
  | "MISSING_RECORD"; // Record exists in one system but not the other

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
