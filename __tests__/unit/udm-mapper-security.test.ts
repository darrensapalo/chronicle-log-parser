import { UDMMapper } from '../../lib/udm-mapper';

describe('UDM Mapper - Security Result Classification', () => {
  let mapper: UDMMapper;

  beforeEach(() => {
    mapper = new UDMMapper();
  });

  // Test 4.1.1: 2xx Success
  test('4.1.1: should classify 200 response as ALLOW with INFO severity', () => {
    const parsedData = {
      response_code: '200'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.security_result).toBeDefined();
    expect(udmEvent.security_result![0].action).toBe('ALLOW');
    expect(udmEvent.security_result![0].severity).toBe('INFO');
  });

  // Test 4.1.2: 4xx Client error
  test('4.1.2: should classify 404 response as BLOCK with LOW severity', () => {
    const parsedData = {
      response_code: '404'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.security_result![0].action).toBe('BLOCK');
    expect(udmEvent.security_result![0].severity).toBe('LOW');
  });

  // Test 4.1.3: 401/403 Auth errors
  test('4.1.3: should classify 403 response as BLOCK with MEDIUM severity', () => {
    const parsedData = {
      response_code: '403'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.security_result![0].action).toBe('BLOCK');
    expect(udmEvent.security_result![0].severity).toBe('MEDIUM');
  });
});
