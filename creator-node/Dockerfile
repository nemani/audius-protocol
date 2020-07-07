FROM nikolaik/python-nodejs:python3.8-nodejs10
RUN apt-get install make

WORKDIR /usr/src/app

RUN pip3 install nucypher

COPY package*.json ./
RUN npm install

COPY . .

# Add the wait script to the image
# Script originally from https://github.com/ufoscout/docker-compose-wait/releases/download/2.4.0/wait /usr/bin/wait
COPY scripts/wait /usr/bin/wait
RUN chmod +x /usr/bin/wait

VOLUME "/file_storage"
ENV storagePath=/file_storage

EXPOSE 8000
EXPOSE 11500
EXPOSE 11501

ARG git_sha
ENV GIT_SHA=$git_sha

CMD ["sh", "-c", "./scripts/endpoint.sh"]
