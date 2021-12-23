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

var storage = new STORAGE();

function STORAGE() {};

STORAGE.prototype.get = function(name, isJSON) {	
	if (isJSON === undefined) {
		isJSON = true;	
	}
	
	if (localStorage) {
		if (localStorage.getItem(name)) {
			if (isJSON) {
				return JSON.parse(localStorage.getItem(name));
			} else {
				return localStorage.getItem(name);
			}
		}
	}
};

STORAGE.prototype.set = function(name, data, isJSON) {
	if (isJSON === undefined) {
		isJSON = true;	
	}
	
	if (localStorage) {
		if (isJSON) {
			localStorage.setItem(name, JSON.stringify(data));
		} else {
			localStorage.setItem(name, data);
		}
	}
	
	return data;
};

STORAGE.prototype.remove = function(name) {
	if (localStorage) {
		localStorage.removeItem(name);	
	}	
};

STORAGE.prototype.exists = function(name) {
	if (localStorage) {
		if (localStorage.getItem(name)) {
			return true;
		} 
	}	
	return false;
};