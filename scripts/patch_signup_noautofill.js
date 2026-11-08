const fs = require('fs');
const vm = require('vm');

console.log("=== Patching SignupPage (No Autofill) ===");

// 1. Client Chunk signup/page-99d44108eba61f32.js
const signupClientChunk = '/app/.next/static/chunks/app/auth/signup/page-99d44108eba61f32.js';
if (fs.existsSync(signupClientChunk)) {
  let content = fs.readFileSync(signupClientChunk, 'utf8');
  const modStart = content.indexOf('93911:');
  const phrase = 'Already have an account?';
  const phraseIdx = content.indexOf(phrase, modStart);
  const modEnd = content.indexOf('},e=>{', phraseIdx);

  if (modStart !== -1 && modEnd !== -1) {
    const newModule = `93911:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>p});var s=t(95155),a=t(52619),n=t.n(a),i=t(12115),o=t(18720),d=t(53444),l=t(13509),c=t(39814),u=t(3998),h=t(65142),f=t(76444);function p(){let[e,r]=(0,i.useState)(""),[t,a]=(0,i.useState)(""),[p,m]=(0,i.useState)(""),[y,g]=(0,i.useState)(!1);(0,i.useEffect)(()=>{r(""),a(""),m("");let e=setTimeout(()=>{r(""),a(""),m("")},100);return()=>clearTimeout(e)},[]);let x=async r=>{if(r.preventDefault(),t.length<8)return void o.oR.error("Password must be at least 8 characters");if(t!==p)return void o.oR.error("Passwords do not match");g(!0);try{let r=await (0,d.yZB)({body:{email:e,password:t}});if(r.error||!r.data){var s;let e=null==(s=r.error)?void 0:s.detail;o.oR.error(e||"Signup failed");return}await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:r.data.token,user:r.data.user})}),window.location.href="/after-sign-in"}catch(e){o.oR.error("An error occurred. Please try again.")}finally{g(!1)}};return(0,s.jsxs)(c.z,{enterpriseSlot:(0,s.jsx)(l.AuthEnterpriseCTA,{}),children:[(0,s.jsxs)("div",{className:"space-y-1.5 text-center",children:[(0,s.jsx)("h1",{className:"text-2xl font-semibold tracking-tight",children:"Create an account"}),(0,s.jsx)("p",{className:"text-sm text-muted-foreground",children:"Enter your details to get started"})]}),(0,s.jsxs)("form",{onSubmit:x,className:"space-y-4",autoComplete:"off",children:[(0,s.jsx)("input",{type:"text",name:"fake_user",style:{display:"none"},tabIndex:-1,autoComplete:"off","aria-hidden":!0}),(0,s.jsx)("input",{type:"password",name:"fake_pass",style:{display:"none"},tabIndex:-1,autoComplete:"new-password","aria-hidden":!0}),(0,s.jsxs)("div",{className:"space-y-2",children:[(0,s.jsx)(f.J,{htmlFor:"email",children:"Email"}),(0,s.jsx)(h.p,{id:"email",name:"user_signup_email",type:"email",placeholder:"you@example.com",value:e,onChange:e=>r(e.target.value),autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1,required:!0})]}),(0,s.jsxs)("div",{className:"space-y-2",children:[(0,s.jsx)(f.J,{htmlFor:"password",children:"Password"}),(0,s.jsx)(h.p,{id:"password",name:"user_signup_password",type:"password",placeholder:"At least 8 characters",value:t,onChange:e=>a(e.target.value),autoComplete:"new-password",required:!0,minLength:8})]}),(0,s.jsxs)("div",{className:"space-y-2",children:[(0,s.jsx)(f.J,{htmlFor:"confirmPassword",children:"Confirm password"}),(0,s.jsx)(h.p,{id:"confirmPassword",name:"user_signup_confirm_password",type:"password",placeholder:"Confirm your password",value:p,onChange:e=>m(e.target.value),autoComplete:"new-password",required:!0,minLength:8})]}),(0,s.jsx)(u.$,{type:"submit",className:"w-full",disabled:y,children:y?"Creating account...":"Create account"})]}),(0,s.jsxs)("p",{className:"text-center text-sm text-muted-foreground",children:["Already have an account?"," ",(0,s.jsx)(n(),{href:"/auth/login",className:"text-primary underline-offset-4 hover:underline",children:"Sign in"})]})]})}}`;
    content = content.substring(0, modStart) + newModule + content.substring(modEnd);

    try {
      new vm.Script(content);
      fs.writeFileSync(signupClientChunk, content, 'utf8');
      console.log('[SUCCESS] Patched SignupPage in client chunk');
    } catch (e) {
      console.error('[ERROR] Syntax error in signup client chunk:', e.message);
    }
  } else {
    console.warn('Could not locate module 93911 in signup client chunk');
  }
}

