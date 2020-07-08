
./start_ursula.sh &
python ../nucypher/listener_server/server.py &
/usr/bin/wait && exec ./node_modules/.bin/nodemon src/index.js | ./node_modules/.bin/bunyan
