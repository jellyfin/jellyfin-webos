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

    // YouTube's embedded player rejects playback inside this app (error 153,
    // "video player configuration error"), so hand YouTube URLs to the TV's
    // YouTube app instead. Registered via getPlugins(); plugin players take
    // priority over jellyfin-web's built-in youtubeplayer.
    function getYouTubeVideoId(url) {
        var match = /(?:[?&]v=|youtu\.be\/|\/embed\/|\/shorts\/)([\w-]{11})/.exec(url || '');
        return match ? match[1] : null;
    }

    function YouTubeAppPlayer(deps) {
        this.name = 'YouTube App Player';
        this.type = 'mediaplayer';
        this.id = 'youtubeappplayer';
        this.priority = 0;
        this.isLocalPlayer = true;
        this._events = deps.events;
        this._playbackManager = deps.playbackManager;
        this._currentSrc = null;
    }

    YouTubeAppPlayer.prototype.canPlayMediaType = function (mediaType) {
        mediaType = (mediaType || '').toLowerCase();
        return mediaType === 'audio' || mediaType === 'video';
    };

    YouTubeAppPlayer.prototype.canPlayItem = function () {
        // Does not play server items
        return false;
    };

    YouTubeAppPlayer.prototype.canPlayUrl = function (url) {
        return !!getYouTubeVideoId(url) && /youtube\.com|youtu\.be/i.test(url);
    };

    YouTubeAppPlayer.prototype.play = function (options) {
        var self = this;
        var videoId = getYouTubeVideoId(options.url);

        if (!videoId) {
            return Promise.reject('ErrorDefault');
        }

        self._currentSrc = options.url;
        postMessage('launchYouTube', { videoId: videoId });

        // Playback happens in another app: end this "session" right away and
        // stop the queue so the next trailer doesn't relaunch YouTube.
        setTimeout(function () {
            self._playbackManager.stop(self);
        }, 500);

        return Promise.resolve();
    };

    YouTubeAppPlayer.prototype.stop = function () {
        if (this._currentSrc) {
            var stopInfo = { src: this._currentSrc };
            this._currentSrc = null;
            this._events.trigger(this, 'stopped', [stopInfo]);
        }
        return Promise.resolve();
    };

    YouTubeAppPlayer.prototype.destroy = function () {};
    YouTubeAppPlayer.prototype.getDeviceProfile = function () { return Promise.resolve({}); };
    YouTubeAppPlayer.prototype.currentSrc = function () { return this._currentSrc; };
    YouTubeAppPlayer.prototype.setSubtitleStreamIndex = function () {};
    YouTubeAppPlayer.prototype.canSetAudioStreamIndex = function () { return false; };
    YouTubeAppPlayer.prototype.setAudioStreamIndex = function () {};
    YouTubeAppPlayer.prototype.currentTime = function () { return 0; };
    YouTubeAppPlayer.prototype.duration = function () { return null; };
    YouTubeAppPlayer.prototype.pause = function () {};
    YouTubeAppPlayer.prototype.unpause = function () {};
    YouTubeAppPlayer.prototype.paused = function () { return false; };
    YouTubeAppPlayer.prototype.volume = function () { return 100; };
    YouTubeAppPlayer.prototype.setVolume = function () {};
    YouTubeAppPlayer.prototype.getVolume = function () { return 100; };
    YouTubeAppPlayer.prototype.setMute = function () {};
    YouTubeAppPlayer.prototype.isMuted = function () { return false; };

    window.WebOSYouTubeAppPlayer = function () {
        return YouTubeAppPlayer;
    };

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
            return ['WebOSYouTubeAppPlayer'];
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
