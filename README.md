
# Jellyfin WebOS client
This is a small wrapper around the web interface that the server provides (https://github.com/jellyfin/jellyfin-web) so most of the developement happens there.

# Installation
- Install the WebOS SDK from http://webostv.developer.lge.com/sdk/installation/
- Compile an IPK either with the IDE or with ares-package
- Test the app on the emulator or ares-server or install it on your tv by following http://webostv.developer.lge.com/develop/app-test/

# Usage
Fill in your hostname, port and schema and click connect. The app will check for a server by grabbing the manifest and the public serverinfo.
And then the app hands off control to the hosted webUI.