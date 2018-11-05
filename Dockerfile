FROM node

RUN mkdir -p /home/cos
WORKDIR /home/cos

COPY . /home/cos
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]

