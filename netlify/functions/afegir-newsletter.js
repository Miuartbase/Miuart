const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async (event) => {
  console.log('🟦 Nova funció Brevo: iniciant...');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const { email, nombre } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta email' }), headers };
    }

    console.log('📨 Afegint client a Brevo:', email);

    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email,
        listIds: [3], // 👉 el teu ID real de la llista
        attributes: { NOMBRE: nombre || '' }
      })
    });

    const data = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error('❌ Error Brevo:', data);
      return { statusCode: 500, body: JSON.stringify(data), headers };
    }

    console.log('✅ Client afegit correctament a Brevo:', email);
    return { statusCode: 200, body: JSON.stringify({ success: true }), headers };

  } catch (error) {
    console.error('💥 Error al servidor Brevo:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }), headers };
  }
};
