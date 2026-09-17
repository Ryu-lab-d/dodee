// Builds a Thai PromptPay QR payload (EMVCo "Thai QR Payment" format). Pure string/CRC
// math, no network calls - cross-checked field-by-field against the widely-used
// dtinth/promptpay-qr reference implementation (not just the written spec, since field
// *order* turned out to matter for scanner compatibility even though TLV is technically
// order-independent to parse): mobile numbers use the "0066" + local-number-without-
// leading-zero proxy (13 chars total), national IDs / tax IDs are used as-is (13 digits),
// country code is serialized before currency/amount, and the trailing CRC is
// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF, no reflect, no XOR-out).

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, '0')}${value}`;

const crc16 = (input: string) => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

// Accepts a Thai mobile number (e.g. "0812345678") or a 13-digit national/tax ID.
// Returns the PromptPay merchant proxy sub-tag (01 for mobile, 02 for national ID).
const proxyField = (promptpayId: string) => {
  const digits = promptpayId.replace(/[^0-9]/g, '');
  if (digits.length === 13) return tlv('02', digits);
  if (digits.length === 10 && digits.startsWith('0')) return tlv('01', `0066${digits.slice(1)}`);
  return null;
};

export const isValidPromptPayId = (promptpayId: string) => !!proxyField(promptpayId);

// amount omitted -> a reusable QR the payer types their own amount into; amount given ->
// a one-time QR pre-filled with the exact invoice total.
export function buildPromptPayPayload(promptpayId: string, amount?: number): string | null {
  const proxy = proxyField(promptpayId);
  if (!proxy) return null;

  const merchantInfo = tlv('00', 'A000000677010111') + proxy;

  // A truthy check on `amount` would treat a legitimate ฿0 invoice the same as "no amount
  // given" (a static/reusable QR instead of one pinned to that exact total) - checking for
  // undefined instead keeps 0 a valid, explicit amount.
  const hasAmount = amount !== undefined;
  const payload =
    tlv('00', '01') +
    tlv('01', hasAmount ? '12' : '11') +
    tlv('29', merchantInfo) +
    tlv('58', 'TH') +
    tlv('53', '764') +
    (hasAmount ? tlv('54', amount.toFixed(2)) : '') +
    '6304';

  return payload + crc16(payload);
}
