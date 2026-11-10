/** Datas sempre como 'YYYY-MM-DD' (dia local da barbearia); horários em minutos desde 00:00. */
export type DayKey = string;

export interface Service {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin: number;
  active: boolean;
  sort: number;
}

export interface HoursWindow {
  weekday: number; // 0 = domingo
  startMin: number;
  endMin: number;
}

export interface Settings {
  slotStepMin: number;
  minAdvanceMin: number;
  horizonDays: number;
}

export interface Interval {
  day: DayKey;
  startMin: number;
  endMin: number;
}

export interface PublicData {
  services: Service[];
  hours: HoursWindow[];
  daysOff: DayKey[];
  settings: Settings;
}

export type AppointmentStatus = 'booked' | 'done' | 'cancelled';
export type Origin = 'site' | 'painel';
export type PayMethod = 'pix' | 'dinheiro' | 'cartao';

export interface Appointment {
  id: string;
  day: DayKey;
  startMin: number;
  durationMin: number;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  clientName: string;
  clientPhone: string;
  origin: Origin;
  status: AppointmentStatus;
}

export interface Payment {
  id: string;
  appointmentId: string | null;
  clientName: string;
  serviceName: string;
  amountCents: number;
  method: PayMethod;
  paidOn: DayKey;
  createdAt: string;
}

export interface Block {
  id: string;
  day: DayKey;
  startMin: number;
  endMin: number;
}

export interface BookingInput {
  serviceId: string;
  day: DayKey;
  startMin: number;
  name: string;
  phone: string;
}

export interface BookingResult {
  id: string;
  day: DayKey;
  startMin: number;
  durationMin: number;
  serviceName: string;
  priceCents: number;
}

export type BookingErrorCode =
  | 'INVALID_NAME'
  | 'INVALID_PHONE'
  | 'INVALID_SERVICE'
  | 'OUT_OF_RANGE'
  | 'TOO_SOON'
  | 'CLOSED'
  | 'SLOT_TAKEN'
  | 'TOO_MANY'
  | 'NETWORK';

export class ApiError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Api {
  readonly mode: 'demo' | 'supabase';

  // Público
  getPublicData(): Promise<PublicData>;
  getBusy(from: DayKey, to: DayKey): Promise<Interval[]>;
  book(input: BookingInput): Promise<BookingResult>;

  // Autenticação
  getUser(): Promise<AuthUser | null>;
  isStaff(): Promise<boolean>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  onAuthChange(cb: (event: string) => void): () => void;

  // Painel
  listServices(): Promise<Service[]>;
  saveService(s: Omit<Service, 'id'> & { id?: string }): Promise<Service>;
  listAppointments(from: DayKey, to: DayKey): Promise<Appointment[]>;
  searchAppointments(query: string, fromDay: DayKey): Promise<Appointment[]>;
  createAppointment(a: Omit<Appointment, 'id' | 'status' | 'origin'>): Promise<Appointment>;
  cancelAppointment(id: string): Promise<void>;
  finishAppointment(id: string, method: PayMethod, amountCents: number): Promise<void>;
  addWalkIn(p: { clientName: string; serviceName: string; amountCents: number; method: PayMethod }): Promise<void>;
  listPayments(from: DayKey, to: DayKey): Promise<Payment[]>;
  listBlocks(fromDay: DayKey): Promise<Block[]>;
  addBlock(b: Omit<Block, 'id'>): Promise<void>;
  deleteBlock(id: string): Promise<void>;
  addDayOff(day: DayKey): Promise<void>;
  deleteDayOff(day: DayKey): Promise<void>;
  subscribeAppointments(cb: () => void): () => void;
}
