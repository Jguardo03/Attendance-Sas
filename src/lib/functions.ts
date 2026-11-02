import { supabase } from '@/lib/supabase';

/** What an Edge Function said when it refused: the HTTP status and its `code`, plus the rest of its answer. */
export class FunctionCallError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: Record<string, unknown>,
  ) {
    super(typeof body.error === 'string' ? body.error : `Function failed (${status})`);
  }
}

/** Calls an Edge Function as the signed-in person. A refusal throws FunctionCallError; no connection throws 'network'. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new FunctionCallError(0, 'not_configured', {});
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;
  const response = (error as { context?: Response }).context;
  if (!response || typeof response.json !== 'function') throw new FunctionCallError(0, 'network', {});
  const reply = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  throw new FunctionCallError(response.status, typeof reply.code === 'string' ? reply.code : 'server_error', reply);
}
