document.addEventListener('DOMContentLoaded', () => {
  // --- 1. GLOBAL STATE & THEME INITIALIZATION ---
  initTheme();
  initNavbarScroll();
  initActiveNavLink();
  initToastContainer();
  initNavbarAuth();

  // Parse current filename to trigger page-specific scripts
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  // --- AUTH GUARD: auth-guard.js handles the redirect before JS loads on protected pages.
  // This secondary check is a safety net — skips page-init if somehow reached unauthenticated.
  const PROTECTED_PAGES = ['upload.html', 'profile.html', 'score.html', 'gaps.html', 'roadmap.html', 'progress.html'];
  if (PROTECTED_PAGES.includes(page) && !localStorage.getItem('currentUser')) {
    window.location.replace('index.html');
    return;
  }


  if (page === 'index.html') {
    initLandingPage();
  } else if (page === 'login.html') {
    initLoginPage();
  } else if (page === 'upload.html') {
    initUploadPage();
  } else if (page === 'profile.html') {
    initProfilePage();
  } else if (page === 'score.html') {
    initScorePage();
  } else if (page === 'gaps.html') {
    initGapsPage();
  } else if (page === 'roadmap.html') {
    initRoadmapPage();
  } else if (page === 'progress.html') {
    initProgressPage();
  }
});

