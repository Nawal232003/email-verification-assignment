const { verifyEmail } = require('./verifier');
const { getDidYouMean } = require('./typoDetector');

module.exports = {
  verifyEmail,
  getDidYouMean
};
