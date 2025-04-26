import mysql from 'serverless-mysql';

const db = mysql({
  config: {
    host: '34.47.226.13',
    user: 'hacker',
    password: 'jmfs@1234',
    database: 'admin_db'
  }
});

export async function executeQuery({ query, values }: { query: string; values: any[] }) {
  try {
    const results = await db.query(query, values);
    await db.end();
    return results;
  } catch (error) {
    return { error };
  }
} 