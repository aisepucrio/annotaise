FROM node:22-alpine

COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /app && cp -a /tmp/node_modules /app/

WORKDIR /app
COPY . /app

RUN chmod +x ./run.sh
CMD ["/bin/ash", "./run.sh"]
