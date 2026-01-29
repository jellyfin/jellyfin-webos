/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Enhanced with dynamic codec detection for proper capability reporting
 * to Jellyfin server, reducing unnecessary transcoding.
 */

(function(AppInfo, deviceInfo) {
    'use strict';

    console.log('WebOS adapter (enhanced codec detection)');

    function postMessage(type, data) {
        window.top.postMessage({
            type: type,
            data: data
        }, '*');
    }

    /**
     * Detect codec support using HTMLMediaElement.canPlayType()
     * This method works across all webOS versions (Chrome 38+).
     *
     * We only detect codecs that:
     * 1. Jellyfin's profile builder can't reliably detect (HEVC with various codec strings)
     * 2. Are hardware-dependent and may not report correctly via canPlayType (DTS, TrueHD)
     * 3. Are needed to determine audio channel capabilities (AC3, EAC3 for 5.1)
     *
     * We do NOT detect these codecs because Jellyfin's profile builder already
     * detects them reliably using canPlayType():
     * - H.264/AVC (universally supported, Jellyfin assumes available)
     * - VP8, VP9, AV1 (detected by Jellyfin's canPlayVp8/canPlayVp9/canPlayAv1)
     * - AAC, MP3, Opus, Vorbis, FLAC (detected by Jellyfin internally)
     */
    function detectCodecSupport() {
        var video = document.createElement('video');
        var audio = document.createElement('audio');

        // Helper function - returns true if codec is supported
        function canPlay(element, type) {
            var result = element.canPlayType(type);
            return result === 'probably' || result === 'maybe';
        }

        // HEVC detection - test multiple codec strings because some devices
        // only recognize specific formats (hvc1 vs hev1, different levels)
        var videoCodecs = {
            hevc: canPlay(video, 'video/mp4;codecs="hvc1.1.6.L93.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L120.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L150.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L153.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L93.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L120.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L150.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L153.B0"'),

            // HEVC Main10 profile (required for HDR content)
            hevcMain10: canPlay(video, 'video/mp4;codecs="hvc1.2.4.L153.B0"') ||
                        canPlay(video, 'video/mp4;codecs="hev1.2.4.L153.B0"')
        };

        // Audio codecs - focus on hardware-dependent codecs and surround sound
        var audioCodecs = {
            // Dolby Digital (AC-3) - needed for 5.1 channel detection
            ac3: canPlay(audio, 'audio/mp4;codecs="ac-3"') ||
                 canPlay(video, 'video/mp4;codecs="avc1.640028,ac-3"'),

            // Dolby Digital Plus (E-AC-3) - needed for 5.1/7.1 channel detection
            eac3: canPlay(audio, 'audio/mp4;codecs="ec-3"') ||
                  canPlay(video, 'video/mp4;codecs="avc1.640028,ec-3"'),

            // Dolby TrueHD - hardware dependent, canPlayType may not detect reliably
            trueHd: canPlay(audio, 'audio/mp4;codecs="mlpa"') ||
                    canPlay(audio, 'audio/truehd'),

            // DTS - hardware dependent, often requires specific decoder support
            dts: canPlay(audio, 'audio/mp4;codecs="dtsc"') ||
                 canPlay(audio, 'audio/mp4;codecs="dtsh"') ||
                 canPlay(audio, 'audio/mp4;codecs="dtse"') ||
                 canPlay(audio, 'audio/vnd.dts'),

            // DTS-HD - high-quality DTS variant
            dtsHd: canPlay(audio, 'audio/mp4;codecs="dtsh"') ||
                   canPlay(audio, 'audio/vnd.dts.hd'),

            // MP3 - needed for supportsMp2VideoAudio flag
            mp3: canPlay(audio, 'audio/mpeg') ||
                 canPlay(audio, 'audio/mp3')
        };

        return {
            video: videoCodecs,
            audio: audioCodecs
        };
    }

    /**
     * Determine maximum supported video width based on deviceInfo and codec tests
     */
    function getMaxVideoWidth(codecSupport) {
        // First check webOS deviceInfo for display capabilities
        if (deviceInfo) {
            if (deviceInfo.uhd8K) {
                return 7680; // 8K
            }
            if (deviceInfo.uhd) {
                return 3840; // 4K
            }
        }

        // Fallback: check screen dimensions
        if (deviceInfo && deviceInfo.screenWidth) {
            if (deviceInfo.screenWidth >= 7680) return 7680;
            if (deviceInfo.screenWidth >= 3840) return 3840;
            if (deviceInfo.screenWidth >= 1920) return 1920;
        }

        // Default to 1080p if we can't determine
        return 1920;
    }

    /**
     * Determine maximum audio channels based on capabilities
     */
    function getMaxAudioChannels(codecSupport) {
        // Dolby Atmos supports up to 7.1.4 (effectively 8 channels in container)
        if (deviceInfo && deviceInfo.dolbyAtmos) {
            return 8;
        }

        // If we have E-AC3 or AC3, assume 5.1 support
        if (codecSupport && codecSupport.audio) {
            if (codecSupport.audio.eac3 || codecSupport.audio.ac3) {
                return 6; // 5.1
            }
        }

        // Default to stereo
        return 2;
    }

    // Cache codec detection results
    var cachedCodecSupport = null;

    function getCodecSupport() {
        if (!cachedCodecSupport) {
            cachedCodecSupport = detectCodecSupport();
            console.log('Detected codec support:', JSON.stringify(cachedCodecSupport, null, 2));
        }
        return cachedCodecSupport;
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
                // Pre-cache codec detection on init
                getCodecSupport();
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

                // Get dynamically detected codec support
                var codecSupport = getCodecSupport();
                var maxWidth = getMaxVideoWidth(codecSupport);
                var maxChannels = getMaxAudioChannels(codecSupport);

                // Build comprehensive device profile
                // Note: Video codecs like VP9, AV1, H.264 are detected by Jellyfin's
                // profile builder internally using canPlayType(), so we don't need
                // to report them explicitly. We only report capabilities that
                // Jellyfin can't detect on its own (HEVC, HDR, Atmos, DTS, etc.)
                var profile = {
                    // Container/streaming options
                    enableMkvProgressive: false,
                    enableHls: true,

                    // Subtitle support
                    enableSsaRender: true,

                    // HDR support (from webOS deviceInfo - not detectable via canPlayType)
                    supportsHdr10: deviceInfo ? !!deviceInfo.hdr10 : false,
                    supportsDolbyVision: deviceInfo ? !!deviceInfo.dolbyVision : false,
                    supportsHlg: deviceInfo ? !!deviceInfo.hlg : false,

                    // HEVC support (Jellyfin's detection may miss some codec strings)
                    supportsHevc: codecSupport.video.hevc || codecSupport.video.hevcMain10,

                    // Audio support (from deviceInfo and codec detection)
                    supportsDolbyAtmos: deviceInfo ? !!deviceInfo.dolbyAtmos : false,
                    supportsTrueHd: codecSupport.audio.trueHd ||
                                    (codecSupport.audio.eac3 && deviceInfo && deviceInfo.dolbyAtmos),
                    supportsDts: codecSupport.audio.dts || codecSupport.audio.dtsHd,
                    supportsMp2VideoAudio: codecSupport.audio.mp3,

                    // Resolution and channels
                    maxVideoWidth: maxWidth,
                    audioChannels: maxChannels
                };

                // Log the profile being sent
                console.log('Device profile:', JSON.stringify(profile, null, 2));
                postMessage('AppHost.deviceProfile', profile);

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
            },

            // Expose codec detection for debugging
            getCodecSupport: function () {
                return getCodecSupport();
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
