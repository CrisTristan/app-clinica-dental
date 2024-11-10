export async function POST(request : Request){
    const body = await request.json();
    const {number, message} = body;

    try {
        // Hacer la solicitud a la API externa desde el backend de Next.js
        const response = await fetch('https://api-whatsapp-sc2l.onrender.com/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: number,
            message: message
          })
        });
        //console.log(response);
        const data = await response.text()
        //console.log(data);
        if (data != 'Mensaje enviado correctamente') {
          return Response.json({response: data, status: 400});
        }
  
        // Devolver la respuesta al cliente
        return Response.json({response: data, status: response.status});
      } catch (error) {
        console.error('Error:', error);
       return Response.json({ error: 'Internal Server Error', status: 500 });
      }
}