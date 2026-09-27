const mongoose = require('mongoose');

const aiSuggestionSchema = new mongoose.Schema(
  {
    category: { type: String, default: null },
    priority: { type: String, default: null },
    department: { type: String, default: null },
    confidence: { type: Number, default: 0 }
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['IT Support', 'Maintenance', 'Electrical', 'Plumbing', 'Technical', 'Billing', 'Account', 'Hardware', 'Software', 'General', 'Network', 'Other'],
        message: '{VALUE} is not a valid category'
      },
      default: 'General'
    },
    department: {
      type: String,
      trim: true,
      default: 'General'
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    attachment: {
      type: String,
      default: null
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        message: '{VALUE} is not a valid priority'
      },
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        message: '{VALUE} is not a valid status'
      },
      default: 'PENDING',
      index: true
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    closedAt: {
      type: Date,
      default: null
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userSatisfaction: {
      type: String,
      enum: {
        values: ['SATISFIED', 'UNSATISFIED', null],
        message: '{VALUE} is not a valid satisfaction value'
      },
      default: null
    },
    reopenedReason: {
      type: String,
      trim: true,
      default: ''
    },
    adminReviewRequired: {
      type: Boolean,
      default: false,
      index: true
    },
    adminReviewReason: {
      type: String,
      trim: true,
      default: ''
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    flaggedAt: {
      type: Date,
      default: null
    },
    adminFollowUpRequired: {
      type: Boolean,
      default: false,
      index: true
    },
    adminFollowUpReason: {
      type: String,
      trim: true,
      default: ''
    },
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    adminFollowUpAt: {
      type: Date,
      default: null
    },
    adminNotes: {
      type: String,
      trim: true,
      default: ''
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ticket must belong to a user'],
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    aiCategory: {
      type: String,
      default: null
    },
    aiPriority: {
      type: String,
      default: null
    },
    aiSuggestion: {
      type: aiSuggestionSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Compound Indexes for fast dashboard filtering and chronological user history
ticketSchema.index({ status: 1, assignedTo: 1 });
ticketSchema.index({ createdBy: 1, createdAt: -1 });
ticketSchema.index({ adminReviewRequired: 1, createdAt: -1 });
ticketSchema.index({ adminFollowUpRequired: 1, createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
