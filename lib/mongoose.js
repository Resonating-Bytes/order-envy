const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    const uri = process.env.DATABASE_URL;
    if (!uri) {
        const err = new Error('DATABASE_URL is not configured');
        err.status = 503;
        throw err;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(uri).then((m) => m);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = { connectDB };
