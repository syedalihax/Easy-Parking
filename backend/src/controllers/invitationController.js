const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Membership = require('../models/Membership');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const createInvitation = async (req, res) => {
  const { parkingId, emailOrPhone, role } = req.body;

  if (
    typeof parkingId !== 'string' ||
    typeof emailOrPhone !== 'string' ||
    !emailOrPhone.trim() ||
    !role
  ) {
    return res.status(400).json({ message: 'parkingId, emailOrPhone, and role are required' });
  }

  if (!['owner', 'manager'].includes(role)) {
    return res.status(400).json({ message: 'Role must be owner or manager' });
  }

  try {
    const normalizedEmailOrPhone = emailOrPhone.trim();
    const invitation = await Invitation.create({
      parkingId,
      invitedBy: req.user.id,
      emailOrPhone: normalizedEmailOrPhone.includes('@')
        ? normalizedEmailOrPhone.toLowerCase()
        : normalizedEmailOrPhone,
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
  let session;

  try {
    session = await mongoose.startSession();
    let acceptedMembership;

    await session.withTransaction(async () => {
      const invitation = await Invitation.findById(id).session(session);

      if (!invitation) {
        const error = new Error('Invitation not found');
        error.status = 404;
        throw error;
      }

      if (invitation.status !== 'pending') {
        const error = new Error('This invitation is no longer pending');
        error.status = 400;
        throw error;
      }

      const invitationValue = invitation.emailOrPhone.trim();
      const userMatches =
        (req.user.email && req.user.email.trim().toLowerCase() === invitationValue.toLowerCase()) ||
        (req.user.phone && req.user.phone.trim() === invitationValue);

      if (!userMatches) {
        const error = new Error('This invitation is not for your account');
        error.status = 403;
        throw error;
      }

      acceptedMembership = await Membership.findOne({
        userId: req.user.id,
        parkingId: invitation.parkingId,
        status: 'active',
      }).session(session);

      if (!acceptedMembership) {
        [acceptedMembership] = await Membership.create(
          [{
            userId: req.user.id,
            parkingId: invitation.parkingId,
            role: invitation.role,
            status: 'active',
          }],
          { session },
        );
      }

      invitation.status = 'accepted';
      await invitation.save({ session });
    });

    return res.json({
      message: 'Invitation accepted',
      membership: {
        userId: req.user.id,
        parkingId: acceptedMembership.parkingId,
        role: acceptedMembership.role,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('Invitation acceptance failed:', error);
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({
        message: 'MongoDB transactions require a replica set. Configure local MongoDB as a replica set before accepting invitations.',
      });
    }

    return res.status(500).json({ message: 'Could not accept invitation' });
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  createInvitation,
  getPendingInvitations,
  acceptInvitation,
};
