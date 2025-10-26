import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  description: String,
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  avatar: { type: String },
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);

export default Team;
