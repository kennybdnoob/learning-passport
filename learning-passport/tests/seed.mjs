/**
 * Seeds a demo course into a RUNNING Firestore emulator so the Passport
 * page has a workshop code to resolve during a manual click-through.
 *
 * Usage (two terminals, from repo root):
 *   1)  firebase emulators:start
 *   2)  cd learning-passport/tests && npm run seed
 *   3)  open the hosting URL's /passport  (default http://127.0.0.1:5002/passport)
 *       sign up with any email + 6+ char password + code  AX7K2M
 *
 * Writes with security rules disabled (this is a facilitator-owned doc;
 * the facilitator setup UI is a later phase).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(resolve(here, '../../firestore.rules'), 'utf8');

const env = await initializeTestEnvironment({
  projectId: 'learning-activities-kny',
  firestore: { rules, host: '127.0.0.1', port: 8080 },
});

const CODE = 'AX7K2M';
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'courses', CODE), {
    name: 'The AI Advantage',
    cohortName: 'KL Leaders 26',
    facilitatorId: 'demo-facilitator',
    reflectionPoints: 30,
    journalQuestions: [
      { id:'q1', topic:'Framing AI', objective:'See AI as a thinking partner, not just a tool',
        prompt:'What surprised you most about how AI fits your work?' },
      { id:'q2', topic:'Application', objective:'Translate the day into a concrete owned change',
        prompt:'What is one workflow on your team you will redesign with AI — and why that one?' },
      { id:'q3', topic:'Action', objective:'Commit to a first step',
        prompt:'What is the first thing you will do differently on Monday?' },
    ],
    reflectionQuestion:
      'What is one workflow on your team you will redesign with AI — and why that one?',
    featureFlags: { journal: true, resources: true, activities: false,
      leaderboard: true, rewards: false },
    status: 'active',
    createdAt: new Date().toISOString(),
  });
});

await env.cleanup();
console.log(`\n  Seeded courses/${CODE} → "The AI Advantage" (30 pts/reflection)\n  Open /passport and use code ${CODE}\n`);
process.exit(0);
