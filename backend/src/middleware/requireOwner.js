const requireOwnerRole = (req, res, next) => {
  if (!req.membership || req.membership.role !== 'owner') {
    return res.status(403).json({ message: 'Owner access required' });
  }

  return next();
};

module.exports = requireOwnerRole;
