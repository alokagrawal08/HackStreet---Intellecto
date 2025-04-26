import type { NextApiRequest, NextApiResponse } from 'next';
import { executeQuery } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { UserName, json_data, UserID } = req.body;

    const result = await executeQuery({
      query: 'INSERT INTO UserData (UserName, json_data, UserID) VALUES (?, ?, ?)',
      values: [UserName, json_data, UserID],
    });

    if (result.error) {
      throw result.error;
    }
    
    return res.status(200).json({ message: 'Data saved successfully', result });
  } catch (error) {
    console.error('Error saving quiz data:', error);
    return res.status(500).json({ message: 'Error saving quiz data' });
  }
} 