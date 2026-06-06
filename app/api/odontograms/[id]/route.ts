import { NextRequest, NextResponse } from "next/server";

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

export async function GET() {
  return NextResponse.json(dummyDB);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  dummyDB = {
    patientData: body.patientData,
    odontogramData: body.odontogramData,
  };

  return NextResponse.json({
    ok: true,
    data: dummyDB,
  });
}