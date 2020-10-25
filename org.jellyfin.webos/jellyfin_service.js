// -*- coding: utf-8 -*-

/*
 * Backend node.js service for server autodiscovery.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var pkgInfo = require('./package.json');
var Service = require('webos-service');

// Register com.yourdomain.@DIR@.service, on both buses
var service = new Service(pkgInfo.name);

var dgram = require('dgram');
var client4 = dgram.createSocket("udp4");

// var client6;
// try {
// 	client6 = dgram.createSocket("udp6");
// } catch (err) {
// 	console.log(err);
// 	client6 = false;
// }

const JELLYFIN_DISCOVERY_PORT = 7359;
const JELLYFIN_DISCOVERY_MESSAGE = "who is JellyfinServer?";

const SCAN_INTERVAL = 15 * 1000;
const SCAN_ON_START = true;

var scanresult = {};

function sendScanResults(server_id) {
	console.log("Sending responses, subscription count=" + Object.keys(subscriptions).length);
	for (var i in subscriptions) {
		if (subscriptions.hasOwnProperty(i)) {
			var s = subscriptions[i];
			if (server_id) {
				var res = {};
				res[server_id] = scanresult[server_id];
				s.respond({
					results: res
				});
			} else {
			s.respond({
				results: scanresult,
			});
			}
		}
	}
}

function handleDiscoveryResponse(message, remote) {
	try {
		var msg = JSON.parse(message.toString('utf-8'));

		if (typeof msg == "object" &&
			typeof msg.Id == "string" &&
			typeof msg.Name == "string" &&
			typeof msg.Address == "string") {

			scanresult[msg.Id] = msg;
			scanresult[msg.Id].source = {
				address: remote.address,
				port: remote.port,
			};

			sendScanResults(msg.Id);
		}
	} catch (err) {
		console.log(err);
	}
}

function sendJellyfinDiscovery() {
	var msg = new Buffer(JELLYFIN_DISCOVERY_MESSAGE);
	client4.send(msg, 0, msg.length, 7359, "255.255.255.255");

	// if (client6) {
	// 	client6.send(msg, 0, msg.length, 7359, "ff08::1"); // All organization-local nodes
	// }

}

function discoverInitial() {
	if (SCAN_ON_START) {
		sendJellyfinDiscovery();
	}
}

client4.on("listening", function () {
	var address = client4.address();
	console.log('UDP Client listening on ' + address.address + ":" + address.port);
	client4.setBroadcast(true)
	client4.setMulticastTTL(128);
	//client.addMembership('230.185.192.108');
});

client4.on("message", handleDiscoveryResponse);
client4.bind({
	port: JELLYFIN_DISCOVERY_PORT
}, discoverInitial);


// if (client6) {
// 	client6.on("listening", function () {
// 		var address = client4.address();
// 		console.log('UDP Client listening on ' + address.address + ":" + address.port);
// 		client6.setMulticastTTL(128);
// 		//client.addMembership('230.185.192.108');
// 	});

// 	client6.on("message", handleDiscoveryResponse);

// 	try { // client6 bind failing even in a try catch.
// 		//client6.bind(JELLYFIN_DISCOVERY_PORT, discoverInitial);
// 	} catch (err) {
// 		console.log(err);
// 	}
// }


var interval;
var subscriptions = {};

function createInterval() {
	if (interval) {
		return;
	}
	console.log("create new interval");
	interval = setInterval(function () {
		sendJellyfinDiscovery();
	}, SCAN_INTERVAL);
}

var discover = service.register("discover");
discover.on("request", function (message) {
	sendScanResults();
	var uniqueToken = message.uniqueToken;
	console.log("discover callback, uniqueToken: " + uniqueToken + ", token: " + message.token);

	sendJellyfinDiscovery();

	if (message.isSubscription) {
		subscriptions[uniqueToken] = message;
		if (!interval) {
			createInterval();
		}
	}
});
discover.on("cancel", function (message) {
	var uniqueToken = message.uniqueToken;
	console.log("Canceled " + uniqueToken);
	delete subscriptions[uniqueToken];
	var keys = Object.keys(subscriptions);
	if (keys.length === 0) {
		console.log("no more subscriptions, canceling interval");
		clearInterval(interval);
		interval = undefined;
	}
});