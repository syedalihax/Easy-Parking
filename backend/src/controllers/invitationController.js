const Invitation = require('../models/Invitation');
const Membership = require('../models/Membership');

const createInvitation = async (req, res) => {
  const { parkingId, emailOrPhone, role } = req.body;

  if (!parkingId || !emailOrPhone || !role) {
    return res.status(400).json({ message: 'parkingId, emailOrPhone, and role are required' });
  }

  if (!['owner', 'manager'].includes(role)) {
    return res.status(400).json({ message: 'Role must be owner or manager' });
  }

  try {
    const invitation = await Invitation.create({
      parkingId,
      invitedBy: req.user.id,
      emailOrPhone: emailOrPhone.trim(),
      role,
      status: 'pending',
    });

    return res.status(201).json({ invitation });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create invitation' });
  }
};

const getPendingInvitations = async (req, res) => {
  try {
    const query = [];

    if (req.user.email) {
      query.push({ emailOrPhone: req.user.email.trim().toLowerCase() });
    }

    if (req.user.phone) {
      query.push({ emailOrPhone: req.user.phone.trim() });
    }

    if (query.length === 0) {
      return res.json({ invitations: [] });
    }

    const invitations = await Invitation.find({
      status: 'pending',
      $or: query,
    }).populate('parkingId', 'name').sort({ createdAt: -1 }).lean();

    return res.json({ invitations });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch pending invitations' });
  }
};

const acceptInvitation = async (req, res) => {
  const { id } = req.params;

  try {
    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: 'This invitation is no longer pending' });
    }

    const invitationValue = invitation.emailOrPhone.trim();
    const userMatches =
      (req.user.email && req.user.email.trim().toLowerCase() === invitationValue.toLowerCase()) ||
      (req.user.phone && req.user.phone.trim() === invitationValue);

    if (!userMatches) {
      return res.status(403).json({ message: 'This invitation is not for your account' });
    }

    const existingMembership = await Membership.findOne({
      userId: req.user.id,
      parkingId: invitation.parkingId,
      status: 'active',
    });

    if (!existingMembership) {
      await Membership.create({
        userId: req.user.id,
        parkingId: invitation.parkingId,
        role: invitation.role,
        status: 'active',
      });
    }

    invitation.status = 'accepted';
    await invitation.save();

    return res.json({
      message: 'Invitation accepted',
      membership: {
        userId: req.user.id,
        parkingId: invitation.parkingId,
        role: invitation.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not accept invitation' });
  }
};

module.exports = {
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
};
