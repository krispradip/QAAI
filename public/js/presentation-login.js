/**
 * Preview entry point: persona routing by email only.
 * No passwords, login credentials, SSO or identity verification are requested.
 * Intended for synthetic data on the personal presentation environment.
 */
export function renderPreviewLogin(){
  return '<section class="qa-login">'+
    '<div class="qa-login-art">'+
      '<div class="qa-login-symbol">QA<span>✦</span></div>'+
      '<div class="kicker">MAF / QUALITY INTELLIGENCE</div>'+
      '<h2>One quality platform.<br>Every service perspective.</h2>'+
      '<p>Quality intelligence for agents, QA leaders, customer care leadership and platform operations.</p>'+
      '<small>Personal presentation preview · Gemini evaluation</small>'+
    '</div>'+
    '<div class="qa-login-panel">'+
      '<span class="qa-preview-label">PRESENTATION PREVIEW · NO AUTHENTICATION</span>'+
      '<div class="kicker">PERSONA</div><h2>Welcome to QA.MAFer.AI</h2>'+
      '<p>Enter your assigned persona email to open the corresponding workspace.</p>'+
      '<form id="qa-demo-login">'+
        '<label>Email<input type="email" name="email" id="qa-login-email" '+
          'placeholder="name@maf.ae" autocomplete="off" spellcheck="false" required></label>'+
        '<button type="submit" class="primary qa-login-submit">Continue to workspace</button>'+
      '</form>'+
      '<p class="qa-login-disclosure">Presentation preview only: email selects a persona without identity verification. No password is requested or verified. Do not enter real credentials or confidential customer data.</p>'+
    '</div>'+
  '</section>';
}
