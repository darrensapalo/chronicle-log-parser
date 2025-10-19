/**
 * UDM Mapper
 * Maps parsed log data to Google Chronicle's Unified Data Model (UDM)
 * Reference: https://cloud.google.com/chronicle/docs/reference/udm-field-list
 */

interface UDMEvent {
  metadata?: {
    event_type?: string;
    event_timestamp?: string;
    product_name?: string;
    vendor_name?: string;
    product_event_type?: string;
    log_type?: string;
    description?: string;
  };
  principal?: {
    hostname?: string;
    ip?: string[];
    port?: number;
    mac?: string[];
    user?: {
      userid?: string;
      user_display_name?: string;
      email_addresses?: string[];
    };
  };
  target?: {
    hostname?: string;
    ip?: string[];
    port?: number;
    url?: string;
    file?: {
      full_path?: string;
      size?: number;
    };
  };
  network?: {
    http?: {
      method?: string;
      response_code?: number;
      user_agent?: string;
      referer?: string;
    };
  };
  security_result?: Array<{
    action?: string;
    severity?: string;
    category?: string;
  }>;
  [key: string]: any;
}

export class UDMMapper {
  /**
   * Map parsed Logstash data to UDM format
   */
  mapToUDM(parsedData: Record<string, any>): UDMEvent {
    const udmEvent: UDMEvent = {
      metadata: {},
      principal: {},
      target: {},
      network: {
        http: {}
      },
      security_result: []
    };

    // Map metadata fields
    if (parsedData['@timestamp'] || parsedData.timestamp) {
      udmEvent.metadata!.event_timestamp = parsedData['@timestamp'] || this.parseTimestamp(parsedData.timestamp);
    }

    // Map principal (source/client) fields
    if (parsedData.client_ip || parsedData.src_ip || parsedData.source_ip) {
      const ip = parsedData.client_ip || parsedData.src_ip || parsedData.source_ip;
      udmEvent.principal!.ip = [ip];
    }

    if (parsedData.client_hostname || parsedData.src_hostname) {
      udmEvent.principal!.hostname = parsedData.client_hostname || parsedData.src_hostname;
    }

    if (parsedData.client_port || parsedData.src_port) {
      udmEvent.principal!.port = parseInt(parsedData.client_port || parsedData.src_port);
    }

    if (parsedData.user || parsedData.username || parsedData.ident) {
      udmEvent.principal!.user = {
        userid: parsedData.user || parsedData.username || parsedData.ident
      };
    }

    // Map target (destination) fields
    if (parsedData.dst_ip || parsedData.dest_ip || parsedData.target_ip) {
      const ip = parsedData.dst_ip || parsedData.dest_ip || parsedData.target_ip;
      udmEvent.target!.ip = [ip];
    }

    if (parsedData.dst_hostname || parsedData.dest_hostname || parsedData.target_hostname) {
      udmEvent.target!.hostname = parsedData.dst_hostname || parsedData.dest_hostname || parsedData.target_hostname;
    }

    if (parsedData.dst_port || parsedData.dest_port || parsedData.target_port) {
      udmEvent.target!.port = parseInt(parsedData.dst_port || parsedData.dest_port || parsedData.target_port);
    }

    if (parsedData.url || parsedData.request_url) {
      udmEvent.target!.url = parsedData.url || parsedData.request_url;
    }

    // Map HTTP fields
    if (parsedData.http_method || parsedData.method) {
      udmEvent.network!.http!.method = parsedData.http_method || parsedData.method;
    }

    if (parsedData.response_code || parsedData.status_code || parsedData.http_status) {
      udmEvent.network!.http!.response_code = parseInt(parsedData.response_code || parsedData.status_code || parsedData.http_status);
    }

    if (parsedData.user_agent || parsedData.useragent) {
      // Remove quotes if present
      const userAgent = (parsedData.user_agent || parsedData.useragent).replace(/^"/, '').replace(/"$/, '');
      udmEvent.network!.http!.user_agent = userAgent;
    }

    if (parsedData.referrer || parsedData.referer) {
      const referer = (parsedData.referrer || parsedData.referer).replace(/^"/, '').replace(/"$/, '');
      udmEvent.network!.http!.referer = referer;
    }

    // Map security result based on response codes
    if (parsedData.response_code || parsedData.status_code) {
      const code = parseInt(parsedData.response_code || parsedData.status_code);
      const action = this.determineActionFromStatusCode(code);
      const severity = this.determineSeverityFromStatusCode(code);
      
      udmEvent.security_result = [{
        action,
        severity,
        category: 'HTTP_REQUEST'
      }];
    }

    // Add event type inference
    udmEvent.metadata!.event_type = this.inferEventType(parsedData);
    
    // Add raw parsed data for reference
    udmEvent.additional = {
      parsed_fields: parsedData
    };

    // Clean up empty objects
    return this.cleanEmptyFields(udmEvent);
  }

