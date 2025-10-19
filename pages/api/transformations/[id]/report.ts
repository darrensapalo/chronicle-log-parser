import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const transformationId = parseInt(id);

  if (isNaN(transformationId)) {
    return res.status(400).json({ error: 'ID must be a number' });
  }

  try {
    const { remarks } = req.body;

    if (!remarks || typeof remarks !== 'string') {
      return res.status(400).json({ error: 'Remarks are required' });
    }

    // Verify transformation exists
    const transformation = await prisma.logTransformation.findUnique({
      where: { id: transformationId },
    });

    if (!transformation) {
      return res.status(404).json({ error: 'Transformation not found' });
    }

    const report = await prisma.transformationReport.create({
      data: {
        transformationId,
        remarks,
      },
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    return res.status(500).json({ error: 'Failed to create report' });
  }
}
