![GitHub branch checks state](https://img.shields.io/github/checks-status/darrensapalo/chronicle-log-parser/main) ![GitHub](https://img.shields.io/github/license/darrensapalo/chronicle-log-parser) ![GitHub Repo stars](https://img.shields.io/github/stars/darrensapalo/chronicle-log-parser?style=social)

## Chronicle Log Parser

This webapp allows you to provide (1) a raw log, and (2) log parser code using [Logstash format](https://www.elastic.co/guide/en/logstash/current/advanced-pipeline.html), and it will parse the log and map it to the [Google Chronicle Unified Data Model (UDM)](https://cloud.google.com/chronicle/docs/reference/udm-field-list).

This was built using [Next.js](https://nextjs.org/) 15 and React 18.

### Features

✨ **Pure JavaScript Logstash Parser** - No AI dependencies, deterministic parsing using actual grok pattern matching
- Supports common grok patterns (IP, hostname, HTTP date, etc.)
- Parses Logstash filter configurations including grok, date, and mutate filters
- Named capture groups for field extraction

🎯 **UDM Mapping** - Automatically maps parsed log fields to Google Chronicle UDM format
- Maps to principal (source), target (destination), and network fields
- Infers event types based on parsed data
- Generates security results based on HTTP status codes
- Provides detailed mapping explanations

📊 **Interactive UI** - Test your Logstash parsers in real-time
- Pre-filled example log and parser configuration
- Immediate feedback on parsing results
- Formatted JSON output with syntax highlighting

### How It Works

1. **Grok Pattern Parsing**: The tool converts Logstash grok patterns to JavaScript regular expressions with named capture groups
2. **Field Extraction**: Applies the regex to your raw log to extract fields
3. **Filter Application**: Applies date parsing and field mutations as defined in your Logstash config
4. **UDM Mapping**: Maps extracted fields to the appropriate UDM schema fields
5. **Explanation Generation**: Provides detailed breakdown of the parsing and mapping process

### Author's notes

This tool now uses a custom pure-JavaScript implementation of Logstash parsing instead of relying on AI. The parsing is deterministic and based on the actual grok patterns you provide. The UDM mapping follows Google Chronicle's official schema documentation.

### Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Bug reports

I'm open to feedback, and I will improve this over time. Please submit GitHub issues if you find some issues.

## Contributing

If you want to contribute examples, see `public/content/samples.json`. These can later be options that Chronicle log parsers can use on the parser simulator for study purposes.

## Architecture

The application consists of three main components:

1. **LogstashParser** (`lib/logstash-parser.ts`): Parses Logstash grok patterns and applies filters
2. **UDMMapper** (`lib/udm-mapper.ts`): Maps parsed fields to Google Chronicle UDM schema
3. **API Endpoint** (`pages/api/parse-log.ts`): Orchestrates parsing and mapping

## Roadmap

1. ✅ Replace AI-based parsing with actual Logstash implementation
2. ✅ Implement UDM mapping based on official Chronicle documentation
3. 🔄 Add support for more grok patterns
4. 🔄 Support additional Logstash filters (json, csv, etc.)
5. 🔄 Add validation for UDM schema compliance
6. 🔄 Support custom grok pattern definitions

## Licensing

[Apache License 2.0](./LICENSE.md).