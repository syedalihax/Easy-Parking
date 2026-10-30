const mongoose = require('mongoose');
const Parking = require('../models/Parking');
const Membership = require('../models/Membership');

const createParking = async (req, res) => {
  const { name, address, contactInfo } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Parking name is required' });
  }

  const session = await mongoose.startSession();

  try {
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
    return res.status(500).json({ message: 'Could not create parking' });
  } finally {
    session.endSession();
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
    return res.status(500).json({ message: 'Could not load parkings' });
  }
};

module.exports = {
  createParking,
  getMyParkings,
};
