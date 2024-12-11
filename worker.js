const { Worker } = require('bullmq');
const axios = require('axios');
const pool = require('./db'); // Import database connection

const sessionWorker = new Worker('sessionQueue', async (job) => {
    const { sessionId, cinemaId } = job.data;
    const apiUrl = `https://apim.hoyts.com.au/au/ticketing/api/v1/ticket/seats/${cinemaId}/${sessionId}`;

    console.log(`Processing job with ID: ${job.id}, Session ID: ${sessionId}, Cinema ID: ${cinemaId}`);
    console.log(`API URL: ${apiUrl}`);

    try {
        await delay(1000); // Add 1-second delay to avoid rate limiting
        console.log('Fetching API data...');

        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log(`API response received for session ${sessionId}.`);

        // Count sold seats
        const soldSeats = data.rows.reduce((count, row) => {
            return count + row.seats.filter(seat => seat.sold).length;
        }, 0);

        console.log(`Total sold seats for session ${sessionId}: ${soldSeats}`);

        // Save results to the database
        console.log('Saving results to the database...');
        await pool.query(
            `INSERT INTO session_results (session_id, cinema_id, sold_seats, processed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (session_id, cinema_id) DO UPDATE
             SET sold_seats = EXCLUDED.sold_seats, processed_at = NOW()`,
            [sessionId, cinemaId, soldSeats]
        );

        console.log(`Successfully saved results for session ${sessionId} to the database.`);
    } catch (error) {
        console.error(`Failed to process session ${sessionId}:`, error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
}, {
    connection: {
        host: '192.168.1.38',
        port: 6379,
    },
    settings: {
        retryProcessDelay: 60000, // Retry after 60 seconds if it fails
    },
});

console.log('Worker is running and waiting for jobs...');

// Worker event listeners for additional logs
sessionWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully.`);
});

sessionWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});

sessionWorker.on('error', (err) => {
    console.error('Worker encountered an error:', err);
});

sessionWorker.on('stalled', (job) => {
    console.warn(`Job ${job.id} has stalled.`);
});
