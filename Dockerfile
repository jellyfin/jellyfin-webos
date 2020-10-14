FROM persiktv/ubuntu-webos-sdk
WORKDIR /data/
ENV PATH="/webOS_SDK/bin:${PATH}"
CMD [ "/webOS_SDK/bin/ares-package", "org.jellyfin.webos/" ]