// --- AUTH MODAL (Professional — fully blocking, non-dismissible) ---
function showAuthModal() {
  // Reveal body (was hidden by inline pre-render script) but blur main content
  document.documentElement.style.visibility = 'visible';
  document.body.style.overflow = 'hidden';

  const mainContent = document.querySelector('main');
  if (mainContent) {
    mainContent.style.filter = 'blur(8px)';
    mainContent.style.pointerEvents = 'none';
    mainContent.style.userSelect = 'none';
    mainContent.style.opacity = '0.4';
    mainContent.style.transition = 'filter 0.3s, opacity 0.3s';
  }
  const header = document.querySelector('header');
  if (header) {
    header.style.filter = 'blur(4px)';
    header.style.pointerEvents = 'none';
    header.style.opacity = '0.3';
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes authModalIn {
      from { opacity: 0; transform: scale(0.9) translateY(24px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes authOverlayIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .auth-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.72);
      z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      animation: authOverlayIn 0.2s ease forwards;
      padding: 1rem;
    }
    .auth-modal-box {
      background: var(--surface, #1a1a2e);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.5rem;
      padding: 2.25rem 2rem 2rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
      animation: authModalIn 0.35s cubic-bezier(0.34,1.4,0.64,1) forwards;
    }
    .auth-tab-bar {
      display: flex;
      background: var(--bg, #0f0f1a);
      border-radius: 0.75rem;
      padding: 4px;
      margin-bottom: 1.5rem;
      gap: 4px;
    }
    .auth-tab {
      flex: 1; padding: 0.6rem 1rem;
      border-radius: 0.6rem; border: none;
      font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      background: transparent;
      color: var(--text-secondary, #888);
    }
    .auth-tab.active {
      background: var(--primary, #4f46e5);
      color: #fff;
      box-shadow: 0 3px 10px rgba(79,70,229,0.4);
    }
    .auth-input {
      width: 100%; padding: 0.8rem 1rem;
      border-radius: 0.7rem;
      border: 1.5px solid var(--border, rgba(255,255,255,0.1));
      background: var(--bg, #0f0f1a);
      color: var(--text, #f0f0f0);
      font-size: 0.92rem; font-family: inherit;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .auth-input:focus {
      border-color: var(--primary, #4f46e5);
      box-shadow: 0 0 0 3px rgba(79,70,229,0.18);
    }
    .auth-input::placeholder { color: var(--text-muted, #555); }
    .auth-submit-btn {
      width: 100%; padding: 0.85rem;
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #fff; border: none; border-radius: 0.75rem;
      font-size: 0.97rem; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: all 0.2s;
      letter-spacing: 0.01em;
    }
    .auth-submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(79,70,229,0.45);
    }
    .auth-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
    .auth-feature-item {
      display: flex; align-items: center; gap: 0.6rem;
      font-size: 0.85rem; color: var(--text-secondary, #aaa);
    }
    .auth-check { color: #10b981; font-weight: 700; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'auth-modal-overlay';
  // NO click-outside-to-close: overlay click does nothing
  overlay.addEventListener('click', (e) => e.stopPropagation());

  overlay.innerHTML = `
    <div class="auth-modal-box" onclick="event.stopPropagation()">

      <!-- Logo + Heading -->
      <div style="text-align:center; margin-bottom:1.25rem;">
        <div style="display:inline-flex;align-items:center;gap:0.5rem;margin-bottom:0.9rem;">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,#4f46e5,#818cf8);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
              <path d="M4 19L10 11L14 15L20 6"/>
              <circle cx="4" cy="19" r="1.5" fill="white"/>
              <circle cx="20" cy="6" r="1.5" fill="white"/>
            </svg>
          </div>
          <span style="font-weight:800;font-size:1.15rem;letter-spacing:-0.02em;">CareerMap AI</span>
        </div>
        <h2 style="font-size:1.3rem;font-weight:700;margin:0 0 0.75rem;">Sign in to continue</h2>
        <div style="display:flex;flex-direction:column;gap:0.4rem;text-align:left;margin-bottom:0.25rem;">
          <div class="auth-feature-item"><span class="auth-check">✓</span> Personalized resume analysis</div>
          <div class="auth-feature-item"><span class="auth-check">✓</span> Company-specific career roadmaps</div>
          <div class="auth-feature-item"><span class="auth-check">✓</span> Skill gap tracking &amp; progress</div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="auth-tab-bar">
        <button class="auth-tab active" id="modal-tab-login" onclick="switchModalTab('login')">Login</button>
        <button class="auth-tab" id="modal-tab-signup" onclick="switchModalTab('signup')">Create Account</button>
      </div>

      <!-- Login Form -->
      <form id="modal-login-form" onsubmit="handleModalAuth(event,'login')" style="display:flex;flex-direction:column;gap:0.75rem;">
        <input class="auth-input" type="email" id="modal-login-email" placeholder="Email address" required autocomplete="email"/>
        <input class="auth-input" type="password" placeholder="Password" required autocomplete="current-password" minlength="4"/>
        <button class="auth-submit-btn" type="submit" id="modal-login-btn">Sign In &rarr;</button>
      </form>

      <!-- Signup Form -->
      <form id="modal-signup-form" onsubmit="handleModalAuth(event,'signup')" style="display:none;flex-direction:column;gap:0.75rem;">
        <input class="auth-input" type="text" id="modal-signup-name" placeholder="Full name" required autocomplete="name"/>
        <input class="auth-input" type="email" id="modal-signup-email" placeholder="Email address" required autocomplete="email"/>
        <input class="auth-input" type="password" placeholder="Create password (min 4 chars)" required autocomplete="new-password" minlength="4"/>
        <button class="auth-submit-btn" type="submit" id="modal-signup-btn">Create Account &rarr;</button>
      </form>

      <p style="text-align:center;margin-top:1rem;font-size:0.78rem;color:var(--text-secondary,#666);">
        By continuing, you agree to CareerMap AI's Terms &amp; Privacy Policy
      </p>
      <div style="text-align:center;margin-top:0.5rem;">
        <a href="index.html" style="font-size:0.82rem;color:var(--primary,#4f46e5);text-decoration:none;font-weight:500;">← Back to Home</a>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Block Escape key — modal cannot be dismissed
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') e.preventDefault();
  }, true);
}

function switchModalTab(tab) {
  const loginForm  = document.getElementById('modal-login-form');
  const signupForm = document.getElementById('modal-signup-form');
  const loginTab   = document.getElementById('modal-tab-login');
  const signupTab  = document.getElementById('modal-tab-signup');
  if (tab === 'login') {
    loginForm.style.display  = 'flex';
    signupForm.style.display = 'none';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.style.display  = 'none';
    signupForm.style.display = 'flex';
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
}

function handleModalAuth(e, type) {
  e.preventDefault();
  const btn = e.target.querySelector('.auth-submit-btn');
  btn.textContent = type === 'login' ? 'Signing in...' : 'Creating account...';
  btn.disabled = true;

  // Store basic user info from form
  if (type === 'login') {
    const email = document.getElementById('modal-login-email')?.value || '';
    localStorage.setItem('cm_user_email', email);
    localStorage.setItem('cm_user_name', email.split('@')[0]);
  } else {
    const name  = document.getElementById('modal-signup-name')?.value || '';
    const email = document.getElementById('modal-signup-email')?.value || '';
    localStorage.setItem('cm_user_name', name);
    localStorage.setItem('cm_user_email', email);
  }

  setTimeout(() => {
    localStorage.setItem('cm_logged_in', 'true');
    window.location.reload(); // Reload — pre-render check now passes, page loads fully
  }, 800);
}

// --- 1a. COMPANY & ROLE REQUIREMENTS DATABASE ---
const COMPANIES = [
  // --- Top IT Services & Consulting Giants ---
  'TCS',
  'Infosys',
  'Wipro',
  'HCLTech',
  'Cognizant',
  'Accenture',
  'Capgemini',
  'IBM',
  'LTIMindtree',
  'Tech Mahindra',
  'Deloitte',
  'PwC',
  'EY',
  'KPMG',

  // --- Big Tech & Global Product MNCs ---
  'Google',
  'Microsoft',
  'Amazon',
  'Meta',
  'Apple',
  'Nvidia',
  'Netflix',
  'Adobe',
  'Salesforce',
  'Oracle',
  'Cisco',
  'Intel',
  'Qualcomm',
  'Uber',
  'Atlassian',
  'ServiceNow',

  // --- Top Indian Product Unicorns & Startups ---
  'Flipkart',
  'Zoho',
  'Swiggy',
  'Zomato',
  'Freshworks',
  'Paytm',
  'Razorpay',
  'PhonePe',
  'CRED',
  'Ola',
  'Reliance Jio',
  'Postman',
  'Meesho',
  'Nykaa',
  'Zerodha',

  // --- Top GCCs & Financial Tech MNCs ---
  'Goldman Sachs',
  'JPMorgan Chase',
  'Morgan Stanley',
  'Barclays',
  'Wells Fargo',
  'Walmart Global Tech',
  'Target',
  'PayPal',
  'SAP Labs India',

  // --- Top Engineering & Midtier IT Leaders ---
  'Tata Motors',
  'L&T Technology Services',
  'Mphasis',
  'Persistent Systems',
  'Coforge',
  'Cyient',
  'Happiest Minds',
  'Tata Elxsi',
  'Sonata Software',
  'Zensar Technologies',
  'Hexaware',
  'Birlasoft',
  'KPIT Technologies'
];

const ROLES = [
  // Tech / IT
  'Python Developer',
  'Software Developer',
  'Full Stack Developer',
  'Backend Developer',
  'Frontend Developer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'ServiceNow Developer',
  'Java Developer',
  'DevOps Engineer',
  'Cloud Engineer',
  'QA Engineer',
  'Android Developer',
  'iOS Developer',
  'Cyber Security Analyst',
  'Database Administrator',
  'Network Engineer',
  'UI/UX Designer',
  // Business / Management (MBA, BBA, PGDM)
  'Business Analyst',
  'Management Consultant',
  'Product Manager',
  'Project Manager',
  'Operations Manager',
  'Supply Chain Manager',
  'Business Development Executive',
  // Marketing
  'Marketing Manager',
  'Digital Marketing Executive',
  'Content Writer',
  'Social Media Manager',
  'Brand Manager',
  // Finance / Commerce (B.Com, CA, MBA Finance)
  'Financial Analyst',
  'Accountant',
  'Credit Analyst',
  'Investment Analyst',
  'Banking Officer',
  'Auditor',
  // HR
  'HR Executive',
  'Talent Acquisition Specialist',
  'Recruiter',
  // Sales
  'Sales Executive',
  'Account Manager',
  // Engineering (Civil, Mechanical, Electrical)
  'Civil Engineer',
  'Mechanical Engineer',
  'Electrical Engineer',
  'Site Engineer',
  // Science / Research
  'Research Analyst',
  'Lab Technician',
  // Design
  'Graphic Designer',
  // Education
  'Teacher',
  'Corporate Trainer',
  // Admin / Other
  'Administrative Assistant',
  'Customer Service Executive'
];

const ROLE_BASE_REQUIREMENTS = {
  'Python Developer': {
    required: ['Python', 'SQL', 'REST APIs', 'Git'],
    preferred: ['Flask', 'Django', 'Docker', 'Unit Testing'],
    certifications: ['PCEP/PCAP Certified Python Associate'],
    tools: ['VS Code', 'GitHub', 'Postman'],
    exp: '1+ years software development experience'
  },
  'Software Developer': {
    required: ['Java', 'SQL', 'Git', 'Data Structures'],
    preferred: ['Spring Boot', 'REST APIs', 'React', 'Docker'],
    certifications: ['Oracle Certified Associate (Java)'],
    tools: ['IntelliJ IDEA', 'GitHub', 'Maven'],
    exp: '1+ years development experience'
  },
  'Full Stack Developer': {
    required: ['JavaScript', 'HTML/CSS', 'React', 'Node.js', 'Git'],
    preferred: ['TypeScript', 'Express', 'SQL', 'MongoDB', 'Docker'],
    certifications: ['AWS Certified Developer'],
    tools: ['VS Code', 'GitHub', 'NPM'],
    exp: '1-3 years full stack web development experience'
  },
  'Backend Developer': {
    required: ['Node.js', 'Express', 'SQL', 'REST APIs', 'Git'],
    preferred: ['Python', 'PostgreSQL', 'Docker', 'Redis', 'Unit Testing'],
    certifications: ['AWS Cloud Practitioner'],
    tools: ['VS Code', 'GitHub', 'Postman', 'Docker'],
    exp: '2+ years backend system architecture experience'
  },
  'Data Analyst': {
    required: ['SQL', 'Excel', 'Python', 'Tableau'],
    preferred: ['Power BI', 'Pandas', 'NumPy', 'Statistics'],
    certifications: ['Google Data Analytics Professional Certificate'],
    tools: ['Jupyter Notebook', 'Tableau Desktop', 'Excel'],
    exp: 'Entry level to 1+ years data analysis experience'
  },
  'Data Scientist': {
    required: ['Python', 'SQL', 'Statistics', 'Machine Learning'],
    preferred: ['Pandas', 'Scikit-Learn', 'R', 'Deep Learning', 'Tableau'],
    certifications: ['IBM Data Science Professional Certificate'],
    tools: ['Jupyter Notebook', 'Anaconda', 'GitHub'],
    exp: '1-2 years data modeling experience'
  },
  'Machine Learning Engineer': {
    required: ['Python', 'TensorFlow', 'PyTorch', 'Git'],
    preferred: ['Scikit-Learn', 'Docker', 'Kubernetes', 'Cloud Fundamentals'],
    certifications: ['Google Professional Machine Learning Engineer'],
    tools: ['VS Code', 'Jupyter Notebook', 'GitHub'],
    exp: '2+ years machine learning modeling and deployment'
  },
  'ServiceNow Developer': {
    required: ['JavaScript', 'ServiceNow ITSM', 'HTML/CSS', 'REST APIs'],
    preferred: ['ServiceNow CAD', 'AngularJS', 'IntegrationHub', 'SQL'],
    certifications: ['ServiceNow Certified Application Developer (CAD)'],
    tools: ['ServiceNow Studio', 'Developer Instance', 'GitHub'],
    exp: '1+ years ServiceNow platform administration and script writing'
  },
  'Java Developer': {
    required: ['Java', 'SQL', 'Git', 'Spring Boot'],
    preferred: ['Hibernate', 'Microservices', 'REST APIs', 'Docker', 'Maven'],
    certifications: ['Oracle Certified Professional (Java SE)'],
    tools: ['IntelliJ IDEA', 'Eclipse', 'GitLab'],
    exp: '2+ years backend development'
  },
  'Frontend Developer': {
    required: ['HTML/CSS', 'JavaScript', 'React', 'Git'],
    preferred: ['TypeScript', 'Next.js', 'Redux', 'Tailwind CSS', 'Unit Testing'],
    certifications: ['Meta Front-End Developer Professional Certificate'],
    tools: ['VS Code', 'GitHub', 'Figma'],
    exp: '1-2 years user interface engineering experience'
  }
};

const COMPANY_MODIFIERS = {
  'Cognizant': {
    requiredAdd: ['REST API Development'],
    toolsAdd: ['Confluence'],
    prefCert: 'Cognizant Internal Certs / AWS Practitioner'
  },
  'Accenture': {
    requiredAdd: ['Cloud Fundamentals'],
    toolsAdd: ['Jira'],
    prefCert: 'Accenture Cloud Architecture Academy'
  },
  'Capgemini': {
    requiredAdd: ['Unit Testing'],
    toolsAdd: ['Bitbucket'],
    prefCert: 'Capgemini Agile Developer'
  },
  'IBM': {
    requiredAdd: ['Cloud Fundamentals', 'Docker'],
    toolsAdd: ['IBM Cloud'],
    prefCert: 'IBM Professional Developer'
  },
  'TCS': {
    requiredAdd: ['Git & GitHub'],
    toolsAdd: ['TCS iON'],
    prefCert: 'TCS Agile Ninja'
  },
  'Infosys': {
    requiredAdd: ['SQL'],
    toolsAdd: ['Lex Learning'],
    prefCert: 'Infosys Certified Software Programmer'
  },
  'Deloitte': {
    requiredAdd: ['Unit Testing', 'REST API Development'],
    toolsAdd: ['Azure DevOps'],
    prefCert: 'Deloitte Enterprise Architect'
  },
  'Wipro': {
    requiredAdd: ['Git & GitHub'],
    toolsAdd: ['Teams'],
    prefCert: 'Wipro Elite Developer Certification'
  },
  'HCLTech': {
    requiredAdd: ['SQL'],
    toolsAdd: ['Jenkins'],
    prefCert: 'HCL Certified Associate'
  },
  'LTIMindtree': {
    requiredAdd: ['Unit Testing'],
    toolsAdd: ['Slack'],
    prefCert: 'LTIMindtree Engineering Excellence'
  },
  'Tech Mahindra': {
    requiredAdd: ['Networking'],
    toolsAdd: ['Confluence'],
    prefCert: 'TechM Cloud Associate'
  },
  'Microsoft': {
    requiredAdd: ['Azure', 'C#/.NET'],
    toolsAdd: ['Azure DevOps', 'Visual Studio'],
    prefCert: 'Microsoft Certified: Azure Developer Associate'
  },
  'Google': {
    requiredAdd: ['GCP', 'Data Structures & Algorithms'],
    toolsAdd: ['Google Cloud Shell', 'Bazel'],
    prefCert: 'Google Cloud Professional Cloud Architect'
  },
  'Amazon': {
    requiredAdd: ['AWS', 'Distributed Systems'],
    toolsAdd: ['AWS Console', 'CloudFormation'],
    prefCert: 'AWS Certified Solutions Architect'
  },
  'Meta': {
    requiredAdd: ['GraphQL', 'System Design'],
    toolsAdd: ['VS Code', 'Mercurial'],
    prefCert: 'Meta Certified Professional'
  },
  'Apple': {
    requiredAdd: ['Swift/C++', 'System Design'],
    toolsAdd: ['Xcode'],
    prefCert: 'Apple Certified Developer'
  },
  'Oracle': {
    requiredAdd: ['Oracle Cloud', 'PL/SQL'],
    toolsAdd: ['SQL Developer', 'OCI Console'],
    prefCert: 'Oracle Certified Professional'
  },
  'Salesforce': {
    requiredAdd: ['Apex', 'Lightning Web Components'],
    toolsAdd: ['Salesforce Developer Console', 'VS Code'],
    prefCert: 'Salesforce Certified Platform Developer'
  },
  'Cisco': {
    requiredAdd: ['Networking (TCP/IP)', 'Docker'],
    toolsAdd: ['Wireshark', 'Cisco DevNet'],
    prefCert: 'Cisco Certified DevNet Associate'
  },
  'Adobe': {
    requiredAdd: ['C++/TypeScript', 'Web Architecture'],
    toolsAdd: ['GitLab', 'Adobe Experience Platform'],
    prefCert: 'Adobe Certified Expert'
  },
  'Nvidia': {
    requiredAdd: ['CUDA', 'GPU Acceleration'],
    toolsAdd: ['NVIDIA Nsight', 'Docker'],
    prefCert: 'NVIDIA Deep Learning Institute (DLI) Cert'
  },
  'Goldman Sachs': {
    requiredAdd: ['Financial Modeling', 'Java/Python'],
    toolsAdd: ['SecDb', 'GitLab'],
    prefCert: 'CFA / Financial Risk Manager (FRM)'
  },
  'JPMorgan Chase': {
    requiredAdd: ['AWS', 'Financial Systems Architecture'],
    toolsAdd: ['Jira', 'Bitbucket'],
    prefCert: 'AWS Certified Developer'
  },
  'Walmart Global Tech': {
    requiredAdd: ['GCP', 'Kafka'],
    toolsAdd: ['Confluence', 'Kubernetes'],
    prefCert: 'Google Associate Cloud Engineer'
  },
  'PayPal': {
    requiredAdd: ['Fraud Prevention', 'Node.js/Java'],
    toolsAdd: ['Splunk', 'Postman'],
    prefCert: 'Certified Information Systems Security Professional'
  },
  'ServiceNow': {
    requiredAdd: ['ServiceNow CAD', 'Scripting'],
    toolsAdd: ['ServiceNow Studio'],
    prefCert: 'ServiceNow Certified Application Developer'
  },
  'Atlassian': {
    requiredAdd: ['Jira API', 'React/TypeScript'],
    toolsAdd: ['Jira', 'Confluence', 'Bitbucket'],
    prefCert: 'Atlassian Certified Associate'
  },
  'Uber': {
    requiredAdd: ['Go/gRPC', 'High-Throughput Systems'],
    toolsAdd: ['Kafka', 'Docker'],
    prefCert: 'Certified Kubernetes Administrator'
  }
};

function generateDynamicRoleRequirements(roleTitle) {
  const lowered = (roleTitle || '').toLowerCase();
  
  const STANDARDS = {
    'python': { required: ['Python', 'SQL', 'REST APIs', 'Git'], preferred: ['FastAPI', 'Docker', 'PostgreSQL'], certs: ['PCEP / PCAP Python Certification'] },
    'software': { required: ['Java', 'Python', 'SQL', 'Git', 'Data Structures'], preferred: ['System Design', 'Agile', 'Docker'], certs: ['AWS Certified Developer'] },
    'full stack': { required: ['JavaScript', 'React', 'Node.js', 'HTML/CSS', 'SQL'], preferred: ['Git', 'REST APIs', 'TypeScript'], certs: ['Meta Front-End Developer'] },
    'backend': { required: ['Python', 'Node.js', 'SQL', 'REST APIs'], preferred: ['Docker', 'Git', 'System Design'], certs: ['AWS Solutions Architect'] },
    'frontend': { required: ['JavaScript', 'HTML/CSS', 'React', 'Git'], preferred: ['TypeScript', 'Redux', 'Tailwind CSS'], certs: ['Meta Front-End Developer'] },
    'data analyst': { required: ['SQL', 'Excel', 'Python', 'Statistics'], preferred: ['Tableau', 'Power BI', 'Data Cleaning'], certs: ['Google Data Analytics Certificate'] },
    'data scientist': { required: ['Python', 'SQL', 'Statistics', 'Machine Learning'], preferred: ['Pandas', 'Scikit-Learn', 'Deep Learning'], certs: ['IBM Data Science Professional'] },
    'machine learning': { required: ['Python', 'Machine Learning', 'PyTorch', 'Scikit-Learn'], preferred: ['Docker', 'Git', 'TensorFlow'], certs: ['DeepLearning.AI ML Specialization'] },
    'devops': { required: ['Docker', 'Kubernetes', 'CI/CD', 'Linux'], preferred: ['AWS', 'Terraform', 'Git'], certs: ['Certified Kubernetes Administrator'] },
    'cloud': { required: ['AWS', 'Docker', 'Linux', 'Cloud Architecture'], preferred: ['Kubernetes', 'Python', 'Terraform'], certs: ['AWS Solutions Architect Associate'] },
    'cyber security': { required: ['Network Security', 'Linux', 'Vulnerability Assessment'], preferred: ['SIEM Tools', 'Python', 'Firewall Management'], certs: ['CompTIA Security+ / CEH'] },
    'ui/ux': { required: ['Figma', 'Wireframing', 'Prototyping', 'User Research'], preferred: ['Design Systems', 'Adobe XD', 'Usability Testing'], certs: ['Google UX Design Certificate'] },

    'business analyst': { required: ['Requirements Gathering', 'SQL', 'Excel', 'Stakeholder Management'], preferred: ['JIRA', 'Business Process Modeling', 'Power BI'], certs: ['CBAP / ECBA Certification'] },
    'product manager': { required: ['Product Roadmapping', 'Agile/Scrum', 'Data Analytics', 'Stakeholder Management'], preferred: ['User Research', 'A/B Testing', 'JIRA'], certs: ['Certified Scrum Product Owner (CSPO)'] },
    'project manager': { required: ['Project Planning', 'Agile/Scrum', 'Risk Management', 'Stakeholder Communication'], preferred: ['MS Project', 'JIRA', 'Budgeting'], certs: ['PMP / CAPM Certification'] },
    'management consultant': { required: ['Strategy', 'Financial Modeling', 'PowerPoint', 'Excel'], preferred: ['Case Analysis', 'Stakeholder Management'], certs: ['Certified Management Consultant (CMC)'] },
    'operations': { required: ['Process Optimization', 'Supply Chain Management', 'Excel', 'Vendor Management'], preferred: ['ERP Systems', 'Lean/Six Sigma'], certs: ['Six Sigma Green Belt'] },

    'financial analyst': { required: ['Financial Modeling', 'Excel', 'Accounting', 'Valuation'], preferred: ['Bloomberg Terminal', 'SQL', 'Financial Reporting'], certs: ['CFA / FRM Certification'] },
    'accountant': { required: ['Tally', 'Excel', 'GST Filing', 'Financial Statements'], preferred: ['Auditing', 'SAP FICO', 'Taxation'], certs: ['Chartered Accountant (CA) / CPA'] },
    'credit analyst': { required: ['Credit Risk Assessment', 'Financial Analysis', 'Excel', 'Regulatory Compliance'], preferred: ['Banking Operations', 'SQL'], certs: ['Credit Risk Certified (CRC)'] },
    'banking': { required: ['Banking Operations', 'KYC/AML', 'Excel', 'Customer Relationship'], preferred: ['Financial Products', 'Regulatory Compliance'], certs: ['Banking Professional Certification'] },

    'marketing': { required: ['Digital Marketing', 'SEO/SEM', 'Google Analytics', 'Social Media Marketing'], preferred: ['Content Strategy', 'Email Marketing', 'Canva'], certs: ['HubSpot Inbound Marketing / Google Ads'] },
    'sales': { required: ['CRM Tools', 'Negotiation', 'Lead Generation', 'Communication'], preferred: ['Salesforce', 'Market Research', 'Pipeline Management'], certs: ['HubSpot Sales Certified'] },
    'content': { required: ['Content Writing', 'SEO', 'WordPress', 'Copywriting'], preferred: ['Social Media', 'Content Strategy', 'Google Analytics'], certs: ['Content Marketing Certification'] },
    'hr': { required: ['Recruitment', 'Employee Relations', 'HRIS Systems', 'Interviewing'], preferred: ['Payroll Management', 'Labor Law', 'LinkedIn Recruiter'], certs: ['SHRM / PHR Certification'] },

    'mechanical': { required: ['AutoCAD', 'SolidWorks', 'Thermodynamics', 'Manufacturing Processes'], preferred: ['Quality Control', 'Project Management'], certs: ['SolidWorks Certification'] },
    'civil': { required: ['AutoCAD', 'Structural Analysis', 'Site Supervision', 'Estimation'], preferred: ['Project Management', 'Concrete Technology'], certs: ['AutoCAD Certified Professional'] },
    'electrical': { required: ['Circuit Design', 'PLC Programming', 'AutoCAD Electrical', 'Power Systems'], preferred: ['Embedded Systems', 'Safety Standards'], certs: ['Certified Electrical Engineer'] },
    'research': { required: ['Research Methodology', 'Data Analysis', 'Literature Review', 'Statistical Tools'], preferred: ['Report Writing', 'SPSS/R'], certs: ['Certified Research Professional'] }
  };

  for (const [key, val] of Object.entries(STANDARDS)) {
    if (lowered.includes(key)) {
      return {
        required: val.required,
        preferred: val.preferred,
        certifications: val.certs,
        tools: ['Excel', 'MS Office', 'Productivity Suite'],
        exp: '1-3 years relevant domain experience'
      };
    }
  }

  const words = (roleTitle || '').split(/\s+/).filter(w => w.length > 2);
  const customSkills = words.length > 0 ? words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : ['Domain Expertise'];
  return {
    required: [...customSkills, 'Problem Solving', 'Communication', 'Industry Knowledge'],
    preferred: ['Project Coordination', 'Strategic Planning', 'Documentation'],
    certifications: [`Recognized Professional Credential in ${roleTitle}`],
    tools: ['Industry Tools', 'Productivity Suite'],
    exp: `1-3 years specialized experience in ${roleTitle}`
  };
}

function getCompanyRoleRequirements(company, role) {
  let base = ROLE_BASE_REQUIREMENTS[role];
  if (!base) {
    const roleLower = (role || '').toLowerCase();
    for (const [k, v] of Object.entries(ROLE_BASE_REQUIREMENTS)) {
      if (roleLower.includes(k.toLowerCase()) || k.toLowerCase().includes(roleLower)) {
        base = v;
        break;
      }
    }
  }
  if (!base) {
    base = generateDynamicRoleRequirements(role);
  }

  const modifier = COMPANY_MODIFIERS[company] || null;
  
  const reqs = {
    company: company || 'Target Company',
    role: role || 'Target Role',
    requiredSkills: [...(base.required || ['Communication', 'Problem Solving'])],
    preferredSkills: [...(base.preferred || ['Teamwork', 'Project Management'])],
    tools: [...(base.tools || ['Productivity Suite'])],
    certifications: [...(base.certifications || ['Relevant Professional Certification'])],
    exp: base.exp || '1-3 years professional experience'
  };
  
  // Add modifiers
  if (modifier) {
    if (modifier.requiredAdd) {
      modifier.requiredAdd.forEach(s => {
        if (!reqs.requiredSkills.includes(s)) reqs.requiredSkills.push(s);
      });
    }
    if (modifier.toolsAdd) {
      modifier.toolsAdd.forEach(t => {
        if (!reqs.tools.includes(t)) reqs.tools.push(t);
      });
    }
    if (modifier.prefCert && !reqs.certifications.includes(modifier.prefCert)) {
      reqs.certifications.push(modifier.prefCert);
    }
  }
  return reqs;
}

// --- 1b. ANALYSIS ENGINE ---
function performAnalysis(state) {
  const company = state.targetCompany || 'Target Company';
  const role = state.targetRole || 'Target Role';
  const reqs = getCompanyRoleRequirements(company, role);
  
  const candidateSkills = state.profile.skills || [];
  const candidateExpText = state.profile.experience || '';
  const candidateProjText = state.profile.projects || '';
  
  // 1. Calculate Technical Skills Score
  const allNeededSkills = [...new Set([...reqs.requiredSkills, ...reqs.preferredSkills])];
  let matchedSkillsCount = 0;
  
  const skillMatches = allNeededSkills.map(skill => {
    const hasSkill = candidateSkills.some(s => s.toLowerCase() === skill.toLowerCase() || s.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(s.toLowerCase()));
    if (hasSkill) matchedSkillsCount++;
    
    const isRequired = reqs.requiredSkills.includes(skill);
    return {
      name: skill,
      status: hasSkill ? 'strong' : (isRequired ? 'missing' : 'partial'),
      indicator: hasSkill ? '✅' : (isRequired ? '❌' : '⚠️'),
      text: hasSkill ? 'Strong Match' : (isRequired ? 'Missing' : 'Partial Match'),
      isRequired: isRequired
    };
  });
  
  const techScore = allNeededSkills.length > 0 ? Math.round((matchedSkillsCount / allNeededSkills.length) * 100) : 70;
  
  // 2. Calculate Projects Score
  let projectMatchCount = 0;
  allNeededSkills.forEach(skill => {
    if (candidateProjText.toLowerCase().includes(skill.toLowerCase())) {
      projectMatchCount++;
    }
  });
  const projectsScore = Math.min(100, 70 + (projectMatchCount * 5));
  
  // 3. Calculate Experience Score
  let experienceScore = 55;
  if (candidateExpText.toLowerCase().includes('year') || candidateExpText.toLowerCase().includes('yr')) {
    experienceScore = 80;
    if (candidateExpText.toLowerCase().includes('2') || candidateExpText.toLowerCase().includes('3')) {
      experienceScore = 90;
    }
  } else if (candidateExpText.toLowerCase().includes('month') || candidateExpText.toLowerCase().includes('intern')) {
    experienceScore = 65;
  }
  
  // 4. Calculate Certifications Score
  let certificationsScore = 65;
  const hasCert = reqs.certifications.some(cert => 
    candidateProjText.toLowerCase().includes(cert.toLowerCase()) || 
    candidateExpText.toLowerCase().includes(cert.toLowerCase()) ||
    (state.profile.education && state.profile.education.toLowerCase().includes(cert.toLowerCase()))
  );
  if (hasCert) {
    certificationsScore = 90;
  } else if (candidateSkills.includes('AWS') || candidateSkills.includes('Cloud')) {
    certificationsScore = 75;
  }
  
  // 5. Calculate Role Alignment Score
  let roleAlignmentScore = 75;
  if (role.toLowerCase().includes('developer') && candidateSkills.includes('JavaScript')) {
    roleAlignmentScore += 5;
  }
  if (role.toLowerCase().includes('python') && candidateSkills.includes('Python')) {
    roleAlignmentScore += 10;
  }
  roleAlignmentScore = Math.min(100, roleAlignmentScore);
  
  // Overall score: weighted average
  const overallScore = Math.round(
    (techScore * 0.40) + 
    (projectsScore * 0.15) + 
    (experienceScore * 0.15) + 
    (certificationsScore * 0.10) + 
    (roleAlignmentScore * 0.20)
  );
  
  // Calculate Skill Gaps
  const gaps = [];
  const missingSkills = skillMatches.filter(m => m.status === 'missing' || m.status === 'partial');
  
  missingSkills.forEach(m => {
    let priority = 'low';
    let explainer = '';
    
    if (m.isRequired) {
      priority = 'high';
      explainer = `Core skill required for ${role} positions at ${company}. Critical for pipeline development and technical testing.`;
    } else {
      priority = 'medium';
      explainer = `Preferred framework/tool that gives candidates a significant edge during the ${company} evaluation process.`;
    }
    
    if (m.name.toLowerCase().includes('unit testing') || m.name.toLowerCase().includes('test')) {
      priority = 'low';
      explainer = `Important for QA automation. While not a blocker for entry, understanding test suites prevents production bottlenecks.`;
    }
    
    gaps.push({
      name: m.name,
      priority: priority,
      explainer: explainer,
      topics: getSkillTopics(m.name)
    });
  });
  
  // Generate Roadmap Timeline
  const roadmapSteps = gaps.map((gap, idx) => {
    return {
      id: idx + 1,
      name: gap.name,
      priority: gap.priority,
      completed: false,
      topics: gap.topics,
      resources: getSkillResources(gap.name)
    };
  });
  
  // Add a recommended project to the end of the roadmap
  const recommendedProject = getProjectRecommendation(role, gaps);
  
  // Recommended alternative roles calculations
  const recommendedAlternativeRoles = ROLES.filter(r => r !== role).map(r => {
    const rReqs = ROLE_BASE_REQUIREMENTS[r];
    let matchedCount = 0;
    rReqs.required.forEach(s => {
      if (candidateSkills.some(cs => cs.toLowerCase() === s.toLowerCase())) {
        matchedCount++;
      }
    });
    const alignmentPct = Math.round(50 + (matchedCount / rReqs.required.length) * 40);
    return {
      role: r,
      match: Math.min(95, alignmentPct)
    };
  }).sort((a, b) => b.match - a.match).slice(0, 4);
  
  return {
    company: company,
    role: role,
    requirements: reqs,
    overallScore: overallScore,
    categories: {
      tech: techScore,
      projects: projectsScore,
      experience: experienceScore,
      certifications: certificationsScore,
      alignment: roleAlignmentScore
    },
    skillMatches: skillMatches,
    gaps: gaps,
    roadmap: roadmapSteps,
    recommendedProject: recommendedProject,
    alternativeRoles: recommendedAlternativeRoles
  };
}

function getSkillTopics(skillName) {
  const topics = {
    'Python': 'Data structures, Functions, OOP principles, File I/O, Generators',
    'SQL': 'Joins, Aggregations, Window Functions, Indexing, Subqueries, CRUD operations',
    'REST APIs': 'HTTP verbs (GET/POST/PUT/DELETE), Headers, JSON format, Status Codes, Authentication',
    'REST API Development': 'Routing, Controller logic, Serializers, Authentication, Request validations',
    'Git': 'Commits, Branches, Merging, Pull requests, Merge conflicts, Rebase',
    'Git & GitHub': 'Local commands (commit/push/pull), Remote repos, Pull requests, Branching workflow',
    'Flask': 'App routing, Request contexts, Templates, Blueprints, RESTful design',
    'Django': 'ORM queries, MVC model patterns, Admin interface, Middleware configuration',
    'Docker': 'Dockerfiles, Container states, Port forwarding, Docker Compose basics',
    'Unit Testing': 'Assertion syntax, Mocking databases, Integration tests, Test coverage reporting',
    'Cloud Fundamentals': 'S3 Buckets, EC2 Instances, Cloud Practitioner basics, Deployment structures',
    'AWS': 'EC2, S3, RDS, Lambda functions, IAM policies',
    'Java': 'OOP principles, Multi-threading, JVM memory model, Collection framework',
    'Spring Boot': 'Dependency Injection, JPA Hibernate configuration, Controller endpoints',
    'React': 'State hooks, Component lifecycle, Virtual DOM, Props, Context API',
    'Node.js': 'Event loops, Express routes, Asynchronous callbacks, NPM package management',
    'JavaScript': 'ES6 syntax, Promises, DOM manipulation, Closures, Scopes',
    'HTML/CSS': 'Semantic markup, Flexbox/Grid layouts, Responsive media queries, Transitions',
    'TypeScript': 'Interfaces, Strong typing, Enums, Generics compiler configs',
    'Next.js': 'Server components, Static generation (SSG), Dynamic paths, Client routers',
    'Redux': 'Reducers, Actions, Store dispatching, Selectors state management',
    'Tailwind CSS': 'Utility-first styling grid layouts, Breakpoints sizing styles',
    'Excel': 'Pivot tables, VLOOKUP/XLOOKUP, Charting, Basic statistical functions',
    'Tableau': 'Data source mapping, Dashboards design, Worksheet creations, Dimensions metrics',
    'Power BI': 'DAX query syntax, Data models, Direct Query integrations',
    'Statistics': 'Probability distributions, Hypothesis testing, Regression models, P-values',
    'Machine Learning': 'Supervised learning algorithms (Regression/Classification), Clustering, Overfitting, Validation sets',
    'TensorFlow': 'Neural Network layers, Gradient Descent fitting, Dataset pipelines',
    'PyTorch': 'Tensors operations, Autograd graph calculations, Optimizer settings',
    'ServiceNow ITSM': 'Incident management records, SLA configs, Catalog workflow builds',
    'ServiceNow CAD': 'Business Rules scripting, UI Policies, Client Scripts APIs',
    'IntegrationHub': 'Flow Designer spokes, Web Service integrations (REST/SOAP)'
  };
  return topics[skillName] || 'Foundational syntax, tools, architecture, and developer best practices.';
}

function getSkillResources(skillName) {
  const resources = {
    'REST APIs': [
      { text: 'REST API Tutorial (Beginner)', url: 'https://www.youtube.com/watch?v=qbLc5a9jdXo' },
      { text: 'REST API MDN Docs (Intermediate)', url: 'https://developer.mozilla.org/en-US/docs/Glossary/REST' },
      { text: 'Postman Academy Practice (Practice)', url: 'https://academy.postman.com/' }
    ],
    'REST API Development': [
      { text: 'Designing REST APIs Guide (Beginner)', url: 'https://freecodecamp.org/news/rest-api-design-best-practices/' },
      { text: 'Flask-RESTful endpoints documentation (Intermediate)', url: 'https://flask-restful.readthedocs.io/' },
      { text: 'API Practice - JSONPlaceholder (Practice)', url: 'https://jsonplaceholder.typicode.com/' }
    ],
    'Git & GitHub': [
      { text: 'Git Crash Course (Beginner)', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk' },
      { text: 'GitHub Guides - PRs (Intermediate)', url: 'https://docs.github.com/en/get-started' },
      { text: 'Git Branching Game (Practice)', url: 'https://learngitbranching.js.org/' }
    ],
    'Cloud Fundamentals': [
      { text: 'AWS Cloud Practitioner Prep (Beginner)', url: 'https://www.youtube.com/watch?v=SOTamWGuqXs' },
      { text: 'Official AWS Developer Docs (Intermediate)', url: 'https://docs.aws.amazon.com/' },
      { text: 'AWS Hands-On Labs (Practice)', url: 'https://aws.amazon.com/getting-started/hands-on-labs/' }
    ],
    'Unit Testing': [
      { text: 'Jest Getting Started (Beginner)', url: 'https://jestjs.io/docs/getting-started' },
      { text: 'Unit Testing Guide (Intermediate)', url: 'https://freecodecamp.org/news/unit-testing-guide/' },
      { text: 'Exercism Coding Challenges (Practice)', url: 'https://exercism.org/' }
    ],
    'Docker': [
      { text: 'Docker for Beginners (Beginner)', url: 'https://www.youtube.com/watch?v=3c-iBn73dDE' },
      { text: 'Dockerfile Reference (Intermediate)', url: 'https://docs.docker.com/engine/reference/builder/' },
      { text: 'Play with Docker sandbox (Practice)', url: 'https://labs.play-with-docker.com/' }
    ],
    'SQL': [
      { text: 'SQL Basics Course (Beginner)', url: 'https://www.khanacademy.org/computing/computer-programming/sql' },
      { text: 'W3Schools SQL Reference (Intermediate)', url: 'https://www.w3schools.com/sql/' },
      { text: 'LeetCode Database Problems (Practice)', url: 'https://leetcode.com/problemset/database/' }
    ],
    'Python': [
      { text: 'Python for Beginners (Beginner)', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc' },
      { text: 'Real Python Tutorials (Intermediate)', url: 'https://realpython.com/' },
      { text: 'HackerRank Python Problems (Practice)', url: 'https://www.hackerrank.com/domains/python' }
    ]
  };
  return resources[skillName] || [
    { text: `${skillName} Beginners Tutorial`, url: 'https://www.youtube.com/' },
    { text: `${skillName} Documentation`, url: 'https://docs.microsoft.com/' },
    { text: `Practice ${skillName} Exercises`, url: 'https://leetcode.com/' }
  ];
}

function getProjectRecommendation(role, gaps) {
  const hasRestGaps = gaps.some(g => g.name.toLowerCase().includes('api') || g.name.toLowerCase().includes('rest'));
  
  if (role.includes('Python') || hasRestGaps) {
    return {
      title: 'Python REST API Employee Management System',
      description: 'Build a fully-functional CRUD REST API using Flask or Django, integrated with SQLite, with full authentication and unit tests.',
      why: 'It directly helps you master the skills required by targeting Python, Flask/Django, REST APIs, SQL, and Unit Testing.'
    };
  }
  
  if (role.includes('Frontend') || role.includes('UI')) {
    return {
      title: 'React Corporate Dashboard with Tailwind',
      description: 'Create a responsive administrative dashboard using React and Tailwind CSS, featuring interactive charts, dark mode, and state management.',
      why: 'It exercises React component architecture, state libraries, Tailwind styling, and responsive user interfaces.'
    };
  }
  
  return {
    title: 'Enterprise Task Management System',
    description: 'Build a secure task tracker application with database persistence, user registration, role audits, and a clean web interface.',
    why: 'It verifies full-stack integration, database queries, and secure API endpoints.'
  };
}

// --- STATE MANAGER (User-keyed LocalStorage) ---
const State = {
  // Returns the localStorage key for the currently logged-in user
  _key() {
    const email = localStorage.getItem('currentUser') || 'guest';
    return `data_${email}`;
  },

  getDefaults() {
    const defaultState = {
      targetCompany: '',
      targetRole: '',
      profile: {
        name: 'New User',
        experience: '',
        education: '',
        projects: '',
        skills: []
      },
      scoreHistory: [],
      roadmap: [],
      backendAnalysis: null
    };
    return defaultState;
  },

  get() {
    const raw = localStorage.getItem(this._key());
    if (!raw) {
      return this.getDefaults();
    }
    return JSON.parse(raw);
  },

  set(state) {
    localStorage.setItem(this._key(), JSON.stringify(state));
  },

  calculateScore(state) {
    const analysis = performAnalysis(state);
    return analysis.overallScore;
  }
};

// --- THEME & HEADER ACTIONS ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const body = document.body;
  
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
  }

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      body.classList.toggle('dark-mode');
      const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
      localStorage.setItem('theme', currentTheme);
      showToast(`Switched to ${currentTheme} theme`, 'info');
    });
  }
}

function initNavbarScroll() {
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

function initActiveNavLink() {
  const links = document.querySelectorAll('.nav-link');
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href === page) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initNavbarAuth() {
  const currentUser = localStorage.getItem('currentUser');
  const users       = JSON.parse(localStorage.getItem('cm_users') || '{}');
  const userRecord  = currentUser ? users[currentUser] : null;
  const isLoggedIn  = !!currentUser;

  const navMenu    = document.querySelector('.nav-menu');
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  // --- Control nav-menu visibility ---
  if (navMenu) {
    if (isLoggedIn) {
      // Ensure all nav links are visible
      navMenu.innerHTML = `
        <li><a href="index.html" class="nav-link">Home</a></li>
        <li><a href="upload.html" class="nav-link">Analyze</a></li>
        <li><a href="profile.html" class="nav-link">Profile</a></li>
        <li><a href="score.html" class="nav-link">Score</a></li>
        <li><a href="gaps.html" class="nav-link">Gaps</a></li>
        <li><a href="roadmap.html" class="nav-link">Roadmap</a></li>
        <li><a href="progress.html" class="nav-link">Progress</a></li>
      `;
    } else {
      // Only Home visible when logged out
      navMenu.innerHTML = `<li><a href="index.html" class="nav-link">Home</a></li>`;
    }
  }

  // Re-apply active link after rebuilding menu
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === page);
  });

  // --- Remove existing auth buttons ---
  navActions.querySelectorAll('a.btn, button.btn').forEach(el => el.remove());

  if (isLoggedIn) {
    // User name badge (safely handle missing userRecord.name)
    let displayName = 'User';
    if (userRecord && userRecord.name) {
      displayName = userRecord.name.split(' ')[0];
    } else if (currentUser && typeof currentUser === 'string' && currentUser.includes('@')) {
      displayName = currentUser.split('@')[0];
    }
    const userBadge = document.createElement('span');
    userBadge.style.cssText = 'font-size:0.82rem;font-weight:600;color:var(--primary);opacity:0.9;white-space:nowrap;';
    userBadge.textContent = `Hi, ${displayName}`;
    navActions.appendChild(userBadge);

    // Logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-secondary';
    logoutBtn.textContent = 'Logout';
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('cm_logged_in');
      showToast('Logged out successfully.', 'info');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    });
    navActions.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement('a');
    loginBtn.href = 'index.html';
    loginBtn.className = 'btn btn-primary';
    loginBtn.style.cssText = 'padding: 0.4rem 0.95rem; font-size: 0.88rem;';
    loginBtn.textContent = 'Sign In / Register';
    navActions.appendChild(loginBtn);
  }
}

// --- TOAST NOTIFICATIONS ---
let toastContainer;
function initToastContainer() {
  toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
}

function showToast(message, type = 'success') {
  if (!toastContainer) initToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✓';
  if (type === 'warning') icon = '⚠';
  if (type === 'danger') icon = '✕';
  if (type === 'info') icon = 'ℹ';
  
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <span style="font-weight:700;">${icon}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });
  
  setTimeout(() => {
    toast.style.animation = 'slide-toast-in 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- CONFETTI PARTICLE EFFECT ---
function triggerConfetti() {
  const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.top = `-10px`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `scale(${Math.random() * 0.8 + 0.4})`;
    
    const duration = Math.random() * 1.5 + 1;
    confetti.style.animation = `confetti-fall ${duration}s ease-out forwards`;
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), duration * 1000);
  }
}

// --- Searchable Dropdown Helper ---
function setupSearchableDropdown({
  wrapperId,
  triggerId,
  optionsId,
  searchId,
  listId,
  selectedTextId,
  items,
  allowCustom = true,
  onSelect
}) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = document.getElementById(triggerId);
  const options = document.getElementById(optionsId);
  const searchInput = document.getElementById(searchId);
  const listContainer = document.getElementById(listId);
  const selectedText = document.getElementById(selectedTextId);

  if (!wrapper || !trigger || !options || !searchInput || !listContainer || !selectedText) return null;

  // If already initialized on this wrapper, just update items & callback
  if (wrapper._dropdownInstance) {
    wrapper._dropdownInstance.updateItems(items);
    if (onSelect) wrapper._dropdownInstance.onSelect = onSelect;
    return wrapper._dropdownInstance;
  }

  let currentItems = [...items];
  let currentOnSelect = onSelect;

  function selectValue(val) {
    if (!val) return;
    selectedText.textContent = val;
    selectedText.style.opacity = '1';
    options.classList.remove('open');
    if (typeof currentOnSelect === 'function') {
      currentOnSelect(val);
    }
  }

  function renderItems(filterText = '') {
    listContainer.innerHTML = '';
    const cleanFilter = (filterText || '').trim();
    const filtered = currentItems.filter(item => item.toLowerCase().includes(cleanFilter.toLowerCase()));
    const hasExactMatch = currentItems.some(item => item.toLowerCase() === cleanFilter.toLowerCase());
    
    if (cleanFilter.length > 0 && !hasExactMatch && allowCustom) {
      const customOption = document.createElement('div');
      customOption.className = 'custom-option';
      customOption.style.cssText = 'color: var(--primary); font-weight: 600; border-bottom: 1px dashed var(--border-color); background: rgba(79, 70, 229, 0.08);';
      customOption.innerHTML = `✨ Select Custom Target: <strong>"${cleanFilter}"</strong>`;
      
      customOption.addEventListener('click', (e) => {
        e.stopPropagation();
        selectValue(cleanFilter);
      });
      listContainer.appendChild(customOption);
    }

    if (filtered.length === 0 && (!cleanFilter || !allowCustom)) {
      listContainer.innerHTML = '<div style="padding:0.75rem 1rem; color:var(--text-muted); font-size:0.9rem;">No results found — type to enter any name</div>';
      return;
    }
    
    filtered.forEach(item => {
      const option = document.createElement('div');
      option.className = 'custom-option';
      option.dataset.value = item;
      option.textContent = item;
      
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        selectValue(item);
      });
      listContainer.appendChild(option);
    });
  }
  
  renderItems();
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-options').forEach(opt => {
      if (opt !== options) opt.classList.remove('open');
    });
    options.classList.toggle('open');
    if (options.classList.contains('open')) {
      searchInput.value = '';
      renderItems();
      setTimeout(() => searchInput.focus(), 60);
    }
  });
  
  searchInput.addEventListener('input', () => {
    renderItems(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = searchInput.value.trim();
      if (clean) {
        selectValue(clean);
      } else {
        const firstOption = listContainer.querySelector('.custom-option');
        if (firstOption) firstOption.click();
      }
    }
  });

  options.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const instance = {
    updateItems: (newItems) => {
      currentItems = [...newItems];
      renderItems(searchInput.value);
    },
    selectValue,
    set onSelect(fn) {
      currentOnSelect = fn;
    }
  };

  wrapper._dropdownInstance = instance;
  return instance;
}

// --- 2. INDEX.HTML (LANDING PAGE) ---
function initLandingPage() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('page-anim');
        entry.target.style.opacity = 1;
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  const revealElements = document.querySelectorAll('.scroll-reveal');
  revealElements.forEach(el => {
    el.style.opacity = 0;
    observer.observe(el);
  });
}

// --- 3. LOGIN.HTML (AUTH PAGE) ---
function initLoginPage() {
  const loginForm = document.getElementById('login-form-content');
  const signupForm = document.getElementById('signup-form-content');
  const showSignupLink = document.getElementById('show-signup');
  const showLoginLink = document.getElementById('show-login');

  if (showSignupLink && signupForm && loginForm) {
    showSignupLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
      signupForm.classList.add('page-anim');
    });
  }

  // Login/Signup logic is handled by inline script in login.html
  // initLoginPage is kept as a no-op for compatibility
}


// --- 1c. CLIENT-SIDE RESUME TEXT PARSERS ---
async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  }
  throw new Error("PDF.js library not loaded.");
}

async function parseDOCX(file) {
  const arrayBuffer = await file.arrayBuffer();
  if (typeof mammoth !== 'undefined') {
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  }
  throw new Error("Mammoth.js library not loaded.");
}

async function parseTXT(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

function extractProfileFromText(text) {
  const skillsList = [
    'Python', 'Java', 'JavaScript', 'HTML/CSS', 'React', 'Node.js', 'SQL', 'Git',
    'Spring Boot', 'Flask', 'Django', 'Docker', 'Unit Testing', 'Cloud Fundamentals',
    'AWS', 'Kubernetes', 'TensorFlow', 'PyTorch', 'ServiceNow ITSM', 'ServiceNow CAD',
    'IntegrationHub', 'Tableau', 'Excel', 'Power BI', 'Statistics', 'Machine Learning',
    'PostgreSQL', 'MongoDB', 'TypeScript', 'Next.js', 'Redux', 'Tailwind CSS', 'C++',
    'C#', 'PHP', 'Ruby', 'Linux', 'Data Structures', 'Algorithms'
  ];
  
  const extractedSkills = [];
  skillsList.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      extractedSkills.push(skill);
    }
  });
  
  if (extractedSkills.length === 0) {
    extractedSkills.push('JavaScript', 'HTML/CSS', 'Git');
  }

  let experienceText = 'No prior work experience listed.';
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const expLines = lines.filter(line => 
    line.toLowerCase().includes('experience') || 
    line.toLowerCase().includes('intern') || 
    line.toLowerCase().includes('developer') || 
    line.toLowerCase().includes('analyst') ||
    line.toLowerCase().includes('engineer') ||
    line.toLowerCase().includes('work')
  );
  if (expLines.length > 0) {
    experienceText = expLines.slice(0, 2).join('; ').trim();
    if (experienceText.length > 200) experienceText = experienceText.substring(0, 200) + '...';
  }

  let educationText = 'No formal education details detected.';
  const eduLines = lines.filter(line => {
    const l = line.toLowerCase();
    return l.includes('university') || l.includes('college') || l.includes('degree') ||
           l.includes('bachelor') || l.includes('master') || l.includes('diploma') ||
           l.includes('b.sc') || l.includes('bsc') || l.includes('b.com') || l.includes('bcom') ||
           l.includes('bca') || l.includes('mca') || l.includes('bba') || l.includes('mba') ||
           l.includes('b.tech') || l.includes('btech') || l.includes('b.e') || l.includes('be') ||
           l.includes('b.a') || l.includes('ba') || l.includes('school') || l.includes('institute');
  });
  if (eduLines.length > 0) {
    educationText = eduLines.slice(0, 1).join(' ').trim();
  }

  let projectsText = 'No project details detected.';
  const projLines = lines.filter(line => 
    line.toLowerCase().includes('project') || 
    line.toLowerCase().includes('developed') || 
    line.toLowerCase().includes('built') || 
    line.toLowerCase().includes('portfolio')
  );
  if (projLines.length > 0) {
    projectsText = projLines.slice(0, 2).join('; ').trim();
    if (projectsText.length > 200) projectsText = projectsText.substring(0, 200) + '...';
  }

  return {
    name: extractName(text),
    skills: extractedSkills,
    experience: experienceText,
    education: educationText,
    projects: projectsText
  };
}

function extractName(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length > 0 && lines[0].length < 30) {
    return lines[0];
  }
  return 'Candidate Profile';
}

// --- 4. UPLOAD.HTML (UPLOAD & SIMULATE) ---
const API_BASE = 'http://localhost:8000/api';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('cm_token');
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP Error ${res.status}`);
  }
  return await res.json();
}

function initUploadPage() {
  const dropzone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const overlay = document.getElementById('loader-overlay');
  
  let selectedCompany = '';
  let selectedRole = '';
  let resumeStaged = false;
  let stagedFile = null;

  // If user already has profile skills in state, mark resume as staged
  const existingState = State.get();
  if (existingState.profile && existingState.profile.skills && existingState.profile.skills.length > 0) {
    resumeStaged = true;
  }

  // 1. Initialize Role dropdown immediately with all base ROLES
  const roleDropdown = setupSearchableDropdown({
    wrapperId: 'role-select-wrapper',
    triggerId: 'role-trigger',
    optionsId: 'role-options',
    searchId: 'role-search',
    listId: 'role-options-list',
    selectedTextId: 'selected-role-text',
    items: ROLES,
    allowCustom: true,
    onSelect: (val) => {
      selectedRole = val;
      checkValidation();
      showToast(`Target Job Role set to: ${val}`, 'info');
    }
  });

  // 2. Initialize Company dropdown immediately with default COMPANIES
  const companyDropdown = setupSearchableDropdown({
    wrapperId: 'company-select-wrapper',
    triggerId: 'company-trigger',
    optionsId: 'company-options',
    searchId: 'company-search',
    listId: 'company-options-list',
    selectedTextId: 'selected-company-text',
    items: COMPANIES,
    allowCustom: true,
    onSelect: (val) => {
      selectedCompany = val;
      loadRolesForCompany(val);
      checkValidation();
      showToast(`Target Company set to: ${val}`, 'info');
    }
  });

  // 3. Dynamically enrich company suggestions from API if available
  apiFetch('/companies').then(data => {
    if (data.companies && data.companies.length && companyDropdown) {
      companyDropdown.updateItems(data.companies);
    }
  }).catch(() => {});

  function loadRolesForCompany(companyName) {
    apiFetch(`/roles/${encodeURIComponent(companyName)}`).then(data => {
      if (data.roles && data.roles.length && roleDropdown) {
        roleDropdown.updateItems(data.roles);
      }
    }).catch(() => {});
  }

  // Global click to close custom dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.custom-options').forEach(opt => opt.classList.remove('open'));
  });

  function checkValidation() {
    if (selectedCompany && selectedRole) {
      analyzeBtn.removeAttribute('disabled');
    } else {
      analyzeBtn.setAttribute('disabled', 'true');
    }
  }

  // Drag & Drop listeners
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    
    ['dragleave', 'drop'].forEach(event => {
      dropzone.addEventListener(event, () => {
        dropzone.classList.remove('dragover');
      });
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(fileInput.files[0]);
      }
    });
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  async function handleFileSelect(file) {
    const dropzoneContent = dropzone.querySelector('.dropzone-content');
    if (dropzoneContent) {
      dropzoneContent.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📄</div>
        <h4 style="margin-bottom: 0.25rem;">${file.name}</h4>
        <p style="font-size: 0.8rem; color: var(--success);">File loaded. Parsing resume text via backend...</p>
      `;
      stagedFile = file;
      resumeStaged = true;
      checkValidation();

      // Upload file to backend resume parser if possible
      const formData = new FormData();
      formData.append('file', file);

      try {
        const result = await apiFetch('/resume/upload', {
          method: 'POST',
          body: formData
        });
        showToast('Resume parsed successfully by backend AI!', 'success');
        if (result.extracted) {
          const state = State.get();
          if (result.extracted.skills) state.profile.skills = result.extracted.skills;
          if (result.extracted.experience) state.profile.experience = typeof result.extracted.experience === 'string' ? result.extracted.experience : JSON.stringify(result.extracted.experience);
          if (result.extracted.education) state.profile.education = typeof result.extracted.education === 'string' ? result.extracted.education : JSON.stringify(result.extracted.education);
          if (result.extracted.projects) state.profile.projects = typeof result.extracted.projects === 'string' ? result.extracted.projects : JSON.stringify(result.extracted.projects);
          State.set(state);

          // Update saved profile on backend if logged in
          await apiFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify(state.profile)
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Client fallback for resume parsing", err);
        // Fallback to client-side parser
        try {
          let text = '';
          if (file.name.endsWith('.pdf')) text = await parsePDF(file);
          else if (file.name.endsWith('.docx')) text = await parseDOCX(file);
          else text = await parseTXT(file);
          const parsed = extractProfileFromText(text);
          const state = State.get();
          state.profile = parsed;
          State.set(state);
          showToast('Resume parsed successfully!', 'success');
        } catch (parseErr) {
          console.warn("Local parse error", parseErr);
          showToast('Resume staged for analysis.', 'info');
        }
      }
    }
  }

  // Submit & trigger FastAPI analysis engine
  if (analyzeBtn && overlay) {
    analyzeBtn.addEventListener('click', async () => {
      overlay.classList.add('active');
      runStepSimulation();
      
      // Get optional job description text from paste area
      const jdTextInput = document.getElementById('jd-text-input');
      const jdText = jdTextInput ? jdTextInput.value.trim() : '';

      try {
        const state = State.get();
        state.targetCompany = selectedCompany;
        state.targetRole = selectedRole;

        const candidateSkills = (state.profile && state.profile.skills && state.profile.skills.length > 0)
          ? state.profile.skills
          : ['Communication', 'Problem Solving', 'Project Management'];

        // Run FastAPI analysis backend endpoint with full candidate profile
        const analysisData = await apiFetch('/analysis/run', {
          method: 'POST',
          body: JSON.stringify({
            target_company: selectedCompany,
            target_role: selectedRole,
            job_description_text: jdText || null,
            candidate_skills: candidateSkills,
            candidate_experience: (state.profile && state.profile.experience) ? String(state.profile.experience) : "",
            candidate_education: (state.profile && state.profile.education) ? String(state.profile.education) : "",
            candidate_projects: (state.profile && state.profile.projects) ? String(state.profile.projects) : ""
          })
        });

        if (analysisData) {
          state.overallScore = analysisData.readiness_score;
          state.roadmap = analysisData.roadmap || [];
          state.backendAnalysis = analysisData;
          State.set(state);
          showToast(`Analysis complete! Readiness Score: ${analysisData.readiness_score}%`, 'success');

          // Show requirement source badge
          const sourceBadge = document.getElementById('requirement-source-badge');
          if (sourceBadge && analysisData.requirement_label) {
            let icon = 'ℹ️';
            if (analysisData.requirement_source === 'live_job_api') icon = '✅';
            else if (analysisData.requirement_source === 'user_supplied') icon = '📋';
            sourceBadge.innerHTML = `${icon} <strong>Requirements source:</strong> ${analysisData.requirement_label}`;
            sourceBadge.style.display = 'block';
          }
        }
      } catch (err) {
        console.warn("Backend analysis fallback", err);
        const state = State.get();
        state.targetCompany = selectedCompany;
        state.targetRole = selectedRole;
        const analysis = performAnalysis(state);
        state.overallScore = analysis.overallScore;
        state.roadmap = analysis.roadmap;
        state.backendAnalysis = {
          target_company: selectedCompany,
          target_role: selectedRole,
          readiness_score: analysis.overallScore,
          category_scores: analysis.categories || {},
          required_skills: (analysis.skillMatches || []).map(m => m.name),
          strengths: (analysis.skillMatches || []).filter(m => m.status === 'strong').map(m => m.name),
          gaps: analysis.gaps || [],
          roadmap: analysis.roadmap || [],
          requirement_source: 'industry_benchmark',
          requirement_label: 'Industry Standard Benchmark (Offline Fallback)'
        };
        State.set(state);
      }
    });
  }

  function runStepSimulation() {
    const steps = document.querySelectorAll('.loading-step');
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep > 0) {
        steps[currentStep - 1].classList.remove('active');
        steps[currentStep - 1].classList.add('done');
      }
      
      if (currentStep < steps.length) {
        steps[currentStep].classList.add('active');
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          window.location.href = 'score.html';
        }, 1000);
      }
    }, 1200);
  }
}

// --- 5. PROFILE.HTML (PROFILE DATA CARD) ---
function initProfilePage() {
  const state = State.get();
  const form = document.getElementById('profile-form');
  const chipContainer = document.getElementById('skills-chip-container');
  const skillInput = document.getElementById('skill-add-input');
  const btnAddSkill = document.getElementById('skill-add-btn');

  // Fetch profile from backend if logged in
  apiFetch('/profile').then(data => {
    if (data.skills) state.profile.skills = data.skills;
    if (data.experience) state.profile.experience = typeof data.experience === 'string' ? data.experience : JSON.stringify(data.experience);
    if (data.education) state.profile.education = typeof data.education === 'string' ? data.education : JSON.stringify(data.education);
    if (data.projects) state.profile.projects = typeof data.projects === 'string' ? data.projects : JSON.stringify(data.projects);
    State.set(state);
    
    if (form) {
      if (document.getElementById('exp-field')) document.getElementById('exp-field').innerText = state.profile.experience;
      if (document.getElementById('edu-field')) document.getElementById('edu-field').innerText = state.profile.education;
      if (document.getElementById('proj-field')) document.getElementById('proj-field').innerText = state.profile.projects;
    }
    drawSkills();
  }).catch(err => {
    console.warn("Using local profile fallback", err);
    if (form) {
      document.getElementById('exp-field').innerText = state.profile.experience;
      document.getElementById('edu-field').innerText = state.profile.education;
      document.getElementById('proj-field').innerText = state.profile.projects;
    }
  });

  // Draw Staggered skills chips
  function drawSkills() {
    if (!chipContainer) return;
    chipContainer.innerHTML = '';
    
    state.profile.skills.forEach((skill, index) => {
      const chip = document.createElement('span');
      chip.className = 'chip staggered-chip';
      chip.style.animationDelay = `${index * 0.05}s`;
      chip.innerHTML = `
        ${skill}
        <button type="button" class="chip-btn-remove" data-skill="${skill}">&times;</button>
      `;
      chipContainer.appendChild(chip);
    });

    // Bind remove event triggers
    document.querySelectorAll('.chip-btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const skillToRemove = e.target.dataset.skill;
        state.profile.skills = state.profile.skills.filter(s => s !== skillToRemove);
        State.set(state);
        drawSkills();
        showToast(`Removed skill: ${skillToRemove}`, 'warning');
      });
    });
  }

  drawSkills();

  // Add new skill chip tag
  if (btnAddSkill && skillInput) {
    const addSkillHandler = () => {
      const val = skillInput.value.trim();
      if (val && !state.profile.skills.includes(val)) {
        state.profile.skills.push(val);
        State.set(state);
        skillInput.value = '';
        drawSkills();
        showToast(`Added skill: ${val}`, 'success');
      }
    };

    btnAddSkill.addEventListener('click', addSkillHandler);
    skillInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkillHandler();
      }
    });
  }

  // On submit profile validation/save
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      state.profile.experience = document.getElementById('exp-field').innerText;
      state.profile.education = document.getElementById('edu-field').innerText;
      state.profile.projects = document.getElementById('proj-field').innerText;
      
      try {
        await apiFetch('/profile', {
          method: 'PUT',
          body: JSON.stringify({
            skills: state.profile.skills,
            experience: state.profile.experience,
            education: state.profile.education,
            projects: state.profile.projects
          })
        });

        // Re-run analysis on backend with updated profile
        const company = state.targetCompany || (state.backendAnalysis ? state.backendAnalysis.target_company : 'Target Company');
        const role = state.targetRole || (state.backendAnalysis ? state.backendAnalysis.target_role : 'Target Role');

        const reAnalysis = await apiFetch('/analysis/run', {
          method: 'POST',
          body: JSON.stringify({
            target_company: company,
            target_role: role,
            candidate_skills: state.profile.skills || [],
            candidate_experience: String(state.profile.experience || ''),
            candidate_education: String(state.profile.education || ''),
            candidate_projects: String(state.profile.projects || '')
          })
        }).catch(() => null);

        if (reAnalysis) {
          state.overallScore = reAnalysis.readiness_score;
          state.roadmap = reAnalysis.roadmap || [];
          state.backendAnalysis = reAnalysis;
          State.set(state);
        } else {
          const analysis = performAnalysis(state);
          state.overallScore = analysis.overallScore;
          state.roadmap = analysis.roadmap;
          State.set(state);
        }

        showToast('Profile updated & re-analyzed!', 'success');
      } catch (err) {
        console.warn("Local profile update fallback", err);
        const analysis = performAnalysis(state);
        state.overallScore = analysis.overallScore;
        state.roadmap = analysis.roadmap;
        State.set(state);
        showToast('Profile metrics updated.', 'success');
      }

      setTimeout(() => {
        window.location.href = 'score.html';
      }, 1000);
    });
  }
}

// --- 6. SCORE.HTML (SCORE VISUALS) ---
async function initScorePage() {
  const state = State.get();

  // If no backendAnalysis in state, attempt to fetch latest from backend
  if (!state.backendAnalysis || !state.backendAnalysis.readiness_score) {
    try {
      const latest = await apiFetch('/analysis/latest');
      if (latest && latest.target_company && latest.target_role && latest.readiness_score) {
        state.backendAnalysis = latest;
        state.targetCompany = latest.target_company;
        state.targetRole = latest.target_role;
        state.overallScore = latest.readiness_score;
        state.roadmap = latest.roadmap || [];
        State.set(state);
      }
    } catch (e) {
      console.warn("Could not fetch latest analysis", e);
    }
  }

  // Prefer backend analysis data if available (dynamic), fall back to local analysis
  let analysis;
  let finalScore;
  if (state.backendAnalysis && state.backendAnalysis.readiness_score) {
    const ba = state.backendAnalysis;
    analysis = {
      company: ba.target_company,
      role: ba.target_role,
      overallScore: ba.readiness_score,
      categories: ba.category_scores || {},
      skillMatches: (ba.required_skills || []).map(s => ({
        name: s,
        status: (ba.strengths || []).some(st => st.toLowerCase() === s.toLowerCase()) ? 'strong' : 'missing'
      })),
      gaps: (ba.gaps || []).map(g => ({
        name: g.name || g,
        priority: g.priority || 'medium',
        explainer: g.explainer || g.reason || ''
      })),
      alternativeRoles: [],
      requirementSource: ba.requirement_source || '',
      requirementLabel: ba.requirement_label || ''
    };
    finalScore = ba.readiness_score;
  } else {
    analysis = performAnalysis(state);
    finalScore = analysis.overallScore;
  }

  // Populate dynamic suggested alternative roles based on role
  if (!analysis.alternativeRoles || analysis.alternativeRoles.length === 0) {
    const rLower = (analysis.role || '').toLowerCase();
    if (rLower.includes('developer') || rLower.includes('software') || rLower.includes('python')) {
      analysis.alternativeRoles = [
        { role: 'Backend Developer', match: Math.min(95, Math.max(60, finalScore - 4)) },
        { role: 'Full Stack Engineer', match: Math.min(92, Math.max(55, finalScore - 8)) },
        { role: 'DevOps / Cloud Associate', match: Math.min(88, Math.max(50, finalScore - 12)) }
      ];
    } else if (rLower.includes('analyst') || rLower.includes('data')) {
      analysis.alternativeRoles = [
        { role: 'Business Intelligence Analyst', match: Math.min(95, Math.max(60, finalScore - 4)) },
        { role: 'Data Operations Specialist', match: Math.min(90, Math.max(55, finalScore - 8)) },
        { role: 'Analytics Consultant', match: Math.min(86, Math.max(50, finalScore - 12)) }
      ];
    } else if (rLower.includes('manager') || rLower.includes('business') || rLower.includes('product')) {
      analysis.alternativeRoles = [
        { role: 'Project Coordinator', match: Math.min(95, Math.max(60, finalScore - 4)) },
        { role: 'Operations Lead', match: Math.min(90, Math.max(55, finalScore - 8)) },
        { role: 'Strategy Associate', match: Math.min(85, Math.max(50, finalScore - 12)) }
      ];
    } else if (rLower.includes('finance') || rLower.includes('account') || rLower.includes('credit')) {
      analysis.alternativeRoles = [
        { role: 'Financial Analyst', match: Math.min(95, Math.max(60, finalScore - 4)) },
        { role: 'Risk Assessment Specialist', match: Math.min(90, Math.max(55, finalScore - 8)) },
        { role: 'Corporate Accounts Lead', match: Math.min(85, Math.max(50, finalScore - 12)) }
      ];
    } else {
      analysis.alternativeRoles = [
        { role: `Associate ${analysis.role}`, match: Math.min(96, Math.max(65, finalScore + 4)) },
        { role: `Senior ${analysis.role}`, match: Math.min(90, Math.max(50, finalScore - 8)) },
        { role: `Operations Lead`, match: Math.min(85, Math.max(50, finalScore - 10)) }
      ];
    }
  }
  
  // Fill target text
  const targetTitle = document.getElementById('target-company-role-title');
  if (targetTitle) {
    targetTitle.textContent = `${analysis.company} — ${analysis.role}`;
  }

  // 1. Draw Ring SVG stroke offset animation
  const circle = document.querySelector('.progress-ring-circle');
  if (circle) {
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    
    const offset = circumference - (finalScore / 100) * circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
    }, 200);
  }

  // 2. Count up score digits
  const scoreDigits = document.getElementById('score-value');
  if (scoreDigits) {
    let startVal = 0;
    const duration = 1200; // ms
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentScore = Math.floor(progress * (finalScore - startVal) + startVal);
      scoreDigits.textContent = currentScore;
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        scoreDigits.textContent = finalScore;
      }
    }
    
    requestAnimationFrame(updateCounter);
  }

  // 3. Stagger matching breakdown bar slide animation
  const statBars = document.querySelectorAll('.stat-bar-fill');
  const catScores = analysis.categories;

  statBars.forEach(bar => {
    const matchType = bar.dataset.matchType;
    if (matchType && catScores[matchType] !== undefined) {
      const textVal = document.getElementById(`${matchType}-match-val`);
      setTimeout(() => {
        bar.style.width = `${catScores[matchType]}%`;
        if (textVal) textVal.textContent = `${catScores[matchType]}%`;
      }, 400);
    }
  });

  // 4. Fill Explainable Score Explanation
  const explanationEl = document.getElementById('score-explanation');
  if (explanationEl) {
    const matchedCount = (analysis.skillMatches || []).filter(m => m.status === 'strong').length;
    const totalCount = (analysis.skillMatches || []).length;
    const topGaps = (analysis.gaps || []).slice(0, 2).map(g => g.name).join(' and ') || 'specialized tools';
    
    explanationEl.innerHTML = `
      <strong>Analysis Summary:</strong> Your profile shows a <strong>${finalScore}%</strong> readiness level for a <strong>${analysis.role}</strong> position at <strong>${analysis.company}</strong>. 
      ${totalCount > 0 ? `You match <strong>${matchedCount} out of ${totalCount}</strong> key target requirements.` : ''} 
      Focusing on bridging <strong>${topGaps}</strong> will accelerate your readiness. 
      Explore the learning roadmap below to step through recommendations!
    `;
  }

  // 5. Populate Recommended Alternative Roles
  const rolesContainer = document.getElementById('recommended-roles-container');
  if (rolesContainer) {
    rolesContainer.innerHTML = '';
    analysis.alternativeRoles.forEach(r => {
      const card = document.createElement('div');
      card.className = 'card-glass page-anim hover-lift';
      card.style.padding = '1.25rem';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '0.5rem';
      
      card.innerHTML = `
        <h4 style="font-size: 1.05rem; color: var(--text-primary); font-family: var(--font-heading);">${r.role}</h4>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; font-weight:600; color:var(--text-secondary);">
          <span>Match Rating</span>
          <span style="color:var(--primary); font-weight:700;">${r.match}%</span>
        </div>
        <div class="stat-bar-container" style="height:6px; margin-top:0;">
          <div class="stat-bar-fill" style="width: ${r.match}%; height:100%; background:var(--primary); border-radius:9999px;"></div>
        </div>
      `;
      rolesContainer.appendChild(card);
    });
  }
}

// --- 7. GAPS.HTML (STRENGTHS & GAPS DASHBOARD) ---
async function initGapsPage() {
  const state = State.get();

  // If no backendAnalysis in state, attempt to fetch latest from backend
  if (!state.backendAnalysis || !state.backendAnalysis.readiness_score) {
    try {
      const latest = await apiFetch('/analysis/latest');
      if (latest && latest.target_company && latest.target_role && latest.readiness_score) {
        state.backendAnalysis = latest;
        state.targetCompany = latest.target_company;
        state.targetRole = latest.target_role;
        state.overallScore = latest.readiness_score;
        state.roadmap = latest.roadmap || [];
        State.set(state);
      }
    } catch (e) {}
  }

  // Prefer backend analysis data if available (dynamic)
  let analysis;
  if (state.backendAnalysis && state.backendAnalysis.readiness_score) {
    const ba = state.backendAnalysis;
    analysis = {
      company: ba.target_company,
      role: ba.target_role,
      overallScore: ba.readiness_score,
      categories: ba.category_scores || {},
      skillMatches: (ba.required_skills || []).map(s => ({
        name: s,
        status: (ba.strengths || []).some(st => st.toLowerCase() === s.toLowerCase()) ? 'strong' : 'missing'
      })),
      gaps: (ba.gaps || []).map(g => ({
        name: g.name || g,
        priority: g.priority || 'medium',
        explainer: g.explainer || g.reason || '',
        topics: g.topics || `Mastery of ${g.name || g} concepts & industry practices`
      })),
      alternativeRoles: []
    };
  } else {
    analysis = performAnalysis(state);
  }

  const titleEl = document.getElementById('gaps-header-title');
  if (titleEl) titleEl.textContent = `Your Skill Gaps for ${analysis.company} ${analysis.role}`;
  
  const subtitleEl = document.getElementById('gaps-header-subtitle');
  if (subtitleEl) subtitleEl.textContent = `Detailed breakdown of your strengths and gaps compared to target requirements.`;

  const strengthList = document.getElementById('strengths-container');
  const gapList = document.getElementById('gaps-container');

  // Load strengths
  if (strengthList) {
    strengthList.innerHTML = '';
    const matchedSkills = (analysis.skillMatches || []).filter(m => m.status === 'strong').map(m => m.name);
    const strengths = [
      matchedSkills.length > 0 ? `Solid baseline skills in ${matchedSkills.slice(0, 4).join(', ')}` : 'Foundational professional communication and problem solving',
      'Relevant profile background aligning with target sector',
      'Demonstrated academic and learning commitment'
    ];

    strengths.forEach((str, idx) => {
      const card = document.createElement('div');
      card.className = 'card-glass page-anim hover-lift';
      card.style.animationDelay = `${idx * 0.1}s`;
      card.style.borderLeft = '4px solid var(--success)';
      card.style.marginBottom = '1rem';
      card.innerHTML = `
        <h4 style="color: var(--success); margin-bottom: 0.5rem; font-family: var(--font-heading);">✓ Strength</h4>
        <p>${str}</p>
      `;
      strengthList.appendChild(card);
    });
  }

  // Load gaps
  if (gapList) {
    gapList.innerHTML = '';
    
    if (!analysis.gaps || analysis.gaps.length === 0) {
      gapList.innerHTML = `
        <div class="card-glass" style="border-left: 4px solid var(--success); padding: 1.5rem;">
          <h4 style="color: var(--success); margin-bottom: 0.5rem;">Congratulations!</h4>
          <p>No major skill gaps identified. You match the key target requirements for this position!</p>
        </div>
      `;
      return;
    }
    
    analysis.gaps.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'card-glass page-anim hover-lift';
      card.style.animationDelay = `${idx * 0.12}s`;
      card.style.marginBottom = '1rem';
      
      let badgeClass = 'low';
      if (item.priority === 'high') badgeClass = 'high';
      if (item.priority === 'medium') badgeClass = 'medium';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
          <span class="badge ${badgeClass}">${(item.priority || 'MEDIUM').toUpperCase()} PRIORITY</span>
          <span style="font-size:0.8rem; color:var(--text-muted);">Skill Gap</span>
        </div>
        <h3 style="font-size:1.2rem; margin-bottom:0.5rem; font-family: var(--font-heading);">${item.name}</h3>
        <p style="font-size:0.9rem; margin-bottom:0.75rem; color:var(--text-secondary); line-height:1.5;">${item.explainer || 'Important skill for this role.'}</p>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;"><strong>Focal areas:</strong> ${item.topics || `Practical application of ${item.name}`}</p>
        <a href="roadmap.html" class="resource-link">View Roadmap Detail →</a>
      `;
      gapList.appendChild(card);
    });
  }
}

// --- 8. ROADMAP.HTML (TIMELINE & INTERACTIVE CHECKBOXES) ---
async function initRoadmapPage() {
  const state = State.get();

  // If no backendAnalysis in state, attempt to fetch latest from backend
  if (!state.backendAnalysis || !state.backendAnalysis.readiness_score) {
    try {
      const latest = await apiFetch('/analysis/latest');
      if (latest && latest.target_company && latest.target_role && latest.readiness_score) {
        state.backendAnalysis = latest;
        state.targetCompany = latest.target_company;
        state.targetRole = latest.target_role;
        state.overallScore = latest.readiness_score;
        state.roadmap = latest.roadmap || [];
        State.set(state);
      }
    } catch (e) {}
  }

  // Prefer backend analysis data if available (dynamic)
  let analysis;
  if (state.backendAnalysis && state.backendAnalysis.readiness_score) {
    const ba = state.backendAnalysis;
    analysis = {
      company: ba.target_company,
      role: ba.target_role,
      overallScore: ba.readiness_score
    };

    if (ba.roadmap && ba.roadmap.length && (!state.roadmap || state.roadmap.length === 0)) {
      state.roadmap = ba.roadmap.map(item => ({
        id: item.id,
        name: item.name || item.skill_name,
        priority: item.priority || 'medium',
        status: item.status || 'not_started',
        completed: item.completed || item.status === 'completed',
        resources: (item.resources || []).map(r => ({
          text: r.title || r.text || `Learn ${item.name || item.skill_name}`,
          url: r.url || '#'
        })),
        topics: `Core focus: applied ${item.name || item.skill_name} concepts.`
      }));
    }
  } else {
    analysis = performAnalysis(state);
  }

  const titleEl = document.getElementById('roadmap-header-title');
  if (titleEl) titleEl.textContent = `${analysis.company} ${analysis.role} Roadmap`;
  
  const subtitleEl = document.getElementById('roadmap-header-subtitle');
  if (subtitleEl) subtitleEl.textContent = `Dynamic learning roadmap to bridge gaps for targeting ${analysis.company}.`;

  const timelineContainer = document.getElementById('roadmap-timeline');
  const overallProgressFill = document.getElementById('overall-progress-fill');
  const overallProgressText = document.getElementById('overall-progress-text');
  
  function drawRoadmap() {
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';
    
    // Draw timeline vertical progress bar placeholder
    const progressLine = document.createElement('div');
    progressLine.className = 'timeline-progress';
    timelineContainer.appendChild(progressLine);

    if (!state.roadmap || state.roadmap.length === 0) {
      timelineContainer.innerHTML = `
        <div class="card-glass" style="padding: 2rem; text-align: center;">
          <h3 style="color: var(--success); margin-bottom: 0.5rem;">Roadmap Complete!</h3>
          <p>You have addressed all gaps and are fully ready for this role.</p>
        </div>
      `;
      updateRoadmapProgress();
      return;
    }

    state.roadmap.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = `timeline-step ${step.completed ? 'completed' : ''} ${index === 0 ? 'active' : ''}`;
      
      const resourceLinksHTML = (step.resources || []).map(res => {
        const text = res.text || res.title || 'Official Guide';
        const url = res.url || '#';
        return `<a href="${url}" target="_blank" class="resource-link">🔗 ${text}</a>`;
      }).join(' ');

      stepEl.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="card-glass timeline-card hover-lift">
          <div class="timeline-header">
            <h3 style="font-size:1.15rem; font-family: var(--font-heading);">${index + 1}. ${step.name}</h3>
            <span class="badge ${step.priority === 'high' ? 'high' : step.priority === 'medium' ? 'medium' : 'low'}">${(step.priority || 'MEDIUM').toUpperCase()}</span>
          </div>
          
          <div class="timeline-content-wrapper">
            <p style="font-size: 0.9rem; margin-bottom: 1rem; margin-top:0.5rem; color: var(--text-secondary);">
              <strong>Core topics:</strong> ${step.topics || `Mastery of ${step.name}`}
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
                ${resourceLinksHTML}
              </div>
              <label class="checkbox-container">
                <input type="checkbox" class="roadmap-checkbox" data-id="${step.id}" data-name="${step.name}" ${step.completed ? 'checked' : ''}>
                <span class="checkbox-custom"></span>
                <span>Mark Complete</span>
              </label>
            </div>
          </div>
        </div>
      `;

      timelineContainer.appendChild(stepEl);

      // Card collapsible click toggle
      const cardHeader = stepEl.querySelector('.timeline-header');
      cardHeader.addEventListener('click', () => {
        const isAlreadyExpanded = stepEl.classList.contains('expanded');
        document.querySelectorAll('.timeline-step').forEach(s => s.classList.remove('expanded'));
        if (!isAlreadyExpanded) {
          stepEl.classList.add('expanded');
        }
      });
    });

    // Auto expand first incomplete step
    const firstIncompleteIdx = state.roadmap.findIndex(s => !s.completed);
    const stepCards = document.querySelectorAll('.timeline-step');
    if (firstIncompleteIdx !== -1 && stepCards[firstIncompleteIdx]) {
      stepCards[firstIncompleteIdx].classList.add('expanded');
    } else if (stepCards[0]) {
      stepCards[0].classList.add('expanded');
    }

    // Bind checkboxes click event
    document.querySelectorAll('.roadmap-checkbox').forEach(chk => {
      chk.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        const id = parseInt(e.target.dataset.id);
        const name = e.target.dataset.name;
        const isChecked = e.target.checked;
        const item = state.roadmap.find(s => s.id === id);
        
        if (item) {
          item.completed = isChecked;
          
          if (item.completed) {
            if (!state.profile.skills.includes(name)) {
              state.profile.skills.push(name);
            }
            triggerConfetti();
          } else {
            state.profile.skills = state.profile.skills.filter(s => s !== name);
          }

          // Sync completion status to backend
          try {
            await apiFetch(`/progress/roadmap/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                status: isChecked ? 'completed' : 'not_started'
              })
            });
          } catch (err) {
            console.warn("Backend sync fallback for roadmap update", err);
          }
          
          const updatedScore = State.calculateScore(state);
          const dateString = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          state.scoreHistory.push({
            date: item.completed ? `Completed: ${name} (${dateString})` : `Removed: ${name} (${dateString})`,
            score: updatedScore
          });
          
          State.set(state);
          updateRoadmapProgress();
          
          if (item.completed) {
            showToast(`Completed: ${item.name}! Skill mastered and score updated!`, 'success');
          } else {
            showToast(`Status updated: ${item.name} marked in progress.`, 'info');
          }
          
          setTimeout(() => {
            const stepParent = e.target.closest('.timeline-step');
            if (item.completed) {
              stepParent.classList.add('completed');
            } else {
              stepParent.classList.remove('completed');
            }
          }, 100);
        }
      });
    });

    updateRoadmapProgress();
  }

  function updateRoadmapProgress() {
    const total = state.roadmap.length;
    const completed = state.roadmap.filter(s => s.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    if (overallProgressFill) overallProgressFill.style.width = `${pct}%`;
    if (overallProgressText) overallProgressText.textContent = `${pct}% Complete (${completed}/${total} topics)`;
    
    const progressLine = document.querySelector('.timeline-progress');
    if (progressLine) {
      const linePercent = total > 1 ? (completed / (total - 1)) * 90 : 0;
      progressLine.style.height = `${Math.min(100, linePercent)}%`;
    }
  }

  drawRoadmap();

  // Setup Optional assessment quiz
  setupQuizSection(state, analysis);
}

