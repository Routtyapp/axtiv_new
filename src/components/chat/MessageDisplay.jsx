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
              <h2 className="text-xl font-bold mt-4 mb-2" {...props} />
            ),
            h3: (props) => (
              <h3 className="text-lg font-semibold mt-3 mb-2" {...props} />
            ),
            ul: (props) => (
              <ul className="list-disc ml-5 my-2 space-y-1" {...props} />
            ),
            ol: (props) => (
              <ol className="list-decimal ml-5 my-2 space-y-1" {...props} />
            ),
            code: ({ inline, ...props }) =>
              inline ? (
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm" {...props} />
              ) : (
                <code className="block bg-gray-900 text-white p-3 rounded my-2" {...props} />
              ),
            p: (props) => (
              <p className="my-2 leading-relaxed" {...props} />
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      )}
    </div>
  );
}