const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mini_social',
  uploadsDir: path.join(__dirname, '..', 'uploads'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};



