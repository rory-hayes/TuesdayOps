import "server-only";

import { createClient, type WebSocketLikeConstructor } from "@supabase/supabase-js";
import WebSocket from "ws";
import { getPublicSupabaseEnv, getSupabaseSecretKey } from "@/lib/env";

const webSocketTransport = WebSocket as unknown as WebSocketLikeConstructor;

export function createAdminClient() {
  const { url } = getPublicSupabaseEnv();

  return createClient(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: webSocketTransport,
    },
  });
}
