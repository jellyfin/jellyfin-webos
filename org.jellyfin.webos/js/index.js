var curr_req = false;
var server_info = false;
var manifest = false;

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
    }
};

function handleCheckbox(elem, evt) {
    console.log(elem);
    if (evt === true) {
        elem.checked = !elem.checked; //click event
    } else {
        evt = evt || window.event; //keydown event
        if (evt.keyCode == 13 || evt.keyCode == 32) { //OK button or Space
            elem.checked = !elem.checked;
        }
    }
    return false;
}

function navigationInit() {
    if (isVisible(document.querySelector('#connect'))) {
        document.querySelector('#connect').focus()
    } else if (isVisible(document.querySelector('#abort'))) {
        document.querySelector('#abort').focus()
    }
}

function Init() {
    navigationInit();
    if (storage.exists('connected_server')) {
        data = storage.get('connected_server')
        document.querySelector('#hostname').value = data.hostname
        document.querySelector('#port').value = data.port
        document.querySelector('#schema').value = data.schema
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
function handleServerSelect() {
    var schema = document.querySelector('#schema').value;
    var hostname = document.querySelector('#hostname').value;
    var port = parseInt(document.querySelector('#port').value);
    var auto_connect = document.querySelector('#auto_connect').checked;

    if (schema == '') {
        schema = 'https';
    } else if (schema != 'http' && schema != 'https') {
        //TODO throw error
        schema = 'http';
    }

    //TODO verify hostname
    if (hostname == '') {
        hostname = 'jellyfin.local'
    }

    if (isNaN(port) || port === 0) {
        if (schema == 'http') {
            port = 8096;
        } else if (schema == 'https') {
            port = 8920;
        } else {
            //TODO throw error
            port = 8920;
        }
    }
    displayConnecting();
    console.log(schema, hostname, port, auto_connect);

    if (curr_req) {
        console.log("There is an active request.");
        abort();
    }
    hideError();
    getServerInfo(schema, hostname, port, auto_connect);
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
function getServerInfo(schema, hostname, port, auto_connect) {

    baseurl = schema + '://' + hostname + ':' + port;

    curr_req = ajax.request(baseurl + "/System/Info/Public", {
        method: "GET",
        success: function (data) {
            handleSuccessServerInfo(data, baseurl, schema, hostname, port, auto_connect);
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

function handleSuccessServerInfo(data, baseurl, schema, hostname, port, auto_connect) {
    curr_req = false;
    if (storage.exists('connected_server')) {
        info = storage.get('connected_server')
        if (info.hostname == hostname && info.port == port) {
            if (info.id != data.Id && info.id !== false) {
                //server has changed warn user.
                hideConnecting();
                displayError("The server ID has changed since the last connection, please check if you are reaching your own server. To connect anyway, click connect again.");
                storage.set('connected_server', { 'hostname': hostname, 'port': port, 'schema': schema, 'auto_connect': false, 'id': false })
                return false
            }
        }
    }

    storage.set('connected_server', { 'hostname': hostname, 'port': port, 'schema': schema, 'auto_connect': auto_connect, 'id': data.Id })

    getManifest(baseurl)
}

function handleSuccessManifest(data, baseurl, schema, hostname, port) {
    var hosturl = baseurl + "/web/" + data.start_url;
    curr_req = false;

    info = storage.get('connected_server')
    info['hosturl'] = hosturl
    info['baseurl'] = baseurl
    storage.set('connected_server', info)
    console.log(hosturl);
    console.log(info);
    handoff(hosturl)
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
}

function abort() {
    if (curr_req) {
        curr_req.abort()
    } else {
        hideConnecting();
    }
    console.log("Aborting...");
}

function handoff(url) {
    console.log("Handoff called with: ", url)
    //hideConnecting();
    location.href = url;
}