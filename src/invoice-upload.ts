export type InvoiceUploadResult =
  | { read: true; invoiceId: string; lineCount: number; toVerify: boolean }
  | { read: false };

export const maxInvoices = 5;
