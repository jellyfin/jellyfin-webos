
# Jellyfin WebOS client
This is a small wrapper around the web interface that the server provides (https://github.com/jellyfin/jellyfin-web) so most of the developement happens there.

# LICENSE
All Jellyfin webOS code is licensed under the MPL 2.0 license, some parts incorporate content licensed under the Apache 2.0 license. All images are taken from and licensed under the same license as https://github.com/jellyfin/jellyfin-ux.

# Installation
- Install the WebOS SDK from http://webostv.developer.lge.com/sdk/installation/
- Compile an IPK either with the IDE or with ares-package
- Test the app on the emulator or ares-server or install it on your tv by following http://webostv.developer.lge.com/develop/app-test/

# Building with Docker
Instead of installing the WebOS SDK, it is possible to compile an IPK with the following commands:

```sh
docker build -t jellyfin_builder .
docker container run -it --rm -v ${PWD}:/data jellyfin_builder
```

It is also possible to install the pacakge with the container using the following command:

```
docker container run -it --rm -v ${PWD}:/data jellyfin_builder /bin/bash
```

At this point you will have a bash shell and can use `ares-setup-device`, `ares-novacom`, `ares-install`, and any other tool to install the ipk.

# Usage
Fill in your hostname, port and schema and click connect. The app will check for a server by grabbing the manifest and the public serverinfo.
And then the app hands off control to the hosted webUI.
