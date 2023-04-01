![GitHub branch checks state](https://img.shields.io/github/checks-status/darrensapalo/chronicle-log-parser/main) ![GitHub](https://img.shields.io/github/license/darrensapalo/chronicle-log-parser) ![GitHub Repo stars](https://img.shields.io/github/stars/darrensapalo/chronicle-log-parser?style=social)

## Chronicle Log Parser

This webapp allows you to provide (1) a raw log, and (2) log parser code using [Logstash format](https://www.elastic.co/guide/en/logstash/current/advanced-pipeline.html).

This was built using [Next.js](https://nextjs.org/).

### Author's notes

I'm not really a security expert, or a logstash expert, but I've been trying to find a way to test logstash parsing code for raw logs, for parsing into Google Chronicle UDMs.

I don't work in this field but I spent somewhere around 2 hours to set this whole system up. I think the UDM parsing might still be incorrect (70% vibe that it's incorrect) but I think the prompt can be improved so that ChatGPT is taught about the UDM model.

### Limitations

⚠️ **This tool is powered by AI LLMs**, so do not use these as a source of truth. Use this tool as an **approximation/supporting tool** to improve your parser coding literacy. ⚠️ 

As this is powered by OpenAI's ChatGPT 3.5 (Turbo), this is not as powerful as ChatGPT 4's reasoning engine.

Given that, take it easy on the tool and ask it simple raw logs and parser code. Use it as a way to learn the Logstash format.

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

## Roadmap

1. Improvements on the prompt engineering - if we could include Chronicle Documentation about
the UDM schema definition, I think that will make sure the output of the AI tool will be updated.

## Licensing

[Apache License 2.0](./LICENSE.md).