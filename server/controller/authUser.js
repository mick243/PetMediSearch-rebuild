const jwt = require('jsonwebtoken');

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (error) {
        console.error('Invalid token:', error.name, ', ', error.message);
        return null;
    }
};

module.exports = { verifyToken }