const Membership = require('../models/Membership');

const requireParkingMembership = async (req, res, next) => {
  const parkingId = req.params.parkingId || req.body.parkingId || req.query.parkingId;

  if (!parkingId) {
    return res.status(400).json({ message: 'parkingId is required' });
  }

  try {
    const membership = await Membership.findOne({
      userId: req.user.id,
      parkingId,
      status: 'active',
    }).lean();

    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this parking' });
    }

    req.membership = {
      parkingId,
      role: membership.role,
    };

    return next();
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid parking ID' });
    }

    return res.status(500).json({ message: 'Could not verify parking membership' });
  }
};

module.exports = requireParkingMembership;
