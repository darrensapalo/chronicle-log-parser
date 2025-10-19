/**
 * Logstash Parser
 * A pure JavaScript implementation of Logstash grok pattern parsing
 */

// Common grok patterns used in logstash
const GROK_PATTERNS: Record<string, string> = {
  // Network patterns
  IPORHOST: '(?:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}|[a-zA-Z0-9][-a-zA-Z0-9]*(?:\\.[a-zA-Z0-9][-a-zA-Z0-9]*)*)',
  IP: '(?:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})',
  IPV6: '(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4})',
  IPV4: '(?:[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})',
  HOSTNAME: '\\b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*(?:\\.?|\\b)',
  
  // HTTP patterns
  HTTPDATE: '\\d{2}/[A-Z][a-z]{2}/\\d{4}:\\d{2}:\\d{2}:\\d{2} [+-]\\d{4}',
  
  // Basic patterns
  NUMBER: '(?:[+-]?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+))',
  INT: '(?:[+-]?[0-9]+)',
  WORD: '\\b\\w+\\b',
  DATA: '.*?',
  GREEDYDATA: '.*',
  SPACE: '\\s*',
  NOTSPACE: '\\S+',
  QS: '"(?:[^"\\\\]|\\\\.)*"',
  QUOTEDSTRING: '"(?:[^"\\\\]|\\\\.)*"',
  
  // User and identity
  USER: '[a-zA-Z0-9._-]+',
  USERNAME: '[a-zA-Z0-9._-]+',
  
  // Date/time patterns
  MONTHNUM: '(?:0?[1-9]|1[0-2])',
  MONTHDAY: '(?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])',
  YEAR: '(?:\\d\\d){1,2}',
  HOUR: '(?:2[0123]|[01]?[0-9])',
  MINUTE: '(?:[0-5][0-9])',
  SECOND: '(?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)',
  
  // Path patterns
  PATH: '(?:%{UNIXPATH}|%{WINPATH})',
  UNIXPATH: '(?:/[\\w_%!$@:.,-]*/?)(?:[\\w_%!$@:.,-]+)?',
  WINPATH: '(?:[A-Za-z]+:|\\\\)(?:\\\\[^\\\\?*]*)+',
  
  // Common log format
  COMMONAPACHELOG: '%{IPORHOST:client_ip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:timestamp}\\] "(?:%{WORD:http_method} %{NOTSPACE:request}(?: HTTP/%{NUMBER:http_version})?|%{DATA})" %{NUMBER:response_code} (?:%{NUMBER:bytes}|-)',
  COMBINEDAPACHELOG: '%{COMMONAPACHELOG} %{QS:referrer} %{QS:user_agent}',
};

interface ParsedField {
  name: string;
  value: string;
}

interface GrokMatch {
  pattern: string;
  fieldName: string;
  dataType?: string;
}

export class LogstashParser {
  private patterns: Record<string, string>;

  constructor() {
    this.patterns = { ...GROK_PATTERNS };
  }

  /**
   * Parse a grok pattern string and extract field names and patterns
   */
  private parseGrokPattern(pattern: string): string {
    let result = pattern;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    // Keep expanding patterns until no more %{} patterns are found
    while (/%\{[A-Z0-9_]+/.test(result) && iterations < maxIterations) {
      const grokRegex = /%\{([A-Z0-9_]+)(?::([a-zA-Z0-9_]+))?(?::([a-zA-Z]+))?\}/g;
      let match;
      let newResult = result;

      // Replace grok patterns with named capture groups or regex patterns
      while ((match = grokRegex.exec(result)) !== null) {
        const [fullMatch, patternName, fieldName, dataType] = match;
        const patternRegex = this.patterns[patternName] || this.patterns['DATA'];

        if (fieldName) {
          // Create a named capture group
          const namedGroup = `(?<${fieldName}>${patternRegex})`;
          newResult = newResult.replace(fullMatch, namedGroup);
        } else {
          // Just replace with the pattern
          newResult = newResult.replace(fullMatch, patternRegex);
        }
      }

      result = newResult;
      iterations++;
    }

    return result;
  }

  /**
   * Parse a Logstash grok filter configuration
   */
  parseGrokFilter(grokConfig: string): RegExp | null {
    try {
      // Extract the pattern from match => { "message" => "pattern" }
      const matchRegex = /match\s*=>\s*\{[^}]*"message"\s*=>\s*"([^"]+)"/;
      const match = grokConfig.match(matchRegex);

      if (!match) {
        return null;
      }

      // Process escape sequences in the pattern
      // In Logstash configs, \\ represents a literal backslash, so \\[ means \[
      let grokPattern = match[1];

      // Replace common escape sequences
      grokPattern = grokPattern.replace(/\\\\/g, '\x00'); // Temporarily mark \\
      grokPattern = grokPattern.replace(/\\"/g, '"');     // \" -> "
      grokPattern = grokPattern.replace(/\x00/g, '\\');   // Restore single \

      const regexPattern = this.parseGrokPattern(grokPattern);

      return new RegExp(regexPattern);
    } catch (error) {
      console.error('Error parsing grok filter:', error);
      return null;
    }
  }

