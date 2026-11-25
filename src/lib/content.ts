export const tools = [
  {
    name: "Form photo resizer",
    detail:
      "Fit a portrait to the pixel size and file limit printed on an application form.",
  },
  {
    name: "Signature crop",
    detail: "Trim a signature scan so it sits inside the box most forms ask for.",
  },
  {
    name: "Plain background",
    detail:
      "Replace a busy photo background with a plain one for forms and hall tickets.",
  },
  {
    name: "PDF compress",
    detail: "Shrink certificates and marksheets before a portal upload.",
  },
  {
    name: "Merge documents",
    detail:
      "Combine marksheets, a caste certificate, and an ID proof into one PDF.",
  },
  {
    name: "Page to image",
    detail: "Turn a scanned page into a JPG when a portal will not accept a PDF.",
  },
];

export const practiceSets = [
  { exam: "SSC CGL", level: "Graduate", questions: 25, papers: 4 },
  { exam: "UPSC CSE Prelims", level: "Graduate", questions: 20, papers: 2 },
  { exam: "RRB NTPC", level: "12th pass", questions: 30, papers: 3 },
  { exam: "IBPS PO", level: "Graduate", questions: 20, papers: 3 },
  { exam: "State PSC", level: "Graduate", questions: 15, papers: 2 },
  { exam: "CTET", level: "Graduate", questions: 20, papers: 2 },
];

export const sampleQuestion = {
  prompt:
    "Which article of the Constitution of India provides for equality before the law?",
  options: ["Article 14", "Article 19", "Article 21", "Article 32"],
  answerIndex: 0,
  explanation:
    "Article 14 says the State shall not deny any person equality before the law or the equal protection of the laws.",
};

const ssc = "https://ssc.gov.in/";
const upsc = "https://upsc.gov.in/";
const rrb = "https://www.rrbapply.gov.in/";

function listed(names: string[], href?: string) {
  return names.map((name) => (href ? { name, href } : { name }));
}

export const governmentJobs = [
  {
    group: "Staff Selection Commission",
    jobs: listed(
      [
        "SSC CGL",
        "SSC CHSL",
        "SSC MTS",
        "SSC GD Constable",
        "SSC CPO",
        "SSC JE",
        "SSC Stenographer",
        "SSC Selection Post",
        "SSC Havaldar",
        "SSC JHT",
      ],
      ssc,
    ),
  },
  {
    group: "Union Public Service Commission",
    jobs: listed(
      [
        "UPSC CSE",
        "UPSC IFS",
        "UPSC CDS",
        "UPSC NDA",
        "UPSC CAPF",
        "UPSC ESE",
        "UPSC CMS",
        "UPSC EPFO",
        "Indian Economic Service",
        "Indian Statistical Service",
        "UPSC Combined Geo-Scientist",
      ],
      upsc,
    ),
  },
  {
    group: "Railways",
    jobs: [
      ...listed(
        [
          "RRB NTPC",
          "RRB Group D",
          "RRB ALP",
          "RRB JE",
          "RRB Technician",
          "RRC Level 1",
        ],
        rrb,
      ),
      ...listed(["RPF Constable", "RPF Sub Inspector"]),
    ],
  },
  {
    group: "Banking and insurance",
    jobs: [
      ...listed(
        [
          "IBPS PO",
          "IBPS Clerk",
          "IBPS SO",
          "IBPS RRB Officer",
          "IBPS RRB Office Assistant",
        ],
        "https://www.ibps.in/",
      ),
      ...listed(
        ["SBI PO", "SBI Clerk", "SBI SO"],
        "https://sbi.bank.in/web/careers/current-openings",
      ),
      ...listed(
        ["RBI Grade B", "RBI Assistant"],
        "https://opportunities.rbi.org.in/",
      ),
      ...listed(["SEBI Grade A"], "https://www.sebi.gov.in/sebiweb/about/AboutAction.do?doVacancies=yes"),
      ...listed(
        ["LIC AAO", "LIC ADO"],
        "https://www.licindia.in/careers",
      ),
      ...listed(["NABARD Grade A", "NABARD Grade B", "NIACL AO", "ECGC PO", "SIDBI Grade A"]),
    ],
  },
  {
    group: "Defence and police",
    jobs: [
      ...listed(["Indian Army Agniveer"], "https://joinindianarmy.nic.in/"),
      ...listed(["Indian Navy Agniveer"], "https://www.joinindiannavy.gov.in/"),
      ...listed(["Indian Air Force Agniveer"], "https://iafrecruitment.edcil.co.in/"),
      ...listed(["AFCAT"], "https://afcat.cdac.in/AFCAT/"),
      ...listed(["Indian Coast Guard"], "https://joinindiancoastguard.gov.in/"),
      ...listed(["CRPF"], "https://rect.crpf.gov.in/"),
      ...listed(["SSB"], "https://recruitment.ssb.gov.in/"),
      ...listed(
        ["Assam Rifles", "Delhi Police Constable", "Delhi Police SI"],
        ssc,
      ),
      ...listed([
        "Territorial Army",
        "BSF",
        "CISF",
        "ITBP",
        "State Police Constable",
        "State Police SI",
      ]),
    ],
  },
  {
    group: "Teaching",
    jobs: [
      ...listed(["CTET"], "https://ctet.nic.in/"),
      ...listed(["UGC NET", "UGC NET JRF"], "https://ugcnet.nta.nic.in/"),
      ...listed(["CSIR NET"], "https://csirnet.nta.nic.in/"),
      ...listed(
        ["KVS PRT", "KVS TGT", "KVS PGT"],
        "https://kvs.gov.in/en/recruitment/",
      ),
      ...listed(
        ["NVS TGT", "NVS PGT"],
        "https://www.cbse.gov.in/cbsenew/recruitment.html",
      ),
      ...listed(["DSSSB"], "https://dsssb.delhi.gov.in/"),
      ...listed(["EMRS Teaching", "State TET"]),
    ],
  },
  {
    group: "Public sector",
    jobs: [
      ...listed(["ISRO Scientist"], "https://www.isro.gov.in/CurrentOpportunities.html"),
      ...listed(["ONGC"], "https://ongcindia.com/web/eng/career/recruitment-notice"),
      ...listed(["NTPC"], "https://www.ntpc.co.in/jobs-ntpc"),
      ...listed(["Coal India"], "https://www.coalindia.in/career-cil/jobs-coal-india/"),
      ...listed([
        "DRDO",
        "BARC",
        "IOCL",
        "BPCL",
        "HPCL",
        "BHEL",
        "SAIL",
        "GAIL",
        "HAL",
        "BEL",
        "NPCIL",
        "Power Grid",
      ]),
    ],
  },
  {
    group: "Other central and state posts",
    jobs: [
      ...listed(
        ["India Post GDS", "Postal Assistant", "Sorting Assistant"],
        "https://www.indiapost.gov.in/vacancies",
      ),
      ...listed(["ESIC UDC"], "https://esic.gov.in/recruitments/"),
      ...listed(["CBDT Tax Assistant", "CBIC Tax Assistant"], ssc),
      ...listed([
        "FCI Manager",
        "FCI Junior Engineer",
        "AIIMS NORCET",
        "Intelligence Bureau ACIO",
        "CBI",
        "NIA",
        "Supreme Court Junior Court Assistant",
        "High Court Clerk",
        "State PSC",
        "Patwari",
        "Gram Sachiv",
        "Junior Assistant",
        "Lower Division Clerk",
        "Forest Guard",
      ]),
    ],
  },
];

