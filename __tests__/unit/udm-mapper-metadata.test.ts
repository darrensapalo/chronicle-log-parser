import { UDMMapper } from '../../lib/udm-mapper';

describe('UDM Mapper - Metadata Fields', () => {
  let mapper: UDMMapper;

  beforeEach(() => {
    mapper = new UDMMapper();
  });

  // Test 1.1.1: Timestamp mapping
  test('1.1.1: should map timestamp to metadata.event_timestamp in ISO format', () => {
    const parsedData = {
      timestamp: '24/Apr/2017:21:22:23 -0700'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.metadata?.event_timestamp).toBeDefined();
    // Should be in ISO format (contains 'T' and ends with timezone)
    expect(udmEvent.metadata?.event_timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // Test 1.1.2: Event type inference - HTTP
  test('1.1.2: should infer NETWORK_HTTP event type when HTTP fields present', () => {
    const parsedData = {
      http_method: 'GET',
      response_code: '200'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.metadata?.event_type).toBe('NETWORK_HTTP');
  });

  // Test 1.2.1: Preserve all parsed fields
  test('1.2.1: should preserve all parsed fields in additional.parsed_fields', () => {
    const parsedData = {
      field1: 'value1',
      field2: 'value2'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.additional?.parsed_fields).toEqual(parsedData);
    expect(udmEvent.additional.parsed_fields.field1).toBe('value1');
    expect(udmEvent.additional.parsed_fields.field2).toBe('value2');
  });
});
