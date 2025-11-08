const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { Resend } = require('resend');

exports.handler = async (event) => {
  console.log('🔍 DEBUG - Función enviar-contacto.js ejecutándose');

  // Obtenir allowedOrigins des de variable d'entorn (separats per comes)
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

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'OK', message: 'CORS preflight' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { nombre, email, mensaje, volNewsletter } = body;

    if (!nombre || !email || !mensaje) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan campos requeridos' })
      };
    }

    // Añadir a Brevo si el usuario acepta newsletter
    if (volNewsletter && email) {
      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            email,
            listIds: [Number(process.env.BREVO_LIST_ID)],
            attributes: { NOMBRE: nombre }
          })
        });

        const brevoData = await brevoResponse.json();
        if (!brevoResponse.ok) {
          console.error('❌ Error añadiendo cliente a Brevo:', brevoData);
        } else {
          console.log('✅ Cliente añadido correctamente a Brevo');
        }
      } catch (error) {
        console.error('💥 Error de conexión con Brevo:', error);
      }
    }

    // Verificar API key de Resend
    if (!process.env.RESEND_API_KEY || !process.env.BREVO_SENDER) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error de configuración del servidor - faltan variables de entorno' })
      };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.BREVO_SENDER,
      to: ['miuartclientes@gmail.com'],
      subject: `📧 Nuevo mensaje de ${nombre} - MiUArt`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong> ${mensaje}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
        <p><strong>Origen:</strong> ${origin || 'Desconocido'}</p>
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
      body: JSON.stringify({ success: true, message: 'Email enviado correctamente', data })
    };

  } catch (error) {
    console.error('💥 Error en función:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };
  }
};


    