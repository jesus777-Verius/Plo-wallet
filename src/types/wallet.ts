export interface WalletInfo {
  address: string;
  balance: string;
  privateKey?: string;
}

export interface TransactionRequest {
  to: string;
  amount: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  status: 'pending' | 'confirmed' | 'failed';
}