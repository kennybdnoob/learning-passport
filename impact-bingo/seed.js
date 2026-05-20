const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./serviceAccountKey.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const criteria = [
  { id: 1,  theme: 'Born With',    criteria: 'Has a name that contains the letter K',                         shortLabel: 'Name contains K' },
  { id: 2,  theme: 'Born With',    criteria: 'Born in a different country than they currently work',           shortLabel: 'Born in another country' },
  { id: 3,  theme: 'Born With',    criteria: 'Naturally left-handed',                                         shortLabel: 'Left-handed' },
  { id: 4,  theme: 'Born With',    criteria: 'Has naturally curly hair',                                      shortLabel: 'Naturally curly hair' },
  { id: 5,  theme: 'Learnt Skills',criteria: 'Facilitates learning or brainstorming using bricks',            shortLabel: 'Facilitates with bricks' },
  { id: 6,  theme: 'Learnt Skills',criteria: 'Speaks 3 or more languages fluently',                           shortLabel: 'Speaks 3+ languages' },
  { id: 7,  theme: 'Learnt Skills',criteria: 'Uses Generative AI to design workflows or prompts',             shortLabel: 'Uses GenAI for workflows' },
  { id: 8,  theme: 'Learnt Skills',criteria: 'Mastered a musical instrument',                                 shortLabel: 'Mastered an instrument' },
  { id: 9,  theme: 'Achievement',  criteria: 'Delivered a project that resulted in organization-wide impact', shortLabel: 'Org-wide project impact' },
  { id: 10, theme: 'Achievement',  criteria: 'Successfully mentored someone into a leadership role',          shortLabel: 'Mentored a leader' },
  { id: 11, theme: 'Achievement',  criteria: 'Solved a critical crisis using only the resources in the room',shortLabel: 'Solved crisis on the spot' },
  { id: 12, theme: 'Achievement',  criteria: 'Volunteered for a major community project',                     shortLabel: 'Major community volunteer' },
  { id: 13, theme: 'Recognition',  criteria: 'Known by peers as the "Creative Problem Solver"',              shortLabel: 'The Creative Problem Solver' },
  { id: 14, theme: 'Recognition',  criteria: 'Recognized for bringing out the best strengths in others',     shortLabel: 'Brings out others\' best' },
  { id: 15, theme: 'Recognition',  criteria: 'Voted most likely to stay calm under extreme pressure',        shortLabel: 'Calm under pressure' },
  { id: 16, theme: 'Recognition',  criteria: 'Always the most punctual person in the room',                  shortLabel: 'Always punctual' },
];

const config = {
  gridSize: Math.round(Math.sqrt(criteria.length)),
  startingBalance: 1000,
  sessionName: 'Impact Bingo'
};

async function seed() {
  console.log('Seeding criteria...');
  const batch = db.batch();
  criteria.forEach(item => {
    batch.set(db.collection('criteria').doc(String(item.id)), item);
  });
  batch.set(db.collection('config').doc('settings'), config);
  await batch.commit();
  console.log(`✅ Seeded ${criteria.length} criteria (${config.gridSize}x${config.gridSize} grid)`);
  console.log('✅ Config written');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});