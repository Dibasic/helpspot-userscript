// ==UserScript==
// @name         HelpSpot styling
// @namespace    helpspot
// @version      0.62
// @description  style helpspot interface
// @author       Ethan Jorgensen
// @include      /^https?://helpspot\.courseleaf\.com/admin\.php\?pg=(?:workspace|request)&(?:show|reqid)=(\w+)/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var styleFunctions = {};

    var colors = {};
    var status = {};

    function main() {

        console.log('HelpSpot page detected. Running styling now.')
        const url = document.URL;
        const pattern = /^https?:\/\/helpspot\.courseleaf\.com\/admin\.php\?pg=(workspace|request)&(?:show|reqid)=(\w+)/;
        const match = url.match(pattern);

        let pg = match[1] || 'err';
        let arg = match[2] || 'err';
        console.log('> Page: ' + pg + '\n> Argument: ' + arg);

        setColors();

        if (pg === 'workspace') {
            workspace();
        }
        else if (pg === 'request') {
            request();
        }

        /* Font import */
        let link = document.createElement('link');
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Source+Code+Pro&display=swap');
        document.head.appendChild(link);

        runStyleFunctions();
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

        colors.base        = '#70a0d1';

        //colors.comp      = '#d1a170';
        colors.analog1     = '#70d1d1';
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
        //colors.split2_l  = '#dddd97';
        //colors.triad1_l  = '#dd97ba';
        //colors.triad2_l  = '#badd97';
        //colors.tetrad_l  = '#97ddba';

        // needed a better yellow, so tried to use existing values
        colors.conyellow   = '#dddd49';

        // actual color scheme being used
        colors.brick       = colors.split1_d;
        colors.blush       = colors.split1_l;
        colors.lemon       = colors.conyellow;
        colors.green       = colors.triad2_d;
        colors.turquoise   = colors.analog1;
        colors.orchid      = colors.triad1;

        colors.white       = '#f0f0f0';
        colors.gray_l      = '#e0e0e0';
        colors.gray_m      = '#a0a0a0';
        //colors.gray_d    = '#606060';
        //colors.black     = '#202020';

        status.error       = colors.brick;
        status.warning     = colors.lemon;
        status.feature     = colors.turquoise;
        status.waiting     = colors.blush;
        status.question    = colors.orchid;
        status.resolved    = colors.green;
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

        styleFunctions = {
            'table' : function() {
                let result = document.getElementById('rsgroup_1');

                result.style['font-family'] = '"Source Code Pro", "Consolas", monospace';
                result.style['font-size'] = '14px';

                return 1;
            }
            , 'tHead' : function() {
                function styleHeadCell(e) {
                    e.style['text-decoration'] = 'none';
                }
                let result = document.querySelectorAll('td[id^="1_table_header_"] a');
                result.forEach(styleHeadCell);

                return result.length;
            }
            , 'category' : function() {
                const pattern = /^(?:([A-Z]{2,})(?=$| (\d)| Client (Q)| (SOW)| (Mile))|(Impl|Other|Sales|daily\.sh|User Com)).*/
                , sub = `$1$6 $2$3$4$5`;

                const s1 = /^[A-Z]{2,} 1/;
                const s3 = /^[A-Z]{2,} 3/;
                const mile = /^CAT M/;

                function styleCategoryCell(e) {
                    e.title = e.innerText;
                    const result = e.innerText.replace(pattern, sub);
                    e.innerText = result;

                    if (e.innerText.match(s1)) {
                        e.style['background-color'] = 'red';
                        e.style['color'] = 'white';
                        e.style['font-weight'] = 'bold';
                    }
                    else if (e.innerText.match(s3)) {
                        e.style['background-color'] = 'teal';
                        e.style['color'] = 'white';
                    }
                    else if (e.innerText.match(mile)) {
                        e.style['background-color'] = 'purple';
                        e.style['color'] = 'white';
                    }
                }
                let result = getColumnById('1_table_header_sCategory').cells;
                result.forEach(styleCategoryCell);

                return result.length;
            }
            , 'cid' : function() {
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
            }
            , 'age' : function() {
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
            }
            , 'numUpdates' : function() {
                let result = getColumnById('1_table_header_ctPublicUpdates').cells;
                result.forEach(c => {
                    c.innerText = c.innerText === '1' ? '' : c.innerText;
                    c.style['font-size'] = '14px';
                    c.style['font-weight'] = 'bold';
                });

                return result.length;
            }
            , 'status' : function() {
                const pattern = /^(?:Pending (Client Feedback|Internal Info)|Support Rep (Working)|Problem (Solved)|Question (Answered)|(App)ointment( Scheduled| Complete)|Customer (Found Solution|Unreachable)|Passed to (Implementation)|(Sales) Request)$/
                , sub = `$1$2$3$4$5$6$7$8$9`;

                const escalated = /^Esc/;
                const active = /^Act/;
                const appt = /^App S/;
                const jalot = /^JAL/;
                const sow = /^SOW/;
                const pcf = /^Client Feed/;

                function styleStatusCell(e) {
                    e.title = e.innerText;
                    const result = e.innerText.replace(pattern, sub);
                    e.innerText = result;

                    if (e.innerText.match(escalated)) {
                        e.style['background-color'] = 'red';
                        e.style['color'] = 'white';
                        e.style['font-weight'] = 'bold';
                    }
                    if (e.innerText.match(active) || e.innerText.match(appt)) {
                        e.style['background-color'] = 'yellow';
                        e.style['font-weight'] = 'bold';
                    }
                    else if (e.innerText.match(jalot) || e.innerText.match(sow)) {
                        e.style['background-color'] = 'aqua';
                    }
                    else if (e.innerText.match(pcf)) {
                        e.style['background-color'] = 'lime';
                    }
                }
                let result = getColumnById('1_table_header_sStatus').cells;
                result.forEach(styleStatusCell);

                return result.length;
            }
            , 'email' : function() {
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
            }
            , 'request' : function() {
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
            }
            , 'inboxLabel' : function() {
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
            }
        };

        console.log('> Workspace view detected. Applying workspace styling.');

    }

    function request() {
        console.log('> Request view detected. Applying request styling.');
    }

    function runStyleFunctions() {
        Object.keys(styleFunctions).forEach(f => console.log('> > ' + f + ' updated ' + styleFunctions[f].call()) + ' elements');
    }

    main();
    startTimer();

})();