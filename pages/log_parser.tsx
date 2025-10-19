import axios from 'axios';
import React, { useState } from 'react';
import { FileJson, Filter, FileText, Info } from 'lucide-react';

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
      "message" => "%{NOTSPACE:ident} %{IP:client_ip} \\[%{HTTPDATE:timestamp}\\] %{QS:http_request} %{NUMBER:response_code} %{NUMBER:bytes} %{NUMBER:response_time} %{NOTSPACE:dash} %{QS:referrer} %{QS:user_agent}"
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
  const [udmEvent, setUdmEvent] = useState<any>(null);
  const [parsedFields, setParsedFields] = useState<any>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle the form submission here
    try {
      onRequest();
      setLoading(true);
      (window as any).gtag('event', 'parse', {});
      const response = await axios.post('/api/parse-log', { rawLogEvent, parserCode });

      if (response.data.success) {
        const explanation = response.data.explanation;
        console.log('API response:', response.data);
        setUdmEvent(response.data.udm);
        setParsedFields(response.data.parsed);
        setLoading(false);
        onParse(explanation);
      } else {
        setLoading(false);
        setUdmEvent(null);
        setParsedFields(null);
        onParse(response.data.explanation || 'Failed to parse log');
      }
    } catch (error: any) {
      (window as any).gtag('event', 'error', {
        message: error.message || "Failed to perform API request"
      });
      console.error('Error making request:', error.message);
      setLoading(false);
      setUdmEvent(null);
      setParsedFields(null);
      onParse(error.response?.data?.explanation || `## Error\n\nAn error occurred: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 md:h-[80vh] flex flex-col">
      <h1 className="text-3xl text-gray-900 mb-6">Chronicle Log Parser</h1>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-1 min-h-0">
          {/* Section 1: Input JSON */}
          <div className="flex flex-col min-h-0">
            <label className='flex items-center gap-2 mb-2 text-gray-700 font-medium' htmlFor="raw-log-event">
              <FileJson className="w-5 h-5" />
              Raw Log Event
            </label>
            <textarea
              id="raw-log-event"
              className='flex-1 text-gray-900 w-full font-mono text-xs border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 resize-none overflow-auto'
              style={{ margin: '2px' }}
              value={rawLogEvent}
              onChange={(e) => setRawLogEvent(e.target.value)}
              placeholder="Paste your raw log event here..."
            />
          </div>

          {/* Section 2: Filter / Logstash Parsing Code */}
          <div className="flex flex-col min-h-0">
            <label className='flex items-center gap-2 mb-2 text-gray-700 font-medium' htmlFor="parser-code">
              <Filter className="w-5 h-5" />
              Logstash Parser Code
            </label>
            <textarea
              className='flex-1 text-gray-900 w-full font-mono text-xs border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 resize-none overflow-auto'
              style={{ margin: '2px' }}
              id="parser-code"
              value={parserCode}
              onChange={(e) => setParserCode(e.target.value)}
              placeholder="Enter your Logstash parser configuration..."
            />
          </div>

          {/* Section 3: UDM Event Structure Preview */}
          <div className="flex flex-col min-h-0">
            <div className='flex items-center justify-between mb-2'>
              <label className='flex items-center gap-2 text-gray-700 font-medium'>
                <FileText className="w-5 h-5" />
                Preview
              </label>
              {parsedFields && (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  title="View parsed fields"
                >
                  <Info className="w-4 h-4" />
                  Parsed Fields
                </button>
              )}
            </div>
            <div className='flex-1 w-full font-mono text-xs border border-gray-300 rounded-md p-3 bg-gray-50 text-gray-900 overflow-auto min-h-0' style={{ margin: '2px' }}>
              {isLoading ? (
                <span className="text-gray-500">Parsing...</span>
              ) : udmEvent ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(udmEvent, null, 2)}</pre>
              ) : (
                <span className="text-gray-500">Click &quot;Parse&quot; to see the result</span>
              )}
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md transition-colors duration-200"
          >
            { isLoading ? "Parsing..." : "Parse"}
          </button>

          <div className="flex flex-col text-right">
            <span className='text-sm text-gray-600 mb-1'>
              Powered by pure JavaScript Logstash parser with UDM mapping
            </span>
            <span className='text-xs text-gray-500'>
              Deterministic results based on your parser configuration
            </span>
          </div>
        </div>
      </form>

      {/* Modal Overlay for Parsed Fields */}
      {showModal && parsedFields && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Parsed Fields</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                title="Close"
              >
                &times;
              </button>
            </div>
            <div className="font-mono text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-4">
              <pre className="whitespace-pre-wrap">{JSON.stringify(parsedFields, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogParser;