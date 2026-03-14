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
    const {
      client_email,
      client_name,
      client_phone,
      client_address,
      order_id,
      date,
      subtotal,
      envio,
      iva,
      total,
      productos_html,
      cupon_html
    } = JSON.parse(event.body);

    if (!client_email || !order_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan datos obligatorios' })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'MiuArt <contacto@miuart.com>',
      to: [client_email],
      subject: `¡Gracias por tu compra! Pedido #${order_id}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Confirmación de Pedido - MiUart</title>
          <style>
            body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
            .container { max-width:600px; margin:20px auto; background:white; border-radius:8px; overflow:hidden; box-shadow:0 0 10px rgba(0,0,0,0.1); }
            .header { background:#e9acc8; color:white; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:24px; }
            .content { padding:25px; }
            .section { margin-bottom:20px; }
            .section h2 { color:#e9acc8; border-bottom:1px solid #eee; padding-bottom:8px; font-size:18px; }
            table { width:100%; border-collapse:collapse; margin:15px 0; font-size:14px; }
            th { background:#f8f9fa; text-align:left; padding:10px; font-weight:bold; }
            td { padding:10px; border-bottom:1px solid #eee; }
            .total { font-weight:bold; background:#f1cede; }
            .cupon { background:#d4edda; border:1px solid #c3e6cb; border-radius:8px; padding:15px; text-align:center; margin:20px 0; }
            .cupon-code { font-size:24px; font-weight:bold; color:#28a745; background:white; padding:8px 16px; border-radius:6px; display:inline-block; margin:8px 0; }
            .footer { background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Gracias por tu compra!</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${client_name}</strong>,</p>
              <p>Tu pedido ha sido confirmado. Aquí tienes los detalles:</p>
              <div class="section">
                <h2>Información del Pedido</h2>
                <p><strong>Nº Pedido:</strong> ${order_id}</p>
                <p><strong>Fecha:</strong> ${date}</p>
              </div>
              <div class="section">
                <h2>Datos del Cliente</h2>
                <p><strong>Email:</strong> ${client_email}</p>
                <p><strong>Teléfono:</strong> ${client_phone}</p>
              </div>
              <div class="section">
                <h2>Dirección de Envío</h2>
                <p style="white-space:pre-line;">${client_address}</p>
              </div>
              <div class="section">
                <h2>Productos</h2>
                ${productos_html}
              </div>
              <div class="section">
                <h2>Resumen</h2>
                <table>
                  <tr><td>Subtotal:</td><td>${subtotal}</td></tr>
                  <tr><td>Envío:</td><td>${envio}</td></tr>
                  <tr><td>IVA:</td><td>${iva}</td></tr>
                  <tr class="total"><td><strong>Total:</strong></td><td><strong>${total}</strong></td></tr>
                </table>
              </div>
              ${cupon_html || ''}
              <div class="footer">
                <p>© 2026 MiUart | <a href="mailto:contacto@miuart.com">Contáctanos</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
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
    console.error('Error enviant confirmació:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};