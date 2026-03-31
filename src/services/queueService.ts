import { supabase } from "@/integrations/supabase/client";

const AVG_CONSULTATION_MINUTES = 12;

export async function getQueuePosition(tokenId: string, departmentId: string, queueType: "normal" | "priority") {
  const { data: tokens } = await supabase
    .from("tokens")
    .select("id, arrival_time, priority_score, queue_type")
    .eq("department_id", departmentId)
    .eq("status", "waiting")
    .order("queue_type", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("arrival_time", { ascending: true });

  if (!tokens) return { position: 0, patientsAhead: 0 };

  const idx = tokens.findIndex((t) => t.id === tokenId);
  return { position: idx + 1, patientsAhead: idx };
}

export async function getPredictedWaitTime(departmentId: string, patientsAhead: number) {
  const { data: metrics } = await supabase
    .from("consultation_metrics")
    .select("duration_minutes")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .limit(20);

  let avgTime = AVG_CONSULTATION_MINUTES;
  if (metrics && metrics.length > 0) {
    const total = metrics.reduce((sum, m) => sum + (m.duration_minutes || AVG_CONSULTATION_MINUTES), 0);
    avgTime = total / metrics.length;
  }

  return Math.round(avgTime * patientsAhead);
}

export async function getWaitingTokens(departmentId?: string, doctorId?: string) {
  let query = supabase
    .from("tokens")
    .select("*, departments(name)")
    .eq("status", "waiting")
    .order("queue_type", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("arrival_time", { ascending: true });

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }
  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  const { data } = await query;
  return data || [];
}

export async function callNextPatient(doctorId: string, departmentId: string) {
  const { data: tokens } = await supabase
    .from("tokens")
    .select("*")
    .eq("department_id", departmentId)
    .eq("doctor_id", doctorId)
    .eq("status", "waiting")
    .order("queue_type", { ascending: false })
    .order("priority_score", { ascending: false })
    .order("arrival_time", { ascending: true })
    .limit(1);

  if (!tokens || tokens.length === 0) return null;

  const token = tokens[0];
  const { error } = await supabase
    .from("tokens")
    .update({
      status: "in_consultation",
      doctor_id: doctorId,
      consultation_start: new Date().toISOString(),
    })
    .eq("id", token.id);

  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: token.patient_id,
    type: "doctor_calling" as const,
    title: "Your Turn!",
    message: "The doctor is ready to see you now. Please proceed to the consultation room.",
  });

  return token;
}

export async function skipPatient(tokenId: string, doctorId: string, departmentId: string) {
  // Move current patient back to waiting with lowest priority (end of queue)
  const { data: token } = await supabase
    .from("tokens")
    .select("patient_id, token_number")
    .eq("id", tokenId)
    .single();

  if (!token) throw new Error("Token not found");

  // Reset to waiting, set arrival_time to now (goes to end of FIFO)
  const { error } = await supabase
    .from("tokens")
    .update({
      status: "waiting",
      doctor_id: null,
      consultation_start: null,
      arrival_time: new Date().toISOString(), // moves to end of queue
      priority_score: 0, // reset priority
      queue_type: "normal" as const,
    })
    .eq("id", tokenId);

  if (error) throw error;

  // Notify the patient
  await supabase.from("notifications").insert({
    user_id: token.patient_id,
    type: "queue_update" as const,
    title: "Skipped — Please Report to Reception",
    message: `You were not present when called (Token #${token.token_number}). Your position has been moved to the end of the queue. Please stay nearby.`,
  });

  return token;
}

export async function completeConsultation(tokenId: string, doctorId: string, departmentId: string) {
  const { data: token } = await supabase
    .from("tokens")
    .select("consultation_start")
    .eq("id", tokenId)
    .single();

  const now = new Date();
  const start = token?.consultation_start ? new Date(token.consultation_start) : now;
  const durationMinutes = Math.max(1, (now.getTime() - start.getTime()) / 60000);

  await Promise.all([
    supabase.from("tokens").update({
      status: "completed",
      consultation_end: now.toISOString(),
    }).eq("id", tokenId),
    supabase.from("consultation_metrics").insert({
      doctor_id: doctorId,
      department_id: departmentId,
      token_id: tokenId,
      duration_minutes: Math.round(durationMinutes * 10) / 10,
    }),
  ]);
}

export async function createToken(patientId: string, departmentId: string, severityScore: number = 0) {
  const { data, error } = await supabase
    .from("tokens")
    .insert({
      patient_id: patientId,
      department_id: departmentId,
      severity_score: severityScore,
      queue_type: "normal",
    })
    .select()
    .single();

  if (error) throw error;

  await supabase.from("notifications").insert({
    user_id: patientId,
    type: "token_created" as const,
    title: "Token Created",
    message: `Your token #${data.token_number} has been created. You are in the queue.`,
  });

  return data;
}

export async function requestPriority(tokenId: string, patientId: string, reason: string, symptoms: Record<string, boolean>, severityScore: number) {
  const { data, error } = await supabase
    .from("priority_requests")
    .insert({
      token_id: tokenId,
      patient_id: patientId,
      reason,
      symptoms,
      severity_score: severityScore,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approvePriority(requestId: string, nurseId: string, notes: string) {
  const { data: request } = await supabase
    .from("priority_requests")
    .select("token_id, patient_id, severity_score")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Request not found");

  const priorityScore = (0.7 * (request.severity_score || 0)) + 30;

  await Promise.all([
    supabase.from("priority_requests").update({
      status: "approved",
      nurse_id: nurseId,
      nurse_notes: notes,
      reviewed_at: new Date().toISOString(),
    }).eq("id", requestId),
    supabase.from("tokens").update({
      queue_type: "priority",
      priority_score: priorityScore,
    }).eq("id", request.token_id),
    supabase.from("notifications").insert({
      user_id: request.patient_id,
      type: "priority_decision" as const,
      title: "Priority Approved",
      message: "Your priority request has been approved. You have been moved to the priority queue.",
    }),
  ]);
}

export async function rejectPriority(requestId: string, nurseId: string, notes: string) {
  const { data: request } = await supabase
    .from("priority_requests")
    .select("patient_id")
    .eq("id", requestId)
    .single();

  if (!request) throw new Error("Request not found");

  await Promise.all([
    supabase.from("priority_requests").update({
      status: "rejected",
      nurse_id: nurseId,
      nurse_notes: notes,
      reviewed_at: new Date().toISOString(),
    }).eq("id", requestId),
    supabase.from("notifications").insert({
      user_id: request.patient_id,
      type: "priority_decision" as const,
      title: "Priority Request Declined",
      message: "Your priority request was reviewed and not approved. You remain in the normal queue.",
    }),
  ]);
}
