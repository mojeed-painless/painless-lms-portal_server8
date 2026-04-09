import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

// --- 1. Middleware to protect routes (Authentication) ---
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user.isApproved) {
          res.status(403);
          throw new Error('Account pending approval. Access denied.');
      }
      
      return next();
    } catch (error) {
      console.error(error);
      res.status(401);
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired, please login again');
      } else {
        throw new Error('Not authorized, token failed');
      }
    }
  }

  // Support X-User-ID header for frontend without authentication
  if (req.headers['x-user-id']) {
    try {
      const userId = req.headers['x-user-id'];

      if (!userId || userId.trim() === '') {
        res.status(400);
        throw new Error('Invalid X-User-ID header');
      }

      // Try to find user by ID
      req.user = await User.findById(userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('User not found with provided X-User-ID');
      }

      if (!req.user.isApproved) {
          res.status(403);
          throw new Error('Account pending approval. Access denied.');
      }

      return next();
    } catch (error) {
      console.error('X-User-ID Auth Error:', error.message);
      res.status(401);
      throw new Error('Not authorized, invalid X-User-ID');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});







// --- 2. Middleware for specific role check (Authorization) ---
const instructor = (req, res, next) => {

  if (req.user && req.user.role === 'instructor') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an instructor');
  }
};







// --- 3. Middleware for admin role check (Authorization) ---
const admin = (req, res, next) => {

  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an administrator');
  }
};

export { protect, instructor, admin };