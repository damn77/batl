// T113: Error Boundary for tournament rules pages
import React from 'react';
import { Alert, Button, Container } from 'react-bootstrap';

/**
 * Error Boundary component to catch and display React errors gracefully
 * Wraps tournament rules pages to prevent full app crashes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Optionally send error to logging service here
    // e.g., logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Optionally refresh the page or navigate back
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      return (
        <Container className="mt-5">
          <Alert variant="danger">
            <Alert.Heading>Oops! Something went wrong</Alert.Heading>
            <p>
              An unexpected error occurred while loading this page. This might be due to:
            </p>
            <ul>
              <li>A temporary technical issue</li>
              <li>Invalid data in the system</li>
              <li>Network connectivity problems</li>
            </ul>
            <hr />
            <div className="d-flex gap-2">
              <Button onClick={this.handleReset} variant="primary">
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="secondary">
                Go to Homepage
              </Button>
            </div>

            {/* Show error details in development mode */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3">
                <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <strong>Error Details (Development Mode)</strong>
                </summary>
                <pre className="mt-2 p-3 bg-light border rounded" style={{ fontSize: '0.85rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\nComponent Stack:\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </Alert>
        </Container>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
