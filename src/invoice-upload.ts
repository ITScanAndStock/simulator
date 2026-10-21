export type InvoiceUploadResult =
  { read: true; invoiceId: string; lineCount: number } | { read: false };

export const maxInvoices = 5;
