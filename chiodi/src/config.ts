/**
 * Dados da barbearia. Edite aqui: tudo no site lê deste arquivo.
 */

export const SHOP = {
  name: 'The Chiodi Barber',
  barber: 'Hernani',
  /**
   * WhatsApp com DDI + DDD, só números. Ex.: '5549999998888'.
   * Enquanto estiver vazio, os botões abrem o WhatsApp para a pessoa escolher o contato.
   */
  whatsapp: '',
  /** Usuário do Instagram, sem @. Deixe '' para esconder. */
  instagram: 'chiodibarber',
  address: {
    street: 'Rua Duque de Caxias, 75',
    district: 'Passo da Areia',
    city: 'Coronel Freitas',
    state: 'SC',
  },
  geo: { lat: -26.9047394, lng: -52.6982079 },
  timeZone: 'America/Sao_Paulo',
} as const;

export type Service = {
  name: string;
  detail: string;
  minutes: number;
  /** Ex.: 'R$ 40'. Sem preço, o site mostra "valor no WhatsApp". */
  price?: string;
};

export const SERVICES: Service[] = [
  { name: 'Corte masculino', detail: 'Tesoura e máquina, com acabamento na navalha.', minutes: 40 },
  { name: 'Degradê', detail: 'Do zero ao topo, com a transição bem limpa.', minutes: 45 },
  { name: 'Barba', detail: 'Toalha quente, navalha e balm no final.', minutes: 30 },
  { name: 'Corte e barba', detail: 'O combo completo, numa cadeira só.', minutes: 70 },
  { name: 'Sobrancelha', detail: 'Alinhada na navalha, sem exagero.', minutes: 10 },
  { name: 'Corte infantil', detail: 'Na cadeirinha de carrinho, que a criançada adora.', minutes: 30 },
  { name: 'Pigmentação', detail: 'Disfarça falhas no corte e na barba.', minutes: 20 },
  { name: 'Luzes e platinado', detail: 'Descoloração com cuidado e matização.', minutes: 120 },
  { name: 'Lavagem e finalização', detail: 'Lavatório, massagem rápida e produto.', minutes: 15 },
];

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function whatsappLink(message: string) {
  const text = encodeURIComponent(message);
  return SHOP.whatsapp ? `https://wa.me/${SHOP.whatsapp}?text=${text}` : `https://wa.me/?text=${text}`;
}

export const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${SHOP.geo.lat},${SHOP.geo.lng}`;
export const MAPS_EMBED = `https://www.google.com/maps?q=${SHOP.geo.lat},${SHOP.geo.lng}&z=17&output=embed`;
