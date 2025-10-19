# Multi-Parse Strategy

## Overview
Support multiple parsing methods to give users flexibility in how logs are transformed to UDM format.

## Parsing Methods

### 1. JavaScript Parser (Current)
- **Type**: `javascript`
- **Description**: Pure JavaScript implementation of Logstash parser
- **Advantages**:
  - Fast, synchronous execution
  - No external dependencies
  - Deterministic results
  - Works offline
- **Limitations**:
  - May not support all Logstash features
  - Limited to JavaScript implementation capabilities

### 2. Logstash Microservice (New)
- **Type**: `logstash`
- **Description**: Delegates parsing to actual Logstash service via REST API
- **Advantages**:
  - 100% Logstash compatibility
  - Supports all Logstash plugins and features
  - Real Logstash engine validation
- **Limitations**:
  - Requires external service availability
  - Network latency
  - Depends on service uptime

## Implementation Plan

### Database Changes

#### 1. Update Prisma Schema
Add `parsingMethod` field to track which method was used:

```prisma
model LogTransformation {
  id               Int      @id @default(autoincrement())
  apiVersion       Int      @map("api_version")
  parsingMethod    String   @default("javascript") @map("parsing_method")
  author           String?
  rawLog           String   @map("raw_log")
  filterCode       String   @map("filter_code")
  generatedOutput  String   @map("generated_output")
  createdAt        DateTime @default(now()) @map("created_at")

  reports          TransformationReport[]

  @@map("log_transformations")
}
```

#### 2. Migration
```sql
ALTER TABLE log_transformations
ADD COLUMN parsing_method VARCHAR(50) NOT NULL DEFAULT 'javascript';
```

### API Changes

#### 1. Update Existing API
**`POST /api/parse-log`**
- Add optional `parsingMethod` parameter (defaults to `javascript`)
- Route to appropriate parser based on method
- Store `parsingMethod` in database

Request body:
```json
{
  "rawLogEvent": "...",
  "parserCode": "...",
  "parsingMethod": "javascript" | "logstash"
}
```

#### 2. New Logstash Service Client
**`lib/logstash-client.ts`**
- Handles communication with Logstash microservice
- Error handling and retry logic
- Timeout configuration

### UI Changes

#### 1. Parsing Method Selector
Add radio buttons or dropdown in `log_parser.tsx`:
```tsx
<div className="mb-4">
  <label className="block text-gray-700 font-medium mb-2">
    Parsing Method
  </label>
  <div className="flex gap-4">
    <label className="flex items-center">
      <input
        type="radio"
        value="javascript"
        checked={parsingMethod === 'javascript'}
        onChange={(e) => setParsingMethod(e.target.value)}
      />
      <span className="ml-2">JavaScript Parser (Fast)</span>
    </label>
    <label className="flex items-center">
      <input
        type="radio"
        value="logstash"
        checked={parsingMethod === 'logstash'}
        onChange={(e) => setParsingMethod(e.target.value)}
      />
      <span className="ml-2">Logstash Service (100% Compatible)</span>
    </label>
  </div>
</div>
```

#### 2. Display Parsing Method in History
Show badge indicating which method was used for each transformation:
- JavaScript: Blue badge
- Logstash: Green badge

### Configuration

#### Environment Variables
Add to `.env`:
```env
# Logstash microservice endpoint
LOGSTASH_SERVICE_URL=http://localhost:5000

# Timeout for Logstash service calls (ms)
LOGSTASH_TIMEOUT=10000
```

### Error Handling

#### Logstash Service Failures
If Logstash service is unavailable:
1. Return clear error message to user
2. Suggest fallback to JavaScript parser
3. Log error for monitoring
4. Do NOT save failed transformations to database

#### Fallback Strategy
Optional: Allow automatic fallback to JavaScript parser if Logstash service fails:
```json
{
  "parsingMethod": "logstash",
  "allowFallback": true
}
```

## Testing Strategy

### Unit Tests
- Mock Logstash service responses
- Test error handling
- Verify correct method stored in database

### Integration Tests
- Test both parsing methods with same input
- Compare outputs for consistency
- Verify database records

### E2E Tests
- User selects method and submits
- Verify correct parser is called
- Check transformation saved with correct method

## Future Enhancements

### Performance Monitoring
Track and display:
- Average response time per method
- Success/failure rates
- Method usage statistics

### Smart Method Selection
AI-powered recommendation based on:
- Parser code complexity
- Historical success rates
- Service availability

### Hybrid Parsing
Use JavaScript parser for validation, then Logstash service for production transformation.

## Migration Path

### Phase 1: Add Database Field
1. Update schema
2. Run migration
3. Default all existing records to `javascript`

### Phase 2: Add Logstash Client
1. Implement service client
2. Add configuration
3. Create integration tests

### Phase 3: Update UI
1. Add method selector
2. Update parse submission
3. Display method in history

### Phase 4: Deploy & Monitor
1. Deploy changes
2. Monitor service health
3. Gather user feedback
4. Optimize as needed
