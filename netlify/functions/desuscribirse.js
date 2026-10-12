const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.handler = async (event) => {
  try {
    const { email } = event.queryStringParameters || {};
    if (!email) return { statusCode: 400, body: "Falta el email" };

    const db = admin.firestore();

    // Actualitzar a la col·lecció newsletter
    await db.collection("newsletter").doc(email).update({ activo: false });

    return {
      statusCode: 200,
      body: "Te has dado de baja del newsletter. ¡Hasta pronto!"
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error interno" };
  }
};