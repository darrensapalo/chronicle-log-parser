// pages/api/parse-log.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { LogstashParser } from '../../lib/logstash-parser';
import { UDMMapper } from '../../lib/udm-mapper';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { rawLogEvent, parserCode } = req.body;

    if (!rawLogEvent || !parserCode) {
      res.status(400).json({ message: 'Missing required fields: rawLogEvent or parserCode' });
      return;
    }

    // Initialize parsers
    const logstashParser = new LogstashParser();
    const udmMapper = new UDMMapper();

    // Parse the log using Logstash configuration
    const parsedData = logstashParser.parseLogstashConfig(rawLogEvent, parserCode);

    if (!parsedData) {
      res.status(400).json({ 
        message: 'Failed to parse log',
        explanation: `## Parsing Failed\n\nThe log could not be parsed with the provided Logstash configuration.\n\n### Possible Issues:\n\n1. **Grok pattern mismatch**: The grok pattern may not match the log format\n2. **Invalid configuration**: Check your Logstash filter configuration syntax\n3. **Missing fields**: Ensure the log contains the expected fields\n\n### Tips:\n\n- Test your grok patterns incrementally\n- Use simpler patterns first, then add complexity\n- Check for escaping issues in the pattern\n- Verify that field names don't contain special characters`
      });
      return;
    }

    // Map to UDM format
    const udmEvent = udmMapper.mapToUDM(parsedData);

    // Generate explanation
    const explanation = udmMapper.generateExplanation(parsedData, udmEvent);

    res.status(200).json({
      success: true,
      parsed: parsedData,
      udm: udmEvent,
      explanation
    });

  } catch (error) {
    console.error('Error parsing log:', (error as any).message);
    res.status(500).json({ 
      message: 'Server error during parsing',
      error: (error as any).message,
      explanation: `## Parsing Error\n\nAn error occurred while parsing the log:\n\n\`\`\`\n${(error as any).message}\n\`\`\`\n\n### Troubleshooting:\n\n1. Check your Logstash configuration syntax\n2. Ensure grok patterns are properly formatted\n3. Verify that quotes and special characters are properly escaped\n4. Test with a simpler configuration first`
    });
  }
};

export default handler;

