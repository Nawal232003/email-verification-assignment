const COMMON_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com"
];

function getLevenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function getDidYouMean(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const parts = email.split('@');
  if (parts.length !== 2) return null;

  const localPart = parts[0];
  const domain = parts[1].toLowerCase();

  for (const commonDomain of COMMON_DOMAINS) {
    if (domain === commonDomain) {
      return null;
    }
    
    const distance = getLevenshteinDistance(domain, commonDomain);
    if (distance > 0 && distance <= 2) {
      return `${localPart}@${commonDomain}`;
    }
  }

  return null;
}

module.exports = {
  getLevenshteinDistance,
  getDidYouMean,
  COMMON_DOMAINS
};
