FROM nikolaik/python-nodejs:python3.8-nodejs10
RUN apt-get install make

WORKDIR /usr/src/app
COPY . .

RUN npm install

# Add the wait script to the image
# Script originally from https://github.com/ufoscout/docker-compose-wait/releases/download/2.4.0/wait /usr/bin/wait
COPY scripts/wait /usr/bin/wait
RUN chmod +x /usr/bin/wait

VOLUME "/file_storage"
ENV storagePath=/file_storage

EXPOSE 8000

ARG git_sha
ENV GIT_SHA=$git_sha

# Extra python env
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

RUN pip3 install nucypher

WORKDIR /usr/src/app
CMD ["sh", "-c", "/usr/bin/wait && exec node src/index.js"]
