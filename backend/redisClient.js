import { createClient } from 'redis';

// Redis Cloud configuration with fallback
const redisUrl = process.env.REDIS_URL || 
  'redis://default:7AuAgiXHEEN6nwWhcPt1174HXCuhhsu@redis-17481.c275.us-east-1-4.ec2.redis-cloud.com:17481';

console.log('🔍 Attempting Redis connection to:', redisUrl.replace(/:([^:@]+)@/, ':****@'));

const client = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: false, // Disable auto-reconnect to prevent spam
    connectTimeout: 10000,
    commandTimeout: 5000
  }
});

client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.code || err.message);
  // Don't spam reconnection attempts
});

client.on('connect', () => console.log('✅ Redis Client Connected'));
client.on('ready', () => console.log('✅ Redis Client Ready'));

export default client;
