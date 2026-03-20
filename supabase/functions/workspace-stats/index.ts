// Workspace Stats Edge Function
// Invoked by the client via supabase.functions.invoke('workspace-stats').
// The user's JWT is forwarded automatically — RLS applies to all queries.
// Returns aggregated stats that would be chatty to compute client-side.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create a Supabase client with the user's JWT — RLS applies
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check workspace membership and get role
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Not a member of this workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isAdmin = membership.role === "owner" || membership.role === "admin";

    // Run all stat queries in parallel
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    const todayStr = today.toISOString().split("T")[0];
    const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

    const [
      allProjectsResult,
      myProjectsResult,
      allTasksDueResult,
      myTasksDueResult,
      myOpenTasksResult,
      membersResult,
    ] = await Promise.all([
      // All workspace projects (admins only use this)
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
      // Projects the user is a member of
      supabase
        .from("project_members")
        .select("project_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      // All tasks due this week across workspace (admins)
      supabase
        .from("tasks")
        .select("id, project_id", { count: "exact" })
        .gte("due_date", todayStr)
        .lte("due_date", endOfWeekStr)
        .neq("status", "done"),
      // My tasks due this week
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .gte("due_date", todayStr)
        .lte("due_date", endOfWeekStr)
        .neq("status", "done"),
      // My open tasks (not done)
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .neq("status", "done"),
      // Total workspace members (admins only use this)
      supabase
        .from("workspace_members")
        .select("user_id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "active"),
    ]);

    const stats = {
      activeProjects: isAdmin
        ? (allProjectsResult.count ?? 0)
        : (myProjectsResult.count ?? 0),
      myOpenTasks: myOpenTasksResult.count ?? 0,
      tasksDueThisWeek: isAdmin
        ? (allTasksDueResult.count ?? 0)
        : (myTasksDueResult.count ?? 0),
      totalMembers: isAdmin ? (membersResult.count ?? 0) : null,
      isAdmin,
    };

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
