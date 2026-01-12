// Test Firebase initialization
console.log('Testing Firebase connection...');

try {
    const { db } = require('./firebaseConfig');
    console.log('✓ Firebase loaded successfully');
    
    // Test a simple query
    db.collection('scores').limit(1).get()
        .then(snapshot => {
            console.log(`✓ Firestore query successful. Found ${snapshot.size} document(s)`);
            process.exit(0);
        })
        .catch(err => {
            console.error('✗ Firestore query failed:', err.message);
            process.exit(1);
        });
} catch (err) {
    console.error('✗ Firebase initialization failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
}
