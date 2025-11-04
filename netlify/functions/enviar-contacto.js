const { Resend } = require('resend');

exports.handler = async (event) => {
  console.log('🔧 Función enviar-contacto EJECUTÁNDOSE');
  
  // CORS COMPLETO - Permitir tu dominio Firebase
  const headers = {
    'Access-Control-Allow-Origin': 'https://botigamiuart.web.app',
    'Access-Control-Allow-Headers': 'Content-Type, Origin, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // CRÍTICO: Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ Preflight OPTIONS manejado correctamente');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'OK' })
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
        body: JSON.stringify({ error: 'Faltan campos' })
      };
    }

    console.log('✅ Datos válidos:', { nombre, email });

    // VERIFICAR API KEY
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY no configurada en Netlify');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error de configuración del servidor' })
      };
    }

    // Enviar email
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'MiUArt <onboarding@resend.dev>',
      to: ['miuartbase@gmail.com'],
      subject: `📧 Mensaje de ${nombre} - MiUArt`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong> ${mensaje}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
      `
    });

    if (error) {
      console.error('❌ Error Resend:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    console.log('🎉 Email enviado correctamente');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Email enviado correctamente' 
      })
    };

  } catch (error) {
    console.error('💥 Error en función:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};