import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '34.47.226.13',
  user: 'hacker',
  password: 'jmfs@1234',
  database: 'admin_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userName, userId, jsonData } = req.body;

    const connection = await pool.getConnection();
    
    try {
      // Insert the quiz data into the UserData table
      const [result] = await connection.execute(
        'INSERT INTO UserData (UserName, json_data, UserID) VALUES (?, ?, ?)',
        [userName, JSON.stringify(jsonData), userId]
      );

      connection.release();
      
      return res.status(200).json({ 
        message: 'Quiz data saved successfully',
        result 
      });
    } catch (error) {
      connection.release();
      console.error('Database error:', error);
      return res.status(500).json({ 
        message: 'Error saving quiz data to database',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 