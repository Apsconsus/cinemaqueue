const { Worker } = require('bullmq');
const axios = require('axios');
const pool = require('./db'); // Import database connection

const sessionWorker = new Worker('sessionQueue', async (job) => {
    const { sessionId, cinemaId } = job.data;
    const apiUrl = `https://apim.hoyts.com.au/au/ticketing/api/v1/ticket/seats/${cinemaId}/${sessionId}`;

    console.log(`Processing job with ID: ${job.id}`);

    try {
        await delay(1000); // Add 1-second delay to avoid rate limiting

        const response = await axios.get(apiUrl);
        const data = response.data;

        // Count sold seats
        const soldSeats = data.rows.reduce((count, row) => {
            return count + row.seats.filter(seat => seat.sold).length;
        }, 0);

        // Save results to the database
        await pool.query(
            `INSERT INTO session_results (session_id, cinema_id, sold_seats, processed_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (session_id, cinema_id) DO UPDATE
             SET sold_seats = EXCLUDED.sold_seats, processed_at = NOW()`,
            [sessionId, cinemaId, soldSeats]
        );

        console.log(`Successfully processed session ${sessionId}. Total Sold Seats: ${soldSeats}`);
    } catch (error) {
        console.error(`Failed to process session ${sessionId}:`, error.message);
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
