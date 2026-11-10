/**
 * Dados fixos da barbearia. Edite aqui para trocar telefone, endereço, redes etc.
 * Serviços, preços e horários de funcionamento ficam no banco (painel do barbeiro).
 */
export const SHOP = {
  name: 'Khalifa Barber Shop',
  city: 'Modelo, SC',
  street: 'R. XV de Novembro',
  addressFull: 'R. XV de Novembro — Modelo, SC',
  cep: '89872-000',
  /** WhatsApp no formato internacional, só dígitos (55 + DDD + número). */
  whatsapp: '554888294886',
  whatsappLabel: '(48) 8829-4886',
  instagramHandle: 'kalifabarbershop_',
  instagramUrl: 'https://www.instagram.com/kalifabarbershop_/',
  geo: { lat: -26.7757504, lng: -53.0553817 },
  timezone: 'America/Sao_Paulo',
  payments: 'dinheiro, Pix ou cartão',
} as const;

export const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${SHOP.geo.lat},${SHOP.geo.lng}`;
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${SHOP.geo.lat},${SHOP.geo.lng}&z=16&output=embed`;

export function waLink(text: string, phone: string = SHOP.whatsapp): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
