import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'teamLeader'],
    default: 'member'
  },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }], 
  avatar: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
