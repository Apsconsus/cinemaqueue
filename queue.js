const { Queue } = require('bullmq');

const sessionQueue = new Queue('sessionQueue', {
    connection: {
        host: '192.168.1.38', // Adjust to your Redis host
        port: 6379,        // Default Redis port
    },
});

module.exports = sessionQueue;
