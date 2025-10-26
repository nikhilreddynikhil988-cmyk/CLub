import express from 'express';
import asyncHandler from 'express-async-handler';
import Event from '../models/Event.js';
import { verifyToken, authorizeRole } from '../middleware/authMiddleware.js';
import upload from '../config/cloudinary.js';

const router = express.Router();

router.post('/', verifyToken, asyncHandler(async (req, res) => {
    const newEvent = new Event({
        ...req.body,
        organizers: [req.user.userId]
    });
    await newEvent.save();
    res.status(201).json(newEvent);
}));

router.get('/', asyncHandler(async (req, res) => {
    const events = await Event.find().populate('organizers', 'username');
    res.json(events);
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
}));

router.post('/:id/vote', verifyToken, asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    const userId = req.user.userId;
    if (event.votedBy.includes(userId)) {
        return res.status(400).json({ message: 'You have already voted for this event.' });
    }

    event.votedBy.push(userId);
    event.votes += 1;
    await event.save();
    res.json(event);
}));

router.patch('/:id/approve', verifyToken, authorizeRole(['admin']), asyncHandler(async (req, res) => {
    const event = await Event.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event approved successfully', event });
}));

router.post('/:id/register', verifyToken, asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }
    if (!event.approved) {
        return res.status(400).json({ message: 'This event is not yet approved for registration.' });
    }

    const userId = req.user.userId;
    if (event.registeredUsers.includes(userId)) {
        return res.status(400).json({ message: 'You are already registered for this event.' });
    }

    event.registeredUsers.push(userId);
    await event.save();
    res.json({ message: 'Successfully registered for the event.', event });
}));

router.get('/:id/registrants', verifyToken, authorizeRole(['admin']), asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id).populate('registeredUsers', 'username email');
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event.registeredUsers);
}));

router.delete('/:id', verifyToken, authorizeRole(['admin']), asyncHandler(async (req, res) => {
    const deletedEvent = await Event.findByIdAndDelete(req.params.id);
    if (!deletedEvent) {
        return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
}));

router.post('/:id/complete', verifyToken, upload.array('photos', 5), asyncHandler(async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return res.status(404).json({ message: 'Event not found' });
    }

    const userId = req.user.userId;
    const userIsOrganizer = event.organizers.some(orgId => orgId.toString() === userId);
    const userIsAdmin = req.user.role === 'admin';

    if (!userIsOrganizer && !userIsAdmin) {
        return res.status(403).json({ message: 'Only the event organizer or an admin can update this event.' });
    }

    const { winnerName, postEventDescription } = req.body;
    event.winnerName = winnerName || event.winnerName;
    event.postEventDescription = postEventDescription || event.postEventDescription;

    if (req.files) {
        const photoUrls = req.files.map(file => file.path);
        event.photos.push(...photoUrls);
    }

    await event.save();
    res.json(event);
}));

export default router;