import type { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery } from '../../lib/db';
import { ResultSetHeader } from 'mysql2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { UserName, json_data, UserID } = req.body;

    const result = await executeQuery<ResultSetHeader>({
      query: 'INSERT INTO UserData (UserName, json_data, UserID) VALUES (?, ?, ?)',
      values: [UserName, json_data, UserID],
    });

    if (result.error) {
      throw result.error;
    }
    
    return res.status(200).json({ 
      message: 'Data saved successfully', 
      insertId: result.data?.insertId 
    });
  } catch (error) {
    console.error('Error saving quiz data:', error);
    return res.status(500).json({ 
      message: 'Error saving quiz data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 