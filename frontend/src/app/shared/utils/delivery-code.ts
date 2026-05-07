export function formatDeliveryCode(id: string): string {
  return `DLV-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
