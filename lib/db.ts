import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '34.47.226.13',
  user: 'hacker',
  password: 'jmfs@1234',
  database: 'admin_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function executeQuery({ query, values }: { query: string; values: any[] }) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(query, values);
    return results;
  } catch (error) {
    return { error };
  } finally {
    connection.release();
  }
}

export default pool; 