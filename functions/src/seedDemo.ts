import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const CRITERIA = [
  { id: 1, criteria: 'Go-to person in a crisis',                             theme: 'Recognition' },
  { id: 2, criteria: 'Makes every teammate feel included',                    theme: 'Recognition' },
  { id: 3, criteria: 'Stays calm under extreme pressure',                     theme: 'Recognition' },
  { id: 4, criteria: 'Lights up every room they walk into',                  theme: 'Recognition' },
  { id: 5, criteria: 'Remembers birthdays and milestones for everyone',      theme: 'Recognition' },
  { id: 6, criteria: 'Brings out the best in others',                         theme: 'Recognition' },
  { id: 7, criteria: 'The person everyone calls when they need cheering up', theme: 'Recognition' },
  { id: 8, criteria: 'Most punctual person in any meeting',                   theme: 'Recognition' },
  { id: 9, criteria: 'The glue that holds the team together',                 theme: 'Recognition' },
];

const PARTICIPANTS = [
  { nick: 'PRIYA',  balance: 2180, lines: 3 },
  { nick: 'DAN',    balance: 2050, lines: 3 },
  { nick: 'ARIA',   balance: 1870, lines: 3 },
  { nick: 'KIRA',   balance: 1790, lines: 3 },
  { nick: 'TARA',   balance: 1640, lines: 3 },
  { nick: 'OBI',    balance: 1550, lines: 2 },
  { nick: 'SAM',    balance: 1460, lines: 2 },
  { nick: 'FARHAN', balance: 1380, lines: 2 },
  { nick: 'HARIS',  balance: 1290, lines: 2 },
  { nick: 'IRIS',   balance: 1200, lines: 2 },
  { nick: 'MEI',    balance: 1150, lines: 2 },
  { nick: 'RAFI',   balance: 1080, lines: 2 },
  { nick: 'BENNY',  balance: 1010, lines: 1 },
  { nick: 'CASS',   balance:  960, lines: 1 },
  { nick: 'LEO',    balance:  920, lines: 1 },
  { nick: 'GIA',    balance:  880, lines: 1 },
  { nick: 'NADIA',  balance:  840, lines: 1 },
  { nick: 'EVA',    balance:  780, lines: 1 },
  { nick: 'QUINN',  balance:  710, lines: 1 },
  { nick: 'JASON',  balance:  640, lines: 0 },
];

// [buyer, seller, criteriaId, amount, claimed, minutesAgo]
const TX: Array<[string, string, number, number, boolean, number]> = [
  ['BENNY',  'PRIYA',  1, 150, true,  118],
  ['EVA',    'ARIA',   4, 100, true,  115],
  ['JASON',  'DAN',    9, 200, true,  112],
  ['NADIA',  'KIRA',   6, 125, true,  110],
  ['GIA',    'TARA',   3,  75, true,  108],
  ['QUINN',  'OBI',    7, 100, true,  105],
  ['LEO',    'SAM',    2, 150, true,  103],
  ['CASS',   'FARHAN', 5, 100, true,  100],
  ['EVA',    'HARIS',  8,  75, true,   97],
  ['JASON',  'IRIS',   1, 125, true,   95],
  ['BENNY',  'MEI',    4,  50, true,   93],
  ['GIA',    'RAFI',   6, 100, true,   90],
  ['NADIA',  'PRIYA',  9,  75, true,   88],
  ['QUINN',  'DAN',    3, 200, true,   85],
  ['LEO',    'ARIA',   7, 100, true,   83],
  ['CASS',   'KIRA',   2, 150, true,   58],
  ['EVA',    'TARA',   5, 125, true,   56],
  ['JASON',  'OBI',    8, 100, true,   54],
  ['BENNY',  'SAM',    1,  75, true,   52],
  ['GIA',    'FARHAN', 4, 150, true,   50],
  ['NADIA',  'HARIS',  6, 125, false,  48],
  ['QUINN',  'IRIS',   9, 100, true,   46],
  ['LEO',    'MEI',    3,  75, true,   44],
  ['CASS',   'RAFI',   7, 100, false,  42],
  ['ARIA',   'PRIYA',  2, 150, true,   40],
  ['DAN',    'KIRA',   5, 200, true,   38],
  ['TARA',   'ARIA',   8, 125, true,   36],
  ['OBI',    'DAN',    1, 100, true,   34],
  ['SAM',    'TARA',   4, 150, false,  32],
  ['FARHAN', 'OBI',    6,  75, true,   30],
  ['HARIS',  'SAM',    9, 125, true,   28],
  ['IRIS',   'FARHAN', 3, 100, true,   26],
  ['MEI',    'HARIS',  7, 150, true,   24],
  ['RAFI',   'IRIS',   2,  75, false,  22],
  ['PRIYA',  'MEI',    5, 100, true,   20],
  ['KIRA',   'RAFI',   8, 125, true,   18],
  ['DAN',    'BENNY',  1, 200, true,   16],
  ['ARIA',   'CASS',   4, 150, true,   14],
  ['TARA',   'LEO',    6, 100, false,  12],
  ['OBI',    'GIA',    9,  75, true,   10],
  ['SAM',    'NADIA',  3, 125, true,    8],
  ['FARHAN', 'QUINN',  7, 100, true,    6],
  ['HARIS',  'JASON',  2, 150, false,   5],
  ['IRIS',   'EVA',    5,  75, false,   4],
  ['MEI',    'BENNY',  8, 100, true,    3],
  ['RAFI',   'CASS',   1, 125, true,    2],
  ['PRIYA',  'LEO',    4, 200, true,    1],
];

