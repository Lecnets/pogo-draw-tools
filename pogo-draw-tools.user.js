// ==UserScript==
// @id           pogodrawtools@lecnets
// @name         Pogo Draw Tools Extension
// @category     Draw
// @namespace    https://github.com/Lecnets/pogo-draw-tools
// @downloadURL  https://raw.githubusercontent.com/Lecnets/pogo-draw-tools/master/pogo-draw-tools.user.js
// @homepageURL  https://github.com/Lecnets/pogo-draw-tools
// @version      0.1.1
// @description  Based on Draw Tools ITC-CE Plugin, but adapted for Pogo
// @author       Lecnets
// @match        https://intel.ingress.com/*
// @grant        none
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */
/* globals L, map */
/* globals GM_info, $, dialog */

;(function () { // eslint-disable-line no-extra-semi

    function wrapper(plugin_info) {
        'use strict';

        // ensure plugin framework is there, even if iitc is not yet loaded
        if(typeof window.plugin !== 'function') window.plugin = function() {};

        // Plugin namespace
        window.plugin.pogoDrawTools = function(){};

        // Used for wait default draw tools to be loaded, before run customized codes
        let onDTLoaded = (callback, interval = 250, maxWaitDuration = 10000) => {
            const pluginInterval = setInterval(() => {
                // Do not load code, if Draw Tools Plugin isn't loaded
                if(window.plugin.drawTools === undefined && window.plugin.drawTools.boot === undefined) return;
                // If Object does exist, clear the interval, and run the callback function.
                clearInterval(pluginInterval)
                callback()
            }, interval)

            // Timeout the checking process after the specified max time.
            setTimeout(() => clearInterval(pluginInterval), maxWaitDuration)
        };

        // Run Pogo Draw Tools only when Draw Tools has finished
        onDTLoaded(() => {
            // Leaflet layers
            let regionNearbyLayer;
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
             * Last OSM Update: 2019-01-22
             */
            const nestTags = {
                confirmed: {
                    leisure: [
                        'park',
                        'recreation_ground',
                        'pitch',
                        'garden',
                        'golf_course',
                        'playground'
                    ],
                    landuse: [
                        'recreation_ground',
                        'meadow',
                        'grass',
                        'greenfield',
                        'farmyard'
                    ],
                    natural: [
                        'scrub',
                        'heath',
                        'grassland'
                    ]
                },
                unconfirmed: {
                    leisure: [
                        'nature_reserve'
                    ],
                    landuse: [
                        'farmland',
                        'orchard',
                        'vineyard'
                    ],
                    natural: [
                        'plateau',
                        'moor'
                    ]
                }
            };

            /**
             * Change default drawn style
             */
            window.plugin.pogoDrawTools.setOptions = function() {
                window.plugin.drawTools.lineOptions = {
                    weight: 2,
                    opacity: 0.7,
                };

                window.plugin.drawTools.polygonOptions = L.extend({}, window.plugin.drawTools.lineOptions, {
                    fillOpacity: 0.3,
                });
            }

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
            L.divIcon.wayfarerSvg = function (color, options) {
                return new L.DivIcon.Wayfarer(color, options);
            };

            /**
             * Override marker icon from Draw Tools
             */
            window.plugin.drawTools.getMarkerIcon = function (color) {
                return L.divIcon.wayfarerSvg(color);
            }

            /**
             * Refresh Layer Groups over the map
             */
            function updateMapLayers() {
                // preconditions
                if (!map.hasLayer(regionNearbyLayer)) {
                    return;
                }
                const zoom = map.getZoom();

                // Draw nearby circles on markers
                if (zoom > 16) {
                    if (!regionNearbyLayer.hasLayer(nearbyLayerGroup)) {
                        regionNearbyLayer.addLayer(nearbyLayerGroup);
                    }
                    nearbyLayerGroup.bringToBack();
                } else if (regionNearbyLayer.hasLayer(nearbyLayerGroup)) {
                    regionNearbyLayer.removeLayer(nearbyLayerGroup);
                }
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
                    fillOpacity: settings.colors.nearbyCircleFill.opacity,
                    weight: 1,
                    clickable: false,
                    interactive: false
                };

                const center = marker.getLatLng();
                const circle = L.circle(center, 20, circleSettings);
                nearbyLayerGroup.addLayer(circle);
                regionNearbyLayer.addLayer(nearbyLayerGroup);
            }

            /**
             * Removes the 20m circle
             */
            function removeNearbyCircle(guid) {
                nearbyLayerGroup.clearLayers();
            }

            /**
             * Used for rewrite icons from loaded markers by Draw Tools
             */
            function updateLoadedMarkers() {
                // Reset all loaded markers
                window.plugin.drawTools.drawnItems.clearLayers();
                window.plugin.drawTools.load();

                window.plugin.drawTools.drawnItems.eachLayer(function (layer) {
                    if(layer instanceof L.Marker) {
                        // Add nearby circle into loaded markers
                        addNearbyCircle(layer);
                    }
                });
            }

            /**
             * Load Pogo Draw Tools menu options
             */
            window.plugin.pogoDrawTools.manualOpt = function(){
                let mergeStatusCheck = '';
                if(!window.plugin.drawTools.merge.status){
                  mergeStatusCheck = 'checked';
                }

                // Prepare Menu Options
                const html = '<div class="pogoDrawToolsSetbox">'
                           + '<a onclick="window.plugin.pogoDrawTools.optImportGJ();return false;" tabindex="0">Import GeoJson Items</a>'
                           + '<center><label><input type="checkbox" '+mergeStatusCheck+' name="merge" '
                           + 'onchange="window.plugin.drawTools.merge.toggle();return false;" />Reset draws before import</label></center>'
                           + '</div>';

                dialog({
                    html: html,
                    id: 'plugin-pogoDrawTools-options',
                    dialogClass: 'ui-dialog-pogoDrawToolsSet',
                    title: 'Pogo Draw Tools Options'
                });
            }

            window.plugin.pogoDrawTools.optAlert = function(message) {
                $('.ui-dialog-pogoDrawToolsSet .ui-dialog-buttonset').prepend('<p class="pogoDrawTools-alert" style="float:left;margin-top:4px;">'+message+'</p>');
                $('.pogoDrawTools-alert').delay(2500).fadeOut();
            }

            /**
             * Get color based on OSM tags, that defines if a polygon is a nest/EX
             */
            function getColorByTag(properties){
                if(properties.leisure !== undefined && nestTags.confirmed.leisure.includes(properties.leisure) || properties.landuse !== undefined && nestTags.confirmed.landuse.includes(properties.landuse) || properties.natural !== undefined && nestTags.confirmed.natural.includes(properties.natural)) {
                    // return color blue, if current polygon is confirmed nest
                    return 'blue';
                } else if(properties.leisure !== undefined && nestTags.unconfirmed.leisure.includes(properties.leisure) || properties.landuse !== undefined && nestTags.unconfirmed.landuse.includes(properties.landuse) || properties.natural !== undefined && nestTags.unconfirmed.natural.includes(properties.natural)) {
                    // return color gray, if current polygon is unconfirmed nest
                    return 'gray';
                }
                // return default color
                return window.plugin.drawTools.currentColor;
            }

            /**
             * Generates draw tools data using GeoJson structure
             */
            function prepareGeoJsonFile(data){
                // Used for generate Draw Tools data
                let drawData = [];
                // Used later for Polygon and Polyline Geometries
                let coordinates;

                loopItems:
                for (let i = 0; i < data.features.length; i++) {
                    let drawItem = {};

                    switch (data.features[i].geometry.type) {
                        case 'Point':
                            drawItem = {
                                type: 'marker',
                                latLng: {
                                    lat: data.features[i].geometry.coordinates[1],
                                    lng: data.features[i].geometry.coordinates[0]
                                },
                                color: settings.colors.marker.color
                            };
                            drawData.push(drawItem);
                            continue loopItems;
                        case 'Polygon':
                            coordinates = data.features[i].geometry.coordinates[0];
                            drawItem.type = 'polygon';
                            drawItem.color = getColorByTag(data.features[i].properties);
                            break;
                        case 'LineString':
                            coordinates = data.features[i].geometry.coordinates;
                            drawItem.type = 'polyline';
                            drawItem.color = window.plugin.drawTools.currentColor;
                            break;
                        default:
                            throw "Invalid geometry type: " + data.features[i].geometry.type;
                    }

                    drawItem.latLngs = [];
                    for (let j = 0; j < coordinates.length; j++) {
                        drawItem.latLngs.push({
                            lat: coordinates[j][1],
                            lng: coordinates[j][0]
                        });
                    }
                    drawData.push(drawItem);
                }
                return drawData;
            }

            /**
             * Load GeoJson data into map
             */
            window.plugin.pogoDrawTools.optImportGJ = function() {
                L.FileListLoader.loadFiles({accept:'application/geo+json'}).on('load',function (e) {
                    const extension = e.file.name.split('.')[1];
                    if(extension == 'geojson') {
                        try {
                            let data = prepareGeoJsonFile(JSON.parse(e.reader.result));

                            if (!window.plugin.drawTools.merge.status) {
                                window.plugin.drawTools.drawnItems.clearLayers();
                            }
                            window.plugin.drawTools.import(data);
                            console.log('Pogo Draw Tools: '+(window.plugin.drawTools.merge.status?'':'reset and ')+'imported drawn items');
                            window.plugin.pogoDrawTools.optAlert('Import Successful.');

                            // to write back the data to localStorage
                            window.plugin.drawTools.save();
                        } catch(e) {
                            console.warn('Pogo Draw Tools: failed to import data: ' + e);
                            window.plugin.pogoDrawTools.optAlert('<span style="color: #f88">Import failed</span>');
                        }

                    } else {
                        window.plugin.pogoDrawTools.optAlert('<span style="color: #f88">Invalid extension. Only files with .geojson extension are allowed</span>');
                    }
                });
            }

            /**
             * Add Styles and Pogo Draw Tools Opt
             */
            const loadElements = function(){
                // Create Pogo Draw Tools Menu Options
                $('#toolbox').append('<a onclick="window.plugin.pogoDrawTools.manualOpt();return false;" title="Pogo Draw Tools Options">Pogo DrawTools Opt</a>');

                // Css Styles
                $('<style>').html(`
                    .leaflet-edit-marker-selected {
                        border-color: transparent;
                        background: none;
                    }
                    .pogoDrawToolsSetbox > a {
                        display:block;
                        color:#ffce00;
                        border:1px solid #ffce00;
                        padding:3px 0; margin:10px auto;
                        width:80%;
                        text-align:center;
                        background:rgba(8,48,78,.9);
                    }
                `).appendTo('head');
            }

            const boot = function(){
                window.plugin.pogoDrawTools.setOptions();
                window.plugin.drawTools.setDrawColor(settings.colors.marker.color);

                regionNearbyLayer = L.layerGroup();
                window.addLayerGroup('Drawn 20m Radius', regionNearbyLayer, true);
                // Used for draw circles on markers created from draw tools
                nearbyLayerGroup = L.featureGroup();

                updateLoadedMarkers();

                map.on('draw:edited draw:editmove draw:editstop', function(e) {
                    refreshNearbyCircle();
                });
                map.on('moveend', updateMapLayers);

                window.plugin.drawTools.drawnItems.on('layeradd layerremove', function(e) {
                    refreshNearbyCircle();
                });

                updateMapLayers();
            }

            const setup = function () {
                loadElements();
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
        });
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
