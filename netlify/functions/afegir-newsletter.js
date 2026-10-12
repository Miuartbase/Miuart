const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.handler = async (event) => {
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

    const db = admin.firestore();
    await db.collection("newsletter").doc(email).set({
      email,
      nombre: nombre || '',
      fecha: new Date().toISOString(),
      activo: true
    });

    console.log('✅ Subscriptor afegit a Firestore:', email);
    return { statusCode: 200, body: JSON.stringify({ success: true }), headers };

  } catch (error) {
    console.error('💥 Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }), headers };
  }
};