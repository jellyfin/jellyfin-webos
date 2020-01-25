(function() {
    'use strict';

    console.log('WebOS adapter');

    function postMessage(type, data) {
        window.top.postMessage({
            type: type,
            data: data
        }, '*');
    }

    window.webOS = {
        platformBack: function () {
            postMessage('AppHost.exit');
        }
    };
})();
