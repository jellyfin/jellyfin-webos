/* 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 * 
 *   Copyright 2019 Simon J. Hogan
 * 
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 * 
*/

var ajax = new AJAX();

function AJAX() {};

AJAX.prototype.request = function(url, settings) {
	var method = (settings.method) ? settings.method : "GET";
	var xhr = new XMLHttpRequest();
	
	xhr.open(method, url);
	
	if (settings.headers) {
		for (var h in settings.headers) {
			if (settings.headers.hasOwnProperty(h)) {
				xhr.setRequestHeader(h, settings.headers[h]);
			}	
		}
	} 
	
	if (settings.timeout) {
		xhr.timeout = settings.timeout;
	}
	
	xhr.ontimeout = function (event) {
		if (settings.error) {
			settings.error({error: "timeout"});
		}			
	}

	xhr.onerror = function (event) {
		if (settings.error) {
			settings.error({error: event.target.status});
		}			
	}
	
	xhr.onabort = function (event) {
		if (settings.abort) {
			settings.abort({error: "abort"});
		}			
	}
	
	xhr.onreadystatechange = function () {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
                if (settings.success) {
                    settings.success(JSON.parse(xhr.responseText));
                }
            } else if (xhr.status == 204){
                if (settings.success) {                
                    settings.success({success: true})
                }
            } else if (settings.error) {
                if (settings.error) {  
                    settings.error({error: true});
                }
            }
        }
	}
	
	if (settings.data) {
		xhr.send(JSON.stringify(settings.data));
	} else {
		xhr.send();
	} 
	return xhr;
};
