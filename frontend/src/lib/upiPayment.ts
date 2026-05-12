export interface UpiPaymentPayload {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
  transactionRef?: string;
}

export const buildUpiPaymentUri = ({
  payeeUpiId,
  payeeName,
  amount,
  transactionNote,
  transactionRef,
}: UpiPaymentPayload): string => {
  const params = new URLSearchParams({
    pa: payeeUpiId.trim(),
    pn: payeeName.trim(),
    am: amount.toFixed(2),
    cu: 'INR',
    tn: transactionNote.trim(),
  });

  if (transactionRef) {
    params.set('tr', transactionRef.trim());
  }

  return `upi://pay?${params.toString()}`;
};