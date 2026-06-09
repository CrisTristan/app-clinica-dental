import { requireStaff } from "@/lib/auth-guard"

export async function POST(request: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const body = await request.json();
  const { number, message } = body;

  try {
    const response = await fetch('https://api-whatsapp-sc2l.onrender.com/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, message }),
    });

    const data = await response.text()

    if (data !== 'Mensaje enviado correctamente') {
      return Response.json({ response: data, status: 400 });
    }

    return Response.json({ response: data, status: response.status });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Internal Server Error', status: 500 });
  }
}
