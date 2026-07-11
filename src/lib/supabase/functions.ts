import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './client';

export async function invokeEdgeFunction<T = { ok: true }>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload && typeof payload.error === 'string') throw new Error(payload.error);
    }
    throw error instanceof Error ? error : new Error('Request failed');
  }
  return data as T;
}
