const fs = require('fs');
const vm = require('vm');

console.log("=== Patching AuthShell (Center) and LoginForm (No Autofill) ===");

// -------------------------------------------------------------
// 1. Client Chunk 1428: AuthShell (Module 39814)
// -------------------------------------------------------------
const clientChunk1428Path = '/app/.next/static/chunks/1428-8159fba13cb56411.js';
if (fs.existsSync(clientChunk1428Path)) {
  let content = fs.readFileSync(clientChunk1428Path, 'utf8');
  const modStart = content.indexOf('39814:');
  const modEnd = content.indexOf(',88142:', modStart);

  if (modStart !== -1 && modEnd !== -1) {
    const newModule = '39814:(e,t,a)=>{a.d(t,{z:()=>l});var r=a(95155),s=a(14357);function l(e){let{children:t}=e;return(0,r.jsx)("div",{className:"flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6",children:(0,r.jsxs)("div",{className:"w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-2xl sm:p-8",children:[(0,r.jsx)("div",{className:"flex justify-center",children:(0,r.jsx)(s.F,{className:"h-7"})}),t]})})}}';
    content = content.substring(0, modStart) + newModule + content.substring(modEnd);

    try {
      new vm.Script(content);
      fs.writeFileSync(clientChunk1428Path, content, 'utf8');
      console.log('[SUCCESS] Patched AuthShell in client chunk 1428');
    } catch (e) {
      console.error('[ERROR] Syntax error in client chunk 1428:', e.message);
    }
  } else {
    console.warn('Could not locate module 39814 in chunk 1428');
  }
}

// -------------------------------------------------------------
// 2. Client Chunk login/page-b9c8f9f3df18ae62.js: LoginForm (Module 75162)
// -------------------------------------------------------------
const loginClientChunkPath = '/app/.next/static/chunks/app/auth/login/page-b9c8f9f3df18ae62.js';
if (fs.existsSync(loginClientChunkPath)) {
  let content = fs.readFileSync(loginClientChunkPath, 'utf8');
  const modStart = content.indexOf('75162:');
  const phrase = 'Don\'t have an account?';
  const phraseIdx = content.indexOf(phrase, modStart);
  const modEnd = content.indexOf('},e=>{', phraseIdx);

  if (modStart !== -1 && modEnd !== -1) {
    const newModule = `75162:(e,s,t)=>{"use strict";t.d(s,{LoginForm:()=>f});var r=t(95155),a=t(52619),n=t.n(a),i=t(12115),d=t(18720),l=t(53444),o=t(13509),c=t(39814),u=t(3998),h=t(65142),p=t(76444);function f(e){let{signupEnabled:s}=e,[t,a]=(0,i.useState)(""),[f,m]=(0,i.useState)(""),[y,g]=(0,i.useState)(!1);(0,i.useEffect)(()=>{a(""),m("");let e=setTimeout(()=>{a(""),m("")},100);return()=>clearTimeout(e)},[]);let x=async e=>{e.preventDefault(),g(!0);try{let e=await (0,l.U5R)({body:{email:t,password:f}});if(e.error||!e.data){var s;let t=null==(s=e.error)?void 0:s.detail;d.oR.error(t||"Login failed");return}await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:e.data.token,user:e.data.user})}),window.location.href="/after-sign-in"}catch(e){d.oR.error("An error occurred. Please try again.")}finally{g(!1)}};return(0,r.jsxs)(c.z,{enterpriseSlot:(0,r.jsx)(o.AuthEnterpriseCTA,{}),children:[(0,r.jsxs)("div",{className:"space-y-1.5 text-center",children:[(0,r.jsx)("h1",{className:"text-2xl font-semibold tracking-tight",children:"Sign in"}),(0,r.jsx)("p",{className:"text-sm text-muted-foreground",children:"Enter your email and password to continue"})]}),(0,r.jsxs)("form",{onSubmit:x,className:"space-y-4",autoComplete:"off",children:[(0,r.jsx)("input",{type:"text",name:"fake_user",style:{display:"none"},tabIndex:-1,autoComplete:"off","aria-hidden":!0}),(0,r.jsx)("input",{type:"password",name:"fake_pass",style:{display:"none"},tabIndex:-1,autoComplete:"new-password","aria-hidden":!0}),(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsx)(p.J,{htmlFor:"email",children:"Email"}),(0,r.jsx)(h.p,{id:"email",name:"user_login_email",type:"email",placeholder:"you@example.com",value:t,onChange:e=>a(e.target.value),autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1,required:!0})]}),(0,r.jsxs)("div",{className:"space-y-2",children:[(0,r.jsx)(p.J,{htmlFor:"password",children:"Password"}),(0,r.jsx)(h.p,{id:"password",name:"user_login_password",type:"password",placeholder:"Enter your password",value:f,onChange:e=>m(e.target.value),autoComplete:"new-password",required:!0})]}),(0,r.jsx)(u.$,{type:"submit",className:"w-full",disabled:y,children:y?"Signing in...":"Sign in"})]}),s&&(0,r.jsxs)("p",{className:"text-center text-sm text-muted-foreground",children:["Don\'t have an account?"," ",(0,r.jsx)(n(),{href:"/auth/signup",className:"text-primary underline-offset-4 hover:underline",children:"Sign up"})]})]})}}`;
    content = content.substring(0, modStart) + newModule + content.substring(modEnd);

    try {
      new vm.Script(content);
      fs.writeFileSync(loginClientChunkPath, content, 'utf8');
      console.log('[SUCCESS] Patched LoginForm in client chunk login/page');
    } catch (e) {
      console.error('[ERROR] Syntax error in login client chunk:', e.message);
    }
  } else {
    console.warn('Could not locate module 75162 in login chunk');
  }
}

