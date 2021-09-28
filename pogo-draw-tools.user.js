// ==UserScript==
// @author       Lecnets
// @name         Pogo Draw Tools Extension
// @category     Layer
// @namespace    https://github.com/Lecnets/pogo-draw-tools
// @downloadURL  https://raw.githubusercontent.com/Lecnets/pogo-draw-tools/master/pogo-draw-tools.user.js
// @homepageURL  https://github.com/Lecnets/pogo-draw-tools
// @version      0.1.0
// @description  Extension that render draw tools marker as wayfarer icons, with 20m radius
// @match        https://intel.ingress.com/*
// @grant        none
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */
/* globals L, map */
/* globals GM_info, $ */

;(function () { // eslint-disable-line no-extra-semi

	function wrapper(plugin_info) {
		'use strict';

        const setup = function () {

        }

		setup.info = plugin_info; //add the script info data to the function as a property
		// if IITC has already booted, immediately run the 'setup' function
		if (window.iitcLoaded) {
			setup();
		} else {
			if (!window.bootPlugins) {
				window.bootPlugins = [];
			}
			window.bootPlugins.push(setup);
		}
	}

	const plugin_info = {};
	if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
		plugin_info.script = {
			version: GM_info.script.version,
			name: GM_info.script.name,
			description: GM_info.script.description
		};
	}

	// Greasemonkey. It will be quite hard to debug
	if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
		// inject code into site context
		const script = document.createElement('script');
		script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
		(document.body || document.head || document.documentElement).appendChild(script);
	} else {
		// Tampermonkey, run code directly
		wrapper(plugin_info);
	}
})();
