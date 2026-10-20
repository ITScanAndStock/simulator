export type InvoiceUploadResult =
  { read: true; lineCount: number } | { read: false };

export const maxInvoices = 5;