  /**
   * Parse raw log using the grok pattern
   */
  parseLog(rawLog: string, grokConfig: string): Record<string, any> | null {
    const regex = this.parseGrokFilter(grokConfig);
    
    if (!regex) {
      return null;
    }
    
    const match = rawLog.match(regex);
    
    if (!match || !match.groups) {
      return null;
    }
    
    return match.groups;
  }

  /**
   * Apply Logstash filters to the parsed data
   */
  applyFilters(parsed: Record<string, any>, filterConfig: string): Record<string, any> {
    const result = { ...parsed };
    
    // Parse date filter
    const dateMatch = filterConfig.match(/date\s*\{[^}]*match\s*=>\s*\["([^"]+)",\s*"([^"]+)"\]/);
    if (dateMatch) {
      const [, field, format] = dateMatch;
      if (result[field]) {
        // Convert timestamp (simplified)
        try {
          result['@timestamp'] = this.parseDate(result[field], format);
        } catch (e) {
          console.warn('Date parsing failed:', e);
        }
      }
    }
    
    // Parse mutate filter (remove_field)
    const removeFieldMatch = filterConfig.match(/remove_field\s*=>\s*\[([^\]]+)\]/);
    if (removeFieldMatch) {
      const fieldsToRemove = removeFieldMatch[1].match(/"([^"]+)"/g);
      if (fieldsToRemove) {
        fieldsToRemove.forEach(field => {
          const fieldName = field.replace(/"/g, '');
          delete result[fieldName];
        });
      }
    }
    
    return result;
  }

  /**
   * Parse a date string based on format
   */
  private parseDate(dateStr: string, format: string): string {
    // Simplified date parsing - in production you'd want a more robust solution
    // Format: dd/MMM/yyyy:HH:mm:ss Z -> ISO
    const datePattern = /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/;
    const match = dateStr.match(datePattern);
    
    if (match) {
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      
      const [, day, month, year, hour, minute, second, timezone] = match;
      const isoMonth = months[month] || '01';
      
      return `${year}-${isoMonth}-${day}T${hour}:${minute}:${second}${timezone || 'Z'}`;
    }
    
    return new Date().toISOString();
  }

  /**
   * Extract content between balanced braces
   */
  private extractBracedContent(text: string, keyword: string): string | null {
    const startMatch = text.match(new RegExp(`${keyword}\\s*\\{`));
    if (!startMatch) {
      return null;
    }

    const startIndex = startMatch.index! + startMatch[0].length;
    let braceCount = 1;
    let endIndex = startIndex;

    while (endIndex < text.length && braceCount > 0) {
      if (text[endIndex] === '{') {
        braceCount++;
      } else if (text[endIndex] === '}') {
        braceCount--;
      }
      endIndex++;
    }

    if (braceCount !== 0) {
      return null;
    }

    return text.substring(startIndex, endIndex - 1);
  }

  /**
   * Parse complete Logstash configuration
   */
  parseLogstashConfig(rawLog: string, logstashConfig: string): Record<string, any> | null {
    // Trim whitespace from inputs
    const trimmedLog = rawLog.trim();
    const trimmedConfig = logstashConfig.trim();

    // Extract filter section
    const filterSection = this.extractBracedContent(trimmedConfig, 'filter');

    if (!filterSection) {
      return null;
    }

    // Parse using grok
    const grokSection = this.extractBracedContent(filterSection, 'grok');
    let parsed: Record<string, any> | null = null;

    if (grokSection) {
      parsed = this.parseLog(trimmedLog, grokSection);
    }

    if (!parsed) {
      return null;
    }

    // Apply other filters
    const result = this.applyFilters(parsed, filterSection);

    return result;
  }
}

export default LogstashParser;

