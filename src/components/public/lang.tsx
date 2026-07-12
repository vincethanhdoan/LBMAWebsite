import { createContext, useContext } from 'react';

export type Lang = 'en' | 'es';

const EN = {
  nav: {
    home: 'Home',
    about: 'About',
    programs: 'Programs',
    facilities: 'Facilities',
    instructors: 'Instructors',
    reviews: 'Reviews',
    faq: 'FAQ',
    contact: 'Contact',
    bookTrial: 'Book a Trial Class',
    parentLogin: 'Parent Login',
    close: 'Close',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    switchLang: 'Español',
  },
  common: {
    bookTrial: 'Book a Trial Class',
    getStarted: 'Get Started',
    trialOffer: 'One Week Trial Offer',
    trialBody:
      "To try our program is $30 with a uniform included for 5 consecutive training days. Come in, meet the instructors, and let your child try a class. We'll answer your questions before class and after class.",
    guideYou: "We'll guide you through it",
    comingSoon: 'Coming Soon',
    viewAll: 'View all →',
    viewAllPrograms: 'View all programs →',
  },
  home: {
    heroHeading1: 'Black Belts',
    heroHeading2: 'in Martial Arts.',
    heroHeading3: 'Black Belts in Life.',
    heroSub:
      'Healthier active lifestyle through martial arts. Start Your black belt journey today. English and Spanish speaking.',
    explorePrograms: 'Explore Programs',
    aboutEyebrow: 'About',
    aboutHeading1: 'More Than Kicking',
    aboutHeading2: 'and Punching.',
    aboutHeading3: "It's a Way of Life.",
    aboutP1:
      'The physical training matters — your child gets stronger, more coordinated, and more capable. However, what stays with them is the discipline to show up when something becomes challenging, the respect for the people around them, and the confidence that comes with earning an Ernie Reyes West Coast World martial arts black belt.',
    aboutP2:
      "Our academy has been part of a legacy spanning over 40 years at Ernie Reyes' West Coast World Martial Arts Association.",
    aboutLink: 'Our full story →',
    firstVisitEyebrow: 'Your First Visit',
    firstVisitHeading: 'What to Expect When You Come In',
    step01Title: 'Reach Out',
    step01Body:
      'Call us or fill out a quick form. We answer questions before you even walk in the door.',
    step02Title: 'Watch a Real Class',
    step02Body:
      'Your child joins students at their age and level. You sit on the side and watch — no pressure, just a look at what we do.',
    step03Title: 'Ask Us Anything',
    step03Body:
      "After class, talk with an instructor. There's no commitment — we just want you to feel comfortable.",
    programsEyebrow: 'Our Programs',
    programsHeading: 'Training for Every Stage of Life',
    valuesEyebrow: 'What We Stand For',
    valuesHeading: 'Our Martial Arts Values',
    programs: [
      {
        name: 'Little Dragons',
        ages: 'Ages 4–7',
        desc: 'Fun, structured classes that build listening, coordination, early discipline, and fitness.',
      },
      {
        name: 'Youth Program',
        ages: 'Ages 8–17',
        desc: 'Dynamic, goal-oriented classes that build self-defense, discipline, fitness, coordination, confidence, and a strong mind and body.',
      },
      {
        name: 'Extreme Performance',
        ages: 'All Ages',
        desc: 'Invite-only advanced training for handpicked students in gymnastics, weapons, creative forms, and individual and team performance.',
      },
    ],
    comingSoon: [
      {
        name: 'Adults',
        ages: 'Ages 18+',
        desc: 'Dynamic, goal-oriented classes that build self-defense, strength, fitness, confidence, and stress relief.',
      },
      {
        name: 'Endurance Fitness Kickboxing',
        ages: 'Ages 16+',
        desc: 'High-energy cardio kickboxing classes focused on building stamina, strength, coordination, and overall fitness.',
      },
    ],
    values: [
      { label: 'Honor', desc: 'We act with integrity on and off the mat.' },
      {
        label: 'Loyalty',
        desc: 'We stand by our school, our team, and each other.',
      },
      { label: 'Family', desc: 'We train together and grow together.' },
      { label: 'Bravery', desc: 'We face every challenge and never give up.' },
    ],
  },
  programs: {
    eyebrow: 'Our Programs',
    heading: 'Training for Every Stage of Life',
    subheading:
      'From our youngest Little Dragons to advanced Extreme Performance competitors — every program is built around what students at that stage actually need.',
    expandingEyebrow: 'Expanding',
    expandingHeading: 'More Programs on the Way',
    beltEyebrow: 'Belt System',
    beltHeading: 'Your Path to Black Belt',
    beltBody:
      "Every promotion is earned — based on demonstrated skill, effort, and character. Students test when their instructor says they're ready, not on a fixed schedule.",
    programs: [
      {
        name: 'Little Dragons',
        ages: 'Ages 4–7',
        summary:
          'Fun, structured classes that build listening, coordination, early discipline, and fitness. Our youngest students learn in an age-appropriate environment where confidence and character are built alongside martial arts fundamentals.',
        highlights: [
          'Structured classes designed for young learners',
          'Builds listening skills, coordination, and early discipline',
          'Age-appropriate curriculum in a safe, fun environment',
          'Develops physical fitness and motor skills',
          'Small class sizes for individual attention',
        ],
      },
      {
        name: 'Youth Program',
        ages: 'Ages 8–17',
        summary:
          'Dynamic, goal-oriented classes that build self-defense, discipline, fitness, coordination, confidence, and a strong mind and body. Students follow a clear belt progression with a curriculum that grows with them through the junior and teen years.',
        highlights: [
          'Goal-oriented training in self-defense and martial arts',
          'Builds discipline, fitness, and coordination',
          'Develops confidence and a strong mind and body',
          'Clear belt progression with defined skill standards',
          'Separate class tracks for juniors and teens',
        ],
      },
      {
        name: 'Extreme Performance',
        ages: 'All Ages',
        summary:
          'Invite-only advanced training for handpicked students in gymnastics, weapons, creative forms, and individual and team performance. Selected students train at a higher intensity and compete at regional and national events.',
        highlights: [
          'Invite-only — students are selected by instructors',
          'Advanced gymnastics and acrobatics training',
          'Weapons and creative forms curriculum',
          'Individual and team performance preparation',
          'Competitive team opportunities at regional and national events',
        ],
      },
    ],
    comingSoon: [
      {
        name: 'Adults',
        ages: 'Ages 18+',
        desc: 'Dynamic, goal-oriented classes that build self-defense, strength, fitness, confidence, and stress relief.',
      },
      {
        name: 'Endurance Fitness Kickboxing',
        ages: 'Ages 16+',
        desc: 'High-energy cardio kickboxing classes focused on building stamina, strength, coordination, and overall fitness.',
      },
    ],
    beltRanks: [
      'White',
      'Yellow',
      'Orange',
      'Green',
      'Blue',
      'Purple',
      'Red',
      'Red/Black',
      'Brown',
      'Brown/Black',
      'Black Belt',
      'Dan Ranks',
    ],
  },
  faq: {
    eyebrow: 'Common Questions',
    heading: 'Everything You Need to Know',
    sub: "If you don't find your answer here, please reach out. We're here to help you along the way.",
    ctaEyebrow: "We're here to help",
    ctaHeading: 'Still have questions?',
    ctaBody:
      "Reach out and we'll get back to you quickly. No pressure, no commitment — just an honest conversation.",
    contactUs: 'Contact Us',
    faqs: [
      {
        category: 'Getting Started',
        subtitle: 'Everything you need to walk through the door',
        items: [
          {
            q: 'Does my child need any experience?',
            a: 'None at all. Every student starts at the beginning. Our instructors are trained to work with students at every level, from the very first day.',
          },
          {
            q: 'What should my child wear to the trial class?',
            a: 'Just comfortable athletic clothes. No uniform, no equipment, and no gear needed. We provide everything for the first class.',
          },
          {
            q: 'How does the trial week work?',
            a: "You and your child come in, meet the instructors, and your child joins a real class with students at their age and level. You watch from the side. The trial is $30 for 5 consecutive training days, and a uniform is included. Afterward, we'll answer any questions you may have.",
          },
          {
            q: 'What age can my child start?',
            a: 'Our youngest program, Little Dragons, starts at age 4. We have programs for all ages. We will make sure we pick the right program for your child.',
          },
        ],
      },
      {
        category: 'Programs & Schedule',
        subtitle: 'What we offer and when classes run',
        items: [
          {
            q: 'What days and times are classes?',
            a: 'Classes run Monday through Friday from 4:00 PM – 9 PM. We are closed Saturday and Sunday. Specific class times vary by age and belt ranking.',
          },
          { q: 'Do you offer adult classes?', a: 'No. Coming soon.' },
        ],
      },
      {
        category: 'Enrollment & Commitment',
        subtitle: 'No contracts, no pressure',
        items: [
          {
            q: 'Are there long-term contracts?',
            a: 'Our goal is to ensure every child becomes a black belt. We want families here because they love it and see the positive change in their child.',
          },
          {
            q: 'How much does it cost?',
            a: 'Monthly tuition varies by program.',
          },
          {
            q: 'Do I need to buy a uniform right away?',
            a: 'No. Uniforms are included in the first trial class.',
          },
        ],
      },
      {
        category: 'Belt Progression',
        subtitle: 'How ranks and promotions work',
        items: [
          {
            q: 'How do belt promotions work?',
            a: "Students are promoted when their instructor determines they're ready — based on demonstrated skill, effort, and character.",
          },
          {
            q: 'How long does it take to earn a black belt?',
            a: 'It varies significantly by student. A dedicated student training consistently might earn a black belt in 4–7 years. But the journey is the point — each rank represents real growth.',
          },
          {
            q: 'Is there pressure to test or advance quickly?',
            a: "None at all. We never rush promotions. Students advance when they're genuinely ready, which makes every belt meaningful.",
          },
        ],
      },
      {
        category: 'Safety',
        subtitle: 'What we do to keep every student safe',
        items: [
          {
            q: 'Is martial arts safe for young kids?',
            a: 'Safety is the first thing we teach. All classes are supervised by certified instructors. Students will slowly progress from no-contact to contact sparring.',
          },
          {
            q: 'Are instructors background-checked?',
            a: 'Yes. All LBMAA instructors are background-checked and certified through the ERWCMAA.',
          },
          {
            q: 'My child is shy or has anxiety. Is this a good fit?',
            a: "Many of our students start out shy or anxious — and that's exactly why they benefit so much. Our instructors are patient and encouraging. We've seen remarkable transformations in students who struggled with confidence.",
          },
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'Try It Out',
    heading: 'Current Special Offer Trial',
    heroPre: "We're currently offering a five-day trial for",
    heroPrice: '$30 per child',
    heroPost:
      '. This includes a uniform to keep and 5 consecutive training days. Come see if our academy is the right fit for you and your family.',
    formHeading: 'Book Your Trial',
    formSub:
      "Please fill out the following information and we will confirm within one business day of your child's first class.",
    yourName: 'Your name',
    phone: 'Phone',
    email: 'Email address',
    childrenLabel: 'Children enrolling',
    childrenSub: 'We use age to place your child in the right program',
    childName: "Child's name",
    age: 'Age',
    ageLabel: 'Age',
    addChild: 'Add another child',
    notesLabel: 'Questions, notes, or anything we should know',
    notesOptional: '(optional)',
    notesPlaceholder:
      'Please share any questions, notes, or medical awareness information we should know so we can best support your child.',
    submitting: 'Sending…',
    submit: 'Book a Trial Class',
    required: "* Required. We'll never share your information.",
    consentPre: 'By submitting this form, you agree to our ',
    consentLink: 'Privacy Policy',
    consentPost: '.',
    successHeading: 'Trial Request Received',
    successBody:
      "We'll be in touch within 24 hours to confirm your child's first class and answer any questions.",
    locationEyebrow: 'Location',
    hoursEyebrow: 'Class Hours',
    contactEyebrow: 'Phone & Email',
    classTimeNote: "Your child's specific class time depends on their program.",
    joinFamily: 'We look forward to you joining our martial arts family.',
    hours: [
      { day: 'Mon – Fri', time: '4:00 – 9:00 PM' },
      { day: 'Weekends', time: 'Closed' },
      { day: 'Federal Holidays', time: 'Closed' },
    ],
    errName: "Please enter the parent or guardian's full name.",
    errPhone: 'Please provide a phone number.',
    errPhoneInvalid: 'Please enter a valid 10-digit U.S. phone number.',
    errEmailInvalid: 'Please enter a valid email address.',
    errChildCount:
      'Please add between one and six children. To enroll more, please contact us directly.',
    errChildFields: 'Each child must have a name and age.',
    errAgeRange:
      'We currently enroll ages 4–17. Please contact us directly for other inquiries.',
    errSubmit:
      'Unable to submit right now. Please try again or call us directly.',
    errRateLimit:
      'We recently received a request from you. Please wait a moment and try again, or call us directly.',
    programLittle: 'Little Dragons · ages 4–7',
    programYouth: 'Youth Program · ages 8–17',
    programAgeError: 'Age must be 4–17',
  },
  footer: {
    brandDesc:
      'Los Banos Martial Arts Academy develops champions in life — physically, mentally, and spiritually.',
    programs: 'Programs',
    academy: 'Academy',
    getInTouch: 'Get In Touch',
    bookTrial: 'Book a Trial Class',
    copyright: '© 2026 Los Banos Martial Arts Academy',
    programLinks: [
      'Little Dragons (Ages 4–7)',
      'Youth Program (Ages 8–17)',
      'Extreme Performance (All Ages)',
    ],
    academyLinks: [
      'About Us',
      'Our Instructors',
      'Facilities',
      'Reviews',
      'FAQ',
    ],
    hoursMon: 'Mon–Fri: 4:00 – 9:00 PM',
    hoursWeekend: 'Weekends: Closed',
    hoursHoliday: 'Federal Holidays: Closed',
  },
  about: {
    eyebrow: 'About',
    heading: 'Creating Champions In Life',
    sub: "Los Banos Martial Arts Academy helps students build confidence, discipline, respect, focus, fitness, and self-defense skills. We follow the Ernie Reyes' WCWMA system — through a proven system that is exciting, educational, dynamic, and empowering.",
    missionEyebrow: 'Our Mission',
    missionQuote:
      '"To teach and empower students of all ages by developing black belts in life."',
    approachEyebrow: 'Our Approach',
    approachHeading: 'Our Approach',
    pillars: [
      {
        n: '01',
        title: 'Physically',
        body: 'We train the body through movement, strength, coordination, flexibility, and conditioning — building fitness that carries students well beyond the mat.',
      },
      {
        n: '02',
        title: 'Mentally',
        body: 'We develop focus, self-control, patience, and discipline — sharpening the mind so students can stay calm, think clearly, and push through challenges.',
      },
      {
        n: '03',
        title: 'Spiritually',
        body: 'We cultivate inner strength, humility, and a sense of purpose — helping students connect with their values, lift others up, and live with integrity.',
      },
    ],
    teachEyebrow: 'What We Teach',
    teachHeading: 'A Well-Rounded System',
    teachBody:
      'The WCWMA system blends traditional and modern martial arts — creating versatile students who can adapt across styles. Students train their bodies and learn to carry themselves with confidence, discipline, and purpose.',
    disciplines: [
      'Practical self-defense',
      'Korean Tae Kwon Do',
      'Boxing & kickboxing',
      'Grappling & ground fighting',
      'Filipino stick & knife fighting',
      'Japanese & Chinese weapons',
      'Fitness & conditioning',
      'Character development',
    ],
    valuesEyebrow: 'Core Values',
    valuesHeading: 'What We Stand For',
    values: [
      {
        label: 'Honor',
        desc: 'Doing the right thing with respect, honesty, and responsibility — on and off the mat.',
      },
      {
        label: 'Loyalty',
        desc: 'Staying committed to your training, your goals, and the people around you.',
      },
      {
        label: 'Family',
        desc: 'A supportive community where every student is welcomed and every family belongs.',
      },
      {
        label: 'Bravery',
        desc: 'The courage to try, make mistakes, face challenges, and keep going anyway.',
      },
    ],
    foundationEyebrow: 'Our Foundation',
    foundationHeading: 'Built on a Legacy of Excellence',
    foundationBody:
      "LBMAA is affiliated with the Ernie Reyes' West Coast World Martial Arts Association (WCWMA) — founded by Master Ernie Reyes Sr. and Master Tony Thompson. Their goal was simple: impact and empower as many lives as possible through martial arts.",
    founders: [
      {
        name: 'Master Ernie Reyes Sr.',
        role: 'WCWMA Founder',
        bio: "Master Reyes co-founded the WCWMA system with the belief that martial arts is one of the greatest ways to create positive change in people's lives.",
      },
      {
        name: 'Master Tony Thompson',
        role: 'WCWMA Co-Founder',
        bio: 'Master Thompson trained alongside Master Reyes for decades, helping build the WCWMA system from the ground up — a shared journey built on respect, discipline, and a commitment to impacting lives.',
      },
    ],
  },
  facilities: {
    eyebrow: 'Our Facilities',
    heading: 'A Space Designed for Learning',
    sub: 'Our training space is purpose-built for martial arts education — safe, clean, and welcoming for students of all ages and experience levels.',
    featuresEyebrow: 'What We Offer',
    featuresHeading: "Everything You'd Expect. Nothing You Wouldn't.",
    features: [
      {
        label: 'Fully Padded Training Area',
        desc: 'Floor-to-wall padding throughout the training floor for safe practice at every level.',
      },
      {
        label: 'Dedicated Little Dragons Zone',
        desc: 'A separate, smaller mat area sized for our youngest students to help them feel comfortable.',
      },
      {
        label: 'Clean Changing Areas',
        desc: 'Separate changing rooms for students before and after class.',
      },
      {
        label: 'Observation Area',
        desc: 'A dedicated seating area for parents to watch class comfortably from the side.',
      },
      {
        label: 'Air Conditioned',
        desc: 'Year-round climate control so every class is comfortable regardless of season.',
      },
      {
        label: 'Safe Neighborhood Location',
        desc: 'Conveniently located in Los Banos with easy parking and a safe, accessible setting.',
      },
    ],
    galleryEyebrow: 'Gallery',
    galleryHeading: 'See the Space',
  },
  instructors: {
    masterEyebrow: 'Master Instructor',
    stormSubtitle: 'Super Team of Role Models',
    stormTagline:
      'These students go above and beyond every single day — passing our values and traditions to the next generation of martial artists.',
    aboutMeHeading: 'About Me',
    aboutMe: [
      "I didn't plan on five black belts. I just kept finding things worth learning. That's part of why I teach the way I do. I can pull from different systems to find what actually clicks for each student, not just what works in general.",
      "What ten years in the Marines gave me as an instructor wasn't toughness to hand down. It was patience. Knowing how to hold a real expectation and still make someone feel like they can meet it.",
      "That photo is from a tournament. Those are my students. They've trained hard, they're nervous, and look at their faces. That's what I'm here for. Every single class.",
    ],
    quoteEyebrow: 'Why I do this',
    quote:
      '"I\'m not building fighters. I\'m building kids who walk a little taller on the way to school."',
    stats: [
      { label: 'Years Training', sub: 'Started at age 9' },
      { label: 'Degree Black Belt', sub: 'WCWMA system' },
      { label: 'Degree Black Belt', sub: 'Marine Corps Martial Arts' },
      { label: 'Est.', sub: 'LBMAA founded' },
    ],
    beltRanks: [
      'Green Belt',
      'Blue Belt',
      'Red Belt',
      'Purple Belt',
      'Brown Belt',
    ],
  },
  reviews: {
    eyebrow: 'What Families Say',
    heading: 'Real Reviews From the Community',
    sub: 'Every review below comes from a parent or student who was exactly where you are right now — wondering if this is the right place.',
    overallRating: 'Overall Rating',
    review: 'review',
    reviews: 'reviews',
    loadMore: 'Load more reviews',
    moreLabel: (n: number) => `${n} more ${n === 1 ? 'review' : 'reviews'}`,
    errLoad: 'Unable to load reviews. Please try again later.',
    noReviews: 'No reviews yet — check back soon.',
    defaultName: 'LBMAA Parent',
    timeToday: 'Today',
    time1Day: '1 day ago',
    timeDays: (d: number) => `${d} days ago`,
    timeWeeks: (w: number) => `${w} week${w > 1 ? 's' : ''} ago`,
    timeMonths: (m: number) => `${m} month${m > 1 ? 's' : ''} ago`,
    timeYears: (y: number) => `${y} year${y > 1 ? 's' : ''} ago`,
  },
} as const;

type T = { [K in keyof typeof EN]: Translated<(typeof EN)[K]> };

type Translated<V> = V extends (...args: infer A) => infer R
  ? (...args: A) => R
  : V extends readonly (infer E)[]
    ? readonly Translated<E>[]
    : V extends object
      ? { [P in keyof V]: Translated<V[P]> }
      : V extends string
        ? string
        : V;

const ES: T = {
  nav: {
    home: 'Inicio',
    about: 'Nosotros',
    programs: 'Programas',
    facilities: 'Instalaciones',
    instructors: 'Instructores',
    reviews: 'Reseñas',
    faq: 'Preguntas',
    contact: 'Contacto',
    bookTrial: 'Reservar Clase de Prueba',
    parentLogin: 'Acceso Padres',
    close: 'Cerrar',
    menu: 'Menú',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    switchLang: 'English',
  },
  common: {
    bookTrial: 'Reservar Clase de Prueba',
    getStarted: 'Comienza Ya',
    trialOffer: 'Oferta de Prueba de Una Semana',
    trialBody:
      'Probar nuestro programa cuesta $30 con un uniforme incluido por 5 días consecutivos de entrenamiento. Ven, conoce a los instructores y deja que tu hijo pruebe una clase. Responderemos tus preguntas antes y después de la clase.',
    guideYou: 'Te guiaremos en el proceso',
    comingSoon: 'Próximamente',
    viewAll: 'Ver todos →',
    viewAllPrograms: 'Ver todos los programas →',
  },
  home: {
    heroHeading1: 'Cinturones Negros',
    heroHeading2: 'en Artes Marciales.',
    heroHeading3: 'Cinturones Negros en la Vida.',
    heroSub:
      'Un estilo de vida más activo y saludable a través de las artes marciales. Comienza tu camino al cinturón negro hoy. Hablamos inglés y español.',
    explorePrograms: 'Ver Programas',
    aboutEyebrow: 'Nosotros',
    aboutHeading1: 'Más Que Patadas',
    aboutHeading2: 'y Puñetazos.',
    aboutHeading3: 'Es un Estilo de Vida.',
    aboutP1:
      'El entrenamiento físico importa — tu hijo se vuelve más fuerte, más coordinado y más capaz. Sin embargo, lo que permanece con ellos es la disciplina para presentarse cuando algo se vuelve difícil, el respeto por las personas a su alrededor, y la confianza que viene con ganar un cinturón negro de artes marciales de Ernie Reyes West Coast World.',
    aboutP2:
      'Nuestra academia ha sido parte de un legado que abarca más de 40 años en la Asociación de Artes Marciales West Coast World de Ernie Reyes.',
    aboutLink: 'Nuestra historia completa →',
    firstVisitEyebrow: 'Tu Primera Visita',
    firstVisitHeading: 'Qué Esperar Cuando Llegues',
    step01Title: 'Contáctanos',
    step01Body:
      'Llámanos o llena un formulario rápido. Respondemos preguntas antes de que entres por la puerta.',
    step02Title: 'Observa una Clase Real',
    step02Body:
      'Tu hijo se une a estudiantes de su edad y nivel. Tú te sientas al lado y observas — sin presión, solo un vistazo a lo que hacemos.',
    step03Title: 'Pregúntanos Todo',
    step03Body:
      'Después de clase, habla con un instructor. No hay compromiso — solo queremos que te sientas cómodo.',
    programsEyebrow: 'Nuestros Programas',
    programsHeading: 'Entrenamiento para Cada Etapa de la Vida',
    valuesEyebrow: 'Lo Que Defendemos',
    valuesHeading: 'Nuestros Valores de Artes Marciales',
    programs: [
      {
        name: 'Pequeños Dragones',
        ages: 'Edades 4–7',
        desc: 'Clases divertidas y estructuradas que desarrollan la escucha, coordinación, disciplina temprana y condición física.',
      },
      {
        name: 'Programa Juvenil',
        ages: 'Edades 8–17',
        desc: 'Clases dinámicas y orientadas a metas que desarrollan defensa personal, disciplina, condición física, coordinación, confianza, y una mente y cuerpo fuertes.',
      },
      {
        name: 'Rendimiento Extremo',
        ages: 'Todas las Edades',
        desc: 'Entrenamiento avanzado solo por invitación para estudiantes seleccionados en gimnasia, armas, formas creativas y rendimiento individual y en equipo.',
      },
    ],
    comingSoon: [
      {
        name: 'Adultos',
        ages: 'Edades 18+',
        desc: 'Clases dinámicas y orientadas a metas que desarrollan defensa personal, fuerza, condición física, confianza y alivio del estrés.',
      },
      {
        name: 'Kickboxing de Resistencia',
        ages: 'Edades 16+',
        desc: 'Clases de kickboxing cardio de alta energía enfocadas en desarrollar resistencia, fuerza, coordinación y condición física general.',
      },
    ],
    values: [
      {
        label: 'Honor',
        desc: 'Actuamos con integridad dentro y fuera del tatami.',
      },
      {
        label: 'Lealtad',
        desc: 'Apoyamos a nuestra escuela, nuestro equipo y a los demás.',
      },
      { label: 'Familia', desc: 'Entrenamos juntos y crecemos juntos.' },
      {
        label: 'Valentía',
        desc: 'Enfrentamos cada desafío y nunca nos rendimos.',
      },
    ],
  },
  programs: {
    eyebrow: 'Nuestros Programas',
    heading: 'Entrenamiento para Cada Etapa de la Vida',
    subheading:
      'Desde nuestros más jóvenes Pequeños Dragones hasta los competidores avanzados de Rendimiento Extremo — cada programa está construido alrededor de lo que los estudiantes en esa etapa realmente necesitan.',
    expandingEyebrow: 'En Expansión',
    expandingHeading: 'Más Programas en Camino',
    beltEyebrow: 'Sistema de Cinturones',
    beltHeading: 'Tu Camino al Cinturón Negro',
    beltBody:
      'Cada promoción se gana — basada en habilidad demostrada, esfuerzo y carácter. Los estudiantes se examinan cuando su instructor dice que están listos, no en un horario fijo.',
    programs: [
      {
        name: 'Pequeños Dragones',
        ages: 'Edades 4–7',
        summary:
          'Clases divertidas y estructuradas que desarrollan la escucha, coordinación, disciplina temprana y condición física. Nuestros estudiantes más jóvenes aprenden en un ambiente apropiado para su edad donde se construye la confianza y el carácter junto con los fundamentos de las artes marciales.',
        highlights: [
          'Clases estructuradas diseñadas para jóvenes aprendices',
          'Desarrolla habilidades de escucha, coordinación y disciplina temprana',
          'Currículo apropiado para la edad en un ambiente seguro y divertido',
          'Desarrolla la condición física y las habilidades motoras',
          'Grupos pequeños para atención individualizada',
        ],
      },
      {
        name: 'Programa Juvenil',
        ages: 'Edades 8–17',
        summary:
          'Clases dinámicas y orientadas a metas que desarrollan defensa personal, disciplina, condición física, coordinación, confianza, y una mente y cuerpo fuertes. Los estudiantes siguen una clara progresión de cinturones con un currículo que crece con ellos durante los años de escuela y adolescencia.',
        highlights: [
          'Entrenamiento orientado a metas en defensa personal y artes marciales',
          'Desarrolla disciplina, condición física y coordinación',
          'Desarrolla confianza y una mente y cuerpo fuertes',
          'Clara progresión de cinturones con estándares de habilidad definidos',
          'Grupos de clase separados para jóvenes y adolescentes',
        ],
      },
      {
        name: 'Rendimiento Extremo',
        ages: 'Todas las Edades',
        summary:
          'Entrenamiento avanzado solo por invitación para estudiantes seleccionados en gimnasia, armas, formas creativas y rendimiento individual y en equipo. Los estudiantes seleccionados entrenan con mayor intensidad y compiten en eventos regionales y nacionales.',
        highlights: [
          'Solo por invitación — los estudiantes son seleccionados por los instructores',
          'Entrenamiento avanzado en gimnasia y acrobacia',
          'Currículo de armas y formas creativas',
          'Preparación para rendimiento individual y en equipo',
          'Oportunidades de equipo competitivo en eventos regionales y nacionales',
        ],
      },
    ],
    comingSoon: [
      {
        name: 'Adultos',
        ages: 'Edades 18+',
        desc: 'Clases dinámicas y orientadas a metas que desarrollan defensa personal, fuerza, condición física, confianza y alivio del estrés.',
      },
      {
        name: 'Kickboxing de Resistencia',
        ages: 'Edades 16+',
        desc: 'Clases de kickboxing cardio de alta energía enfocadas en desarrollar resistencia, fuerza, coordinación y condición física general.',
      },
    ],
    beltRanks: [
      'Blanco',
      'Amarillo',
      'Naranja',
      'Verde',
      'Azul',
      'Morado',
      'Rojo',
      'Rojo/Negro',
      'Café',
      'Café/Negro',
      'Cinturón Negro',
      'Rangos Dan',
    ],
  },
  faq: {
    eyebrow: 'Preguntas Frecuentes',
    heading: 'Todo Lo Que Necesitas Saber',
    sub: 'Si no encuentras tu respuesta aquí, por favor contáctanos. Estamos aquí para ayudarte en el camino.',
    ctaEyebrow: 'Estamos aquí para ayudar',
    ctaHeading: '¿Todavía tienes preguntas?',
    ctaBody:
      'Contáctanos y te responderemos rápidamente. Sin presión, sin compromiso — solo una conversación honesta.',
    contactUs: 'Contáctanos',
    faqs: [
      {
        category: 'Para Comenzar',
        subtitle: 'Todo lo que necesitas para entrar por la puerta',
        items: [
          {
            q: '¿Necesita mi hijo alguna experiencia?',
            a: 'Para nada. Cada estudiante comienza desde el principio. Nuestros instructores están entrenados para trabajar con estudiantes de todos los niveles, desde el primer día.',
          },
          {
            q: '¿Qué debe usar mi hijo en la clase de prueba?',
            a: 'Solo ropa deportiva cómoda. No se necesita uniforme, equipo ni implementos. Nosotros proporcionamos todo para la primera clase.',
          },
          {
            q: '¿Cómo funciona la semana de prueba?',
            a: 'Tú y tu hijo vienen, conocen a los instructores y tu hijo se une a una clase real con estudiantes de su edad y nivel. Tú observas desde el lado. La prueba cuesta $30 por 5 días consecutivos de entrenamiento, e incluye un uniforme. Después responderemos cualquier pregunta que tengas.',
          },
          {
            q: '¿A qué edad puede comenzar mi hijo?',
            a: 'Nuestro programa más joven, Pequeños Dragones, comienza a los 4 años. Tenemos programas para todas las edades. Nos aseguraremos de elegir el programa correcto para tu hijo.',
          },
        ],
      },
      {
        category: 'Programas y Horario',
        subtitle: 'Qué ofrecemos y cuándo son las clases',
        items: [
          {
            q: '¿Qué días y horarios son las clases?',
            a: 'Las clases son de lunes a viernes de 4:00 PM a 9 PM. Cerramos los sábados y domingos. Los horarios específicos varían según la edad y el rango de cinturón.',
          },
          { q: '¿Ofrecen clases para adultos?', a: 'No. Próximamente.' },
        ],
      },
      {
        category: 'Inscripción y Compromiso',
        subtitle: 'Sin contratos, sin presión',
        items: [
          {
            q: '¿Hay contratos a largo plazo?',
            a: 'Nuestro objetivo es asegurar que cada niño llegue a ser cinturón negro. Queremos que las familias estén aquí porque les encanta y ven el cambio positivo en su hijo.',
          },
          {
            q: '¿Cuánto cuesta?',
            a: 'La mensualidad varía según el programa.',
          },
          {
            q: '¿Necesito comprar un uniforme de inmediato?',
            a: 'No. Los uniformes están incluidos en la primera clase de prueba.',
          },
        ],
      },
      {
        category: 'Progresión de Cinturones',
        subtitle: 'Cómo funcionan los rangos y las promociones',
        items: [
          {
            q: '¿Cómo funcionan las promociones de cinturón?',
            a: 'Los estudiantes son promovidos cuando su instructor determina que están listos — basándose en la habilidad demostrada, el esfuerzo y el carácter.',
          },
          {
            q: '¿Cuánto tiempo lleva ganar un cinturón negro?',
            a: 'Varía significativamente según el estudiante. Un estudiante dedicado que entrena consistentemente podría ganar un cinturón negro en 4 a 7 años. Pero el camino es el punto — cada rango representa un crecimiento real.',
          },
          {
            q: '¿Hay presión para examinarse o avanzar rápidamente?',
            a: 'Para nada. Nunca aceleramos las promociones. Los estudiantes avanzan cuando genuinamente están listos, lo que hace que cada cinturón sea significativo.',
          },
        ],
      },
      {
        category: 'Seguridad',
        subtitle: 'Lo que hacemos para mantener a cada estudiante seguro',
        items: [
          {
            q: '¿Son las artes marciales seguras para los niños pequeños?',
            a: 'La seguridad es lo primero que enseñamos. Todas las clases son supervisadas por instructores certificados. Los estudiantes progresarán lentamente del sparring sin contacto al sparring con contacto.',
          },
          {
            q: '¿Los instructores tienen antecedentes verificados?',
            a: 'Sí. Todos los instructores de LBMAA tienen antecedentes verificados y están certificados a través de la ERWCMAA.',
          },
          {
            q: 'Mi hijo es tímido o tiene ansiedad. ¿Es este un buen lugar para él?',
            a: 'Muchos de nuestros estudiantes comienzan siendo tímidos o ansiosos — y es exactamente por eso que se benefician tanto. Nuestros instructores son pacientes y alentadores. Hemos visto transformaciones notables en estudiantes que luchaban con la confianza.',
          },
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'Pruébalo',
    heading: 'Oferta Especial de Prueba',
    heroPre: 'Actualmente ofrecemos una prueba de cinco días por',
    heroPrice: '$30 por niño',
    heroPost:
      '. Esto incluye un uniforme para quedarse y 5 días consecutivos de entrenamiento. Ven a ver si nuestra academia es la adecuada para ti y tu familia.',
    formHeading: 'Reserva Tu Prueba',
    formSub:
      'Por favor completa la siguiente información y confirmaremos dentro de un día hábil la primera clase de tu hijo.',
    yourName: 'Tu nombre',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    childrenLabel: 'Niños que se inscriben',
    childrenSub: 'Usamos la edad para ubicar a tu hijo en el programa correcto',
    childName: 'Nombre del niño',
    age: 'Edad',
    ageLabel: 'Edad',
    addChild: 'Agregar otro niño',
    notesLabel: 'Preguntas, notas o algo que debamos saber',
    notesOptional: '(opcional)',
    notesPlaceholder:
      'Por favor comparte cualquier pregunta, nota o información médica que debamos saber para apoyar mejor a tu hijo.',
    submitting: 'Enviando…',
    submit: 'Reservar Clase de Prueba',
    required: '* Obligatorio. Nunca compartiremos tu información.',
    consentPre: 'Al enviar este formulario, aceptas nuestra ',
    consentLink: 'Política de Privacidad',
    consentPost: '.',
    successHeading: 'Solicitud de Prueba Recibida',
    successBody:
      'Nos pondremos en contacto en 24 horas para confirmar la primera clase de tu hijo y responder cualquier pregunta.',
    locationEyebrow: 'Ubicación',
    hoursEyebrow: 'Horario de Clases',
    contactEyebrow: 'Teléfono y Correo',
    classTimeNote:
      'El horario específico de clase de tu hijo depende de su programa.',
    joinFamily: 'Esperamos que te unas a nuestra familia de artes marciales.',
    hours: [
      { day: 'Lun – Vie', time: '4:00 – 9:00 PM' },
      { day: 'Fines de Semana', time: 'Cerrado' },
      { day: 'Días Festivos', time: 'Cerrado' },
    ],
    errName: 'Por favor escribe el nombre completo del padre, madre o tutor.',
    errPhone: 'Por favor proporciona un número de teléfono.',
    errPhoneInvalid:
      'Por favor ingresa un número de teléfono de EE. UU. de 10 dígitos válido.',
    errEmailInvalid:
      'Por favor ingresa una dirección de correo electrónico válida.',
    errChildCount:
      'Por favor agrega entre uno y seis niños. Para inscribir a más, contáctanos directamente.',
    errChildFields: 'Cada niño debe tener un nombre y una edad.',
    errAgeRange:
      'Actualmente inscribimos edades 4–17. Por favor contáctanos directamente para otras consultas.',
    errSubmit:
      'No se puede enviar en este momento. Por favor intenta de nuevo o llámanos directamente.',
    errRateLimit:
      'Recibimos una solicitud tuya hace poco. Por favor espera un momento e intenta de nuevo, o llámanos directamente.',
    programLittle: 'Pequeños Dragones · edades 4–7',
    programYouth: 'Programa Juvenil · edades 8–17',
    programAgeError: 'La edad debe ser 4–17',
  },
  footer: {
    brandDesc:
      'Los Banos Martial Arts Academy desarrolla campeones en la vida — física, mental y espiritualmente.',
    programs: 'Programas',
    academy: 'Academia',
    getInTouch: 'Contáctanos',
    bookTrial: 'Reservar Clase de Prueba',
    copyright: '© 2026 Los Banos Martial Arts Academy',
    programLinks: [
      'Pequeños Dragones (Edades 4–7)',
      'Programa Juvenil (Edades 8–17)',
      'Rendimiento Extremo (Todas las Edades)',
    ],
    academyLinks: [
      'Sobre Nosotros',
      'Nuestros Instructores',
      'Instalaciones',
      'Reseñas',
      'Preguntas Frecuentes',
    ],
    hoursMon: 'Lun–Vie: 4:00 – 9:00 PM',
    hoursWeekend: 'Fines de Semana: Cerrado',
    hoursHoliday: 'Días Festivos: Cerrado',
  },
  about: {
    eyebrow: 'Nosotros',
    heading: 'Creando Campeones en la Vida',
    sub: 'Los Banos Martial Arts Academy ayuda a los estudiantes a desarrollar confianza, disciplina, respeto, enfoque, condición física y habilidades de defensa personal. Seguimos el sistema WCWMA de Ernie Reyes — a través de un sistema probado que es emocionante, educativo, dinámico y empoderador.',
    missionEyebrow: 'Nuestra Misión',
    missionQuote:
      '"Para enseñar y empoderar a estudiantes de todas las edades desarrollando cinturones negros en la vida."',
    approachEyebrow: 'Nuestro Enfoque',
    approachHeading: 'Nuestro Enfoque',
    pillars: [
      {
        n: '01',
        title: 'Físicamente',
        body: 'Entrenamos el cuerpo a través del movimiento, la fuerza, la coordinación, la flexibilidad y el acondicionamiento — construyendo una condición física que lleva a los estudiantes mucho más allá del tatami.',
      },
      {
        n: '02',
        title: 'Mentalmente',
        body: 'Desarrollamos enfoque, autocontrol, paciencia y disciplina — afilando la mente para que los estudiantes puedan mantener la calma, pensar con claridad y superar los desafíos.',
      },
      {
        n: '03',
        title: 'Espiritualmente',
        body: 'Cultivamos la fuerza interior, la humildad y un sentido de propósito — ayudando a los estudiantes a conectar con sus valores, elevar a los demás y vivir con integridad.',
      },
    ],
    teachEyebrow: 'Lo Que Enseñamos',
    teachHeading: 'Un Sistema Integral',
    teachBody:
      'El sistema WCWMA combina artes marciales tradicionales y modernas — creando estudiantes versátiles que pueden adaptarse a diferentes estilos. Los estudiantes entrenan sus cuerpos y aprenden a conducirse con confianza, disciplina y propósito.',
    disciplines: [
      'Defensa personal práctica',
      'Tae Kwon Do Coreano',
      'Boxeo y kickboxing',
      'Lucha y pelea en el suelo',
      'Combate con palo y cuchillo filipino',
      'Armas japonesas y chinas',
      'Condición física y acondicionamiento',
      'Desarrollo del carácter',
    ],
    valuesEyebrow: 'Valores Fundamentales',
    valuesHeading: 'Lo Que Defendemos',
    values: [
      {
        label: 'Honor',
        desc: 'Hacer lo correcto con respeto, honestidad y responsabilidad — dentro y fuera del tatami.',
      },
      {
        label: 'Lealtad',
        desc: 'Mantener el compromiso con tu entrenamiento, tus metas y las personas a tu alrededor.',
      },
      {
        label: 'Familia',
        desc: 'Una comunidad de apoyo donde cada estudiante es bienvenido y cada familia pertenece.',
      },
      {
        label: 'Valentía',
        desc: 'El coraje de intentar, cometer errores, enfrentar desafíos y seguir adelante de todas formas.',
      },
    ],
    foundationEyebrow: 'Nuestra Base',
    foundationHeading: 'Construida sobre un Legado de Excelencia',
    foundationBody:
      'LBMAA está afiliada con la Asociación de Artes Marciales West Coast World de Ernie Reyes (WCWMA) — fundada por el Maestro Ernie Reyes Sr. y el Maestro Tony Thompson. Su objetivo era simple: impactar y empoderar el mayor número de vidas posible a través de las artes marciales.',
    founders: [
      {
        name: 'Master Ernie Reyes Sr.',
        role: 'WCWMA Founder',
        bio: 'El Maestro Reyes cofundó el sistema WCWMA con la creencia de que las artes marciales son una de las mejores formas de crear un cambio positivo en la vida de las personas.',
      },
      {
        name: 'Master Tony Thompson',
        role: 'WCWMA Co-Founder',
        bio: 'El Maestro Thompson entrenó junto al Maestro Reyes durante décadas, ayudando a construir el sistema WCWMA desde cero — un camino compartido basado en el respeto, la disciplina y el compromiso de impactar vidas.',
      },
    ],
  },
  facilities: {
    eyebrow: 'Nuestras Instalaciones',
    heading: 'Un Espacio Diseñado para el Aprendizaje',
    sub: 'Nuestro espacio de entrenamiento está diseñado específicamente para la educación en artes marciales — seguro, limpio y acogedor para estudiantes de todas las edades y niveles.',
    featuresEyebrow: 'Lo Que Ofrecemos',
    featuresHeading: 'Todo Lo Que Esperarías. Nada Que No.',
    features: [
      {
        label: 'Área de Entrenamiento Completamente Acolchada',
        desc: 'Acolchado de suelo a pared en todo el tatami para una práctica segura en todos los niveles.',
      },
      {
        label: 'Zona Exclusiva para Pequeños Dragones',
        desc: 'Un área de tatami separada y más pequeña dimensionada para nuestros estudiantes más jóvenes para que se sientan cómodos.',
      },
      {
        label: 'Vestuarios Limpios',
        desc: 'Vestuarios separados para estudiantes antes y después de la clase.',
      },
      {
        label: 'Área de Observación',
        desc: 'Un área de asientos dedicada para que los padres vean la clase cómodamente desde el lado.',
      },
      {
        label: 'Aire Acondicionado',
        desc: 'Control de clima durante todo el año para que cada clase sea cómoda independientemente de la temporada.',
      },
      {
        label: 'Ubicación en Zona Segura',
        desc: 'Ubicado convenientemente en Los Banos con fácil estacionamiento y un entorno seguro y accesible.',
      },
    ],
    galleryEyebrow: 'Galería',
    galleryHeading: 'Conoce el Espacio',
  },
  instructors: {
    masterEyebrow: 'Instructor Maestro',
    stormSubtitle: 'Super Team of Role Models',
    stormTagline:
      'Estos estudiantes van más allá todos los días — transmitiendo nuestros valores y tradiciones a la próxima generación de artistas marciales.',
    aboutMeHeading: 'Sobre Mí',
    aboutMe: [
      'No planeé tener cinco cinturones negros. Simplemente seguí encontrando cosas que valía la pena aprender. En parte por eso enseño como lo hago. Puedo tomar de diferentes sistemas para encontrar lo que realmente hace clic para cada estudiante, no solo lo que funciona en general.',
      'Lo que diez años en los Marines me dio como instructor no fue dureza para transmitir. Fue paciencia. Saber cómo mantener una expectativa real y aun así hacer que alguien sienta que puede alcanzarla.',
      'Esa foto es de un torneo. Esos son mis estudiantes. Entrenaron duro, están nerviosos, y mira sus caras. Para eso estoy aquí. Cada. Clase.',
    ],
    quoteEyebrow: 'Por Qué Hago Esto',
    quote:
      '"No estoy formando peleadores. Estoy formando niños que caminan un poco más erguidos de camino a la escuela."',
    stats: [
      { label: 'Años Entrenando', sub: 'Comenzó a los 9 años' },
      { label: 'Grado Cinturón Negro', sub: 'Sistema WCWMA' },
      { label: 'Grado Cinturón Negro', sub: 'Artes Marciales de la Marina' },
      { label: 'Est.', sub: 'Fundación de LBMAA' },
    ],
    beltRanks: [
      'Cinturón Verde',
      'Cinturón Azul',
      'Cinturón Rojo',
      'Cinturón Morado',
      'Cinturón Café',
    ],
  },
  reviews: {
    eyebrow: 'Lo Que Dicen las Familias',
    heading: 'Reseñas Reales de la Comunidad',
    sub: 'Cada reseña a continuación proviene de un padre o estudiante que estuvo exactamente donde tú estás ahora — preguntándose si este es el lugar correcto.',
    overallRating: 'Calificación General',
    review: 'reseña',
    reviews: 'reseñas',
    loadMore: 'Cargar más reseñas',
    moreLabel: (n: number) => `${n} ${n === 1 ? 'reseña' : 'reseñas'} más`,
    errLoad:
      'No se pueden cargar las reseñas. Por favor intenta de nuevo más tarde.',
    noReviews: 'Aún no hay reseñas — vuelve pronto.',
    defaultName: 'Padre de LBMAA',
    timeToday: 'Hoy',
    time1Day: 'Hace 1 día',
    timeDays: (d: number) => `Hace ${d} días`,
    timeWeeks: (w: number) => `Hace ${w} ${w === 1 ? 'semana' : 'semanas'}`,
    timeMonths: (m: number) => `Hace ${m} ${m === 1 ? 'mes' : 'meses'}`,
    timeYears: (y: number) => `Hace ${y} ${y === 1 ? 'año' : 'años'}`,
  },
};

export const translations: Record<Lang, T> = { en: EN, es: ES };

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
