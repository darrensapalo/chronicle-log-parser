import { LogstashParser } from '../../lib/logstash-parser';
import { UDMMapper } from '../../lib/udm-mapper';

describe('Integration - Real World Log Formats', () => {
  let parser: LogstashParser;
  let mapper: UDMMapper;

  beforeEach(() => {
    parser = new LogstashParser();
    mapper = new UDMMapper();
  });

  // Test 7.1.2: Apache Combined format (end-to-end)
  test('7.1.2: should parse Apache Combined log and map to UDM correctly', () => {
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

    const apacheLog = '127.0.0.1 - frank [24/Apr/2017:21:22:23 -0700] "GET /index.html HTTP/1.1" 200 1234 "http://google.com" "Mozilla/5.0"';

    // Parse the log
    const parsed = parser.parseLogstashConfig(apacheLog, logstashConfig);
    expect(parsed).not.toBeNull();

    // Map to UDM
    const udmEvent = mapper.mapToUDM(parsed!);

    // Validate all expected UDM fields are populated
    expect(udmEvent.metadata?.event_type).toBe('NETWORK_HTTP');
    expect(udmEvent.metadata?.event_timestamp).toBeDefined();

    expect(udmEvent.principal?.ip).toEqual(['127.0.0.1']);

    expect(udmEvent.network?.http?.method).toBe('GET');
    expect(udmEvent.network?.http?.response_code).toBe(200);
    expect(udmEvent.network?.http?.referer).toBeDefined();
    expect(udmEvent.network?.http?.user_agent).toBeDefined();

    expect(udmEvent.security_result).toBeDefined();
    expect(udmEvent.security_result![0].action).toBe('ALLOW');
    expect(udmEvent.security_result![0].severity).toBe('INFO');

    expect(udmEvent.additional?.parsed_fields).toBeDefined();
  });
});
