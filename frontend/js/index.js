/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
*/

var curr_req = false;
var server_info = false;
var manifest = false;

var appInfo = {
    deviceId: null,
    deviceName: 'LG Smart TV',
    appName: 'Jellyfin for WebOS',
    appVersion: '0.0.0'
};

var deviceInfo;
webOS.deviceInfo(function (info) {
    deviceInfo = info;
});

//Adds .includes to string to do substring matching
if (!String.prototype.includes) {
  String.prototype.includes = function(search, start) {
    'use strict';

    if (search instanceof RegExp) {
      throw TypeError('first argument must not be a RegExp');
    }
    if (start === undefined) { start = 0; }
    return this.indexOf(search, start) !== -1;
  };
}


function isVisible(element) {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
}

function findIndex(array, currentNode) {
    //This just implements the following function which is not available on some LG TVs
    //Array.from(allElements).findIndex(function (el) { return currentNode.isEqualNode(el); })
    for (var i = 0, item; item = array[i]; i++) {
        if (currentNode.isEqualNode(item))
            return i;
    }
}

function navigate(amount) {
    console.log("Navigating " + amount.toString() + "...")
    var element = document.activeElement;
    if (element === null) {
        navigationInit();
    } else if (!isVisible(element) || element.tagName == 'BODY') {
        navigationInit();
    } else {
        //Isolate the node that we're after
        const currentNode = element;

        //find all tab-able elements
        const allElements = document.querySelectorAll('input, button, a, area, object, select, textarea, [contenteditable]');

        //Find the current tab index.
        const currentIndex = findIndex(allElements, currentNode);

        //focus the following element
        if (allElements[currentIndex + amount])
            allElements[currentIndex + amount].focus();
    }
}


function upArrowPressed() {
    navigate(-1);
}

function downArrowPressed() {
    navigate(1);
}
function leftArrowPressed() {
    // Your stuff here
}

function rightArrowPressed() {
    // Your stuff here
}

function backPressed() {
    webOS.platformBack();
}

document.onkeydown = function (evt) {
    evt = evt || window.event;
    switch (evt.keyCode) {
        case 37:
            leftArrowPressed();
            break;
        case 39:
            rightArrowPressed();
            break;
        case 38:
            upArrowPressed();
            break;
        case 40:
            downArrowPressed();
            break;
        case 461: // Back
            backPressed();
            break;
    }
};

function handleCheckbox(elem, evt) {
    console.log(elem);
    if (evt === true) {
        return true; // webos should be capable of toggling the checkbox by itself
    } else {
        evt = evt || window.event; //keydown event
        if (evt.keyCode == 13 || evt.keyCode == 32) { //OK button or Space
            elem.checked = !elem.checked;
        }
    }
    return false;
}

// Similar to jellyfin-web
function generateDeviceId() {
    return btoa([navigator.userAgent, new Date().getTime()].join('|')).replace(/=/g, '1');
}

function getDeviceId() {
    // Use variable '_deviceId2' to mimic jellyfin-web

    var deviceId = storage.get('_deviceId2');

    if (!deviceId) {
        deviceId = generateDeviceId();
        storage.set('_deviceId2', deviceId);
    }

    return deviceId;
}

function navigationInit() {
    if (isVisible(document.querySelector('#connect'))) {
        document.querySelector('#connect').focus()
    } else if (isVisible(document.querySelector('#abort'))) {
        document.querySelector('#abort').focus()
    }
}

function Init() {
    appInfo.deviceId = getDeviceId();

    webOS.fetchAppInfo(function (info) {
        if (info) {
            appInfo.appVersion = info.version;
        } else {
            console.error('Error occurs while getting appinfo.json.');
        }
    });

    navigationInit();

    if (storage.exists('connected_servers')) {
        connected_servers = storage.get('connected_servers')
        let first_server = connected_servers[Object.keys(connected_servers)[0]]
        document.querySelector('#baseurl').value = first_server.baseurl;
        document.querySelector('#auto_connect').checked = first_server.auto_connect;
        if (window.performance && window.performance.navigation.type == window.performance.navigation.TYPE_BACK_FORWARD) {
            console.log('Got here using the browser "Back" or "Forward" button, inhibiting auto connect.');
        } else {
            if (first_server.auto_connect) {
                console.log("Auto connecting...");
                handleServerSelect();
            }
        }
    }
}
// Just ensure that the string has no spaces, and begins with either http:// or https:// (case insensitively), and isn't empty after the ://
function validURL(str) {
    pattern = /^https?:\/\/\S+$/i;
    return !!pattern.test(str);
}

