const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Validate required Firebase env vars early to avoid undefined errors
const requiredEnv = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_AUTH_URI',
    'FIREBASE_TOKEN_URI',
    'FIREBASE_AUTH_PROVIDER_CERT_URL',
    'FIREBASE_CLIENT_CERT_URL'
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
    throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

// Initialize Firebase Admin SDK
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com"
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

module.exports = { admin, db };
