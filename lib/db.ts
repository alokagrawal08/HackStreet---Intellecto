import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

const pool = mysql.createPool({
  host: '34.47.226.13',
  user: 'hacker',
  password: 'jmfs@1234',
  database: 'admin_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

type QueryResult = ResultSetHeader | RowDataPacket[] | RowDataPacket[][];

export async function executeQuery<T extends QueryResult>({ 
  query, 
  values 
}: { 
  query: string; 
  values: any[] 
}): Promise<{ data?: T; error?: Error }> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(query, values);
    return { data: results as T };
  } catch (error) {
    return { error: error as Error };
  } finally {
    connection.release();
  }
}

export default pool; 