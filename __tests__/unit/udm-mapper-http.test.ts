import { UDMMapper } from '../../lib/udm-mapper';

describe('UDM Mapper - HTTP Fields', () => {
  let mapper: UDMMapper;

  beforeEach(() => {
    mapper = new UDMMapper();
  });

  // Test 3.1.1: HTTP method
  test('3.1.1: should map http_method to network.http.method', () => {
    const parsedData = {
      http_method: 'POST'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.network?.http?.method).toBe('POST');
  });

  // Test 3.1.2: Response code
  test('3.1.2: should map response_code to network.http.response_code as number', () => {
    const parsedData = {
      response_code: '404'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.network?.http?.response_code).toBe(404);
    expect(typeof udmEvent.network?.http?.response_code).toBe('number');
  });
});
