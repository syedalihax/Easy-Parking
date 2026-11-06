const mongoose = require('mongoose');
const Parking = require('../models/Parking');
const Membership = require('../models/Membership');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const createParking = async (req, res) => {
  const { name, address, contactInfo } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Parking name is required' });
  }

  let session;

  try {
    session = await mongoose.startSession();
    let createdParking;

    await session.withTransaction(async () => {
      createdParking = await Parking.create(
        [{
          name: name.trim(),
          address: address || '',
          contactInfo: contactInfo || '',
          createdBy: req.user.id,
        }],
        { session },
      );

      await Membership.create(
        [{
          userId: req.user.id,
          parkingId: createdParking[0]._id,
          role: 'owner',
          status: 'active',
        }],
        { session },
      );
    });

    return res.status(201).json({
      parking: createdParking[0],
      membership: {
        userId: req.user.id,
        parkingId: createdParking[0]._id,
        role: 'owner',
      },
    });
  } catch (error) {
    console.error('Parking creation failed:', error);
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({
        message: 'MongoDB transactions require a replica set. Configure local MongoDB as a replica set before creating a parking.',
      });
    }

    return res.status(500).json({ message: 'Could not create parking' });
  } finally {
    if (session) await session.endSession();
  }
};

const getMyParkings = async (req, res) => {
  try {
    const memberships = await Membership.find({
      userId: req.user.id,
      status: 'active',
    }).populate('parkingId').lean();

    const parkings = memberships.map((membership) => ({
      _id: membership.parkingId._id,
      name: membership.parkingId.name,
      address: membership.parkingId.address,
      contactInfo: membership.parkingId.contactInfo,
      role: membership.role,
    }));

    return res.json({ parkings });
  } catch (error) {
    console.error('Parking list failed:', error);
    return res.status(500).json({ message: 'Could not load parkings' });
  }
};

// Owners can correct the parking's own details; everything else about a parking
// is data, not settings, so this stays deliberately small.
const updateParking = async (req, res) => {
  const { name, address, contactInfo } = req.body;
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Parking name cannot be empty' });
    }
    if (name.trim().length > 80) {
      return res.status(400).json({ message: 'Parking name must be 80 characters or fewer' });
    }
    updates.name = name.trim();
  }

  if (address !== undefined) {
    if (typeof address !== 'string' || address.length > 200) {
      return res.status(400).json({ message: 'Address must be 200 characters or fewer' });
    }
    updates.address = address.trim();
  }

  if (contactInfo !== undefined) {
    if (typeof contactInfo !== 'string' || contactInfo.length > 80) {
      return res.status(400).json({ message: 'Contact information must be 80 characters or fewer' });
    }
    updates.contactInfo = contactInfo.trim();
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  try {
    const parking = await Parking.findByIdAndUpdate(
      req.params.parkingId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).lean();

    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json({ parking });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid parking ID' });
    console.error('Parking update failed:', error);
    return res.status(500).json({ message: 'Could not update parking' });
  }
};

module.exports = {
  createParking,
  getMyParkings,
  updateParking,
};