export const governmentJobNames = governmentJobs.flatMap((group) =>
  group.jobs.map((job) => job.name),
);

export const jobs = [
  {
    org: "Staff Selection Commission",
    title: "Combined Graduate Level Examination",
    place: "All India",
    qualification: "Graduate",
    vacancies: "See the notice",
    lastDate: "30 November 2026",
  },
  {
    org: "Union Public Service Commission",
    title: "Civil Services Examination",
    place: "All India",
    qualification: "Graduate",
    vacancies: "See the notice",
    lastDate: "18 February 2027",
  },
  {
    org: "Railway Recruitment Board",
    title: "NTPC Graduate Posts",
    place: "Zonal railways",
    qualification: "Graduate",
    vacancies: "See the notice",
    lastDate: "12 December 2026",
  },
  {
    org: "Institute of Banking Personnel Selection",
    title: "Probationary Officer / Management Trainee",
    place: "Participating banks",
    qualification: "Graduate",
    vacancies: "See the notice",
    lastDate: "21 November 2026",
  },
  {
    org: "State selection board",
    title: "Sub Inspector",
    place: "State cadre",
    qualification: "Graduate",
    vacancies: "See the notice",
    lastDate: "5 January 2027",
  },
];

export const notifications = [
  {
    kind: "Admit card",
    title: "SSC CGL Tier I city intimation",
    date: "12 November 2026",
    detail: "The city slip is not available to download from this page.",
  },
  {
    kind: "Result",
    title: "UPSC CSE Prelims result",
    date: "8 November 2026",
    detail: "The result is published by UPSC, not from here.",
  },
  {
    kind: "Recruitment",
    title: "RRB NTPC application window",
    date: "2 November 2026",
    detail: "Apply on the railway board site. This line is only a reminder.",
  },
  {
    kind: "Exam update",
    title: "IBPS PO mains date notice",
    date: "28 October 2026",
    detail: "The date here is an example. Confirm it on the IBPS site.",
  },
  {
    kind: "Last date",
    title: "State PSC form correction window",
    date: "20 October 2026",
    detail: "Shown so you can see a last-date notice. The correction link is not live.",
  },
];
