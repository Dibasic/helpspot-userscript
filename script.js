// ==UserScript==
// @name         HelpSpot styling
// @namespace    hssu
// @version      1.04.04_dev
// @description  style helpspot interface
// @author       Ethan Jorgensen
// @include      /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=(?:workspace(?:&filter=created=[^&]+)?(?:&show=([^&]+))?(?:&fb=[^&]+)?|request(?:\.static)?(?:&fb=([^&]+))?(?:&reqid=([^&]+)))?/
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_log
// @require      https://kit.fontawesome.com/f90db3a7d3.js
// ==/UserScript==

/* jshint devel: true, esnext: true, laxcomma: true, laxbreak: true, -W069 */
/* globals $jq, GM_setValue, GM_getValue, GM_log, hs_quote_public, changeNote */
(function() {
    'use strict';

    var STORAGE_KEY = 'hsreq';

    // grab their jquery instance
    // ancient! going to avoid for compatibility/awful unsearchable bugs
    // ours uses jQuery 1.7.2
    var $ = $jq;

    var styleFunctions = {};
    var eventFunctions = {};

    var storage = {};

    var C = {};

    var S = {};

    function main() {
        readStorage();

        GM_log('HelpSpot page detected. Running styling now.');
        const url = document.URL;
        const pattern = /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=([^&]*)(?:&(?:show|reqid)=(\w+))?/;
        const match = url.match(pattern);

        let pg = match[1] || 'err';
        let arg = match[2] || 'err';
        GM_log('> Page: ' + pg + '\n> Argument: ' + arg);

        setColor();

        setStatus();

        global();

        if (pg === 'workspace') {
            workspace();
            startTimer();
        }
        else if (pg === 'request') {
            request();
            runStyleFunctions();
        }

        runEventFunctions();
    }

    function startTimer() {
        // Just any condition that helps us tell if we've styled the page already or not.
        let headers = document.querySelector('tr.tableheaders');
        if (!headers.getAttribute('token')) {
            GM_log('detected refresh - running runStyleFunctions()');
            runStyleFunctions();
            // Set that condition again
            headers.setAttribute('token', true);
        }
        setTimeout(startTimer, 200);
    }

    function setColor() {
        // created with colorhexa.com
        // base color taken from header of HelpSpot with blue theme
        // suggest using a color highlighter if you edit these

        C.base        = '#70a0d1';
        //C.comp      = '#d1a170';
        //C.analog1   = '#70d1d1';
        //C.analog2   = '#7170d1';
        //C.split1    = '#d17170';
        //C.split2    = '#d1d170';
        C.triad1      = '#d170a0';
        //C.triad2    = '#a0d170';
        //C.tetrad    = '#70d1a1';

        //C.base_d    = '#4986c5';
        //C.comp_d    = '#b97b3c';
        //C.analog1_d = '#3cb9b9';
        //C.analog2_d = '#3d3cb9';
        C.split1_d    = '#b93d3c';
        //C.split2_d  = '#b9b93c';
        //C.triad1_d  = '#b93c7a';
        C.triad2_d    = '#7ab93c';
        //C.tetrad_d  = '#3cb97b';

        C.base_l      = '#97badd';
        //C.comp_l    = '#ddba97';
        //C.analog1_l = '#97dddd';
        //C.analog2_l = '#9797dd';
        C.split1_l    = '#dd9797';
        C.split2_l    = '#dddd97';
        //C.triad1_l  = '#dd97ba';
        C.triad2_l    = '#badd97';
        //C.tetrad_l  = '#97ddba';

        // needed a better yellow, so tried to use existing values
        C.conyellow   = '#dddd49';

        C.white       = '#ffffff';
        C.gray_l      = '#e0e0e0';
        C.gray_m      = '#a0a0a0';
        //C.gray_d    = '#606060';
        //C.black     = '#202020';

        C.error       = C.split1_d;   // #b93d3c
        C.warning     = C.conyellow;  // #dddd49
        C.resolved    = C.triad2_d;   // #7ab93c
        C.feature     = C.base;       // #70a0d1
        C.waiting     = C.split1_l;   // #dd9797
        C.question    = C.triad1;     // #d170a0

        C.pub         = C.triad2_d;   // #7ab93c
        C.prv         = C.split1_d;   // #b93d3c
        C.ext         = C.split2_l;   // #dddd97
    }

    function setStatus() {
        S = {
            'Active'                   : { text: null              , bg: C.warning  , fg: null    , b: null   }
          , 'Appointment Complete'     : { text: 'App Complete'    , bg: C.resolved , fg: null    , b: null   }
          , 'Appointment Scheduled'    : { text: 'App Scheduled'   , bg: C.warning  , fg: null    , b: null   }
          , 'Assessment'               : { text: null              , bg: C.feature  , fg: null    , b: null   }
          , 'Customer Found Solution'  : { text: 'Found Solution'  , bg: C.resolved , fg: null    , b: null   }
          , 'Customer Unreachable'     : { text: 'Unreachable'     , bg: C.gray_m   , fg: C.white , b: null   }
          , 'Escalated'                : { text: null              , bg: C.error    , fg: null    , b: 'bold' }
          , 'Not Supported'            : { text: null              , bg: C.waiting  , fg: null    , b: null   }
          , 'Passed to Implementation' : { text: 'Implementation'  , bg: C.waiting  , fg: null    , b: null   }
          , 'Pending Client Feedback'  : { text: 'Feedback'        , bg: C.resolved , fg: null    , b: null   }
          , 'Pending Internal Info'    : { text: 'Internal Info'   , bg: C.waiting  , fg: null    , b: null   }
          , 'Problem Solved'           : { text: 'Solved'          , bg: C.resolved , fg: null    , b: null   }
          , 'Question Answered'        : { text: 'Answered'        , bg: C.resolved , fg: null    , b: null   }
          , 'Sales Request'            : { text: 'Sales'           , bg: C.waiting  , fg: null    , b: null   }
          , 'Stale'                    : { text: null              , bg: C.waiting  , fg: null    , b: null   }
          , 'Support Rep Working'      : { text: 'Working'         , bg: C.warning  , fg: null    , b: null   }
        };
    }

    function cssParse(cssText) {
        const pattern = /\s*([^\s:]*):\s*([^;]*);?/gm;
        let rules = [];
        let match;
        while ((match = pattern.exec(cssText)) !== null) {
            if (match.index === pattern.lastIndex) {
                pattern.lastIndex++;
            }
            rules.push(match);
        }
        return rules;
    }

    function quotePublicHistory() {
        hs_quote_public(document.getElementById('reqid').value, 'tBody');
    }

    function styleApply(element, rules) {
        const important = /(.*?)\s*?!important\s*$/;
        const importantSub = '$1';
        rules.forEach(function(rule) {
            if (rule[2].match(important)) {
                element.style.setProperty(rule[1], rule[2].replace(important, importantSub), 'important');
            }
            else {
                element.style.setProperty(rule[1], rule[2]);
            }
        });
    }

    function styleSelectorAll(selector, cssText) {
        const rules = cssParse(cssText);
        const elements = document.querySelectorAll(selector);
        elements.forEach(e => styleApply(e, rules));
        return elements.length;
    }

    function styleSelector(selector, cssText) {
        const element = document.querySelector(selector);
        if (element) {
            const rules = cssParse(cssText);
            styleApply(element, rules);
            return 1;
        }
        else {
            return 0;
        }
    }

    function styleElementById(id, cssText) {
        const element = document.getElementById(id);
        if (element) {
            const rules = cssParse(cssText);
            styleApply(element, rules);
            return 1;
        }
        else {
            return 0;
        }
    }

    function styleElement(element, cssText) {
        const rules = cssParse(cssText);
        if (element) {
            styleApply(element, rules);
            return 1;
        }
        else {
            return 0;
        }
    }

    function getId(element) {
        // substring for everything after "viewing-"
        return [...element.parentElement.childNodes][0].id.substring(8);
    }

    function getCustomStatus(id) {
        return storage[id];
    }

    function setCustomStatus(id, status) {
        storage[id] = status;
        writeStorage();
    }

    function readStorage() {
        let item = GM_getValue(STORAGE_KEY);
        if (item) {
            storage = JSON.parse(item);
        }
        else {
            GM_setValue(STORAGE_KEY, '{}');
        }
    }

    function writeStorage() {
        GM_setValue(STORAGE_KEY, JSON.stringify(storage));
    }

    // Wait until condition returns true, then run onSuccess; if timed out, run onFail
    function waitUntil(condition, delay, maxAttempts, onSuccess, onFail) {
        GM_log(`- - - waitUntil to run ${onSuccess.name} - trying ${condition.name} up to ${maxAttempts} times over up to ${delay * maxAttempts}ms`);
        let attempts = 0;
        function attempt() {
            setTimeout(function() {
                GM_log(`- - - - Attempting ${condition.name} to run ${onSuccess.name} (attempt ${attempts + 1} of ${maxAttempts})...`);
                if (condition()) {
                    GM_log(`- - - - - Success: ${onSuccess.name} returned ${onSuccess()} after ${attempts * delay}ms`);
                }
                else if (++attempts < maxAttempts) {
                    attempt();
                }
                else {
                    GM_log('- - - - Maximum attempts reached:');
                    GM_log(`- - - - - condition: ${condition.name} (currently: ${condition()})`);
                    GM_log('- - - - - delay per attempt: ' + delay);
                    GM_log('- - - - - attempts taken: ' + attempts);
                    GM_log('- - - - - onSuccess: ' + onSuccess.name);
                    GM_log(`- - - - - onFail: ${onFail ? `${onFail.name} returned ${onFail()}` : 'not defined'}`);
                }
            }, delay);
        }
        attempt();
    }

    // global stylings to run in both workspaces and requests
    function global() {
        styleFunctions.noradius = function() {

            let timestart = new Date().getTime();

            function styleNoBorder(e) {
                e.style['border-radius'] = '0';
                e.style['-webkit-border-radius'] = '0';
                e.style['-moz-border-radius'] = '0';
            }

            let count = document.querySelectorAll('.btn');
            count.forEach(styleNoBorder);

            let duration = new Date().getTime() - timestart;

            return [count.length, duration];
        };
        styleFunctions.nogradient = function() {

            let timestart = new Date().getTime();

            let count = 0;
            function styleNoGradient(e, flatcolor) {
                e.style['background'] = flatcolor;
                count++;
            }

            styleNoGradient(document.getElementById('hd'), C.base);
            styleNoGradient(document.querySelector('#hd table'), C.base);

            document.querySelectorAll('.btn:not(.theme)').forEach(function(e) {
                styleNoGradient(e, C.gray_l);
            });
            document.querySelectorAll('.btn.theme').forEach(function(e) {
                styleNoGradient(e, C.base);
            });

            document.querySelectorAll('ul.tabs li a:not(.active)').forEach(function(e) {
                styleNoGradient(e, C.gray_l);
            });
            document.querySelectorAll('ul.tabs li a.active').forEach(function(e) {
                styleNoGradient(e, C.base);
            });

            let duration = new Date().getTime() - timestart;

            return [count, duration];
        };
        styleFunctions.noborder = function() {

            let timestart = new Date().getTime();

            let count = 0;
            function styleNoBorder(e) {
                e.style['border'] = 'none';
                count++;
            }

            document.querySelectorAll('.btn').forEach(styleNoBorder);


            let duration = new Date().getTime() - timestart;

            return [count, duration];
        };
        styleFunctions.noshadow = function() {

            let timestart = new Date().getTime();

            let count = 0;
            function styleNoShadow(e, bold=false) {

                e.style['text-shadow'] = 'none';

                e.style['box-shadow'] = 'none';
                e.style['-webkit-box-shadow'] = 'none';
                e.style['-moz-box-shadow'] = 'none';

                if (bold) {
                    e.style['font-weight'] = 'bold';
                }

                count++;
            }

            document.querySelectorAll('.btn:not(.theme)').forEach(function(e) {
                styleNoShadow(e);
            });
            document.querySelectorAll('.btn.theme').forEach(function(e) {
                styleNoShadow(e, true);
            });
            document.querySelectorAll('ul.tabs li a:not(.active)').forEach(function(e) {
                styleNoShadow(e);
            });
            document.querySelectorAll('ul.tabs li a.active').forEach(function(e) {
                styleNoShadow(e, true);
            });

            let duration = new Date().getTime() - timestart;

            return [count, duration];
        };
        // todo move out of stylefunctions, only needs to run once
        styleFunctions.tabevents = function() {

            let timestart = new Date().getTime();


            function tabActivate(e) {
                let active = e.className === 'active';
                e.style['background'] = active ? C.base : C.gray_l;
                e.style['font-weight'] = active ? 'bold' : 'normal';
            }

            function addTabEvent(e) {
                e.addEventListener('click', function(e) {
                    let siblings = [];
                    e.target.parentElement.parentElement.childElements().forEach(function(child) {
                        child.childElements().forEach(function(grandchild) {
                            siblings.push(grandchild);
                        });
                    });
                    setTimeout(function() {
                        siblings.forEach(tabActivate);
                    }, 50);
                });
            }

            let tabs = document.querySelectorAll('ul.tabs li a');

            tabs.forEach(addTabEvent);

            let duration = new Date().getTime() - timestart;

            return [tabs.length, duration];
        };
    }

    function workspace() {

        function getColumnById(id) {
            let thead = document.getElementById(id), index = null, result = [];
            if (thead) {
                index = Array.prototype.indexOf.call(thead.parentNode.children, thead);
                result = document.querySelectorAll('#rsgroup_1 tr[class^="tablerow"] td:nth-child(' + (index + 1) + ')');
            }
            return {header: thead, cells: result};
        }

        styleFunctions.table = function() {
            return styleElementById('rsgroup_1', 'font-family: "Consolas", monospace; font-size: 14px; white-space: nowrap');
        };

        styleFunctions.thead = function() {
            return styleSelectorAll('td[id^="1_table_header_"] a', 'text-decoration: none');
        };

        styleFunctions.category = function() {

            let timestart = new Date().getTime();

            const pattern = /^(?:([A-Z]{2,})(?=$| (\d)| Client (Q)| (SOW)| (Mile))|(Impl|Other|Sales|daily\.sh|User Com)).*/
            , sub = '$1$6 $2$3$4$5';

            const product = /^[A-Z]{2,4}$/;

            function styleCategoryCell(e) {
                e.title = e.innerText;
                const result = e.innerText.replace(pattern, sub);
                e.innerText = result;

                if (e.innerText.endsWith(' 1')) {
                    e.style['background-color'] = C.error;
                    e.style['color'] = C.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.endsWith(' 2')
                    || e.innerText.endsWith(' Mile')
                    || e.innerText === 'CSR/SSL') {
                    e.style['background-color'] = C.warning;
                }
                else if (e.innerText.endsWith(' 3')
                    || e.innerText.endsWith(' 4')
                    || e.innerText.endsWith(' SOW')) {
                    e.style['background-color'] = C.feature;
                }
                else if (e.innerText.endsWith(' Q')) {
                    e.style['background-color'] = C.question;
                }
                else if (e.innerText.match(product)
                    || e.innerText === '-') {
                    e.style['background-color'] = C.warning;
                }
                else if (e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Training') {
                    e.style['background-color'] = C.waiting;
                }
            }
            let result = getColumnById('1_table_header_sCategory').cells;
            result.forEach(styleCategoryCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.cid = function() {

            let timestart = new Date().getTime();

            function styleCidCell(e) {
                e.style['font-weight'] = 'bold';
            }
            let column = getColumnById('1_table_header_sUserId')
            , header = column.header
            , result = column.cells;

            if (header) {
                header.innerText = 'Client';
            }
            result.forEach(styleCidCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.age = function() {

            let timestart = new Date().getTime();

            const age = /^(\d{1,2}) ([mhdw])(?:in|our|ay|eek|onth)s?(?:, (\d{1,2}) ([mhdw])(?:in|our|ay|eek|onth)s?)?$/;
            function formatAge(a) {
                let match = a.match(age);
                if (!match) {
                    return a;
                }
                let result = '';
                result += (match[1].length < 2 ? '&nbsp;' : '') + match[1];
                result += match[2];
                result += ' ';
                if (!match[3]) {
                    return result;
                }
                result += (match[3].length < 2 ? '&nbsp;' : '') + match[3];
                result += match[4];
                return result;
            }

            let result = getColumnById('1_table_header_dtGMTOpened').cells;
            result.forEach(c => {c.innerHTML = formatAge(c.innerText);});

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.numUpdates = function() {

            let timestart = new Date().getTime();

            let result = getColumnById('1_table_header_ctPublicUpdates').cells;
            result.forEach(c => {
                c.innerText = c.innerText === '1' ? '' : c.innerText;
                c.style['font-size'] = '14px';
                c.style['font-weight'] = 'bold';
            });

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.status = function() {

            let timestart = new Date().getTime();

            function styleStatusCell(e) {
                if (!e.title) {
                    let status = getCustomStatus(getId(e));
                    if (status) {
                        e.title = status;
                        styleElement(e, 'text-decoration: underline; text-decoration-style: dotted');
                    }
                    else {
                        e.title = e.innerText;
                    }
                }

                const newStatus = S[e.innerText];
                if (newStatus) {
                    if (newStatus.text) {
                        e.innerText = newStatus.text;
                    }
                    if (newStatus.bg) {
                        e.style['background-color'] = newStatus.bg;
                    }
                    if (newStatus.fg) {
                        e.style['color'] = newStatus.fg;
                    }
                    if (newStatus.b) {
                        e.style['font-weight'] = newStatus.b;
                    }
                }

                if (e.innerText === 'Escalated') {
                    e.style['background-color'] = C.error;
                    e.style['color'] = C.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText === 'Active'
                    || e.innerText === 'App Scheduled'
                    || e.innerText === 'Working') {
                    e.style['background-color'] = C.warning;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.startsWith('JAL')
                    || e.innerText === 'Internal Info'
                    || e.innerText === 'Assessment'
                    || e.innerText === 'SOW') {
                    e.style['background-color'] = C.feature;
                }
                else if (e.innerText === 'Client Feedback'
                    || e.innerText === 'Found Solution'
                    || e.innerText === 'App Complete'
                    || e.innerText === 'Answered'
                    || e.innerText === 'Solved') {
                    e.style['background-color'] = C.resolved;
                }
                else if (e.innerText === 'Stale'
                    || e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Not Supported') {
                    e.style['background-color'] = C.waiting;
                }
                else if (e.innerText.endsWith(' Only')
                    || e.innerText.endsWith(' Logs')
                    || e.innerText === 'OOTO Only'
                    || e.innerText === 'Unreachable'
                    || e.innerText === 'SPAM') {
                    e.style['background-color'] = C.gray_m;
                }

                styleElement(e, 'cursor: pointer');
            }
            let result = getColumnById('1_table_header_sStatus').cells;
            result.forEach(styleStatusCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.statusnotes = function() {

            let timestart = new Date().getTime();

            function addStatusEvent(e) {
                e.addEventListener('click', function() {
                    let customStatus = prompt('Custom status to show');
                    if (customStatus) {
                        setCustomStatus(getId(e), customStatus);
                        e.title = customStatus;
                        styleElement(e, 'text-decoration: underline; text-decoration-style: dotted');
                    }
                });
            }

            let result = getColumnById('1_table_header_sStatus').cells;
            result.forEach(addStatusEvent);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.email = function() {

            let timestart = new Date().getTime();

            let column = getColumnById('1_table_header_sEmail')
            , header = column.header
            , result = column.cells;

            if (header) {
                header.innerText = 'email domain';
            }

            const pattern = /^.+?(@.+)$/;
            result.forEach(e => {
                e.title = e.innerText;
                let match = e.innerText.match(pattern);
                e.innerText = match && match[1] || e.innerText;
            });

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.request = function() {

            let timestart = new Date().getTime();

            function styleRequestCell(e) {
                setHoverText(e);
                setFontSize(e);
            }

            function setHoverText(e) {
                e.title = e.innerText;
            }

            function setFontSize(e) {
                e.style['font-size'] = '11px';
            }

            let result = document.querySelectorAll('td.js-request');
            result.forEach(styleRequestCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        styleFunctions.inboxlabel = function() {

            let timestart = new Date().getTime();

            function styleInboxLabelCell(e) {
                if (e.innerText.startsWith('Courseleaf ')) {
                    e.innerText = e.innerText.substring(11);
                    if (e.innerText === 'FocusSearch') {
                        e.innerText = 'FSearch';
                    }
                }
                e.style['font-size'] = '14px';
                e.style['font-weight'] = 'bold';
            }
            let result = document.querySelectorAll('span.color-label');
            result.forEach(styleInboxLabelCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };

        GM_log('> Workspace view detected. Applying workspace styling.');
    }

    function request() {
        eventFunctions.key = function() {
            function setKeyText(titlebox) {
                titlebox.innerText = key;
            }
            let key = document.querySelector('#access_key_box td.tdr').innerText;
            if (key) {
                let titlebox = document.querySelector('span.box_title_big');

                // add a new title div for titlebox to separate it from buttons
                let newBox = titlebox.parentNode.cloneNode();
                titlebox.parentNode.parentNode.prepend(newBox);
                newBox.appendChild(titlebox);

                // replace ticket number text with access key
                setKeyText(titlebox);

                // copy access key on click
                titlebox.style['cursor'] = 'pointer';
                titlebox.onclick = function() {
                    const ta = document.createElement('textarea');
                    ta.value = key;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    titlebox.innerText = '✓ copied';
                    setTimeout(setKeyText, 500);
                };

                return 1;
            }
            else {
                return 0;
            }
        };
        eventFunctions.reqbuttons = function() {
            let timestart = new Date().getTime();

            function addRequestButtonEvent(e) {
                e.addEventListener('click', styleFunctions.reqbuttons);
            }

            // default to private note
            changeNote('private');
            styleFunctions.reqbuttons.call();

            let buttons = document.querySelectorAll('.request-sub-note-box > button');
            buttons.forEach(addRequestButtonEvent);

            let duration = new Date().getTime() - timestart;
            return [buttons.length, duration];
        };

        var tabFix = false; // track whether we've added the live lookup button tab fix yet

        eventFunctions.tabreset = function() {
            document.querySelector('a[href^="#livelookup"]').addEventListener('click', function() {
                waitUntil(
                    function detectLiveLookupButton() {
                        return document.querySelector('#customer_ajax_ll_inner > div.box_footer > button');
                    }
                    , 190 // ideally, this beats newrequest
                    , 10
                    , function setTabFixEvent() {
                        document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').addEventListener('click', function() {
                            document.querySelector('a[href^="#customer"]').click();
                        });
                        tabFix = true;
                    }
                );
            });
        };

        eventFunctions.newrequest = function() {
            let inbox = document.getElementById('Custom22');
            if (!inbox.value) {
                inbox.value = inbox.options[1].value;
            }
            let category = document.getElementById('xCategory');
            if (!category.value || category.value == '0') {
                // default to cat and generate the proper form for this category
                category.value = 41;
                category.onchange.call();
                // assign back to inbox
                document.getElementById('xPersonAssignedTo_select').value = '0';
                document.getElementById('xPersonAssignedTo_select').onchange.call();
            }
            let cid = document.getElementById('sUserId');
            if (!cid.value) {
                let email = document.getElementById('sEmail').value;
                let pattern = /.+?@(.+\.)?([^\.]+)\.([^\.]+)$/;
                let match = email.match(pattern);
                cid.value = match[2] + (match[3] != 'edu' ? '-' + match[2] : '');

                // run the live lookup
                document.querySelector('a[href^="#livelookup"]').click();
                waitUntil(
                    function detectLiveLookupButton() {
                        return document.querySelector('#customer_ajax_ll_inner > div.box_footer > button');
                    }
                    , 200
                    , 10
                    , function clickLiveLookupButton() {
                        document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').click();
                        tabFix = false;
                    }
                );
            }
        };

        styleFunctions.reqbuttons = function() {
            let timestart = new Date().getTime();

            styleSelectorAll('.request-sub-note-box > button', `width: 72px; background: ${C.gray_l} !important; text-shadow: none !important; font-weight: normal !important; background-image: none !important`);
            let color, icon;
            if (1 == styleSelector('#button-public.btn-request-public',          `background: ${C.pub} !important; font-weight: bold !important`)) {
                color = C.pub;
                icon = '<i class="fad fa-reply-all"></i>';
            }
            else if (1 == styleSelector('#button-private.btn-request-private',   `background: ${C.prv} !important; font-weight: bold !important`)) {
                color = C.prv;
                icon = '<i class="fad fa-clipboard-list"></i>';
            }
            else if (1 == styleSelector('#button-external.btn-request-external', `background: ${C.ext} !important; font-weight: bold !important`)) {
                color = C.ext;
                icon = '<i class="fad fa-paper-plane"></i>';
            }
            styleSelectorAll('.request-sub-note-box > button:not(.btn-request-public):not(.btn-request-private):not(.btn-request-external)', `background-color: ${C.gray_l}`);
            styleSelectorAll('#sub_update, #sub_updatenclose', `background-color: ${color} !important; text-shadow: none !important; background-image: none !important; padding: 0; font-size: 18px`);

            document.getElementById('sub_update').innerHTML = icon;
            document.getElementById('sub_update').title = 'Update Request';
            document.getElementById('sub_updatenclose').innerHTML = '<i class="fad fa-window-close"></i>';
            document.getElementById('sub_updatenclose').title = 'Update and Close';

            let duration = new Date().getTime() - timestart;
            return [5, duration];
        };

        eventFunctions.wysiwyg = function() {
            // this would be much more difficult to do without jQuery
            if (! $.fn.jquery) {
                return [0, 0];
            }
            waitUntil(function detectWysiwyg() {
                // detecting that there is a toolbar before running any of this
                // wysywig loads asynchronously
                return [...document.querySelectorAll('.ephox-chameleon-toolbar')].length > 0;
            },
            200,
            10,
            function makeWysiwygScrollable() {
                // make wysywig body scrollable
                $('iframe.ephox-hare-content-iframe').first().contents().find('body').css({
                    'max-height': '600px',
                    'overflow-y': 'scroll'
                });
            });
            // everything to do with WYSIWYG toolbar
            // building blocks for new toolbar
            let btnClass = 'class="hssu-wysiwyg-btn"';
            let icoClass = 'class="hssu-wysiwyg-ico"';
            let lblClass = 'class="hssu-wysiwyg-ico"';
            let newButtons = '<div id="hssu-wysiwyg">';
            newButtons += `<span ${btnClass} title="Save and Clear Editor"><span ${icoClass} id="hssu-clear"><i class="fad fa-trash"></i></span><span ${lblClass}>Clear</span></span>`;
            newButtons += `<span ${btnClass} title="Quote All Public Notes"><span ${icoClass} id="hssu-quote"><i class="fad fa-quote-right"></i></span><span ${lblClass}>Quote</span></span>`;
            newButtons += `<span ${btnClass} title="Attach File" onclick="addAnotherFile();return false;"><span ${icoClass} id="hssu-attach"><i class="fad fa-trash"></i></span><span ${lblClass}>Attach</span></span>`;
            newButtons += `<span ${btnClass} title="Save Draft"><span ${icoClass} id="hssu-save"><i class="fad fa-save"></i></span><span ${lblClass}>Save</span></span>`;
            newButtons += `<span ${btnClass} title="Restore Draft" onclick="draft_options_box();return false;"><span ${icoClass} id="hssu-restore"><i class="fad fa-trash-undo"></i></span><span ${lblClass}>Restore</span></span>`;
            newButtons += '</div><br />';
            // build and draw toolbar
            $('#request_note_box_box_body').prepend($jq(newButtons));

            // move update controls to toolbar
            // keep in mind we style these in styleFunctions.reqbuttons that could get ugly
            $('#hssu-wysiwyg')
            .append($('div.request-sub-note-box')) // Public, Private, External
            .append($('#sub_update,#sub_updatenclose')); // Update Request, Update and Close

            $('div.request-sub-note-box-options').remove(); // Attach, Drafts

            // replace existing icons and text for attach/drafts buttons
            $('div.request-sub-note-box-options a[onclick^=addAnotherFile]').html('<i class="fad fa-paperclip"></i>');
            $('div.request-sub-note-box-options a[onclick^=draft_options_]').html('<i class="fad fa-pencil-ruler"></i>');

            $('div.request-sub-note-box-options li').addClass('hssu-wysiwyg-btn');
            $('div.request-sub-note-box-options a').addClass('hssu-wysiwyg-ico').css('padding', '0px');

            // position labels via flexbox
            $('hssu-wysiwyg-btn').css({
                'display': 'flex',
                'flex-flow': 'column nowrap',
                'justify-content': 'space-between',
                'align-items': 'center'
            });
            $('hssu-wysiwyg-ico').css({

            });
            $('hssu-wysiwyg-lbl').css({
                'font-size', '8px';
                'text-transform', 'uppercase'
            });

            // styles for outer div
            $('#hssu-wysiwyg').css({
                'display': 'flex',
                'flex-wrap': 'wrap',
                'align-items': 'center',
                'height': '36px',
                'background-color': C.gray_l,
            });

            // flat styles for wysywig itself
            $('#ephox_wysiwyg_input').css({
                'border': 'none'
            });

            // styles for all buttons
            $('#hssu-wysiwyg span, #hssu-wysiwyg button').css({
                'height': '100%',
                'cursor': 'pointer'
            });
            $('#hssu-wysiwyg span:not(:first-child), #hssu-wysiwyg button:not(:first-child), #hssu-wysiwyg div:not(:first-child)').css({
                'margin': '0 0 0 10px'
            });



            // styles for icon buttons only (not in sub note div)
            $('#hssu-wysiwyg > span, #hssu-wysiwyg > button').css({
                'width': '58px', // no weird pixel math going on here, just looks nice. golden ratio of line height of 36
                'text-align': 'center'
            });

            // good time to mention why i'm styling the request note box here.
            // if this doesn't run because the jquery check fails or for any other reason,
            // then we want any styles applicable without this function to run in reqbuttons
            // and anything specific to the layout change to run here
            $('.request-sub-note-box, .request-sub-note-box-options').css({
                'height': '100%',
                'margin': '0'
            });

            // fontawesome icons
            $('#hssu-wysiwyg i').css({'vertical-align': 'middle'});

            // custom button "container" spans
            $('.hssu-wysiwyg-btn').css({
                'background-color': C.gray_l,
                'height': '100%'
            }).hover(
                function() {$(this).css('background-color', C.base_l);},
                function() {$(this).css('background-color', '');}
            );

            // custom button "label" spans
            $('.hssu-wysiwyg-ico').css({
                'font-size': '18px',
                'color': '#272727;'
            });
            $('.hssu-wysiwyg-ico, .hssu-wysiwyg-ico i').css({
                'margin': '0',
                'line-height': '34px' // todo better vertical centering
            });

            // Now that immediately visible changes are complete: EVENTS ARE BELOW!

            $('#hssu-wysiwyg button').hover(
                function() {$(this)[0].style.setProperty('background-color', C.base_l, 'important');},
                styleFunctions.reqbuttons
            );

            // events for new toolbar buttons
            $('#hssu-clear').click(function() {
                $('span.ephox-pastry-button[title^="Save"]').click();
                $('iframe.ephox-hare-content-iframe').first().contents().find('body[class^="ephox"]')[0].innerHTML = '<p><br></p>';
            });
            $('#hssu-quote').click(function() {
                quotePublicHistory();
            });
            $('#hssu-save').click(function() {
                $('span.ephox-pastry-button[title^="Save"]').click();
            });

            // TODO real return
            return [1, 1];
        };

        styleFunctions.notestream = function() {

            let timestart = new Date().getTime();

            let result;
            function styleNoteStream() {
                result = styleSelectorAll('.note-label', `border-radius: none; font-weight: bold`);

                result += styleSelectorAll('.label-public', `background-color: ${C.pub}; color: ${C.white}`);
                result += styleSelectorAll('.label-private', `background-color: ${C.prv}; color: ${C.white}`);
                result += styleSelectorAll('.label-external', `background-color: ${C.ext}; color: ${C.black}`);

                result += styleSelectorAll('.note-stream-item-public > div.note-stream-item-inner-wrap', `border-right-color: ${C.pub}`);
                result += styleSelectorAll('.note-stream-item-private > div.note-stream-item-inner-wrap', `border-right-color: ${C.prv}`);
                result += styleSelectorAll('.note-stream-item-external > div.note-stream-item-inner-wrap', `border-right-color: ${C.ext}`);

                result += styleSelectorAll('#request_history_body img', 'max-width: 600px');

                return [result, duration];
            }

            waitUntil(
                function detectNoteStream() {
                    return [...document.querySelectorAll('.note-label')].length > 0;
                }
                , 200
                , 50
                , function() {
                    styleNoteStream();
                    quotePublicHistory();
                }
            );

            let duration = new Date().getTime() - timestart;
            return [result, duration];
        };

        GM_log('> Request view detected. Applying request styling.');
    }

    function runStyleFunctions() {
        let starttime = new Date().getTime();
        let count = 0;
        Object.keys(styleFunctions).forEach(function(fn) {
            let result = styleFunctions[fn].call();
            let incr = '?';
            if (result && result[0]) {
                incr = result[0];
                count += incr;
            }
            GM_log(`> > ${fn} updated ${incr} elements in ${result && result[1] ? result[1] : '?'}ms`);
        });
        let duration = new Date().getTime() - starttime;
        GM_log(`> styleFunctions updated at least ${count} elements in ${duration}ms`);
    }

    function runEventFunctions() {
        Object.keys(eventFunctions).forEach(fn => GM_log('> > ' + fn + ' created event for ' + eventFunctions[fn].call() + ' elements'));
    }

    main();

})();