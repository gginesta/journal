import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { name, kind } = (await request.json()) as { name?: string; kind?: "personal" | "household" };
  if (!name || !kind) {
    return NextResponse.json({ error: "name and kind are required" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_kind: kind
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data });
}
