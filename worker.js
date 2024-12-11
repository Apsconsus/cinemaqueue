const { Worker } = require('bullmq');
const axios = require('axios');
const pool = require('./db');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sessionWorker = new Worker('sessionQueue', async (job) => {
    const { sessionId, cinemaId } = job.data;
    const apiUrl = `https://apim.hoyts.com.au/au/ticketing/api/v1/ticket/seats/${cinemaId}/${sessionId}`;

    console.log(`Processing job with ID: ${job.id}`);
    console.log(`Session ID: ${sessionId}, Cinema ID: ${cinemaId}`);
    console.log(`API URL: ${apiUrl}`);

    try {
        await delay(1000); // Avoid rate limiting
        console.log(`Fetching data from API for session ${sessionId}...`);

        const response = await axios.get(apiUrl);
        const data = response.data;

        console.log(`API response received for session ${sessionId}.`);

        // Count sold seats
        const soldSeats = data.rows.reduce((count, row) => {
            return count + row.seats.filter(seat => seat.sold).length;
        }, 0);

        console.log(`Sold seats for session ${sessionId}: ${soldSeats}`);

        // Save to database
        console.log(`Saving results to the database for session ${sessionId}...`);
        await pool.query(
            `INSERT INTO session_results (session_id, cinema_id, sold_seats, processed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (session_id, cinema_id) DO UPDATE
             SET sold_seats = EXCLUDED.sold_seats, processed_at = NOW()`,
            [sessionId, cinemaId, soldSeats]
        );

        console.log(`Results successfully saved for session ${sessionId}.`);
    } catch (error) {
        console.error(`Error processing session ${sessionId}:`, error.message);
        console.error('Error stack:', error.stack);
        throw error; // Ensures BullMQ registers the job as failed
    }
}, {
    connection: {
        host: '192.168.1.38',
        port: 6379,
    },
    settings: {
        retryProcessDelay: 60000, // Retry after 60 seconds
    },
});

// Log failed jobs
sessionWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err ? err.message : 'Unknown error'}`);
    if (err) console.error('Error stack:', err.stack);
});

// Log completed jobs
sessionWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully.`);
});

console.log('Worker is running and waiting for jobs...');
