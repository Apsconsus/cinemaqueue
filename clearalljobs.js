const { Queue } = require('bullmq');

// Connect to the session queue
const sessionQueue = new Queue('sessionQueue', {
    connection: {
        host: '192.168.1.38', // Replace with your Redis host
        port: 6379,
    },
});

async function clearAllJobs() {
    try {
        console.log('Clearing all jobs in the queue...');
        await sessionQueue.obliterate({ force: true });
        console.log('All jobs cleared successfully.');
    } catch (error) {
        console.error('Error clearing jobs:', error);
    }
}

clearAllJobs();
