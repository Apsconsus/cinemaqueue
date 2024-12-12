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
        const delayedJobs = await sessionQueue.getJobs(['delayed']);

        console.log(`Waiting Jobs: ${waitingJobs.length}`);
        console.log(`Active Jobs: ${activeJobs.length}`);
        console.log(`Completed Jobs: ${completedJobs.length}`);
        console.log(`Failed Jobs: ${failedJobs.length}`);
        console.log(`Delayed Jobs: ${delayedJobs.length}`);

        if (failedJobs.length > 0) {
            console.log('Failed Jobs Details:');
            for (const job of failedJobs) {
                console.log(`- Job ID: ${job.id}`);
                console.log(`  Data:`, job.data);
                console.log(`  Failed Reason: ${job.failedReason || 'No reason provided'}`);
            }
        }

        if (delayedJobs.length > 0) {
            console.log('Delayed Jobs Details:');
            for (const job of delayedJobs) {
                console.log(`- Job ID: ${job.id}`);
                console.log(`  Data:`, job.data);
                console.log(`  Delayed Until: ${new Date(job.timestamp + job.delay).toISOString()}`);
            }
        }
    } catch (error) {
        console.error('Error inspecting queue:', error);
    }
}

async function confirmRetry(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${message} (yes/no): `, (answer) => {
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

        const confirmed = await confirmRetry('Are you sure you want to retry all failed jobs?');
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

async function processDelayedJobs() {
    try {
        const delayedJobs = await sessionQueue.getJobs(['delayed']);
        if (delayedJobs.length === 0) {
            console.log('No delayed jobs to process.');
            return;
        }

        const confirmed = await confirmRetry('Are you sure you want to immediately process all delayed jobs?');
        if (!confirmed) {
            console.log('Processing delayed jobs aborted.');
            return;
        }

        console.log(`Processing ${delayedJobs.length} delayed jobs...`);
        for (const job of delayedJobs) {
            await job.promote(); // Promote the delayed job to be processed immediately
            console.log(`Promoted delayed job ID: ${job.id}`);
        }
        console.log('All delayed jobs have been processed.');
    } catch (error) {
        console.error('Error processing delayed jobs:', error);
    }
}

// Determine action based on terminal argument
const action = process.argv[2]; // Get the argument passed to the script
if (action === 'retry') {
    retryFailedJobs();
} else if (action === 'processDelayed') {
    processDelayedJobs();
} else {
    inspectQueue();
}
