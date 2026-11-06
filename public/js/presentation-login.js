/**
 * Email-only preview entry. No passwords, identity verification, network
 * authentication, secret storage or SSO claims. Never use with private data.
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
      '<p>Enter a presentation persona email to open the corresponding workspace.</p>'+
      '<form id="qa-demo-login">'+
        '<label>Persona email<input type="email" name="email" id="qa-login-email" '+
          'placeholder="name@maf.ae" autocomplete="off" spellcheck="false" required></label>'+
        '<button type="submit" class="primary qa-login-submit">Continue to workspace</button>'+
      '</form>'+
      '<p class="qa-login-disclosure">This preview identifies personas by email only. No password is requested or verified; it is not company SSO. Do not use real credentials or confidential customer data.</p>'+
    '</div>'+
  '</section>';
}