  /**
   * Parse timestamp string to ISO format
   */
  private parseTimestamp(timestamp: string): string {
    try {
      // Try to parse common formats
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Fallback to current time
    }
    return new Date().toISOString();
  }

  /**
   * Determine action based on HTTP status code
   */
  private determineActionFromStatusCode(code: number): string {
    if (code >= 200 && code < 300) {
      return 'ALLOW';
    } else if (code >= 300 && code < 400) {
      return 'ALLOW'; // Redirects are typically allowed
    } else if (code >= 400 && code < 500) {
      return 'BLOCK'; // Client errors often indicate blocked requests
    } else if (code >= 500) {
      return 'UNKNOWN'; // Server errors
    }
    return 'UNKNOWN';
  }

  /**
   * Determine severity based on HTTP status code
   */
  private determineSeverityFromStatusCode(code: number): string {
    if (code >= 200 && code < 300) {
      return 'INFO';
    } else if (code >= 300 && code < 400) {
      return 'INFO';
    } else if (code >= 400 && code < 500) {
      if (code === 401 || code === 403) {
        return 'MEDIUM'; // Authentication/Authorization failures
      }
      return 'LOW';
    } else if (code >= 500) {
      return 'HIGH'; // Server errors
    }
    return 'UNKNOWN';
  }

  /**
   * Infer event type from parsed data
   */
  private inferEventType(parsedData: Record<string, any>): string {
    if (parsedData.http_method || parsedData.method || parsedData.response_code) {
      return 'NETWORK_HTTP';
    }
    if (parsedData.dns_query || parsedData.dns_response) {
      return 'NETWORK_DNS';
    }
    if (parsedData.src_ip && parsedData.dst_ip) {
      return 'NETWORK_CONNECTION';
    }
    if (parsedData.user || parsedData.username) {
      return 'USER_LOGIN';
    }
    return 'GENERIC_EVENT';
  }

  /**
   * Remove empty nested objects and arrays
   */
  private cleanEmptyFields(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.length > 0 ? obj : undefined;
    }
    
    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        const value = this.cleanEmptyFields(obj[key]);
        if (value !== undefined && value !== null && value !== '') {
          // Skip empty objects
          if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
            continue;
          }
          cleaned[key] = value;
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    
    return obj;
  }

  /**
   * Generate a formatted explanation of the UDM mapping
   */
  generateExplanation(parsedData: Record<string, any>, udmEvent: UDMEvent): string {
    let explanation = '## UDM Mapping Explanation\n\n';
    
    explanation += '### Parsed Fields\n\n';
    explanation += 'The following fields were extracted from the raw log:\n\n';
    explanation += '```json\n' + JSON.stringify(parsedData, null, 2) + '\n```\n\n';
    
    explanation += '### UDM Event Structure\n\n';
    explanation += 'The parsed fields were mapped to the UDM model as follows:\n\n';
    explanation += '```json\n' + JSON.stringify(udmEvent, null, 2) + '\n```\n\n';
    
    explanation += '### Field Mappings\n\n';
    
    if (udmEvent.principal?.ip) {
      explanation += `- **Principal IP**: ${udmEvent.principal.ip[0]} - Represents the source/client making the request\n`;
    }
    
    if (udmEvent.network?.http?.method) {
      explanation += `- **HTTP Method**: ${udmEvent.network.http.method} - The HTTP verb used in the request\n`;
    }
    
    if (udmEvent.network?.http?.response_code) {
      explanation += `- **Response Code**: ${udmEvent.network.http.response_code} - The HTTP status code returned\n`;
    }
    
    if (udmEvent.metadata?.event_type) {
      explanation += `- **Event Type**: ${udmEvent.metadata.event_type} - Inferred type based on the parsed fields\n`;
    }
    
    explanation += '\n### Suggestions\n\n';
    explanation += '1. **Enrich with context**: Consider adding more contextual fields like geographic location or threat intelligence\n';
    explanation += '2. **Normalize timestamps**: Ensure all timestamps are in ISO 8601 format\n';
    explanation += '3. **Add security context**: Include threat indicators or anomaly scores if available\n';
    explanation += '4. **Validate data types**: Ensure numeric fields (ports, response codes) are properly typed\n';
    
    return explanation;
  }
}

export default UDMMapper;

