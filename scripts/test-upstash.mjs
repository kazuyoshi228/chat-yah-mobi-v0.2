import { config } from 'dotenv';
config({ path: '.env' });

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

console.log('Testing Upstash Redis connection...');
console.log('URL:', url);

try {
  const res = await fetch(`${url}/ping`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Upstash ping result:', JSON.stringify(data));
  if (data.result === 'PONG') {
    console.log('✅ Connection successful!');
    process.exit(0);
  } else {
    console.error('❌ Unexpected response:', data);
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Connection failed:', e.message);
  process.exit(1);
}
