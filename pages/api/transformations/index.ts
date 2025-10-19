import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [transformations, total] = await Promise.all([
        prisma.logTransformation.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            reports: true,
          },
        }),
        prisma.logTransformation.count(),
      ]);

      return res.status(200).json({
        data: transformations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching transformations:', error);
      return res.status(500).json({ error: 'Failed to fetch transformations' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { apiVersion, author, rawLog, filterCode, generatedOutput } = req.body;

      if (!apiVersion || !rawLog || !filterCode || !generatedOutput) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const transformation = await prisma.logTransformation.create({
        data: {
          apiVersion,
          author: author || null,
          rawLog,
          filterCode,
          generatedOutput,
        },
      });

      return res.status(201).json(transformation);
    } catch (error) {
      console.error('Error creating transformation:', error);
      return res.status(500).json({ error: 'Failed to create transformation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
