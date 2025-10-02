import ReactMarkdown from 'react-markdown';

export default function MessageDisplay({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
      {isUser ? (
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        <ReactMarkdown
          components={{
            h2: (props) => (
              <h2 className="text-sm font-bold mt-2 mb-1" {...props} />
            ),
            h3: (props) => (
              <h3 className="text-sm font-semibold mt-1.5 mb-0.5" {...props} />
            ),
            ul: (props) => (
              <ul className="list-disc ml-5 my-1 space-y-0.5 text-sm" {...props} />
            ),
            ol: (props) => (
              <ol className="list-decimal ml-5 my-1 space-y-0.5 text-sm" {...props} />
            ),
            code: ({ inline, ...props }) =>
              inline ? (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm" {...props} />
              ) : (
                <code className="block bg-gray-900 text-white p-2 rounded my-1.5 text-sm" {...props} />
              ),
            p: (props) => (
              <p className="leading-relaxed text-sm" {...props} />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  );
}