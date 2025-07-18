import { createClient } from 'redis';

// Redis Cloud configuration
const redisUrl = process.env.REDIS_URL || 
  'redis://default:7AuAgiXHEEN6nwWhcPt1174HXCuhhsu@redis-17481.c275.us-east-1-4.ec2.redis-cloud.com:17481';

const client = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    connectTimeout: 10000,
    commandTimeout: 5000
  }
});

client.on('error', (err) => console.error('❌ Redis Client Error:', err));
client.on('connect', () => console.log('✅ Redis Client Connected'));
client.on('ready', () => console.log('✅ Redis Client Ready'));
client.on('reconnecting', () => console.log('🔄 Redis Client Reconnecting...'));

export default client;
