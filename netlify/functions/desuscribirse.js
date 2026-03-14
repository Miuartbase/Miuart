const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.handler = async (event) => {
  try {
    const { email } = event.queryStringParameters || {};
    if (!email) return { statusCode: 400, body: "Falta l'email" };

    const db = admin.firestore();
    const snap = await db.collection("clients").where("email", "==", email).get();

    if (snap.empty) return { statusCode: 404, body: "Email no trobat" };

    snap.forEach(doc => doc.ref.update({ volNewsletter: false }));

    return {
      statusCode: 200,
      body: "Has deixat de rebre el newsletter. Gràcies!"
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error intern" };
  }
};
