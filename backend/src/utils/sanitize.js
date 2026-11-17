const xss = require('xss');

const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return xss(value.trim());
};

const sanitizeObject = (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  const keys = fields.length ? fields : Object.keys(result);
  for (const key of keys) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key]);
    } else if (Array.isArray(result[key])) {
      result[key] = result[key].map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    }
  }
  return result;
};

module.exports = { sanitizeString, sanitizeObject };
