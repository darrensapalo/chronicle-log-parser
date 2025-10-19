import { UDMMapper } from '../../lib/udm-mapper';

describe('UDM Mapper - Entity Fields', () => {
  let mapper: UDMMapper;

  beforeEach(() => {
    mapper = new UDMMapper();
  });

  // Test 2.1.1: Principal IP address array
  test('2.1.1: should map client_ip to principal.ip as array', () => {
    const parsedData = {
      client_ip: '192.168.1.1'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.principal?.ip).toEqual(['192.168.1.1']);
    expect(Array.isArray(udmEvent.principal?.ip)).toBe(true);
  });

  // Test 2.1.2: Principal hostname
  test('2.1.2: should map client_hostname to principal.hostname', () => {
    const parsedData = {
      client_hostname: 'web01'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.principal?.hostname).toBe('web01');
  });

  // Test 2.1.3: Principal user ID
  test('2.1.3: should map username to principal.user.userid', () => {
    const parsedData = {
      username: 'john'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.principal?.user?.userid).toBe('john');
  });

  // Test 2.2.1: Destination IP
  test('2.2.1: should map dst_ip to target.ip as array', () => {
    const parsedData = {
      dst_ip: '10.0.0.1'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.target?.ip).toEqual(['10.0.0.1']);
  });

  // Test 2.2.2: Target URL
  test('2.2.2: should map url to target.url', () => {
    const parsedData = {
      url: 'https://example.com'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.target?.url).toBe('https://example.com');
  });

  // Test 2.3.1: Full connection mapping (Principal + Target combined)
  test('2.3.1: should map both principal and target entities correctly', () => {
    const parsedData = {
      client_ip: '1.1.1.1',
      dst_ip: '2.2.2.2',
      src_port: '5000',
      dst_port: '80'
    };

    const udmEvent = mapper.mapToUDM(parsedData);

    expect(udmEvent.principal?.ip).toEqual(['1.1.1.1']);
    expect(udmEvent.principal?.port).toBe(5000);
    expect(udmEvent.target?.ip).toEqual(['2.2.2.2']);
    expect(udmEvent.target?.port).toBe(80);
  });
});
