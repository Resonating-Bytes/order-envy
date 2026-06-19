const { OAuth2Client } = require('google-auth-library');

function getGoogleClientIds() {
    return [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
    ].filter(Boolean);
}

async function exchangeGoogleAuthCode(code, redirectUri, codeVerifier) {
    if (!code) {
        const err = new Error('Google authorization code required');
        err.status = 400;
        throw err;
    }
    if (!redirectUri) {
        const err = new Error('Redirect URI required for Google code exchange');
        err.status = 400;
        throw err;
    }
    if (!codeVerifier) {
        const err = new Error('PKCE code verifier required for Google code exchange');
        err.status = 400;
        throw err;
    }
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        const err = new Error('Google code exchange is not configured');
        err.status = 503;
        throw err;
    }

    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    try {
        const { tokens } = await client.getToken({
            code,
            redirect_uri: redirectUri,
            codeVerifier,
        });
        if (!tokens.id_token) {
            const err = new Error('Google did not return an ID token');
            err.status = 401;
            throw err;
        }
        return tokens.id_token;
    } catch (error) {
        if (error.status) {
            throw error;
        }
        const detail = error.response?.data?.error_description
            || error.response?.data?.error
            || error.message;
        const err = new Error(detail || 'Failed to exchange Google authorization code');
        err.status = error.response?.status || 401;
        throw err;
    }
}

async function verifyGoogleIdToken(idToken) {
    if (!idToken) {
        const err = new Error('Google ID token required');
        err.status = 400;
        throw err;
    }

    const audiences = getGoogleClientIds();
    if (!audiences.length) {
        const err = new Error('Google sign-in is not configured');
        err.status = 503;
        throw err;
    }

    const client = new OAuth2Client();
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: audiences,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.sub) {
            const err = new Error('Invalid Google token');
            err.status = 401;
            throw err;
        }
        if (!payload.email) {
            const err = new Error('Google account must share an email address');
            err.status = 401;
            throw err;
        }
        if (payload.email_verified === false) {
            const err = new Error('Google email address is not verified');
            err.status = 401;
            throw err;
        }
        return payload;
    } catch (error) {
        if (error.status) {
            throw error;
        }
        const err = new Error('Invalid Google token');
        err.status = 401;
        throw err;
    }
}

module.exports = {
    getGoogleClientIds,
    exchangeGoogleAuthCode,
    verifyGoogleIdToken,
};
