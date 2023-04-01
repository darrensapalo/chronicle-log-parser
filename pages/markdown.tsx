// Markdown.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  content: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  return <ReactMarkdown>{content}</ReactMarkdown>;
};

export default Markdown;