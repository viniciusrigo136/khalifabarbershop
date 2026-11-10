import { use } from 'react';
import type { Api } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key && !url.includes('SEU-PROJETO'));

/**
 * Supabase é carregado sob demanda (chunk separado) só quando configurado;
 * sem as variáveis de ambiente o site roda no modo demonstração.
 */
export const apiPromise: Promise<Api> = isSupabaseConfigured
  ? import('./supabaseApi').then((m) => m.createSupabaseApi(url!, key!))
  : import('./demoApi').then((m) => m.demoApi);

/** Use dentro de um <Suspense>. */
export const useApi = (): Api => use(apiPromise);
