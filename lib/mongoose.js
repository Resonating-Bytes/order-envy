const mongoose = require('mongoose');

function getCache() {
    if (!global.mongoose) {
        global.mongoose = { conn: null, promise: null };
    }
    return global.mongoose;
}

async function connectDB() {
    const cached = getCache();

    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (mongoose.connection.readyState === 0) {
        cached.conn = null;
        cached.promise = null;
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
