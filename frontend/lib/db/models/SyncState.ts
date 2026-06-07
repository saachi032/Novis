import mongoose from "mongoose";

const SyncStateSchema = new mongoose.Schema({
  contractName: {
    type: String,
    required: true,
    unique: true,
  },
  lastSyncedBlock: {
    type: Number,
    required: true,
    default: 0,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const SyncState =
  mongoose.models.SyncState || mongoose.model("SyncState", SyncStateSchema);
