const Feedback = require('../models/feedback.model');
const { analyzeFeedback, getWeeklySummary } = require('../services/gemini.service');

// POST /api/feedback
const submitFeedback = async (req, res) => {
  try {
    const { title, description, category, submitterName, submitterEmail } = req.body;

    // Input sanitisation
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Missing required fields',
        message: 'Title, description and category are required',
      });
    }

    // Create and save feedback first
    const feedback = new Feedback({
      title: title.trim(),
      description: description.trim(),
      category,
      submitterName: submitterName?.trim(),
      submitterEmail: submitterEmail?.trim(),
    });

    await feedback.save();

    // Call Gemini AI (won't break submission if it fails)
    const aiResult = await analyzeFeedback(title, description);
    if (aiResult) {
      feedback.ai_category = aiResult.ai_category;
      feedback.ai_sentiment = aiResult.ai_sentiment;
      feedback.ai_priority = aiResult.ai_priority;
      feedback.ai_summary = aiResult.ai_summary;
      feedback.ai_tags = aiResult.ai_tags;
      feedback.ai_processed = true;
      await feedback.save();
    }

    return res.status(201).json({
      success: true,
      data: feedback,
      error: null,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('❌ Submit feedback error:', error.message);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to submit feedback',
    });
  }
};

// GET /api/feedback
const getAllFeedback = async (req, res) => {
  try {
    const { category, status, sort, search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { ai_summary: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {
      date: { createdAt: -1 },
      priority: { ai_priority: -1 },
      sentiment: { ai_sentiment: 1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data: {
        feedbacks,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      error: null,
      message: 'Feedback fetched successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to fetch feedback',
    });
  }
};

// GET /api/feedback/:id
const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Not found',
        message: 'Feedback not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: feedback,
      error: null,
      message: 'Feedback fetched successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to fetch feedback',
    });
  }
};

// PATCH /api/feedback/:id
const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['New', 'In Review', 'Resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid status',
        message: 'Status must be New, In Review, or Resolved',
      });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Not found',
        message: 'Feedback not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: feedback,
      error: null,
      message: 'Status updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to update status',
    });
  }
};

// DELETE /api/feedback/:id
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Not found',
        message: 'Feedback not found',
      });
    }
    return res.status(200).json({
      success: true,
      data: null,
      error: null,
      message: 'Feedback deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to delete feedback',
    });
  }
};

// GET /api/feedback/summary
const getAISummary = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeedback = await Feedback.find({
      createdAt: { $gte: sevenDaysAgo },
      ai_processed: true,
    }).limit(20);

    if (recentFeedback.length === 0) {
      return res.status(200).json({
        success: true,
        data: { message: 'No feedback in the last 7 days' },
        error: null,
        message: 'No recent feedback found',
      });
    }

    const summary = await getWeeklySummary(recentFeedback);
    return res.status(200).json({
      success: true,
      data: summary,
      error: null,
      message: 'Summary generated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to generate summary',
    });
  }
};

// POST /api/feedback/:id/reanalyze
const reanalyzeFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        data: null,
        error: 'Not found',
        message: 'Feedback not found',
      });
    }

    const aiResult = await analyzeFeedback(feedback.title, feedback.description);
    if (aiResult) {
      feedback.ai_category = aiResult.ai_category;
      feedback.ai_sentiment = aiResult.ai_sentiment;
      feedback.ai_priority = aiResult.ai_priority;
      feedback.ai_summary = aiResult.ai_summary;
      feedback.ai_tags = aiResult.ai_tags;
      feedback.ai_processed = true;
      await feedback.save();
    }

    return res.status(200).json({
      success: true,
      data: feedback,
      error: null,
      message: 'Feedback reanalyzed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      message: 'Failed to reanalyze feedback',
    });
  }
};

module.exports = {
  submitFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
  getAISummary,
  reanalyzeFeedback,
};