# Unit Testing Plan for Chronicle Log Parser

**Reference**: [Google Chronicle UDM Field List](https://cloud.google.com/chronicle/docs/reference/udm-field-list)

## Overview

This document outlines the testing strategy for the Chronicle Log Parser, focusing on testing the Logstash parser, UDM mapper, and API endpoint. Tests progress from simple to complex scenarios.

---

## Test Infrastructure

### Dependencies
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "node-mocks-http": "^1.13.0",
    "ts-jest": "^29.1.0"
  }
}
```

### Jest Configuration
```js
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'pages/api/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

---

## Phase 1: Metadata & Additional Fields (Simple)

**Focus**: Test basic UDM structure population with minimal complexity

### Test Suite 1.1: Metadata Fields
**File**: `__tests__/unit/udm-mapper-metadata.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 1.1.1 | Timestamp mapping | `{timestamp: "24/Apr/2017:21:22:23 -0700"}` | `metadata.event_timestamp` in ISO format | HIGH |
| 1.1.2 | Event type inference - HTTP | `{http_method: "GET", response_code: "200"}` | `metadata.event_type: "NETWORK_HTTP"` | HIGH |
| 1.1.3 | Event type inference - Generic | `{custom_field: "value"}` | `metadata.event_type: "GENERIC_EVENT"` | MEDIUM |

**Rationale**: Metadata is required in all UDM events. Testing timestamp conversion and event type inference validates core functionality.

### Test Suite 1.2: Additional Fields
**File**: `__tests__/unit/udm-mapper-additional.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 1.2.1 | Preserve all parsed fields | `{field1: "a", field2: "b"}` | `additional.parsed_fields` contains both | HIGH |
| 1.2.2 | Empty objects cleaned | `{empty_field: ""}` | Empty objects removed from output | MEDIUM |

**Rationale**: The `additional` field ensures no data loss and allows debugging. Empty field cleanup prevents bloated responses.

---

## Phase 2: Entity Fields (Principal & Target)

**Focus**: Test entity mapping for source and destination entities

### Test Suite 2.1: Principal Entity
**File**: `__tests__/unit/udm-mapper-principal.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 2.1.1 | IP address array | `{client_ip: "192.168.1.1"}` | `principal.ip: ["192.168.1.1"]` | HIGH |
| 2.1.2 | Hostname | `{client_hostname: "web01"}` | `principal.hostname: "web01"` | HIGH |
| 2.1.3 | User ID | `{username: "john"}` | `principal.user.userid: "john"` | HIGH |
| 2.1.4 | Port number conversion | `{src_port: "8080"}` | `principal.port: 8080` (number) | MEDIUM |
| 2.1.5 | Multiple IP fields (precedence) | `{client_ip: "1.1.1.1", src_ip: "2.2.2.2"}` | Uses `client_ip` first | LOW |

**Rationale**: Principal represents the actor/source in security events. IP and hostname are critical for threat analysis. Test 2.1.5 validates field precedence logic.

### Test Suite 2.2: Target Entity
**File**: `__tests__/unit/udm-mapper-target.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 2.2.1 | Destination IP | `{dst_ip: "10.0.0.1"}` | `target.ip: ["10.0.0.1"]` | HIGH |
| 2.2.2 | Target URL | `{url: "https://example.com"}` | `target.url: "https://example.com"` | HIGH |
| 2.2.3 | Target port | `{dst_port: "443"}` | `target.port: 443` (number) | MEDIUM |

**Rationale**: Target represents the destination/resource being accessed. Critical for understanding attack vectors.

### Test Suite 2.3: Principal + Target Combined
**File**: `__tests__/unit/udm-mapper-entities.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 2.3.1 | Full connection mapping | `{client_ip: "1.1.1.1", dst_ip: "2.2.2.2", src_port: "5000", dst_port: "80"}` | Both principal and target populated correctly | HIGH |

**Rationale**: Most security events involve two entities. This validates complete entity relationship mapping.

---

## Phase 3: Network Events

**Focus**: Test network-specific fields (HTTP, DNS, etc.)

### Test Suite 3.1: HTTP Fields
**File**: `__tests__/unit/udm-mapper-http.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 3.1.1 | HTTP method | `{http_method: "POST"}` | `network.http.method: "POST"` | HIGH |
| 3.1.2 | Response code | `{response_code: "404"}` | `network.http.response_code: 404` (number) | HIGH |
| 3.1.3 | User agent with quotes | `{user_agent: '"Mozilla/5.0..."'}` | Quotes removed | MEDIUM |
| 3.1.4 | Referer field | `{referer: '"https://google.com"'}` | `network.http.referer` (quotes removed) | LOW |

**Rationale**: HTTP is the most common protocol in web security logs. Response codes drive security result classification.

