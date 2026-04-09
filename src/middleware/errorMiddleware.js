// lms-backend/src/middleware/errorMiddleware.js

// Middleware to handle 404 (Not Found) errors
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error); // Pass the error to the next middleware (errorHandler)
};

// Generic error handling middleware
const errorHandler = (err, req, res, next) => {
  // Sometimes Express returns 200 even on error, so we force it to a 500 or use the existing status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode; 
  res.status(statusCode);
  res.json({
    message: err.message,
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };