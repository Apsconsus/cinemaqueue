const { Queue } = require('bullmq');

const sessionQueue = new Queue('sessionQueue', {
    connection: {
        host: '192.168.1.38', // Update with your Redis host
        port: 6379,
    },
});

async function inspectQueue() {
    try {
        const waitingJobs = await sessionQueue.getJobs(['waiting']);
        const activeJobs = await sessionQueue.getJobs(['active']);
        const completedJobs = await sessionQueue.getJobs(['completed']);
        const failedJobs = await sessionQueue.getJobs(['failed']);
        const delayedJobs = await sessionQueue.getJobs(['delayed']); // Add delayed state

        console.log(`Waiting Jobs: ${waitingJobs.length}`);
        console.log(`Active Jobs: ${activeJobs.length}`);
        console.log(`Completed Jobs: ${completedJobs.length}`);
        console.log(`Failed Jobs: ${failedJobs.length}`);
        console.log(`Delayed Jobs: ${delayedJobs.length}`); // Log delayed jobs
    } catch (error) {
        console.error('Error inspecting queue:', error);
    }
}

inspectQueue();
