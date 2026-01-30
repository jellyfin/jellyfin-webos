/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

(function(AppInfo, deviceInfo) {
    'use strict';

    console.log('WebOS adapter');

    function postMessage(type, data) {
        window.top.postMessage({
            type: type,
            data: data
        }, '*');
    }

    /**
     * Detect audio codec support for codecs that jellyfin-web
     * doesn't auto-detect reliably on webOS.
     */
    function detectAudioCodecs() {
        var audio = document.createElement('audio');

        function canPlay(type) {
            var result = audio.canPlayType(type);
            return result === 'probably' || result === 'maybe';
        }

        return {
            // DTS - hardware dependent, jellyfin-web may not detect on older webOS
            dts: canPlay('audio/mp4; codecs="dtsc"') ||
                 canPlay('audio/mp4; codecs="dtsh"') ||
                 canPlay('audio/vnd.dts'),

            // TrueHD - not auto-detected by jellyfin-web
            trueHd: canPlay('audio/mp4; codecs="mlpa"') ||
                    canPlay('audio/truehd'),

            // AC3/EAC3 - for determining surround sound capability
            ac3: canPlay('audio/mp4; codecs="ac-3"'),
            eac3: canPlay('audio/mp4; codecs="ec-3"')
        };
    }

    /**
     * Determine maximum video width from deviceInfo
     */
    function getMaxVideoWidth() {
        if (deviceInfo) {
            if (deviceInfo.uhd8K) return 7680;
            if (deviceInfo.uhd) return 3840;
            if (deviceInfo.screenWidth >= 3840) return 3840;
        }
        return 1920; // Default to 1080p
    }

    /**
     * Determine maximum audio channels based on device capabilities
     */
    function getMaxAudioChannels(audioCodecs) {
        // Dolby Atmos supports up to 7.1.4
        if (deviceInfo && deviceInfo.dolbyAtmos) {
            return 8;
        }
        // AC3/EAC3 means 5.1 support
        if (audioCodecs.eac3 || audioCodecs.ac3) {
            return 6;
        }
        return 2; // Stereo
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

                // Detect audio codecs that jellyfin-web doesn't auto-detect
                var audioCodecs = detectAudioCodecs();

                var profile = {
                    enableMkvProgressive: false,
                    enableSsaRender: true,

                    // Dolby Vision - webOS defaults to false, need deviceInfo
                    supportsDolbyVision: deviceInfo && deviceInfo.dolbyVision ? true : undefined,

                    // DTS - helps older webOS where auto-detect may fail
                    supportsDts: audioCodecs.dts ? true : undefined,

                    // TrueHD - not auto-detected by jellyfin-web
                    supportsTrueHd: audioCodecs.trueHd ? true : undefined,

                    // Resolution and channels - helps server make decisions
                    maxVideoWidth: getMaxVideoWidth(),
                    audioChannels: getMaxAudioChannels(audioCodecs)
                };

                console.log('Device profile:', JSON.stringify(profile, null, 2));
                return profileBuilder(profile);
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