const REST_QUIZ_QUESTIONS = [
  {
    q: 'What does REST stand for?',
    options: ['Representational State Transfer', 'Remote Endpoint Service Transport', 'Resource Entry State Transfer', 'Rapid Enterprise System Transfer'],
    answer: 0
  },
  {
    q: 'Which HTTP method is designed to create a new resource on the server?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    answer: 1
  },
  {
    q: 'Which HTTP status code represents "Unauthorized"?',
    options: ['200', '400', '401', '404'],
    answer: 2
  },
  {
    q: 'What is statelessness in REST APIs?',
    options: [
      'The client stores session info',
      'The server stores client session info',
      'Each request must contain all info needed to process it',
      'The database has no schemas'
    ],
    answer: 2
  },
  {
    q: 'Which HTTP method is designed to be idempotent and updates an existing resource fully?',
    options: ['POST', 'PUT', 'PATCH', 'GET'],
    answer: 1
  },
  {
    q: 'What HTTP status code is returned for a successful creation of a resource?',
    options: ['200 OK', '201 Created', '204 No Content', '302 Found'],
    answer: 1
  },
  {
    q: 'Which HTTP header is typically used to pass bearer tokens for authorization?',
    options: ['Content-Type', 'Accept', 'Authorization', 'User-Agent'],
    answer: 2
  },
  {
    q: 'What data exchange format is most commonly used in modern REST APIs?',
    options: ['XML', 'YAML', 'JSON', 'HTML'],
    answer: 2
  },
  {
    q: 'Which HTTP status code corresponds to "Internal Server Error"?',
    options: ['400', '403', '500', '503'],
    answer: 2
  },
  {
    q: 'Which HTTP method is typically used to remove a resource from the server?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    answer: 3
  }
];

