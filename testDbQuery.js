const pool = require('./db');

async function testQuery() {
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

    console.log('Testing database query...');
    try {
        const result = await pool.query(
            `SELECT id AS sessionId, cinemaId, date AS sessionTime
             FROM sessions
             WHERE date BETWEEN $1 AND $2
             AND NOT EXISTS (
                 SELECT 1 FROM processed_sessions WHERE id = CONCAT(sessions.id, '-', sessions.cinemaId)
             )`,
            [now, thirtyMinutesLater]
        );
        console.log('Query result:', result.rows);
    } catch (error) {
        console.error('Database query failed:', error);
    }
}

testQuery();
