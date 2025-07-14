import React from 'react';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="error-boundary">
      <h2>🚨 Something went wrong</h2>
      <p>We encountered an error while running the application.</p>
      
      <details className="error-details">
        <summary>Error Details</summary>
        <pre>{error.message}</pre>
        {error.stack && (
          <pre className="error-stack">{error.stack}</pre>
        )}
      </details>
      
      <div className="error-actions">
        <button 
          className="btn btn-primary"
          onClick={resetErrorBoundary}
        >
          🔄 Try Again
        </button>
        
        <button 
          className="btn btn-outline"
          onClick={() => window.location.reload()}
        >
          🔃 Reload Page
        </button>
      </div>
    </div>
  );
};

export default ErrorFallback;
