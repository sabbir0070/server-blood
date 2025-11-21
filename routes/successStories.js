// backend/routes/successStories.js
const express = require('express');
const router = express.Router();
const SuccessStory = require('../models/SuccessStory');
const { authenticate, optionalAuth } = require('../middleware/auth');

// GET /api/success-stories - Get all stories
router.get('/', async (req, res) => {
  try {
    const stories = await SuccessStory.find().sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories - Create new story
router.post('/', optionalAuth, async (req, res) => {
  try {
    // If user is authenticated, use their info from DB
    if (req.user) {
      req.body.userId = req.user._id.toString();
      req.body.userName = req.user.name;
      req.body.userEmail = req.user.email;
      req.body.userPhone = req.user.phone || '';
      req.body.userAvatar = req.user.avatar || '';
    }
    
    // Initialize reactions
    req.body.reactions = {
      like: [],
      love: [],
      care: [],
      haha: [],
      wow: [],
      sad: [],
      angry: []
    };
    
    const story = new SuccessStory(req.body);
    await story.save();
    res.json({ success: true, message: 'Story created successfully', story });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/success-stories/:id - Update story
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check authorization - ONLY owner can update, admin cannot update others' stories
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const isOwner = story.userId === req.user._id.toString();
    
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'You can only edit your own stories' });
    }

    // Update story fields (exclude reactions and comments)
    const allowedFields = ['name', 'location', 'story', 'bloodGroup'];
    allowedFields.forEach(key => {
      if (req.body[key] !== undefined) {
        story[key] = req.body[key];
      }
    });
    story.updatedAt = Date.now();

    await story.save();
    res.json({ success: true, message: 'Story updated successfully', story });
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/success-stories/:id - Delete story
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check authorization - owner can delete own story, admin can delete any
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = story.userId === req.user._id.toString();
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only delete your own stories.' });
    }

    await SuccessStory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories/:id/react - Add/Remove reaction
router.post('/:id/react', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const { reactionType } = req.body; // like, love, care, haha, wow, sad, angry
    const userId = req.user._id.toString();

    if (!['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'].includes(reactionType)) {
      return res.status(400).json({ success: false, message: 'Invalid reaction type' });
    }

    // Initialize reactions if not exists
    if (!story.reactions) {
      story.reactions = { like: [], love: [], care: [], haha: [], wow: [], sad: [], angry: [] };
    }

    // Remove user from all reactions first
    Object.keys(story.reactions).forEach(key => {
      story.reactions[key] = story.reactions[key].filter(id => id !== userId);
    });

    // Check if user already reacted with this type
    const hasReacted = story.reactions[reactionType].includes(userId);
    
    if (!hasReacted) {
      // Add reaction
      story.reactions[reactionType].push(userId);
    }

    await story.save();
    res.json({ success: true, message: hasReacted ? 'Reaction removed' : 'Reaction added', story });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories/:id/comments - Add comment
router.post('/:id/comments', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const newComment = {
      userId: req.user._id.toString(),
      userName: req.user.name,
      userEmail: req.user.email,
      userAvatar: req.user.avatar || '',
      comment: comment.trim()
    };

    story.comments.push(newComment);
    await story.save();

    res.json({ success: true, message: 'Comment added successfully', comment: story.comments[story.comments.length - 1] });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/success-stories/:id/comments/:commentId - Update comment
router.put('/:id/comments/:commentId', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const comment = story.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only comment owner can update
    if (comment.userId !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments' });
    }

    const { comment: commentText } = req.body;
    if (!commentText || !commentText.trim()) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    comment.comment = commentText.trim();
    comment.updatedAt = Date.now();
    await story.save();

    res.json({ success: true, message: 'Comment updated successfully', comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/success-stories/:id/comments/:commentId - Delete comment
router.delete('/:id/comments/:commentId', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const comment = story.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Comment owner or admin can delete
    const isAdmin = req.user.role === 'admin';
    const isOwner = comment.userId === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    story.comments.pull(req.params.commentId);
    await story.save();

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories/:id/comments/:commentId/like - Like/Unlike comment
router.post('/:id/comments/:commentId/like', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const comment = story.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    
    // Initialize likes array if not exists
    if (!comment.likes) {
      comment.likes = [];
    }

    const hasLiked = comment.likes.includes(userId);
    
    if (hasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id !== userId);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await story.save();
    res.json({ success: true, message: hasLiked ? 'Comment unliked' : 'Comment liked', comment });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories/:id/comments/:commentId/replies - Add reply to comment
router.post('/:id/comments/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const comment = story.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Reply is required' });
    }

    // Initialize replies array if not exists
    if (!comment.replies) {
      comment.replies = [];
    }

    const newReply = {
      userId: req.user._id.toString(),
      userName: req.user.name,
      userEmail: req.user.email,
      userAvatar: req.user.avatar || '',
      reply: reply.trim(),
      likes: []
    };

    comment.replies.push(newReply);
    await story.save();

    res.json({ success: true, message: 'Reply added successfully', reply: comment.replies[comment.replies.length - 1] });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/success-stories/:id/comments/:commentId/replies/:replyId/like - Like/Unlike reply
router.post('/:id/comments/:commentId/replies/:replyId/like', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const story = await SuccessStory.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const comment = story.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const userId = req.user._id.toString();
    
    // Initialize likes array if not exists
    if (!reply.likes) {
      reply.likes = [];
    }

    const hasLiked = reply.likes.includes(userId);
    
    if (hasLiked) {
      // Unlike
      reply.likes = reply.likes.filter(id => id !== userId);
    } else {
      // Like
      reply.likes.push(userId);
    }

    await story.save();
    res.json({ success: true, message: hasLiked ? 'Reply unliked' : 'Reply liked', reply });
  } catch (error) {
    console.error('Error liking reply:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