function normalizeUrl(url) {
    url = url.trimLeft ? url.trimLeft() : url.trimStart();
    if (url.indexOf("http://") != 0 && url.indexOf("https://") != 0) {
        // assume http
        url = "http://" + url;
    }
    // normalize multiple slashes as this trips WebOS in some cases
    var parts = url.split("://");
    for (var i = 1; i < parts.length; i++) {
        var part = parts[i];
        while (true) {
            var newpart = part.replace("//", "/");
            if (newpart.length == part.length) break;
            part = newpart;
        }
        parts[i] = part;
    }
    return parts.join("://");
}

function handleServerSelect() {
    var baseurl = normalizeUrl(document.querySelector('#baseurl').value);
    var auto_connect = document.querySelector('#auto_connect').checked;

    if (validURL(baseurl)) {

        displayConnecting();
        console.log(baseurl, auto_connect);

        if (curr_req) {
            console.log("There is an active request.");
            abort();
        }
        hideError();
        getServerInfo(baseurl, auto_connect);
    } else {
        console.log(baseurl);
        displayError("Please enter a valid URL, it needs a scheme (http:// or https://), a hostname or IP (ex. jellyfin.local or 192.168.0.2) and a port (ex. :8096 or :8920).");
    }
}

function displayError(error) {
    var errorElem = document.querySelector('#error')
    errorElem.style.display = '';
    errorElem.innerHTML = error;
}
function hideError() {
    var errorElem = document.querySelector('#error')
    errorElem.style.display = 'none';
    errorElem.innerHTML = '&nbsp;';
}

function displayConnecting() {
    document.querySelector('#serverInfoForm').style.display = 'none';
    document.querySelector('#busy').style.display = '';
    navigationInit();
}
function hideConnecting() {
    document.querySelector('#serverInfoForm').style.display = '';
    document.querySelector('#busy').style.display = 'none';
    navigationInit();
}
function getServerInfo(baseurl, auto_connect) {
    curr_req = ajax.request(normalizeUrl(baseurl + "/System/Info/Public"), {
        method: "GET",
        success: function (data) {
            handleSuccessServerInfo(data, baseurl, auto_connect);
        },
        error: handleFailure,
        abort: handleAbort,
        timeout: 5000
    });
}

function getManifest(baseurl) {
    curr_req = ajax.request(normalizeUrl(baseurl + "/web/manifest.json"), {
        method: "GET",
        success: function (data) {
            handleSuccessManifest(data, baseurl);
        },
        error: handleFailure,
        abort: handleAbort,
        timeout: 5000
    });
}

function handleSuccessServerInfo(data, baseurl, auto_connect) {
    curr_req = false;

    connected_servers = storage.get('connected_servers')
    for (let server_id in connected_servers) {
        let server = connected_servers[server_id]
        if (server.baseurl == baseurl) {
            if (server.id != data.Id && server.id !== false) {
                //server has changed warn user.
                hideConnecting();
                displayError("The server ID has changed since the last connection, please check if you are reaching your own server. To connect anyway, click connect again.");
                delete connected_servers[server_id]
                connected_servers[data.Id] = ({ 'baseurl': baseurl, 'auto_connect': false, 'id': false })
                storage.set('connected_server', connected_servers)
                return false
            }
        }
    }


    connected_servers = lruStrategy(connected_servers,3, { 'baseurl': baseurl, 'auto_connect': auto_connect, 'id': data.Id, 'Name':data.ServerName })

    storage.set('connected_servers', connected_servers);


    getManifest(baseurl)
    return true;
}

function lruStrategy(old_items,max_items,new_item) {
    let result = {}
    let id = new_item.id

    delete old_items[id] // LRU: re-insert entry (in front) each time it is used
    result[id] =  new_item
    let keys = Object.keys(old_items)
    for (let i=0; i<max_items-2; i++){
        let current_key=keys[i]
        result[current_key] = old_items[current_key]
    }
    return result
}

