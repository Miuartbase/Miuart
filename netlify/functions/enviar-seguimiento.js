const { Resend } = require('resend');

exports.handler = async (event) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*';

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { email, client_name, order_id, tracking_number } = JSON.parse(event.body);

    if (!email || !order_id || !tracking_number) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan datos obligatorios' })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'MiuArt <contacto@miuart.com>',
      to: [email],
      subject: `Tu pedido #${order_id} está en camino 📦`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #c0618a;">¡Tu pedido está en camino! 📦</h2>
          <p>Hola <strong>${client_name}</strong>,</p>
          <p>Te informamos que tu pedido <strong>#${order_id}</strong> ha sido enviado a través de Correos.</p>
          <div style="background:#f8f0f5; border-radius:12px; padding:20px; margin:20px 0; text-align:center;">
            <p style="margin:0 0 10px 0; color:#666;">Número de seguimiento:</p>
            <div style="font-size:1.5rem; font-weight:700; color:#c0618a; letter-spacing:2px;">${tracking_number}</div>
          </div>
          <div style="text-align:center; margin:30px 0;">
            <a href="https://www.correos.es/es/es/herramientas/localizador/envios/detalle?id=${tracking_number}" 
               style="background:#c0618a; color:white; padding:12px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">
              👉 Rastrear mi pedido en Correos
            </a>
          </div>
          <p>Si tienes alguna pregunta, contáctanos en <a href="mailto:contacto@miuart.com" style="color:#c0618a;">contacto@miuart.com</a></p>
          <p>¡Gracias por confiar en MiuArt! 🎨</p>
          <hr style="border:none; border-top:1px solid #f0e0ea; margin:20px 0;">
          <p style="color:#aaa; font-size:0.8rem; text-align:center;">© 2026 MiuArt · <a href="mailto:contacto@miuart.com" style="color:#aaa;">contacto@miuart.com</a></p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Error Resend:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error al enviar el email: ' + error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Error enviant seguiment:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};