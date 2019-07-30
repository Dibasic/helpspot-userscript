// ==UserScript==
// @name         HelpSpot styling
// @namespace    helpspot
// @version      0.96
// @description  style helpspot interface
// @author       Ethan Jorgensen
// @include      /^https?://helpspot\.courseleaf\.com/admin\.php\?pg=(?:workspace|request(?:&fb=\d+)?)&(?:show|reqid)=(\w+)/
// @grant        none
// ==/UserScript==

/*  jshint esversion: 6
  , laxcomma: true
  , laxbreak: true
  , -W069 */
(function() {
    'use strict';

    var styleFunctions = {};
    var eventFunctions = {};

    var storage = {};

    var colors = {};

    function main() {
        readStorage();

        console.log('HelpSpot page detected. Running styling now.');
        const url = document.URL;
        const pattern = /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=([^&]*)(?:&(?:show|reqid)=(\w+))?/;
        const match = url.match(pattern);

        let pg = match[1] || 'err';
        let arg = match[2] || 'err';
        console.log('> Page: ' + pg + '\n> Argument: ' + arg);

        setColors();

        global();

        if (pg === 'workspace') {
            workspace();
        }
        else if (pg === 'request') {
            request();
        }

        runStyleFunctions();
        runEventFunctions();
    }

    function startTimer() {
        let loading = document.getElementById('hs_msg');
        if (!loading.style.cssText.includes('display: none')) {
            console.log('detecting loading message - running runStyleFunctions()');
            runStyleFunctions();
        }
        setTimeout(startTimer, 1000);
    }

    function setColors() {
        // created with colorhexa.com
        // base color taken from header of HelpSpot with blue theme
        // suggest using a color highlighter if you edit these

        colors.base        = '#70a0d1';
        //colors.comp      = '#d1a170';
        //colors.analog1   = '#70d1d1';
        //colors.analog2   = '#7170d1';
        //colors.split1    = '#d17170';
        //colors.split2    = '#d1d170';
        colors.triad1      = '#d170a0';
        //colors.triad2    = '#a0d170';
        //colors.tetrad    = '#70d1a1';

        //colors.base_d    = '#4986c5';
        //colors.comp_d    = '#b97b3c';
        //colors.analog1_d = '#3cb9b9';
        //colors.analog2_d = '#3d3cb9';
        colors.split1_d    = '#b93d3c';
        //colors.split2_d  = '#b9b93c';
        //colors.triad1_d  = '#b93c7a';
        colors.triad2_d    = '#7ab93c';
        //colors.tetrad_d  = '#3cb97b';

        //colors.base_l    = '#97badd';
        //colors.comp_l    = '#ddba97';
        //colors.analog1_l = '#97dddd';
        //colors.analog2_l = '#9797dd';
        colors.split1_l    = '#dd9797';
        colors.split2_l    = '#dddd97';
        //colors.triad1_l  = '#dd97ba';
        colors.triad2_l    = '#badd97';
        //colors.tetrad_l  = '#97ddba';

        // needed a better yellow, so tried to use existing values
        colors.conyellow   = '#dddd49';

        colors.white       = '#ffffff';
        colors.gray_l      = '#e0e0e0';
        colors.gray_m      = '#a0a0a0';
        //colors.gray_d    = '#606060';
        //colors.black     = '#202020';

        colors.error       = colors.split1_d;   // #b93d3c
        colors.warning     = colors.conyellow;  // #dddd49
        colors.feature     = colors.base;       // #70a0d1
        colors.waiting     = colors.split1_l;   // #dd9797
        colors.question    = colors.triad1;     // #d170a0
        colors.resolved    = colors.triad2_d;   // #7ab93c

        colors.pub         = colors.triad2_d;   // #7ab93c
        colors.prv         = colors.split1_d;   // #b93d3c
        colors.ext         = colors.split2_l;   // #dddd97
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
        let item = localStorage.getItem('hsreq');
        if (item) {
            storage = JSON.parse(item);
        }
        else {
            localStorage.setItem('hsreq', '{}');
        }
    }

    function writeStorage() {
        localStorage.setItem('hsreq', JSON.stringify(storage));
    }

    // global stylings to run in both workspaces and requests
    function global() {
        styleFunctions['noradius'] = function() {
            function styleNoBorder(e) {
                e.style['border-radius'] = '0';
                e.style['-webkit-border-radius'] = '0';
                e.style['-moz-border-radius'] = '0';
            }

            document.querySelectorAll('.btn').forEach(styleNoBorder);
        };
        styleFunctions['nogradient'] = function() {
            let count = 0;
            function styleNoGradient(e, flatcolor) {
                e.style['background'] = flatcolor;
                count++;
            }

            styleNoGradient(document.getElementById('hd'), colors.base);
            styleNoGradient(document.querySelector('#hd table'), colors.base);

            document.querySelectorAll('.btn:not(.theme)').forEach(function(e) {
                styleNoGradient(e, colors.gray_l);
            });
            document.querySelectorAll('.btn.theme').forEach(function(e) {
                styleNoGradient(e, colors.base);
            });

            document.querySelectorAll('ul.tabs li a:not(.active)').forEach(function(e) {
                styleNoGradient(e, colors.gray_l);
            });
            document.querySelectorAll('ul.tabs li a.active').forEach(function(e) {
                styleNoGradient(e, colors.base);
            });

            return count;
        };
        styleFunctions['noborder'] = function() {
            let count = 0;
            function styleNoBorder(e) {
                e.style['border'] = 'none';
                count++;
            }

            document.querySelectorAll('.btn').forEach(styleNoBorder);

            return count;
        };
        styleFunctions['noshadow'] = function() {

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


            return count;
        };
        // todo move out of stylefunctions, only needs to run once
        styleFunctions['tabevents'] = function() {

            function tabActivate(e) {
                let active = e.className === 'active';
                e.style['background'] = active ? colors.base : colors.gray_l;
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

            return tabs.length;
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

        styleFunctions['table'] = function() {
            let result = document.getElementById('rsgroup_1');

            result.style['font-family'] = '"Consolas", monospace';
            result.style['font-size'] = '14px';

            return 1;
        };
        styleFunctions['thead'] = function() {
            function styleHeadCell(e) {
                e.style['text-decoration'] = 'none';
            }
            let result = document.querySelectorAll('td[id^="1_table_header_"] a');
            result.forEach(styleHeadCell);

            return result.length;
        };
        styleFunctions['category'] = function() {
            const pattern = /^(?:([A-Z]{2,})(?=$| (\d)| Client (Q)| (SOW)| (Mile))|(Impl|Other|Sales|daily\.sh|User Com)).*/
            , sub = '$1$6 $2$3$4$5';

            const product = /^[A-Z]{2,4}$/;

            function styleCategoryCell(e) {
                e.title = e.innerText;
                const result = e.innerText.replace(pattern, sub);
                e.innerText = result;

                if (e.innerText.endsWith(' 1')) {
                    e.style['background-color'] = colors.error;
                    e.style['color'] = colors.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.endsWith(' 2')
                    || e.innerText.endsWith(' Mile')
                    || e.innerText === 'CSR/SSL') {
                    e.style['background-color'] = colors.warning;
                }
                else if (e.innerText.endsWith(' 3')
                    || e.innerText.endsWith(' 4')
                    || e.innerText.endsWith(' SOW')) {
                    e.style['background-color'] = colors.feature;
                }
                else if (e.innerText.endsWith(' Q')) {
                    e.style['background-color'] = colors.question;
                }
                else if (e.innerText.match(product)
                    || e.innerText === '-') {
                    e.style['background-color'] = colors.warning;
                }
                else if (e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Training') {
                    e.style['background-color'] = colors.waiting;
                }
            }
            let result = getColumnById('1_table_header_sCategory').cells;
            result.forEach(styleCategoryCell);

            return result.length;
        };
        styleFunctions['cid'] = function() {
            function styleCidCell(e) {
                e.style['font-weight'] = 'bold';
            }
            let column = getColumnById('1_table_header_sUserId')
            , header = column.header
            , result = column.cells;

            if (header) {
                header.innerText = 'Client';
            }
            result.forEach(c => {c.style['font-weight'] = 'bold';});

            return result.length;
        };
        styleFunctions['age'] = function() {
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

            return result.length;
        };
        styleFunctions['numUpdates'] = function() {
            let result = getColumnById('1_table_header_ctPublicUpdates').cells;
            result.forEach(c => {
                c.innerText = c.innerText === '1' ? '' : c.innerText;
                c.style['font-size'] = '14px';
                c.style['font-weight'] = 'bold';
            });

            return result.length;
        };
        styleFunctions['status'] = function() {
            const pattern = /^(?:Pending (Client Feedback|Internal Info)|Support Rep (Working)|Problem (Solved)|Question (Answered)|(App)ointment( Scheduled| Complete)|Customer (Found Solution|Unreachable)|Passed to (Implementation)|(Sales) Request)$/
            , sub = '$1$2$3$4$5$6$7$8$9';

            function styleStatusCell(e) {
                if (!e.title) {
                    let status = getCustomStatus(getId(e))
                    if (status) {
                        e.title = status;
                        styleElement(e, 'text-decoration: underline; text-decoration-style: dotted');
                    }
                    else {
                        e.title = e.innerText;
                    }
                }

                const result = e.innerText.replace(pattern, sub);
                e.innerText = result;

                if (e.innerText === 'Escalated') {
                    e.style['background-color'] = colors.error;
                    e.style['color'] = colors.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText === 'Active'
                    || e.innerText === 'App Scheduled'
                    || e.innerText === 'Working') {
                    e.style['background-color'] = colors.warning;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.startsWith('JAL')
                    || e.innerText === 'Internal Info'
                    || e.innerText === 'Assessment'
                    || e.innerText === 'SOW') {
                    e.style['background-color'] = colors.feature;
                }
                else if (e.innerText === 'Client Feedback'
                    || e.innerText === 'Found Solution'
                    || e.innerText === 'App Complete'
                    || e.innerText === 'Answered'
                    || e.innerText === 'Solved') {
                    e.style['background-color'] = colors.resolved;
                }
                else if (e.innerText === 'Stale'
                    || e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Not Supported') {
                    e.style['background-color'] = colors.waiting;
                }
                else if (e.innerText.endsWith(' Only')
                    || e.innerText.endsWith(' Logs')
                    || e.innerText === 'OOTO Only'
                    || e.innerText === 'Unreachable'
                    || e.innerText === 'SPAM') {
                    e.style['background-color'] = colors.gray_m;
                }

                styleElement(e, 'cursor: pointer');
            }
            let result = getColumnById('1_table_header_sStatus').cells;
            result.forEach(styleStatusCell);

            return result.length;
        };
        eventFunctions['status'] = function() {
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

            return result.length;
        };
        styleFunctions['email'] = function() {
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

            return result.length;
        };
        styleFunctions['request'] = function() {
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

            return result.length;
        };
        styleFunctions['inboxlabel'] = function() {
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

            return result.length;
        };

        console.log('> Workspace view detected. Applying workspace styling.');

    }

    function request() {
        eventFunctions['reqbuttons'] = function() {
            function addRequestButtonEvent(e) {
                e.addEventListener('click', styleFunctions['reqbuttons']);
            }
            document.querySelectorAll('.request-sub-note-box > button').forEach(addRequestButtonEvent);
        };

        eventFunctions['tabreset'] = function() {
            document.querySelector('a[href^="#livelookup"]').addEventListener('click', function() {
                setTimeout(function() {
                    document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').addEventListener('click', function() {
                        setTimeout(function() {
                            document.querySelector('a[href^="#customer"]').click();
                        }, 200);
                    });
                }, 900);
            })
        }

        eventFunctions['inboxselect'] = function() {
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
                setTimeout(function() {
                    document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').click();
                }, 1000);
            }
        };

        styleFunctions['reqbuttons'] = function() {
            styleSelectorAll('.request-sub-note-box > button', `min-width: 75px; background: ${colors.gray_l} !important; text-shadow: none !important; font-weight: normal !important; background-image: none !important`);
            let color;
            if (1 == styleSelector('#button-public.btn-request-public',     `background: ${colors.pub} !important; font-weight: bold !important`)) {
                color = colors.pub;
            }
            else if (1 == styleSelector('#button-private.btn-request-private',   `background: ${colors.prv} !important; font-weight: bold !important`)) {
                color = colors.prv;
            }
            else if (1 == styleSelector('#button-external.btn-request-external', `background: ${colors.ext} !important; font-weight: bold !important`)) {
                color = colors.ext;
            }
            styleSelectorAll('.request-sub-note-box > button:not(.btn-request-public):not(.btn-request-private):not(.btn-request-external)', `background-color: ${colors.gray_l}`);
            styleSelectorAll('#sub_update, #sub_updatenclose', `background-color: ${color} !important; text-shadow: none !important; background-image: none !important`);
            return 5;
        };

        styleFunctions['notestream'] = function() {

            let attempts = 0;
            function detectNoteStream() {
                setTimeout(function() {
                    if ([...document.querySelectorAll('.note-label')].length > 0) {
                        styleNoteStream();
                    }
                    else if (++attempts < 10) {
                        detectNoteStream();
                    }
                    else {
                        console.log('Maximum attempts for notestream reached. Aborting notestream style function.');
                    }
                }, 500);
            }

            function styleNoteStream() {
                styleSelectorAll('.note-label', `border-radius: none; font-weight: bold`);

                styleSelectorAll('.label-public', `background-color: ${colors.pub}; color: ${colors.white}`);
                styleSelectorAll('.label-private', `background-color: ${colors.prv}; color: ${colors.white}`);
                styleSelectorAll('.label-external', `background-color: ${colors.ext}; color: ${colors.black}`);

                styleSelectorAll('.note-stream-item-public > div.note-stream-item-inner-wrap', `border-right-color: ${colors.pub}`);
                styleSelectorAll('.note-stream-item-private > div.note-stream-item-inner-wrap', `border-right-color: ${colors.prv}`);
                styleSelectorAll('.note-stream-item-external > div.note-stream-item-inner-wrap', `border-right-color: ${colors.ext}`);    
            }

            detectNoteStream();
        };

        console.log('> Request view detected. Applying request styling.');
    }

    function runStyleFunctions() {
        Object.keys(styleFunctions).forEach(f => console.log('> > ' + f + ' updated ' + styleFunctions[f].call()) + ' elements');
    }

    function runEventFunctions() {
        Object.keys(eventFunctions).forEach(f => console.log('> > ' + f + ' created event for ' + eventFunctions[f].call()) + ' elements');
    }

    main();
    startTimer();

})();