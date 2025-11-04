const { Resend } = require('resend');

exports.handler = async (event) => {
  // Configuración CORS mejorada
  const allowedOrigins = [
    'https://botigamiuart.web.app',
    'https://miuart.netlify.app'
  ];
  
  const origin = event.headers.origin;
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Manejar preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const { nombre, email, mensaje } = JSON.parse(event.body);
    
    // Validar campos requeridos
    if (!nombre || !email || !mensaje) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan campos requeridos' })
      };
    }

    // Inicializar Resend con la API Key
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Enviar email
    const { data, error } = await resend.emails.send({
      from: 'MiUArt <onboarding@resend.dev>',
      to: ['miuartbase@gmail.com'], // ⚠️ VERIFICA QUE ESTE ES TU EMAIL
      subject: `📧 Nuevo mensaje de ${nombre} - MiUArt`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: #e9acc8; color: white; padding: 20px; text-align: center; }
            .content { padding: 25px; }
            .info-item { margin-bottom: 12px; }
            .label { font-weight: bold; color: #555; display: inline-block; width: 80px; }
            .message-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Nuevo Mensaje de Contacto</h1>
              <p>Has recibido un nuevo mensaje desde MiUArt</p>
            </div>
            <div class="content">
              <div class="info-item">
                <span class="label">Nombre:</span> ${nombre}
              </div>
              <div class="info-item">
                <span class="label">Email:</span> ${email}
              </div>
              <div class="info-item">
                <span class="label">Fecha:</span> ${new Date().toLocaleString('es-ES')}
              </div>
              <div class="message-box">
                <strong>Mensaje:</strong><br>
                ${mensaje.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('Error Resend:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al enviar el email: ' + error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email enviado correctamente'
      })
    };

  } catch (error) {
    console.error('Error función:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };
  }
};