const LINE_BOXES: Record<number, number[]> = {
  0: [],
  1: [1, 2, 3],
  2: [1, 2, 3, 4, 5, 6],
  3: [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

const REFLECTIONS: Array<{
  nick: string; answers: string[]; summary: string;
}> = [
  {
    nick: 'PRIYA',
    answers: [
      "The hardest was 'Stays calm under extreme pressure' — I didn't think others saw me that way. But three people bought it from me and I had to sit with that for a while.",
      "That I'm seen as someone who holds space for the team during difficult moments. I always thought I was just doing my job — turns out it's more than that.",
    ],
    summary: `PRIYA, what a performance — 2,180 points with a full 3-line multiplier puts you firmly at the top, and that's a direct reflection of how actively you showed up in this market. You didn't just buy squares; you invested in people, and people invested in you right back.

The moment you shared that 'Stays calm under extreme pressure' surprised you is the most powerful insight of the day. Three people independently decided your composure was worth their hard-earned points. That's not a coincidence — that's a signal. The gap between how you see yourself and how the room sees you is the exact place where growth lives.

Your reflection reveals someone who's been quietly underestimating the safety she creates for others. That sense of 'I'm just doing my job' is worth examining — because what feels ordinary to you is extraordinary to the people around you.

COACHING QUESTION: If the version of you that this room sees today could give you one piece of advice about how you show up at work, what would she say?`,
  },
  {
    nick: 'DAN',
    answers: [
      "The hardest was 'Go-to person in a crisis' — I always thought I was too slow to react under pressure. When someone bought it I felt exposed in a good way.",
      "That I'm more dependable than I give myself credit for. I keep comparing myself to louder, faster people — but reliability is its own kind of strength.",
    ],
    summary: `DAN, 2,050 points and 3 completed lines is the mark of someone who played this market with intention and confidence. You bought deliberately, you sold honestly, and you finished near the top of the leaderboard — that's consistency in action.

What strikes me most is your relationship with the 'Go-to in a crisis' square. The fact that someone paid for that quality — that they saw it in you and decided it was worth their points — is evidence your instincts about yourself are lagging behind reality. You're faster and more reliable than you think.

The insight about comparing yourself to louder, faster people is gold. Reliability isn't a consolation prize. In most teams, it's the rarest and most valued thing.

COACHING QUESTION: What would change at work if you stopped measuring yourself against others' visibility and started measuring yourself against your own track record?`,
  },
  {
    nick: 'ARIA',
    answers: [
      "'The glue that holds the team together' was hardest. I almost didn't put it up — it felt arrogant. But it sold, and that forced me to sit with something I usually avoid.",
      "My ability to create connection in a room. I've always seen it as just being friendly, not as a professional skill worth owning.",
    ],
    summary: `ARIA, 1,870 points and 3 lines — you played a beautifully balanced game. You were active as both a buyer and a seller, and the market responded to you. That's what happens when someone is genuinely curious about others while also being willing to be seen.

The hesitation around 'The glue that holds the team together' tells a familiar story: we're often most resistant to claiming the qualities that are most true about us. The fact that it sold says the room already knew what you were deciding whether to believe.

The reframe here is important: creating connection is not just friendliness. It's a strategic, emotionally intelligent skill that most teams desperately need and very few people do well. You do it well.

COACHING QUESTION: What would it look like to bring this 'connection-creating' role into your work more consciously — not just as a personality trait, but as a deliberate contribution?`,
  },
  {
    nick: 'KIRA',
    answers: [
      "'Makes every teammate feel included' was the one I overthought. I wasn't sure if I actually do it or just think I do. The fact that it sold made me question my self-doubt.",
      "That my empathy is an actual professional asset, not just a personality quirk I should probably dial down in formal settings.",
    ],
    summary: `KIRA, 1,790 points and 3 lines — you played this market with both heart and strategy. The results show someone who was paying close attention to others while also trusting the room to see her clearly.

Your question — 'Do I actually do this, or just think I do?' — is one of the most honest things said all day. The answer the market gave you is: yes, you do. And the people who bought 'Makes every teammate feel included' didn't do it out of politeness. They paid points for it.

The insight about empathy as a professional asset is something to hold onto. In high-performance environments, the person who notices who's been quiet for too long, who checks in without being asked — that person is holding the whole thing together.

COACHING QUESTION: How might you start naming and positioning your empathy as a deliberate leadership practice, rather than something you do quietly on the side?`,
  },
  {
    nick: 'TARA',
    answers: [
      "'Lights up every room they walk into' — I almost skipped it entirely. It felt too showy. But it sold, and I'm still processing what it means that someone paid for that.",
      "That my energy affects the people around me more than I realise. I tone it down in professional settings — maybe I shouldn't.",
    ],
    summary: `TARA, 1,640 points and 3 full lines — your performance reflects someone who committed to the game and brought the room with her. The energy you worried was 'too much' turned out to be exactly what others were buying.

There's something worth naming about your hesitation around 'Lights up every room.' You called it showy — but the person who bought it called it valuable. Those are two very different interpretations of the same quality. The market voted, and it voted for you.

The habit of toning down your energy in professional settings is worth examining. The room didn't need you smaller. It needed you exactly as you were.

COACHING QUESTION: In which professional situations have you been making yourself smaller than necessary — and what's one thing you could do differently next week?`,
  },
  {
    nick: 'OBI',
    answers: [
      "'Remembers birthdays and milestones for everyone' — I do it automatically but it felt too personal to mention in a work context. The response surprised me.",
      "That the small caring gestures I do are actually noticed and valued. I assumed they just disappeared into the background.",
    ],
    summary: `OBI, 1,550 points and 2 lines — you played a solid, consistent game. Your approach reflected exactly what your reflection reveals: someone who shows up quietly and consistently, and wonders if anyone notices.

They notice. The person who bought 'Remembers birthdays and milestones' didn't do it because it was available — they bought it because it rang true and because it matters to them. Small, consistent caring is one of the highest-trust behaviours in any team.

The gap between 'it felt too personal to mention at work' and 'it got bought' is exactly the kind of boundary worth questioning. Not every personal quality needs to stay personal.

COACHING QUESTION: What's one caring habit you've been keeping private that, if you owned it more openly, could strengthen your relationships at work?`,
  },
  {
    nick: 'SAM',
    answers: [
      "'Most punctual person in any meeting' — I laughed at first. It felt too basic. But it sold, and the person told me later it makes them feel safe. I didn't expect that.",
      "That reliability and follow-through are underrated superpowers. I'm always chasing bigger achievements and forgetting that the foundation matters.",
    ],
    summary: `SAM, 1,460 points and 2 lines — steady, reliable, and exactly what the leaderboard rewarded. The way you played mirrors what you discovered about yourself: consistency isn't flashy, but it's foundational.

The laugh about punctuality is telling. We discount the things that come naturally to us because they feel too easy to count. But the person who told you it makes them feel safe gave you a gift — a window into how your 'basic' behaviours have an outsized emotional impact.

Foundation-builders are the rarest players on any team. Everyone wants the highlight moments, but the meetings that start on time, the promises that get kept — that's what trust is actually built on.

COACHING QUESTION: What would happen if you started tracking and communicating your 'foundational' contributions with the same energy you bring to your bigger achievements?`,
  },
  {
    nick: 'FARHAN',
    answers: [
      "'Brings out the best in others' felt the most personal to put up. I wasn't sure I could honestly say it. Selling it felt like a test I had to pass in real time.",
      "That my habit of asking questions and really listening has more impact than I realised. I thought it was just me being curious — turns out it helps people think.",
    ],
    summary: `FARHAN, 1,380 points and 2 lines — you played this game thoughtfully and finished in a strong position. The hesitation you described about 'Brings out the best in others' is one of the most honest moments in today's session.

Putting a quality on the market means being willing to have the room say 'yes, that's true' or 'not quite.' You took that risk, and the market said yes. That's not just a transaction — that's external validation of something you were still deciding whether to believe about yourself.

Your discovery about asking questions and listening is a reframe worth sitting with: curiosity isn't passive. When you ask someone the right question and stay genuinely present while they answer, you're coaching them — whether you call it that or not.

COACHING QUESTION: Who in your team right now could benefit most from one good question from you — and what would that question be?`,
  },
  {
    nick: 'HARIS',
    answers: [
      "'The person everyone calls when they need cheering up' made me feel exposed. Like putting your soft side on the market. But it sold fast, which surprised me.",
      "That my humour and warmth are professional assets, not distractions. I've been keeping them separate from my 'work self' for too long.",
    ],
    summary: `HARIS, 1,290 points and 2 lines — you engaged the market genuinely and it showed. The person others call when they need cheering up doesn't just boost morale — they maintain the emotional infrastructure of a team, and that sold fast because it's rare.

The word 'exposed' is important. Vulnerability in a market game feels risky because you're not just making a claim — you're inviting others to evaluate it. And the market said: we want this. That's not exposure. That's recognition.

The split between your 'work self' and your warm self is something many high performers carry. But the teams that perform best are the ones where warmth isn't kept in a separate drawer.

COACHING QUESTION: What would it look like to let your humour and warmth show up fully in your most high-stakes professional interactions — not just the comfortable ones?`,
  },
  {
    nick: 'IRIS',
    answers: [
      "'Stays calm under extreme pressure' was the hardest because I didn't fully believe it. When someone bought it, I felt a mix of pride and a weight — like I now have to live up to it.",
      "That I handle ambiguity better than most. I've been trying to be more like colleagues who seem certain, when my calm is actually what people rely on.",
    ],
    summary: `IRIS, 1,200 points and 2 lines — a composed performance that reflects exactly the quality others saw in you today. The market bought your calm because it needed it. That says something about the room and something about you.

The feeling of 'I now have to live up to it' is fascinating — because you've been living up to it all along. The person who bought that square wasn't betting on future behaviour. They were paying for something they'd already experienced from you.

Trying to be more like colleagues who project certainty is a common trap. Certainty and calm are different things. Certainty is often performed. Calm — real, grounded calm in the middle of chaos — is earned, and it's what teams remember.

COACHING QUESTION: Think of a recent moment of ambiguity at work. How did your presence and calm affect the people around you — and did you notice it at the time?`,
  },
  {
    nick: 'MEI',
    answers: [
      "'Brings out the best in others' — I hesitated because it sounded presumptuous. But when it sold I realised claiming it isn't arrogance, it's acknowledgment.",
      "That my coaching instinct — helping people think through problems rather than just giving answers — is something people actively seek out, not just tolerate.",
    ],
    summary: `MEI, 1,150 points and 2 lines — you played with thoughtfulness and your market results show it. The distinction you made between arrogance and acknowledgment is one of the sharpest insights of the day.

We live in a culture that teaches us to minimise our strengths as a form of humility. But claiming 'I bring out the best in others' when it's true isn't arrogance — it's accuracy. The people who bought that square were being accurate too.

Your coaching instinct is a professional superpower in a world full of people who give answers when questions would serve better. The fact that people seek it out means it's already having an impact — with or without a formal title.

COACHING QUESTION: If you were to formalise your coaching instinct — make it more deliberate and visible in your role — what would be one concrete change you'd make to how you show up in meetings or 1-on-1s?`,
  },
  {
    nick: 'RAFI',
    answers: [
      "'The glue that holds the team together' — I actually choked when I tried to explain it. Saying out loud that I hold my team together was deeply uncomfortable.",
      "That I'm more of a connector than I think. I always saw myself as a solo contributor. This game showed me a different version of myself.",
    ],
    summary: `RAFI, 1,080 points and 2 lines — you showed up and you played, even when it was uncomfortable. And that discomfort? That's where the real learning happened today.

Choking while explaining 'The glue that holds the team together' is not weakness — it's the sign of a true insight landing in real time. Something true enough to make you stumble. The market still bought it. The room already knew.

The shift from 'solo contributor' to 'connector' is significant. It doesn't erase your individual strengths — it adds a dimension to them. Connectors make solo contributions land. They create the conditions where good work actually gets seen and built upon.

COACHING QUESTION: What's one thing you do naturally as a connector that you've never named or claimed as a professional contribution — and what would it mean to own it?`,
  },
  {
    nick: 'BENNY',
    answers: [
      "'Lights up every room they walk into' was impossible for me to put up at first. It still feels like bragging. I only did it because someone encouraged me.",
      "Honestly, that I matter more to the team culture than I thought. I'm usually in the background — but the people who bought from me made me rethink that.",
    ],
    summary: `BENNY, 1,010 points and 1 line — a solid start in a tough market. The most important thing that happened today wasn't on the leaderboard. It was that someone encouraged you to put a square up that you thought was too good to be true about yourself, and then it sold.

That's the game doing what it's designed to do: surfacing what others see when you're not looking. 'Lights up every room' felt like bragging because you've been taught to minimise. But the person who bought it wasn't being charitable. They were being honest.

Being in the background is a choice, not a destiny. And today, the room invited you out of it.

COACHING QUESTION: What's one situation in the next week where you could choose to show up at full brightness — and what's the smallest thing that would help you do that?`,
  },
  {
    nick: 'CASS',
    answers: [
      "'Go-to person in a crisis' — I genuinely wasn't sure I qualified. It's one thing to think you're good under pressure, another to let people pay for it.",
      "That my problem-solving instinct is something others actively look for. I assumed everyone could do what I do in a crisis — apparently not.",
    ],
    summary: `CASS, 960 points and 1 line — you held your ground in a competitive market. The insight that strikes me most is the gap between 'I wasn't sure I qualified' and 'someone paid for it.' That gap is where your growth edge lives.

We don't always get to be objective judges of our own capabilities — especially the ones that kick in automatically, like a crisis instinct. The people around you get a clearer view because they don't have access to your internal doubt. They only see the output.

The assumption that 'everyone can do what I do' is one of the most common ways competent people undervalue themselves. If it were that common, it wouldn't be worth points.

COACHING QUESTION: The next time a crisis emerges at work, can you pause and notice what you do automatically — and consider whether that's actually rare?`,
  },
  {
    nick: 'LEO',
    answers: [
      "'Makes every teammate feel included' — this one required me to believe something good about myself, and I'm not always good at that.",
      "That the way I check in on quieter team members has an impact. I do it automatically, but apparently it's not as common as I assumed.",
    ],
    summary: `LEO, 920 points and 1 line — you finished the game and you reflected honestly, and both of those things matter. The sentence 'this required me to believe something good about myself' might be the most courageous thing said today.

Self-belief isn't arrogance. It's the prerequisite for letting others see you clearly. The market can only buy what you put up. And what you put up — inclusion, attentiveness to the quieter voices — got bought.

The discovery that checking in on quieter team members isn't universal is an important one. You're filling a gap that most people walk right past. The people you check in on remember it. It shapes how safe they feel showing up.

COACHING QUESTION: Who on your team right now could benefit from being checked in on — and what's one thing you'd want them to know you've noticed about them?`,
  },
  {
    nick: 'GIA',
    answers: [
      "'Remembers birthdays and milestones for everyone' — I worried people would think it's trivial. But it got bought, and I'm rethinking what counts as a real contribution.",
      "That I show up for people in small, consistent ways that build trust over time. I never thought of it as a strategy — it's just how I am.",
    ],
    summary: `GIA, 880 points and 1 line — steady and genuine. The worry that remembering milestones might seem trivial reveals something important: you've been measuring your contributions against the wrong ruler.

Trust isn't built in dramatic moments. It's built in the small, consistent signals that say 'I see you, I remember you, you matter.' That's not trivial. That's the infrastructure of any relationship worth having — at work or anywhere else.

'It's just how I am' is a phrase worth examining. The things that feel most natural to us often carry the most power, precisely because they're not performed or calculated. They're just you.

COACHING QUESTION: If you thought of your small, consistent gestures as a deliberate trust-building practice rather than 'just how you are' — how would you invest that energy differently?`,
  },
  {
    nick: 'NADIA',
    answers: [
      "'Most punctual person in any meeting' — it felt too small to matter. But the person who bought it told me it affects how safe they feel. I didn't expect that.",
      "That I set an example without trying to. I thought I was just being professional — but apparently it's not as common as I thought.",
    ],
    summary: `NADIA, 840 points and 1 line — you showed up and reflected with honesty. The story about someone telling you that your punctuality makes them feel safe is one of the most unexpectedly profound moments of the day.

Safety is the precondition for good work. When a meeting starts on time, when commitments are kept, when people can count on the basics — that's not just professionalism. That's someone creating the conditions for trust. And you're doing it every day without realising the impact.

'I thought I was just being professional' is worth sitting with. You're not just being professional. You're modelling something that others are calibrating against. That's leadership, even without the title.

COACHING QUESTION: What other 'just professional' habits do you have that might be having an outsized impact you've never stopped to measure?`,
  },
  {
    nick: 'EVA',
    answers: [
      "'The person everyone calls when they need cheering up' was embarrassing to put up. But it sold and I was genuinely moved by that.",
      "That being the emotional anchor for a team is a real and significant role. I've been doing it without acknowledging it — even to myself.",
    ],
    summary: `EVA, 780 points and 1 line — your reflection is one of the most emotionally honest of the day, and that honesty is entirely consistent with the quality the market bought from you.

Being moved when a square sells is the game working. It means something true was recognised. Emotional anchors are not soft roles — they're the reason teams don't fall apart when things get hard. The person who knows how to make the room feel human again after a difficult week is irreplaceable.

Doing it without acknowledging it is common. But acknowledgment matters — not for others, but for you. You deserve to know what you bring.

COACHING QUESTION: What would it mean for your own wellbeing and sustainability at work to consciously recognise yourself as the emotional anchor you are — rather than just being it?`,
  },
  {
    nick: 'QUINN',
    answers: [
      "'Stays calm under extreme pressure' — I'm not sure I'm actually calm. I just look calm. But maybe that's the same thing?",
      "That how I appear matters as much as how I feel inside. People are reading signals I didn't know I was sending.",
    ],
    summary: `QUINN, 710 points and 1 line — you finished the game and asked one of the best philosophical questions of the day: is looking calm the same as being calm?

For the people around you, the answer is yes. Leadership is often about managing your external presence when your internal state is chaos. If others experience you as calm, that calm is real — it's having real effects on real people. The inner storm is yours alone. The calm you project is a shared resource.

The discovery that you're sending signals you didn't know about is both humbling and empowering. Humbling because you're not in full control of your impact. Empowering because you can get more intentional about it.

COACHING QUESTION: Now that you know your external calm is having an impact — how might you use that more deliberately, especially in high-pressure situations where the team needs to steady itself?`,
  },
  {
    nick: 'JASON',
    answers: [
      "Honestly, everything was hard for me to sell. I barely bought much either. It tells me I'm still figuring out what I genuinely bring to the team.",
      "That I need to think more about this before the next session. This was humbling but I think that's the point.",
    ],
    summary: `JASON, 640 points and 0 lines — you didn't finish on the leaderboard, but you finished with something more important: an honest question. What do I actually bring?

That question — asked genuinely, without deflection — is the beginning of something. Most people avoid it. You didn't. The discomfort you felt when you tried to sell something is data, not failure. It's telling you that you haven't yet built the language for your own contribution.

Humbling is good. Humbling means you're paying attention. And the fact that you reflected on it honestly means you're already doing the work.

COACHING QUESTION: If you had to describe one specific moment in the last 3 months where your presence, skill, or action made a difference to someone at work — what would that moment be?`,
  },
];

export const seedDemoSession = onRequest({ cors: true }, async (req, res) => {
  if (req.query['key'] !== 'SEED_DEMO_2026') {
    res.status(403).send('Forbidden — wrong key');
    return;
  }

  try {
    const db = getFirestore();
    const now = Date.now();

    // Resolve facilitator UID from known admin email
    let facilitatorId = 'admin-seeded';
    try {
      const u = await getAuth().getUserByEmail('aknyz88@gmail.com');
      facilitatorId = u.uid;
    } catch (_) { /* leave placeholder */ }

    // 1 — Session document
    const sessionRef = db.collection('sessions').doc();
    await sessionRef.set({
      facilitatorId,
      facilitatorEmail: 'aknyz88@gmail.com',
      sessionName: 'Showcase Demo — Recognition Workshop',
      roomCode:    'DEMO26',
      gridSize:    3,
      passcode:    '2026',
      date:        '14 May 2026',
      venue:       'Grand Hyatt KL, Ballroom A',
      status:      'active',
      phase:       'active',
      reflectionQuestions: [
        'Which square was the hardest for you to sell — and what does that tell you?',
        'What did you discover about your own value that you tend to underestimate?',
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const sessionId = sessionRef.id;

    // 2 — Criteria
    for (const c of CRITERIA) {
      await sessionRef.collection('criteria').doc(String(c.id)).set(c);
    }

    // 3 — Participants + done subcollection
    for (const p of PARTICIPANTS) {
      await sessionRef.collection('users').doc(p.nick).set({
        balance:  p.balance,
        lines:    p.lines,
        joinedAt: Timestamp.now(),
      });
      for (const boxId of (LINE_BOXES[p.lines] || [])) {
        await sessionRef.collection('users').doc(p.nick)
          .collection('done').doc(String(boxId))
          .set({ boxId, doneAt: Timestamp.now() });
      }
    }

    // 4 — Transactions
    for (const [buyer, seller, critId, amount, claimed, minsAgo] of TX) {
      const tsMs = now - minsAgo * 60 * 1000;
      const crit = CRITERIA.find(c => c.id === critId);
      const txData: Record<string, unknown> = {
        action:    'BUY',
        buyer, seller,
        criteria:  crit?.criteria ?? '',
        boxId:     critId,
        amount, claimed,
        timestamp: Timestamp.fromMillis(tsMs),
      };
      if (claimed) txData.claimedAt = Timestamp.fromMillis(tsMs + 2 * 60 * 1000);
      await sessionRef.collection('transactions').add(txData);
    }

    // 5 — Reflections (all 20 participants)
    for (const r of REFLECTIONS) {
      const p = PARTICIPANTS.find(x => x.nick === r.nick)!;
      const finalScore = Math.round(p.balance * p.lines * 0.3);
      await sessionRef.collection('reflections').doc(r.nick).set({
        answers:     r.answers,
        finalScore,
        lines:       p.lines,
        balance:     p.balance,
        summary:     r.summary,
        completedAt: Timestamp.fromMillis(now - Math.floor(Math.random() * 20) * 60 * 1000),
      });
    }

    const unclaimed = TX.filter(t => !t[4]).length;
    res.json({
      ok:        true,
      sessionId,
      roomCode:  'DEMO26',
      players:   PARTICIPANTS.length,
      trades:    TX.length,
      claimed:   TX.length - unclaimed,
      unclaimed,
      claimRate: `${Math.round(((TX.length - unclaimed) / TX.length) * 100)}%`,
      reflections: REFLECTIONS.length,
      dashboard: `https://game.knywong.com/impactbingo/dashboard?session=${sessionId}`,
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
