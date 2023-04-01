import axios from 'axios';
import { marked } from 'marked';
import React, { useState } from 'react';

interface LogParserProps {
  onParse: (msg: string) => void;
  onRequest: () => void;
}

const LogParser: React.FC<LogParserProps> = ({ onParse, onRequest }) => {
  const [isLoading, setLoading] = useState<boolean>(false);
  const [rawLogEvent, setRawLogEvent] = useState(`_ 127.0.0.1 [24/Apr/2017:21:22:23 -0700] "GET / HTTP/1.1" 200 654 0.000 - "-" "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:53.0) Gecko/20100101 Firefox/53.0"`);
  const [parserCode, setParserCode] = useState(`input {
    file {
        path => "/var/log/nginx/access.log"
    }
}
filter {
  grok {
    match => {
      "message" => "%{IPORHOST:client_ip} \[%{HTTPDATE:timestamp}\] \"%{WORD:http_method} %{DATA:request} HTTP/%{NUMBER:http_version}\" %{NUMBER:response_code} %{NUMBER:response_size} %{NUMBER:response_time} %{QS:user_agent}"
    }
  }
  date {
    match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
    target => "@timestamp"
  }
  mutate {
    remove_field => ["message", "timestamp"]
  }
}
output {
    stdout { codec => rubydebug }
}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle the form submission here
    try {
      onRequest();
      setLoading(true);
      const response = await axios.post('/api/openai-api', { rawLogEvent, parserCode });
      const content = response.data.choices[0]?.message?.content;
      console.log('API response:', content);
      setLoading(false);
      onParse(content);
    } catch (error) {
      console.error('Error making request:', (error as any).message);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRawLogEvent('');
    setParserCode('');
  }

  const buttonStyle = 'cursor-pointer p-2 mr-2 rounded-lg border-solid border-2 border-gray-700 bg-gray-950	w-40 ';
  const buttonStyleLoading = 'cursor-pointer p-2 mr-2 rounded-lg border-solid border-1 border-gray-700 bg-gray-700 text-gray-400 w-40 ';

  return (
    <div>
      <h1 className="text-3xl">Chronicle Log Parser</h1>
      <form onSubmit={handleSubmit} onReset={handleReset}>

        <div>
          <label className='flex my-2' htmlFor="raw-log-event">Raw log event:</label>
          <textarea
            id="raw-log-event"
            className='text-black w-full font-mono text-xs'
            value={rawLogEvent}
            onChange={(e) => setRawLogEvent(e.target.value)}
            rows={parseInt("10")}
            cols={parseInt("50")}
          />
        </div>
        <div>
          <label className='flex my-2' htmlFor="parser-code">Parser code:</label>
          <textarea
            className='text-black w-full font-mono text-xs'
            id="parser-code"
            value={parserCode}
            onChange={(e) => setParserCode(e.target.value)}
            rows={parseInt("15")}
            cols={parseInt("50")}
          />
        </div>
        <div className='my-4'>
          <button type="submit" disabled={isLoading} className={isLoading ? buttonStyleLoading : buttonStyle}>{ isLoading ? "Loading..." : "Simulate parsing"}</button>
          <input type="reset" hidden={isLoading} disabled={isLoading} className={isLoading ? buttonStyleLoading : buttonStyle} value="Reset" />
          
        </div>
        <span className='text-xs italic mb-8'>
            Powered by ChatGPT 3.5 (Turbo).
          </span>
      </form>
    </div>
  );
};

export default LogParser;