function handleSuccessManifest(data, baseurl) {
    if(data.start_url.includes("/web")){
        var hosturl = normalizeUrl(baseurl + "/" + data.start_url);
    } else {
        var hosturl = normalizeUrl(baseurl + "/web/" + data.start_url);
    }

    curr_req = false;

    for (let server_id in connected_servers) {
        let info = connected_servers[server_id]
        if (info['baseurl' ] == baseurl) {
            info['hosturl'] = hosturl
            info['Address'] = info['Address'] || baseurl

            storage.set('connected_servers', connected_servers)
            console.log("martin:handleSuccessManifest modified server");
            console.log(info);

        // avoid Promise as it's buggy in some WebOS
            getTextToInject(function (bundle) {
                handoff(hosturl, bundle);
            }, function (error) {
                console.error(error);
                displayError(error);
                hideConnecting();
                curr_req = false;
            });
            return;
        }
    }
    //no id, unshoft generates unique(?) index
    connected_servers.unshift({
        'baseurl': baseurl,
        'hosturl': hosturl,
        'Name': data.shortname,
        'Address': new URL(baseurl).hostname.slice(0,8),
    })
    storage.set('connected_server', servers)
    console.log("martin:handleSuccessManifest added server");
    console.log(info);
}

function handleAbort() {
    console.log("Aborted.")
    hideConnecting();
    curr_req = false;
}

function handleFailure(data) {
    console.log("Failure:", data)
    console.log("Could not connect to server...")
    if (data.error == 'timeout') {
        displayError("The request timed out.")
    } else if (data.error == 'abort') {
        displayError("The request was aborted.")
    } else if (typeof data.error === 'string') {
        displayError(data.error);
    } else if (typeof data.error === 'number' && data.error > 0) {
        displayError("Got HTTP error " + data.error.toString() + " from server, are you connecting to a Jellyfin Server?")
    } else {
        displayError("Unknown error occured, are you connecting to a Jellyfin Server?")
    }

    hideConnecting();
    storage.remove('connected_server');
    curr_req = false;
}

function abort() {
    if (curr_req) {
        curr_req.abort()
    } else {
        hideConnecting();
    }
    console.log("Aborting...");
}

function loadUrl(url, success, failure) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', url);

    xhr.onload = function () {
        success(xhr.responseText);
    };

    xhr.onerror = function () {
        failure("Failed to load '" + url + "'");
    }

    xhr.send();
}

function getTextToInject(success, failure) {
    var bundle = {};

    var urls = ['js/webOS.js', 'css/webOS.css'];

    // imitate promises as they're borked in at least WebOS 2
    var looper = function (idx) {
        if (idx >= urls.length) {
            success(bundle);
        } else {
            var url = urls[idx];
            var ext = url.split('.').pop();
            loadUrl(url, function (data) {
                bundle[ext] = (bundle[ext] || '') + data;
                looper(idx + 1);
            }, failure);
        }
    };
    looper(0);
}

function injectScriptText(document, text) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = text;
    document.head.appendChild(script);
}

function injectStyleText(document, text) {
    var style = document.createElement('style');
    style.innerHTML = text;
    document.body.appendChild(style);
}

function handoff(url, bundle) {
    console.log("Handoff called with: ", url)
    //hideConnecting();

    stopDiscovery();
    document.querySelector('.container').style.display = 'none';

    var contentFrame = document.querySelector('#contentFrame');
    var contentWindow = contentFrame.contentWindow;

    var timer;

    function onLoad() {
        clearInterval(timer);
        contentFrame.contentDocument.removeEventListener('DOMContentLoaded', onLoad);
        contentFrame.removeEventListener('load', onLoad);

        injectScriptText(contentFrame.contentDocument, 'window.AppInfo = ' + JSON.stringify(appInfo) + ';');
        injectScriptText(contentFrame.contentDocument, 'window.DeviceInfo = ' + JSON.stringify(deviceInfo) + ';');

        if (bundle.js) {
            injectScriptText(contentFrame.contentDocument, bundle.js);
        }

        if (bundle.css) {
            injectStyleText(contentFrame.contentDocument, bundle.css);
        }
    }

    function onUnload() {
        contentWindow.removeEventListener('unload', onUnload);

        timer = setInterval(function () {
            var contentDocument = contentFrame.contentDocument;

            switch (contentDocument.readyState) {
                case 'loading':
                    clearInterval(timer);
                    contentDocument.addEventListener('DOMContentLoaded', onLoad);
                    break;

                // In the case of "loading" is not caught
                case 'interactive':
                    onLoad();
                    break;
            }
        }, 0);
    }

    contentWindow.addEventListener('unload', onUnload);

    // In the case of "loading" and "interactive" are not caught
    contentFrame.addEventListener('load', onLoad);

    contentFrame.style.display = '';
    contentFrame.src = url;
}

