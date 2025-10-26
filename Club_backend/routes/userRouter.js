import express from "express";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Event from '../models/Event.js';
import upload from '../config/cloudinary.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();
 
router.post('/register', asyncHandler(async (req, res) => {
    const { username, password, email } = req.body;
 
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
 
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
    });

   
    await newUser.save();
 
    res.status(201).json({ message: 'User registered successfully' });
}));
 
router.post('/login', asyncHandler(async (req, res) => {
    const { username, password } = req.body;
 
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
 
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Don't send the password back, even if it's hashed
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      teams: user.teams,
      avatar: user.avatar
    };

    res.json({ message: 'Logged in successfully', token, user: userResponse });
}));

router.put('/profile/photo', verifyToken, upload.single('avatar'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }
 
    const user = await User.findById(req.user.userId);
    user.avatar = req.file.path; 
    await user.save();
 
    // Return only the necessary fields
    res.json({ message: 'Profile photo updated successfully.', avatar: user.avatar });
}));
 
router.get('/profile/me', verifyToken, asyncHandler(async (req, res) => {
    const userProfile = await User.findById(req.user.userId)
      .select('-password')
      .populate('teams', 'name description avatar');
 
    if (!userProfile) {
      return res.status(404).json({ message: 'User not found.' });
    }
 
    const registeredEvents = await Event.find({ registeredUsers: req.user.userId, approved: true }, 'name date description');

    res.json({ userProfile, registeredEvents });
}));

export default router;
