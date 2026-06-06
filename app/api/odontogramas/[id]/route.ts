import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Dummy DB para testing
let dummyDB = {
  patientData: null,
  odontogramData: JSON.stringify([
    {
      tooth: 18,
      damage: 1,
      diagnostic: "",
      surface: "18_M",
      note: "FUK",
    },
  ]),
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const useDummy = searchParams.get("dummy") === "true";

  // Modo testing: retornar dummyDB
  if (useDummy) {
    return NextResponse.json({
      ok: true,
      data: dummyDB,
      mode: "dummy",
    });
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Obtener datos del odontograma desde Supabase
    const { data, error } = await supabase
      .from("Odontogram")
      .select("*")
      .eq("patient_id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
      mode: "supabase",
    });
  } catch (error) {
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
  const { searchParams } = new URL(request.url);
  const useDummy = searchParams.get("dummy") === "true";

  const body = await request.json();

  // Modo testing: guardar en dummyDB
  if (useDummy) {
    dummyDB = {
      patientData: body.patientData,
      odontogramData: body.odontogramData,
    };

    return NextResponse.json({
      ok: true,
      data: dummyDB,
      mode: "dummy",
    });
  }

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar si ya existe un odontograma para este paciente
    const { data: existingData, error: checkError } = await supabase
      .from("Odontogram")
      .select("id")
      .eq("patient_id", id)
      .single();

    let data, error;

    if (existingData) {
      // Si existe, actualizar
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
      // Si no existe, crear uno nuevo
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
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
      mode: "supabase",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Error al guardar el odontograma" },
      { status: 500 }
    );
  }
}