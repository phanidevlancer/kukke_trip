export type BadgeKind = 'wl' | 'partial' | 'cnf';

export interface Station {
  time: string;
  timePlus?: string;
  name: string;
  code: string;
}

export interface TrainLeg {
  kind: 'train';
  mode: string;
  badge: { kind: BadgeKind; text: string };
  from: Station;
  to: Station;
  duration: string;
  trainNo: string;
  trainName: string;
  pnr: string;
  distance: string;
  extraChip: string;
  fare: string;
}

export interface HotelLeg {
  kind: 'hotel';
  name: string;
  address: string;
  chips: Array<{ label: string; value?: string }>;
  nights: number;
}

export interface MiniStep {
  time: string;
  text: string;
  bold?: string;
  small?: string;
  traffic?: string;
  mapPin?: string;
}

export interface PlanCardImage {
  /** Stable id used as the localStorage key for the toggle preference. */
  id: string;
  /** Wide illustration (~16:9 or 21:9). */
  desktop: string;
  /** Portrait illustration (~4:5) for narrow screens. */
  mobile: string;
  /** Accessibility text. */
  alt: string;
  /**
   * Background colour that matches the image so the card paper blends into
   * the illustration with no visible seam. Sampled from the image corners.
   * Only applied while the image view is active.
   */
  bg?: string;
}

export interface PlanCardData {
  kind: 'plan';
  variant: 'gold' | 'leaf';
  icon: 'cutlery' | 'shield';
  title: string;
  description: string;
  lunch?: Array<{ name: string; meta: string }>;
  lunchNote?: string;
  steps: MiniStep[];
  /** Optional illustrated route map. When present, the card shows an Image/Text toggle. */
  image?: PlanCardImage;
}

export interface AlertData {
  kind: 'alert';
  title: string;
  description: string;
}

export interface HomeNoteData {
  kind: 'home-note';
  text: string;
}

export type DayItem = TrainLeg | HotelLeg | PlanCardData | AlertData | HomeNoteData;

export interface Day {
  weekday: string;
  dayNum: string;
  goldDayBadge?: boolean;
  title: string;
  subtitle: string;
  items: DayItem[];
}

