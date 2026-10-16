require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

(async () => {
  if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error('Missing JWT_SECRET or MONGO_URI in environment');
    process.exit(1);
  }
  await connectDB();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
})().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
