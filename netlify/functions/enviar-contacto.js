const { Resend } = require('resend');

exports.handler = async (event) => {
  console.log('🔍 DEBUG - ¿ESTA ES LA FUNCIÓN CORRECTA?');
  console.log('🔍 DEBUG - Ruta del archivo: netlify/functions/enviar-contacto.js');
  console.log('🔍 DEBUG - RESEND_API_KEY existe?:', !!process.env.RESEND_API_KEY);
  console.log('🔍 DEBUG - Variables disponibles:', Object.keys(process.env).filter(key => key.includes('RESEND')));
  
  // CORS COMPLETO - Permitir tu dominio Firebase y otros
  const allowedOrigins = [
    'https://botigamiuart.web.app',
    'https://miuart.netlify.app',
    'http://localhost:3000',
    'http://localhost:5000'
  ];
  
  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // CRÍTICO: Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS manejado correctamente para origen:', origin);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'OK', message: 'CORS preflight' })
    };
  }

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('📨 Procesando formulario...');
    const { nombre, email, mensaje } = JSON.parse(event.body);
    
    // Validar
    if (!nombre || !email || !mensaje) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan campos requeridos' })
      };
    }

    console.log('✅ Datos válidos recibidos:', { nombre, email, mensaje: mensaje.substring(0, 50) + '...' });

    // VERIFICAR API KEY DE RESEND
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY no configurada en Netlify');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error de configuración del servidor - falta RESEND_API_KEY' })
      };
    }

    console.log('🔄 Inicializando Resend...');
    // Enviar email
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'MiUArt <onboarding@resend.dev>',
      to: ['miuartbase@gmail.com'],
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

    console.log('🎉 Email enviado correctamente via Resend');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email enviado correctamente',
        data: data 
      })
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