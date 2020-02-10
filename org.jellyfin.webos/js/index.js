var curr_req = false;
var server_info = false;
var manifest = false;

var appInfo = {
    deviceId: null,
    deviceName: 'LG Smart TV',
    appName: 'Jellyfin for WebOS',
    appVersion: '0.0.0'
};

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

    if (storage.exists('connected_server')) {
        data = storage.get('connected_server')
        document.querySelector('#baseurl').value = data.baseurl
        document.querySelector('#auto_connect').checked = data.auto_connect
        if (window.performance && window.performance.navigation.type == window.performance.navigation.TYPE_BACK_FORWARD) {
            console.log('Got here using the browser "Back" or "Forward" button, inhibiting auto connect.');
        } else {
            if (data.auto_connect) {
                console.log("Auto connecting...")
                handleServerSelect()
            }
        }
    }
}
// Sourced from jQuery Validation
function validURL(str) {
    pattern = /^(https?):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
    return !!pattern.test(str);
}

function handleServerSelect() {
    var baseurl = document.querySelector('#baseurl').value;
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
    curr_req = ajax.request(baseurl + "/System/Info/Public", {
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
    curr_req = ajax.request(baseurl + "/web/manifest.json", {
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
    if (storage.exists('connected_server')) {
        info = storage.get('connected_server')
        if (info.baseurl == baseurl) {
            if (info.id != data.Id && info.id !== false) {
                //server has changed warn user.
                hideConnecting();
                displayError("The server ID has changed since the last connection, please check if you are reaching your own server. To connect anyway, click connect again.");
                storage.set('connected_server', { 'baseurl': baseurl, 'auto_connect': false, 'id': false })
                return false
            }
        }
    }

    storage.set('connected_server', { 'baseurl': baseurl, 'auto_connect': auto_connect, 'id': data.Id })

    getManifest(baseurl)
}

function handleSuccessManifest(data, baseurl) {
    if(data.start_url.includes("/web")){
        var hosturl = baseurl + "/" + data.start_url;
    } else {
        var hosturl = baseurl + "/web/" + data.start_url;
    }

    curr_req = false;

    info = storage.get('connected_server')
    info['hosturl'] = hosturl
    info['baseurl'] = baseurl
    storage.set('connected_server', info)
    console.log(info);

    getTextToInject().then(function (bundle) {
        handoff(hosturl, bundle);
    }).catch(function (error) {
        console.error(error);
        displayError(error);
        hideConnecting();
        curr_req = false;
    });
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
    } else if (isNaN(data.error)) {
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

function loadUrl(url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();

        xhr.open('GET', url);

        xhr.onload = function () {
            resolve(xhr.responseText);
        };

        xhr.onerror = function () {
            reject("Failed to load '" + url + "'");
        }

        xhr.send();
    });
}

function getTextToInject() {
    var bundle = {};

    var urls = ['js/webOS.js', 'css/webOS.css'];

    var p = Promise.resolve();

    urls.forEach(function (url) {
        p = p.then(function () {
            return loadUrl(url);
        }).then(function (data) {
            var ext = url.split('.').pop();
            bundle[ext] = (bundle[ext] || '') + data;
            return bundle;
        });
    });

    return p;
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

    document.querySelector('.container').style.display = 'none';

    var contentFrame = document.querySelector('#contentFrame');
    var contentWindow = contentFrame.contentWindow;

    var timer;

    function onLoad() {
        clearInterval(timer);
        contentFrame.contentDocument.removeEventListener('DOMContentLoaded', onLoad);
        contentFrame.removeEventListener('load', onLoad);

        injectScriptText(contentFrame.contentDocument, 'window.AppInfo = ' + JSON.stringify(appInfo) + ';');

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