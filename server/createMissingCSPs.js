import 'dotenv/config';
import { connectMongoDB } from './mongodb.js';
import { registerUser } from './auth.js';

const cspsToCreate = [
  { name: 'Joey', email: 'joey@zimworx.com', password: 'Welcome2026!' },
  { name: 'Mike', email: 'mike@zimworx.com', password: 'Welcome2026!' },
  { name: 'Brenda', email: 'brenda@zimworx.com', password: 'Welcome2026!' },
  { name: 'Petra', email: 'petra@zimworx.com', password: 'Welcome2026!' },
  { name: 'Kevin', email: 'kevin@zimworx.com', password: 'Welcome2026!' },
  { name: 'Sheoga', email: 'sheoga@zimworx.com', password: 'Welcome2026!' },
  { name: 'Sindiso', email: 'sindiso@zimworx.com', password: 'Welcome2026!' },
  { name: 'Nyasha', email: 'nyasha@zimworx.com', password: 'Welcome2026!' },
  { name: 'Samantha', email: 'samantha@zimworx.com', password: 'Welcome2026!' },
  { name: 'LorraineV', email: 'lorraine.v@zimworx.com', password: 'Welcome2026!' },
  { name: 'Rufaro', email: 'rufaro@zimworx.com', password: 'Welcome2026!' },
  { name: 'Chantelle', email: 'chantelle@zimworx.com', password: 'Welcome2026!' },
  { name: 'Gamu', email: 'gamu@zimworx.com', password: 'Welcome2026!' },
  { name: 'Chido', email: 'chido@zimworx.com', password: 'Welcome2026!' },
  { name: 'Tendayi', email: 'tendayi@zimworx.com', password: 'Welcome2026!' },
  { name: 'Bright', email: 'bright@zimworx.com', password: 'Welcome2026!' },
  { name: 'Kim', email: 'kim@zimworx.com', password: 'Welcome2026!' },
  { name: 'Emmanuel', email: 'emmanuel@zimworx.com', password: 'Welcome2026!' },
  { name: 'Wilfred', email: 'wilfred@zimworx.com', password: 'Welcome2026!' },
  { name: 'Lorraine Mupanguri', email: 'lorraine.m@zimworx.com', password: 'Welcome2026!' },
  { name: 'Sherone Nyasha', email: 'sherone@zimworx.com', password: 'Welcome2026!' },
  { name: 'Denzel', email: 'denzel@zimworx.com', password: 'Welcome2026!' },
  { name: 'MichaelD', email: 'michael.d@zimworx.com', password: 'Welcome2026!' },
  { name: 'Audrey', email: 'audrey@zimworx.com', password: 'Welcome2026!' },
  { name: 'Richard', email: 'richard@zimworx.com', password: 'Welcome2026!' },
  { name: 'Chengetai', email: 'chengetai@zimworx.com', password: 'Welcome2026!' },
  { name: 'Karol', email: 'karol@zimworx.com', password: 'Welcome2026!' }
];

async function createMissingCSPs() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectMongoDB();
    console.log('✅ Connected to MongoDB\n');

    console.log('➕ Creating missing CSP accounts...\n');

    let created = 0;
    for (const csp of cspsToCreate) {
      try {
        const result = await registerUser({
          name: csp.name,
          email: csp.email,
          password: csp.password,
          role: 'csp'
        });

        if (result) {
          console.log(`   ✅ Created: ${csp.name} (${csp.email})`);
          created++;
        } else {
          console.log(`   ⚠️  Exists: ${csp.name} (${csp.email})`);
        }
      } catch (error) {
        console.log(`   ❌ Error creating ${csp.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Created ${created} new CSP accounts`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createMissingCSPs();
