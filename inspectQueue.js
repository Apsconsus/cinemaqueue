const { Queue } = require('bullmq');
const readline = require('readline');

// Connect to the session queue
const sessionQueue = new Queue('sessionQueue', {
    connection: {
        host: '192.168.1.38', // Replace with your Redis host
        port: 6379,
    },
});

async function inspectQueue() {
    try {
        const waitingJobs = await sessionQueue.getJobs(['waiting']);
        const activeJobs = await sessionQueue.getJobs(['active']);
        const completedJobs = await sessionQueue.getJobs(['completed']);
        const failedJobs = await sessionQueue.getJobs(['failed']);

        console.log(`Waiting Jobs: ${waitingJobs.length}`);
        console.log(`Active Jobs: ${activeJobs.length}`);
        console.log(`Completed Jobs: ${completedJobs.length}`);
        console.log(`Failed Jobs: ${failedJobs.length}`);

        if (failedJobs.length > 0) {
            console.log('Failed Jobs Details:');
            for (const job of failedJobs) {
                console.log(`- Job ID: ${job.id}`);
                console.log(`  Data:`, job.data);
                console.log(`  Failed Reason: ${job.failedReason || 'No reason provided'}`);
            }
        }
    } catch (error) {
        console.error('Error inspecting queue:', error);
    }
}

async function confirmRetry() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question('Are you sure you want to retry all failed jobs? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function retryFailedJobs() {
    try {
        const failedJobs = await sessionQueue.getJobs(['failed']);
        if (failedJobs.length === 0) {
            console.log('No failed jobs to retry.');
            return;
        }

        const confirmed = await confirmRetry();
        if (!confirmed) {
            console.log('Retry aborted.');
            return;
        }

        console.log(`Retrying ${failedJobs.length} failed jobs...`);
        for (const job of failedJobs) {
            await job.retry();
            console.log(`Retried job ID: ${job.id}`);
        }
        console.log('All failed jobs have been retried.');
    } catch (error) {
        console.error('Error retrying failed jobs:', error);
    }
}

// Determine action based on terminal argument
const action = process.argv[2]; // Get the argument passed to the script
if (action === 'retry') {
    retryFailedJobs();
} else {
    inspectQueue();
}
