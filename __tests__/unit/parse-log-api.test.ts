import { createMocks } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/parse-log';

describe('Parse Log API Endpoint', () => {
  // Test 6.1.1: POST allowed
  test('6.1.1: should accept POST requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: '192.168.1.1',
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).not.toBe(405);
  });

  // Test 6.1.2: GET rejected
  test('6.1.2: should reject GET requests with 405', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET'
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.message).toBe('Method not allowed');
  });

  // Test 6.2.1: Missing rawLogEvent
  test('6.2.1: should return 400 when rawLogEvent is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.message).toContain('Missing required fields');
  });

  // Test 6.2.2: Missing parserCode
  test('6.2.2: should return 400 when parserCode is missing', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: '192.168.1.1'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.message).toContain('Missing required fields');
  });

  // Test 6.2.4: Valid inputs
  test('6.2.4: should return 200 with valid inputs', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: '192.168.1.1',
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });

  // Test 6.3.1: Response has all fields
  test('6.3.1: should return response with success, parsed, udm, and explanation fields', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: '192.168.1.1',
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    const jsonData = JSON.parse(res._getData());
    expect(jsonData).toHaveProperty('success');
    expect(jsonData).toHaveProperty('parsed');
    expect(jsonData).toHaveProperty('udm');
    expect(jsonData).toHaveProperty('explanation');
  });

  // Test 6.3.2: UDM structure valid
  test('6.3.2: should return valid UDM structure', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: '192.168.1.1',
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    const jsonData = JSON.parse(res._getData());
    expect(jsonData.udm).toBeDefined();
    expect(jsonData.udm).toHaveProperty('metadata');
    expect(jsonData.udm.metadata).toHaveProperty('event_type');
  });

  // Test 6.4.1: Parse failure
  test('6.4.1: should return 400 with explanation when parsing fails', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        rawLogEvent: 'not-an-ip',
        parserCode: `
          filter {
            grok { match => { "message" => "%{IP:client_ip}" } }
          }
        `
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const jsonData = JSON.parse(res._getData());
    expect(jsonData.message).toContain('Failed to parse log');
    expect(jsonData.explanation).toBeDefined();
    expect(jsonData.explanation).toContain('Parsing Failed');
  });
});
