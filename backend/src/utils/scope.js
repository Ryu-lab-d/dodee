const { Property, UserProperty } = require('../models');

// Owners see every property they own; staff/accountant see only properties assigned to them.
const getAccessiblePropertyIds = async (user) => {
  if (user.role === 'owner') {
    const properties = await Property.findAll({ where: { ownerId: user.id }, attributes: ['id'] });
    return properties.map((p) => p.id);
  }
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return assignments.map((a) => a.propertyId);
};

const canAccessProperty = async (user, propertyId) => {
  if (!propertyId) return false;
  const ids = await getAccessiblePropertyIds(user);
  return ids.includes(propertyId);
};

module.exports = { getAccessiblePropertyIds, canAccessProperty };
