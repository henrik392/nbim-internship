/**
 * Quick CSV Parser - Milestone 1
 * Simple, browser-based CSV parsing for NBIM dividend reconciliation
 */

import type { CustodyRecord, NBIMRecord } from "./types";

/**
 * Parse NBIM booking CSV file
 * Format: Semicolon-delimited with header row
 */
export async function parseNBIMFile(file: File): Promise<NBIMRecord[]> {
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or invalid");
  }

  // Parse header
  const headers = lines[0].split(";").map((h) => h.trim());

  // Parse rows
  const records: NBIMRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }

    // Map to NBIMRecord type
    try {
      records.push({
        coac_event_key: row.COAC_EVENT_KEY || "",
        isin: row.ISIN || "",
        nominal_basis: Number.parseFloat(row.NOMINAL_BASIS || "0"),
        gross_amount_portfolio: Number.parseFloat(
          row.GROSS_AMOUNT_PORTFOLIO || "0"
        ),
        net_amount_portfolio: Number.parseFloat(
          row.NET_AMOUNT_PORTFOLIO || "0"
        ),
        wthtax_rate: Number.parseFloat(row.WTHTAX_RATE || "0"),
        instrument_name:
          row.ORGANISATION_NAME || row.INSTRUMENT_DESCRIPTION || "",
        ex_date: row.EXDATE || "",
        account_number: row.BANK_ACCOUNT || "",
        gross_amount_quotation: Number.parseFloat(
          row.GROSS_AMOUNT_QUOTATION || "0"
        ),
        net_amount_quotation: Number.parseFloat(
          row.NET_AMOUNT_QUOTATION || "0"
        ),
        quotation_currency: row.QUOTATION_CURRENCY || "",
      });
    } catch (error) {
      console.error(`Error parsing NBIM row ${i}:`, error);
    }
  }

  return records;
}

/**
 * Parse Custody CSV file
 * Format: Semicolon-delimited with header row
 */
export async function parseCustodyFile(file: File): Promise<CustodyRecord[]> {
  const text = await file.text();
  const lines = text.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("CSV file is empty or invalid");
  }

  // Parse header
  const headers = lines[0].split(";").map((h) => h.trim());

  // Parse rows
  const records: CustodyRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }

    // Map to CustodyRecord type
    try {
      // Extract bank account from BANK_ACCOUNTS field (can have multiple, comma-separated)
      const bankAccounts = row.BANK_ACCOUNTS || row.CUSTODY || "";
      const primaryAccount = bankAccounts.split(",")[0]?.trim() || "";

      records.push({
        coac_event_key: row.COAC_EVENT_KEY || "",
        isin: row.ISIN || "",
        nominal_basis: Number.parseFloat(row.NOMINAL_BASIS || "0"),
        holding_quantity: Number.parseFloat(row.HOLDING_QUANTITY || "0"),
        loan_quantity: Number.parseFloat(row.LOAN_QUANTITY || "0"),
        gross_amount: Number.parseFloat(row.GROSS_AMOUNT || "0"),
        net_amount_qc: Number.parseFloat(row.NET_AMOUNT_QC || "0"),
        net_amount_sc: Number.parseFloat(row.NET_AMOUNT_SC || "0"),
        tax_rate: Number.parseFloat(row.TAX_RATE || "0"),
        custodian: row.CUSTODIAN || "",
        instrument_name: row.ISIN || "", // Will be enriched later
        ex_date: row.EX_DATE || row.EVENT_EX_DATE || "",
        bank_account: primaryAccount,
      });
    } catch (error) {
      console.error(`Error parsing Custody row ${i}:`, error);
    }
  }

  return records;
}
