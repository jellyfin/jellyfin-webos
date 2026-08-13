/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
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

    // jellyfin-web (served by the connected server, not bundled here) excludes
    // MKV from the Dolby Vision HEVC codec profile on webOS unless it detects
    // webOS 25+ - support for that was only added upstream in jellyfin-web
    // PR #7328, which isn't in any stable server release yet. That leaves
    // DV-in-MKV files being needlessly transcoded on webOS 25 TVs (2025
    // C/G-series) even though they can direct play them. Patch the returned
    // profile so those containers aren't excluded, mirroring the upstream fix,
    // gated to webOS 25+ so older TVs keep the original (safe) restriction.
    // See https://github.com/jellyfin/jellyfin-web/issues/8165
    function getWebOSChromeVersion() {
        var match = navigator.userAgent.match(/Chrome\/(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
    }

    function isWebOS25OrNewer() {
        return getWebOSChromeVersion() >= 120;
    }

    function allowDolbyVisionInMkv(profile) {
        if (!deviceInfo || !deviceInfo.dolbyVision || !isWebOS25OrNewer()) {
            return;
        }
        if (!profile || !Array.isArray(profile.CodecProfiles)) {
            return;
        }

        profile.CodecProfiles.forEach(function (codecProfile) {
            var isHevcVideoProfile = codecProfile.Type === 'Video'
                && typeof codecProfile.Codec === 'string'
                && codecProfile.Codec.split(',').indexOf('hevc') !== -1;
            var isContainerExclusion = typeof codecProfile.Container === 'string'
                && codecProfile.Container.charAt(0) === '-';

            if (!isHevcVideoProfile || !isContainerExclusion) {
                return;
            }

            var excludedContainers = codecProfile.Container.substring(1).split(',');
            if (excludedContainers.indexOf('mkv') === -1) {
                excludedContainers.push('mkv');
                codecProfile.Container = '-' + excludedContainers.join(',');
            }
        });
    }

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
                var profile = profileBuilder({
                    enableMkvProgressive: false,
                    enableSsaRender: true,
                    supportsDolbyAtmos: deviceInfo ? deviceInfo.dolbyAtmos : null,
                    supportsDolbyVision: deviceInfo ? deviceInfo.dolbyVision : null,
                    supportsHdr10: deviceInfo ? deviceInfo.hdr10 : null
                });

                allowDolbyVisionInMkv(profile);

                return profile;
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
