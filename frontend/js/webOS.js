/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
*/

(function(AppInfo, deviceInfo) {
    'use strict';

    console.log('WebOS adapter');

    // --- webOS 5 (Chromium 68) Intl time-zone shim ---
    // On webOS 5 the browser's ICU cannot resolve the default host time zone,
    // so any localized date/time call (Date.toLocale* / Intl.DateTimeFormat with
    // no explicit timeZone) throws:
    //   RangeError: Unsupported time zone specified undefined
    // That exception aborts jellyfin-web's item-detail render (getDisplayTime),
    // which is why playback/action buttons never appear. The OS UTC offset and
    // an explicit timeZone:'UTC' both work, so we render correct *local* time by
    // shifting the timestamp into UTC. The shim only activates when the default
    // zone is actually broken, so it is a no-op on normal browsers.
    (function () {
        var defaultTZBroken = false;
        try {
            new Date().toLocaleTimeString('en-US', { hour: 'numeric' });
        } catch (e) {
            defaultTZBroken = true;
        }
        if (!defaultTZBroken) {
            return;
        }
        console.log('WebOS adapter: applying Intl time-zone shim (host tz unresolved)');

        function assign(target, src) {
            if (src) {
                for (var k in src) {
                    if (Object.prototype.hasOwnProperty.call(src, k)) {
                        target[k] = src[k];
                    }
                }
            }
            return target;
        }
        // Returns a Date whose UTC fields equal this date's local wall-clock time,
        // so formatting it as UTC yields the correct local time string.
        function toWallClockUTC(d) {
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        }
        function withUTC(options) {
            return assign(assign({}, options), { timeZone: 'UTC' });
        }
        function hasTZ(options) {
            return options != null && options.timeZone != null;
        }

        function patchDateMethod(name) {
            var orig = Date.prototype[name];
            Date.prototype[name] = function (locales, options) {
                if (hasTZ(options)) {
                    return orig.call(this, locales, options);
                }
                return orig.call(toWallClockUTC(this), locales, withUTC(options));
            };
        }
        patchDateMethod('toLocaleTimeString');
        patchDateMethod('toLocaleDateString');
        patchDateMethod('toLocaleString');

        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            var OrigDTF = Intl.DateTimeFormat;
            var Patched = function DateTimeFormat(locales, options) {
                if (hasTZ(options)) {
                    return new OrigDTF(locales, options);
                }
                var f = new OrigDTF(locales, withUTC(options));
                var toDate = function (d) {
                    if (d == null) {
                        d = new Date();
                    } else if (!(d instanceof Date)) {
                        d = new Date(d);
                    }
                    return toWallClockUTC(d);
                };
                return {
                    format: function (d) { return f.format(toDate(d)); },
                    formatToParts: function (d) { return f.formatToParts(toDate(d)); },
                    resolvedOptions: function () { return f.resolvedOptions(); }
                };
            };
            Patched.prototype = OrigDTF.prototype;
            Patched.supportedLocalesOf = function (locales, options) {
                return OrigDTF.supportedLocalesOf(locales, options);
            };
            Intl.DateTimeFormat = Patched;
        }
    })();
    // --- END time-zone shim ---

    function postMessage(type, data) {
        window.top.postMessage({
            type: type,
            data: data
        }, '*');
    }

    // List of supported features
    var SupportedFeatures = [
        'exit',
        'externallinkdisplay',
        'htmlaudioautoplay',
        'htmlvideoautoplay',
        'imageanalysis',
        'physicalvolumecontrol',
        'displaylanguage',
        'otherapppromotions',
        'targetblank',
        'screensaver',
        'subtitleappearancesettings',
        'subtitleburnsettings',
        'chromecast',
        'multiserver'
    ];

    window.NativeShell = {
        AppHost: {
            init: function () {
                postMessage('AppHost.init', AppInfo);
                return Promise.resolve(AppInfo);
            },

            appName: function () {
                postMessage('AppHost.appName', AppInfo.appName);
                return AppInfo.appName;
            },

            appVersion: function () {
                postMessage('AppHost.appVersion', AppInfo.appVersion);
                return AppInfo.appVersion;
            },

            deviceId: function () {
                postMessage('AppHost.deviceId', AppInfo.deviceId);
                return AppInfo.deviceId;
            },

            deviceName: function () {
                postMessage('AppHost.deviceName', AppInfo.deviceName);
                return AppInfo.deviceName;
            },

            exit: function () {
                postMessage('AppHost.exit');
            },

            getDefaultLayout: function () {
                postMessage('AppHost.getDefaultLayout', 'tv');
                return 'tv';
            },

            getDeviceProfile: function (profileBuilder) {
                postMessage('AppHost.getDeviceProfile');
                return profileBuilder({
                    enableMkvProgressive: false,
                    enableSsaRender: true,
                    supportsDolbyAtmos: deviceInfo ? deviceInfo.dolbyAtmos : null,
                    supportsDolbyVision: deviceInfo ? deviceInfo.dolbyVision : null,
                    supportsHdr10: deviceInfo ? deviceInfo.hdr10 : null
                });
            },

            getSyncProfile: function (profileBuilder) {
                postMessage('AppHost.getSyncProfile');
                return profileBuilder({ enableMkvProgressive: false });
            },

            supports: function (command) {
                var isSupported = command && SupportedFeatures.indexOf(command.toLowerCase()) != -1;
                postMessage('AppHost.supports', {
                    command: command,
                    isSupported: isSupported
                });
                return isSupported;
            },

            screen: function () {
                return deviceInfo ? {
                    width: deviceInfo.screenWidth,
                    height: deviceInfo.screenHeight
                } : null;
            }
        },

        selectServer: function () {
            postMessage('selectServer');
        },

        downloadFile: function (url) {
            postMessage('downloadFile', { url: url });
        },

        enableFullscreen: function () {
            postMessage('enableFullscreen');
        },

        disableFullscreen: function () {
            postMessage('disableFullscreen');
        },

        getPlugins: function () {
            postMessage('getPlugins');
            return [];
        },

        openUrl: function (url, target) {
            postMessage('openUrl', {
                url: url,
                target: target
            });
        },

        updateMediaSession: function (mediaInfo) {
            postMessage('updateMediaSession', { mediaInfo: mediaInfo });
        },

        hideMediaSession: function () {
            postMessage('hideMediaSession');
        }
    };
})(window.AppInfo, window.DeviceInfo);
