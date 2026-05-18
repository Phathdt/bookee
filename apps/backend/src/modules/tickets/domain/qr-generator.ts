import QRCode from 'qrcode';

export interface QrPayload {
  bookingCode: string;
  bookingSeatId: number;
}

/**
 * Generates a PNG data-URL QR code for a ticket.
 * The encoded payload is a JSON string with bookingCode, bookingSeatId,
 * and issuedAt (ISO timestamp).
 */
export async function generateQrDataUrl(payload: QrPayload): Promise<string> {
  const data = JSON.stringify({
    bookingCode: payload.bookingCode,
    bookingSeatId: payload.bookingSeatId,
    issuedAt: new Date().toISOString(),
  });
  return QRCode.toDataURL(data);
}
