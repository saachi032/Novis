import mongoose from "mongoose";

const OnChainEventSchema = new mongoose.Schema({
  // e.g. UserFundsInvested, UserFundsRedeemed, UserRebalanced
  eventName: {
    type: String,
    required: true,
    index: true,
  },
  // The contract that emitted it
  contractAddress: {
    type: String,
    required: true,
  },
  // Usually the user's wallet address. Indexed for fast lookup.
  userAddress: {
    type: String,
    required: true,
    index: true,
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true, // Prevents duplicate events
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  // Dynamic JSON payload for event arguments
  // E.g. { assets: "1000", aaveAmount: "500", ... }
  args: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to quickly fetch a specific user's history ordered by time
OnChainEventSchema.index({ userAddress: 1, blockNumber: -1 });

export const OnChainEvent =
  mongoose.models.OnChainEvent ||
  mongoose.model("OnChainEvent", OnChainEventSchema);
