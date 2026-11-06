/**
 * Email-based workspace selection for the personal fallback environment.
 * No passwords, login credentials, SSO or identity verification are requested.
 * This is not an enterprise identity provider; no authentication is performed.
 */
export function renderPreviewLogin(){
  return '<section class="qa-login">'+
    '<div class="qa-login-art">'+
      '<div class="qa-login-symbol">QA<span>✦</span></div>'+
      '<div class="kicker">MAF / QUALITY INTELLIGENCE</div>'+
      '<h2>One quality platform.<br>Every service perspective.</h2>'+
      '<p>Quality intelligence for agents, QA leaders, customer care leadership and platform operations.</p>'+
      '<small>Quality intelligence · Gemini evaluation</small>'+
    '</div>'+
    '<div class="qa-login-panel">'+
      '<span class="qa-preview-label">EMAIL-BASED WORKSPACE ACCESS</span>'+
      '<div class="kicker">PERSONA</div><h2>Welcome to QA.MAFer.AI</h2>'+
      '<p>Enter your assigned email to open your quality workspace.</p>'+
      '<form id="qa-demo-login">'+
        '<label>Email<input type="email" name="email" id="qa-login-email" '+
          'placeholder="name@maf.ae" autocomplete="off" spellcheck="false" required></label>'+
        '<button type="submit" class="primary qa-login-submit">Continue to workspace</button>'+
      '</form>'+
      '<p class="qa-login-disclosure">Personal environment: email selects a workspace without verifying identity. Do not enter passwords, sensitive customer information or confidential credentials.</p>'+
    '</div>'+
  '</section>';
}