function setupQuizSection(state, analysis) {
  const assessmentSection = document.getElementById('assessment-section');
  const startBtn = document.getElementById('start-assessment-btn');
  const quizContainer = document.getElementById('quiz-container');
  const quizQuestionsWrapper = document.getElementById('quiz-questions-wrapper');
  const submitBtn = document.getElementById('submit-quiz-btn');
  const quizResult = document.getElementById('quiz-result');
  const quizScoreVal = document.getElementById('quiz-score-val');
  const quizLevelVal = document.getElementById('quiz-level-val');
  const closeQuizBtn = document.getElementById('close-quiz-btn');

  if (!assessmentSection || !startBtn || !quizContainer) return;

  const primaryGap = analysis.gaps.length > 0 ? analysis.gaps[0].name : 'REST APIs';
  
  const descEl = document.getElementById('assessment-desc');
  if (descEl) descEl.textContent = `Validate your knowledge in ${primaryGap} to boost your readiness score.`;

  startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    quizContainer.style.display = 'flex';
    quizResult.style.display = 'none';

    quizQuestionsWrapper.innerHTML = '';
    REST_QUIZ_QUESTIONS.forEach((qObj, index) => {
      const card = document.createElement('div');
      card.className = 'quiz-question-card page-anim';
      card.style.animationDelay = `${index * 0.05}s`;
      
      const optionsHTML = qObj.options.map((opt, oIdx) => `
        <label class="quiz-option-label">
          <input type="radio" name="q_${index}" value="${oIdx}">
          <span>${opt}</span>
        </label>
      `).join('');

      card.innerHTML = `
        <div class="quiz-question-text">${index + 1}. ${qObj.q}</div>
        <div class="quiz-options">
          ${optionsHTML}
        </div>
      `;
      quizQuestionsWrapper.appendChild(card);
    });
  });

  submitBtn.addEventListener('click', () => {
    let correctCount = 0;
    let answeredAll = true;

    REST_QUIZ_QUESTIONS.forEach((qObj, index) => {
      const selected = document.querySelector(`input[name="q_${index}"]:checked`);
      if (selected) {
        const val = parseInt(selected.value);
        if (val === qObj.answer) {
          correctCount++;
        }
      } else {
        answeredAll = false;
      }
    });

    if (!answeredAll) {
      showToast('Please answer all 10 questions before submitting.', 'warning');
      return;
    }

    let level = 'Beginner';
    if (correctCount >= 9) level = 'Advanced';
    else if (correctCount >= 7) level = 'Intermediate';

    quizContainer.style.display = 'none';
    quizResult.style.display = 'flex';
    quizScoreVal.textContent = `${correctCount}/10`;
    quizLevelVal.textContent = level;

    const baseScore = State.calculateScore(state);
    const boostedScore = Math.min(100, baseScore + 6);
    
    if (!state.profile.skills.includes(primaryGap)) {
      state.profile.skills.push(primaryGap);
    }

    const dateString = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    state.scoreHistory.push({
      date: `Quiz: ${primaryGap} (${correctCount}/10) (${dateString})`,
      score: boostedScore
    });
    State.set(state);

    triggerConfetti();
    showToast(`Assessment completed! Readiness boosted to ${boostedScore}%!`, 'success');
  });

  closeQuizBtn.addEventListener('click', () => {
    quizResult.style.display = 'none';
    startBtn.style.display = 'block';
    window.location.reload();
  });
}

