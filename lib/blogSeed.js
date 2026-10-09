// FILE: lib/blogSeed.js
// ─────────────────────────────────────────────────────────────────────────────
// The blog's starting content: the first five articles, authors, categories
// and the end-of-article text.
//
// Once the CMS is connected (see BLOG-CMS-SETUP.md), this file is only used
// once, to copy everything into the CMS. After that you edit articles in the
// CMS at /studio, not here. Until the CMS is connected, the blog shows what's
// in this file, so the site keeps working in between.
//
// Price numbers come from the vet_prices table (pulled Oct 8, 2026).
// "Typical" = the middle half of clinics (25th to 75th percentile).
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_AUTHORS = [
  { key: "brandon", name: "Brandon", role: "Founder, PetParrk", bio: "" },
  { key: "susan", name: "Susan", role: "Contributor, PetParrk", bio: "" },
  { key: "team", name: "The PetParrk team", role: "PetParrk", bio: "" },
];

export const SEED_CATEGORIES = [
  { key: "vet-costs", label: "Vet costs" },
  { key: "dog-health", label: "Dog health" },
  { key: "working-with-your-vet", label: "Working with your vet" },
  { key: "life-in-california", label: "Life in California" },
];

// Shown at the end of every article (editable in the CMS under Blog settings).
// The end box points readers to the product: the title and optional text come
// from here; the sentence after it and the button come from the launch switch
// in lib/blogPosts.js, so they change by themselves on launch day.
export const SEED_SETTINGS = {
  bylinePrefix: "By:",
  endNoteTitle: "Know what you'll pay before you go.",
  endNoteText: "",
  disclaimerTitle: "A note on this article",
  disclaimerText:
    "This is general information, not veterinary advice. Prices change, and every dog is different. Your vet knows your dog — always follow their guidance, and confirm prices with the clinic before you book.",
};

