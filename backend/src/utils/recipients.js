const { User, UserProperty } = require('../models');

// Who should be notified about a given property: its owner, plus any staff/accountant
// explicitly assigned to it.
const recipientsForProperty = async (property) => {
  const assignments = await UserProperty.findAll({ where: { propertyId: property.id } });
  const userIds = [property.ownerId, ...assignments.map((a) => a.userId)];
  return User.findAll({ where: { id: [...new Set(userIds)], status: 'active' } });
};

module.exports = { recipientsForProperty };