// 2. Server Page signup/page.js (Module 25697)
const serverSignupPage = '/app/.next/server/app/auth/signup/page.js';
if (fs.existsSync(serverSignupPage)) {
  let content = fs.readFileSync(serverSignupPage, 'utf8');
  const modStart = content.indexOf('25697:');
  const phrase = 'Already have an account?';
  const phraseIdx = content.indexOf(phrase, modStart);
  const modEnd = content.indexOf(',26175:', phraseIdx);

  if (modStart !== -1 && modEnd !== -1) {
    const newModule = `25697:(a,b,c)=>{"use strict";c.r(b),c.d(b,{default:()=>o});var d=c(69373),e=c(16041),f=c.n(e),g=c(93491),h=c(81012),i=c(87674),j=c(90259),k=c(49032),l=c(28910),m=c(80724),n=c(97782);function o(){let[a,b]=(0,g.useState)(""),[c,e]=(0,g.useState)(""),[o,p]=(0,g.useState)(""),[q,r]=(0,g.useState)(!1);(0,g.useEffect)(()=>{b(""),e(""),p("");let a=setTimeout(()=>{b(""),e(""),p("")},100);return()=>clearTimeout(a)},[]);let s=async b=>{if(b.preventDefault(),c.length<8)return void h.oR.error("Password must be at least 8 characters");if(c!==o)return void h.oR.error("Passwords do not match");r(!0);try{let b=await (0,i.yZB)({body:{email:a,password:c}});if(b.error||!b.data){let a=b.error?.detail;h.oR.error(a||"Signup failed");return}await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:b.data.token,user:b.data.user})}),window.location.href="/after-sign-in"}catch{h.oR.error("An error occurred. Please try again.")}finally{r(!1)}};return(0,d.jsxs)(k.z,{enterpriseSlot:(0,d.jsx)(j.AuthEnterpriseCTA,{}),children:[(0,d.jsxs)("div",{className:"space-y-1.5 text-center",children:[(0,d.jsx)("h1",{className:"text-2xl font-semibold tracking-tight",children:"Create an account"}),(0,d.jsx)("p",{className:"text-sm text-muted-foreground",children:"Enter your details to get started"})]}),(0,d.jsxs)("form",{onSubmit:s,className:"space-y-4",autoComplete:"off",children:[(0,d.jsx)("input",{type:"text",name:"fake_user",style:{display:"none"},tabIndex:-1,autoComplete:"off","aria-hidden":!0}),(0,d.jsx)("input",{type:"password",name:"fake_pass",style:{display:"none"},tabIndex:-1,autoComplete:"new-password","aria-hidden":!0}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(n.J,{htmlFor:"email",children:"Email"}),(0,d.jsx)(m.p,{id:"email",name:"user_signup_email",type:"email",placeholder:"you@example.com",value:a,onChange:a=>b(a.target.value),autoComplete:"off",autoCorrect:"off",autoCapitalize:"off",spellCheck:!1,required:!0})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(n.J,{htmlFor:"password",children:"Password"}),(0,d.jsx)(m.p,{id:"password",name:"user_signup_password",type:"password",placeholder:"At least 8 characters",value:c,onChange:a=>e(a.target.value),autoComplete:"new-password",required:!0,minLength:8})]}),(0,d.jsxs)("div",{className:"space-y-2",children:[(0,d.jsx)(n.J,{htmlFor:"confirmPassword",children:"Confirm password"}),(0,d.jsx)(m.p,{id:"confirmPassword",name:"user_signup_confirm_password",type:"password",placeholder:"Confirm your password",value:o,onChange:a=>p(a.target.value),autoComplete:"new-password",required:!0,minLength:8})]}),(0,d.jsx)(l.$,{type:"submit",className:"w-full",disabled:q,children:q?"Creating account...":"Create account"})]}),(0,d.jsxs)("p",{className:"text-center text-sm text-muted-foreground",children:["Already have an account?"," ",(0,d.jsx)(f(),{href:"/auth/login",className:"text-primary underline-offset-4 hover:underline",children:"Sign in"})]})]})}}`;
    content = content.substring(0, modStart) + newModule + content.substring(modEnd);

    try {
      new vm.Script(content);
      fs.writeFileSync(serverSignupPage, content, 'utf8');
      console.log('[SUCCESS] Patched SignupPage in server signup/page.js');
    } catch (e) {
      console.error('[ERROR] Syntax error in server signup/page.js:', e.message);
    }
  } else {
    console.warn('Could not locate module 25697 in server signup/page.js');
  }
}

console.log("=== Signup Patch Complete ===");

