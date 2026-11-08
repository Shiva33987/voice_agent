// Test generator for Instruction Guide component in JS
function generateGuideCode(isServer) {
    // In client: n=JSX runtime, i=Link, l=PageLayout, o=Button, d=Card components, c=useAuth
    // In server: d=JSX runtime, f=Link, h=PageLayout, i=Button, j=Card components, k=useAuth
    const J = isServer ? 'd' : 'n';
    const L = isServer ? 'f()' : 'i()';
    const P = isServer ? 'h' : 'l';
    const B = isServer ? 'i' : 'o';
    const C = isServer ? 'j' : 'd';
    const A = isServer ? 'k' : 'c';

    return `function ${isServer ? 'l' : 'u'}(){
    return (0,${J}.jsx)(${P}.M,{
        title:"Voice AI Workflow Guide",
        description:"Complete step-by-step roadmap to build, configure, and launch autonomous voice AI agents.",
        children:(0,${J}.jsxs)("div",{
            className:"space-y-8 pb-12",
            children:[
                /* Top Stepper Banner */
                (0,${J}.jsxs)("div",{
                    className:"relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/40 p-6 backdrop-blur-xl shadow-2xl",
                    children:[
                        (0,${J}.jsxs)("div",{
                            className:"flex flex-col md:flex-row items-start md:items-center justify-between gap-3",
                            children:[
                                (0,${J}.jsxs)("div",{
                                    className:"flex items-center gap-2.5",
                                    children:[
                                        (0,${J}.jsx)("span",{className:"flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-base font-bold",children:"🗺️"}),
                                        (0,${J}.jsxs)("div",{
                                            children:[
                                                (0,${J}.jsxs)("div",{
                                                    className:"flex items-center gap-2",
                                                    children:[
                                                        (0,${J}.jsx)("h2",{className:"text-lg font-bold text-white tracking-tight",children:"Recommended Setup Sequence"}),
                                                        (0,${J}.jsx)("span",{className:"rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400",children:"6 Easy Steps"})
                                                    ]
                                                }),
                                                (0,${J}.jsx)("p",{className:"text-xs text-slate-400 mt-0.5",children:"Follow these steps from left to right. Every step unlocks the next capability in your voice agent."})
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        /* 6 Step Pills */
                        (0,${J}.jsx)("div",{
                            className:"mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3",
                            children:[
                                {num:"1",title:"Integrations",icon:"🔌",url:"/provider-connections"},
                                {num:"2",title:"AI Models",icon:"🧠",url:"/model-configurations"},
                                {num:"3",title:"Knowledge",icon:"📚",url:"/files"},
                                {num:"4",title:"Voice Agent",icon:"🤖",url:"/workflow"},
                                {num:"5",title:"Telephony",icon:"📞",url:"/telephony-configurations"},
                                {num:"6",title:"Call Logs",icon:"📊",url:"/recordings"}
                            ].map(s=>(0,${J}.jsxs)(${L},{
                                href:s.url,
                                className:"group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center transition-all hover:bg-indigo-600/20 hover:border-indigo-400/50 hover:scale-[1.02]",
                                children:[
                                    (0,${J}.jsxs)("div",{
                                        className:"flex items-center gap-1.5",
                                        children:[
                                            (0,${J}.jsx)("span",{className:"flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-indigo-300",children:s.num}),
                                            (0,${J}.jsx)("span",{className:"text-base",children:s.icon})
                                        ]
                                    }),
                                    (0,${J}.jsx)("span",{className:"text-xs font-semibold text-slate-200 group-hover:text-white",children:s.title}),
                                    (0,${J}.jsx)("span",{className:"text-[10px] text-indigo-300/80 group-hover:text-indigo-200",children:"Open ➔"})
                                ]
                            }))
                        })
                    ]
                }),

                /* 6 Step Cards Grid */
                (0,${J}.jsxs)("div",{
                    className:"grid grid-cols-1 md:grid-cols-2 gap-6",
                    children:[
                        /* Step 1 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"🔌"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-amber-400 font-mono",children:"STEP 01"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider",children:"DO THIS FIRST"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Connect AI Provider Accounts"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Add your API keys so your voice agent has access to AI intelligence and voice synthesis."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Sign up for OpenAI, Google Gemini, Sarvam AI, or ElevenLabs."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Paste your API key securely into Provider Connections."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Add multiple accounts if you want to mix LLMs and TTS voices."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"💡 Tip: Sarvam AI is ideal for Indian accents; ElevenLabs provides top-tier human realism."}),
                                        (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/provider-connections",children:"Go to Integrations ➔"})})
                                    ]
                                })
                            ]
                        }),

                        /* Step 2 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"🧠"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-indigo-400 font-mono",children:"STEP 02"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 uppercase tracking-wider",children:"BRAIN & VOICE"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Configure AI Models Pipeline"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Pair your connected providers into a named setup for conversation logic, hearing, and speaking."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Brain (LLM): GPT-4o-mini or Gemini 1.5 Flash for fast conversational answers."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Ears (STT): Deepgram Nova-2 or Sarvam Saaras for real-time speech hearing."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Voice (TTS): ElevenLabs or Sarvam Bulbul for natural human tone."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"⚡ Tip: Choose low latency models to keep voice response turnaround under 700ms."}),
                                        (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/model-configurations",children:"Configure AI Models ➔"})})
                                    ]
                                })
                            ]
                        }),

                        /* Step 3 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"📚"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-emerald-400 font-mono",children:"STEP 03"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider",children:"DATA & ACTIONS"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Upload Knowledge Base & Actions"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Teach your agent your specific company facts and enable real-world tasks like scheduling."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Upload FAQs, clinic policies, service pricing, or doctor schedules as PDFs."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Define Actions (webhooks) to check appointment slots or log customer leads."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Agent auto-retrieves accurate document paragraphs whenever asked."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"🎯 Tip: Clearly formatted PDFs with headings yield the highest semantic search accuracy."}),
                                        (0,${J}.jsxs)("div",{
                                            className:"flex flex-wrap items-center gap-2",
                                            children:[
                                                (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/files",children:"Upload Documents ➔"})}),
                                                (0,${J}.jsx)(${B}.$,{asChild:!0,variant:"outline",size:"sm",className:"border-white/15 hover:bg-white/10 text-slate-200",children:(0,${J}.jsx)(${L},{href:"/tools",children:"Define Actions ➔"})})
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),

                        /* Step 4 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"🤖"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-fuchsia-400 font-mono",children:"STEP 04"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-fuchsia-500/30 bg-fuchsia-500/15 px-2.5 py-0.5 text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider",children:"CORE AGENT"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Build & Prompt Your Voice Agent"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Define your agent's persona prompt, initial greeting, and test speak in your browser."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Prompt persona: 'You are Sarah, an empathetic hospital receptionist...'"})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Set greeting: 'Hello! Thank you for calling Metro Clinic. How may I help you?'"})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Attach the AI Model from Step 2, and test speak via browser WebRTC mic."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"🎙️ Tip: Use Web Call to verify voice tone, pronunciation, and speed before attaching a phone line."}),
                                        (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/workflow",children:"Build Voice Agent ➔"})})
                                    ]
                                })
                            ]
                        }),

                        /* Step 5 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"📞"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-sky-400 font-mono",children:"STEP 05"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold text-sky-300 uppercase tracking-wider",children:"TELEPHONY"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Attach Phone Numbers"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Connect your telephony provider so customers can call your AI agent directly over phone lines."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Add credentials from Twilio, Telnyx, Vonage, or your SIP trunk."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Link the phone number directly to your Agent from Step 4."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Your AI answers live inbound calls 24/7 in under 1 ring."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"📱 Tip: You can forward calls from your existing landline or mobile directly to this number."}),
                                        (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/telephony-configurations",children:"Manage Phone Numbers ➔"})})
                                    ]
                                })
                            ]
                        }),

                        /* Step 6 */
                        (0,${J}.jsxs)(${C}.Zp,{
                            className:"group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-xl shadow-lg hover:border-indigo-500/40 transition-all",
                            children:[
                                (0,${J}.jsxs)(${C}.aR,{
                                    className:"pb-3",
                                    children:[
                                        (0,${J}.jsxs)("div",{
                                            className:"flex items-center justify-between gap-2",
                                            children:[
                                                (0,${J}.jsxs)("span",{className:"flex items-center gap-2",children:[(0,${J}.jsx)("span",{className:"text-2xl",children:"📊"}),(0,${J}.jsx)("span",{className:"text-sm font-bold text-purple-400 font-mono",children:"STEP 06"})]}),
                                                (0,${J}.jsx)("span",{className:"rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider",children:"LIVE CALL LOGS"})
                                            ]
                                        }),
                                        (0,${J}.jsx)(${C}.ZB,{className:"text-lg font-bold text-white group-hover:text-indigo-200 transition-colors mt-2",children:"Review Call Logs & Campaigns"}),
                                        (0,${J}.jsx)(${C}.BT,{className:"text-xs text-slate-300 leading-relaxed",children:"Inspect live audio recordings, read full transcripts, and run automated outbound campaigns."})
                                    ]
                                }),
                                (0,${J}.jsxs)(${C}.Wu,{
                                    className:"space-y-4 pt-0",
                                    children:[
                                        (0,${J}.jsxs)("ul",{
                                            className:"space-y-2 text-xs text-slate-300",
                                            children:[
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Listen to crystal-clear recordings with the embedded audio player."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Read time-stamped dialog transcripts and check caller sentiment."})]}),
                                                (0,${J}.jsxs)("li",{className:"flex items-start gap-2",children:[(0,${J}.jsx)("span",{className:"text-emerald-400",children:"✔"}),(0,${J}.jsx)("span",{children:"Delete test runs individually or in bulk using the new Delete actions."})]})
                                            ]
                                        }),
                                        (0,${J}.jsx)("div",{className:"rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-[11px] text-amber-200/90",children:"📈 Tip: Use Outbound Campaigns to call patient lists for appointment confirmations."}),
                                        (0,${J}.jsxs)("div",{
                                            className:"flex flex-wrap items-center gap-2",
                                            children:[
                                                (0,${J}.jsx)(${B}.$,{asChild:!0,size:"sm",className:"bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20",children:(0,${J}.jsx)(${L},{href:"/recordings",children:"View Call Logs ➔"})}),
                                                (0,${J}.jsx)(${B}.$,{asChild:!0,variant:"outline",size:"sm",className:"border-white/15 hover:bg-white/10 text-slate-200",children:(0,${J}.jsx)(${L},{href:"/campaigns",children:"Outbound Campaigns ➔"})})
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                }),

                /* Pro Tips Bottom Footer */
                (0,${J}.jsxs)("div",{
                    className:"rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md shadow-lg",
                    children:[
                        (0,${J}.jsxs)("div",{
                            className:"flex items-center gap-2 mb-4",
                            children:[
                                (0,${J}.jsx)("span",{className:"text-lg",children:"⚡"}),
                                (0,${J}.jsx)("h3",{className:"text-base font-bold text-white",children:"3 Golden Rules for High-Conversion Voice AI"})
                            ]
                        }),
                        (0,${J}.jsxs)("div",{
                            className:"grid grid-cols-1 sm:grid-cols-3 gap-4",
                            children:[
                                (0,${J}.jsxs)("div",{
                                    className:"rounded-xl border border-white/5 bg-white/[0.02] p-4",
                                    children:[
                                        (0,${J}.jsx)("div",{className:"text-indigo-300 font-bold text-xs mb-1.5",children:"1. Keep Answers Short (1-2 Sentences)"}),
                                        (0,${J}.jsx)("p",{className:"text-xs text-slate-400 leading-relaxed",children:"In phone calls, long monologues sound robotic. Tell your agent to answer directly and ask a quick follow-up question."})
                                    ]
                                }),
                                (0,${J}.jsxs)("div",{
                                    className:"rounded-xl border border-white/5 bg-white/[0.02] p-4",
                                    children:[
                                        (0,${J}.jsx)("div",{className:"text-emerald-300 font-bold text-xs mb-1.5",children:"2. Sub-Second Response Speed"}),
                                        (0,${J}.jsx)("p",{className:"text-xs text-slate-400 leading-relaxed",children:"Pair fast STT (Deepgram/Sarvam) with streaming TTS (ElevenLabs/Cartesia) so callers never experience awkward pauses."})
                                    ]
                                }),
                                (0,${J}.jsxs)("div",{
                                    className:"rounded-xl border border-white/5 bg-white/[0.02] p-4",
                                    children:[
                                        (0,${J}.jsx)("div",{className:"text-purple-300 font-bold text-xs mb-1.5",children:"3. Grounded Knowledge Facts"}),
                                        (0,${J}.jsx)("p",{className:"text-xs text-slate-400 leading-relaxed",children:"Instruct your agent: 'If information is not in the uploaded files, politely say you don't know and offer a human callback.'"})
                                    ]
                                })
                            ]
                        })
                    ]
                })
            ]
        })
    });
}`;
}

module.exports = { generateGuideCode };

