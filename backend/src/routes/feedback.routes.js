const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getAISummary,
  reanalyzeFeedback,
} = require('../controllers/feedback.controller');
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// Rate limiting — max 5 submissions per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    data: null,
    error: 'Too many requests',
    message: 'You can only submit 5 feedbacks per hour',
  },
});

// Public routes
router.post('/', submitLimiter, submitFeedback);

// Admin protected routes
router.get('/summary', protect, getAISummary);
router.get('/', protect, getAllFeedback);
router.get('/:id', protect, getFeedbackById);
router.patch('/:id', protect, updateFeedbackStatus);
router.delete('/:id', protect, deleteFeedback);
router.post('/:id/reanalyze', protect, reanalyzeFeedback);

module.exports = router;