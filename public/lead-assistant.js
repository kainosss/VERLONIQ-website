/*
 * VERLONIQ AI Lead Assistant — demonstration engine.
 *
 * SIMULATED. This file runs transparent, deterministic keyword rules in the
 * browser. It is NOT an AI model and sends nothing anywhere. It produces the
 * same result shape as the planned n8n workflow (see
 * automation/n8n/schema/lead-result.schema.json), so the website can later
 * swap `simulate()` for a call to a secure same-origin backend without
 * changing the UI.
 *
 * Works in the browser (window.VerloniqLeadAssistant) and in Node (module.exports)
 * so the rules can be unit-tested.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Fictional demo businesses and sample enquiries (all names and details invented)
  // ---------------------------------------------------------------------------
  var BUSINESSES = {
    electrical: {
      id: 'electrical', name: 'Voltara Electrical', trade: 'Electrician', signoff: 'The Voltara Electrical team',
      samples: {
        urgent: { label: 'Urgent fault', text: "Hi, it's Mia Thompson. Our power keeps tripping and there's a burning smell coming from the switchboard at our house in Chermside. We have a newborn at home so we need someone today please. Call me on 0412 555 018." },
        maintenance: { label: 'Routine maintenance', text: "Hello, I'm Daniel Kerr, property manager at Riverside Realty. We need the smoke alarms tested and certified at a 3 bedroom rental unit at 14 Banksia Street, Kedron before the new tenants move in next Friday. Email daniel.kerr@riverside.example works best." },
        quote: { label: 'Installation quote', text: "Hi there, we'd like a quote to install an EV charger in the garage and 8 LED downlights in the living area. It's a two-storey house in North Lakes. Sometime in the next month is fine. Thanks, Priya Nair, 0400 555 902, priya.nair@example.com" }
      }
    },
    plumbing: {
      id: 'plumbing', name: 'Pipewell Plumbing', trade: 'Plumber', signoff: 'The Pipewell Plumbing team',
      samples: {
        urgent: { label: 'Urgent fault', text: "URGENT - a pipe has burst under the kitchen sink and water is flooding the floor near the power points. I've turned the water off at the meter. It's Sam Reid, 18 Wattle Avenue, Wynnum. Mobile 0413 555 274." },
        maintenance: { label: 'Routine maintenance', text: "Hi, this is Grace Liu from Bayside Dental. Our annual backflow prevention test is due for the clinic in Capalaba. Could you book that in for a Tuesday or Wednesday morning in the next few weeks? grace@baysidedental.example" },
        quote: { label: 'Installation quote', text: "Hello, I'm looking for a quote to replace our old electric hot water system with a heat pump. Family of 5, house in Springfield Lakes. Also interested in any rebates. Cheers, Tom Fraser 0422 555 631" }
      }
    },
    aircon: {
      id: 'aircon', name: 'Coolbreak Air Conditioning', trade: 'Air-conditioning contractor', signoff: 'The Coolbreak Air Conditioning team',
      samples: {
        urgent: { label: 'Urgent fault', text: "Hi, our ducted air con stopped cooling this morning and it's 34 degrees. My elderly mum lives with us and is struggling with the heat. We're in Indooroopilly. Can someone come out today? It's Chris Walker, 0416 555 340." },
        maintenance: { label: 'Routine maintenance', text: "Hi Coolbreak, we have 4 split systems in our office at Milton that need their annual service and filter clean. After 3pm on weekdays suits best. Thanks, Hannah Boyd, Office Manager, Boyd & Co Accountants, hannah@boydco.example, 07 3555 0192" },
        quote: { label: 'Installation quote', text: "Hello, could I get a quote to install 2 split systems, one in the master bedroom and one in the lounge room? Single-storey brick house. Thanks, Olivia" }
      }
    },
    security: {
      id: 'security', name: 'Guardline Security', trade: 'Electronic security installer', signoff: 'The Guardline Security team',
      samples: {
        urgent: { label: 'Urgent fault', text: "Our shop was broken into overnight and the back door was forced. The alarm didn't go off and we need it checked and repaired today. Ben Ortiz, Ortiz Hardware, 22 Station Road, Sunnybank. Phone 0418 555 776." },
        maintenance: { label: 'Routine maintenance', text: "Hi, I'm Lucy Chen. Our home alarm keeps beeping with a low battery warning and we'd like a general service of the system. We're in Ashgrove. Any day next week is fine. lucy.chen@example.com" },
        quote: { label: 'Installation quote', text: "Hi, we're after a quote for a CCTV system with 6 cameras and remote phone viewing for our warehouse in Rocklea, plus access control on 2 doors. Marcus Hale, Hale Logistics, 0421 555 118, marcus@halelogistics.example" }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Safety hazards: always flagged for urgent human review (shared rule set with the n8n workflow)
  // ---------------------------------------------------------------------------
  var HAZARDS = [
    { code: 'gas_leak', label: 'Possible gas leak', re: /\b(smell(?:s|ing)? (?:of )?gas|gas (?:leak|smell)|leaking gas|smell gas)\b/i,
      action: 'Call the customer now. Confirm they have left the area and contacted 000 or their gas distributor’s emergency line.' },
    { code: 'electrical_fire', label: 'Possible electrical fire risk', re: /\b(burning smell|smell(?:s|ing)? (?:of )?burning|smoke(?!\s*(?:alarms?|detectors?))|smoking|sparks?|sparking|arcing|melted|scorch(?:ed|ing)?|on fire|caught fire)\b/i,
      action: 'Call the customer now. Advise them to stay clear and call 000 if there is smoke or fire.' },
    { code: 'shock_risk', label: 'Electric shock risk', re: /\b(electric shock|got a shock|shocked|tingl(?:e|ing)|exposed wir(?:e|es|ing)|live wir(?:e|es))\b/i,
      action: 'Call the customer now. Advise them not to touch the affected area.' },
    { code: 'water_near_electrics', label: 'Water near electrical equipment', re: /\b(water|flood(?:ing|ed)?|leak(?:ing)?)\b[^.]{0,60}\b(power ?points?|switchboard|electric(?:al|s)?|outlets?|wiring)\b|\b(power ?points?|switchboard|outlets?)\b[^.]{0,60}\b(water|wet|flood(?:ing|ed)?)\b/i,
      action: 'Call the customer now. Advise them to keep clear and not touch switches or appliances near the water.' },
    { code: 'active_flooding', label: 'Active water leak or flooding', re: /\b(burst (?:pipe|hose)|pipe (?:has )?burst|flood(?:ing|ed)?|water everywhere)\b/i,
      action: 'Prioritise. Confirm the water is turned off at the meter.' },
    { code: 'carbon_monoxide', label: 'Possible carbon monoxide', re: /\b(carbon monoxide|co alarm|co detector)\b/i,
      action: 'Call the customer now. Advise them to get to fresh air and call 000 if anyone feels unwell.' },
    { code: 'security_breach', label: 'Break-in or security breach', re: /\b(broken into|break-?in|burglar(?:y|ised|ized)?|intruder|forced (?:entry|open)|was forced|robbed)\b/i,
      action: 'Prioritise. Check the customer is safe and has reported the incident to police (000 if it is happening now, 131 444 otherwise).' },
    { code: 'asbestos', label: 'Possible asbestos', re: /\basbestos\b/i,
      action: 'Do not quote work that disturbs the material until it has been assessed.' }
  ];
  var VULNERABLE_RE = /\b(newborn|baby|infant|elderly|aged|pensioner|disabilit(?:y|ies)|disabled|medical (?:equipment|condition)|oxygen|dialysis|pregnant|vulnerable)\b/i;
  var URGENT_RE = /\b(urgent(?:ly)?|asap|as soon as possible|emergency|today|right now|immediately|tonight|stopped (?:working|cooling)|not working|no (?:power|hot water|water|cooling)|won'?t (?:start|turn on|work)|keeps? tripping|tripping|broken|burst|leaking|flooding)\b/i;

  // ---------------------------------------------------------------------------
  // Job categories per trade: first matching rule wins
  // ---------------------------------------------------------------------------
  var CATEGORIES = {
    electrical: [
      { cat: 'Electrical safety hazard', phrase: 'electrical safety issue', type: 'fault', re: /burning smell|sparks?|sparking|smoke(?!\s*(?:alarms?|detectors?))|exposed wir|electric shock|tingl/i },
      { cat: 'Power fault / tripping', phrase: 'power fault', type: 'fault', re: /no power|power (?:is )?(?:out|off)|tripping|trips|safety switch|rcd|circuit breaker|breaker/i },
      { cat: 'Smoke alarm compliance', phrase: 'smoke alarm testing', type: 'maintenance', re: /smoke alarm|smoke detector/i },
      { cat: 'EV charger installation', type: 'installation', re: /ev charger|electric vehicle|car charger/i },
      { cat: 'Switchboard upgrade', type: 'installation', re: /switchboard (?:upgrade|replacement)|upgrade (?:the |our )?switchboard/i },
      { cat: 'Lighting installation', type: 'installation', re: /downlights?|lighting|lights? install|led/i },
      { cat: 'Power point installation', type: 'installation', re: /power ?points?|gpo|outlets?/i },
      { cat: 'Testing & inspection', type: 'maintenance', re: /test(?:ing)? (?:and|&) tag|inspection|safety check/i }
    ],
    plumbing: [
      { cat: 'Burst pipe / active leak', phrase: 'burst pipe', type: 'fault', re: /burst|flood|water everywhere/i },
      { cat: 'Gas leak / gas fitting', phrase: 'gas issue', type: 'fault', re: /gas leak|smell(?:s|ing)? (?:of )?gas|gas fitting/i },
      { cat: 'Blocked drain', type: 'fault', re: /blocked|blockage|drain|overflowing/i },
      { cat: 'Hot water system replacement', type: 'installation', re: /(?:replace|new|install|quote)[^.]{0,60}hot water|hot water[^.]{0,40}(?:heat pump|replace|replacement|upgrade)|heat pump/i },
      { cat: 'Hot water repair', type: 'fault', re: /no hot water|hot water/i },
      { cat: 'Backflow testing', type: 'maintenance', re: /backflow/i },
      { cat: 'Leaking tap / toilet', phrase: 'leaking tap or toilet', type: 'fault', re: /leak|dripping|tap|toilet|cistern/i },
      { cat: 'Bathroom renovation plumbing', type: 'installation', re: /renovation|reno|new bathroom/i }
    ],
    aircon: [
      { cat: 'Air conditioner not cooling', type: 'fault', re: /not cooling|stopped cooling|won'?t cool|blowing (?:hot|warm)|not working|stopped working/i },
      { cat: 'Air conditioner leaking or noisy', type: 'fault', re: /leak|dripping|noise|noisy|rattl/i },
      { cat: 'Service & filter clean', phrase: 'air-conditioning service', type: 'maintenance', re: /service|filter|clean/i },
      { cat: 'Ducted system installation', type: 'installation', re: /ducted/i },
      { cat: 'Split system installation', type: 'installation', re: /split system|split-system|install/i }
    ],
    security: [
      { cat: 'Break-in / urgent security repair', phrase: 'security repair after the break-in', type: 'fault', re: /broken into|break-?in|burglar|forced|intruder/i },
      { cat: 'Alarm fault', type: 'fault', re: /alarm[^.]{0,60}(?:beep|fault|false|won'?t|not|didn'?t)|beeping|false alarm/i },
      { cat: 'CCTV installation', type: 'installation', re: /cctv|cameras?/i },
      { cat: 'Access control', type: 'installation', re: /access control|swipe|keypad|intercom/i },
      { cat: 'Alarm service', type: 'maintenance', re: /service|battery|maintenance|check/i }
    ]
  };

  var SUBURBS = ['Spring Hill','Milton','Chermside','Kedron','North Lakes','Wynnum','Capalaba','Springfield Lakes','Indooroopilly','Sunnybank','Ashgrove','Rocklea','Toowong','Paddington','New Farm','Bulimba','Carindale','Mount Gravatt','Mt Gravatt','Redcliffe','Ipswich','Logan','Strathpine','Aspley','Nundah','Woolloongabba','West End','Fortitude Valley','Brisbane City','Albion','Ascot','Hamilton','Coorparoo','Camp Hill','Holland Park','Annerley','Moorooka','Stafford','Everton Park','Kenmore','Chapel Hill','The Gap','Bardon','Red Hill','Kelvin Grove','Windsor','Wilston','Clayfield','Morningside','Cannon Hill','Manly','Cleveland','Victoria Point','Browns Plains','Forest Lake','Jindalee','Mitchelton','Bald Hills','Caboolture','Petrie','Kallangur','Redbank Plains','Sherwood','Graceville','Yeronga','Tarragindi','Salisbury','Acacia Ridge','Eight Mile Plains','Runcorn','Calamvale','Underwood','Springwood','Beenleigh'];
  var STREET_RE = /\b(\d{1,5}[A-Za-z]?(?:\/\d{1,5})?\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Road|Rd|Avenue|Ave|Court|Ct|Drive|Dr|Place|Pl|Crescent|Cres|Lane|Ln|Terrace|Tce|Parade|Pde|Way|Close|Cl|Highway|Hwy|Boulevard|Blvd))\b/;
  var COMMERCIAL_PLACE_RE = /\b(office|shop|store|warehouse|factory|restaurant|cafe|café|clinic|surgery|school|commercial|retail|premises|workshop)\b/i;
  var COMMERCIAL_ORG_RE = /\b(business|accountants|hardware|dental|logistics|realty|pty ltd)\b/i;
  var RESIDENTIAL_RE = /\b(house|home|unit|apartment|townhouse|duplex|granny flat|bedroom|lounge|living area|garage|kitchen|family|mum|rental|tenants?)\b/i;
  var RENTAL_RE = /\b(rental|tenants?|landlord|property manager|real estate agent)\b/i;
  var TIMING_RE = /\b(today|tonight|tomorrow|this (?:morning|afternoon|week|weekend)|next (?:week|month|few weeks|friday|monday|tuesday|wednesday|thursday|saturday|sunday)|in the next (?:month|few weeks|week)|sometime in the next (?:month|few weeks)|(?:after|before) \d{1,2}(?::\d{2})? ?(?:am|pm)|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?(?: or (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))?(?: (?:morning|afternoon))?|weekdays?|weekends?|any day next week|asap|as soon as possible)\b/i;
  var QTY_RE = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:x\s+)?(?:new\s+)?(split systems?|cameras?|downlights?|lights?|power ?points?|doors?|bedrooms?|bathrooms?|units?|smoke alarms?|zones?|toilets?|taps?)\b/gi;
  var WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

  var URGENCY = {
    emergency: { level: 'emergency', label: 'Emergency — safety risk', rank: 4 },
    urgent:    { level: 'urgent',    label: 'Urgent — same day',       rank: 3 },
    soon:      { level: 'soon',      label: 'Soon — within a few days', rank: 2 },
    routine:   { level: 'routine',   label: 'Routine — schedule in',   rank: 1 },
    quote:     { level: 'quote',     label: 'Quote — no fixed deadline', rank: 0 }
  };

  function clean(s) { return String(s == null ? '' : s).replace(/[\s,;.!]+$/, '').trim(); }
  function titleCase(s) { return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  function extractContact(text) {
    var email = clean((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [])[0]);
    var phoneMatch = text.match(/(?:\+61\s?[2-478]|\(0[2378]\)\s?|0[2-478])(?:[\s-]?\d){8}/);
    var phone = phoneMatch ? clean(phoneMatch[0]) : '';
    var name = '';
    var pats = [
      /\b(?:[Ii] am|[Ii]['’]m|[Ii]t is|[Ii]t['’]s|[Tt]his is|[Mm]y name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /\b(?:[Tt]hanks|[Cc]heers|[Rr]egards|[Kk]ind regards|[Tt]hank you)[,!.]?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
      /(?:^|[.!?]\s+)([A-Z][a-z]+\s+[A-Z][a-z]+),\s+(?:[A-Z][\w&'’-]*\s*){1,4},/
    ];
    for (var i = 0; i < pats.length; i++) { var m = text.match(pats[i]); if (m) { name = m[1]; break; } }
    // Ignore greetings/company words mistaken for names
    if (/^(Hi|Hello|There|Team|Mum|The)\b/.test(name)) name = '';
    if (name && /^(Ortiz|Hale|Boyd)\b/.test(name) === false) { name = name.replace(/\s+(Office|Manager|Hardware|Logistics)$/, ''); }
    var org = '';
    var om = text.match(/\b(?:from|at|manager at|Manager,)\s+((?:[A-Z][\w&'’-]*)(?:\s+(?:[A-Z][\w&'’-]*|&)){0,3})/);
    if (om) org = clean(om[1]);
    if (org && SUBURBS.indexOf(org) !== -1) org = '';
    if (!org) { var om2 = text.match(/,\s+((?:[A-Z&][\w&'’-]*\s){0,3}(?:Hardware|Logistics|Accountants|Realty|Dental|Pty Ltd|Electrical|Plumbing))\b/); if (om2) org = clean(om2[1]); }
    if (org && SUBURBS.indexOf(org) !== -1) org = '';
    if (org && name && org.indexOf(name) === 0) org = '';
    return { name: name, email: email, phone: phone, organisation: org };
  }

  function extractLocation(text) {
    var address = clean((text.match(STREET_RE) || [])[1]);
    var suburb = '';
    var lower = text.toLowerCase();
    for (var i = 0; i < SUBURBS.length; i++) {
      var s = SUBURBS[i];
      var re = new RegExp('\\b' + s.toLowerCase().replace(/ /g, '\\s+') + '\\b');
      if (re.test(lower)) { suburb = s === 'Mt Gravatt' ? 'Mount Gravatt' : s; break; }
    }
    var postcode = (text.match(/\b4\d{3}\b/) || [])[0] || '';
    return { suburb: suburb, address: address, postcode: postcode, state: suburb || address || postcode ? 'QLD' : '' };
  }

  function detectHazards(text) {
    var found = [];
    for (var i = 0; i < HAZARDS.length; i++) {
      if (HAZARDS[i].re.test(text)) found.push({ code: HAZARDS[i].code, label: HAZARDS[i].label, action: HAZARDS[i].action });
    }
    return found;
  }

  function quantities(text) {
    var out = [], m;
    QTY_RE.lastIndex = 0;
    while ((m = QTY_RE.exec(text))) {
      var n = WORDNUM[m[1].toLowerCase()] || parseInt(m[1], 10);
      out.push(n + ' × ' + m[2].toLowerCase().replace(/s$/, '') + (n === 1 ? '' : 's'));
    }
    return out;
  }

  function classify(text, businessId) {
    var rules = CATEGORIES[businessId] || [];
    for (var i = 0; i < rules.length; i++) if (rules[i].re.test(text)) return { category: rules[i].cat, type: rules[i].type, phrase: rules[i].phrase || rules[i].cat.toLowerCase() };
    if (/\bquote|install|new\b/i.test(text)) return { category: 'General installation enquiry', type: 'installation', phrase: 'installation enquiry' };
    if (/\bservice|maintenance|check|test\b/i.test(text)) return { category: 'General maintenance', type: 'maintenance', phrase: 'maintenance enquiry' };
    return { category: 'General enquiry', type: 'general', phrase: 'enquiry' };
  }

  function urgencyFor(text, job, hazards, vulnerable) {
    var reasons = [];
    var u;
    if (hazards.length) { u = URGENCY.emergency; reasons.push('Safety hazard mentioned: ' + hazards.map(function (h) { return h.label.toLowerCase(); }).join(', ')); }
    else if (URGENT_RE.test(text) && job.type !== 'installation') { u = URGENCY.urgent; reasons.push('Customer describes a current fault or asks for help today'); }
    else if (job.type === 'fault') { u = URGENCY.soon; reasons.push('Fault reported without same-day urgency'); }
    else if (job.type === 'installation') { u = URGENCY.quote; reasons.push('Quotation request'); }
    else { u = URGENCY.routine; reasons.push('Routine or scheduled work'); }
    if (vulnerable && u.rank < URGENCY.urgent.rank) { u = URGENCY.urgent; }
    if (vulnerable) reasons.push('Vulnerable occupant mentioned');
    return { level: u.level, label: u.label, reasons: reasons };
  }

  function requirementsFor(text, job, loc, timing, propertyType, vulnerable, rental) {
    var req = [job.category];
    quantities(text).forEach(function (q) { req.push(q); });
    if (/\bremote (?:phone )?viewing|app\b/i.test(text)) req.push('Remote viewing on a phone');
    if (/\brebates?\b/i.test(text)) req.push('Wants information on rebates');
    if (/\bcertif(?:y|ied|icate)/i.test(text)) req.push('Compliance certificate required');
    if (/\bturned (?:the )?water off|water off at the meter\b/i.test(text)) req.push('Water already turned off at the meter');
    if (/\btwo-storey|double-storey|2 storey\b/i.test(text)) req.push('Two-storey property');
    if (/\bsingle-storey|single storey\b/i.test(text)) req.push('Single-storey property');
    if (propertyType !== 'Unknown') req.push(propertyType + ' property');
    if (rental) req.push('Rental property — tenant or agent involved');
    if (vulnerable) req.push('Vulnerable occupant: ' + (text.match(VULNERABLE_RE) || [''])[0].toLowerCase());
    if (timing) req.push('Preferred timing: ' + timing);
    return req;
  }

  function missingFor(contact, loc, job, timing, propertyType, quantityCount, urgencyLevel, businessId) {
    var miss = [];
    if (!contact.name) miss.push('Customer name');
    if (!contact.phone && !contact.email) miss.push('Phone number or email address');
    else if (!contact.phone && (urgencyLevel === 'emergency' || urgencyLevel === 'urgent')) miss.push('Phone number (urgent job — a call is faster)');
    if (!loc.suburb && !loc.address) miss.push('Job address or suburb');
    else if (!loc.address && job.type !== 'installation') miss.push('Street address for the visit');
    if (propertyType === 'Unknown') miss.push('Residential or commercial property');
    if (job.type === 'installation' && !quantityCount && !/ev charger|heat pump|hot water/i.test(job.category)) miss.push('Size or quantity of work (e.g. rooms, cameras, fittings)');
    if (job.type === 'installation') {
      if (businessId === 'aircon') miss.push('Approximate room sizes');
      if (businessId === 'electrical') miss.push('Photos of the switchboard and install area (optional)');
      if (businessId === 'plumbing') miss.push('Photos of the existing system (optional)');
      if (businessId === 'security') miss.push('Site plan or photos of entry points (optional)');
    }
    if (!timing && job.type !== 'fault') miss.push('Preferred timing');
    return miss;
  }

  function firstName(n) { return n ? n.split(/\s+/)[0] : ''; }

  function draftReply(biz, contact, loc, job, urgency, hazards, missing) {
    var hi = 'Hi' + (contact.name ? ' ' + firstName(contact.name) : '') + ',';
    var where = loc.suburb ? ' in ' + loc.suburb : '';
    var lines = [hi, ''];
    lines.push('Thanks for contacting ' + biz.name + ' about the ' + job.phrase + where + '.');
    if (hazards.length) {
      var safety = [];
      hazards.forEach(function (h) {
        if (h.code === 'gas_leak') safety.push('If you can smell gas, please don’t use switches or naked flames, leave the area and call 000 or your gas distributor’s emergency line.');
        if (h.code === 'electrical_fire' || h.code === 'shock_risk') safety.push('Please keep clear of the affected area, and if you see smoke, sparks or fire, leave the area and call 000 straight away.');
        if (h.code === 'water_near_electrics') safety.push('Please keep clear of any power points or appliances near the water and don’t touch the switchboard if it’s wet.');
        if (h.code === 'carbon_monoxide') safety.push('Please get everyone into fresh air, and call 000 if anyone feels unwell.');
        if (h.code === 'security_breach') safety.push('We hope everyone is safe. If you haven’t already, please report the break-in to police on 131 444.');
      });
      safety = safety.filter(function (s, i) { return safety.indexOf(s) === i; });
      if (safety.length) { lines.push(''); lines.push(safety.join(' ')); }
      lines.push('');
      lines.push('We’re treating this as a priority and will call you' + (contact.phone ? ' on ' + contact.phone : '') + ' as soon as possible.');
    } else if (urgency.level === 'urgent') {
      lines.push('');
      lines.push('We’ve marked this as urgent and will be in touch' + (contact.phone ? ' on ' + contact.phone : '') + ' as soon as possible to arrange a time.');
    } else if (job.type === 'installation') {
      lines.push('');
      lines.push('We’d be glad to prepare a quote for you.');
    } else {
      lines.push('');
      lines.push('We’d be happy to book this in for you.');
    }
    var ask = missing.filter(function (m) { return !/^Customer name$/.test(m); });
    if (ask.length) {
      lines.push('');
      lines.push(hazards.length ? 'When we speak, it would help to confirm:' : 'To help us get this organised, could you please let us know:');
      ask.forEach(function (m) { lines.push('• ' + m.replace(/ \(optional\)$/, ' (if handy)')); });
    }
    lines.push('');
    lines.push('Kind regards,');
    lines.push(biz.signoff);
    var subject = (hazards.length ? 'Urgent: ' : urgency.level === 'urgent' ? 'Urgent: ' : '') + 'Your ' + job.phrase.replace(/ enquiry$/, '') + ' enquiry' + where;
    return { subject: subject, body: lines.join('\n') };
  }

  var counter = 0;
  function nextRef() { counter += 1; return 'VQ-DEMO-' + String(counter).padStart(3, '0'); }

  /**
   * Analyse an enquiry with deterministic rules (SIMULATED — no AI).
   * Returns the same shape as automation/n8n/schema/lead-result.schema.json.
   */
  function simulate(enquiryText, businessId, opts) {
    opts = opts || {};
    var biz = BUSINESSES[businessId];
    if (!biz) throw new Error('Unknown business: ' + businessId);
    var text = String(enquiryText || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (text.length < 15) throw new Error('Please enter a little more detail about the job (at least 15 characters).');
    if (text.length > 4000) throw new Error('Please keep the enquiry under 4,000 characters.');

    var contact = extractContact(text);
    var loc = extractLocation(text);
    var hazards = detectHazards(text);
    var vulnerable = VULNERABLE_RE.test(text);
    var rental = RENTAL_RE.test(text);
    var job = classify(text, businessId);
    var propertyType = COMMERCIAL_PLACE_RE.test(text) ? 'Commercial' : RESIDENTIAL_RE.test(text) ? 'Residential' : COMMERCIAL_ORG_RE.test(text) ? 'Commercial' : 'Unknown';
    var timing = clean((text.match(/\b(today|tonight|asap|as soon as possible)\b/i) || text.match(TIMING_RE) || [''])[0]);
    timing = timing ? timing.charAt(0).toUpperCase() + timing.slice(1) : '';
    var qty = quantities(text);
    var urgency = urgencyFor(text, job, hazards, vulnerable);
    var missing = missingFor(contact, loc, job, timing, propertyType, qty.length, urgency.level, businessId);
    var reviewReasons = ['All replies are approved by a person before sending'];
    if (hazards.length) reviewReasons.unshift('Safety hazard — call the customer before replying');
    if (vulnerable) reviewReasons.push('Vulnerable occupant mentioned');
    if (rental) reviewReasons.push('Rental property — confirm who authorises the work');

    var summary = job.category + (loc.suburb ? ' — ' + loc.suburb : '') + (propertyType !== 'Unknown' ? ' (' + propertyType.toLowerCase() + ')' : '');
    return {
      schema_version: '1.0',
      mode: 'simulated',
      lead_id: opts.leadId || nextRef(),
      received_at: (opts.now || new Date()).toISOString(),
      business: { id: biz.id, name: biz.name, trade: biz.trade },
      customer: contact,
      job: {
        category: job.category,
        type: job.type,
        summary: summary,
        requirements: requirementsFor(text, job, loc, timing, propertyType, vulnerable, rental),
        property_type: propertyType,
        preferred_timing: timing
      },
      location: loc,
      urgency: urgency,
      safety: { flagged: hazards.length > 0, hazards: hazards },
      missing_information: missing,
      requires_human_review: true,
      review_reasons: reviewReasons,
      draft_reply: draftReply(biz, contact, loc, job, urgency, hazards, missing),
      status: 'awaiting_approval'
    };
  }

  /**
   * Process an enquiry. Today: always the browser simulation.
   * Future: when `endpoint` is a same-origin path (e.g. "/api/lead-assistant"), POST
   * to the site's own backend, which holds the n8n webhook URL and secrets server-side.
   * The browser never sees an n8n URL, webhook secret or AI key.
   */
  function processEnquiry(enquiryText, businessId, options) {
    options = options || {};
    var endpoint = options.endpoint || '';
    if (!endpoint) {
      return new Promise(function (resolve, reject) {
        try { resolve(simulate(enquiryText, businessId)); } catch (e) { reject(e); }
      });
    }
    if (!/^\/api\/[a-z0-9\/_-]+$/i.test(endpoint)) return Promise.reject(new Error('Lead Assistant endpoint must be a same-origin /api/ path.'));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, options.timeoutMs || 20000) : null;
    return fetch(endpoint, {
      method: 'POST', credentials: 'same-origin', signal: ctrl ? ctrl.signal : undefined,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ business_id: businessId, enquiry_text: String(enquiryText || ''), source: 'website_demo' })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || !body || !body.lead_id) throw new Error((body && body.error) || 'The Lead Assistant service is unavailable right now.');
        return body;
      });
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  var api = { BUSINESSES: BUSINESSES, HAZARDS: HAZARDS, VULNERABLE_RE: VULNERABLE_RE, URGENCY: URGENCY, simulate: simulate, processEnquiry: processEnquiry, _internals: { extractContact: extractContact, extractLocation: extractLocation, detectHazards: detectHazards, classify: classify, quantities: quantities } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VerloniqLeadAssistant = api;
})(typeof window !== 'undefined' ? window : this);
