const { getTestDatabaseUrl } = require('./helpers/testDb');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:1979';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-web-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';

jest.mock('../utils/misc', () => {
    const actual = jest.requireActual('../utils/misc');
    return {
        ...actual,
        sendEmail: jest.fn((toEmail, subjectMsg, htmlMsg, callbackFunc) => {
            if (callbackFunc) {
                callbackFunc(null, { accepted: [toEmail], rejected: [] });
            }
        }),
    };
});

jest.mock('../lib/googleAuth', () => ({
    verifyGoogleIdToken: jest.fn(),
    exchangeGoogleAuthCode: jest.fn(),
    getGoogleClientIds: jest.fn(() => ['test-google-web-client-id']),
}));
