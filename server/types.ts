export interface Account {
  id: string;
  /** Human friendly account name, e.g. "Checking" */
  name: string;
  /** Generic type such as "depository" or "credit" */
  type: string;
  /** Current balance in the account */
  balance: number;
}

export interface Transaction {
  id: string;
  /** Identifier of the account this transaction belongs to */
  account_id: string;
  /** Transaction date in ISO 8601 format (YYYY‑MM‑DD) */
  date: string;
  /** Description of the transaction */
  name: string;
  /** Signed amount: negative for debits, positive for credits */
  amount: number;
}

export interface PersonaData {
  accounts: Account[];
  transactions: Transaction[];
}