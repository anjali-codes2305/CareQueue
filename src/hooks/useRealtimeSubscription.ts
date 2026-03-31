import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableName = "tokens" | "priority_requests" | "notifications" | "employees" | "patient_records";

export function useRealtimeSubscription(
  table: TableName,
  callback: () => void,
  filter?: string
) {
  useEffect(() => {
    let channel: RealtimeChannel;

    const channelConfig: any = {
      event: "*",
      schema: "public",
      table,
    };
    if (filter) channelConfig.filter = filter;

    channel = supabase
      .channel(`realtime-${table}-${filter || "all"}`)
      .on("postgres_changes", channelConfig, () => {
        callback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, filter]);
}
