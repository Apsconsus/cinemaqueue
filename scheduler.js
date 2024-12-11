console.log('Starting scheduler.js...');
const pool = require('./db');
const sessionQueue = require('./queue');

async function scheduleJobs() {
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

    try {
        console.log('Scheduler started. Current time:', now);
        console.log('Looking for sessions between:', now, 'and', thirtyMinutesLater);

        // Query unprocessed sessions
        const result = await pool.query(
            `SELECT id AS sessionId, cinemaId, date AS sessionTime
             FROM sessions
             WHERE date BETWEEN $1 AND $2
             AND NOT EXISTS (
                 SELECT 1 FROM processed_sessions WHERE id = CONCAT(sessions.id, '-', sessions.cinemaId)
             )`,
            [now, thirtyMinutesLater]
        );

        console.log('Query returned rows:', result.rows);

        for (const session of result.rows) {
            // Calculate delay for the job
            const delay = new Date(session.sessiontime).getTime() + 30 * 60 * 1000 - now.getTime();
            console.log('Scheduling job for session:', session, 'with delay:', delay);

            // Create combined ID
            const combinedId = `${session.sessionid}-${session.cinemaid}`;

            // Add the job to the queue with a unique ID
            await sessionQueue.add(
                'sendApiRequest',
                {
                    sessionId: session.sessionid,
                    cinemaId: session.cinemaid,
                },
                {
                    jobId: combinedId,
                    delay,
                }
            );

            console.log('Job added to queue with ID:', combinedId);

            // Mark the session as processed
            await pool.query(
                `INSERT INTO processed_sessions (id, session_id, cinema_id) VALUES ($1, $2, $3)`,
                [combinedId, session.sessionid, session.cinemaid]
            );

            console.log('Session marked as processed:', combinedId);
        }
    } catch (error) {
        console.error('Error scheduling jobs:', error);
    }
}

module.exports = scheduleJobs;
