import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const transformationId = parseInt(id);

  if (isNaN(transformationId)) {
    return res.status(400).json({ error: 'ID must be a number' });
  }

  if (req.method === 'GET') {
    try {
      const transformation = await prisma.logTransformation.findUnique({
        where: { id: transformationId },
        include: {
          reports: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!transformation) {
        return res.status(404).json({ error: 'Transformation not found' });
      }

      return res.status(200).json(transformation);
    } catch (error) {
      console.error('Error fetching transformation:', error);
      return res.status(500).json({ error: 'Failed to fetch transformation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