---

## Phase 4: Security Results

**Focus**: Test action and severity inference from response codes

### Test Suite 4.1: Security Result Classification
**File**: `__tests__/unit/udm-mapper-security.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 4.1.1 | 2xx Success | `{response_code: "200"}` | `action: "ALLOW", severity: "INFO"` | HIGH |
| 4.1.2 | 4xx Client error | `{response_code: "404"}` | `action: "BLOCK", severity: "LOW"` | HIGH |
| 4.1.3 | 401/403 Auth errors | `{response_code: "403"}` | `action: "BLOCK", severity: "MEDIUM"` | HIGH |
| 4.1.4 | 5xx Server error | `{response_code: "500"}` | `action: "UNKNOWN", severity: "HIGH"` | MEDIUM |

**Rationale**: Security results are critical for SIEM analysis. Different status codes indicate different threat levels.

---

## Phase 5: Logstash Parser

**Focus**: Test grok pattern parsing and filter application

### Test Suite 5.1: Grok Pattern Parsing
**File**: `__tests__/unit/logstash-parser-grok.test.ts`

| Test ID | Description | Input | Expected Output | Priority |
|---------|-------------|-------|-----------------|----------|
| 5.1.1 | Simple IP pattern | Pattern: `%{IP:client_ip}`, Log: `192.168.1.1` | `{client_ip: "192.168.1.1"}` | HIGH |
| 5.1.2 | Multiple fields | Pattern: `%{IP:ip} %{WORD:action}`, Log: `10.0.0.1 ACCEPT` | `{ip: "10.0.0.1", action: "ACCEPT"}` | HIGH |
| 5.1.3 | HTTPDATE pattern | Pattern: `%{HTTPDATE:timestamp}`, Log: `24/Apr/2017:21:22:23 -0700` | `{timestamp: "24/Apr/2017:21:22:23 -0700"}` | HIGH |
| 5.1.4 | Pattern mismatch | Pattern: `%{IP:ip}`, Log: `not-an-ip` | `null` | MEDIUM |

**Rationale**: Grok parsing is the foundation. Must handle common patterns and fail gracefully on mismatches.

### Test Suite 5.2: Logstash Filters
**File**: `__tests__/unit/logstash-parser-filters.test.ts`

| Test ID | Description | Config | Expected Behavior | Priority |
|---------|-------------|--------|-------------------|----------|
| 5.2.1 | Date filter | `date { match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"] }` | Creates `@timestamp` in ISO format | HIGH |
| 5.2.2 | Mutate remove_field | `mutate { remove_field => ["message"] }` | Specified fields removed | MEDIUM |
| 5.2.3 | Combined filters | Grok + Date + Mutate | All filters applied in order | HIGH |

**Rationale**: Filters transform raw parsed data. Date conversion is critical for UDM compliance.

### Test Suite 5.3: Full Logstash Config
**File**: `__tests__/unit/logstash-parser-config.test.ts`

| Test ID | Description | Config | Log | Expected Result | Priority |
|---------|-------------|--------|-----|-----------------|----------|
| 5.3.1 | Apache Combined Log | Full Apache parser | Apache log line | All fields parsed + @timestamp | HIGH |
| 5.3.2 | Invalid config syntax | Malformed filter | Any log | Returns `null` | MEDIUM |

**Rationale**: Tests the full parsing pipeline. Apache Combined is a real-world standard format.

---

## Phase 6: API Endpoint

**Focus**: Test HTTP API contract and error handling

### Test Suite 6.1: HTTP Method Validation
**File**: `__tests__/unit/parse-log-api-methods.test.ts`

| Test ID | Description | Method | Expected Response | Priority |
|---------|-------------|--------|-------------------|----------|
| 6.1.1 | POST allowed | POST | 200 (on success) or 400 (on parse error) | HIGH |
| 6.1.2 | GET rejected | GET | 405 Method not allowed | HIGH |
| 6.1.3 | Other methods rejected | PUT, DELETE, PATCH | 405 Method not allowed | LOW |

**Rationale**: API contract enforcement. Only POST should be accepted.

### Test Suite 6.2: Input Validation
**File**: `__tests__/unit/parse-log-api-validation.test.ts`

| Test ID | Description | Request Body | Expected Response | Priority |
|---------|-------------|--------------|-------------------|----------|
| 6.2.1 | Missing rawLogEvent | `{parserCode: "..."}` | 400 + error message | HIGH |
| 6.2.2 | Missing parserCode | `{rawLogEvent: "..."}` | 400 + error message | HIGH |
| 6.2.3 | Both missing | `{}` | 400 + error message | MEDIUM |
| 6.2.4 | Valid inputs | Both present | 200 or parsing error | HIGH |

**Rationale**: Input validation prevents server errors and provides clear user feedback.

### Test Suite 6.3: Success Response Structure
**File**: `__tests__/unit/parse-log-api-success.test.ts`

| Test ID | Description | Validation | Priority |
|---------|-------------|------------|----------|
| 6.3.1 | Response has all fields | Contains: `success`, `parsed`, `udm`, `explanation` | HIGH |
| 6.3.2 | UDM structure valid | `udm` object matches UDM schema | HIGH |
| 6.3.3 | Explanation is markdown | `explanation` is string with markdown format | LOW |

**Rationale**: Ensures API consumers receive predictable, complete responses.

### Test Suite 6.4: Error Handling
**File**: `__tests__/unit/parse-log-api-errors.test.ts`

| Test ID | Description | Scenario | Expected Response | Priority |
|---------|-------------|----------|-------------------|----------|
| 6.4.1 | Parse failure | Pattern mismatch | 400 + explanation with troubleshooting tips | HIGH |
| 6.4.2 | Server error | Parser throws exception | 500 + error message | MEDIUM |

**Rationale**: Proper error handling provides debugging information without exposing system internals.

---

## Phase 7: Integration & Real-World Scenarios

**Focus**: Test with actual log formats

### Test Suite 7.1: Common Log Formats
**File**: `__tests__/integration/real-world-logs.test.ts`

| Test ID | Description | Log Format | Expected UDM Fields | Priority |
|---------|-------------|------------|---------------------|----------|
| 7.1.1 | Apache Common | Standard Apache CLF | principal.ip, network.http.*, metadata.event_type | HIGH |
| 7.1.2 | Apache Combined | Apache with referer + user agent | All HTTP fields + referer + user_agent | HIGH |
| 7.1.3 | Nginx access log | Standard nginx format | Similar to Apache | MEDIUM |

**Rationale**: Validates end-to-end functionality with real log formats that users will actually parse.

### Test Suite 7.2: Edge Cases
**File**: `__tests__/integration/edge-cases.test.ts`

| Test ID | Description | Scenario | Expected Behavior | Priority |
|---------|-------------|----------|-------------------|----------|
| 7.2.1 | Empty parsed result | No fields extracted | Returns cleaned UDM with minimal metadata | MEDIUM |
| 7.2.2 | Null/undefined values | Parser returns nulls | Nulls excluded from UDM | MEDIUM |
| 7.2.3 | Invalid number conversion | Port = "not-a-number" | NaN → field excluded or error | LOW |
| 7.2.4 | Special characters | Unicode in hostname | Preserved correctly | LOW |

**Rationale**: Edge cases expose boundary condition bugs. Critical for production stability.

---

## Test File Structure

```
__tests__/
├── unit/
│   ├── logstash-parser-grok.test.ts
│   ├── logstash-parser-filters.test.ts
│   ├── logstash-parser-config.test.ts
│   ├── udm-mapper-metadata.test.ts
│   ├── udm-mapper-additional.test.ts
│   ├── udm-mapper-principal.test.ts
│   ├── udm-mapper-target.test.ts
│   ├── udm-mapper-entities.test.ts
│   ├── udm-mapper-http.test.ts
│   ├── udm-mapper-security.test.ts
│   ├── parse-log-api-methods.test.ts
│   ├── parse-log-api-validation.test.ts
│   ├── parse-log-api-success.test.ts
│   └── parse-log-api-errors.test.ts
├── integration/
│   ├── real-world-logs.test.ts
│   └── edge-cases.test.ts
└── fixtures/
    ├── logs/
    │   ├── apache-common.log
    │   ├── apache-combined.log
    │   └── nginx.log
    └── parsers/
        ├── apache-common.conf
        ├── apache-combined.conf
        └── nginx.conf
```

---

## Critical Review & Optimization

## Test Execution Order

1. **Phase 1**: Metadata & Additional (easiest, foundational)
2. **Phase 2**: Entity mapping (builds on Phase 1)
3. **Phase 4**: Security results (uses Phase 2 + 3 data)
4. **Phase 5**: Logstash parser (independent, can run parallel)
5. **Phase 6**: API endpoint (uses all above components)
6. **Phase 7**: Integration tests (validates full pipeline)

---

## Success Metrics

- ✅ **Code Coverage**: >80% for lib/ and pages/api/
- ✅ **Test Count**: ~40 meaningful tests
- ✅ **Runtime**: <5 seconds for all unit tests
- ✅ **Maintenance**: Each test validates distinct functionality
- ✅ **Documentation**: Every test has clear purpose and rationale

---

## Next Steps

1. Install testing dependencies
2. Configure Jest
3. Implement Phase 1 tests (start here)
4. Iterate through phases 2-7
5. Add CI/CD pipeline integration

