/**
 * Error handling utilities for Netlify Functions
 */

/**
 * Get allowed CORS origin based on request origin
 */
function getAllowedOrigin(requestOrigin) {
  // In development, allow both Vite and Netlify dev ports
  const allowedOrigins = [
    'http://localhost:5174',
    'http://localhost:8888',
    process.env.URL
  ].filter(Boolean);

  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default to URL env var or wildcard
  return process.env.URL || '*';
}

/**
 * Standard error response format
 */
export function errorResponse(statusCode, message, details = null, requestOrigin = null) {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
      'Access-Control-Allow-Credentials': 'true'
    },
    body: JSON.stringify({
      error: message,
      ...(details && { details })
    })
  };

  return response;
}

/**
 * Success response format
 */
export function successResponse(data, statusCode = 200, additionalHeaders = {}, requestOrigin = null) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
      'Access-Control-Allow-Credentials': 'true',
      ...additionalHeaders
    },
    body: JSON.stringify(data)
  };
}

/**
 * CORS preflight response
 */
export function corsResponse(requestOrigin = null) {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': getAllowedOrigin(requestOrigin),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    },
    body: ''
  };
}

/**
 * Handle errors consistently
 */
export function handleError(error) {
  console.error('Function error:', error);

  // Authentication errors
  if (error.message.includes('Authentication failed') ||
      error.message.includes('Token expired') ||
      error.message.includes('Invalid token')) {
    return errorResponse(401, error.message);
  }

  // Validation errors
  if (error.message.includes('Missing required') ||
      error.message.includes('Invalid')) {
    return errorResponse(400, error.message);
  }

  // Database errors
  if (error.message.includes('Database error')) {
    return errorResponse(500, 'Internal server error');
  }

  // Generic error
  return errorResponse(500, 'Internal server error');
}

/**
 * Validate required fields in request body
 */
export function validateRequired(body, requiredFields) {
  const missing = requiredFields.filter(field => !body[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}
