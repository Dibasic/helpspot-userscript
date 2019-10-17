// ==UserScript==
// @name         HSUS: HelpSpot UserScript
// @namespace    hsus
// @version      1.10.00_dev
// @description  HelpSpot form and function
// @author       Ethan Jorgensen
// @supportURL   https://github.com/Dibasic/helpspot-userscript/issues
// @include      /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=(?:workspace(?:&filter=created=[^&]+)?(?:&show=([^&]+))?(?:&fb=[^&]+)?|request(?:\.static)?(?:&fb=([^&]+))?(?:&reqid=([^&]+)))?/
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_log
// @grant        GM_setClipboard
// @grant        GM_setValue
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://kit.fontawesome.com/f90db3a7d3.js
// @connect      hsus.ss13.net
// ==/UserScript==

// SPDX-License-Identifier: MIT

// LINTING
/* jshint devel: true, esnext: true, laxcomma: true, laxbreak: true, -W069 */
/* globals $, GM_addStyle, GM_getValue, GM_info, GM_log, GM_setClipboard, GM_setValue, hs_quote_public, changeNote */

(function() {
    'use strict';

    /* STORAGE KEYS
     * sets keys that will be used for GM_getValue and GM_setValue
     * the key is how they will be referenced in this script file
     * the value is how they will be referenced in Tampermonkey
     */
    var STORAGE_KEYS = {
        'requests' : 'requests'
    };

    var intervalFunctions = {};
    var oneTimeFunctions = {};

    var storage = {};

    var COLOR;
    var STATUS;

    function main() {
        readStorage();

        GM_log(`${GM_info.script.name} - ${GM_info.script.description}`
            + ` v. ${GM_info.script.version} (${new Date(GM_info.script.lastModified).toLocaleString()})`
            + ` © ${GM_info.script.author} (MIT)`
            + ` To report an issue, please visit ${GM_info.script.supportURL}`
        );
        GM_log(GM_info);
        GM_log('HelpSpot page detected. Running styling now.');
        const url = document.URL;
        const pattern = /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=([^&]*)(?:&(?:show|reqid)=(\w+))?/;
        const match = url.match(pattern);

        let pg = match[1] || 'err';
        let arg = match[2] || 'err';
        GM_log('> Page: ' + pg + '\n> Argument: ' + arg);

        setColor();
        setCss();
        setStatus();

        global();

        if (pg === 'workspace') {
            workspace();
            startTimer();
        }
        else if (pg === 'request') {
            request();
            runIntervalFunctions();
        }

        runOneTimeFunctions();
    }

    function startTimer() {
        // Just any condition that helps us tell if we've styled the page already or not.
        let headers = document.querySelector('tr.tableheaders');
        if (!headers.getAttribute('token')) {
            GM_log('detected refresh - running runIntervalFunctions()');
            runIntervalFunctions();
            // Set that condition again
            headers.setAttribute('token', true);
        }
        setTimeout(startTimer, 200);
    }

    function setColor() {
        // created with colorhexa.com
        // base color taken from header of HelpSpot with blue theme
        // suggest using a color highlighter if you edit these

        COLOR = {};

        COLOR.base        = '#70a0d1';
        //COLOR.comp      = '#d1a170';
        //COLOR.analog1   = '#70d1d1';
        //COLOR.analog2   = '#7170d1';
        //COLOR.split1    = '#d17170';
        //COLOR.split2    = '#d1d170';
        COLOR.triad1      = '#d170a0';
        //COLOR.triad2    = '#a0d170';
        //COLOR.tetrad    = '#70d1a1';

        //COLOR.base_d    = '#4986c5';
        //COLOR.comp_d    = '#b97b3c';
        //COLOR.analog1_d = '#3cb9b9';
        //COLOR.analog2_d = '#3d3cb9';
        COLOR.split1_d    = '#b93d3c';
        //COLOR.split2_d  = '#b9b93c';
        //COLOR.triad1_d  = '#b93c7a';
        COLOR.triad2_d    = '#7ab93c';
        //COLOR.tetrad_d  = '#3cb97b';

        COLOR.base_l      = '#97badd';
        //COLOR.comp_l    = '#ddba97';
        //COLOR.analog1_l = '#97dddd';
        //COLOR.analog2_l = '#9797dd';
        COLOR.split1_l    = '#dd9797';
        COLOR.split2_l    = '#dddd97';
        //COLOR.triad1_l  = '#dd97ba';
        COLOR.triad2_l    = '#badd97';
        //COLOR.tetrad_l  = '#97ddba';

        // needed a better yellow, so tried to use existing values
        COLOR.conyellow   = '#dddd49';

        COLOR.white       = '#ffffff';
        COLOR.gray_l      = '#e0e0e0';
        COLOR.gray_m      = '#a0a0a0';
        //COLOR.gray_d    = '#606060';
        //COLOR.black     = '#202020';

        COLOR.error       = COLOR.split1_d;   // #b93d3c
        COLOR.warning     = COLOR.conyellow;  // #dddd49
        COLOR.resolved    = COLOR.triad2_d;   // #7ab93c
        COLOR.feature     = COLOR.base;       // #70a0d1
        COLOR.waiting     = COLOR.split1_l;   // #dd9797
        COLOR.question    = COLOR.triad1;     // #d170a0

        COLOR.pub         = COLOR.triad2_d;   // #7ab93c
        COLOR.prv         = COLOR.split1_d;   // #b93d3c
        COLOR.ext         = COLOR.split2_l;   // #dddd97
    }

    function setStatus() {
        STATUS = {
            'Active'                   : { text: null              , bg: COLOR.warning  , fg: null    , b: null   }
          , 'Appointment Complete'     : { text: 'App Complete'    , bg: COLOR.resolved , fg: null    , b: null   }
          , 'Appointment Scheduled'    : { text: 'App Scheduled'   , bg: COLOR.warning  , fg: null    , b: null   }
          , 'Assessment'               : { text: null              , bg: COLOR.feature  , fg: null    , b: null   }
          , 'Customer Found Solution'  : { text: 'Found Solution'  , bg: COLOR.resolved , fg: null    , b: null   }
          , 'Customer Unreachable'     : { text: 'Unreachable'     , bg: COLOR.gray_m   , fg: COLOR.white , b: null   }
          , 'Escalated'                : { text: null              , bg: COLOR.error    , fg: null    , b: 'bold' }
          , 'Not Supported'            : { text: null              , bg: COLOR.waiting  , fg: null    , b: null   }
          , 'Passed to Implementation' : { text: 'Implementation'  , bg: COLOR.waiting  , fg: null    , b: null   }
          , 'Pending Client Feedback'  : { text: 'Feedback'        , bg: COLOR.resolved , fg: null    , b: null   }
          , 'Pending Internal Info'    : { text: 'Internal Info'   , bg: COLOR.waiting  , fg: null    , b: null   }
          , 'Problem Solved'           : { text: 'Solved'          , bg: COLOR.resolved , fg: null    , b: null   }
          , 'Question Answered'        : { text: 'Answered'        , bg: COLOR.resolved , fg: null    , b: null   }
          , 'Sales Request'            : { text: 'Sales'           , bg: COLOR.waiting  , fg: null    , b: null   }
          , 'Stale'                    : { text: null              , bg: COLOR.waiting  , fg: null    , b: null   }
          , 'Support Rep Working'      : { text: 'Working'         , bg: COLOR.warning  , fg: null    , b: null   }
        };
    }

    function setCss() {
        GM_addStyle(`
            td[id^="1_table_header_"] a {
                text-decoration: none;
            }

            #rsgroup_1 {
                font-family: "Consolas", monospace;
                font-size: 14px;
                white-space: nowrap;
            }

            .request-sub-note-box > button {
                width: 72px;
                text-shadow: none !important;
                font-weight: normal !important;
                background-image: none !important;
            }

            iframe.ephox-hare-content-iframe {
                max-height: 600px;
                overflow-y: scroll;
            }

            .hsus-wysiwyg-btn {
                background-color: ${COLOR.gray_l};
                height: 100%;
            }
            .hsus-wysiwyg-btn:hover {
                background-color: ${COLOR.base_l};
            }
            .request-sub-note-box > button:not(.btn-request-public):not(.btn-request-private):not(.btn-request-external):not(:hover) {
                background-color: ${COLOR.gray_l};
            }
            .btn-request-public:hover {
                background-color: ${COLOR.pub};
            }
            .btn-request-private:hover {
                background-color: ${COLOR.prv};
            }
            .btn-request-external:hover {
                background-color: ${COLOR.ext};
            }

            #sub_update, #sub_updatenclose {
                text-shadow: none !important;
                background-image: none !important;
                padding: 0;
                font-size: 18px;
                background-color: ${COLOR.gray_l};
            }

            div.request-sub-note-box {
                background-color: ${COLOR.gray_l} !important;
            }
            #button-public:hover, button.btn-request-public {
                background-color: ${COLOR.pub} !important;
            }
            #button-private:hover, button.btn-request-private {
                background-color: ${COLOR.prv} !important;
            }
            #button-external:hover, button.btn-request-external {
                background-color: ${COLOR.ext} !important;
            }

            #sub_update, #sub_updatenclose {
                display: flex;
                flex-flow: column nowrap;
                justify-content: space-between;
                align-items: center;
            }
            #hsus-wysiwyg i {
                line-height: 26px;
                vertical-align: middle;
            }
            #sub_update span.hsus-reqbutton-lbl, #sub_updatenclose span.hsus-reqbutton-lbl {
                font-size: 9px;
                text-transform: uppercase;
            }

            .hsus-wysiwyg-ico {
                padding: 0px;
            }
            .hsus-wysiwyg-btn {
                display: flex;
                flex-flow: column nowrap;
                justify-content: space-between;
                align-items: center
            }
            .hsus-wysiwyg-lbl {
                font-size: 9px;
                text-transform: uppercase
            }

            #hsus-wysiwyg {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                height: 36px;
                background-color: ${COLOR.gray_l};
            }

            #ephox_wysiwyg_input {
                border: none;
            }

            #hsus-wysiwyg span, #hsus-wysiwyg button {
                height: 100%;
                cursor: pointer;
            }
            #hsus-wysiwyg > span, #hsus-wysiwyg > button, #hsus-wysiwyg div:not(:first-child):not(.hsus-wysiwyg-lbl) {
                margin: 0 0 0 10px;
            }

            #hsus-wysiwyg > span, #hsus-wysiwyg > button {
                width: 58px;
                text-align: center;
            }

            .request-sub-note-box, .request-sub-note-box-options {
                height: 100%;
            }
            .request-sub-note-box-options {
                margin: 0;
            }

            .hsus-wysiwyg-ico i {
                font-size: 18px;
                color: #272727;
            }
            .hsus-wysiwyg-ico i {
                margin: 0;
                line-height: 26px;
            }

            #hsus-wysiwyg-status {
                margin: 0 10px;
                width: initial !important;
                display: inline-flex;
                align-items: center;
            }

            .note-label {
                border-radius: none;
                font-weight: bold;
            }
            .label-public {
                background-color: ${COLOR.pub};
                color: ${COLOR.white};
            }
            .label-private {
                background-color: ${COLOR.prv};
                color: ${COLOR.white};
            }
            .label-external {
                background-color: ${COLOR.ext};
                color: ${COLOR.black};
            }
            .note-stream-item-public > div.note-stream-item-inner-wrap {
                border-right-color: ${COLOR.pub};
            }
            .note-stream-item-private > div.note-stream-item-inner-wrap {
                border-right-color: ${COLOR.prv};
            }
            .note-stream-item-external > div.note-stream-item-inner-wrap {
                border-right-color: ${COLOR.ext};
            }
            #request_history_body img {
                max-width: 600px;
            }
        `);
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
        let item = GM_getValue(STORAGE_KEYS.requests);
        if (item) {
            storage = JSON.parse(item);
        }
        else {
            GM_setValue(STORAGE_KEYS.requests, '{}');
        }
    }

    function writeStorage() {
        GM_setValue(STORAGE_KEYS.requests, JSON.stringify(storage));
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
        intervalFunctions.noradius = function() {

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
        intervalFunctions.nogradient = function() {

            let timestart = new Date().getTime();

            let count = 0;
            function styleNoGradient(e, flatcolor) {
                e.style['background'] = flatcolor;
                count++;
            }

            styleNoGradient(document.getElementById('hd'), COLOR.base);
            styleNoGradient(document.querySelector('#hd table'), COLOR.base);

            document.querySelectorAll('.btn:not(.theme)').forEach(function(e) {
                styleNoGradient(e, COLOR.gray_l);
            });
            document.querySelectorAll('.btn.theme').forEach(function(e) {
                styleNoGradient(e, COLOR.base);
            });

            document.querySelectorAll('ul.tabs li a:not(.active)').forEach(function(e) {
                styleNoGradient(e, COLOR.gray_l);
            });
            document.querySelectorAll('ul.tabs li a.active').forEach(function(e) {
                styleNoGradient(e, COLOR.base);
            });

            let duration = new Date().getTime() - timestart;

            return [count, duration];
        };
        intervalFunctions.noborder = function() {

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
        intervalFunctions.noshadow = function() {

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
        // todo move out of intervalFunctions, only needs to run once
        intervalFunctions.tabevents = function() {

            let timestart = new Date().getTime();


            function tabActivate(e) {
                let active = e.className === 'active';
                e.style['background'] = active ? COLOR.base : COLOR.gray_l;
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

        intervalFunctions.category = function() {

            let timestart = new Date().getTime();

            const pattern = /^(?:([A-Z]{2,})(?=$| (\d)| Client (Q)| (SOW)| (Mile))|(Impl|Other|Sales|daily\.sh|User Com)).*/
            , sub = '$1$6 $2$3$4$5';

            const product = /^[A-Z]{2,4}$/;

            function styleCategoryCell(e) {
                e.title = e.innerText;
                const result = e.innerText.replace(pattern, sub);
                e.innerText = result;

                if (e.innerText.endsWith(' 1')) {
                    e.style['background-color'] = COLOR.error;
                    e.style['color'] = COLOR.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.endsWith(' 2')
                    || e.innerText.endsWith(' Mile')
                    || e.innerText === 'CSR/SSL') {
                    e.style['background-color'] = COLOR.warning;
                }
                else if (e.innerText.endsWith(' 3')
                    || e.innerText.endsWith(' 4')
                    || e.innerText.endsWith(' SOW')) {
                    e.style['background-color'] = COLOR.feature;
                }
                else if (e.innerText.endsWith(' Q')) {
                    e.style['background-color'] = COLOR.question;
                }
                else if (e.innerText.match(product)
                    || e.innerText === '-') {
                    e.style['background-color'] = COLOR.warning;
                }
                else if (e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Training') {
                    e.style['background-color'] = COLOR.waiting;
                }
            }

            function _styleCategoryCell(e) {
                setTimeout((() => styleCategoryCell(e)), 0);
            }

            let result = getColumnById('1_table_header_sCategory').cells;
            // experiment with letting the stack finish before each call
            result.forEach(_styleCategoryCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        intervalFunctions.cid = function() {

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
        intervalFunctions.age = function() {

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
        intervalFunctions.numUpdates = function() {

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
        intervalFunctions.status = function() {

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

                const newStatus = STATUS[e.innerText];
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
                    e.style['background-color'] = COLOR.error;
                    e.style['color'] = COLOR.white;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText === 'Active'
                    || e.innerText === 'App Scheduled'
                    || e.innerText === 'Working') {
                    e.style['background-color'] = COLOR.warning;
                    e.style['font-weight'] = 'bold';
                }
                else if (e.innerText.startsWith('JAL')
                    || e.innerText === 'Internal Info'
                    || e.innerText === 'Assessment'
                    || e.innerText === 'SOW') {
                    e.style['background-color'] = COLOR.feature;
                }
                else if (e.innerText === 'Client Feedback'
                    || e.innerText === 'Found Solution'
                    || e.innerText === 'App Complete'
                    || e.innerText === 'Answered'
                    || e.innerText === 'Solved') {
                    e.style['background-color'] = COLOR.resolved;
                }
                else if (e.innerText === 'Stale'
                    || e.innerText === 'Implementation'
                    || e.innerText === 'Sales'
                    || e.innerText === 'Not Supported') {
                    e.style['background-color'] = COLOR.waiting;
                }
                else if (e.innerText.endsWith(' Only')
                    || e.innerText.endsWith(' Logs')
                    || e.innerText === 'OOTO Only'
                    || e.innerText === 'Unreachable'
                    || e.innerText === 'SPAM') {
                    e.style['background-color'] = COLOR.gray_m;
                }

                styleElement(e, 'cursor: pointer');
            }

            function _styleStatusCell(e) {
                setTimeout((() => styleStatusCell(e)), 0);
            }

            let result = getColumnById('1_table_header_sStatus').cells;
            result.forEach(_styleStatusCell);

            let duration = new Date().getTime() - timestart;

            return [result.length, duration];
        };
        intervalFunctions.statusnotes = function() {

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
        intervalFunctions.email = function() {

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
        intervalFunctions.request = function() {

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
        intervalFunctions.inboxlabel = function() {

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
        oneTimeFunctions.key = function() {
            function setKeyText(key) {
                let titlebox = document.querySelector('span.box_title_big');
                titlebox.innerText = key;
            }

            let key = $('#access_key_box td.tdr').text();

            if (key) {
                let titlebox = document.querySelector('span.box_title_big');

                // add a new title div for titlebox to separate it from buttons
                let newBox = titlebox.parentNode.cloneNode();
                titlebox.parentNode.parentNode.prepend(newBox);
                newBox.appendChild(titlebox);

                // replace ticket number text with access key
                setKeyText(key);

                // copy access key on click
                titlebox.style['cursor'] = 'pointer';
                titlebox.onclick = function() {
                    GM_setClipboard(key, 'text');
                    titlebox.innerText = '✓ copied';
                    setTimeout(() => setKeyText(key), 500);
                };

                return 1;
            }
            else {
                return 0;
            }
        };
        oneTimeFunctions.reqbuttons = function() {
            let timestart = new Date().getTime();

            function addRequestButtonEvent(e) {
                e.addEventListener('click', intervalFunctions.reqbuttons);
            }

            // default to private note
            changeNote('private');
            intervalFunctions.reqbuttons.call();

            let buttons = document.querySelectorAll('.request-sub-note-box > button');
            buttons.forEach(addRequestButtonEvent);

            let duration = new Date().getTime() - timestart;
            return [buttons.length, duration];
        };

        var tabFix = false; // track whether we've added the live lookup button tab fix yet

        oneTimeFunctions.tabreset = function() {
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

        oneTimeFunctions.newrequest = function() {
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

        intervalFunctions.reqbuttons = function() {
            let timestart = new Date().getTime();

            let color, icon, label;
            if ($('#button-public.btn-request-public').length) {
                color = COLOR.pub;
                icon = '<i class="fad fa-reply-all"></i>';
                label = '<span class="hsus-reqbutton-lbl">SEND</span>';
            }
            else if ($('#button-private.btn-request-private').length) {
                color = COLOR.prv;
                icon = '<i class="fad fa-clipboard-list"></i>';
                label = '<span class="hsus-reqbutton-lbl">NOTE</span>';
            }
            else if ($('#button-external.btn-request-external').length) {
                color = COLOR.ext;
                icon = '<i class="fad fa-paper-plane"></i>';
                label = '<span class="hsus-reqbutton-lbl">FWD</span>';
            }

            $('#sub_update').html(icon + label);
            $('#sub_update').title = 'Update Request';
            $('#sub_updatenclose').html('<i class="fad fa-window-close"></i><span class="hsus-reqbutton-lbl">CLOSE</span>');
            $('#sub_updatenclose').title = 'Update and Close';

            let duration = new Date().getTime() - timestart;
            return [5, duration];
        };

        oneTimeFunctions.wysiwyg = function() {
            // everything to do with WYSIWYG toolbar
            // building blocks for new toolbar
            let btnClass = 'class="hsus-wysiwyg-btn"';
            let icoClass = 'class="hsus-wysiwyg-ico"';
            let lblClass = 'class="hsus-wysiwyg-lbl"';
            let newButtons = '<div id="hsus-wysiwyg">';
            newButtons += `<span ${btnClass} title="Save and Clear Editor"><span ${icoClass} id="hsus-clear"><i class="fad fa-trash"></i></span><span ${lblClass}>Clear</span></span>`;
            newButtons += `<span ${btnClass} title="Quote All Public Notes"><span ${icoClass} id="hsus-quote"><i class="fad fa-quote-right"></i></span><span ${lblClass}>Quote</span></span>`;
            newButtons += `<span ${btnClass} title="Attach File" onclick="addAnotherFile();return false;"><span ${icoClass} id="hsus-attach"><i class="fad fa-paperclip"></i></span><span ${lblClass}>Attach</span></span>`;
            newButtons += `<span ${btnClass} title="Save Draft"><span ${icoClass} id="hsus-save"><i class="fad fa-save"></i></span><span ${lblClass}>Save</span></span>`;
            newButtons += `<span ${btnClass} title="Restore Draft" onclick="draft_options_box();return false;"><span ${icoClass} id="hsus-restore"><i class="fad fa-trash-undo"></i></span><span ${lblClass}>Restore</span></span>`;
            newButtons += '</div><br />';
            // build and draw toolbar
            $('#request_note_box_box_body').prepend($(newButtons));

            // move update controls to toolbar
            // keep in mind we style these in intervalFunctions.reqbuttons that could get ugly
            $('#hsus-wysiwyg')
            .append($('div.request-sub-note-box')) // Public, Private, External
            .append($('#sub_update,#sub_updatenclose')); // Update Request, Update and Close

            $('div.request-sub-note-box-options').remove(); // Attach, Drafts

            // replace existing icons and text for attach/drafts buttons
            $('div.request-sub-note-box-options a[onclick^=addAnotherFile]').html('<i class="fad fa-paperclip"></i>');
            $('div.request-sub-note-box-options a[onclick^=draft_options_]').html('<i class="fad fa-pencil-ruler"></i>');

            $('div.request-sub-note-box-options li').addClass('hsus-wysiwyg-btn');
            $('div.request-sub-note-box-options a').addClass('hsus-wysiwyg-ico');

            // Now that immediately visible changes are complete: EVENTS ARE BELOW!

            // reqbuttons
            $('div.request-sub-note-box button').click(intervalFunctions.reqbuttons);

            // events for new toolbar buttons
            $('#hsus-clear').click(function() {
                $('span.ephox-pastry-button[title^="Save"]').click();
                $('iframe.ephox-hare-content-iframe').first().contents().find('body[class^="ephox"]')[0].innerHTML = '<p><br></p>';
            });
            $('#hsus-quote').click(function() {
                quotePublicHistory();
            });
            $('#hsus-save').click(function() {
                $('span.ephox-pastry-button[title^="Save"]').click();
            });

            function updateEmailStatus() {
                $('#hsus-wysiwyg-status').text($('#email_customer_msg').text());
                $('#hsus-wysiwyg-status')[0].className = $('#email_customer_msg')[0].className;
            }
            $('#hsus-wysiwyg').append($('<span id="hsus-wysiwyg-status"></span>'));
            setInterval(updateEmailStatus, 200);

            // TODO real return
            return [1, 1];
        };

        intervalFunctions.notestream = function() {

            let timestart = new Date().getTime();

            let result;

            waitUntil(
                function detectNoteStream() {
                    return [...document.querySelectorAll('.note-label')].length > 0;
                }
                , 200
                , 50
                , function() {
                    quotePublicHistory();
                }
            );

            let duration = new Date().getTime() - timestart;
            return [result, duration];
        };

        GM_log('> Request view detected. Applying request styling.');
    }

    function runIntervalFunctions() {
        let starttime = new Date().getTime();
        let count = 0;
        Object.keys(intervalFunctions).forEach(function(fn) {
            let result = intervalFunctions[fn].call();
            let incr = '?';
            if (result && result[0]) {
                incr = result[0];
                count += incr;
            }
            GM_log(`> > ${fn} updated ${incr} elements in ${result && result[1] ? result[1] : '?'}ms`);
        });
        let duration = new Date().getTime() - starttime;
        GM_log(`> intervalFunctions updated at least ${count} elements in ${duration}ms`);
    }

    function runOneTimeFunctions() {
        Object.keys(oneTimeFunctions).forEach(fn => GM_log('> > ' + fn + ' created event for ' + oneTimeFunctions[fn].call() + ' elements'));
    }

    main();

})();