// -------------------------------------------------------------
// 3. Server Page login/page.js: AuthShell + LoginForm (Module 5914)
// -------------------------------------------------------------
const serverLoginPage = '/app/.next/server/app/auth/login/page.js';
if (fs.existsSync(serverLoginPage)) {
  let content = fs.readFileSync(serverLoginPage, 'utf8');

  // A. Patch AuthShell function in login/page.js
  const fnMatch = content.match(/function\s+([a-zA-Z0-9_$]+)\(\{children:a,enterpriseSlot:b\}\)\{return\(0,([a-zA-Z0-9_$]+)\.jsx\)\("div",\{className:"flex min-h-screen/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const jsxRuntime = fnMatch[2];
    const fnStart = fnMatch.index;
    const endToken = 'a]})})})})}';
    const endIdx = content.indexOf(endToken, fnStart);
    if (endIdx !== -1) {
      const fnEnd = endIdx + endToken.length;
      const oldFnTarget = content.substring(fnStart, fnEnd);

      const logoMatch = oldFnTarget.match(/children:\(0,[a-zA-Z0-9_$]+\.jsx\)\(([a-zA-Z0-9_$]+)\.F/);
      const logoVar = logoMatch ? logoMatch[1] : 'e';

      const replacementFn = `function ${fnName}({children:a,enterpriseSlot:b}){return(0,${jsxRuntime}.jsx)("div",{className:"flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6",children:(0,${jsxRuntime}.jsxs)("div",{className:"w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-2xl sm:p-8",children:[(0,${jsxRuntime}.jsx)("div",{className:"flex justify-center",children:(0,${jsxRuntime}.jsx)(${logoVar}.F,{className:"h-7"})}),a]})})}`;

      content = content.replace(oldFnTarget, replacementFn);
      console.log('[SUCCESS] Replaced AuthShell function in server login/page.js');
    }
  }

  // B. Patch LoginForm module 5914 in login/page.js
  const mod5914Start = content.indexOf('5914:');
  const mod5914End = content.indexOf(',8086:', mod5914Start);
  if (mod5914Start !== -1 && mod5914End !== -1) {
    const newMod5914 = `5914:(a,b,c)=>{"use strict";c.d(b,{LoginForm:()=>o});var d=c(69373),e=c(16041),f=c.n(e),g=c(93491),h=c(81012),i=c(87674),j=c(90259),k=c(49032),l=c(28910),m=c(80724),n=c(97782);function o({signupEnabled:a}){let[b,c]=(0,g.useState)(""),[e,o]=(0,g.useState)(""),[p,q]=(0,g.useState)(!1);(0,g.useEffect)(()=>{c(""),o("");let a=setTimeout(()=>{c(""),o("")},100);return()=>clearTimeout(a)},[]);let r=async a=>{a.preventDefault(),q(!0);try{let a=await (0,i.U5R)({body:{email:b,password:e}});if(a.error||!a.data){let b=a.error?.detail;h.oR.error(b||"Login failed");return}await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:a.data.token,user:a.data.user})}),window.location.href="/after-sign-in"}catch{h.oR.error("An error occurred. Please try again.")}finally{q(!1)}};return(0,d.jsxs)(k.z,{enterpriseSlot:(0,d.jsx)(j.AuthEnterpriseCTA,{}),children:[(0,d.jsxs)("div",{className:"space-y-1.5 text-center",children:[(0,d.jsx)("h1",{className:"text-2xl font-semibold tracking-tight",children:"Sign in"}),(0,d.jsx)("p",{className:"text-sm text-muted-foreground",children:"Enter your email and password to continue"})]}),(0,d.jsxs)("form",{onSubmit:r,className:"space-y-4",autoComplete:"off",children:[(0,d.jsx)("input",{type:"text",name:"fake_user",style:{display:"none"},tabIndex:-1,autoComplete:"off","aria-hidden":!0}),(0,d.jsx)("input",{type:"password",name:"fake_pass",style:{display:"none"},tabIndex:-1,autoComplete:"new-password","aria-hidden":!0}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(n.J,{htmlFor:"email",children:"Email"}),(0,d.jsx)(m.p,{id:"email",name:"user_login_email",type:"email",placeholder:"you@example.com",value:b,onChange:a=>c(a.target.value),autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1,required:!0})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(n.J,{htmlFor:"password",children:"Password"}),(0,d.jsx)(m.p,{id:"password",name:"user_login_password",type:"password",placeholder:"Enter your password",value:e,onChange:a=>o(a.target.value),autoComplete:"new-password",required:!0})]}),(0,d.jsx)(l.$,{type:"submit",className:"w-full",disabled:p,children:p?"Signing in...":"Sign in"})]}),a&&(0,d.jsxs)("p",{className:"text-center text-sm text-muted-foreground",children:["Don\'t have an account?"," ",(0,d.jsx)(f(),{href:"/auth/signup",className:"text-primary underline-offset-4 hover:underline",children:"Sign up"})]})]})}}`;
    content = content.substring(0, mod5914Start) + newMod5914 + content.substring(mod5914End);
    console.log('[SUCCESS] Replaced LoginForm module 5914 in server login/page.js');
  }

  try {
    new vm.Script(content);
    fs.writeFileSync(serverLoginPage, content, 'utf8');
    console.log('[SUCCESS] Validated and wrote server login/page.js');
  } catch (e) {
    console.error('[ERROR] Syntax error in server login/page.js:', e.message);
  }
}

// -------------------------------------------------------------
// 4. Server Pages signup and handler: AuthShell
// -------------------------------------------------------------
['/app/.next/server/app/auth/signup/page.js', '/app/.next/server/app/handler/[...stack]/page.js'].forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const fnMatch = content.match(/function\s+([a-zA-Z0-9_$]+)\(\{children:a,enterpriseSlot:b\}\)\{return\(0,([a-zA-Z0-9_$]+)\.jsx\)\("div",\{className:"flex min-h-screen/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const jsxRuntime = fnMatch[2];
    const fnStart = fnMatch.index;
    const endToken = 'a]})})})})}';
    const endIdx = content.indexOf(endToken, fnStart);
    if (endIdx !== -1) {
      const fnEnd = endIdx + endToken.length;
      const oldFnTarget = content.substring(fnStart, fnEnd);

      const logoMatch = oldFnTarget.match(/children:\(0,[a-zA-Z0-9_$]+\.jsx\)\(([a-zA-Z0-9_$]+)\.F/);
      const logoVar = logoMatch ? logoMatch[1] : 'e';

      const replacementFn = `function ${fnName}({children:a,enterpriseSlot:b}){return(0,${jsxRuntime}.jsx)("div",{className:"flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6",children:(0,${jsxRuntime}.jsxs)("div",{className:"w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-2xl sm:p-8",children:[(0,${jsxRuntime}.jsx)("div",{className:"flex justify-center",children:(0,${jsxRuntime}.jsx)(${logoVar}.F,{className:"h-7"})}),a]})})}`;

      content = content.replace(oldFnTarget, replacementFn);
      try {
        new vm.Script(content);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[SUCCESS] Patched AuthShell in ${filePath}`);
      } catch (e) {
        console.error(`[ERROR] Syntax error in ${filePath}:`, e.message);
      }
    }
  }
});

console.log("=== All Patches Complete ===");
