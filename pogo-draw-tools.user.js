// ==UserScript==
// @author       Lecnets
// @name         Pogo Draw Tools Extension
// @category     Draw
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

        // Plugin namespace
        window.plugin.pogoDrawTools = function(){};

        // Leaflet layers
        let regionLayer;
        let nearbyLayerGroup;

        const defaultSettings = {
            colors: {
                nearbyCircleBorder: {
                    color: '#000000',
                    opacity: 0.6
                },
                nearbyCircleFill: {
                    color: '#000000',
                    opacity: 0.4
                },
                marker: {
                    color: '#ff4713'
                }
            }
        };
        let settings = defaultSettings;

        /**
         * Create Default Icon
         */
        L.DivIcon.Wayfarer = L.DivIcon.extend({
            options: {
                iconSize: L.point(28, 61),
                iconAnchor: [14, 54],
                className: 'leaflet-div-icon-wayfarer-marker',
                svgTemplate: `<svg width="28px" height="61px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 61">
                                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                    <path d="M15.5093388,20.7281993 C14.9275251,20.9855232 14.2863961,21.1311947 13.6095035,21.1311947 C12.9326109,21.1311947 12.2914819,20.9855232 11.7096682,20.7281993 C10.0593063,19.997225 8.90701866,18.3486077 8.90701866,16.4278376 C8.90701866,13.8310471 11.012713,11.726225 13.6095035,11.726225 C16.206294,11.726225 18.3119883,13.8310471 18.3119883,16.4278376 C18.3119883,18.3486077 17.1597007,19.997225 15.5093388,20.7281993 M22.3271131,7.71022793 C17.5121036,2.89609069 9.70603111,2.89609069 4.89189387,7.71022793 C1.3713543,11.2307675 0.437137779,16.3484597 2.06482035,20.7281993 L2.05435293,20.7281993 L2.15379335,20.9820341 L2.20525812,21.113749 L11.1688519,44.0984412 L11.1758302,44.0984412 C11.5561462,45.0736551 12.4990855,45.7671211 13.6095035,45.7671211 C14.7190492,45.7671211 15.6619885,45.0736551 16.0431768,44.0984412 L16.0492828,44.0984412 L25.0128766,21.1163658 L25.0669582,20.9776726 L25.1637818,20.7281993 L25.1541867,20.7281993 C26.7818692,16.3484597 25.8476527,11.2307675 22.3271131,7.71022793 M13.6095035,50.6946553 C11.012713,50.6946553 8.90701866,52.7994774 8.90701866,55.3962679 C8.90701866,57.9939306 11.012713,60.099625 13.6095035,60.099625 C16.206294,60.099625 18.3119883,57.9939306 18.3119883,55.3962679 C18.3119883,52.7994774 16.206294,50.6946553 13.6095035,50.6946553" id="Fill-16" stroke="#FFFFFF" fill="{color}"></path>
                                </g>
                             </svg>`,
                color: '#FF4713'
            },
            initialize: function (color, options) {
                L.DivIcon.prototype.initialize.call(this, options);
                if (color) { this.options.color = color; }
                this.options.html = L.Util.template(
                    this.options.svgTemplate,
                    { color: this.options.color }
                );
            }
        });

        /**
         * Instantiates a Default Icon
         */
        L.divIcon.defaultSvg = function (color, options) {
            return new L.DivIcon.Wayfarer(color, options);
        };

        /**
         * Override marker icon from Draw Tools
         */
        window.plugin.drawTools.getMarkerIcon = function (color) {
            return L.divIcon.defaultSvg(color);
        }

        /**
         * Refresh Layer Groups over the map
         */
        function updateMapLayers() {
            // preconditions
            if (!map.hasLayer(regionLayer)) {
                return;
            }
            const zoom = map.getZoom();

            // Draw nearby circles on markers
            if (zoom > 16) {
                if (!regionLayer.hasLayer(nearbyLayerGroup)) {
                    regionLayer.addLayer(nearbyLayerGroup);
                }
                nearbyLayerGroup.bringToBack();
            } else if (regionLayer.hasLayer(nearbyLayerGroup)) {
                regionLayer.removeLayer(nearbyLayerGroup);
            }
        }

        /**
         * Used for override default Draw Tools marker icon
         */
        function setMarkerIcon(color) {
            window.plugin.drawTools.currentColor = color;
            window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(color);
            window.plugin.drawTools.markerOptions.icon = window.plugin.drawTools.currentMarker;

            plugin.drawTools.drawControl.setDrawingOptions({
                marker:   { icon:         plugin.drawTools.currentMarker },
            });
        }

        /**
         * Updates 20m circles
         */
        function refreshNearbyCircle() {
            removeNearbyCircle();

            window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
                if(layer instanceof L.Marker) {
                    addNearbyCircle(layer);
                }
            });
        }

        /**
         * Draw a 20m circle
         */
        function addNearbyCircle(marker) {
            const circleSettings = {
                color: settings.colors.nearbyCircleBorder.color,
                opacity: settings.colors.nearbyCircleBorder.opacity,
                fillColor: settings.colors.nearbyCircleFill.color,
                fillOpacity: settings.colors.nearbyCircleFill.opacity
            };

            const center = marker.getLatLng();
            const circle = L.circle(center, 20, circleSettings);
            nearbyLayerGroup.addLayer(circle);
            regionLayer.addLayer(nearbyLayerGroup);
        }

        /**
         * Removes the 20m circle
         */
        function removeNearbyCircle(guid) {
            nearbyLayerGroup.clearLayers();
        }

        const loadStyles = function(){
            $('<style>').html(`
                .leaflet-edit-marker-selected {
                    border-color: transparent;
                    background: none;
                }
            `).appendTo('head');
        }

        const boot = function(){
            window.plugin.drawTools.currentMarker = window.plugin.drawTools.getMarkerIcon(settings.colors.marker.color);
            setMarkerIcon(settings.colors.marker.color);

            regionLayer = L.layerGroup();
            window.addLayerGroup('Pogo Draw Tools Layer', regionLayer, true);
            // Used for draw circles on markers created from draw tools
            nearbyLayerGroup = L.featureGroup();

            map.on('draw:edited draw:editmove draw:editstop', function(e) {
                refreshNearbyCircle();
            });
            map.on('moveend', updateMapLayers);

            window.plugin.drawTools.drawnItems.on('layeradd layerremove', function(e) {
                refreshNearbyCircle();
            });

            refreshNearbyCircle();
            updateMapLayers();
        }

        const setup = function () {
            // Not run code, if draw tools plugin isn't installed
            if(!window.plugin.drawTools){ return; }
            loadStyles();
            boot();
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
