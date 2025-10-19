import { LogstashParser } from '../../lib/logstash-parser';

describe('Logstash Parser - Grok Pattern Parsing', () => {
  let parser: LogstashParser;

  beforeEach(() => {
    parser = new LogstashParser();
  });

  // Test 5.1.1: Simple IP pattern
  test('5.1.1: should parse simple IP pattern', () => {
    const grokConfig = 'grok { match => { "message" => "%{IP:client_ip}" } }';
    const log = '192.168.1.1';

    const parsed = parser.parseLog(log, grokConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.client_ip).toBe('192.168.1.1');
  });

  // Test 5.1.2: Multiple fields
  test('5.1.2: should parse multiple fields from pattern', () => {
    const grokConfig = 'grok { match => { "message" => "%{IP:ip} %{WORD:action}" } }';
    const log = '10.0.0.1 ACCEPT';

    const parsed = parser.parseLog(log, grokConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.ip).toBe('10.0.0.1');
    expect(parsed?.action).toBe('ACCEPT');
  });

  // Test 5.1.3: HTTPDATE pattern
  test('5.1.3: should parse HTTPDATE pattern', () => {
    const grokConfig = 'grok { match => { "message" => "%{HTTPDATE:timestamp}" } }';
    const log = '24/Apr/2017:21:22:23 -0700';

    const parsed = parser.parseLog(log, grokConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.timestamp).toBe('24/Apr/2017:21:22:23 -0700');
  });

  // Test 5.2.1: Date filter
  test('5.2.1: should apply date filter and create @timestamp in ISO format', () => {
    const logstashConfig = `
      filter {
        grok { match => { "message" => "%{HTTPDATE:timestamp}" } }
        date { match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"] }
      }
    `;
    const log = '24/Apr/2017:21:22:23 -0700';

    const parsed = parser.parseLogstashConfig(log, logstashConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.['@timestamp']).toBeDefined();
    expect(parsed?.['@timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // Test 5.2.3: Combined filters (Grok + Date)
  test('5.2.3: should apply grok and date filters in sequence', () => {
    const logstashConfig = `
      filter {
        grok {
          match => { "message" => "%{IP:client_ip} %{HTTPDATE:timestamp}" }
        }
        date {
          match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
        }
      }
    `;
    const log = '192.168.1.1 24/Apr/2017:21:22:23 -0700';

    const parsed = parser.parseLogstashConfig(log, logstashConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.client_ip).toBe('192.168.1.1');
    expect(parsed?.timestamp).toBe('24/Apr/2017:21:22:23 -0700');
    expect(parsed?.['@timestamp']).toBeDefined();
  });

  // Test 5.3.1: Apache Combined Log (Full config)
  test('5.3.1: should parse full Apache Combined log format', () => {
    const logstashConfig = `
      filter {
        grok {
          match => { "message" => "%{COMBINEDAPACHELOG}" }
        }
        date {
          match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
        }
      }
    `;
    const log = '127.0.0.1 - frank [24/Apr/2017:21:22:23 -0700] "GET /index.html HTTP/1.1" 200 1234 "http://google.com" "Mozilla/5.0"';

    const parsed = parser.parseLogstashConfig(log, logstashConfig);

    expect(parsed).not.toBeNull();
    expect(parsed?.client_ip).toBe('127.0.0.1');
    expect(parsed?.auth).toBe('frank');
    expect(parsed?.http_method).toBe('GET');
    expect(parsed?.request).toBe('/index.html');
    expect(parsed?.response_code).toBe('200');
    expect(parsed?.bytes).toBe('1234');
    expect(parsed?.['@timestamp']).toBeDefined();
  });
});
