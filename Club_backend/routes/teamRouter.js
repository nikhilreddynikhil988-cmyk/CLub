import express from 'express';
import asyncHandler from 'express-async-handler';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { verifyToken, authorizeRole } from '../middleware/authMiddleware.js';
import upload from '../config/cloudinary.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
    const teams = await Team.find().populate('leader', 'username').populate('members', 'username').populate('pendingRequests', 'username');
    res.json(teams);
}));

router.post('/', verifyToken, upload.single('avatar'), asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.userId;

    const teamData = {
        name,
        description,
        leader: userId,
        members: [userId]
    };

    if (req.file) {
        teamData.avatar = req.file.path;
    }

    const newTeam = new Team(teamData);
    await newTeam.save();

    const populatedTeam = await Team.findById(newTeam._id).populate('leader', 'username').populate('members', 'username');
    res.status(201).json(populatedTeam);
}));

router.post('/:id/request-join', verifyToken, asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) {
        return res.status(404).json({ message: 'Team not found' });
    }

    const userId = req.user.userId;
    if (team.members.includes(userId)) {
        return res.status(400).json({ message: 'You are already a member of this team.' });
    }
    if (team.pendingRequests.includes(userId)) {
        return res.status(400).json({ message: 'You have already requested to join this team.' });
    }

    team.pendingRequests.push(userId);
    await team.save();

    const updatedTeam = await Team.findById(req.params.id).populate('leader', 'username').populate('members', 'username').populate('pendingRequests', 'username');
    res.json(updatedTeam);
}));

router.post('/:id/approve-request', verifyToken, asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) {
        return res.status(404).json({ message: 'Team not found' });
    }
    if (team.leader.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Only the team leader can approve requests.' });
    }

    const { userIdToApprove } = req.body;
    team.pendingRequests.pull(userIdToApprove);
    team.members.addToSet(userIdToApprove);
    await team.save();

    await User.findByIdAndUpdate(userIdToApprove, { $addToSet: { teams: team._id } });

    const updatedTeam = await Team.findById(req.params.id).populate('leader', 'username').populate('members', 'username').populate('pendingRequests', 'username');
    res.json(updatedTeam);
}));

router.post('/:id/reject-request', verifyToken, asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) {
        return res.status(404).json({ message: 'Team not found' });
    }
    if (team.leader.toString() !== req.user.userId) {
        return res.status(403).json({ message: 'Only the team leader can reject requests.' });
    }

    const { userIdToReject } = req.body;
    team.pendingRequests.pull(userIdToReject);
    await team.save();

    const updatedTeam = await Team.findById(req.params.id).populate('leader', 'username').populate('members', 'username').populate('pendingRequests', 'username');
    res.json(updatedTeam);
}));

router.delete('/:id', verifyToken, authorizeRole(['admin']), asyncHandler(async (req, res) => {
    const teamId = req.params.id;
    const deletedTeam = await Team.findByIdAndDelete(teamId);

    if (!deletedTeam) {
        return res.status(404).json({ message: 'Team not found' });
    }

    await User.updateMany(
        { teams: teamId },
        { $pull: { teams: teamId } }
    );

    res.json({ message: 'Team deleted successfully' });
}));

export default router;