export const SEED_POSTS = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "dog-teeth-cleaning-cost-california",
    crumb: "Dental cleaning cost",
    featured: true,
    category: "vet-costs",
    topic: "Dental",
    title: "How much does a dog teeth cleaning cost in California?",
    description:
      "Most California clinics charge $650 to $1,300 for a dog dental cleaning. Real prices from 686 clinics, what drives the bill, and what to ask before you book.",
    dek: "The same cleaning can cost $200 at one California clinic and $5,000 at another. Here's what most people actually pay, and why.",
    author: "brandon",
    published: "2026-10-08",
    cover: { label: "Dental cleaning", typicalLow: 650, typicalHigh: 1300, low: 200, high: 5000 },
    glance: [
      { value: "$650–$1,300", label: "What most clinics charge" },
      { value: "$900", label: "Middle price" },
      { value: "686", label: "California clinics" },
    ],
    blocks: [
      { type: "p", text: "If your vet just told you your dog needs a dental cleaning, you probably had two thoughts. First: is it really that bad? Second: what is this going to cost me?" },
      // [BRANDON] Optional: one or two sentences about the first dental quote
      // you got for your own dog, as its own { type: "p" } block right here.
      { type: "p", text: "The second one is surprisingly hard to answer. Ask three clinics and you can get three very different numbers, and almost none of them put prices online. So we started calling clinics and writing down what they told us. This is what we learned from 686 of them: the real ranges, why they're so far apart, and what to ask so nothing surprises you at pickup." },

      { type: "h2", text: "The short answer" },
      { type: "p", text: "Most California clinics charge **$650 to $1,300** for a dog dental cleaning with anesthesia. The middle price is $900." },
      { type: "range", label: "Dog dental cleaning with anesthesia, California", low: 200, typicalLow: 650, typicalHigh: 1300, high: 5000, note: "Quotes from 686 California clinics. The typical range is the middle half of clinics." },
      { type: "p", text: "But the full spread is wild. The lowest real quote we've seen is about $200. The highest is $5,000 — roughly 25 times as much, for what sounds like the same thing." },
      {
        type: "table",
        caption: "Dog dental cleaning prices by region",
        columns: ["Region", "Typical range", "Middle price", "Clinics"],
        rows: [
          ["Northern California", "$700–$1,200", "$900", "124"],
          ["Southern California", "$600–$1,300", "$900", "523"],
          ["All of California", "$650–$1,300", "$900", "686"],
        ],
      },
      { type: "p", text: "The middle price is the same $900 in both halves of the state. What changes is the spread: Southern California prices are more spread out ($600–$1,300 vs $700–$1,200), so shopping around pays off more there." },
      { type: "p", text: "These are prices clinics quoted before the procedure. About **one in five** quoted a \"starting at\" price, which means the final bill can land higher — mostly because of extractions. More on that below." },

      { type: "h2", text: "Why the same cleaning costs such different amounts" },
      { type: "p", text: "Mostly, it isn't the same cleaning. Two quotes can describe very different things, and the clinic rarely spells that out on the phone. Here's what moves the price:" },
      {
        type: "ul",
        items: [
          "**What's bundled in.** One clinic's quote includes bloodwork, X-rays and take-home pain meds. Another quotes the cleaning alone and adds the rest later.",
          "**Your dog's mouth.** A young dog with light tartar is quick. An older dog with gum disease may need X-rays, extractions and much more time under anesthesia.",
          "**Your dog's size and age.** Bigger dogs need more anesthesia and medication. Seniors often need extra monitoring or tests first.",
          "**The type of clinic.** Corporate chains, independent practices and specialty hospitals price very differently, even a few blocks apart.",
          "**Where you live.** Rent and staff costs vary a lot across California, and prices follow.",
        ],
      },
      { type: "p", text: "So when one place says $600 and another says $2,000, don't assume one is ripping you off. Ask what each price includes. The six questions further down make that easy." },

      { type: "h2", text: "What a real dental cleaning includes" },
      { type: "p", text: "A full veterinary dental cleaning is done under general anesthesia. Vets sometimes call it a COHAT, short for comprehensive oral health assessment and treatment. It usually covers:" },
      {
        type: "ol",
        items: [
          "A pre-anesthetic exam, and often bloodwork, to make sure anesthesia is safe.",
          "General anesthesia, with a tech monitoring heart rate, breathing and blood pressure the whole time.",
          "Scaling above **and below** the gumline. Below is where dental disease does its damage.",
          "Polishing, to smooth the teeth so plaque has a harder time sticking.",
          "Probing and charting every tooth, looking for pockets, fractures and loose teeth.",
          "Dental X-rays, ideally. Much of a dog's tooth sits below the gum, where nobody can see it without imaging.",
          "Extractions or other treatment, if something is found.",
        ],
      },
      { type: "p", text: "This is why the work isn't cheap. Most dogs show some sign of dental disease by age three, and a lot of it hides below the gumline." },

      { type: "h2", text: "Anesthesia-free cleanings: cheaper, but not the same thing" },
      { type: "p", text: "Some clinics and groomers offer cleanings without anesthesia. In Southern California, where most of our quotes for them come from, they typically run **$200 to $285** — about a quarter of a full cleaning. It's easy to see the appeal, especially if anesthesia makes you nervous." },
      { type: "p", text: "Here's the honest tradeoff. Without anesthesia, nobody can safely clean below the gumline, take X-rays or probe every tooth. The visible tartar comes off and the teeth look better. The disease underneath stays put, and now it's harder to notice." },
      { type: "p", text: "The American Veterinary Dental College considers anesthesia-free cleaning below the standard of care for this reason. Some places offer it as upkeep between full cleanings, but it shouldn't replace one. If you're worried about anesthesia, tell your vet. They can explain the risks for your dog's age and health, and what they do to keep it safe." },
      // [BRANDON] Optional: one honest sentence about your own anesthesia decision.

      { type: "h2", text: "The add-ons that change your final bill" },
      { type: "p", text: "The quote is where the bill starts. These are the line items that most often get added:" },
      {
        type: "table",
        columns: ["Add-on", "What it is", "What to expect"],
        rows: [
          ["Exam before the cleaning", "Your vet checks your dog over and decides on the plan", "Often a separate visit. Most California clinics charge $65–$92 for an exam"],
          ["Pre-anesthetic bloodwork", "Checks liver and kidney function before anesthesia", "Included at some clinics, extra at others — ask"],
          ["Dental X-rays", "Shows roots and bone below the gumline", "Included at some clinics, extra at others — ask"],
          ["Extractions", "Removing damaged or infected teeth, priced per tooth", "Can add hundreds of dollars or more"],
          ["Take-home meds", "Pain relief, sometimes antibiotics", "Often bundled, sometimes extra"],
        ],
      },
      { type: "p", text: "Extractions are the big unknown. Nobody can say how many teeth need to come out until your dog is under anesthesia and the X-rays are done. That's why clinics give ranges. It's also why the next section matters." },

      { type: "h2", text: "Six questions to ask before you book" },
      { type: "p", text: "You don't need to be an expert. You just need to make two quotes comparable. Ask every clinic the same things:" },
      {
        type: "ol",
        items: [
          "**\"Can I get a written estimate with a low and high end?\"** Most clinics will do this. It's the single most useful thing you can ask for.",
          "**\"Is bloodwork included, or extra?\"**",
          "**\"Are dental X-rays included?\"** If a clinic doesn't take X-rays at all, that's worth knowing too.",
          "**\"How do you charge for extractions?\"** Per tooth? Does it depend on the tooth?",
          "**\"Will you call me before doing extractions?\"** Most clinics will. Asking upfront means no surprises at pickup.",
          "**\"Are pain meds and the follow-up visit included?\"**",
        ],
      },
      { type: "p", text: "Write the answers down side by side. A higher quote that includes everything can easily beat a lower one that doesn't." },


      { type: "h2", text: "How to spend less without cutting corners" },
      {
        type: "ul",
        items: [
          "**Compare at least two or three clinics.** With prices this spread out, a couple of phone calls can be worth hundreds of dollars.",
          "**Don't wait too long.** A cleaning on a mostly healthy mouth is the cheap version. Waiting until teeth are loose usually means extractions, and that's where bills climb.",
          "**Ask about payment plans.** Many clinics accept CareCredit or similar financing. Ask before the procedure, not at checkout.",
          "**Check your pet insurance policy.** Some plans cover dental illness, like extractions, but not routine cleanings. Read the dental section or call them.",
          "**Brush at home.** Even a few times a week slows tartar build-up and can stretch the time between cleanings. Dental chews with the VOHC seal help too.",
        ],
      },
      { type: "p", text: "One thing we wouldn't skip to save money: the X-rays and the anesthesia. They're how problems actually get found." },

      { type: "h2", text: "Common questions" },
      {
        type: "faq",
        items: [
          { q: "How often does a dog need a dental cleaning?", a: "Many dogs need one every one to two years. Small breeds often need them more often, since their teeth are crowded. Your vet can tell you based on what they see at the yearly exam." },
          { q: "Is anesthesia safe for my dog?", a: "For most healthy dogs, the risk is low, and it's lowered further by bloodwork beforehand and monitoring during the procedure. Older dogs or dogs with health conditions may need extra precautions. Ask your vet what they do." },
          { q: "Why didn't the clinic give me an exact price?", a: "Because they can't know until they look. Extractions and X-ray findings change the work. A written estimate with a low and high end is the honest version of a quote." },
          { q: "Is the cheapest clinic a bad sign?", a: "Not necessarily. It may just quote fewer things upfront. Use the six questions above to find out what you're actually comparing." },
          { q: "How long does a dental cleaning take?", a: "Your dog usually goes in during the morning and comes home the same day. The procedure itself often takes one to a few hours, depending on what's found." },
        ],
      },

      { type: "p", text: "Dental work is one of those bills that grows the longer it waits, and not knowing the price is a very human reason to put it off. Hopefully you now have a real number in your head and a few good questions to ask. Your dog's mouth will thank you." },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "dog-spay-neuter-cost-california",
    crumb: "Spay and neuter cost",
    category: "vet-costs",
    topic: "Surgery",
    title: "How much does it cost to spay or neuter a dog in California?",
    description:
      "Most California clinics charge $550 to $950 to spay a dog and $460 to $850 to neuter one. Real prices from over 900 clinics, plus what's usually included.",
    dek: "Spaying usually costs about $100 more than neutering. Your dog's size can matter more than which one you're doing.",
    author: "brandon",
    published: "2026-10-08",
    cover: { label: "Spay surgery", typicalLow: 550, typicalHigh: 950, low: 200, high: 3000 },
    glance: [
      { value: "$550–$950", label: "Spay, most clinics" },
      { value: "$460–$850", label: "Neuter, most clinics" },
      { value: "900+", label: "California clinics" },
    ],
    blocks: [
      { type: "p", text: "Spaying or neutering is usually one of the first big decisions after you bring a dog home, and one of the first big bills. It's also one where quotes can be hundreds of dollars apart, sometimes between clinics in the same neighborhood." },
      // [BRANDON] Optional: a sentence about spaying or neutering your own dog.
      { type: "p", text: "We gathered spay and neuter prices from more than 900 California clinics to make sense of it. Here's what most people pay, why the numbers jump around so much, and how to compare quotes without feeling like you need a vet degree." },

      { type: "h2", text: "The short answer" },
      { type: "p", text: "Most California clinics charge **$550 to $950 to spay** a female dog and **$460 to $850 to neuter** a male. The middle prices are $740 and $650." },
      { type: "range", label: "Dog spay, California", low: 200, typicalLow: 550, typicalHigh: 950, high: 3000, note: "Quotes from 943 California clinics. The typical range is the middle half of clinics." },
      { type: "range", label: "Dog neuter, California", low: 200, typicalLow: 460, typicalHigh: 850, high: 2000, note: "Quotes from 960 California clinics. The highest quotes reach about $2,000." },
      {
        type: "table",
        caption: "Spay and neuter prices by region",
        columns: ["", "Northern California", "Southern California"],
        rows: [
          ["Spay, typical range", "$500–$840", "$545–$980"],
          ["Spay, middle price", "$700", "$750"],
          ["Neuter, typical range", "$470–$800", "$455–$850"],
          ["Neuter, middle price", "$604", "$650"],
        ],
      },
      { type: "p", text: "Southern California runs about $50 higher in the middle. The bigger story is at the edges: a few clinics quote two or three times the typical price." },

      { type: "h2", text: "Why spaying costs more than neutering" },
      { type: "p", text: "A spay is abdominal surgery. The vet removes the ovaries and usually the uterus through an incision in the belly. A neuter removes the testicles, which sit outside the body. It's quicker and less involved." },
      { type: "p", text: "More surgery time means more anesthesia, more monitoring and often a longer recovery. That's where the roughly $100 gap comes from." },

      { type: "h2", text: "What changes the price" },
      {
        type: "ul",
        items: [
          "**Your dog's weight.** This is the big one. Many clinics price by weight bracket, so a 90-pound dog can cost hundreds more than a 20-pound dog at the same clinic. Nearly **one in five** clinics quoted a \"starting at\" price, usually because of this.",
          "**Age and condition.** A female in heat, a pregnant dog, or an older or overweight dog makes surgery longer and riskier, and clinics charge for that.",
          "**Undescended testicles.** If a testicle hasn't dropped, the vet has to go into the abdomen to find it. That can cost close to a spay.",
          "**What's bundled in.** Bloodwork, IV fluids, pain meds, the cone and the recheck visit are included at some clinics and extra at others.",
          "**The type of clinic.** Nonprofit and low-cost spay/neuter clinics charge far less than full-service hospitals. Specialty hospitals charge the most.",
        ],
      },

      { type: "h2", text: "What's usually included" },
      { type: "p", text: "A full-service quote often covers the surgery, anesthesia, monitoring and a pain injection. These are the items to ask about, because they're the ones that vary:" },
      {
        type: "table",
        columns: ["Item", "Why it matters"],
        rows: [
          ["Pre-surgery bloodwork", "Checks that your dog's organs can handle anesthesia. Often required for older dogs."],
          ["IV fluids", "Supports blood pressure during surgery. Some clinics include it, some charge extra."],
          ["Take-home pain meds", "Your dog will be sore for a few days. Ask if meds are in the price."],
          ["Cone (e-collar)", "Stops licking at the incision. Small cost, but often extra."],
          ["Recheck visit", "A quick look at the incision after 10–14 days. Often free, sometimes not."],
          ["Microchip", "Some clinics offer it at the same time, for a fee."],
        ],
      },

      { type: "h2", text: "Low-cost options" },
      { type: "p", text: "If a full-service quote is out of reach, you have options. Many California counties and nonprofits run low-cost spay/neuter clinics, and some offer vouchers that cut the price further. Local SPCAs and humane societies are a good first call." },
      { type: "p", text: "Low-cost clinics do a high volume of these surgeries, and many do them very well. The tradeoff is usually fewer extras: bloodwork, pain meds and after-hours support may be limited. Ask what's included, just like you would anywhere else." },


      { type: "h2", text: "Five questions to ask before you book" },
      {
        type: "ol",
        items: [
          "**\"What's the price for a dog my dog's weight?\"** Give the exact weight. It changes the quote more than anything else.",
          "**\"Is pre-surgery bloodwork included or required?\"**",
          "**\"Does the price include pain meds, the cone and the recheck?\"**",
          "**\"Is there an extra charge if she's in heat?\"** (For spays.)",
          "**\"Can I get the estimate in writing?\"**",
        ],
      },

      { type: "h2", text: "Common questions" },
      {
        type: "faq",
        items: [
          { q: "When should I spay or neuter my dog?", a: "It depends on the dog. Many vets spay or neuter around six months, but for some large and giant breeds they recommend waiting longer for joint health. Ask your vet what they suggest for your dog's breed and size." },
          { q: "How long is recovery?", a: "Most dogs go home the same day. Plan on 10 to 14 days of limited activity and a cone, while the incision heals. Spays usually take a little longer to recover from than neuters." },
          { q: "Does pet insurance cover spaying or neutering?", a: "Usually not, since it's considered routine. Some wellness add-ons will put money toward it. Check the wellness section of your plan." },
          { q: "Why do some clinics only give a \"starting at\" price?", a: "Because weight, age and whether a female is in heat all change the work. A starting price is the floor, not the bill. Ask for an estimate for your specific dog." },
        ],
      },
      { type: "p", text: "Spay and neuter prices look chaotic until you see what's moving them, and mostly it's your dog's weight and what the price includes. Give the clinic your dog's exact weight, ask what's covered, and compare at least two quotes. That alone can save you a few hundred dollars." },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "dog-vet-visit-cost-california",
    crumb: "Vet visit cost",
    category: "vet-costs",
    topic: "Exams",
    title: "How much is a vet visit for a dog in California?",
    description:
      "A standard vet exam for a dog costs $65 to $92 at most California clinics. Real prices from about 1,400 clinics, plus the cheaper vet tech visit most owners don't know about.",
    dek: "The exam fee is usually $65 to $92. But many clinics offer a vet tech visit for about $25, and most owners never ask.",
    author: "brandon",
    published: "2026-10-08",
    cover: { label: "Vet exam", typicalLow: 65, typicalHigh: 92, low: 25, high: 400 },
    glance: [
      { value: "$65–$92", label: "Doctor exam, most clinics" },
      { value: "$25", label: "Typical vet tech visit" },
      { value: "1,398", label: "California clinics" },
    ],
    blocks: [
      { type: "p", text: "Almost every vet bill starts with the same line: the exam fee. It's what you pay for the vet to see your dog, before anything else happens." },
      { type: "p", text: "It's also the easiest price to check ahead of time, and most of us never do. We gathered exam prices from about 1,400 California clinics. Here's what a basic visit costs, what's actually included, and a cheaper option a lot of owners don't know exists." },

      { type: "h2", text: "The short answer" },
      { type: "p", text: "Most California clinics charge **$65 to $92** for a standard exam with a veterinarian. The middle price is $79." },
      { type: "range", label: "Dog exam with a veterinarian, California", low: 25, typicalLow: 65, typicalHigh: 92, high: 400, note: "Quotes from 1,398 California clinics. The typical range is the middle half of clinics." },
      {
        type: "table",
        caption: "What a basic visit costs, by type",
        columns: ["Visit type", "Typical range", "Middle price", "Clinics"],
        rows: [
          ["Doctor exam", "$65–$92", "$79", "1,398"],
          ["Yearly wellness exam", "$73–$99", "$85", "248"],
          ["Vet tech visit", "$19–$35", "$25", "227"],
        ],
      },
      {
        type: "table",
        caption: "Doctor exam prices by region",
        columns: ["Region", "Typical range", "Middle price"],
        rows: [
          ["Northern California", "$70–$93", "$82"],
          ["Southern California", "$61–$90", "$77"],
        ],
      },

      { type: "h2", text: "The cheaper visit most owners don't know about" },
      { type: "p", text: "Many clinics offer **vet tech appointments** for simple jobs. A registered veterinary technician handles things like booster shots your vet has already approved, nail trims, anal gland expression, and some follow-ups." },
      { type: "p", text: "The typical price is **$19 to $35**, about a third of a doctor exam. If your dog just needs a scheduled vaccine booster, ask: \"Can this be a tech appointment?\" Not every clinic offers them, and some jobs do need the vet. But when it's allowed, it's an easy saving." },
      { type: "callout", title: "Worth knowing", text: "A tech visit isn't a substitute for an exam when something's wrong. If your dog is sick, hurt or acting off, book the vet." },

      { type: "h2", text: "What the exam fee covers (and what it doesn't)" },
      { type: "p", text: "The exam fee pays for the vet's time and a hands-on check: weight, temperature, heart and lungs, eyes, ears, teeth, skin and belly. It usually includes a conversation about what's going on and what to do next." },
      { type: "p", text: "It usually does **not** include anything the vet decides to do or test after that:" },
      {
        type: "ul",
        items: [
          "Vaccines (most cost $30 to $60 each — see [our vaccine price guide](/blog/dog-vaccine-cost-california))",
          "Bloodwork, urine or stool tests",
          "X-rays or ultrasound",
          "Medications",
          "Procedures, from ear cleaning to stitches",
        ],
      },
      { type: "p", text: "That's why a visit quoted at $79 can end at $300. The exam itself didn't change. Everything after it was added." },

      { type: "h2", text: "Doctor exam, wellness exam or urgent care?" },
      {
        type: "table",
        columns: ["Visit", "Best for", "Typical price"],
        rows: [
          ["Wellness exam", "The yearly check-up when your dog is healthy", "$73–$99"],
          ["Doctor exam", "A specific problem: limping, an itchy ear, a lump", "$65–$92"],
          ["Urgent care", "Something that can't wait for an appointment, but isn't life-threatening", "$85–$132"],
          ["Emergency", "Anything life-threatening, day or night", "$100–$179 just to be seen"],
        ],
      },
      { type: "p", text: "Urgent care and emergency fees cover being seen, not treatment. [Our emergency vet guide](/blog/dog-emergency-vet-cost-california) explains when you need which." },


      { type: "h2", text: "Ways to keep visit costs down" },
      {
        type: "ul",
        items: [
          "**Ask what the exam fee is when you book.** It's a fair question, and clinics will tell you.",
          "**Bundle things into one visit.** If boosters are due soon, get them at the same exam instead of booking twice.",
          "**Ask for an estimate before tests.** You can ask which tests are needed today and which can wait.",
          "**Use tech visits for routine jobs** when your clinic allows it.",
          "**Keep up with the yearly exam.** Catching problems early is almost always cheaper than treating them late.",
        ],
      },

      { type: "h2", text: "Common questions" },
      {
        type: "faq",
        items: [
          { q: "Is a new-patient visit more expensive?", a: "Sometimes. Some clinics charge more for a first visit because it takes longer to review history and records. Ask when you book." },
          { q: "Do I pay the exam fee again for a recheck?", a: "It depends on the clinic. Many offer a lower recheck fee, or none, if it's for the same problem within a set number of days." },
          { q: "Why is my vet's exam fee higher than the typical range?", a: "Location, clinic type and longer appointment times all raise the fee. A higher fee isn't automatically worse value. Ask how long the appointment is and what's included." },
        ],
      },
      { type: "p", text: "None of this means you should hunt for the cheapest exam. A vet you trust, who knows your dog, is worth a lot. But knowing the normal range means the first line on the bill never catches you off guard." },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "dog-vaccine-cost-california",
    crumb: "Vaccine cost",
    category: "vet-costs",
    topic: "Vaccines",
    title: "How much do dog vaccines cost in California?",
    description:
      "Most dog vaccines cost $30 to $60 each at California clinics. Real prices for rabies, DHPP, Bordetella, canine flu and lepto from over 1,200 clinics.",
    dek: "Most dog vaccines cost $30 to $60 each. The part people miss is the exam fee that often comes with them.",
    author: "brandon",
    published: "2026-10-08",
    cover: { label: "Each vaccine", typicalLow: 30, typicalHigh: 60, low: 10, high: 160 },
    glance: [
      { value: "$35", label: "Rabies, middle price" },
      { value: "$40", label: "DHPP, middle price" },
      { value: "1,200+", label: "California clinics" },
    ],
    blocks: [
      { type: "p", text: "Good news first: vaccines are one of the more predictable costs in vet care. Most shots cost about the same from one clinic to the next." },
      { type: "p", text: "The surprises usually come from what's around the shots, not the shots themselves. We gathered vaccine prices from more than 1,200 California clinics. Here's what each one costs, which ones your dog actually needs, and the fee that catches a lot of people off guard." },

      { type: "h2", text: "The short answer" },
      { type: "p", text: "Most dog vaccines cost **$30 to $60 each** at California clinics. Rabies and DHPP, the two core shots, have middle prices of **$35** and **$40**." },
      {
        type: "table",
        caption: "Dog vaccine prices in California",
        columns: ["Vaccine", "Typical range", "Middle price", "Clinics"],
        rows: [
          ["Rabies", "$27–$45", "$35", "1,343"],
          ["DHPP (distemper combo)", "$31–$50", "$40", "1,337"],
          ["Bordetella (kennel cough)", "$30–$46", "$38", "1,333"],
          ["Leptospirosis", "$33–$50", "$40", "1,232"],
          ["Canine influenza", "$42–$60", "$51", "1,204"],
        ],
      },
      { type: "range", label: "A single dog vaccine, California", low: 10, typicalLow: 30, typicalHigh: 60, high: 160, note: "Typical range across the five common dog vaccines. Low-cost vaccine clinics sit at the bottom; full-service hospitals at the top." },
      {
        type: "table",
        caption: "Middle price by region",
        columns: ["Vaccine", "Northern California", "Southern California"],
        rows: [
          ["Rabies", "$41", "$34"],
          ["DHPP", "$44", "$39"],
          ["Bordetella", "$43", "$36"],
          ["Leptospirosis", "$43", "$39"],
          ["Canine influenza", "$49", "$53"],
        ],
      },
      { type: "p", text: "Northern California runs a few dollars higher for most shots. Canine flu is the one exception." },

      { type: "h2", text: "Which vaccines your dog actually needs" },
      { type: "h3", text: "Core vaccines: recommended for nearly every dog" },
      {
        type: "ul",
        items: [
          "**Rabies.** Required by California law once a dog is three months old, with boosters to keep it current. Your city or county will ask for proof when you license your dog.",
          "**DHPP.** Protects against distemper, hepatitis (adenovirus), parvovirus and parainfluenza. Puppies get a series of shots; adults get boosters.",
          "**Leptospirosis.** Many vets now recommend it for most dogs, including city dogs, since rats and wildlife spread it. Especially important if your dog drinks from puddles, creeks or standing water.",
        ],
      },
      { type: "h3", text: "Lifestyle vaccines: depends on your dog's routine" },
      {
        type: "ul",
        items: [
          "**Bordetella (kennel cough).** Usually required by boarding kennels, daycares and groomers.",
                    "**Canine influenza.** Often recommended for dogs that board, go to daycare or spend time around lots of other dogs.",
        ],
      },
      { type: "p", text: "Your vet will recommend a schedule based on your dog's age, health and lifestyle. That schedule matters more than any price." },

      { type: "h2", text: "The fee that isn't on the vaccine price" },
      { type: "p", text: "Here's the catch. Many full-service clinics require an exam when they give vaccines, especially for a new patient or a dog they haven't seen in a year. That exam typically costs **$65 to $92** in California — often more than the shots themselves." },
      { type: "p", text: "So two shots quoted at $75 can become a $155 visit. Ask when you book: \"Is an exam required with the vaccines?\" If your dog just had a yearly exam, the answer is often no. Some clinics also offer [cheaper vet tech visits](/blog/dog-vet-visit-cost-california) for boosters." },

      { type: "h2", text: "Puppy shots: the first-year cost" },
      { type: "p", text: "Puppies need a series of DHPP shots a few weeks apart, plus rabies. Using the middle prices above, here's roughly what the first year looks like:" },
      {
        type: "table",
        columns: ["Item", "Rough cost"],
        rows: [
          ["DHPP series (3–4 shots)", "$120–$160"],
          ["Rabies", "$35"],
          ["Bordetella, if needed", "$38"],
          ["Exam fees at those visits", "Varies — often the biggest part"],
        ],
      },
      { type: "p", text: "Many clinics sell **puppy packages** that bundle the shots and exams for one price. They can be a good deal, but compare the package against the shots and exams added up. Your vet sets the actual schedule." },

      { type: "h2", text: "Low-cost vaccine clinics" },
      { type: "p", text: "Pop-up vaccine clinics, often held at pet stores or by local shelters, charge less and usually skip the exam fee. They're a solid option for healthy dogs that just need routine shots." },
      { type: "p", text: "The tradeoff: no full exam, and no one who knows your dog's history. If your dog has health issues, or it's been a while since a check-up, a regular vet visit is worth the extra cost." },


      { type: "h2", text: "Common questions" },
      {
        type: "faq",
        items: [
          { q: "How often does my dog need a rabies shot in California?", a: "The first rabies shot is given once a puppy is at least three months old. After that, boosters follow your vet's schedule, which depends on the vaccine used. Many are every three years after the first booster." },
          { q: "Are vaccines cheaper as a package?", a: "Often, yes. Puppy and wellness packages bundle shots and exams. Add up the individual prices to check the saving is real." },
          { q: "Can I skip lifestyle vaccines?", a: "If your dog doesn't board, go to daycare or spend time around water and wildlife, your vet may say yes. Ask what they recommend for your dog's routine." },
        ],
      },
      { type: "p", text: "Vaccines are one of the cheapest ways to avoid the most expensive vet visits. Treating parvo, for example, can run into the thousands. Ask what's included, keep a record of what your dog has had, and you'll rarely be surprised." },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "dog-emergency-vet-cost-california",
    crumb: "Emergency vet cost",
    category: "vet-costs",
    topic: "Emergency",
    title: "How much does an emergency vet visit cost in California?",
    description:
      "Just being seen at an emergency vet costs $100 to $179 at most California clinics, and urgent care $85 to $132. Real prices, and how to know which one you need.",
    dek: "Just being seen at an emergency vet usually costs $100 to $179. Treatment is on top of that. Here's how to know where to go.",
    author: "brandon",
    published: "2026-10-08",
    cover: { label: "Emergency visit fee", typicalLow: 100, typicalHigh: 179, low: 67, high: 600 },
    glance: [
      { value: "$100–$179", label: "Emergency visit fee" },
      { value: "$85–$132", label: "Urgent care visit fee" },
      { value: "1,189", label: "ER and urgent care quotes" },
    ],
    blocks: [
      { type: "callout", title: "If your dog is in danger right now", text: "Stop reading and call the nearest emergency vet, or go now. Trouble breathing, collapse, a seizure, heavy bleeding or a suspected poisoning can't wait. For possible poisoning, the ASPCA Animal Poison Control line is (888) 426-4435 (a fee may apply)." },
      { type: "p", text: "Nobody plans an emergency vet visit. It usually starts with a feeling that something's wrong, often late at night, and a lot of worry. Cost is the last thing you want to think about in that moment, which is exactly why it helps to know it ahead of time." },
      // [BRANDON] Optional: a short line about a late-night vet scare of your own.
      { type: "p", text: "We collected visit fees from 556 California clinics that quoted an emergency visit and 633 that quoted an urgent care visit. Here's what it costs to be seen, why the final bill is usually much higher, and how to choose between urgent care and the ER." },

      { type: "h2", text: "The short answer" },
      { type: "p", text: "Most California emergency vets charge **$100 to $179** just to see your dog. Urgent care clinics charge **$85 to $132**. Those are the fees for the visit itself — not for tests or treatment." },
      { type: "range", label: "Emergency vet visit fee, California", low: 67, typicalLow: 100, typicalHigh: 179, high: 600, note: "Quotes from 556 California clinics. This is the fee to be seen. Treatment is extra." },
      {
        type: "table",
        caption: "Visit fees by region",
        columns: ["", "Northern California", "Southern California"],
        rows: [
          ["Emergency, typical range", "$102–$181", "$99–$175"],
          ["Emergency, middle price", "$144", "$130"],
          ["Urgent care, typical range", "$92–$150", "$80–$125"],
          ["Urgent care, middle price", "$120", "$99"],
        ],
      },

      { type: "h2", text: "Why the final bill is so much higher" },
      { type: "p", text: "The visit fee gets your dog examined. Almost everything after that is extra, and in an emergency there's usually a lot after that: bloodwork, X-rays or ultrasound, IV fluids, medications, and sometimes hospitalization or surgery." },
      { type: "p", text: "A visit that starts at $150 can easily reach several hundred dollars, and serious cases can run into the thousands. About one in five emergency quotes we collected were \"starting at\" prices for exactly this reason. You can always ask for an estimate before treatment. Clinics expect you to." },
      { type: "callout", title: "What to say at the front desk", text: "\"Can I get an estimate before you start treatment, with a low and high end?\" It doesn't slow down care for a stable dog, and it lets you decide with real numbers." },

      { type: "h2", text: "Emergency vet or urgent care?" },
      { type: "p", text: "Urgent care clinics cost less and often have shorter waits. Emergency hospitals have the staff and equipment for life-threatening problems, around the clock. Choosing right saves money and time — but when you're unsure, the ER is the safe call." },
      { type: "h3", text: "Go to an emergency vet" },
      {
        type: "ul",
        items: [
          "Trouble breathing, or gums that look pale, blue or gray",
          "Collapse, fainting or not being able to stand",
          "A seizure",
          "A swollen, hard belly, especially with retching that brings nothing up",
          "Eating something toxic: chocolate, grapes, xylitol, medications, rat poison",
          "Heavy bleeding, or being hit by a car, even if they seem fine",
          "Straining to pee with little or nothing coming out",
        ],
      },
      { type: "h3", text: "Urgent care is usually fine" },
      {
        type: "ul",
        items: [
          "Vomiting or diarrhea once or twice, while still drinking and acting mostly normal",
          "A limp, when they can still put weight on the leg",
          "A minor cut or scrape",
          "An ear infection, hot spot or itchy skin flare-up",
          "Coughing or sneezing with normal energy",
        ],
      },
      { type: "p", text: "These lists aren't complete, and they aren't a diagnosis. If your dog seems to be getting worse, go to the ER. Calling ahead is always fine: many emergency and urgent care clinics will tell you over the phone whether to come in." },


      { type: "h2", text: "How to prepare before an emergency" },
      {
        type: "ol",
        items: [
          "**Find your nearest 24-hour emergency vet now.** Save the number and address in your phone.",
          "**Find an urgent care clinic too,** and note its hours.",
          "**Decide how you'd pay.** An emergency fund, a credit card or CareCredit. Many emergency clinics ask for a deposit before treatment.",
          "**Look into pet insurance while your dog is healthy.** Emergencies are what most plans are built for, and pre-existing conditions usually aren't covered.",
          "**Keep your dog's records handy:** vaccines, medications and any health conditions.",
        ],
      },

      { type: "h2", text: "Common questions" },
      {
        type: "faq",
        items: [
          { q: "Do emergency vets charge more at night or on weekends?", a: "Many do. Some add an after-hours or holiday fee on top of the visit fee. Ask when you call." },
          { q: "Will an emergency vet treat my dog if I can't pay right away?", a: "Policies vary. Many require a deposit before treatment, and some accept payment plans or financing like CareCredit. Ask about options when you arrive." },
          { q: "Is urgent care the same as my regular vet?", a: "Not quite. Urgent care treats problems that can't wait for an appointment. You'll usually still follow up with your regular vet afterward." },
        ],
      },
      { type: "p", text: "We hope you never need this article. But if you do, you'll walk in knowing roughly what to expect, and knowing you can ask for an estimate. That's one less thing to worry about on a hard night." },
    ],
  },
];