export const DAYS: Day[] = [
  {
    weekday: 'SUN',
    dayNum: '01',
    title: 'Day 1 · Hyderabad → Bengaluru',
    subtitle: 'Onward journey begins',
    items: [
      {
        kind: 'home-note',
        text: 'Leave <b>Pebbles Bay, Miyapur</b> by <b>~04:15</b> for Kacheguda (≈23 km). Pre-book a cab the night before — at that hour the run is light, about <b>45–55 min</b>, putting you at the station with time to spare for the 05:45 departure.',
      },
      {
        kind: 'train',
        mode: 'Vande Bharat Express · Chair Car',
        badge: { kind: 'wl', text: 'Waitlist' },
        from: { time: '05:45', name: 'Kacheguda', code: 'KCG · Hyderabad' },
        to: { time: '14:00', name: 'Yesvantpur Jn', code: 'YPR · Bengaluru' },
        duration: '8h 15m',
        trainNo: '20703',
        trainName: 'YPR Vande Bharat',
        pnr: '4438870715',
        distance: '610 km',
        extraChip: 'Veg meals incl.',
        fare: '₹3,315',
      },
      {
        kind: 'plan',
        variant: 'gold',
        icon: 'cutlery',
        title: 'Bangalore layover · ~7¾ hrs at Yesvantpur',
        description:
          'You arrive <b>YPR 14:00</b> and the next train also leaves from <b>Yesvantpur (21:47)</b> — same station, so no scramble. Drop bags in the cloak room, then head to <b>Residency Road</b> for a late lunch, where both your choices sit on the same street.',
        image: {
          id: 'blore-layover-day1',
          desktop: '/banners/blore_desk.png',
          mobile: '/banners/blore_mobile.png',
          alt: 'Hand-drawn Bangalore layover route map — Yesvantpur to Residency Road and back, with Andhra meal stops.',
          bg: '#FBF0DB',
        },
        lunch: [
          { name: 'Meghana Foods', meta: 'Residency Road · Andhra biryani · ~₹1,000 for two' },
          { name: 'Nagarjuna', meta: 'Residency Road, directly opposite Meghana · Andhra meals · ~₹800 for two' },
        ],
        lunchNote: 'Both are on Residency Road, face to face — pick whichever has the shorter wait.',
        steps: [
          { time: '14:00', bold: 'Arrive Yesvantpur (YPR)', small: 'Freshen up, leave luggage at the station cloak room / a lounge', text: '' },
          { time: '14:30', bold: 'Cab to Residency Road', text: ' (≈9–10 km)', traffic: '35–50 min in afternoon traffic' },
          { time: '15:15', bold: 'Lunch', text: ' at Meghana / Nagarjuna', small: 'Off-peak hour means lighter crowds than a 1 pm rush' },
          { time: '~20:00', bold: 'Head back to Yesvantpur', text: '', small: "Leave a generous buffer — be at YPR by ~21:00 for the 21:47 train" },
        ],
      },
      {
        kind: 'train',
        mode: 'SBC CLT Express · AC 3 Tier',
        badge: { kind: 'wl', text: 'Waitlist' },
        from: { time: '21:47', name: 'Yesvantpur Jn', code: 'YPR · Bengaluru' },
        to: { time: '04:50', timePlus: '+1', name: 'Subrahmanya Rd', code: 'SBHR' },
        duration: '7h 03m',
        trainNo: '16511',
        trainName: 'SBC CLT Express',
        pnr: '4438870759',
        distance: '327 km',
        extraChip: 'Overnight',
        fare: '₹1,275',
      },
    ],
  },
  {
    weekday: 'MON',
    dayNum: '02',
    title: 'Day 2 · Kukke Subramanya',
    subtitle: 'Darshan at Kukke & Dharmasthala',
    items: [
      {
        kind: 'hotel',
        name: 'De Royale Montana Hotel & Resort',
        address: 'Kukke, Sulya, Subrahmanya, Karnataka 574238 · ☎ +91 6366 411 655',
        chips: [
          { label: 'Check-in', value: 'Jun 2' },
          { label: 'Check-out', value: 'Jun 3' },
          { label: '2 adults · 1 room' },
          { label: 'Free WiFi · Parking' },
          { label: 'Booking', value: '2017239286' },
        ],
        nights: 1,
      },
      {
        kind: 'plan',
        variant: 'leaf',
        icon: 'shield',
        title: 'Two-temple darshan plan',
        description:
          'Kukke and <b>Dharmasthala</b> are about <b>45 km / 1½ hrs</b> apart by road. Do Kukke early, drive over for Dharmasthala darshan and its famous free <b>annadanam</b> lunch, then return to rest before the midnight train. Hire a local taxi for the round trip (≈₹2,500–3,000).',
        image: {
          id: 'darshan',
          desktop: '/banners/desktop_sbhr.png',
          mobile: '/banners/mobile_sbhr.png',
          alt: 'Hand-drawn route map of the two-temple darshan: Kukke Subramanya to Dharmasthala and back.',
          bg: '#FBEFDA',
        },
        steps: [
          { time: '04:50', bold: 'Arrive Subrahmanya Rd (SBHR)', text: '', small: 'Auto to hotel (≈7 km), check in, freshen up' },
          { time: '06:30', bold: 'Early Kukke Subramanya darshan', text: '', mapPin: 'Kukke Sri Subramanya Temple', small: 'Beat the queues; the morning crowd is lightest. Sarpa Samskara seekers book ahead' },
          { time: '09:30', bold: 'Drive to Dharmasthala', text: ' (≈45 km)', mapPin: 'Shri Kshetra Dharmasthala Manjunatha Temple', traffic: '~1½ hrs on ghat roads' },
          { time: '11:30', bold: 'Sri Manjunatha Swamy darshan', text: ' + annadanam lunch', small: 'Temple meals served in the dining hall; modest dress code applies' },
          { time: '15:00', bold: 'Return to Kukke / hotel', text: '', small: 'Rest, pack, early dinner' },
          { time: '23:30', bold: 'Head to Subrahmanya Rd station', text: '', small: 'For the 00:15 train back — see Day 3' },
        ],
      },
      {
        kind: 'alert',
        title: 'Confirm temple timings & the taxi the day before',
        description:
          'Both temples close for an afternoon break — verify darshan hours locally so the Dharmasthala leg lands in an open window. Arrange the round-trip taxi through your hotel desk on arrival. The return train departs Subrahmanya Rd at <b>00:15</b>, so keep the evening calm and rest beforehand.',
      },
    ],
  },
  {
    weekday: 'TUE',
    dayNum: '03',
    title: 'Day 3 · Kukke → Bengaluru → Hyderabad',
    subtitle: 'Return journey',
    items: [
      {
        kind: 'train',
        mode: 'Panchaganga Express · AC 2 Tier',
        badge: { kind: 'wl', text: 'Waitlist · RLWL' },
        from: { time: '00:15', name: 'Subrahmanya Rd', code: 'SBHR' },
        to: { time: '07:15', name: 'KSR Bengaluru', code: 'SBC' },
        duration: '7h 00m',
        trainNo: '16596',
        trainName: 'Panchaganga Express',
        pnr: '8649076710',
        distance: '332 km',
        extraChip: 'Free cancellation',
        fare: '₹1,947',
      },
      {
        kind: 'plan',
        variant: 'gold',
        icon: 'cutlery',
        title: 'Bangalore day · arrive City (SBC) 07:15, leave from Yelhanka 16:20',
        description:
          'Heads-up: the two stations are <b>different and far apart</b>. KSR City (SBC / Majestic) is central; <b>Yelhanka (YNK) is ~20 km north</b>. Do an early lunch at Residency Road, then leave a big buffer for the cross-town run up to Yelhanka in afternoon traffic.',
        image: {
          id: 'blore-day3-return',
          desktop: '/banners/return_desk.png',
          mobile: '/banners/return_mobi.png',
          alt: 'Hand-drawn Bangalore return-day route map — KSR Bengaluru to Residency Road to Yelhanka Junction.',
          bg: '#FBF1DC',
        },
        lunch: [
          { name: 'Meghana Foods', meta: 'Residency Road · ~6 km from SBC · Andhra biryani' },
          { name: 'Nagarjuna', meta: 'Residency Road, opposite Meghana · Andhra meals' },
        ],
        steps: [
          { time: '07:15', bold: 'Arrive KSR Bengaluru (SBC)', text: '', small: 'Freshen up; stow bags. A short rest / nap if needed' },
          { time: '11:30', bold: 'Cab to Residency Road', text: ' for an early lunch', traffic: 'SBC → Residency Rd ≈ 20–35 min' },
          { time: '13:30', bold: 'Leave for Yelhanka (YNK)', text: '', traffic: '≈20–22 km · 1–1½ hrs in traffic' },
          { time: '~15:30', bold: 'Reach Yelhanka with buffer', text: '', small: "Comfortably ahead of the 16:20 departure — traffic here is unpredictable, don't cut it fine" },
        ],
      },
      {
        kind: 'train',
        mode: 'YNK – KCG Express · First Class AC (1A)',
        badge: { kind: 'partial', text: 'Partly confirmed' },
        from: { time: '16:20', name: 'Yelhanka Jn', code: 'YNK · Bengaluru' },
        to: { time: '05:00', timePlus: '+1', name: 'Kacheguda', code: 'KCG · Hyderabad' },
        duration: '12h 40m',
        trainNo: '17604',
        trainName: 'YNK KCG Express',
        pnr: '4758839907',
        distance: '651 km',
        extraChip: 'Mounika CNF · Phanindra WL1',
        fare: '₹4,855',
      },
    ],
  },
  {
    weekday: 'WED',
    dayNum: '04',
    goldDayBadge: true,
    title: 'Day 4 · Home',
    subtitle: 'Arrive Kacheguda 05:00 — yatra complete',
    items: [
      {
        kind: 'home-note',
        text: 'Cab from <b>Kacheguda</b> back to <b>Pebbles Bay, Miyapur</b> (≈23 km, <b>~45–55 min</b>). Booking a cab in advance saves the early-morning wait at the station.',
      },
    ],
  },
];

export const MAP_PINS: Record<string, string> = {
  'Kacheguda': 'Kacheguda Railway Station Hyderabad',
  'Yesvantpur Jn': 'Yesvantpur Junction Railway Station Bengaluru',
  'Subrahmanya Rd': 'Subrahmanya Road Railway Station',
  'KSR Bengaluru': 'KSR Bengaluru City Junction Railway Station',
  'Yelhanka Jn': 'Yelhanka Junction Railway Station Bengaluru',
  'Meghana Foods': 'Meghana Foods Residency Road Bengaluru',
  'Nagarjuna': 'Nagarjuna Residency Road Bengaluru',
  'De Royale Montana Hotel & Resort': 'De Royale Montana Hotel Resort Kukke Subramanya',
};

export const CAT_COLORS: Record<string, string> = {
  Travel: 'var(--saffron)',
  Stay: 'var(--leaf)',
  Temple: 'var(--vermilion)',
  Food: 'var(--gold)',
  Local: '#7A6CB0',
  Misc: '#8A8A8A',
};

export const EXPENSE_CATEGORIES = ['Travel', 'Stay', 'Temple', 'Food', 'Local', 'Misc'] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  paid: boolean;
  hint?: string | null;
  sort_order: number;
}
