const mongoose = require('mongoose');

function getTestDatabaseUrl() {
    if (process.env.TEST_DATABASE_URL) {
        return process.env.TEST_DATABASE_URL;
    }

    const base = process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/orderenvy';
    const [withoutQuery, queryPart] = base.split('?');
    const query = queryPart ? `?${queryPart}` : '';
    const lastSlash = withoutQuery.lastIndexOf('/');

    if (lastSlash > 'mongodb://'.length) {
        return `${withoutQuery.substring(0, lastSlash + 1)}orderenvy_test${query}`;
    }

    return `${withoutQuery}/orderenvy_test${query}`;
}

function resetMongooseCache() {
    delete global.mongoose;
}

async function connectTestDb() {
    const uri = getTestDatabaseUrl();
    process.env.DATABASE_URL = uri;

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    resetMongooseCache();
    await mongoose.connect(uri);
    return mongoose.connection;
}

async function clearTestDb() {
    if (mongoose.connection.readyState !== 1) {
        return;
    }

    const { collections } = mongoose.connection;
    await Promise.all(
        Object.values(collections).map((collection) => collection.deleteMany({}))
    );
}

async function disconnectTestDb() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
    resetMongooseCache();
}

module.exports = {
    getTestDatabaseUrl,
    connectTestDb,
    clearTestDb,
    disconnectTestDb,
};
