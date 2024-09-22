export async function GET() {
    return new Response('{"event_id": 1, "title": "Hola", "start": "20-06-4" }');
}

export async function POST(req: Request) {
    const appointment = await req.json();
    return new Response(JSON.stringify(appointment), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });
}