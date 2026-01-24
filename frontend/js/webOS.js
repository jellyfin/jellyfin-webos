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
     * This method works across all webOS versions.
     * Returns object with detected capabilities.
     */
    function detectCodecSupport() {
        var video = document.createElement('video');
        var audio = document.createElement('audio');

        // Helper function - returns true if codec is supported
        function canPlay(element, type) {
            var result = element.canPlayType(type);
            return result === 'probably' || result === 'maybe';
        }

        // Video codec detection
        var videoCodecs = {
            // H.264/AVC - Multiple profiles
            h264: canPlay(video, 'video/mp4;codecs="avc1.42001e"') ||  // Baseline
                  canPlay(video, 'video/mp4;codecs="avc1.4d001f"') ||  // Main
                  canPlay(video, 'video/mp4;codecs="avc1.640028"'),    // High

            // H.265/HEVC - Main and Main10 profiles
            hevc: canPlay(video, 'video/mp4;codecs="hvc1.1.6.L93.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L120.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L150.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L153.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L156.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L180.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hvc1.1.6.L186.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L93.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L120.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L150.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L153.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L156.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L180.B0"') ||
                  canPlay(video, 'video/mp4;codecs="hev1.1.6.L186.B0"'),

            // HEVC Main10 (for HDR content)
            hevcMain10: canPlay(video, 'video/mp4;codecs="hvc1.2.4.L153.B0"') ||
                        canPlay(video, 'video/mp4;codecs="hev1.2.4.L153.B0"'),

            // VP8
            vp8: canPlay(video, 'video/webm;codecs="vp8"'),

            // VP9 - Profile 0 and Profile 2 (HDR)
            vp9: canPlay(video, 'video/webm;codecs="vp9"') ||
                 canPlay(video, 'video/webm;codecs="vp09.00.10.08"'),

            vp9Profile2: canPlay(video, 'video/webm;codecs="vp09.02.10.10"'),

            // AV1
            av1: canPlay(video, 'video/mp4;codecs="av01.0.00M.08"') ||
                 canPlay(video, 'video/mp4;codecs="av01.0.05M.08"') ||
                 canPlay(video, 'video/mp4;codecs="av01.0.12M.08"') ||
                 canPlay(video, 'video/mp4;codecs="av01.0.15M.10"') ||
                 canPlay(video, 'video/webm;codecs="av01.0.05M.08"'),

            // MPEG-2
            mpeg2: canPlay(video, 'video/mp2t;codecs="mp2v"') ||
                   canPlay(video, 'video/mpeg'),

            // VC-1 (rarely supported in browsers)
            vc1: canPlay(video, 'video/mp4;codecs="vc-1"') ||
                 canPlay(video, 'video/ogg;codecs="vc-1"')
        };

        // Audio codec detection
        var audioCodecs = {
            // AAC variants
            aac: canPlay(audio, 'audio/mp4;codecs="mp4a.40.2"'),      // AAC-LC
            aacHe: canPlay(audio, 'audio/mp4;codecs="mp4a.40.5"'),    // HE-AAC
            aacHev2: canPlay(audio, 'audio/mp4;codecs="mp4a.40.29"'), // HE-AAC v2

            // Dolby Digital (AC-3)
            ac3: canPlay(audio, 'audio/mp4;codecs="ac-3"') ||
                 canPlay(video, 'video/mp4;codecs="avc1.640028,ac-3"'),

            // Dolby Digital Plus (E-AC-3)
            eac3: canPlay(audio, 'audio/mp4;codecs="ec-3"') ||
                  canPlay(video, 'video/mp4;codecs="avc1.640028,ec-3"'),

            // Dolby TrueHD (rarely supported via HTML5)
            trueHd: canPlay(audio, 'audio/mp4;codecs="mlpa"') ||
                    canPlay(audio, 'audio/truehd'),

            // DTS variants
            dts: canPlay(audio, 'audio/mp4;codecs="dtsc"') ||
                 canPlay(audio, 'audio/mp4;codecs="dtsh"') ||
                 canPlay(audio, 'audio/mp4;codecs="dtse"') ||
                 canPlay(audio, 'audio/vnd.dts'),

            dtsHd: canPlay(audio, 'audio/mp4;codecs="dtsh"') ||
                   canPlay(audio, 'audio/vnd.dts.hd'),

            // MP3
            mp3: canPlay(audio, 'audio/mpeg') ||
                 canPlay(audio, 'audio/mp3'),

            // Opus
            opus: canPlay(audio, 'audio/ogg;codecs="opus"') ||
                  canPlay(audio, 'audio/webm;codecs="opus"') ||
                  canPlay(audio, 'audio/mp4;codecs="opus"'),

            // Vorbis
            vorbis: canPlay(audio, 'audio/ogg;codecs="vorbis"') ||
                    canPlay(audio, 'audio/webm;codecs="vorbis"'),

            // FLAC
            flac: canPlay(audio, 'audio/flac') ||
                  canPlay(audio, 'audio/ogg;codecs="flac"') ||
                  canPlay(audio, 'audio/mp4;codecs="flac"'),

            // ALAC (Apple Lossless)
            alac: canPlay(audio, 'audio/mp4;codecs="alac"'),

            // PCM/WAV
            pcm: canPlay(audio, 'audio/wav') ||
                 canPlay(audio, 'audio/wave')
        };

        // Container format detection
        var containers = {
            mp4: canPlay(video, 'video/mp4'),
            webm: canPlay(video, 'video/webm'),
            mkv: canPlay(video, 'video/x-matroska') ||
                 canPlay(video, 'video/webm'), // MKV often works if WebM does
            hls: canPlay(video, 'application/vnd.apple.mpegurl') ||
                 canPlay(video, 'application/x-mpegURL'),
            ts: canPlay(video, 'video/mp2t'),
            avi: canPlay(video, 'video/x-msvideo'),
            ogg: canPlay(video, 'video/ogg')
        };

        return {
            video: videoCodecs,
            audio: audioCodecs,
            containers: containers
        };
    }

    /**
     * Advanced codec detection using MediaCapabilities API (Chrome 66+)
     * Provides more accurate results including smooth/power-efficient info.
     * Falls back to canPlayType if MediaCapabilities is not available.
     */
    function detectCodecSupportAdvanced(callback) {
        // Check if MediaCapabilities API is available
        if (!('mediaCapabilities' in navigator)) {
            console.log('MediaCapabilities API not available, using canPlayType fallback');
            callback(null);
            return;
        }

        var tests = [
            // HEVC 4K
            { name: 'hevc4k', config: {
                type: 'file',
                video: { contentType: 'video/mp4;codecs="hvc1.1.6.L150.B0"',
                         width: 3840, height: 2160, bitrate: 20000000, framerate: 30 }
            }},
            // HEVC 4K60
            { name: 'hevc4k60', config: {
                type: 'file',
                video: { contentType: 'video/mp4;codecs="hvc1.1.6.L153.B0"',
                         width: 3840, height: 2160, bitrate: 40000000, framerate: 60 }
            }},
            // HEVC 1080p
            { name: 'hevc1080p', config: {
                type: 'file',
                video: { contentType: 'video/mp4;codecs="hvc1.1.6.L120.B0"',
                         width: 1920, height: 1080, bitrate: 10000000, framerate: 30 }
            }},
            // VP9 4K
            { name: 'vp94k', config: {
                type: 'file',
                video: { contentType: 'video/webm;codecs="vp09.00.50.08"',
                         width: 3840, height: 2160, bitrate: 20000000, framerate: 30 }
            }},
            // AV1 4K
            { name: 'av14k', config: {
                type: 'file',
                video: { contentType: 'video/mp4;codecs="av01.0.12M.08"',
                         width: 3840, height: 2160, bitrate: 20000000, framerate: 30 }
            }},
            // H.264 4K (rare but some TVs support it)
            { name: 'h2644k', config: {
                type: 'file',
                video: { contentType: 'video/mp4;codecs="avc1.640033"',
                         width: 3840, height: 2160, bitrate: 40000000, framerate: 30 }
            }}
        ];

        var results = {};
        var completed = 0;

        tests.forEach(function(test) {
            navigator.mediaCapabilities.decodingInfo(test.config)
                .then(function(result) {
                    results[test.name] = {
                        supported: result.supported,
                        smooth: result.smooth,
                        powerEfficient: result.powerEfficient
                    };
                })
                .catch(function() {
                    results[test.name] = { supported: false, smooth: false, powerEfficient: false };
                })
                .finally(function() {
                    completed++;
                    if (completed === tests.length) {
                        callback(results);
                    }
                });
        });
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
                var profile = {
                    // Container/streaming options
                    enableMkvProgressive: false,
                    enableHls: true,

                    // Subtitle support
                    enableSsaRender: true,

                    // HDR support (from webOS deviceInfo)
                    supportsHdr10: deviceInfo ? !!deviceInfo.hdr10 : false,
                    supportsDolbyVision: deviceInfo ? !!deviceInfo.dolbyVision : false,
                    supportsHlg: deviceInfo ? !!deviceInfo.hdr10 : false, // HLG typically available with HDR10

                    // Video codec support (dynamically detected)
                    supportsHevc: codecSupport.video.hevc || codecSupport.video.hevcMain10,

                    // Audio support
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
