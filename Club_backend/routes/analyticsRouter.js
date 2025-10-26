import express from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Event from '../models/Event.js';
import Team from '../models/Team.js';
import { verifyToken, authorizeRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', verifyToken, authorizeRole(['admin']), asyncHandler(async (req, res) => {
    const userCount = await User.countDocuments();
    const eventCount = await Event.countDocuments();
    const teamCount = await Team.countDocuments();

    const popularEventPipeline = [
        { $match: { approved: true } },
        {
            $project: {
                name: 1,
                registeredUsers: 1,
                registrationCount: { $size: "$registeredUsers" }
            }
        },
        { $sort: { registrationCount: -1 } },
        { $limit: 1 }
    ];
    const popularEvents = await Event.aggregate(popularEventPipeline);
    const popularEvent = popularEvents[0];

    res.json({
        users: { total: userCount },
        events: {
            total: eventCount,
            mostPopular: popularEvent ? { name: popularEvent.name, registrations: popularEvent.registrationCount } : null,
        },
        teams: { total: teamCount }
    });
}));

export default router;