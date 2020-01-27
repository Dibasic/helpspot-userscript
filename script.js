// ==UserScript==
// @name         HSUS: HelpSpot UserScript
// @namespace    hsus
// @version      1.15.14
// @description  HelpSpot form and function
// @author       Ethan Jorgensen
// @supportURL   https://github.com/Dibasic/helpspot-userscript/issues
// @include      /^.*?helpspot.*?\/admin\.php\?pg=(?:workspace(?:&filter=created=[^&]+)?(?:&show=([^&]+))?(?:&fb=[^&]+)?|request(?:\.static)?(?:&fb=([^&]+))?(?:&reqid=([^&]+)))?/
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
/* jshint esnext: true, laxcomma: true, laxbreak: true, -W069 */
/* globals $, prompt, GM_addStyle, GM_getValue, GM_info, GM_log, GM_setClipboard, GM_setValue, access_key_box, hs_quote_public, changeNote */

(function() {
	'use strict';

	/* STORAGE KEYS
	 * sets keys that will be used for GM_getValue and GM_setValue
	 * the key is how they will be referenced in this script file
	 * the value is how they will be referenced in Tampermonkey
	 */
	const STORAGE_KEYS = {
		'requests' : 'requests'
	};

	/* QUOTE LENGTH
	 * sets the maximum number of replies that will be automatically quoted
	 */
	const QUOTE_LENGTH = 3;

	var intervalFunctions = {};
	var oneTimeFunctions = {};

	var storage = {};

	var COLOR;

	function main() {
		readStorage();

		GM_log(`${GM_info.script.name} - ${GM_info.script.description}`
			+ ` v. ${GM_info.script.version} (${new Date(GM_info.script.lastModified).toLocaleString()})`
			+ ` © ${GM_info.script.author} (MIT)`
			+ ` To report an issue, please contact me or visit ${GM_info.script.supportURL}`
		);
		
		const url = document.URL;
		const pattern = /\/admin\.php\?pg=(workspace|request)(?:&fb=\d+)?(?:&(?:show|reqid)=(\w+))?/;
		const match = url.match(pattern);

		let pg = match[1] || 'err';
		let arg = match[2] || 'err';
		GM_log('> Page: ' + pg + '\n> Argument: ' + arg);

		setColor();
		setCss();

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

	const CLASS = {
		error    : 'hsus-error'
	  , active   : 'hsus-warng'
	  , wait     : 'hsus-waitg'
	  , question : 'hsus-quest'
	  , solved   : 'hsus-reslv'
	  , stale    : 'hsus-stale'
	  , noaction : 'hsus-noact'
	};

	const STATUS = {
		'Escalated'                : { text: 'Escalated'      , class: CLASS.error    }
	  , 'Active'                   : { text: 'Active'         , class: CLASS.active   }
	  , 'Appointment Scheduled'    : { text: 'App Scheduled'  , class: CLASS.active   }
	  , 'Appointment Complete'     : { text: 'App Complete'   , class: CLASS.solved   }
	  , 'Support Rep Working'      : { text: 'Working'        , class: CLASS.active   }
	  , 'Pending Internal Info'    : { text: 'Internal Info'  , class: CLASS.wait     }
	  , 'JALOT'                    : { text: 'JALOT'          , class: CLASS.wait     }
	  , 'JALOT - Deferred'         : { text: 'JALOT (D)'      , class: CLASS.stale    }
	  , 'Assessment'               : { text: 'Assessment'     , class: CLASS.wait     }
	  , 'SOW'                      : { text: 'SOW'            , class: CLASS.wait     }
	  , 'Problem Solved'           : { text: 'Solved'         , class: CLASS.solved   }
	  , 'Question Answered'        : { text: 'Answered'       , class: CLASS.solved   }
	  , 'Customer Found Solution'  : { text: 'Found Solution' , class: CLASS.solved   }
	  , 'Pending Client Feedback'  : { text: 'Feedback'       , class: CLASS.solved   }
	  , 'Stale'                    : { text: 'Stale'          , class: CLASS.stale    }
	  , 'Sales Request'            : { text: '-> Sales'       , class: CLASS.wait     }
	  , 'Passed to Implementation' : { text: '-> Implem'      , class: CLASS.wait     }
	  , 'CC Only'                  : { text: 'CC'             , class: CLASS.noaction }
	  , 'Customer Unreachable'     : { text: 'Unreachable'    , class: CLASS.noaction }
	  , 'Not Supported'            : { text: 'Not Supported'  , class: CLASS.stale    }
	};

	const CATEGORY = {
		'CAT'                         : { text: 'CAT'       , class: CLASS.active   }
	  , 'CIM'                         : { text: 'CIM'       , class: CLASS.active   }
	  , 'CLSS'                        : { text: 'CLSS'      , class: CLASS.active   }
	  , 'PATH'                        : { text: 'PATH'      , class: CLASS.active   }
	  , 'SYLO'                        : { text: 'SYLO'      , class: CLASS.active   }
	  , 'CAT 1 - Public'              : { text: 'CAT 1'     , class: CLASS.error    }
	  , 'CIM 1 - No Access'           : { text: 'CIM 1'     , class: CLASS.error    }
	  , 'CLSS 1 - Public'             : { text: 'CLSS 1'    , class: CLASS.error    }
	  , 'PATH 1 - Public'             : { text: 'PATH 1'    , class: CLASS.error    }
	  , 'CAT 2 - Next'                : { text: 'CAT 2'     , class: CLASS.active   }
	  , 'CIM 2 - Next'                : { text: 'CIM 2'     , class: CLASS.active   }
	  , 'CLSS 2 - Next'               : { text: 'CLSS 2'    , class: CLASS.active   }
	  , 'PATH 2 - Next'               : { text: 'PATH 2'    , class: CLASS.active   }
	  , 'CAT 3 - Client Requirement'  : { text: 'CAT 3'     , class: CLASS.wait     }
	  , 'CIM 3 - Client Requirement'  : { text: 'CIM 3'     , class: CLASS.wait     }
	  , 'CLSS 3 - Client Requirement' : { text: 'CLSS 3'    , class: CLASS.wait     }
	  , 'PATH 3 - Client Requirement' : { text: 'PATH 3'    , class: CLASS.wait     }
	  , 'CAT SOW'                     : { text: 'CAT SOW'   , class: CLASS.wait     }
	  , 'CIM SOW'                     : { text: 'CIM SOW'   , class: CLASS.wait     }
	  , 'CLSS SOW'                    : { text: 'CLSS SOW'  , class: CLASS.wait     }
	  , 'PATH SOW'                    : { text: 'PATH SOW'  , class: CLASS.wait     }
	  , 'CAT 4 - Repair'              : { text: 'CAT 4'     , class: CLASS.wait     }
	  , 'CIM 4 - Repair'              : { text: 'CIM 4'     , class: CLASS.wait     }
	  , 'CLSS 4 - Repair'             : { text: 'CLSS 4'    , class: CLASS.wait     }
	  , 'CAT Client Questions Only'   : { text: 'CAT Q'     , class: CLASS.solved   }
	  , 'CIM Client Questions Only'   : { text: 'CIM Q'     , class: CLASS.solved   }
	  , 'CLSS Client Questions Only'  : { text: 'CLSS Q'    , class: CLASS.solved   }
	  , 'PATH Client Question Only'   : { text: 'PATH Q'    , class: CLASS.solved   }
	  , 'CAT Milestones'              : { text: 'CAT Mile'  , class: CLASS.active   }
	  , 'CSR/SSL'                     : { text: 'CSR/SSL'   , class: CLASS.active   }
	  , 'Implementation'              : { text: '-> Implem' , class: CLASS.wait     }
	  , 'Training'                    : { text: '-> Train'  , class: CLASS.wait     }
	  , 'Sales'                       : { text: '-> Sales'  , class: CLASS.wait     }
	  , 'User Community'              : { text: 'User Comm' , class: CLASS.wait     }
	  , 'daily.sh warnings'           : { text: 'daily.sh'  , class: CLASS.noaction }
	  , 'Other (Admin Use Only)'      : { text: 'Other'     , class: CLASS.noaction }
	};

	function setCss() {
		GM_addStyle(`
			.${CLASS.error} {
				background-color: ${COLOR.error};
				color: ${COLOR.white};
				font-weight: bold;
			}
			.${CLASS.active} {
				background-color: ${COLOR.warning};
			}
			.${CLASS.wait} {
				background-color: ${COLOR.feature};
			}
			.${CLASS.question} {
				background-color: ${COLOR.question};
			}
			.${CLASS.solved} {
				background-color: ${COLOR.resolved};
			}
			.${CLASS.stale} {
				background-color: ${COLOR.waiting};
			}
			.${CLASS.noaction} {
				background-color: ${COLOR.gray_m};
			}

			.hsus-category {
				width: 80px;
			}
			.hsus-status {
				width: 140px;
				cursor: pointer;
			}
			.hsus-status-custom {
				text-decoration: underline;
				text-decoration-style: dotted;
			}

			td[id^="1_table_header_"] a {
				text-decoration: none;
			}

			#rsgroup_1 {
				font-family: "Consolas", monospace;
				font-size: 14px;
				white-space: nowrap;
			}

			.hsus-c-s1 {
				background-color: ${COLOR.error};
				color: ${COLOR.white};
				font-weight: bold;
			}
			.hsus-c-s2 {
				background-color: ${COLOR.warning};
			}
			.hsus-c-s3 {
				background-color: ${COLOR.feature};
			}
			.hsus-c-cq {
				background-color: ${COLOR.question};
			}
			.hsus-c-pr {
				background-color: ${COLOR.warning};
			}
			.hsus-c-wt {
				background-color: ${COLOR.waiting};
			}

			#hsus-lookup {
				display: inline-block;
				width: 26px;
				text-align: center;
				background-color: ${COLOR.gray_l};
				cursor: pointer;
				margin: 3px 0px 0px 10px;
				position: relative;
				top: 3px;
			}
			#hsus-lookup i {
				line-height: 26px;
				font-size: 18px;
			}
			#hsus-lookup:hover {
				background-color: ${COLOR.base_l};
				color: white;
			}
			#sUserId {
				width: 80% !important;
			}

			.hsus-category-button {
				width: 25%;
				margin: 2px;
			}
			.hsus-category-button-Q {
				background-color: ${COLOR.question};
			}
			.hsus-category-button-1 {
				background-color: ${COLOR.error};
				color: ${COLOR.white};
			}
			.hsus-category-button-2 {
				background-color: ${COLOR.warning};
			}
			.hsus-category-button-3 {
				background-color: ${COLOR.feature};
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
				min-height: 36px;
				background-color: ${COLOR.gray_l};
			}

			#ephox_wysiwyg_input {
				border: none;
			}

			#hsus-wysiwyg span, #hsus-wysiwyg button {
				height: 36px;
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
			.note-stream-item-text {
				max-height: 600px;
				overflow-y: auto;
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

	function cleanBody() {
		$('iframe.ephox-hare-content-iframe').first().contents().find('body > blockquote > blockquote').remove();
		$('iframe.ephox-hare-content-iframe').first().contents().find('body').html($('iframe.ephox-hare-content-iframe').first().contents().find('body').html()
			.replace(/(<p>\s*<br>\s*<\/p>\s*)+/g,'$1')
			.replace(/<blockquote[^>]*>\s*<hr[^>]*>\s*<\/blockquote>/g,'')
		);
	}

	function quotePublicHistory(all) {

		const xRequestHistoryRegex = /^[^-]+-(\d+)$/;
		const xRequestHistorySubst = '$1';

		let count = 0;
		let offset = 0;

		let actions = [];

		if (all) {
			//with this quoting method, longer requests can end up using an INSANE (>1GB) amount of memory for the editor iframe for some reason:
			actions.push(() => hs_quote_public(document.getElementById('reqid').value, 'tBody'));
			//really just meant for external
		}
		else {
			while (count < QUOTE_LENGTH) {
				let item = $('div.note-stream-item:not(.note-stream-item-external)').get(count + offset);
				if (item) {
					item = $(item);
					const xRequestHistory = item.attr('id');
					const id = xRequestHistory.replace(xRequestHistoryRegex, xRequestHistorySubst);
					const quote = $(`a[onclick^="hs_quote(${id},"]`);
					if (item.is('.note-stream-item-private')) {
						const makePublic = $(`a[href$="${id}&makepublic=1"]`);
						const headers = $(`#${xRequestHistory} .note-stream-header-item`);
						if (headers.length > 1) { // this is an email from a CCed person, not a private note
							if (makePublic.length == 1) {
								makePublic.click();
							}
							else {
								GM_log(`Tried to make ${id} public but found ${makePublic.length} matching items.`);
							}
						}
						else { // this is a private note by staff, skip it
							offset++;
							continue;
						}
					}
					if (quote.length == 1) {
						actions.push(quote[0].onclick);
					}
					else {
						GM_log(`Tried to quote ${id} but found ${quote.length} matching items.`);
					}
					count++;      
				}
				else {
					break;
				}
			}
		}
		
		function callAction() {
			const shift = actions.shift();
			if (shift) {
				shift.call();
				setTimeout(callAction, 100);
			}
			else {
				setTimeout(cleanBody, 100);
			}
		}

		callAction();
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
				if (condition()) {
					GM_log(`- - - - - Success: ${onSuccess.name} returned ${onSuccess()} after ${attempts * delay}ms`);
				}
				else if (++attempts < maxAttempts) {
					attempt();
				}
				else {
					GM_log(`- - - - - onFail: ${onFail ? `${onFail.name} returned ${onFail()}` : 'not defined'} after ${attempts * delay}ms`);
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

		/* Performance is VERY IMPORTANT for the category/status transform and styling.
		 * This is the largest visual change and it interrupts redraw.
		 * 1.12 : about 
		*/
		intervalFunctions.category = function() {

			let timestart = new Date().getTime();

			function styleCategoryCell(e) {
				let category = CATEGORY[e.innerText];
				if (category) {
					e.innerText = category.text;
					e.className = 'tcell hsus-category ' + category.class;
				}
			}

			let result = Array.from(getColumnById('1_table_header_sCategory').cells);

			// experiment with slicing in 4 parts for better visual performance
			const s0 = Math.floor(result.length / 8), s1 = Math.floor(result.length / 4), s2 = Math.floor(result.length / 2);
			setTimeout(() => result.slice(0,s0).forEach(styleCategoryCell), 0);
			setTimeout(() => result.slice(s0,s1).forEach(styleCategoryCell), 10);
			setTimeout(() => result.slice(s1,s2).forEach(styleCategoryCell), 25);
			setTimeout(() => result.slice(s1,result.length).forEach(styleCategoryCell), 50);

			let duration = new Date().getTime() - timestart;

			return [result.length, duration];
		};
		intervalFunctions.status = function() {

			let timestart = new Date().getTime();

			function styleStatusCell(e) {
				let status = STATUS[e.innerText];
				if (status) {
					e.className = 'tcell hsus-status ' + status.class;
					let custom = getCustomStatus(getId(e));
					if (custom) {
						e.className += ' hsus-status-custom';
						e.title = custom;
						if (custom.length > 14) {
							e.innerText = custom.substring(0,12) + '...';
						}
						else {
							e.innerText = custom;
						}
					}
					else {
						e.innerText = status.text;
					}
				}
			}
			let result = Array.from(getColumnById('1_table_header_sStatus').cells);

			// experiment with slicing in 4 parts for better visual performance
			// hopefully but not critically, stagger status and category changes
			const s0 = Math.floor(result.length / 8), s1 = Math.floor(result.length / 4), s2 = Math.floor(result.length / 2);
			setTimeout(() => result.slice(0,s0).forEach(styleStatusCell), 0);
			setTimeout(() => result.slice(s0,s1).forEach(styleStatusCell), 10);
			setTimeout(() => result.slice(s1,s2).forEach(styleStatusCell), 25);
			setTimeout(() => result.slice(s1,result.length).forEach(styleStatusCell), 50);

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
		intervalFunctions.statusnotes = function() {

			let timestart = new Date().getTime();

			function addStatusEvent(e) {
				e.addEventListener('click', function() {
					let customStatus = prompt('Custom status to show', getCustomStatus(getId(e)));
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
						e.innerText = 'FoSe';
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

			function getAccessKey() {
				// $('#access_key_box td.tdr').text()
				// return access_key_box.textContent.replace(/\s|Access Key/g, '');
				// return access_key_box && /\d{5,}[a-z]+/.exec(access_key_box.textContent)[0];
				return access_key_box.firstElementChild.firstElementChild.firstElementChild.childNodes[3].firstElementChild.innerText;
			}

			let key = getAccessKey();

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

		function runLiveLookup() {
			document.querySelector('a[href^="#livelookup"]').click();
			waitUntil(
				function detectLiveLookupButton() {
					return document.querySelector('#customer_ajax_ll_inner > div.box_footer > button');
				}
				, 20
				, 100
				, function clickLiveLookupButton() {
					document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').click();
				}
			);
		}

		intervalFunctions.lookupButton = function() {
			$('<span id="hsus-lookup"><i class="fad fa-search"></i></span>').insertAfter($('#sUserId'));
			$('#hsus-lookup').click(runLiveLookup);
		};

		oneTimeFunctions.newrequest = function() {
			// Inbox field
			let inbox = document.getElementById('Custom22');
			if (!inbox.value) {
				inbox.value = inbox.options[1].value;
			}
			let category = document.getElementById('xCategory');
			if (!category.value || category.value == '0') {
				// default to CAT Q and generate the proper form for this category
				category.value = 22;
				category.onchange.call();
				// assign back to inbox
				document.getElementById('xPersonAssignedTo_select').value = '0';
				document.getElementById('xPersonAssignedTo_select').onchange.call();
			}

			let buttons = [
				{
					text:"CAT Q",
					catIndex:22,
					class:"hsus-category-button-Q"
				},
				{
					text:"CAT 1",
					catIndex:6,
					class:"hsus-category-button-1"
				},
				{
					text:"CAT 2",
					catIndex:7,
					class:"hsus-category-button-2"
				},
				{
					text:"CAT 3",
					catIndex:8,
					class:"hsus-category-button-3"
				},
				{
					text:"CAT M",
					catIndex:26,
					class:"hsus-category-button-2"
				},
				{
					text:"CIM Q",
					catIndex:22,
					class:"hsus-category-button-Q"
				},
				{
					text:"CIM 1",
					catIndex:19,
					class:"hsus-category-button-1"
				},
				{
					text:"CIM 2",
					catIndex:12,
					class:"hsus-category-button-2"
				},
				{
					text:"CIM 3",
					catIndex:13,
					class:"hsus-category-button-3"
				},
				{
					text:"CSR/SSL",
					catIndex:46,
					class:"hsus-category-button-2"
				},
				{
					text:"CLSS Q",
					catIndex:33,
					class:"hsus-category-button-Q"
				},
				{
					text:"CLSS 1",
					catIndex:27,
					class:"hsus-category-button-1"
				},
				{
					text:"CLSS 2",
					catIndex:28,
					class:"hsus-category-button-2"
				},
				{
					text:"CLSS 3",
					catIndex:21,
					class:"hsus-category-button-3"
				},
				{
					text:"Impl",
					catIndex:17,
					class:"hsus-category-button-2"
				},
				{
					text:"PATH Q",
					catIndex:22,
					class:"hsus-category-button-Q"
				},
				{
					text:"PATH 1",
					catIndex:6,
					class:"hsus-category-button-1"
				},
				{
					text:"PATH 2",
					catIndex:7,
					class:"hsus-category-button-2"
				},
				{
					text:"PATH 3",
					catIndex:8,
					class:"hsus-category-button-3"
				},
				{
					text:"Train",
					catIndex:8,
					class:"hsus-category-button-2"
				},
			];

			let opts = [];
			$('#xCategory').toArray()[0].childElements().forEach(function(opt) {
				if (opt.nodeName === "OPTGROUP") {
					opts = opts.concat(opt.childElements());
				}
				else {
					opts.push(opt);
				}
			});

			// populate index if no catIndex is given
			buttons.forEach(function(btn) {
				if (!btn.catIndex) {
					let suggest;
					try {
						suggest = opts.filter(o => o.innerText.indexOf(btn.text) > -1)[0].value;
					}
					catch (err) {
						suggest = -1;
					}
					btn.catIndex = suggest;
				}
			});

			let btnHTML = '';
			buttons.forEach(function(btn) {
				btnHTML += `<span id=hsus-category-button-${btn.catIndex} class="hsus-category-button${btn.class ? ` ${btn.class}` : ''}">${btn.text}</span>`;
			});
			btnHTML += `<span id="giveup" class="hsus-category-button" style="width: 100%">Give Back to INBOX</span>`;

			$('#request-details-box-top_box_body').prepend($(btnHTML));

			buttons.forEach(function(btn) {
				$(`#hsus-category-button-${btn.catIndex}`).click(function() {
					let category = document.getElementById('xCategory');
					category.value = btn.catIndex;
					category.onchange.call();
				});
			});
			$('#giveup').click(function() {
				// assign back to inbox
				document.getElementById('xPersonAssignedTo_select').value = '0';
				document.getElementById('xPersonAssignedTo_select').onchange.call();
			});

			let cid = document.getElementById('sUserId');
			if (!cid.value) {
				let email = document.getElementById('sEmail').value;
				let pattern = /.+?@(.+\.)?([^\.]+)\.([^\.]+)$/;
				let match = email.match(pattern);
				if (match) {
					cid.value = match[2] + (match[3] != 'edu' ? '-' + match[2] : '');
					runLiveLookup();
				}
			}
		};

		oneTimeFunctions.tabreset = function() {
			document.querySelector('a[href^="#livelookup"]').addEventListener('click', function() {
				waitUntil(
					function detectLiveLookupButton() {
						return document.querySelector('#customer_ajax_ll_inner > div.box_footer > button');
					}
					, 19 // ideally, this beats runlivelookup. TODO fix this dumb hack
					, 100
					, function setTabFixEvent() {
						document.querySelector('#customer_ajax_ll_inner > div.box_footer > button').addEventListener('click', function() {
							document.querySelector('a[href^="#customer"]').click();
						});
					}
				);
			});
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
			newButtons += `<span ${btnClass} title="Quote Last ${QUOTE_LENGTH} Notes"><span ${icoClass} id="hsus-quote"><i class="fad fa-quote-right"></i></span><span ${lblClass}>Quote ${QUOTE_LENGTH}</span></span>`;
			newButtons += `<span ${btnClass} title="Quote All Public Notes"><span ${icoClass} id="hsus-quote-all"><i class="fad fa-scroll"></i></span><span ${lblClass}>Quote All</span></span>`;
			newButtons += `<span ${btnClass} title="Clean Quoted Text"><span ${icoClass} id="hsus-clean"><i class="fad fa-recycle"></i></span><span ${lblClass}>Clean</span></span>`;
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
			$('#hsus-quote-all').click(function() {
				quotePublicHistory(true);
			});
			$('#hsus-clean').click(cleanBody);
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
		Object.keys(intervalFunctions).forEach(fn => setTimeout(function() {
			let result = intervalFunctions[fn].call();
			let incr = '?';
			if (result && result[0]) {
				incr = result[0];
				count += incr;
			}
			GM_log(`> > ${fn} updated ${incr} elements in ${result && result[1] ? result[1] : '?'}ms`);
		}), 0);
		let duration = new Date().getTime() - starttime;
		GM_log(`> intervalFunctions updated at least ${count} elements in ${duration}ms`);
	}

	function runOneTimeFunctions() {
		Object.keys(oneTimeFunctions).forEach(fn => GM_log('> > ' + fn + ' created event for ' + oneTimeFunctions[fn].call() + ' elements'));
	}

	main();

})();
