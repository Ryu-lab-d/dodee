require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

// Bootstraps the first owner account. Run once with: npm run seed
const run = async () => {
  await sequelize.sync();

  const username = process.env.SEED_OWNER_USERNAME || 'owner';
  const password = process.env.SEED_OWNER_PASSWORD || 'owner1234';

  const existing = await User.findOne({ where: { username } });
  if (existing) {
    console.log(`User "${username}" already exists, skipping.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    username,
    password: hashed,
    name: 'เจ้าของกิจการ',
    role: 'owner',
    status: 'active',
  });

  console.log(`Created owner account -> username: ${username}, password: ${password}`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