// --- 9. PROGRESS.HTML (CHART TRENDING DASHBOARD) ---
function initProgressPage() {
  const state = State.get();
  let analysis;
  let currentScore;
  if (state.backendAnalysis && state.backendAnalysis.readiness_score) {
    const ba = state.backendAnalysis;
    analysis = {
      company: ba.target_company,
      role: ba.target_role,
      overallScore: ba.readiness_score,
      skillMatches: (ba.required_skills || []).map(s => ({
        name: s,
        status: (ba.strengths || []).some(st => st.toLowerCase() === s.toLowerCase()) ? 'strong' : 'missing'
      }))
    };
    currentScore = ba.readiness_score;
  } else {
    analysis = performAnalysis(state);
    currentScore = analysis.overallScore;
  }
  
  // Fill texts
  const progressText = document.getElementById('timeline-role-text');
  if (progressText) progressText.textContent = `${analysis.company} — ${analysis.role}`;
  
  const currentValText = document.getElementById('current-score-stat');
  if (currentValText) currentValText.textContent = currentScore;

  // 1. Populate Company Readiness Summary Dashboard
  const summaryTitle = document.getElementById('target-company-role-summary');
  if (summaryTitle) summaryTitle.textContent = `${analysis.company} — ${analysis.role}`;

  const currentReadinessVal = document.getElementById('current-readiness-val');
  if (currentReadinessVal) currentReadinessVal.textContent = `${currentScore}%`;

  const previousReadinessVal = document.getElementById('previous-readiness-val');
  if (previousReadinessVal) {
    const prevEntry = state.scoreHistory[state.scoreHistory.length - 2] || state.scoreHistory[0];
    previousReadinessVal.textContent = prevEntry ? `${prevEntry.score}%` : `${currentScore}%`;
  }

  const completedList = document.getElementById('skills-completed-list');
  if (completedList) {
    const completed = analysis.skillMatches.filter(m => m.status === 'strong').map(m => m.name);
    completedList.innerHTML = `<strong>Skills Completed:</strong> ` + (completed.length > 0 
      ? completed.map(s => `<span style="color: var(--success); font-weight:600; margin-right: 0.5rem;">✅ ${s}</span>`).join(' ')
      : '<span style="color: var(--text-muted);">None yet</span>');
  }

  const learningList = document.getElementById('skills-learning-list');
  if (learningList) {
    const nextLearning = state.roadmap.filter(s => !s.completed).slice(0, 1).map(s => s.name);
    learningList.innerHTML = `<strong>Currently Learning:</strong> ` + (nextLearning.length > 0 
      ? nextLearning.map(s => `<span style="color: var(--warning); font-weight:600; margin-right: 0.5rem;">🟠 ${s}</span>`).join(' ')
      : '<span style="color: var(--text-muted);">None (Roadmap completed)</span>');
  }

  const gapsList = document.getElementById('skills-gaps-list');
  if (gapsList) {
    const gaps = analysis.gaps.map(g => g.name);
    const remaining = gaps.filter(g => !state.roadmap.some(r => r.name === g && r.completed));
    gapsList.innerHTML = `<strong>Remaining Gaps:</strong> ` + (remaining.length > 0 
      ? remaining.map(s => `<span style="color: var(--danger); font-weight:600; margin-right: 0.5rem;">❌ ${s}</span>`).join(' ')
      : '<span style="color: var(--success);">None (All caught up!)</span>');
  }

  // Fetch score history from backend API if available
  apiFetch('/progress/history').then(historyItems => {
    if (historyItems && historyItems.length) {
      renderChartAndTimeline(historyItems);
    } else {
      renderChartAndTimeline(state.scoreHistory);
    }
  }).catch(() => {
    renderChartAndTimeline(state.scoreHistory);
  });

  function renderChartAndTimeline(historyData) {
    const ctx = document.getElementById('progress-chart');
    if (ctx) {
      const labels = historyData.map(entry => entry.date || new Date(entry.recorded_at).toLocaleDateString());
      const scoreData = historyData.map(entry => entry.score);

      const isDark = document.body.classList.contains('dark-mode');
      const primaryColor = isDark ? '#6366f1' : '#4f46e5';
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      const textColor = isDark ? '#9ca3af' : '#475569';

      const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Readiness Score Trend',
            data: scoreData,
            borderColor: primaryColor,
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: primaryColor,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter' } } },
            y: { min: 0, max: 100, grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter' } } }
          }
        }
      });
    }

    const auditList = document.getElementById('audit-timeline-list');
    if (auditList) {
      auditList.innerHTML = '';
      const records = [...historyData].reverse();
      records.forEach((record, index) => {
        const entry = document.createElement('div');
        entry.className = 'card-glass page-anim';
        entry.style.animationDelay = `${index * 0.1}s`;
        entry.style.display = 'flex';
        entry.style.justifyContent = 'space-between';
        entry.style.alignItems = 'center';
        entry.style.padding = '1.25rem 2rem';
        entry.style.marginBottom = '1rem';
        
        entry.innerHTML = `
          <div>
            <h4 style="margin-bottom:0.25rem; font-size:1.05rem;">Resume Audit Recalculation</h4>
            <p style="font-size:0.8rem; color:var(--text-muted);">${record.date || new Date(record.recorded_at).toLocaleDateString()}</p>
          </div>
          <div style="font-family: var(--font-heading); font-size: 1.5rem; font-weight:700; color:var(--primary);">
            ${record.score}%
          </div>
        `;
        auditList.appendChild(entry);
      });
    }
  }
}
(function(){
  if (!localStorage.getItem('currentUser') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/frontend/')) {
    if (typeof showAuthModal === 'function') {
      showAuthModal();
    }
  }
})();