window.addEventListener('message', function (msg) {
    msg = msg.data;

    var contentFrame = document.querySelector('#contentFrame');

    switch (msg.type) {
        case 'selectServer':
            startDiscovery();
            document.querySelector('.container').style.display = '';
            hideConnecting();
            contentFrame.style.display = 'none';
            contentFrame.src = '';
            break;
        case 'AppHost.exit':
            webOS.platformBack();
            break;
    }
});

/* Server auto-discovery */

var discovered_servers = {};
var connected_servers = {};

function renderServerList() {


    for (let server_id in connected_servers) {
        let server = connected_servers[server_id];
        renderSingleServer(server_id, server);
    }
    for (var server_id in discovered_servers) {
        var server = discovered_servers[server_id];
        renderSingleServer(server_id, server);
    }
}

function renderSingleServer(server_id, server) {
    var server_list = document.getElementById("serverlist");
    var server_card = document.getElementById("server_" + server.Id);

    if (!server_card) {
        server_card = document.createElement("li");
        server_card.id = "server_" + server_id;
        server_card.className = "server_card";
        server_list.appendChild(server_card);
    }
    server_card.innerHTML = "";

    // Server name
    var title = document.createElement("div");
    title.className = "server_card_title";
    title.innerText = server.Name;
    server_card.appendChild(title);

    // Server URL
    var server_url = document.createElement("div");
    server_url.className = "server_card_url";
    server_url.innerText = server.Address;
    server_card.appendChild(server_url);

    // Button
    var btn = document.createElement("button");
    btn.innerText = "Connect";
    btn.type = "button";
    btn.value = server.Address;
    btn.onclick = function () {
        var urlfield = document.getElementById("baseurl");
        urlfield.value = this.value;
        handleServerSelect();
    };
    server_card.appendChild(btn);
}


var servers_verifying = {};

function verifyThenAdd(server) {
    if (servers_verifying[server.Id]) {
        return;
    }
    servers_verifying[server.Id] = server;

    curr_req = ajax.request(normalizeUrl(server.Address + "/System/Info/Public"), {
        method: "GET",
        success: function (data) {
            console.log("success");
            console.log(server);
            console.log(data);

            // TODO: Do we want to autodiscover only Jellyfin servers, or anything that responds to "who is JellyfinServer?"
            if (data.ProductName == "Jellyfin Server") {
                server.system_info_public = data;
                if (!discovered_servers[server.Id]) {
                    discovered_servers[server.Id] = server;
                    renderServerList();
                }
            }
            servers_verifying[server.Id] = true;
        },
        error: function (data) {
            console.log("error");
            console.log(server);
            console.log(data);
            servers_verifying[server.Id] = false;
        },
        abort: function () {
            console.log("abort");
            console.log(server);
            servers_verifying[server.Id] = false;
        },
        timeout: 5000
    });
}


var discover = null;

function startDiscovery() {
    if (discover) {
        return;
    }
    console.log("Starting server autodiscovery...");
    discover = webOS.service.request("luna://org.jellyfin.webos.service", {
        method: "discover",
        parameters: {
            uniqueToken: 'fooo'
        },
        subscribe: true,
        resubscribe: true,
        onSuccess: function (args) {
            console.log('OK:', JSON.stringify(args));

            if (args.results) {
                for (var server_id in args.results) {
                    verifyThenAdd(args.results[server_id]);
                }
            }
        },
        onFailure: function (args) {
            console.log('ERR:', JSON.stringify(args));
        }
    });
}

function stopDiscovery() {
    if (discover) {
        try {
            discover.cancel();
        } catch (err) {
            console.warn(err);
        }
        discover = null;
    }
}

startDiscovery();
