/**
 * CSV Parser - Enhanced for comprehensive field extraction
 * Extracts all fields needed for recomputation and validation
 */

import type { CustodyRecord, NBIMRecord } from "./types";

/**
 * Parse NBIM booking CSV file with comprehensive field extraction
 */
export async function parseNBIMFile(file: File): Promise<NBIMRecord[]> {
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or invalid");
  }

  const headers = lines[0].split(";").map((h) => h.trim());
  const records: NBIMRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }

    try {
      records.push({
        coac_event_key: row.COAC_EVENT_KEY || "",
        isin: row.ISIN || "",
        nominal_basis: Number.parseFloat(row.NOMINAL_BASIS || "0"),
        dividend_per_share: Number.parseFloat(row.DIVIDENDS_PER_SHARE || "0"),
        gross_amount_quotation: Number.parseFloat(
          row.GROSS_AMOUNT_QUOTATION || "0"
        ),
        net_amount_quotation: Number.parseFloat(
          row.NET_AMOUNT_QUOTATION || "0"
        ),
        wthtax_amount: Number.parseFloat(row.WTHTAX_COST_QUOTATION || "0"),
        wthtax_rate: Number.parseFloat(row.WTHTAX_RATE || "0"),
        localtax_amount: Number.parseFloat(row.LOCALTAX_COST_QUOTATION || "0"),
        total_tax_rate: Number.parseFloat(row.TOTAL_TAX_RATE || "0"),
        gross_amount_portfolio: Number.parseFloat(
          row.GROSS_AMOUNT_PORTFOLIO || "0"
        ),
        net_amount_portfolio: Number.parseFloat(
          row.NET_AMOUNT_PORTFOLIO || "0"
        ),
        quotation_currency: row.QUOTATION_CURRENCY || "",
        settlement_currency: row.SETTLEMENT_CURRENCY || "",
        fx_rate: Number.parseFloat(
          row.AVG_FX_RATE_QUOTATION_TO_PORTFOLIO || "1"
        ),
        instrument_name:
          row.ORGANISATION_NAME || row.INSTRUMENT_DESCRIPTION || "",
        ex_date: row.EXDATE || "",
        payment_date: row.PAYMENT_DATE || "",
        account_number: row.BANK_ACCOUNT || "",
        restitution_rate: Number.parseFloat(row.RESTITUTION_RATE || "0"),
      });
    } catch (error) {
      console.error(`Error parsing NBIM row ${i}:`, error);
    }
  }

  return records;
}

/**
 * Parse Custody CSV file with comprehensive field extraction
 */
export async function parseCustodyFile(file: File): Promise<CustodyRecord[]> {
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or invalid");
  }

  const headers = lines[0].split(";").map((h) => h.trim());
  const records: CustodyRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }

    try {
      const bankAccounts = row.BANK_ACCOUNTS || row.CUSTODY || "";
      const primaryAccount = bankAccounts.split(",")[0]?.trim() || "";

      // Parse FX rate - handle different formats
      let fxRate: number | undefined;
      if (row.FX_RATE && row.FX_RATE !== "1") {
        fxRate = Number.parseFloat(row.FX_RATE);
      }

      records.push({
        coac_event_key: row.COAC_EVENT_KEY || "",
        isin: row.ISIN || "",
        nominal_basis: Number.parseFloat(row.NOMINAL_BASIS || "0"),
        holding_quantity: Number.parseFloat(row.HOLDING_QUANTITY || "0"),
        loan_quantity: Number.parseFloat(row.LOAN_QUANTITY || "0"),
        dividend_rate: Number.parseFloat(row.DIV_RATE || "0"),
        gross_amount: Number.parseFloat(row.GROSS_AMOUNT || "0"),
        net_amount_qc: Number.parseFloat(row.NET_AMOUNT_QC || "0"),
        net_amount_sc: Number.parseFloat(row.NET_AMOUNT_SC || "0"),
        tax_amount: Number.parseFloat(row.TAX || "0"),
        tax_rate: Number.parseFloat(row.TAX_RATE || "0"),
        fx_rate: fxRate,
        is_cross_currency:
          row.IS_CROSS_CURRENCY_REVERSAL?.toUpperCase() === "TRUE",
        custodian: row.CUSTODIAN || "",
        instrument_name: row.ISIN || "",
        ex_date: row.EX_DATE || row.EVENT_EX_DATE || "",
        payment_date: row.PAY_DATE || row.EVENT_PAYMENT_DATE || "",
        bank_account: primaryAccount,
        restitution_amount: Number.parseFloat(
          row.POSSIBLE_RESTITUTION_AMOUNT || "0"
        ),
      });
    } catch (error) {
      console.error(`Error parsing Custody row ${i}:`, error);
    }
  }

  return records;
}
