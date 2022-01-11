#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');

const outfile = process.argv[2];
const appinfo = JSON.parse(fs.readFileSync('frontend/appinfo.json'));
const ipkfile = `${appinfo.id}_${appinfo.version}_all.ipk`;
const ipkhash = crypto.createHash('sha256').update(fs.readFileSync(`build/${ipkfile}`)).digest('hex');

fs.writeFileSync(
  outfile,
  JSON.stringify({
    id: appinfo.id,
    version: appinfo.version,
    type: appinfo.type,
    title: appinfo.title,
    appDescription: appinfo.appDescription,
    iconUri: 'https://github.com/jellyfin/jellyfin-webos/raw/master/org.jellyfin.webos/submission-icon.png',
    sourceUrl: 'https://github.com/jellyfin/jellyfin-webos',
    rootRequired: false,
    ipkUrl: ipkfile,
    ipkHash: {
      sha256: ipkhash,
    },
  }),
);
