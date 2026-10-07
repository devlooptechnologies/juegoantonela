import { isLocalMode } from "../supabase";
import { localStore } from "./localStore";
import { supabaseStore } from "./supabaseStore";
import type { ServerStore } from "./serverStore";

export function getStore(): ServerStore {
  return isLocalMode ? localStore : supabaseStore;
}