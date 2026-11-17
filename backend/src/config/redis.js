const { createClient } = require('redis');
require('dotenv').config();

let client = null;
let connected = false;
const memoryCache = new Map();

const connectRedis = async () => {
  try {
    client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 1500,
        reconnectStrategy: false,
      },
    });

    client.on('error', () => {
      connected = false;
    });

    await client.connect();
    connected = true;
    console.log('Redis connected');
    return client;
  } catch (err) {
    connected = false;
    try {
      if (client) await client.disconnect().catch(() => {});
    } catch {
      /* ignore */
    }
    client = null;
    console.warn('Redis unavailable, using in-memory cache:', err.message);
    return null;
  }
};

const getCache = async (key) => {
  try {
    if (connected && client) {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    }
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 900) => {
  try {
    if (connected && client) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    }
    memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  } catch (err) {
    console.warn('Cache set failed:', err.message);
  }
};

const delCache = async (pattern) => {
  try {
    if (connected && client) {
      const keys = await client.keys(pattern);
      if (keys.length) await client.del(keys);
      return;
    }
    const needle = pattern.replace(/\*/g, '');
    for (const key of memoryCache.keys()) {
      if (!needle || key.includes(needle) || pattern === key) {
        memoryCache.delete(key);
      }
    }
  } catch (err) {
    console.warn('Cache delete failed:', err.message);
  }
};

const getCacheStats = () => ({
  backend: connected ? 'redis' : 'memory',
  memoryKeys: memoryCache.size,
});

module.exports = { connectRedis, getCache, setCache, delCache, getCacheStats };
