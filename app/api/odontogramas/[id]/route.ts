import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("Odontogram")
      .select("*")
      .eq("patient_id", id)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data, mode: "supabase" });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error al obtener el odontograma" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json();

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: existingData } = await supabase
      .from("Odontogram")
      .select("id")
      .eq("patient_id", id)
      .single();

    let data, error;

    if (existingData) {
      const result = await supabase
        .from("Odontogram")
        .update({
          odontogramData: body.odontogramData,
          updated_at: new Date().toISOString(),
        })
        .eq("patient_id", id)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("Odontogram")
        .insert({
          patient_id: id,
          odontogramData: body.odontogramData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data, mode: "supabase" });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Error al guardar el odontograma" },
      { status: 500 }
    );
  }
}
