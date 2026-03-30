const { createClient } = require('redis');

const client = createClient({
    username: 'default',
    password: process.env.REDIS_PASS,
    socket: {
        host: 'redis-17342.c325.us-east-1-4.ec2.cloud.redislabs.com',
        port: 17342
    }
});

module.exports = client;