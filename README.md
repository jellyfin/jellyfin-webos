
# Jellyfin for webOS
This is a small wrapper around the web interface that the server provides (https://github.com/jellyfin/jellyfin-web) so most of the developement happens there.


## Download

For all versions:
<p align="center">
<a href="https://us.lgappstv.com/main/tvapp/detail?appId=1030579"><img alt="Enjoy on LG Smart TV" src="https://repo.jellyfin.org/releases/other/lg-badge/LG_BADGE_greyborders_135x40.png"/></a>
<br/>
<em><strong>Note:</strong> If you previously installed the app via Homebrew or Developer mode, you must uninstall that before you can use the the store version.</em>
</p>


## License
All Jellyfin webOS code is licensed under the MPL 2.0 license, some parts incorporate content licensed under the Apache 2.0 license. All images are taken from and licensed under the same license as https://github.com/jellyfin/jellyfin-ux.

---

## Development

The general development workflow looks like this:

- Prepare a build environment of your choice (see below)
- Compile an IPK either with the IDE or with ares-package
- Test the app on the emulator or ares-server or install it on your tv by following http://webostv.developer.lge.com/develop/app-test/

There are three ways of creating the required build environment:

- Full WebOS SDK Installation
- Docker
- NPM ares-cli

### Full WebOS SDK Installation

- Install the WebOS SDK from http://webostv.developer.lge.com/sdk/installation/

### Docker

A prebuilt docker image is available that includes the build and deployment dependencies, see [Docker Hub](https://ghcr.io/oddstr13/docker-tizen-webos-sdk).

### Managing the ares-tools via npm

This requires `npm`, the Node.js package manager.

Execute the following to install the required WebOS toolkit for building & deployment:

`npm install`

Now you can package the app by running

`npm run package`

## Building with Docker or WebOS SDK

`dev.sh` is a wrapper around the Docker commands, if you have installed the SDK directly, just ommit that part.

```sh
# Build the package via Docker
./dev.sh ares-package --no-minify services frontend
# Build the package with natively installed WebOS SDK
ares-package --no-minify services frontend
```

## Usage
Fill in your hostname, port and schema and click connect. The app will check for a server by grabbing the manifest and the public serverinfo.
And then the app hands off control to the hosted webUI.


## Testing
Testing on a TV requires [registering a LG developer account](https://webostv.developer.lge.com/develop/app-test/preparing-account/) and [setting up the devmode app](https://webostv.developer.lge.com/develop/app-test/using-devmode-app/).

Once you have installed the devmode app on your target TV and logged in with your LG developer account, you need to turn on the `Dev Mode Status` and `Key Server`.
**Make sure** to take a note of the passphrase.

```sh
# Add your TV. The defaults are fine, but I recommend naming it `tv`.
./dev.sh ares-setup-device --search

# This command sets up the SSH key for the device `tv` (Key Server must be running)
./dev.sh ares-novacom --device tv --getkey

# Run this command to verify that things are working.
./dev.sh ares-device-info -d tv

# This command installs the app. Remember to build it first.
./dev.sh ares-install -d tv org.jellyfin.webos_*.ipk

# Launch the app and the web developer console.
./dev.sh ares-inspect -d tv org.jellyfin.webos

# Or just launch the app.
./dev.sh ares-launch -d tv org.jellyfin.webos
```
